export type AdherenceRow = {
  date: string;
  calories: number;
  protein_g: number;
  water_ml: number;
  sleep_min: number;
};

export function pctHit(
  rows: AdherenceRow[],
  key: keyof Omit<AdherenceRow, "date">,
  goal: number,
  tolerance = 0.1,
): number {
  if (rows.length === 0 || goal <= 0) return 0;
  let hits = 0;
  for (const r of rows) {
    if (r[key] >= goal * (1 - tolerance)) hits++;
  }
  return Math.round((hits / rows.length) * 100);
}
