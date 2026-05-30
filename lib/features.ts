import type { FeatureId } from "@/types/database";

export const FEATURE_LABEL: Record<FeatureId, string> = {
  workouts: "Workouts",
  nutrition: "Nutrition",
  hydration: "Hydration",
  sleep: "Sleep",
  vitals: "Vitals",
};

export const FEATURE_DESCRIPTION: Record<FeatureId, string> = {
  workouts: "Strength + cardio tracking, programs, history.",
  nutrition: "Meals, macros, photo food scan.",
  hydration: "Water intake with quick presets.",
  sleep: "Sleep duration + quality.",
  vitals: "Resting HR, HRV, blood pressure.",
};

// Pages that are always available regardless of feature toggles.
export const CORE_HREFS = new Set(["/home", "/goals", "/assistant", "/settings", "/onboarding"]);

export const HREF_TO_FEATURE: Record<string, FeatureId> = {
  "/workouts": "workouts",
  "/nutrition": "nutrition",
  "/hydration": "hydration",
  "/sleep": "sleep",
  "/vitals": "vitals",
};

export function isHrefEnabled(href: string, enabled: FeatureId[] | undefined | null): boolean {
  if (CORE_HREFS.has(href)) return true;
  const f = HREF_TO_FEATURE[href];
  if (!f) return true;
  return (enabled ?? []).includes(f);
}
