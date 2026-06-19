import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getDashboardData } from "@/lib/dashboard.functions";
import { updateSettings } from "@/lib/settings.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchDashboard = useServerFn(getDashboardData);
  const saveFn = useServerFn(updateSettings);

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
  });

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
        },
      }),
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      navigate({ to: "/app" });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save"),
  });

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
          Set your weekly intentions. The dashboard, your streak, and the story all measure progress
          against these targets.
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
