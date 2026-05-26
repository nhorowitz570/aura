"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rangeBounds, todayISO, getTzOffsetMin, toLocalISODate } from "@/lib/dates";
import type { BodyMetric } from "@/types/database";

export async function getRecentBodyMetrics(days = 90): Promise<BodyMetric[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { start, end } = await rangeBounds(days);
  const offsetMin = await getTzOffsetMin();
  const startDate = toLocalISODate(start, offsetMin);
  const endDate = toLocalISODate(end, offsetMin);
  const { data } = await supabase
    .from("body_metrics")
    .select("*")
    .eq("user_id", user.id)
    .gte("date", startDate)
    .lt("date", endDate)
    .order("date", { ascending: true });
  return (data ?? []) as BodyMetric[];
}

export async function logWeight(input: { weight_kg?: number | null; body_fat_pct?: number | null; date?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (input.weight_kg == null && input.body_fat_pct == null) return { error: "Provide weight or body fat %" };
  const row = {
    user_id: user.id,
    date: input.date ?? (await todayISO()),
    weight_kg: input.weight_kg ?? null,
    body_fat_pct: input.body_fat_pct ?? null,
  };
  const { error } = await supabase.from("body_metrics").upsert(row, { onConflict: "user_id,date" });
  if (error) return { error: error.message };
  // Mirror current weight into profile for downstream calculations.
  if (input.weight_kg != null) {
    await supabase.from("profiles").update({ weight_kg: input.weight_kg }).eq("id", user.id);
  }
  revalidatePath("/", "layout");
  return { data: null };
}
