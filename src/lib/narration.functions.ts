import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_VOICE_ID, NARRATOR_VOICES } from "./voices";

const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1/text-to-speech";
const MODEL_ID = "eleven_multilingual_v2";
const OUTPUT_FORMAT = "mp3_44100_128";
const BUCKET = "chapter-audio";

function requireElevenLabsKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ElevenLabs is not connected to this project.");
  return key;
}

// Split prose into chunks of ~maxChars, preferring paragraph then sentence boundaries.
function chunkForTTS(text: string, maxChars = 2500): string[] {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const para of paragraphs) {
    if (para.length > maxChars) {
      flush();
      const sentences = para.match(/[^.!?]+[.!?]+\s*/g) ?? [para];
      let buf = "";
      for (const s of sentences) {
        if (s.length > maxChars) {
          if (buf) { chunks.push(buf.trim()); buf = ""; }
          for (let i = 0; i < s.length; i += maxChars) {
            chunks.push(s.slice(i, i + maxChars).trim());
          }
          continue;
        }
        if ((buf + s).length > maxChars) { chunks.push(buf.trim()); buf = s; }
        else buf += s;
      }
      if (buf) chunks.push(buf.trim());
      continue;
    }
    if ((current + "\n\n" + para).length > maxChars) flush();
    current = current ? current + "\n\n" + para : para;
  }
  flush();
  return chunks;
}

async function renderSegment(opts: {
  apiKey: string;
  voiceId: string;
  text: string;
  previousText?: string;
  nextText?: string;
}): Promise<ArrayBuffer> {
  const res = await fetch(`${ELEVENLABS_BASE}/${opts.voiceId}?output_format=${OUTPUT_FORMAT}`, {
    method: "POST",
    headers: {
      "xi-api-key": opts.apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text: opts.text,
      model_id: MODEL_ID,
      previous_text: opts.previousText,
      next_text: opts.nextText,
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.8,
        style: 0.35,
        use_speaker_boost: true,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${body.slice(0, 300)}`);
  }
  return res.arrayBuffer();
}

function concatBuffers(buffers: ArrayBuffer[]): Uint8Array {
  const total = buffers.reduce((s, b) => s + b.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const b of buffers) {
    out.set(new Uint8Array(b), offset);
    offset += b.byteLength;
  }
  return out;
}

// Rough word-per-minute approximation; ~155 wpm narration.
function estimateDurationSeconds(text: string): number {
  const words = (text.match(/\S+/g) ?? []).length;
  return Math.max(5, Math.round((words / 155) * 60));
}

export const renderChapterAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ chapter_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const apiKey = requireElevenLabsKey();

    const { data: chapter, error } = await supabase
      .from("story_chapters")
      .select("id,content,audio_status,audio_path")
      .eq("id", data.chapter_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!chapter) throw new Error("Chapter not found.");
    if (chapter.audio_status === "ready" && chapter.audio_path) {
      return { status: "ready" as const, path: chapter.audio_path };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("narrator_voice_id")
      .eq("id", userId)
      .maybeSingle();
    const voiceId = (profile?.narrator_voice_id as string | null) || DEFAULT_VOICE_ID;

    await supabase
      .from("story_chapters")
      .update({ audio_status: "pending", audio_error: null })
      .eq("id", data.chapter_id);

    try {
      const chunks = chunkForTTS(chapter.content);
      if (chunks.length === 0) throw new Error("Chapter has no content to narrate.");

      const audioBuffers: ArrayBuffer[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const buf = await renderSegment({
          apiKey,
          voiceId,
          text: chunks[i],
          previousText: i > 0 ? chunks[i - 1].slice(-400) : undefined,
          nextText: i < chunks.length - 1 ? chunks[i + 1].slice(0, 400) : undefined,
        });
        audioBuffers.push(buf);
      }

      const combined = concatBuffers(audioBuffers);
      const path = `${userId}/${data.chapter_id}.mp3`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, combined, { contentType: "audio/mpeg", upsert: true });
      if (upErr) throw new Error(upErr.message);

      const duration = estimateDurationSeconds(chapter.content);
      await supabase
        .from("story_chapters")
        .update({
          audio_status: "ready",
          audio_path: path,
          audio_duration_seconds: duration,
          audio_voice_id: voiceId,
          audio_error: null,
        })
        .eq("id", data.chapter_id);

      return { status: "ready" as const, path };
    } catch (e: any) {
      const msg = e?.message ?? "Narration failed";
      await supabase
        .from("story_chapters")
        .update({ audio_status: "failed", audio_error: msg.slice(0, 500) })
        .eq("id", data.chapter_id);
      throw new Error(msg);
    }
  });

export const getChapterAudioUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ chapter_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: chapter, error } = await supabase
      .from("story_chapters")
      .select("audio_path,audio_status,audio_duration_seconds")
      .eq("id", data.chapter_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!chapter || chapter.audio_status !== "ready" || !chapter.audio_path) {
      return { url: null, status: chapter?.audio_status ?? "idle", duration: chapter?.audio_duration_seconds ?? null };
    }
    const { data: signed, error: sErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(chapter.audio_path, 60 * 60);
    if (sErr) throw new Error(sErr.message);
    return { url: signed.signedUrl, status: "ready" as const, duration: chapter.audio_duration_seconds };
  });

export const previewVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ voice_id: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const apiKey = requireElevenLabsKey();
    const voice = NARRATOR_VOICES.find((v) => v.id === data.voice_id);
    if (!voice) throw new Error("Unknown narrator voice.");
    const sample =
      "The torchlight flickered as she stepped through the archway, and the world she had known fell away behind her.";
    const buf = await renderSegment({ apiKey, voiceId: data.voice_id, text: sample });
    const base64 = Buffer.from(buf).toString("base64");
    return { audio_base64: base64, mime: "audio/mpeg" };
  });
