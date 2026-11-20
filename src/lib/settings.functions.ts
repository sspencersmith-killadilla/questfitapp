import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SettingsInput = z.object({
  display_name: z.string().trim().min(1).max(60).optional(),
  weekly_goal_minutes: z.number().int().min(30).max(2000),
  weekly_goal_steps: z.number().int().min(0).max(700000),
  weekly_goal_workouts: z.number().int().min(0).max(30),
  starting_weight_kg: z.number().min(20).max(500).nullable().optional(),
  narrator_voice_id: z.string().min(1).max(64).optional(),
  playback_speed: z.number().min(0.5).max(2).optional(),
  autoplay_next: z.boolean().optional(),
});

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => SettingsInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        ...(data.display_name ? { display_name: data.display_name } : {}),
        weekly_goal_minutes: data.weekly_goal_minutes,
        weekly_goal_steps: data.weekly_goal_steps,
        weekly_goal_workouts: data.weekly_goal_workouts,
        starting_weight_kg: data.starting_weight_kg ?? null,
        ...(data.narrator_voice_id ? { narrator_voice_id: data.narrator_voice_id } : {}),
        ...(data.playback_speed !== undefined ? { playback_speed: data.playback_speed } : {}),
        ...(data.autoplay_next !== undefined ? { autoplay_next: data.autoplay_next } : {}),
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
