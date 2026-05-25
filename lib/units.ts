// Conversion helpers — store everything in metric internally; convert at display.

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export type Units = "imperial" | "metric";

export function kgToLb(kg: number): number { return kg / KG_PER_LB; }
export function lbToKg(lb: number): number { return lb * KG_PER_LB; }
export function cmToIn(cm: number): number { return cm / CM_PER_IN; }
export function inToCm(inches: number): number { return inches * CM_PER_IN; }
export function mlToFlOz(ml: number): number { return ml / 29.5735; }
export function flOzToMl(oz: number): number { return oz * 29.5735; }

export function formatWeight(kg: number | null | undefined, units: Units, opts: { compact?: boolean } = {}): string {
  if (kg == null) return "—";
  if (units === "imperial") {
    const lb = kgToLb(kg);
    return opts.compact ? `${lb.toFixed(0)} lb` : `${lb.toFixed(1)} lb`;
  }
  return opts.compact ? `${kg.toFixed(0)} kg` : `${kg.toFixed(1)} kg`;
}

export function formatHeight(cm: number | null | undefined, units: Units): string {
  if (cm == null) return "—";
  if (units === "imperial") {
    const totalIn = cmToIn(cm);
    const ft = Math.floor(totalIn / 12);
    const remIn = Math.round(totalIn - ft * 12);
    return `${ft}'${remIn}"`;
  }
  return `${Math.round(cm)} cm`;
}

export function formatWater(ml: number, units: Units): string {
  if (units === "imperial") {
    return `${Math.round(mlToFlOz(ml))} fl oz`;
  }
  return ml >= 1000 ? `${(ml / 1000).toFixed(2)} L` : `${ml} ml`;
}

export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// Mifflin-St Jeor BMR + light activity TDEE.
export function calcTDEE(opts: { weight_kg: number; height_cm: number; age: number; sex: "male" | "female" | "other" | "prefer_not_to_say" | null }): number {
  const { weight_kg, height_cm, age } = opts;
  const sexFactor = opts.sex === "female" ? -161 : 5;
  const bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + sexFactor;
  return Math.round(bmr * 1.4);
}

export function calcGoals(opts: { weight_kg: number; height_cm: number; age: number; sex: "male" | "female" | "other" | "prefer_not_to_say" | null }) {
  return {
    calories: calcTDEE(opts),
    protein_g: Math.round(1.8 * opts.weight_kg),
    water_ml: Math.round(35 * opts.weight_kg),
    sleep_min: 480,
  };
}

export function ageFromDob(dob: string | null | undefined): number {
  if (!dob) return 30;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 30;
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)));
}
