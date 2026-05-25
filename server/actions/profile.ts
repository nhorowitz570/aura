"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACCENTS, type Accent } from "@/lib/accent";
import type {
  Sex, ThemeMode, Units, AIPersonality, AIResponseLength, ActivityLevel,
  ExperienceLevel, PrimaryGoal, FeatureId,
} from "@/types/database";

const SEXES: Sex[] = ["male", "female", "other", "prefer_not_to_say"];
const UNITS: Units[] = ["imperial", "metric"];
const THEMES: ThemeMode[] = ["light", "dark", "system"];
const PERSONALITIES: AIPersonality[] = ["default", "coach", "friendly", "clinical"];
const RESPONSE_LENGTHS: AIResponseLength[] = ["auto", "concise", "standard", "detailed"];
const ACTIVITY_LEVELS: ActivityLevel[] = ["sedentary", "light", "moderate", "active", "athlete"];
const EXPERIENCE_LEVELS: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];
const PRIMARY_GOALS: PrimaryGoal[] = ["lose_weight", "build_muscle", "maintain", "endurance", "general_health"];
const VALID_FEATURES: FeatureId[] = ["workouts", "nutrition", "hydration", "sleep", "vitals"];

type UpdateInput = Partial<{
  display_name: string;
  dob: string | null;
  sex: Sex | null;
  height_cm: number | null;
  weight_kg: number | null;
  units: Units;
  accent: Accent;
  theme: ThemeMode;
  manual_mode_sleep: boolean;
  manual_mode_vitals: boolean;
  onboarded_at: string | null;
  ai_personality: AIPersonality;
  ai_response_length: AIResponseLength;
  ai_proactive: boolean;
  ai_show_sources: boolean;
  activity_level: ActivityLevel | null;
  experience_level: ExperienceLevel | null;
  dietary: string[];
  primary_goal: PrimaryGoal | null;
  target_date: string | null;
  enabled_features: FeatureId[];
}>;

function clean(input: UpdateInput): UpdateInput {
  const out: UpdateInput = {};
  if (typeof input.display_name === "string") out.display_name = input.display_name.trim().slice(0, 80);
  if (input.dob === null || typeof input.dob === "string") out.dob = input.dob;
  if (input.sex === null || (input.sex && SEXES.includes(input.sex))) out.sex = input.sex;
  if (input.height_cm === null || typeof input.height_cm === "number") out.height_cm = input.height_cm;
  if (input.weight_kg === null || typeof input.weight_kg === "number") out.weight_kg = input.weight_kg;
  if (input.units && UNITS.includes(input.units)) out.units = input.units;
  if (input.accent && (ACCENTS as readonly string[]).includes(input.accent)) out.accent = input.accent;
  if (input.theme && THEMES.includes(input.theme)) out.theme = input.theme;
  if (typeof input.manual_mode_sleep === "boolean") out.manual_mode_sleep = input.manual_mode_sleep;
  if (typeof input.manual_mode_vitals === "boolean") out.manual_mode_vitals = input.manual_mode_vitals;
  if (input.onboarded_at === null || typeof input.onboarded_at === "string") out.onboarded_at = input.onboarded_at;
  if (input.ai_personality && PERSONALITIES.includes(input.ai_personality)) out.ai_personality = input.ai_personality;
  if (input.ai_response_length && RESPONSE_LENGTHS.includes(input.ai_response_length)) out.ai_response_length = input.ai_response_length;
  if (typeof input.ai_proactive === "boolean") out.ai_proactive = input.ai_proactive;
  if (typeof input.ai_show_sources === "boolean") out.ai_show_sources = input.ai_show_sources;
  if (input.activity_level === null || (input.activity_level && ACTIVITY_LEVELS.includes(input.activity_level))) out.activity_level = input.activity_level;
  if (input.experience_level === null || (input.experience_level && EXPERIENCE_LEVELS.includes(input.experience_level))) out.experience_level = input.experience_level;
  if (Array.isArray(input.dietary)) out.dietary = input.dietary.map(String).map((s) => s.trim()).filter(Boolean).slice(0, 12);
  if (input.primary_goal === null || (input.primary_goal && PRIMARY_GOALS.includes(input.primary_goal))) out.primary_goal = input.primary_goal;
  if (input.target_date === null || typeof input.target_date === "string") out.target_date = input.target_date;
  if (Array.isArray(input.enabled_features)) {
    out.enabled_features = input.enabled_features.filter((f) => VALID_FEATURES.includes(f as FeatureId)) as FeatureId[];
  }
  return out;
}

export async function updateProfile(input: UpdateInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const patch = clean(input);
  if (Object.keys(patch).length === 0) return { data: null };
  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { data: patch };
}

export async function markOnboarded() {
  return updateProfile({ onboarded_at: new Date().toISOString() });
}
