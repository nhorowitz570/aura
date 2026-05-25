// Schedule resolution helpers (kept tiny — heavier logic lives in server/actions/workouts.ts).

export const WEEKDAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function todaysWeekday(): number {
  return new Date().getDay();
}
