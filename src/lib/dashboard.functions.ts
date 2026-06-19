import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [profileRes, activityRes, weightRes, chaptersRes, storyStateRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("activity_entries")
        .select("*")
        .eq("user_id", userId)
        .gte("entry_date", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10))
        .order("entry_date", { ascending: false }),
      supabase
        .from("weight_entries")
        .select("*")
        .eq("user_id", userId)
        .order("entry_date", { ascending: false })
        .limit(60),
      supabase
        .from("story_chapters")
        .select("id,title,chapter_type,created_at,read_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase.from("story_state").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    return {
      profile: profileRes.data,
      activity: activityRes.data ?? [],
      weights: weightRes.data ?? [],
      recentChapters: chaptersRes.data ?? [],
      storyState: storyStateRes.data,
    };
  });

const ActivityInput = z.object({
  entry_date: z.string().optional(),
  steps: z.number().int().min(0).max(200000),
  active_minutes: z.number().int().min(0).max(1440),
  workout_type: z.string().max(100).optional().nullable(),
  intensity: z.enum(["easy", "moderate", "hard"]).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const logActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ActivityInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("activity_entries")
      .insert({
        user_id: context.userId,
        entry_date: data.entry_date ?? new Date().toISOString().slice(0, 10),
        source: "manual",
        steps: data.steps,
        active_minutes: data.active_minutes,
        workout_type: data.workout_type ?? null,
        intensity: data.intensity ?? null,
        notes: data.notes ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const WeightInput = z.object({
  entry_date: z.string().optional(),
  weight_kg: z.number().min(20).max(500),
  body_fat_pct: z.number().min(2).max(80).optional().nullable(),
  muscle_kg: z.number().min(5).max(200).optional().nullable(),
});

export const logWeight = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => WeightInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("weight_entries")
      .insert({
        user_id: context.userId,
        entry_date: data.entry_date ?? new Date().toISOString().slice(0, 10),
        source: "manual",
        weight_kg: data.weight_kg,
        body_fat_pct: data.body_fat_pct ?? null,
        muscle_kg: data.muscle_kg ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const OnboardingInput = z.object({
  display_name: z.string().min(1).max(60),
  chosen_genre: z.enum(["fantasy", "scifi", "mystery", "slice_of_life"]),
  protagonist_name: z.string().min(1).max(60),
  weekly_goal_minutes: z.number().int().min(30).max(2000).optional(),
});

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OnboardingInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error: profileErr } = await supabase
      .from("profiles")
      .update({
        display_name: data.display_name,
        chosen_genre: data.chosen_genre,
        onboarding_complete: true,
        weekly_goal_minutes: data.weekly_goal_minutes ?? 150,
      })
      .eq("id", userId);
    if (profileErr) throw new Error(profileErr.message);

    const { error: stateErr } = await supabase
      .from("story_state")
      .update({
        protagonist_name: data.protagonist_name,
        story_bible: {},
        rolling_summary: "",
        current_arc: null,
      })
      .eq("user_id", userId);
    if (stateErr) throw new Error(stateErr.message);

    return { ok: true };
  });
