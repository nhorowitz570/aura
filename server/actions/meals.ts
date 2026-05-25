"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dayBounds, todayISO } from "@/lib/dates";
import { sumMacros, zeroMacros, type DayMacros } from "@/lib/macros";
import type { Meal, MealSource } from "@/types/database";

export async function getMealsToday(): Promise<{ meals: Meal[]; totals: DayMacros }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { meals: [], totals: zeroMacros() };
  const { start, end } = dayBounds(new Date());
  const { data } = await supabase
    .from("meals")
    .select("*")
    .eq("user_id", user.id)
    .gte("at", start)
    .lt("at", end)
    .order("at", { ascending: false });
  const meals = (data ?? []) as Meal[];
  return { meals, totals: sumMacros(meals) };
}

type MealInput = {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  at?: string;
  source?: MealSource;
  image_path?: string | null;
};

export async function logMeal(input: MealInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!input.name?.trim()) return { error: "Name required" };
  const row = {
    user_id: user.id,
    at: input.at ?? new Date().toISOString(),
    name: input.name.trim().slice(0, 120),
    calories: Math.max(0, Math.round(input.calories || 0)),
    protein_g: Math.max(0, +(input.protein_g || 0)),
    carbs_g: Math.max(0, +(input.carbs_g || 0)),
    fat_g: Math.max(0, +(input.fat_g || 0)),
    source: input.source ?? "manual",
    image_path: input.image_path ?? null,
  };
  const { data, error } = await supabase.from("meals").insert(row).select("*").single();
  if (error) return { error: error.message };
  await supabase.from("daily_logs").upsert(
    { user_id: user.id, date: todayISO(), has_meal_log: true },
    { onConflict: "user_id,date" },
  );
  revalidatePath("/", "layout");
  return { data: data as Meal };
}

export async function deleteMeal(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase.from("meals").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { data: null };
}
