import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { GENRES } from "@/lib/genres";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuestFit — Your fitness, told as a story" },
      {
        name: "description",
        content:
          "An AI-narrated serial novel that unfolds as you move. Hit your goals to unlock chapters; your activity steers the plot.",
      },
      { property: "og:title", content: "QuestFit — Your fitness, told as a story" },
      {
        property: "og:description",
        content: "An AI-narrated serial novel that unlocks as you move.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📖</span>
          <span className="text-lg font-semibold tracking-tight">QuestFit</span>
        </div>
        <Link to="/auth">
          <Button variant="ghost">Sign in</Button>
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        <section className="grid gap-12 md:grid-cols-2 md:items-center md:gap-16">
          <div>
            <h1 className="text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
              Your fitness,<br />told as a story.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              QuestFit pairs your real activity — steps, workouts, weight — with an AI-narrated serial
              novel that unfolds week by week. Hit your goal and the hero wins ground.
              Skip a week and the story takes a different turn.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth">
                <Button size="lg">Begin your story</Button>
              </Link>
              <a href="#how">
                <Button size="lg" variant="outline">How it works</Button>
              </a>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Free during preview · Log your activity and weight manually
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-8 shadow-sm">
            <div className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
              Chapter 3 · The Marrow Pass
            </div>
            <p className="text-sm italic leading-relaxed text-card-foreground">
              "Vesna pressed her palm against the frostbitten stone. Three days of climbing —
              and only three — but the pass had finally opened to her. Below, the valley her
              village had given up on glittered like a coin held to candlelight. She did not
              turn back. Not this time."
            </p>
            <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
              <span>Unlocked by 4 workouts this week</span>
              <span>·</span>
              <span>Epic Fantasy</span>
            </div>
          </div>
        </section>

        <section id="how" className="mt-32">
          <h2 className="text-3xl font-bold tracking-tight">Choose your genre</h2>
          <p className="mt-2 text-muted-foreground">Four worlds. Pick one — your activity shapes what happens next.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GENRES.map((g) => (
              <div key={g.id} className="rounded-xl border bg-card p-6">
                <div className="text-3xl">{g.emoji}</div>
                <h3 className="mt-3 font-semibold">{g.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{g.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-32 grid gap-6 md:grid-cols-3">
          {[
            { n: "1", t: "Log your activity", d: "Enter steps, workouts, and weight by hand. Device sync can come later — for now you stay in control." },
            { n: "2", t: "Hit your goal", d: "Set a weekly active-minutes goal. Your performance becomes the input to the story engine." },
            { n: "3", t: "Read what unlocks", d: "Daily teasers and a full chapter each week, written for you by the AI based on what you actually did." },
          ].map((s) => (
            <div key={s.n} className="rounded-xl border p-6">
              <div className="text-sm font-mono text-muted-foreground">0{s.n}</div>
              <h3 className="mt-2 text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        QuestFit · Move. Read. Repeat.
      </footer>
    </div>
  );
}
