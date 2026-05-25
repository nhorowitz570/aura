/**
 * Seed the public.exercises catalog from supabase/seed/exercises.json.
 * Run: tsx scripts/seed-exercises.ts
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Seed = { name: string; type: "strength" | "cardio"; muscle_group: string; equipment: string };

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const raw = readFileSync(resolve(process.cwd(), "supabase/seed/exercises.json"), "utf8");
  const items: Seed[] = JSON.parse(raw);

  const rows = items.map((i) => ({
    owner_id: null,
    name: i.name,
    type: i.type,
    muscle_group: i.muscle_group,
    equipment: i.equipment,
  }));

  // Upsert by unique seed name (owner_id null).
  const { error } = await supabase.from("exercises").upsert(rows, { onConflict: "name", ignoreDuplicates: true });
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(`Seeded ${rows.length} exercises.`);
}

main();
