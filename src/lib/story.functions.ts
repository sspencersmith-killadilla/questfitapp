import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { chatCompletion } from "./ai-gateway.server";
import { genreById, type Genre } from "./genres";

type ActivitySnapshot = {
  period: "daily" | "weekly";
  total_steps: number;
  total_active_minutes: number;
  workouts: Array<{ type: string | null; minutes: number; intensity: string | null }>;
  weight_delta_kg: number | null;
  consistency_days: number;
  hit_goal: boolean;
  weekly_goal_minutes: number;
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
  const consistency_days = new Set(acts.filter((a) => a.steps > 1000 || a.active_minutes > 10).map((a) => a.entry_date)).size;

  let weight_delta_kg: number | null = null;
  if (weights && weights.length >= 2) {
    weight_delta_kg = Number((weights[0].weight_kg - weights[weights.length - 1].weight_kg).toFixed(2));
  }

  return {
    period,
    total_steps,
    total_active_minutes,
    workouts,
    weight_delta_kg,
    consistency_days,
    hit_goal: total_active_minutes >= (period === "daily" ? weeklyGoal / 7 : weeklyGoal),
    weekly_goal_minutes: weeklyGoal,
  };
}

function buildPrompt(opts: {
  genre: Genre;
  protagonist: string;
  rollingSummary: string;
  snapshot: ActivitySnapshot;
  chapterType: "daily_teaser" | "weekly_chapter" | "prologue";
}) {
  const g = genreById(opts.genre);
  const isOpening = opts.chapterType === "prologue";
  const lengthGuide =
    opts.chapterType === "daily_teaser"
      ? "120-180 words. A single vivid scene or character beat. End on a soft hook."
      : opts.chapterType === "prologue"
        ? "300-450 words. Establish the world, the protagonist, the stakes."
        : "700-1000 words. A full chapter that advances the arc with at least one decision or turning point.";

  const performance = opts.snapshot.hit_goal
    ? "The user HIT their activity goal this period. The protagonist should experience growth, breakthrough, or hard-won progress."
    : opts.snapshot.total_active_minutes > 0
      ? "The user fell short of their goal but stayed engaged. The protagonist should face a setback that is motivating, not punishing — a near-miss, a wise mentor's challenge, an obstacle named."
      : "The user logged little activity this period. The protagonist should feel the cost of stillness — without shaming. Frame it as the world calling them back, with hope.";

  return [
    {
      role: "system" as const,
      content: `You are a serialized novelist writing in the style of ${g.promptStyle}. You write taut, sensory prose with strong forward momentum. Never break the fourth wall. Never mention fitness apps, steps, calories, workouts, or activity metrics literally — instead translate them into the world's terms (e.g. miles travelled, battles won, walls built, clues gathered). Always end on a hook.`,
    },
    {
      role: "user" as const,
      content: `GENRE: ${g.name}
PROTAGONIST NAME: ${opts.protagonist}
CHAPTER TYPE: ${opts.chapterType}
LENGTH: ${lengthGuide}

STORY SO FAR:
${isOpening || !opts.rollingSummary ? "(This is the opening of the serial. Establish the world and stakes.)" : opts.rollingSummary}

USER ACTIVITY THIS PERIOD (translate into story terms, never quote directly):
- Total active minutes: ${opts.snapshot.total_active_minutes}
- Total steps: ${opts.snapshot.total_steps}
- Workouts: ${opts.snapshot.workouts.length ? opts.snapshot.workouts.map((w) => `${w.type ?? "training"} (${w.minutes}min, ${w.intensity ?? "moderate"})`).join("; ") : "none"}
- Consistency days: ${opts.snapshot.consistency_days}
- Weight change (kg): ${opts.snapshot.weight_delta_kg ?? "unknown"}
- Goal status: ${performance}

OUTPUT FORMAT:
Line 1: a short evocative title (no quotes, no "Chapter X").
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
          "You compress serialized fiction into a tight running synopsis: characters introduced, current arc, unresolved threads, tone. Keep under 250 words. Plain prose, no bullet points.",
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

    const period: "daily" | "weekly" = data.chapter_type === "weekly_chapter" ? "weekly" : "daily";
    const snapshot = await buildSnapshot(supabase, userId, period, profile.weekly_goal_minutes);

    const messages = buildPrompt({
      genre: profile.chosen_genre as Genre,
      protagonist: state.protagonist_name,
      rollingSummary: state.rolling_summary ?? "",
      snapshot,
      chapterType: data.chapter_type,
    });

    const raw = await chatCompletion({
      messages,
      temperature: 0.9,
      max_tokens: data.chapter_type === "weekly_chapter" ? 1800 : 700,
    });

    const lines = raw.split("\n");
    const title = (lines[0] ?? "Untitled").replace(/^#+\s*/, "").replace(/^["']|["']$/g, "").trim() || "Untitled";
    const content = lines.slice(1).join("\n").trim() || raw;

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

    // Update rolling summary (best-effort; don't fail the request if it errors)
    try {
      const newSummary = await summarize(state.rolling_summary ?? "", content);
      await supabase
        .from("story_state")
        .update({ rolling_summary: newSummary, last_generated_at: new Date().toISOString() })
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
      .select("id,title,chapter_type,created_at,read_at")
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
