"use server";

import { createClient } from "@/lib/supabase/server";

export async function exportUserData(): Promise<{ data: string | null; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };

  const tables = [
    "profiles", "goals", "daily_logs", "meals", "water_logs",
    "sleep_logs", "vitals_logs", "body_metrics", "workout_programs",
    "workout_days", "workout_day_exercises", "workout_sessions",
    "workout_session_sets", "ai_threads", "ai_messages", "ai_memories",
    "food_scans", "streaks",
  ] as const;

  const dump: Record<string, unknown> = { exported_at: new Date().toISOString(), user_id: user.id };
  for (const t of tables) {
    const col = t === "profiles" ? "id" : "user_id";
    const { data } = await supabase.from(t).select("*").eq(col, user.id);
    dump[t] = data ?? [];
  }
  return { data: JSON.stringify(dump, null, 2), error: null };
}
