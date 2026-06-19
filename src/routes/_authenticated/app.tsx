import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { getDashboardData } from "@/lib/dashboard.functions";
import { generateChapter } from "@/lib/story.functions";
import {
  evaluateChallenges,
  generateChallenge,
  abandonChallenge,
} from "@/lib/challenges.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { genreById } from "@/lib/genres";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/app")({
  component: Dashboard,
});

const METRIC_LABEL: Record<string, string> = {
  active_minutes: "active min",
  steps: "steps",
  workouts: "workouts",
};

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchDashboard = useServerFn(getDashboardData);
  const evalFn = useServerFn(evaluateChallenges);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      // best-effort re-evaluation before reading the dashboard
      try {
        await evalFn();
      } catch {
        /* ignore */
      }
      return fetchDashboard();
    },
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

  const newChallengeFn = useServerFn(generateChallenge);
  const newChallengeMutation = useMutation({
    mutationFn: () => newChallengeFn({ data: { days: 5 } }),
    onSuccess: () => {
      toast.success("A new challenge awaits");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not create challenge"),
  });

  const abandonFn = useServerFn(abandonChallenge);
  const abandonMutation = useMutation({
    mutationFn: (id: string) => abandonFn({ data: { id } }),
    onSuccess: () => {
      toast("Challenge abandoned");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (isLoading || !data) {
    return <div className="text-sm text-muted-foreground">Loading your dashboard...</div>;
  }
  if (!data.profile?.onboarding_complete) return null;

  const genre = data.profile.chosen_genre ? genreById(data.profile.chosen_genre as any) : null;
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const prevWeekStart = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);

  const weekActivity = data.activity.filter((a) => a.entry_date >= weekStart);
  const prevWeekActivity = data.activity.filter(
    (a) => a.entry_date >= prevWeekStart && a.entry_date < weekStart,
  );

  const weekMinutes = weekActivity.reduce((s, a) => s + (a.active_minutes ?? 0), 0);
  const prevWeekMinutes = prevWeekActivity.reduce((s, a) => s + (a.active_minutes ?? 0), 0);
  const weekSteps = weekActivity.reduce((s, a) => s + (a.steps ?? 0), 0);
  const prevWeekSteps = prevWeekActivity.reduce((s, a) => s + (a.steps ?? 0), 0);
  const goal = data.profile.weekly_goal_minutes;
  const goalPct = Math.min(100, Math.round((weekMinutes / goal) * 100));
  const activeDaysThisWeek = new Set(
    weekActivity.filter((a) => a.steps > 1000 || a.active_minutes >= 10).map((a) => a.entry_date),
  ).size;

  // streak: consecutive days back from today with activity
  const activitySet = new Set(
    data.activity.filter((a) => a.steps > 1000 || a.active_minutes >= 10).map((a) => a.entry_date),
  );
  let streak = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    if (activitySet.has(d)) streak++;
    else if (i > 0) break;
  }

  const latestWeight = data.weights[0];
  const earlierWeight = data.weights.find(
    (w) => w.entry_date <= new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
  );
  const weightDelta =
    latestWeight && earlierWeight
      ? Number(latestWeight.weight_kg) - Number(earlierWeight.weight_kg)
      : null;

  const hasPrologue = data.recentChapters.some((c) => c.chapter_type === "prologue");
  const lastWeekly = data.recentChapters.find((c) => c.chapter_type === "weekly_chapter");
  const lastWeeklyDays = lastWeekly
    ? Math.floor((Date.now() - new Date(lastWeekly.created_at).getTime()) / 86400000)
    : null;
  const weeklyReady = activeDaysThisWeek >= 3 && (lastWeeklyDays === null || lastWeeklyDays >= 7);
  const daysUntilWeekly = lastWeeklyDays === null ? 0 : Math.max(0, 7 - lastWeeklyDays);

  const today14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86400000).toISOString().slice(0, 10);
    const entries = data.activity.filter((a) => a.entry_date === d);
    const minutes = entries.reduce((s, a) => s + (a.active_minutes ?? 0), 0);
    const dailyGoal = Math.round(goal / 7);
    return {
      date: d.slice(5),
      minutes,
      hit: minutes >= dailyGoal,
    };
  });

  const ch = data.activeChallenge;
  const chPct = ch ? Math.min(100, Math.round((ch.progress_value / ch.target_value) * 100)) : 0;
  const chDaysLeft = ch
    ? Math.max(0, Math.ceil((new Date(ch.deadline).getTime() - Date.now()) / 86400000))
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back, {data.profile.display_name}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            {genre?.emoji} {genre?.name}
          </h1>
          {data.storyState?.current_arc && (
            <p className="mt-1 text-sm italic text-muted-foreground">
              Current arc: {data.storyState.current_arc}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Link to="/log/workout"><Button variant="outline">Log workout</Button></Link>
          <Link to="/log/weight"><Button variant="outline">Log weight</Button></Link>
        </div>
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

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Streak" value={`${streak}`} sub={`day${streak === 1 ? "" : "s"} in a row`} />
        <StatCard
          label="This week"
          value={`${weekMinutes}`}
          sub={`/ ${goal} min`}
          progress={goalPct}
        />
        <StatCard
          label="Steps (7d)"
          value={weekSteps.toLocaleString()}
          sub={delta(weekSteps, prevWeekSteps, " vs last week")}
        />
        <StatCard
          label="Weight"
          value={latestWeight ? `${latestWeight.weight_kg} kg` : "—"}
          sub={
            weightDelta !== null
              ? `${weightDelta > 0 ? "+" : ""}${weightDelta.toFixed(1)} kg / 30d`
              : "log to track"
          }
        />
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Last 14 days · active minutes</h3>
          <div className="text-xs text-muted-foreground">
            Goal: {Math.round(goal / 7)} min/day
          </div>
        </div>
        <div className="mt-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={today14} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <RTooltip />
              <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                {today14.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.hit ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.4)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {hasPrologue && (
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Narrative challenge</div>
              <h3 className="mt-1 text-lg font-semibold">
                {ch ? ch.title : "No active challenge"}
              </h3>
            </div>
            {!ch && (
              <Button
                onClick={() => newChallengeMutation.mutate()}
                disabled={newChallengeMutation.isPending}
              >
                {newChallengeMutation.isPending ? "Summoning…" : "Generate a challenge"}
              </Button>
            )}
          </div>
          {ch && (
            <>
              <p className="mt-3 text-sm italic text-muted-foreground">"{ch.narrative_hook}"</p>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {ch.progress_value} / {ch.target_value} {METRIC_LABEL[ch.metric] ?? ch.metric}
                </span>
                <span>
                  {chDaysLeft} day{chDaysLeft === 1 ? "" : "s"} left
                </span>
              </div>
              <Progress value={chPct} className="mt-2" />
              <div className="mt-3 text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => abandonMutation.mutate(ch.id)}
                  disabled={abandonMutation.isPending}
                >
                  Abandon
                </Button>
              </div>
            </>
          )}
        </Card>
      )}

      {hasPrologue && (
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">The story so far</h2>
              <p className="text-sm text-muted-foreground">
                {weeklyReady
                  ? "You've earned a new chapter."
                  : daysUntilWeekly > 0
                    ? `Next weekly chapter in ${daysUntilWeekly} day${daysUntilWeekly === 1 ? "" : "s"}.`
                    : `Weekly chapter unlocks after 3 active days (${activeDaysThisWeek}/3).`}
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
                disabled={genMutation.isPending || !weeklyReady}
                title={!weeklyReady ? "Keep moving — the chapter unlocks soon." : ""}
              >
                {genMutation.isPending ? "Writing..." : "Weekly chapter"}
              </Button>
            </div>
          </div>

          {data.recentChapters.length > 0 && (
            <ul className="mt-6 divide-y">
              {data.recentChapters.map((c) => (
                <li key={c.id} className="py-3">
                  <Link
                    to="/chapters/$id"
                    params={{ id: c.id }}
                    className="flex items-center justify-between hover:underline"
                  >
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

function StatCard({
  label,
  value,
  sub,
  progress,
}: {
  label: string;
  value: string;
  sub?: string;
  progress?: number;
}) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {progress !== undefined && <Progress value={progress} className="mt-3" />}
      {sub && <div className="mt-2 text-xs text-muted-foreground">{sub}</div>}
    </Card>
  );
}

function delta(curr: number, prev: number, suffix: string) {
  if (!prev) return curr ? "new week" : "no data";
  const d = curr - prev;
  const pct = Math.round((d / prev) * 100);
  return `${d >= 0 ? "+" : ""}${pct}%${suffix}`;
}
