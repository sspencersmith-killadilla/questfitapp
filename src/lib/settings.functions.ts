import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SettingsInput = z.object({
  display_name: z.string().trim().min(1).max(60).optional(),
  weekly_goal_minutes: z.number().int().min(30).max(2000),
  weekly_goal_steps: z.number().int().min(0).max(700000),
  weekly_goal_workouts: z.number().int().min(0).max(30),
  starting_weight_kg: z.number().min(20).max(500).nullable().optional(),
});

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SettingsInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        ...(data.display_name ? { display_name: data.display_name } : {}),
        weekly_goal_minutes: data.weekly_goal_minutes,
        weekly_goal_steps: data.weekly_goal_steps,
        weekly_goal_workouts: data.weekly_goal_workouts,
        starting_weight_kg: data.starting_weight_kg ?? null,
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
