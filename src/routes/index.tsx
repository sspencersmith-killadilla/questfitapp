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
    <div className="min-h-screen text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="font-display text-3xl font-semibold leading-none text-primary">Q</span>
          <span className="font-display text-xl font-semibold tracking-tight">QuestFit</span>
        </div>
        <Link to="/auth">
          <Button variant="ghost">Sign in</Button>
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        <section className="grid gap-12 md:grid-cols-2 md:items-center md:gap-16">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-primary">A serial novel for your body</p>
            <h1 className="mt-4 font-display text-6xl font-semibold leading-[1.02] tracking-tight md:text-7xl">
              Your fitness,
              <br />
              <span className="italic text-primary">told as a story.</span>
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
              QuestFit pairs your real activity — steps, workouts, weight — with an AI-narrated serial
              novel that unfolds week by week. Hit your goal and the hero wins ground. Skip a week and
              the story takes a different turn.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth">
                <Button size="lg">Begin your story</Button>
              </Link>
              <a href="#how">
                <Button size="lg" variant="outline">How it works</Button>
              </a>
            </div>
            <p className="mt-6 text-xs italic text-muted-foreground">
              Free during preview · Log your activity and weight by hand
            </p>
          </div>

          <div className="book-card relative p-8">
            <div className="absolute inset-y-6 left-3 w-px bg-border" aria-hidden />
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Chapter 3 · The Marrow Pass
            </div>
            <p className="mt-4 font-display text-xl italic leading-relaxed">
              “Vesna pressed her palm against the frostbitten stone. Three days of climbing — and only
              three — but the pass had finally opened to her. Below, the valley her village had given
              up on glittered like a coin held to candlelight. She did not turn back. Not this time.”
            </p>
            <div className="mt-8 flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>Unlocked · 4 workouts this week</span>
              <span>Epic Fantasy</span>
            </div>
          </div>
        </section>

        <section id="how" className="mt-32">
          <p className="text-xs uppercase tracking-[0.25em] text-primary">Pick your shelf</p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight">Choose your genre</h2>
          <p className="mt-2 text-muted-foreground">
            Four worlds. Pick one — your activity shapes what happens next.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GENRES.map((g) => (
              <div key={g.id} className="book-card p-6 transition-transform hover:-translate-y-0.5">
                <div className="text-3xl">{g.emoji}</div>
                <h3 className="mt-3 font-display text-xl font-semibold">{g.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{g.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-32 grid gap-6 md:grid-cols-3">
          {[
            { n: "I", t: "Log your activity", d: "Enter steps, workouts, and weight by hand. You stay in control of the ledger." },
            { n: "II", t: "Hit your goal", d: "Set weekly targets for minutes, steps, and workouts. Your performance becomes story fuel." },
            { n: "III", t: "Read what unlocks", d: "Daily teasers and a full chapter each week, written for you based on what you actually did." },
          ].map((s) => (
            <div key={s.n} className="book-card p-6">
              <div className="font-display text-3xl italic text-primary">{s.n}.</div>
              <h3 className="mt-2 font-display text-xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border/70 py-8 text-center text-xs italic text-muted-foreground">
        QuestFit · Move. Read. Repeat.
      </footer>
    </div>
  );
}
