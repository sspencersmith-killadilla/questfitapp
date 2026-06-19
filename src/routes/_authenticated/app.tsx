import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { getDashboardData, logActivity, logWeight } from "@/lib/dashboard.functions";
import { generateChapter } from "@/lib/story.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { genreById } from "@/lib/genres";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app")({
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchDashboard = useServerFn(getDashboardData);
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchDashboard(),
  });

  useEffect(() => {
    if (data && data.profile && !data.profile.onboarding_complete) {
      navigate({ to: "/onboarding" });
    }
  }, [data, navigate]);

  const generateFn = useServerFn(generateChapter);
  const genMutation = useMutation({
    mutationFn: (chapter_type: "daily_teaser" | "weekly_chapter" | "prologue") =>
      generateFn({ data: { chapter_type } }),
    onSuccess: (chapter) => {
      toast.success(`New ${chapter.chapter_type.replace("_", " ")} unlocked`);
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["chapters"] });
      navigate({ to: "/chapters/$id", params: { id: chapter.id } });
    },
    onError: (e: any) => toast.error(e.message ?? "Generation failed"),
  });

  if (isLoading || !data) {
    return <div className="text-sm text-muted-foreground">Loading your dashboard...</div>;
  }
  if (!data.profile?.onboarding_complete) return null;

  const genre = data.profile.chosen_genre ? genreById(data.profile.chosen_genre as any) : null;
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const weekActivity = data.activity.filter((a) => a.entry_date >= weekStart);
  const weekMinutes = weekActivity.reduce((s, a) => s + (a.active_minutes ?? 0), 0);
  const weekSteps = weekActivity.reduce((s, a) => s + (a.steps ?? 0), 0);
  const goal = data.profile.weekly_goal_minutes;
  const goalPct = Math.min(100, Math.round((weekMinutes / goal) * 100));
  const latestWeight = data.weights[0];
  const hasPrologue = data.recentChapters.some((c) => c.chapter_type === "prologue");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">
          Welcome back, {data.profile.display_name}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {genre?.emoji} {genre?.name}
        </h1>
      </div>

      {!hasPrologue && (
        <Card className="border-primary/30 bg-primary/5 p-6">
          <h2 className="text-lg font-semibold">Your story hasn't begun yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Generate the prologue to meet your protagonist and set the stakes.
          </p>
          <Button
            className="mt-4"
            onClick={() => genMutation.mutate("prologue")}
            disabled={genMutation.isPending}
          >
            {genMutation.isPending ? "Writing prologue..." : "Begin the story"}
          </Button>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">This week</div>
          <div className="mt-2 text-3xl font-bold">{weekMinutes}<span className="text-base font-normal text-muted-foreground"> / {goal} min</span></div>
          <Progress value={goalPct} className="mt-3" />
          <div className="mt-2 text-xs text-muted-foreground">{goalPct}% of weekly goal</div>
        </Card>
        <Card className="p-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Steps (7d)</div>
          <div className="mt-2 text-3xl font-bold">{weekSteps.toLocaleString()}</div>
          <div className="mt-3 text-xs text-muted-foreground">{weekActivity.length} entries</div>
        </Card>
        <Card className="p-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Latest weight</div>
          <div className="mt-2 text-3xl font-bold">
            {latestWeight ? `${latestWeight.weight_kg}` : "—"}
            <span className="text-base font-normal text-muted-foreground"> kg</span>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            {latestWeight ? new Date(latestWeight.entry_date).toLocaleDateString() : "No entries yet"}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <LogActivityCard onLogged={() => qc.invalidateQueries({ queryKey: ["dashboard"] })} />
        <LogWeightCard onLogged={() => qc.invalidateQueries({ queryKey: ["dashboard"] })} />
      </div>

      {hasPrologue && (
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">The story so far</h2>
              <p className="text-sm text-muted-foreground">
                Generate the next chapter when you're ready.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => genMutation.mutate("daily_teaser")}
                disabled={genMutation.isPending}
              >
                Daily teaser
              </Button>
              <Button
                onClick={() => genMutation.mutate("weekly_chapter")}
                disabled={genMutation.isPending}
              >
                {genMutation.isPending ? "Writing..." : "Weekly chapter"}
              </Button>
            </div>
          </div>

          {data.recentChapters.length > 0 && (
            <ul className="mt-6 divide-y">
              {data.recentChapters.map((c) => (
                <li key={c.id} className="py-3">
                  <Link to="/chapters/$id" params={{ id: c.id }} className="flex items-center justify-between hover:underline">
                    <span>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        {c.chapter_type.replace("_", " ")}
                      </span>
                      <span className="ml-3 font-medium">{c.title}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function LogActivityCard({ onLogged }: { onLogged: () => void }) {
  const [steps, setSteps] = useState("");
  const [minutes, setMinutes] = useState("");
  const [workoutType, setWorkoutType] = useState("");
  const [intensity, setIntensity] = useState<"easy" | "moderate" | "hard" | "">("");
  const logFn = useServerFn(logActivity);
  const m = useMutation({
    mutationFn: () =>
      logFn({
        data: {
          steps: Number(steps) || 0,
          active_minutes: Number(minutes) || 0,
          workout_type: workoutType || null,
          intensity: (intensity || null) as any,
        },
      }),
    onSuccess: () => {
      toast.success("Activity logged");
      setSteps(""); setMinutes(""); setWorkoutType(""); setIntensity("");
      onLogged();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to log"),
  });

  return (
    <Card className="p-6">
      <h3 className="font-semibold">Log activity</h3>
      <p className="text-sm text-muted-foreground">For today</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="steps">Steps</Label>
          <Input id="steps" type="number" value={steps} onChange={(e) => setSteps(e.target.value)} placeholder="8500" />
        </div>
        <div>
          <Label htmlFor="minutes">Active minutes</Label>
          <Input id="minutes" type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="30" />
        </div>
        <div>
          <Label htmlFor="wtype">Workout</Label>
          <Input id="wtype" value={workoutType} onChange={(e) => setWorkoutType(e.target.value)} placeholder="Run, lift, yoga…" />
        </div>
        <div>
          <Label>Intensity</Label>
          <Select value={intensity} onValueChange={(v) => setIntensity(v as any)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button className="mt-4 w-full" onClick={() => m.mutate()} disabled={m.isPending || (!steps && !minutes)}>
        {m.isPending ? "Saving..." : "Save activity"}
      </Button>
    </Card>
  );
}

function LogWeightCard({ onLogged }: { onLogged: () => void }) {
  const [weight, setWeight] = useState("");
  const [bf, setBf] = useState("");
  const logFn = useServerFn(logWeight);
  const m = useMutation({
    mutationFn: () =>
      logFn({
        data: {
          weight_kg: Number(weight),
          body_fat_pct: bf ? Number(bf) : null,
        },
      }),
    onSuccess: () => {
      toast.success("Weight logged");
      setWeight(""); setBf("");
      onLogged();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to log"),
  });

  return (
    <Card className="p-6">
      <h3 className="font-semibold">Log weight</h3>
      <p className="text-sm text-muted-foreground">Withings auto-sync coming soon</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="weight">Weight (kg)</Label>
          <Input id="weight" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="72.5" />
        </div>
        <div>
          <Label htmlFor="bf">Body fat %</Label>
          <Input id="bf" type="number" step="0.1" value={bf} onChange={(e) => setBf(e.target.value)} placeholder="optional" />
        </div>
      </div>
      <Button className="mt-4 w-full" onClick={() => m.mutate()} disabled={m.isPending || !weight}>
        {m.isPending ? "Saving..." : "Save weight"}
      </Button>
    </Card>
  );
}
