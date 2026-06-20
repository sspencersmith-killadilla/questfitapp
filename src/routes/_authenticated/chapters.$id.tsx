import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getChapter } from "@/lib/story.functions";
import { getChapterAudioUrl, renderChapterAudio } from "@/lib/narration.functions";
import { getDashboardData } from "@/lib/dashboard.functions";
import { voiceById } from "@/lib/voices";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, RotateCcw, RotateCw, Headphones, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chapters/$id")({
  component: ChapterView,
});

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function ChapterView() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getChapterFn = useServerFn(getChapter);
  const getAudioFn = useServerFn(getChapterAudioUrl);
  const renderFn = useServerFn(renderChapterAudio);
  const getDash = useServerFn(getDashboardData);

  const { data: chapter, isLoading, error } = useQuery({
    queryKey: ["chapter", id],
    queryFn: () => getChapterFn({ data: { id } }),
  });

  const { data: dashboard } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDash(),
  });
  const profile = dashboard?.profile as any;
  const defaultSpeed = Number(profile?.playback_speed ?? 1);

  const audioStatus: string = (chapter as any)?.audio_status ?? "idle";

  const { data: audioInfo, refetch: refetchAudio } = useQuery({
    queryKey: ["chapter-audio", id],
    queryFn: () => getAudioFn({ data: { chapter_id: id } }),
    enabled: !!chapter,
    refetchInterval: (q) =>
      q.state.data?.status === "pending" ? 3000 : false,
  });

  const render = useMutation({
    mutationFn: () => renderFn({ data: { chapter_id: id } }),
    onSuccess: () => {
      toast.success("Narration ready");
      qc.invalidateQueries({ queryKey: ["chapter", id] });
      refetchAudio();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not generate narration"),
  });

  // Auto-poll renders status changes from server fn into chapter row
  useEffect(() => {
    if (audioInfo?.status === "ready") {
      qc.invalidateQueries({ queryKey: ["chapter", id] });
    }
  }, [audioInfo?.status, id, qc]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load chapter.</p>;
  if (!chapter) return null;

  const c = chapter as any;
  const voice = voiceById(c.audio_voice_id ?? profile?.narrator_voice_id);

  return (
    <article className="mx-auto max-w-2xl">
      <Link to="/library" className="text-sm text-muted-foreground hover:underline">
        ← Library
      </Link>
      <div className="mt-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {c.chapter_type.replace("_", " ")} · {new Date(c.created_at).toLocaleDateString()}
      </div>
      <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">{c.title}</h1>

      <AudioPanel
        chapterId={id}
        title={c.title}
        url={audioInfo?.url ?? null}
        status={audioInfo?.status ?? audioStatus}
        duration={audioInfo?.duration ?? c.audio_duration_seconds ?? null}
        defaultSpeed={defaultSpeed}
        voiceName={voice.name}
        onGenerate={() => render.mutate()}
        isGenerating={render.isPending || (audioInfo?.status ?? audioStatus) === "pending"}
      />

      <div className="prose prose-lg mt-8 max-w-none whitespace-pre-wrap leading-relaxed text-foreground">
        {c.content}
      </div>
    </article>
  );
}

function AudioPanel(props: {
  chapterId: string;
  title: string;
  url: string | null;
  status: string;
  duration: number | null;
  defaultSpeed: number;
  voiceName: string;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(props.duration ?? 0);
  const [speed, setSpeed] = useState(props.defaultSpeed);

  const storageKey = useMemo(() => `chapter-audio-pos:${props.chapterId}`, [props.chapterId]);

  useEffect(() => {
    setSpeed(props.defaultSpeed);
  }, [props.defaultSpeed]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  // Resume position from localStorage
  useEffect(() => {
    if (!props.url || !audioRef.current) return;
    const saved = Number(localStorage.getItem(storageKey) ?? 0);
    if (saved > 1) {
      try {
        audioRef.current.currentTime = saved;
      } catch {/* ignore */}
    }
  }, [props.url, storageKey]);

  if (props.status !== "ready" || !props.url) {
    return (
      <Card className="book-card mt-8 flex items-center gap-4 p-5">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Headphones className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-display text-base font-semibold">Listen to this chapter</div>
          <div className="text-xs text-muted-foreground">
            {props.status === "pending"
              ? `Narrating in ${props.voiceName}'s voice — this takes about a minute…`
              : props.status === "failed"
                ? "Narration failed. Try again."
                : `Generate an audiobook-quality reading narrated by ${props.voiceName}.`}
          </div>
        </div>
        <Button onClick={props.onGenerate} disabled={props.isGenerating}>
          {props.isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating
            </>
          ) : props.status === "failed" ? (
            "Retry"
          ) : (
            "Generate audio"
          )}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="book-card sticky top-4 z-10 mt-8 space-y-3 p-5 backdrop-blur">
      <audio
        ref={audioRef}
        src={props.url}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const a = e.currentTarget;
          a.playbackRate = speed;
          if (Number.isFinite(a.duration)) setDuration(a.duration);
        }}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setCurrent(t);
          localStorage.setItem(storageKey, String(t));
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          localStorage.removeItem(storageKey);
        }}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            const a = audioRef.current;
            if (!a) return;
            a.currentTime = Math.max(0, a.currentTime - 15);
          }}
          className="rounded-full p-2 hover:bg-muted"
          aria-label="Back 15 seconds"
        >
          <RotateCcw className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => {
            const a = audioRef.current;
            if (!a) return;
            if (a.paused) a.play();
            else a.pause();
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={() => {
            const a = audioRef.current;
            if (!a) return;
            a.currentTime = Math.min(duration || a.duration || 0, a.currentTime + 15);
          }}
          className="rounded-full p-2 hover:bg-muted"
          aria-label="Forward 15 seconds"
        >
          <RotateCw className="h-5 w-5" />
        </button>

        <div className="flex-1 px-2">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={current}
            onChange={(e) => {
              const a = audioRef.current;
              if (!a) return;
              a.currentTime = Number(e.target.value);
            }}
            className="w-full accent-primary"
          />
          <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
            <span>{fmtTime(current)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>

        <select
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs tabular-nums"
          aria-label="Playback speed"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Headphones className="h-3 w-3" /> Narrated by {props.voiceName}
        </span>
        <span>Estimated · audio may run slightly longer</span>
      </div>
    </Card>
  );
}
