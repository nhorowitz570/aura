import type { Meal } from "@/types/database";

export type DayMacros = { calories: number; protein_g: number; carbs_g: number; fat_g: number };

export function zeroMacros(): DayMacros {
  return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
}

export function sumMacros(meals: Meal[]): DayMacros {
  return meals.reduce<DayMacros>((acc, m) => ({
    calories: acc.calories + (m.calories ?? 0),
    protein_g: acc.protein_g + (m.protein_g ?? 0),
    carbs_g: acc.carbs_g + (m.carbs_g ?? 0),
    fat_g: acc.fat_g + (m.fat_g ?? 0),
  }), zeroMacros());
}
