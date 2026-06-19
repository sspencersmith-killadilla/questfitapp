import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { chatCompletion } from "./ai-gateway.server";
import { genreById, type Genre } from "./genres";

type Band = "crushed" | "hit" | "near_miss" | "dormant";

type ActivitySnapshot = {
  period: "daily" | "weekly";
  total_steps: number;
  total_active_minutes: number;
  workouts: Array<{ type: string | null; minutes: number; intensity: string | null }>;
  weight_delta_kg: number | null;
  consistency_days: number;
  band: Band;
  weekly_goal_minutes: number;
};

type ResolvedChallenge = {
  title: string;
  narrative_hook: string;
  metric: string;
  target_value: number;
  progress_value: number;
  status: "completed" | "failed";
};

async function buildSnapshot(
  supabase: any,
  userId: string,
  period: "daily" | "weekly",
  weeklyGoal: number,
): Promise<ActivitySnapshot> {
  const days = period === "daily" ? 1 : 7;
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const [{ data: activity }, { data: weights }] = await Promise.all([
    supabase.from("activity_entries").select("*").eq("user_id", userId).gte("entry_date", since),
    supabase
      .from("weight_entries")
      .select("weight_kg,entry_date")
      .eq("user_id", userId)
      .order("entry_date", { ascending: false })
      .limit(10),
  ]);

  const acts = (activity ?? []) as Array<{
    steps: number;
    active_minutes: number;
    workout_type: string | null;
    intensity: string | null;
    entry_date: string;
  }>;

  const total_steps = acts.reduce((s, a) => s + (a.steps ?? 0), 0);
  const total_active_minutes = acts.reduce((s, a) => s + (a.active_minutes ?? 0), 0);
  const workouts = acts
    .filter((a) => a.active_minutes > 0)
    .map((a) => ({ type: a.workout_type, minutes: a.active_minutes, intensity: a.intensity }));
  const consistency_days = new Set(
    acts.filter((a) => a.steps > 1000 || a.active_minutes > 10).map((a) => a.entry_date),
  ).size;

  let weight_delta_kg: number | null = null;
  if (weights && weights.length >= 2) {
    weight_delta_kg = Number((weights[0].weight_kg - weights[weights.length - 1].weight_kg).toFixed(2));
  }

  const goal = period === "daily" ? weeklyGoal / 7 : weeklyGoal;
  let band: Band;
  if (total_active_minutes >= goal * 1.25) band = "crushed";
  else if (total_active_minutes >= goal) band = "hit";
  else if (total_active_minutes >= goal * 0.5) band = "near_miss";
  else band = "dormant";

  return {
    period,
    total_steps,
    total_active_minutes,
    workouts,
    weight_delta_kg,
    consistency_days,
    band,
    weekly_goal_minutes: weeklyGoal,
  };
}

function bandPrompt(band: Band): string {
  switch (band) {
    case "crushed":
      return "The user CRUSHED their goal. The protagonist should achieve a real triumph — a hard-won breakthrough that changes the arc.";
    case "hit":
      return "The user hit their goal. The protagonist should experience steady, earned progress.";
    case "near_miss":
      return "The user fell short but stayed engaged. The protagonist should face a meaningful setback — a near-miss, a wise mentor's challenge, an obstacle named clearly. Motivating, not punishing.";
    case "dormant":
      return "The user was largely inactive. The protagonist should feel the weight of stillness — the world calling them back. Frame with empathy and hope, never shame.";
  }
}

function buildPrompt(opts: {
  genre: Genre;
  protagonist: string;
  rollingSummary: string;
  currentArc: string | null;
  snapshot: ActivitySnapshot;
  chapterType: "daily_teaser" | "weekly_chapter" | "prologue";
  resolvedChallenge: ResolvedChallenge | null;
}) {
  const g = genreById(opts.genre);
  const isOpening = opts.chapterType === "prologue";
  const lengthGuide =
    opts.chapterType === "daily_teaser"
      ? "120-180 words. A single vivid scene or character beat. End on a soft hook."
      : opts.chapterType === "prologue"
        ? "300-450 words. Establish the world, the protagonist, the stakes, and name the current arc."
        : "700-1000 words. A full chapter that advances the arc with at least one decision or turning point.";

  const challengeBeat = opts.resolvedChallenge
    ? opts.resolvedChallenge.status === "completed"
      ? `The protagonist just completed the challenge "${opts.resolvedChallenge.title}" (${opts.resolvedChallenge.narrative_hook}). Pay it off this chapter as an in-world victory.`
      : `The protagonist just FAILED the challenge "${opts.resolvedChallenge.title}" (${opts.resolvedChallenge.narrative_hook}). Pay it off this chapter as an in-world setback that opens a new path.`
    : "";

  return [
    {
      role: "system" as const,
      content: `You are a serialized novelist writing in the style of ${g.promptStyle}. You write taut, sensory prose with strong forward momentum. Never break the fourth wall. Never mention fitness apps, steps, calories, workouts, or activity metrics literally — translate them into the world's terms (miles travelled, battles won, walls built, clues gathered). Always end on a hook.`,
    },
    {
      role: "user" as const,
      content: `GENRE: ${g.name}
PROTAGONIST: ${opts.protagonist}
CHAPTER TYPE: ${opts.chapterType}
LENGTH: ${lengthGuide}
CURRENT ARC: ${opts.currentArc ?? "(none yet — name one in the prologue)"}

STORY SO FAR:
${isOpening || !opts.rollingSummary ? "(This is the opening of the serial. Establish the world and stakes.)" : opts.rollingSummary}

USER ACTIVITY THIS PERIOD (translate, never quote literally):
- Active minutes: ${opts.snapshot.total_active_minutes} (goal ${opts.snapshot.period === "daily" ? Math.round(opts.snapshot.weekly_goal_minutes / 7) : opts.snapshot.weekly_goal_minutes})
- Steps: ${opts.snapshot.total_steps}
- Workouts: ${opts.snapshot.workouts.length ? opts.snapshot.workouts.map((w) => `${w.type ?? "training"} (${w.minutes}min, ${w.intensity ?? "moderate"})`).join("; ") : "none"}
- Consistency days: ${opts.snapshot.consistency_days}
- Weight change (kg): ${opts.snapshot.weight_delta_kg ?? "unknown"}
- PERFORMANCE BAND: ${opts.snapshot.band.toUpperCase()} — ${bandPrompt(opts.snapshot.band)}
${challengeBeat ? `\nCHALLENGE PAYOFF: ${challengeBeat}` : ""}

OUTPUT FORMAT:
Line 1: a short evocative title (no quotes, no "Chapter X").
Line 2: ARC: <short name of the current arc, max 6 words>
Then a blank line.
Then the prose itself.`,
    },
  ];
}

async function summarize(prev: string, chapter: string): Promise<string> {
  const text = await chatCompletion({
    model: "google/gemini-3-flash-preview",
    temperature: 0.3,
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content:
          "You compress serialized fiction into a tight running synopsis: characters, current arc, unresolved threads, tone. Keep under 250 words. Plain prose, no bullet points.",
      },
      {
        role: "user",
        content: `Previous synopsis:\n${prev || "(none)"}\n\nNew chapter to fold in:\n${chapter}\n\nReturn the updated synopsis.`,
      },
    ],
  });
  return text;
}

const GenerateInput = z.object({
  chapter_type: z.enum(["daily_teaser", "weekly_chapter", "prologue"]),
});

export const generateChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenerateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: state }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("story_state").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    if (!profile?.chosen_genre || !profile.onboarding_complete) {
      throw new Error("Finish onboarding before generating story chapters.");
    }
    if (!state?.protagonist_name) {
      throw new Error("Your protagonist hasn't been named yet.");
    }

    // === Cadence rules ===
    const today = new Date().toISOString().slice(0, 10);

    if (data.chapter_type === "prologue") {
      const { data: existing } = await supabase
        .from("story_chapters")
        .select("id")
        .eq("user_id", userId)
        .eq("chapter_type", "prologue")
        .maybeSingle();
      if (existing) throw new Error("Your prologue is already written.");
    }

    if (data.chapter_type === "daily_teaser") {
      const { data: existing } = await supabase
        .from("story_chapters")
        .select("id")
        .eq("user_id", userId)
        .eq("chapter_type", "daily_teaser")
        .gte("created_at", `${today}T00:00:00Z`)
        .maybeSingle();
      if (existing) throw new Error("You already unlocked today's teaser. Come back tomorrow.");
    }

    if (data.chapter_type === "weekly_chapter") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: existing } = await supabase
        .from("story_chapters")
        .select("id")
        .eq("user_id", userId)
        .eq("chapter_type", "weekly_chapter")
        .gte("created_at", sevenDaysAgo)
        .maybeSingle();
      if (existing) throw new Error("This week's chapter is already written. Next one unlocks in a few days.");

      const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const { data: weekActs } = await supabase
        .from("activity_entries")
        .select("entry_date,steps,active_minutes")
        .eq("user_id", userId)
        .gte("entry_date", since);
      const activeDays = new Set(
        (weekActs ?? [])
          .filter((a: any) => a.steps > 1000 || a.active_minutes >= 10)
          .map((a: any) => a.entry_date),
      ).size;
      if (activeDays < 3) {
        throw new Error(
          `Weekly chapters unlock after 3 active days. You've logged ${activeDays}. Keep moving!`,
        );
      }
    }

    const period: "daily" | "weekly" = data.chapter_type === "weekly_chapter" ? "weekly" : "daily";
    const snapshot = await buildSnapshot(supabase, userId, period, profile.weekly_goal_minutes);

    // Pick up a freshly resolved challenge that hasn't been paid off yet
    let resolvedChallenge: ResolvedChallenge | null = null;
    let challengeIdToLink: string | null = null;
    if (data.chapter_type !== "daily_teaser") {
      const { data: resolved } = await supabase
        .from("story_challenges")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["completed", "failed"])
        .is("resolution_chapter_id", null)
        .order("resolved_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (resolved) {
        resolvedChallenge = {
          title: resolved.title,
          narrative_hook: resolved.narrative_hook,
          metric: resolved.metric,
          target_value: resolved.target_value,
          progress_value: resolved.progress_value,
          status: resolved.status as "completed" | "failed",
        };
        challengeIdToLink = resolved.id;
      }
    }

    const messages = buildPrompt({
      genre: profile.chosen_genre as Genre,
      protagonist: state.protagonist_name,
      rollingSummary: state.rolling_summary ?? "",
      currentArc: state.current_arc ?? null,
      snapshot,
      chapterType: data.chapter_type,
      resolvedChallenge,
    });

    const raw = await chatCompletion({
      messages,
      temperature: 0.9,
      max_tokens: data.chapter_type === "weekly_chapter" ? 1800 : 700,
    });

    const lines = raw.split("\n");
    const title = (lines[0] ?? "Untitled")
      .replace(/^#+\s*/, "")
      .replace(/^["']|["']$/g, "")
      .trim() || "Untitled";

    let arcLine: string | null = null;
    let bodyStart = 1;
    const second = (lines[1] ?? "").trim();
    if (/^ARC\s*:/i.test(second)) {
      arcLine = second.replace(/^ARC\s*:\s*/i, "").trim().slice(0, 60) || null;
      bodyStart = 2;
    }
    const content = lines.slice(bodyStart).join("\n").trim() || raw;

    const { data: inserted, error } = await supabase
      .from("story_chapters")
      .insert({
        user_id: userId,
        chapter_type: data.chapter_type,
        title,
        content,
        activity_snapshot: snapshot as any,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (challengeIdToLink) {
      await supabase
        .from("story_challenges")
        .update({ resolution_chapter_id: inserted.id })
        .eq("id", challengeIdToLink);
    }

    // Update rolling summary + arc (best-effort)
    try {
      const newSummary = await summarize(state.rolling_summary ?? "", content);
      await supabase
        .from("story_state")
        .update({
          rolling_summary: newSummary,
          current_arc: arcLine ?? state.current_arc ?? null,
          last_generated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    } catch (e) {
      console.warn("Summary update failed:", e);
    }

    return inserted;
  });

export const getChapterList = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("story_chapters")
      .select("id,title,chapter_type,created_at,read_at,activity_snapshot")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getChapter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: chapter, error } = await context.supabase
      .from("story_chapters")
      .select("*")
      .eq("user_id", context.userId)
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!chapter) throw new Error("Chapter not found");

    if (!chapter.read_at) {
      await context.supabase
        .from("story_chapters")
        .update({ read_at: new Date().toISOString() })
        .eq("id", data.id);
    }
    return chapter;
  });
