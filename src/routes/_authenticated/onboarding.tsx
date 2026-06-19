import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { completeOnboarding } from "@/lib/dashboard.functions";
import { GENRES, type Genre } from "@/lib/genres";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [protagonist, setProtagonist] = useState("");
  const [genre, setGenre] = useState<Genre | null>(null);
  const [goal, setGoal] = useState(150);

  const fn = useServerFn(completeOnboarding);
  const m = useMutation({
    mutationFn: () =>
      fn({
        data: {
          display_name: displayName,
          chosen_genre: genre!,
          protagonist_name: protagonist,
          weekly_goal_minutes: goal,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Welcome to QuestFit");
      navigate({ to: "/app" });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 text-xs uppercase tracking-wider text-muted-foreground">
        Step {step + 1} of 3
      </div>

      {step === 0 && (
        <Card className="p-8">
          <h1 className="text-2xl font-bold">Who are you?</h1>
          <p className="mt-1 text-sm text-muted-foreground">Just the basics.</p>
          <div className="mt-6 space-y-4">
            <div>
              <Label htmlFor="dn">Your name (or handle)</Label>
              <Input id="dn" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Alex" />
            </div>
            <div>
              <Label htmlFor="goal">Weekly active-minutes goal</Label>
              <Input
                id="goal"
                type="number"
                min={30}
                max={2000}
                value={goal}
                onChange={(e) => setGoal(Number(e.target.value))}
              />
              <p className="mt-1 text-xs text-muted-foreground">WHO recommends 150 min/week of moderate activity.</p>
            </div>
          </div>
          <Button className="mt-6" disabled={!displayName.trim()} onClick={() => setStep(1)}>
            Continue
          </Button>
        </Card>
      )}

      {step === 1 && (
        <div>
          <h1 className="text-2xl font-bold">Pick your genre</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your activity shapes the story. Pick the world you want to live in.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {GENRES.map((g) => (
              <button
                key={g.id}
                onClick={() => setGenre(g.id)}
                className={`rounded-xl border p-6 text-left transition ${
                  genre === g.id ? "border-primary ring-2 ring-primary/30" : "hover:border-foreground/30"
                }`}
              >
                <div className="text-3xl">{g.emoji}</div>
                <h3 className="mt-3 font-semibold">{g.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{g.tagline}</p>
              </button>
            ))}
          </div>
          <div className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setStep(0)}>Back</Button>
            <Button disabled={!genre} onClick={() => setStep(2)}>Continue</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <Card className="p-8">
          <h1 className="text-2xl font-bold">Name your protagonist</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The hero of your story. Their journey will mirror yours.
          </p>
          <div className="mt-6">
            <Label htmlFor="pn">Protagonist name</Label>
            <Input id="pn" value={protagonist} onChange={(e) => setProtagonist(e.target.value)} placeholder="Vesna, Kade, Dr. Ito…" />
          </div>
          <div className="mt-6 flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button disabled={!protagonist.trim() || m.isPending} onClick={() => m.mutate()}>
              {m.isPending ? "Saving..." : "Begin"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
