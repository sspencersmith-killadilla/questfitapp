import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { chatCompletion } from "./ai-gateway.server";
import { genreById, type Genre } from "./genres";

type Metric = "active_minutes" | "steps" | "workouts";

const METRIC_LABEL: Record<Metric, string> = {
  active_minutes: "active minutes",
  steps: "steps",
  workouts: "workouts",
};

function progressFor(
  metric: Metric,
  acts: Array<{ steps: number; active_minutes: number; entry_date: string }>,
) {
  if (metric === "active_minutes") return acts.reduce((s, a) => s + (a.active_minutes ?? 0), 0);
  if (metric === "steps") return acts.reduce((s, a) => s + (a.steps ?? 0), 0);
  return acts.filter((a) => (a.active_minutes ?? 0) >= 10).length;
}

async function loadActivityInWindow(
  supabase: any,
  userId: string,
  startsOn: string,
  deadline: string,
) {
  const { data } = await supabase
    .from("activity_entries")
    .select("steps,active_minutes,entry_date")
    .eq("user_id", userId)
    .gte("entry_date", startsOn)
    .lte("entry_date", deadline);
  return (data ?? []) as Array<{ steps: number; active_minutes: number; entry_date: string }>;
}

/** Re-evaluate active challenges: mark completed if target hit, failed if deadline passed. */
export const evaluateChallenges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);

    const { data: actives } = await supabase
      .from("story_challenges")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active");

    if (!actives || actives.length === 0) return { updated: 0 };

    let updated = 0;
    for (const ch of actives) {
      const acts = await loadActivityInWindow(supabase, userId, ch.starts_on, ch.deadline);
      const progress = progressFor(ch.metric as Metric, acts);
      const hit = progress >= ch.target_value;
      const expired = ch.deadline < today;

      if (hit) {
        await supabase
          .from("story_challenges")
          .update({
            progress_value: progress,
            status: "completed",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", ch.id);
        updated++;
      } else if (expired) {
        await supabase
          .from("story_challenges")
          .update({
            progress_value: progress,
            status: "failed",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", ch.id);
        updated++;
      } else if (progress !== ch.progress_value) {
        await supabase.from("story_challenges").update({ progress_value: progress }).eq("id", ch.id);
        updated++;
      }
    }
    return { updated };
  });

export const getActiveChallenge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("story_challenges")
      .select("*")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .order("deadline", { ascending: true })
      .limit(1)
      .maybeSingle();
    return data;
  });

export const getChallengeHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("story_challenges")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(40);
    return data ?? [];
  });

const GenerateInput = z.object({
  days: z.number().int().min(2).max(14).optional(),
});

export const generateChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GenerateInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Block if one is already active
    const { data: existing } = await supabase
      .from("story_challenges")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (existing) throw new Error("You already have an active challenge. Finish it first.");

    const [{ data: profile }, { data: state }, { data: recent }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("story_state").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("activity_entries")
        .select("steps,active_minutes,entry_date")
        .eq("user_id", userId)
        .gte("entry_date", new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)),
    ]);

    if (!profile?.chosen_genre || !profile.onboarding_complete) {
      throw new Error("Finish onboarding before generating a challenge.");
    }

    const days = data.days ?? 5;
    const startsOn = new Date().toISOString().slice(0, 10);
    const deadline = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

    const acts14 = (recent ?? []) as Array<{ steps: number; active_minutes: number; entry_date: string }>;
    const minutesPerDay = acts14.length ? acts14.reduce((s, a) => s + a.active_minutes, 0) / 14 : 0;
    const stepsPerDay = acts14.length ? acts14.reduce((s, a) => s + a.steps, 0) / 14 : 0;
    const workoutDays14 = new Set(acts14.filter((a) => a.active_minutes >= 10).map((a) => a.entry_date)).size;

    const g = genreById(profile.chosen_genre as Genre);

    const messages = [
      {
        role: "system" as const,
        content: `You are a serialized novelist running a fitness narrative game in the style of ${g.promptStyle}. You propose ONE short challenge tied to a real fitness metric. Output STRICT JSON only, no markdown, no commentary. Schema:
{
  "title": string (max 60 chars, evocative, in-world, no quotes),
  "narrative_hook": string (max 320 chars, second-person, in-world, frames why this matters to the protagonist ${state?.protagonist_name ?? "the hero"}),
  "metric": "active_minutes" | "steps" | "workouts",
  "target_value": integer (achievable but stretch; see ranges below)
}
Target ranges over ${days} days (calibrate to baseline): active_minutes 60-300; steps 20000-90000; workouts 2-6. Never mention the words "fitness", "workout app", "log", or any metric name in the narrative_hook; weave it into the world's terms.`,
      },
      {
        role: "user" as const,
        content: `Protagonist: ${state?.protagonist_name ?? "the hero"}
Current arc: ${state?.current_arc ?? "(early in the journey)"}
Story so far: ${state?.rolling_summary || "(none yet)"}
Window: ${days} days (until ${deadline}).
Baseline (last 14d): avg ${Math.round(minutesPerDay)} active min/day, avg ${Math.round(stepsPerDay)} steps/day, ${workoutDays14} workout days.

Return the JSON object only.`,
      },
    ];

    const raw = await chatCompletion({ messages, temperature: 0.8, max_tokens: 500 });
    const jsonText = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    let parsed: { title: string; narrative_hook: string; metric: Metric; target_value: number };
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error("AI returned an unparseable challenge. Try again.");
    }

    // Clamp targets defensively
    const clamps: Record<Metric, [number, number]> = {
      active_minutes: [30, 600],
      steps: [5000, 150000],
      workouts: [1, 10],
    };
    const [lo, hi] = clamps[parsed.metric] ?? [1, 1000];
    const target = Math.max(lo, Math.min(hi, Math.round(parsed.target_value)));

    const { data: inserted, error } = await supabase
      .from("story_challenges")
      .insert({
        user_id: userId,
        title: parsed.title.slice(0, 60),
        narrative_hook: parsed.narrative_hook.slice(0, 320),
        metric: parsed.metric,
        target_value: target,
        starts_on: startsOn,
        deadline,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    return inserted;
  });

export const abandonChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("story_challenges")
      .update({ status: "failed", resolved_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const METRIC_LABELS = METRIC_LABEL;
