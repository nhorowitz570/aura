"use server";

import { createClient } from "@/lib/supabase/server";
import { listDateStrings } from "@/lib/dates";
import type { Streak, StreakKind } from "@/types/database";

/**
 * Streaks are computed on read from daily_logs / water_logs to keep the system simple.
 * `streaks` table is reserved for future caching but unused in V2.0.
 */
export async function getStreaks(): Promise<Record<StreakKind, number>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { log: 0, workout: 0, water: 0 };

  const dates = listDateStrings(180).reverse(); // newest first

  const { data: daily } = await supabase
    .from("daily_logs")
    .select("date,has_workout,has_water_log,has_meal_log,has_sleep_log")
    .eq("user_id", user.id)
    .in("date", dates);

  const byDate = new Map((daily ?? []).map((d) => [d.date, d as { date: string; has_workout: boolean; has_water_log: boolean; has_meal_log: boolean; has_sleep_log: boolean }]));

  const countWhile = (pred: (row: ReturnType<typeof byDate.get>) => boolean) => {
    let c = 0;
    for (const day of dates) {
      const row = byDate.get(day);
      if (pred(row)) c++;
      else break;
    }
    return c;
  };

  return {
    log: countWhile((r) => !!(r?.has_meal_log || r?.has_water_log || r?.has_workout || r?.has_sleep_log)),
    workout: countWhile((r) => !!r?.has_workout),
    water: countWhile((r) => !!r?.has_water_log),
  };
}

export async function getBestStreaks(): Promise<{ data: Streak[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: [] };
  const { data } = await supabase.from("streaks").select("*").eq("user_id", user.id);
  return { data: (data ?? []) as Streak[] };
}
