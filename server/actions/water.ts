"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { WaterLog } from "@/types/database";
import { dayBounds, todayISO } from "@/lib/dates";

export async function getWaterToday(): Promise<{ total_ml: number; entries: WaterLog[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { total_ml: 0, entries: [] };
  const { start, end } = dayBounds(new Date());
  const { data } = await supabase
    .from("water_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("at", start)
    .lt("at", end)
    .order("at", { ascending: false });
  const entries = (data ?? []) as WaterLog[];
  const total_ml = entries.reduce((s, e) => s + e.delta_ml, 0);
  return { total_ml, entries };
}

export async function addWater(delta_ml: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!Number.isFinite(delta_ml) || delta_ml === 0) return { error: "Invalid amount" };
  const delta = Math.trunc(delta_ml);
  const { error } = await supabase.from("water_logs").insert({ user_id: user.id, delta_ml: delta });
  if (error) return { error: error.message };
  if (delta > 0) {
    await supabase.from("daily_logs").upsert(
      { user_id: user.id, date: todayISO(), has_water_log: true },
      { onConflict: "user_id,date" },
    );
  }
  revalidatePath("/", "layout");
  return { data: { delta_ml: delta } };
}

export async function deleteWaterEntry(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase.from("water_logs").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { data: null };
}
