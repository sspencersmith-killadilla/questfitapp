import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { deleteWeight, getWeightHistory, logWeight } from "@/lib/dashboard.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, ArrowLeft } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/_authenticated/log/weight")({
  component: WeightLogPage,
});

function WeightLogPage() {
  const qc = useQueryClient();
  const fetchHistory = useServerFn(getWeightHistory);
  const { data: history } = useQuery({
    queryKey: ["weight-history"],
    queryFn: () => fetchHistory(),
  });

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState("");
  const [bf, setBf] = useState("");
  const [muscle, setMuscle] = useState("");

  const logFn = useServerFn(logWeight);
  const saveMutation = useMutation({
    mutationFn: () =>
      logFn({
        data: {
          entry_date: date,
          weight_kg: Number(weight),
          body_fat_pct: bf ? Number(bf) : null,
          muscle_kg: muscle ? Number(muscle) : null,
        },
      }),
    onSuccess: () => {
      toast.success("Weight logged");
      setWeight("");
      setBf("");
      setMuscle("");
      qc.invalidateQueries({ queryKey: ["weight-history"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  const delFn = useServerFn(deleteWeight);
  const delMutation = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Entry removed");
      qc.invalidateQueries({ queryKey: ["weight-history"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });

  const sorted = [...(history ?? [])].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const chartData = sorted.slice(-90).map((w) => ({
    date: w.entry_date.slice(5),
    weight: Number(w.weight_kg),
  }));

  const latest = sorted[sorted.length - 1];
  const earliest = sorted[0];
  const since30 = sorted.filter(
    (w) => w.entry_date >= new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
  );
  const since7 = sorted.filter(
    (w) => w.entry_date >= new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
  );
  const avg = (arr: typeof sorted) =>
    arr.length ? Number((arr.reduce((s, w) => s + Number(w.weight_kg), 0) / arr.length).toFixed(1)) : null;

  return (
    <div className="space-y-8">
      <div>
        <Link to="/app" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Weigh-in log</h1>
        <p className="text-sm text-muted-foreground">Track the trend, not the day-to-day noise.</p>
      </div>

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="72.5"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="bf">Body fat %</Label>
            <Input
              id="bf"
              type="number"
              step="0.1"
              value={bf}
              onChange={(e) => setBf(e.target.value)}
              placeholder="optional"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="muscle">Muscle (kg)</Label>
            <Input
              id="muscle"
              type="number"
              step="0.1"
              value={muscle}
              onChange={(e) => setMuscle(e.target.value)}
              placeholder="optional"
              className="mt-1"
            />
          </div>
        </div>
        <Button
          className="mt-6"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !weight}
        >
          {saveMutation.isPending ? "Saving…" : "Save weigh-in"}
        </Button>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Latest</div>
          <div className="mt-1 text-2xl font-bold">{latest ? `${latest.weight_kg} kg` : "—"}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">7-day avg</div>
          <div className="mt-1 text-2xl font-bold">{avg(since7) ? `${avg(since7)} kg` : "—"}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">30-day avg</div>
          <div className="mt-1 text-2xl font-bold">{avg(since30) ? `${avg(since30)} kg` : "—"}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Since start</div>
          <div className="mt-1 text-2xl font-bold">
            {latest && earliest && latest.id !== earliest.id
              ? `${(Number(latest.weight_kg) - Number(earliest.weight_kg)).toFixed(1)} kg`
              : "—"}
          </div>
        </Card>
      </div>

      {chartData.length >= 2 && (
        <Card className="p-6">
          <h3 className="text-sm font-semibold">Trend (last 90 days)</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis domain={["dataMin - 1", "dataMax + 1"]} className="text-xs" />
                <RTooltip />
                <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div>
        <h2 className="text-xl font-semibold">Recent entries</h2>
        {(history ?? []).length === 0 && (
          <Card className="mt-3 p-6 text-sm text-muted-foreground">No entries yet.</Card>
        )}
        {(history ?? []).length > 0 && (
          <Card className="mt-3 divide-y">
            {history!.map((w: any) => (
              <div key={w.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="text-sm font-medium">{w.weight_kg} kg</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(w.entry_date).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    {w.body_fat_pct ? ` · ${w.body_fat_pct}% bf` : ""}
                    {w.muscle_kg ? ` · ${w.muscle_kg} kg muscle` : ""}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => delMutation.mutate(w.id)}
                  disabled={delMutation.isPending}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
