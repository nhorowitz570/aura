// Hand-written types for the V2 schema. Re-generate from Supabase if you wire up `supabase gen types`.

export type Units = "imperial" | "metric";
export type Accent = "neutral" | "blue" | "violet" | "emerald" | "rose";
export type ThemeMode = "light" | "dark" | "system";
export type Sex = "male" | "female" | "other" | "prefer_not_to_say";
export type MealSource = "manual" | "scan";
export type LogSource = "manual" | "apple_health" | "google_fit" | "fitbit" | "whoop" | "garmin" | "oura";
export type ExerciseKind = "strength" | "cardio";
export type ScheduleKind = "weekly" | "rotating";
export type AIRole = "user" | "assistant" | "tool";
export type StreakKind = "log" | "workout" | "water";
export type AIPersonality = "default" | "coach" | "friendly" | "clinical";
export type AIResponseLength = "auto" | "concise" | "standard" | "detailed";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "athlete";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type PrimaryGoal = "lose_weight" | "build_muscle" | "maintain" | "endurance" | "general_health";
export type FeatureId = "workouts" | "nutrition" | "hydration" | "sleep" | "vitals";
export const ALL_FEATURES: FeatureId[] = ["workouts", "nutrition", "hydration", "sleep", "vitals"];

export type Profile = {
  id: string;
  display_name: string | null;
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
  created_at: string;
  updated_at: string;
  // v3 additions
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
};

export type Goals = {
  user_id: string;
  calories: number;
  protein_g: number;
  water_ml: number;
  sleep_min: number;
  updated_at: string;
};

export type DailyLog = {
  user_id: string;
  date: string;
  has_workout: boolean;
  has_meal_log: boolean;
  has_water_log: boolean;
  has_sleep_log: boolean;
};

export type Meal = {
  id: string;
  user_id: string;
  at: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: MealSource;
  image_path: string | null;
  created_at: string;
};

export type WaterLog = {
  id: string;
  user_id: string;
  at: string;
  delta_ml: number;
};

export type SleepLog = {
  id: string;
  user_id: string;
  start_at: string;
  end_at: string;
  quality: number | null;
  source: LogSource;
  created_at: string;
};

export type VitalsLog = {
  id: string;
  user_id: string;
  at: string;
  resting_hr: number | null;
  hrv_ms: number | null;
  bp_sys: number | null;
  bp_dia: number | null;
  source: LogSource;
  created_at: string;
};

export type BodyMetric = {
  user_id: string;
  date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  created_at: string;
};

export type Exercise = {
  id: string;
  owner_id: string | null;
  name: string;
  type: ExerciseKind;
  muscle_group: string | null;
  equipment: string | null;
  created_at: string;
};

export type WorkoutProgram = {
  id: string;
  user_id: string;
  name: string;
  schedule_kind: ScheduleKind;
  is_active: boolean;
  created_at: string;
};

export type WorkoutDay = {
  id: string;
  program_id: string;
  position: number;
  label: string;
  weekday: number | null;
};

export type WorkoutDayExercise = {
  id: string;
  day_id: string;
  exercise_id: string;
  position: number;
  target_sets: number | null;
  target_reps: number | null;
  target_weight_kg: number | null;
  target_duration_s: number | null;
};

export type WorkoutSession = {
  id: string;
  user_id: string;
  program_id: string | null;
  day_id: string | null;
  started_at: string;
  finished_at: string | null;
  notes: string | null;
  created_at: string;
};

export type WorkoutSessionSet = {
  id: string;
  session_id: string;
  exercise_id: string;
  set_index: number;
  reps: number | null;
  weight_kg: number | null;
  duration_s: number | null;
  created_at: string;
};

export type AIThread = {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  last_message_at: string;
};

export type AIMessage = {
  id: string;
  thread_id: string;
  user_id: string;
  role: AIRole;
  content: string;
  tool_calls: unknown | null;
  created_at: string;
};

export type AIMemory = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
};

export type FoodScan = {
  id: string;
  user_id: string;
  image_path: string;
  parsed: unknown | null;
  meal_id: string | null;
  created_at: string;
};

export type Streak = {
  user_id: string;
  kind: StreakKind;
  current: number;
  best: number;
  last_day: string | null;
};

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];
