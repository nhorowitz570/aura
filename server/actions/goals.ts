"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { calcGoals, ageFromDob } from "@/lib/units";
import type { Goals } from "@/types/database";

const DEFAULT: Omit<Goals, "user_id" | "updated_at"> = {
  calories: 2200,
  protein_g: 150,
  water_ml: 2500,
  sleep_min: 480,
};

export async function getGoals(): Promise<{ data: Goals | null; error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "Not authenticated" };
  const { data, error } = await supabase.from("goals").select("*").eq("user_id", user.id).maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) {
    // upsert defaults
    const { data: created, error: insErr } = await supabase
      .from("goals")
      .insert({ user_id: user.id, ...DEFAULT })
      .select("*")
      .single();
    if (insErr) return { data: null, error: insErr.message };
    return { data: created as Goals, error: null };
  }
  return { data: data as Goals, error: null };
}

type GoalInput = Partial<Pick<Goals, "calories" | "protein_g" | "water_ml" | "sleep_min">>;

export async function updateGoals(input: GoalInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const patch: GoalInput = {};
  if (typeof input.calories === "number") patch.calories = Math.max(800, Math.round(input.calories));
  if (typeof input.protein_g === "number") patch.protein_g = Math.max(0, Math.round(input.protein_g));
  if (typeof input.water_ml === "number") patch.water_ml = Math.max(0, Math.round(input.water_ml));
  if (typeof input.sleep_min === "number") patch.sleep_min = Math.max(0, Math.round(input.sleep_min));

  const { error } = await supabase
    .from("goals")
    .upsert({ user_id: user.id, ...DEFAULT, ...patch }, { onConflict: "user_id" });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { data: patch };
}

export async function recalcGoalsFromProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("weight_kg,height_cm,dob,sex")
    .eq("id", user.id)
    .single();
  if (!profile?.weight_kg || !profile?.height_cm) {
    return { error: "Profile incomplete (need height + weight)" };
  }
  const goals = calcGoals({
    weight_kg: profile.weight_kg,
    height_cm: profile.height_cm,
    age: ageFromDob(profile.dob),
    sex: profile.sex,
  });
  return updateGoals(goals);
}
