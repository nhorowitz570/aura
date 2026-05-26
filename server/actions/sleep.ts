"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dayBounds, rangeBounds, todayISO } from "@/lib/dates";
import type { SleepLog } from "@/types/database";

export async function getRecentSleep(days = 30): Promise<SleepLog[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { start, end } = await rangeBounds(days);
  const { data } = await supabase
    .from("sleep_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("start_at", start)
    .lt("start_at", end)
    .order("start_at", { ascending: false });
  return (data ?? []) as SleepLog[];
}

export async function getSleepToday(): Promise<SleepLog | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { start, end } = await dayBounds(new Date());
  const { data } = await supabase
    .from("sleep_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("end_at", start)
    .lt("end_at", end)
    .order("end_at", { ascending: false })
    .limit(1);
  return ((data ?? [])[0] ?? null) as SleepLog | null;
}

export async function logSleep(input: { start_at: string; end_at: string; quality?: number | null }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!input.start_at || !input.end_at) return { error: "Need start and end times" };
  const { error } = await supabase.from("sleep_logs").insert({
    user_id: user.id,
    start_at: input.start_at,
    end_at: input.end_at,
    quality: input.quality ?? null,
    source: "manual",
  });
  if (error) return { error: error.message };
  await supabase.from("daily_logs").upsert(
    { user_id: user.id, date: await todayISO(), has_sleep_log: true },
    { onConflict: "user_id,date" },
  );
  revalidatePath("/", "layout");
  return { data: null };
}

export async function deleteSleep(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase.from("sleep_logs").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { data: null };
}
