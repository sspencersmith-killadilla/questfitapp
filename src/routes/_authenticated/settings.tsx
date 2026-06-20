import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getDashboardData } from "@/lib/dashboard.functions";
import { updateSettings } from "@/lib/settings.functions";
import { previewVoice } from "@/lib/narration.functions";
import { NARRATOR_VOICES, DEFAULT_VOICE_ID } from "@/lib/voices";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Play, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchDashboard = useServerFn(getDashboardData);
  const saveFn = useServerFn(updateSettings);
  const previewFn = useServerFn(previewVoice);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchDashboard(),
  });

  const [form, setForm] = useState({
    display_name: "",
    weekly_goal_minutes: 150,
    weekly_goal_steps: 35000,
    weekly_goal_workouts: 3,
    starting_weight_kg: "",
    narrator_voice_id: DEFAULT_VOICE_ID,
    playback_speed: 1,
    autoplay_next: true,
  });

  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!data?.profile) return;
    const p = data.profile as any;
    setForm({
      display_name: p.display_name ?? "",
      weekly_goal_minutes: p.weekly_goal_minutes ?? 150,
      weekly_goal_steps: p.weekly_goal_steps ?? 35000,
      weekly_goal_workouts: p.weekly_goal_workouts ?? 3,
      starting_weight_kg:
        p.starting_weight_kg !== null && p.starting_weight_kg !== undefined
          ? String(p.starting_weight_kg)
          : "",
      narrator_voice_id: p.narrator_voice_id ?? DEFAULT_VOICE_ID,
      playback_speed: Number(p.playback_speed ?? 1),
      autoplay_next: p.autoplay_next ?? true,
    });
  }, [data?.profile]);

  const mutation = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          display_name: form.display_name.trim() || undefined,
          weekly_goal_minutes: Number(form.weekly_goal_minutes),
          weekly_goal_steps: Number(form.weekly_goal_steps),
          weekly_goal_workouts: Number(form.weekly_goal_workouts),
          starting_weight_kg: form.starting_weight_kg
            ? Number(form.starting_weight_kg)
            : null,
          narrator_voice_id: form.narrator_voice_id,
          playback_speed: form.playback_speed,
          autoplay_next: form.autoplay_next,
        },
      }),
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      navigate({ to: "/app" });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save"),
  });

  const playPreview = async (voiceId: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPreviewingId(voiceId);
      const res = await previewFn({ data: { voice_id: voiceId } });
      const audio = new Audio(`data:${res.mime};base64,${res.audio_base64}`);
      audioRef.current = audio;
      audio.onended = () => setPreviewingId((c) => (c === voiceId ? null : c));
      await audio.play();
    } catch (e: any) {
      toast.error(e.message ?? "Preview failed");
      setPreviewingId(null);
    }
  };

  if (isLoading || !data) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  const latestWeight = data.weights[0];

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reader profile</p>
        <h1 className="mt-2 font-display text-5xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Set your weekly intentions, choose the voice that reads to you, and shape how the story
          measures your effort.
        </p>
      </div>

      <Card className="book-card p-7">
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="display_name">Display name</Label>
            <Input
              id="display_name"
              value={form.display_name}
              maxLength={60}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
            />
          </div>

          <div className="rule-divider text-sm">Weekly goals</div>

          <div className="grid gap-5 sm:grid-cols-3">
            <Field
              label="Active minutes"
              suffix="min / week"
              value={form.weekly_goal_minutes}
              min={30}
              max={2000}
              step={10}
              onChange={(n) => setForm((f) => ({ ...f, weekly_goal_minutes: n }))}
            />
            <Field
              label="Steps"
              suffix="/ week"
              value={form.weekly_goal_steps}
              min={0}
              max={700000}
              step={1000}
              onChange={(n) => setForm((f) => ({ ...f, weekly_goal_steps: n }))}
            />
            <Field
              label="Workouts"
              suffix="/ week"
              value={form.weekly_goal_workouts}
              min={0}
              max={30}
              step={1}
              onChange={(n) => setForm((f) => ({ ...f, weekly_goal_workouts: n }))}
            />
          </div>
          <p className="text-xs italic text-muted-foreground">
            Daily targets are derived from these — roughly{" "}
            {Math.round(form.weekly_goal_minutes / 7)} min,{" "}
            {Math.round(form.weekly_goal_steps / 7).toLocaleString()} steps a day.
          </p>

          <div className="rule-divider text-sm">Narrator</div>

          <p className="text-xs text-muted-foreground">
            Choose the voice that will read your chapters aloud. Tap any narrator to hear a sample.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {NARRATOR_VOICES.map((v) => {
              const selected = form.narrator_voice_id === v.id;
              const isPreviewing = previewingId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, narrator_voice_id: v.id }))}
                  className={`rounded-lg border p-4 text-left transition ${
                    selected
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "hover:border-foreground/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display text-lg font-semibold">{v.name}</div>
                      <div className="mt-1 text-xs italic text-muted-foreground">
                        {v.tagline}
                      </div>
                      <div className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                        {v.bestFor}
                      </div>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        playPreview(v.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          playPreview(v.id);
                        }
                      }}
                      className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border bg-background text-foreground hover:bg-muted"
                      aria-label={`Preview ${v.name}`}
                    >
                      {isPreviewing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="speed">Default playback speed</Label>
              <select
                id="speed"
                value={form.playback_speed}
                onChange={(e) =>
                  setForm((f) => ({ ...f, playback_speed: Number(e.target.value) }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {[0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2].map((s) => (
                  <option key={s} value={s}>
                    {s}×
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <Label>Autoplay next chapter</Label>
                <p className="text-xs text-muted-foreground">
                  When one chapter ends, queue the next unlocked one.
                </p>
              </div>
              <Switch
                checked={form.autoplay_next}
                onCheckedChange={(v) => setForm((f) => ({ ...f, autoplay_next: v }))}
              />
            </div>
          </div>

          <div className="rule-divider text-sm">Body measurements</div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="starting_weight">Starting weight (kg)</Label>
              <Input
                id="starting_weight"
                type="number"
                step="0.1"
                min={20}
                max={500}
                value={form.starting_weight_kg}
                onChange={(e) =>
                  setForm((f) => ({ ...f, starting_weight_kg: e.target.value }))
                }
                placeholder={latestWeight ? `e.g. ${latestWeight.weight_kg}` : "e.g. 78.5"}
              />
              <p className="text-xs text-muted-foreground">
                Used as the baseline for the weight delta on your dashboard.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Latest logged weight</Label>
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                {latestWeight
                  ? `${latestWeight.weight_kg} kg · ${new Date(
                      latestWeight.entry_date,
                    ).toLocaleDateString()}`
                  : "No weight logged yet"}
              </div>
              <Link to="/log/weight" className="text-xs text-primary hover:underline">
                Log a weigh-in →
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Link to="/app">
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function Field({
  label,
  suffix,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{suffix}</p>
    </div>
  );
}
