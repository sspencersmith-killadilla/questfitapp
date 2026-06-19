import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  deleteActivity,
  getActivityHistory,
  logActivity,
} from "@/lib/dashboard.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Trash2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/log/workout")({
  component: WorkoutLogPage,
});

const PRESETS = ["Run", "Walk", "Bike", "Lift", "Yoga", "Swim", "Hike", "HIIT", "Other"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function yesterdayISO() {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

function WorkoutLogPage() {
  const qc = useQueryClient();
  const fetchHistory = useServerFn(getActivityHistory);
  const { data: history } = useQuery({
    queryKey: ["activity-history"],
    queryFn: () => fetchHistory(),
  });

  const [date, setDate] = useState(todayISO());
  const [workoutType, setWorkoutType] = useState("");
  const [customType, setCustomType] = useState("");
  const [intensity, setIntensity] = useState<"easy" | "moderate" | "hard" | "">("");
  const [steps, setSteps] = useState("");
  const [minutes, setMinutes] = useState("");
  const [notes, setNotes] = useState("");

  const logFn = useServerFn(logActivity);
  const saveMutation = useMutation({
    mutationFn: () =>
      logFn({
        data: {
          entry_date: date,
          steps: Number(steps) || 0,
          active_minutes: Number(minutes) || 0,
          workout_type:
            (workoutType === "Other" ? customType : workoutType) || null,
          intensity: (intensity || null) as any,
          notes: notes || null,
        },
      }),
    onSuccess: () => {
      toast.success("Workout logged");
      setSteps("");
      setMinutes("");
      setCustomType("");
      setWorkoutType("");
      setIntensity("");
      setNotes("");
      qc.invalidateQueries({ queryKey: ["activity-history"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  const delFn = useServerFn(deleteActivity);
  const delMutation = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Entry removed");
      qc.invalidateQueries({ queryKey: ["activity-history"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });

  const grouped = groupByWeek(history ?? []);

  return (
    <div className="space-y-8">
      <div>
        <Link to="/app" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Log a workout</h1>
        <p className="text-sm text-muted-foreground">
          Every entry feeds your story. Be honest — your protagonist needs the truth.
        </p>
      </div>

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="date">Date</Label>
            <div className="mt-1 flex gap-2">
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <Button type="button" variant="outline" size="sm" onClick={() => setDate(yesterdayISO())}>
                Yesterday
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setDate(todayISO())}>
                Today
              </Button>
            </div>
          </div>
          <div>
            <Label>Workout type</Label>
            <Select value={workoutType} onValueChange={setWorkoutType}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Choose a preset…" /></SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {workoutType === "Other" && (
              <Input
                className="mt-2"
                placeholder="Describe it"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
              />
            )}
          </div>
          <div>
            <Label htmlFor="minutes">Active minutes</Label>
            <Input
              id="minutes"
              type="number"
              min={0}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="30"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="steps">Steps (optional)</Label>
            <Input
              id="steps"
              type="number"
              min={0}
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              placeholder="8500"
              className="mt-1"
            />
          </div>
          <div>
            <Label>Intensity</Label>
            <Select value={intensity} onValueChange={(v) => setIntensity(v as any)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel?"
              className="mt-1"
              rows={2}
            />
          </div>
        </div>
        <Button
          className="mt-6"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || (!minutes && !steps)}
        >
          {saveMutation.isPending ? "Saving…" : "Save workout"}
        </Button>
      </Card>

      <div>
        <h2 className="text-xl font-semibold">Recent workouts</h2>
        {(history ?? []).length === 0 && (
          <Card className="mt-3 p-6 text-sm text-muted-foreground">No entries yet.</Card>
        )}
        <div className="mt-3 space-y-6">
          {grouped.map((week) => (
            <div key={week.label}>
              <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
                {week.label} · {week.totalMinutes} min · {week.entries.length} entries
              </div>
              <Card className="divide-y">
                {week.entries.map((e: any) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <div className="text-sm font-medium">
                        {e.workout_type ?? "Activity"}
                        {e.intensity && (
                          <span className="ml-2 text-xs text-muted-foreground">· {e.intensity}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(e.entry_date).toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                        {" · "}
                        {e.active_minutes} min
                        {e.steps ? ` · ${e.steps.toLocaleString()} steps` : ""}
                      </div>
                      {e.notes && <div className="mt-1 text-xs italic text-muted-foreground">"{e.notes}"</div>}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => delMutation.mutate(e.id)}
                      disabled={delMutation.isPending}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function groupByWeek(entries: any[]) {
  const buckets = new Map<string, { label: string; entries: any[]; totalMinutes: number }>();
  for (const e of entries) {
    const d = new Date(e.entry_date);
    const day = d.getUTCDay();
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    const label = `Week of ${monday.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    const cur = buckets.get(key) ?? { label, entries: [], totalMinutes: 0 };
    cur.entries.push(e);
    cur.totalMinutes += e.active_minutes ?? 0;
    buckets.set(key, cur);
  }
  return Array.from(buckets.values());
}
