"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rangeBounds, todayISO } from "@/lib/dates";
import { EXERCISE_SEED } from "@/lib/exercise-seed";
import type {
  Exercise,
  WorkoutDay,
  WorkoutDayExercise,
  WorkoutProgram,
  WorkoutSession,
  WorkoutSessionSet,
  ExerciseKind,
} from "@/types/database";

/* ------------------------- Exercises catalog ------------------------- */

export async function listExercises(opts: { q?: string; type?: ExerciseKind } = {}): Promise<Exercise[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let q = supabase.from("exercises").select("*");
  if (opts.type) q = q.eq("type", opts.type);
  if (opts.q) q = q.ilike("name", `%${opts.q}%`);
  q = q.order("name", { ascending: true }).limit(300);
  const { data } = await q;
  let rows = (data ?? []) as Exercise[];
  if (user) {
    rows = rows.filter((e) => e.owner_id == null || e.owner_id === user.id);
  } else {
    rows = rows.filter((e) => e.owner_id == null);
  }
  // Fallback: if the global catalog hasn't been seeded, serve the bundled seed so the
  // picker is never empty. Persisted "seed:N" IDs are resolved on first write (see resolveExerciseId).
  const hasGlobal = rows.some((e) => e.owner_id == null);
  if (!hasGlobal) {
    const seedRows: Exercise[] = EXERCISE_SEED
      .filter((s) => !opts.type || s.type === opts.type)
      .filter((s) => !opts.q || s.name.toLowerCase().includes(opts.q.toLowerCase()))
      .map((s, i) => ({
        id: `seed:${i}`,
        owner_id: null,
        name: s.name,
        type: s.type,
        muscle_group: s.muscle_group,
        equipment: s.equipment,
        created_at: new Date(0).toISOString(),
      } as Exercise));
    return [...rows, ...seedRows].sort((a, b) => a.name.localeCompare(b.name));
  }
  return rows;
}

export async function createExercise(input: { name: string; type: ExerciseKind; muscle_group?: string; equipment?: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!input.name.trim()) return { error: "Name required" };
  const row = {
    owner_id: user.id,
    name: input.name.trim().slice(0, 80),
    type: input.type,
    muscle_group: input.muscle_group ?? null,
    equipment: input.equipment ?? null,
  };
  const { data, error } = await supabase.from("exercises").insert(row).select("*").single();
  if (error) return { error: error.message };
  return { data: data as Exercise };
}

/* ------------------------- Programs ------------------------- */

export type ProgramDeep = WorkoutProgram & {
  days: (WorkoutDay & { exercises: (WorkoutDayExercise & { exercise: Exercise })[] })[];
};

export async function listPrograms(): Promise<WorkoutProgram[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("workout_programs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  return (data ?? []) as WorkoutProgram[];
}

export async function getProgramDeep(id: string): Promise<ProgramDeep | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: program } = await supabase
    .from("workout_programs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!program) return null;
  const { data: days } = await supabase
    .from("workout_days")
    .select("*")
    .eq("program_id", id)
    .order("position", { ascending: true });
  const { data: dxRows } = await supabase
    .from("workout_day_exercises")
    .select("*, exercise:exercises(*)")
    .in("day_id", (days ?? []).map((d) => d.id));
  const grouped: ProgramDeep["days"] = (days ?? []).map((d) => ({
    ...(d as WorkoutDay),
    exercises: ((dxRows ?? []) as (WorkoutDayExercise & { exercise: Exercise })[])
      .filter((dx) => dx.day_id === d.id)
      .sort((a, b) => a.position - b.position),
  }));
  return { ...(program as WorkoutProgram), days: grouped };
}

export async function createProgram(input: { name: string; schedule_kind: "weekly" | "rotating" }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (!input.name.trim()) return { error: "Name required" };
  const { data, error } = await supabase
    .from("workout_programs")
    .insert({ user_id: user.id, name: input.name.trim().slice(0, 80), schedule_kind: input.schedule_kind })
    .select("*")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/workouts", "layout");
  return { data: data as WorkoutProgram };
}

export async function updateProgram(id: string, patch: Partial<Pick<WorkoutProgram, "name" | "schedule_kind">>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase
    .from("workout_programs")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/workouts", "layout");
  return { data: null };
}

export async function setActiveProgram(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  await supabase.from("workout_programs").update({ is_active: false }).eq("user_id", user.id);
  const { error } = await supabase
    .from("workout_programs")
    .update({ is_active: true })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/workouts", "layout");
  return { data: null };
}

export async function deleteProgram(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase.from("workout_programs").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/workouts", "layout");
  return { data: null };
}

export async function addProgramDay(input: { program_id: string; label: string; weekday?: number | null }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { data: existing } = await supabase
    .from("workout_days")
    .select("position")
    .eq("program_id", input.program_id)
    .order("position", { ascending: false })
    .limit(1);
  const position = ((existing?.[0]?.position ?? 0) as number) + 1;
  const { data, error } = await supabase
    .from("workout_days")
    .insert({
      program_id: input.program_id,
      position,
      label: input.label.trim().slice(0, 40),
      weekday: input.weekday ?? null,
    })
    .select("*")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/workouts", "layout");
  return { data: data as WorkoutDay };
}

export async function deleteProgramDay(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("workout_days").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/workouts", "layout");
  return { data: null };
}

async function resolveExerciseId(supabase: Awaited<ReturnType<typeof createClient>>, id: string): Promise<string | { error: string }> {
  if (!id.startsWith("seed:")) return id;
  const idx = parseInt(id.slice("seed:".length), 10);
  const seed = Number.isFinite(idx) ? EXERCISE_SEED[idx] : null;
  if (!seed) return { error: "Unknown exercise" };
  // Look up an existing global row first; otherwise insert one.
  const { data: existing } = await supabase
    .from("exercises")
    .select("id")
    .is("owner_id", null)
    .eq("name", seed.name)
    .maybeSingle();
  if (existing?.id) return existing.id as string;
  const { data: inserted, error } = await supabase
    .from("exercises")
    .insert({ owner_id: null, name: seed.name, type: seed.type, muscle_group: seed.muscle_group, equipment: seed.equipment })
    .select("id")
    .single();
  if (error || !inserted) return { error: error?.message ?? "Could not save exercise" };
  return inserted.id as string;
}

export async function addDayExercise(input: {
  day_id: string;
  exercise_id: string;
  target_sets?: number | null;
  target_reps?: number | null;
  target_weight_kg?: number | null;
  target_duration_s?: number | null;
}) {
  const supabase = await createClient();
  const resolved = await resolveExerciseId(supabase, input.exercise_id);
  if (typeof resolved !== "string") return resolved;
  const { data: existing } = await supabase
    .from("workout_day_exercises")
    .select("position")
    .eq("day_id", input.day_id)
    .order("position", { ascending: false })
    .limit(1);
  const position = ((existing?.[0]?.position ?? 0) as number) + 1;
  const { data, error } = await supabase
    .from("workout_day_exercises")
    .insert({
      day_id: input.day_id,
      exercise_id: resolved,
      position,
      target_sets: input.target_sets ?? null,
      target_reps: input.target_reps ?? null,
      target_weight_kg: input.target_weight_kg ?? null,
      target_duration_s: input.target_duration_s ?? null,
    })
    .select("*")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/workouts", "layout");
  return { data: data as WorkoutDayExercise };
}

export async function deleteDayExercise(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("workout_day_exercises").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/workouts", "layout");
  return { data: null };
}

/* ------------------------- Today (active program day) ------------------------- */

export async function getTodayProgramDay(): Promise<{
  program: WorkoutProgram | null;
  day: (WorkoutDay & { exercises: (WorkoutDayExercise & { exercise: Exercise })[] }) | null;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { program: null, day: null };

  const { data: programs } = await supabase
    .from("workout_programs")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1);
  const program = ((programs ?? [])[0] ?? null) as WorkoutProgram | null;
  if (!program) return { program: null, day: null };

  const { data: days } = await supabase
    .from("workout_days")
    .select("*")
    .eq("program_id", program.id)
    .order("position", { ascending: true });
  const daysAll = (days ?? []) as WorkoutDay[];
  if (daysAll.length === 0) return { program, day: null };

  let pick: WorkoutDay | null = null;
  if (program.schedule_kind === "weekly") {
    const today = new Date().getDay();
    pick = daysAll.find((d) => d.weekday === today) ?? null;
  } else {
    // Rotating: count completed sessions referencing this program, then pick next day in sequence.
    const { count } = await supabase
      .from("workout_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("program_id", program.id)
      .not("finished_at", "is", null);
    const idx = ((count ?? 0) as number) % daysAll.length;
    pick = daysAll[idx];
  }
  if (!pick) return { program, day: null };

  const { data: dxRows } = await supabase
    .from("workout_day_exercises")
    .select("*, exercise:exercises(*)")
    .eq("day_id", pick.id)
    .order("position", { ascending: true });

  return {
    program,
    day: { ...pick, exercises: ((dxRows ?? []) as (WorkoutDayExercise & { exercise: Exercise })[]) },
  };
}

/* ------------------------- Sessions ------------------------- */

export async function startSession(input: { program_id?: string | null; day_id?: string | null }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { data, error } = await supabase
    .from("workout_sessions")
    .insert({
      user_id: user.id,
      program_id: input.program_id ?? null,
      day_id: input.day_id ?? null,
    })
    .select("*")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/workouts", "layout");
  return { data: data as WorkoutSession };
}

export async function finishSession(id: string, notes?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase
    .from("workout_sessions")
    .update({ finished_at: new Date().toISOString(), notes: notes ?? null })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };
  await supabase.from("daily_logs").upsert(
    { user_id: user.id, date: todayISO(), has_workout: true },
    { onConflict: "user_id,date" },
  );
  revalidatePath("/workouts", "layout");
  return { data: null };
}

export async function getSessionDeep(id: string): Promise<{
  session: WorkoutSession | null;
  day: WorkoutDay | null;
  planned: (WorkoutDayExercise & { exercise: Exercise })[];
  sets: WorkoutSessionSet[];
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { session: null, day: null, planned: [], sets: [] };
  const { data: session } = await supabase
    .from("workout_sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!session) return { session: null, day: null, planned: [], sets: [] };
  let day: WorkoutDay | null = null;
  let planned: (WorkoutDayExercise & { exercise: Exercise })[] = [];
  if ((session as WorkoutSession).day_id) {
    const { data: d } = await supabase
      .from("workout_days")
      .select("*")
      .eq("id", (session as WorkoutSession).day_id!)
      .single();
    day = d as WorkoutDay | null;
    const { data: dx } = await supabase
      .from("workout_day_exercises")
      .select("*, exercise:exercises(*)")
      .eq("day_id", (session as WorkoutSession).day_id!)
      .order("position", { ascending: true });
    planned = ((dx ?? []) as (WorkoutDayExercise & { exercise: Exercise })[]);
  }
  const { data: sets } = await supabase
    .from("workout_session_sets")
    .select("*")
    .eq("session_id", id)
    .order("set_index", { ascending: true });
  return { session: session as WorkoutSession, day, planned, sets: (sets ?? []) as WorkoutSessionSet[] };
}

export async function logSet(input: {
  session_id: string;
  exercise_id: string;
  set_index: number;
  reps?: number | null;
  weight_kg?: number | null;
  duration_s?: number | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const resolved = await resolveExerciseId(supabase, input.exercise_id);
  if (typeof resolved !== "string") return resolved;
  const row = {
    session_id: input.session_id,
    exercise_id: resolved,
    set_index: input.set_index,
    reps: input.reps ?? null,
    weight_kg: input.weight_kg ?? null,
    duration_s: input.duration_s ?? null,
  };
  const { data, error } = await supabase.from("workout_session_sets").insert(row).select("*").single();
  if (error) return { error: error.message };
  revalidatePath("/workouts", "layout");
  return { data: data as WorkoutSessionSet };
}

export async function deleteSet(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("workout_session_sets").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/workouts", "layout");
  return { data: null };
}

/* ------------------------- History ------------------------- */

export type SessionSummary = WorkoutSession & { sets: WorkoutSessionSet[]; volume_kg: number };

export async function listSessions(days = 60): Promise<SessionSummary[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { start, end } = rangeBounds(days);
  const { data } = await supabase
    .from("workout_sessions")
    .select("*, sets:workout_session_sets(*)")
    .eq("user_id", user.id)
    .gte("started_at", start)
    .lt("started_at", end)
    .order("started_at", { ascending: false });
  const rows = (data ?? []) as (WorkoutSession & { sets: WorkoutSessionSet[] })[];
  return rows.map((r) => ({
    ...r,
    volume_kg: r.sets.reduce((s, x) => s + (x.weight_kg ?? 0) * (x.reps ?? 0), 0),
  }));
}

export async function hasWorkoutToday(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("daily_logs")
    .select("has_workout")
    .eq("user_id", user.id)
    .eq("date", todayISO())
    .maybeSingle();
  return !!data?.has_workout;
}
