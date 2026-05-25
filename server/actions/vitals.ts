"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rangeBounds } from "@/lib/dates";
import type { VitalsLog } from "@/types/database";

export async function getRecentVitals(days = 30): Promise<VitalsLog[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { start, end } = rangeBounds(days);
  const { data } = await supabase
    .from("vitals_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("at", start)
    .lt("at", end)
    .order("at", { ascending: false });
  return (data ?? []) as VitalsLog[];
}

export async function logVitals(input: {
  resting_hr?: number | null;
  hrv_ms?: number | null;
  bp_sys?: number | null;
  bp_dia?: number | null;
  at?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const fields = ["resting_hr", "hrv_ms", "bp_sys", "bp_dia"] as const;
  if (fields.every((f) => input[f] == null)) return { error: "Provide at least one vital" };
  const { error } = await supabase.from("vitals_logs").insert({
    user_id: user.id,
    at: input.at ?? new Date().toISOString(),
    resting_hr: input.resting_hr ?? null,
    hrv_ms: input.hrv_ms ?? null,
    bp_sys: input.bp_sys ?? null,
    bp_dia: input.bp_dia ?? null,
    source: "manual",
  });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { data: null };
}

export async function deleteVitals(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase.from("vitals_logs").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { data: null };
}
