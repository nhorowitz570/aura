"use server";

import { createClient } from "@/lib/supabase/server";
import { listDateStrings, rangeBounds, getTzOffsetMin, toLocalISODate } from "@/lib/dates";
import type { AdherenceRow } from "@/lib/trends";

export async function getAdherence(days = 30): Promise<AdherenceRow[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { start, end } = await rangeBounds(days);
  const dates = await listDateStrings(days);
  const startDay = dates[0];
  const offsetMin = await getTzOffsetMin();

  const [{ data: meals }, { data: water }, { data: sleep }] = await Promise.all([
    supabase.from("meals").select("at,calories,protein_g").eq("user_id", user.id).gte("at", start).lt("at", end),
    supabase.from("water_logs").select("at,delta_ml").eq("user_id", user.id).gte("at", start).lt("at", end),
    supabase.from("sleep_logs").select("end_at,start_at").eq("user_id", user.id).gte("end_at", start).lt("end_at", end),
  ]);

  const byDate = new Map<string, AdherenceRow>(
    dates.map((d) => [d, { date: d, calories: 0, protein_g: 0, water_ml: 0, sleep_min: 0 }]),
  );
  for (const m of meals ?? []) {
    const d = toLocalISODate(m.at as string, offsetMin);
    if (d < startDay) continue;
    const row = byDate.get(d);
    if (!row) continue;
    row.calories += m.calories ?? 0;
    row.protein_g += m.protein_g ?? 0;
  }
  for (const w of water ?? []) {
    const d = toLocalISODate(w.at as string, offsetMin);
    const row = byDate.get(d);
    if (!row) continue;
    row.water_ml += w.delta_ml ?? 0;
  }
  for (const s of sleep ?? []) {
    const d = toLocalISODate(s.end_at as string, offsetMin);
    const row = byDate.get(d);
    if (!row) continue;
    const min = Math.round((new Date(s.end_at as string).getTime() - new Date(s.start_at as string).getTime()) / 60000);
    row.sleep_min += min;
  }
  return Array.from(byDate.values());
}
