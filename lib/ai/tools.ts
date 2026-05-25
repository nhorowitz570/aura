import type { OpenRouterTool } from "./client";
import { logMeal } from "@/server/actions/meals";
import { addWater } from "@/server/actions/water";
import { logWeight } from "@/server/actions/weight";
import { logSleep } from "@/server/actions/sleep";
import { logVitals } from "@/server/actions/vitals";
import { startSession } from "@/server/actions/workouts";
import { updateGoals } from "@/server/actions/goals";
import { addMemory, deleteMemory } from "@/server/actions/memories";
import { getUserProfile } from "@/server/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { rangeBounds } from "@/lib/dates";

export const TOOLS: OpenRouterTool[] = [
  {
    type: "function",
    function: {
      name: "log_meal",
      description: "Log a meal with calories and macros.",
      parameters: {
        type: "object",
        required: ["name", "calories"],
        properties: {
          name: { type: "string" },
          calories: { type: "number" },
          protein_g: { type: "number" },
          carbs_g: { type: "number" },
          fat_g: { type: "number" },
          at: { type: "string", description: "ISO timestamp" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_water",
      description: "Add (or subtract) milliliters of water for today. Negative numbers subtract.",
      parameters: {
        type: "object",
        required: ["ml"],
        properties: { ml: { type: "number" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_weight",
      description: "Log today's weight (kg) and optional body fat percentage.",
      parameters: {
        type: "object",
        properties: {
          weight_kg: { type: "number" },
          body_fat_pct: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_sleep",
      description: "Log a sleep session. Requires manual_mode_sleep=true on the profile.",
      parameters: {
        type: "object",
        required: ["start_at", "end_at"],
        properties: {
          start_at: { type: "string", description: "ISO timestamp" },
          end_at: { type: "string", description: "ISO timestamp" },
          quality: { type: "integer", minimum: 1, maximum: 5 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "log_vitals",
      description: "Log resting heart rate / HRV / blood pressure. Requires manual_mode_vitals=true.",
      parameters: {
        type: "object",
        properties: {
          resting_hr: { type: "integer" },
          hrv_ms: { type: "integer" },
          bp_sys: { type: "integer" },
          bp_dia: { type: "integer" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "start_workout",
      description: "Start a workout session, optionally tied to a program day.",
      parameters: {
        type: "object",
        properties: {
          program_day_id: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_history",
      description: "Fetch recent rows for trend analysis.",
      parameters: {
        type: "object",
        required: ["kind", "days"],
        properties: {
          kind: { type: "string", enum: ["meals", "water", "workouts", "sleep", "weight"] },
          days: { type: "integer", minimum: 1, maximum: 90 },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_goal",
      description: "Update one or more daily goals.",
      parameters: {
        type: "object",
        properties: {
          calories: { type: "number" },
          protein_g: { type: "number" },
          water_ml: { type: "number" },
          sleep_min: { type: "number" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "remember",
      description: "Persist a short user fact in long-term memory.",
      parameters: {
        type: "object",
        required: ["content"],
        properties: { content: { type: "string" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "forget",
      description: "Remove a memory by id.",
      parameters: {
        type: "object",
        required: ["id"],
        properties: { id: { type: "string" } },
      },
    },
  },
];

export async function dispatchTool(name: string, args: Record<string, unknown>): Promise<{ ok: boolean; result: unknown }>
{
  switch (name) {
    case "log_meal": {
      const res = await logMeal({
        name: String(args.name),
        calories: Number(args.calories ?? 0),
        protein_g: Number(args.protein_g ?? 0),
        carbs_g: Number(args.carbs_g ?? 0),
        fat_g: Number(args.fat_g ?? 0),
        at: typeof args.at === "string" ? args.at : undefined,
      });
      return finish(res);
    }
    case "log_water": return finish(await addWater(Number(args.ml ?? 0)));
    case "log_weight": return finish(await logWeight({
      weight_kg: args.weight_kg != null ? Number(args.weight_kg) : undefined,
      body_fat_pct: args.body_fat_pct != null ? Number(args.body_fat_pct) : undefined,
    }));
    case "log_sleep": {
      const profile = await getUserProfile();
      if (!profile.data?.manual_mode_sleep) return { ok: false, result: "Manual sleep logging is disabled. Enable it in Settings." };
      return finish(await logSleep({
        start_at: String(args.start_at),
        end_at: String(args.end_at),
        quality: args.quality != null ? Number(args.quality) : null,
      }));
    }
    case "log_vitals": {
      const profile = await getUserProfile();
      if (!profile.data?.manual_mode_vitals) return { ok: false, result: "Manual vitals logging is disabled. Enable it in Settings." };
      return finish(await logVitals({
        resting_hr: args.resting_hr != null ? Number(args.resting_hr) : null,
        hrv_ms: args.hrv_ms != null ? Number(args.hrv_ms) : null,
        bp_sys: args.bp_sys != null ? Number(args.bp_sys) : null,
        bp_dia: args.bp_dia != null ? Number(args.bp_dia) : null,
      }));
    }
    case "start_workout": return finish(await startSession({ day_id: typeof args.program_day_id === "string" ? args.program_day_id : null }));
    case "update_goal": return finish(await updateGoals({
      calories: args.calories != null ? Number(args.calories) : undefined,
      protein_g: args.protein_g != null ? Number(args.protein_g) : undefined,
      water_ml: args.water_ml != null ? Number(args.water_ml) : undefined,
      sleep_min: args.sleep_min != null ? Number(args.sleep_min) : undefined,
    }));
    case "remember": return finish(await addMemory(String(args.content)));
    case "forget": return finish(await deleteMemory(String(args.id)));
    case "query_history": return { ok: true, result: await queryHistory(String(args.kind), Number(args.days ?? 7)) };
    default:
      return { ok: false, result: `Unknown tool: ${name}` };
  }
}

function finish<T>(res: T): { ok: boolean; result: T } {
  const r = res as unknown as { error?: string };
  return { ok: !r?.error, result: res };
}

async function queryHistory(kind: string, days: number): Promise<unknown> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { start, end } = rangeBounds(days);
  switch (kind) {
    case "meals": {
      const { data } = await supabase.from("meals").select("at,name,calories,protein_g,carbs_g,fat_g").eq("user_id", user.id).gte("at", start).lt("at", end).order("at");
      return data ?? [];
    }
    case "water": {
      const { data } = await supabase.from("water_logs").select("at,delta_ml").eq("user_id", user.id).gte("at", start).lt("at", end).order("at");
      return data ?? [];
    }
    case "workouts": {
      const { data } = await supabase.from("workout_sessions").select("started_at,finished_at,notes").eq("user_id", user.id).gte("started_at", start).lt("started_at", end).order("started_at");
      return data ?? [];
    }
    case "sleep": {
      const { data } = await supabase.from("sleep_logs").select("start_at,end_at,quality").eq("user_id", user.id).gte("end_at", start).lt("end_at", end).order("end_at");
      return data ?? [];
    }
    case "weight": {
      const { data } = await supabase.from("body_metrics").select("date,weight_kg,body_fat_pct").eq("user_id", user.id).gte("date", start.slice(0, 10)).lt("date", end.slice(0, 10)).order("date");
      return data ?? [];
    }
    default:
      return { error: `Unknown kind: ${kind}` };
  }
}
