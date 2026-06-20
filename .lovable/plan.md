# Serial Audiobook Narration

Turn each unlocked chapter (and optionally daily teasers) into a streamed, audiobook-quality listen using **ElevenLabs Text-to-Speech**. Lovable AI Gateway's TTS is fine for UI voice but ElevenLabs (`eleven_multilingual_v2`) is the industry standard for narration — natural prosody, character consistency, and per-genre voice selection.

## What "audiobook quality" requires

1. **A premium TTS engine** — ElevenLabs `eleven_multilingual_v2` for final renders, `eleven_turbo_v2_5` if we ever need live streaming. Lovable AI's `gpt-4o-mini-tts` is serviceable but noticeably more synthetic for long-form fiction.
2. **A narrator voice per genre** — e.g. a grave baritone (George) for epic fantasy, a brighter voice (Sarah) for adventure, etc. Picked at onboarding alongside genre, editable in Settings.
3. **Request stitching** — chapters exceed the per-request length cap, so we split at paragraph boundaries and pass `previous_text` / `next_text` so prosody flows naturally across segments.
4. **Pre-render + cache** — generate once per chapter, store the MP3 in Lovable Cloud Storage, serve a signed URL. Avoids re-billing on every replay and removes playback latency.
5. **A real player UI** — play/pause, 15s skip, speed (0.8-1.5x), progress scrubber, resume-where-you-left-off, sleep timer. Synced text highlight is out of scope for v1 (requires word-level timestamps; can add later).

## User-facing changes

- **Onboarding**: after genre pick, a "Choose your narrator" step with 3-4 voice samples (pre-rendered 8-sec clips).
- **Chapter page (`chapters.$id.tsx`)**: sticky audio player at top; "Generating narration…" state on first open; text below as the read-along transcript.
- **Library**: little headphones icon on chapters with audio ready; total listen time per chapter.
- **Settings**: change narrator voice, default playback speed, autoplay next chapter toggle.
- **Daily teasers**: optional 30-60s audio teaser using the same voice (cheap, short).

## Technical plan

**Connector**: ElevenLabs standard connector (syncs `ELEVENLABS_API_KEY` server-side). User links it once.

**New schema** (migration):
- `profiles.narrator_voice_id text default 'JBFqnCBsd6RMkjVDRZzb'` (George)
- `profiles.playback_speed numeric default 1.0`
- `profiles.autoplay_next boolean default true`
- `chapters.audio_url text` (signed storage path)
- `chapters.audio_duration_seconds int`
- `chapters.audio_status text` ('pending' | 'ready' | 'failed')
- New Storage bucket `chapter-audio` (private, RLS: owner read).

**Server functions** (`src/lib/narration.functions.ts`):
- `renderChapterAudio({ chapterId })` — auth-gated. Loads chapter text, chunks into ~400-word segments at paragraph boundaries, calls ElevenLabs per segment with stitching context, concatenates MP3 frames, uploads to `chapter-audio/<userId>/<chapterId>.mp3`, updates row. Idempotent: short-circuits if `audio_status='ready'`.
- `getChapterAudioUrl({ chapterId })` — returns short-lived signed URL.
- `previewVoice({ voiceId })` — renders a fixed 1-sentence sample for onboarding/settings (cached by voiceId).

**Auto-trigger**: when `generateChapter` finishes writing prose, it enqueues `renderChapterAudio` (fire-and-forget call from the same handler). Chapter route polls every 3s until `audio_status='ready'`.

**Player**: native `<audio>` element + custom shadcn controls. Persist `currentTime` to `localStorage` keyed by chapterId for resume. No third-party player lib needed.

**Voice catalog** (initial 4):
- George `JBFqnCBsd6RMkjVDRZzb` — epic fantasy default
- Sarah `EXAVITQu4vr4xnSDxMaL` — warm contemporary
- Brian `nPczCjzI2devNBz1zQrb` — gritty noir
- Lily `pFZP5JQG7iQjIQuC4Bku` — bright YA

## Costs to flag

ElevenLabs bills by characters. A ~1,500-word weekly chapter ≈ 9k characters ≈ noticeable credit usage on their free tier. Worth telling users their ElevenLabs account is what gets billed.

## Out of scope (v1)

- Word-level karaoke highlighting (needs forced alignment).
- Multi-voice dialogue casting (one narrator per chapter).
- Background music / SFX beds.
- Offline downloads / native app.
- Voice cloning of the user.

## Open question before I build

Should I default to **auto-render every chapter** (best UX, higher cost) or **"Generate audio" button per chapter** (user controls cost)?