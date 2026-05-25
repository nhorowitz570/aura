"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DATA_SOURCES, type DataSourceId } from "@/lib/data-sources";

const COOKIE = "aura_sources";

function parse(raw: string | undefined): DataSourceId[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const valid = new Set(DATA_SOURCES.map((s) => s.id));
    return arr.filter((id): id is DataSourceId => typeof id === "string" && valid.has(id as DataSourceId));
  } catch {
    return [];
  }
}

export async function getConnectedSources(): Promise<DataSourceId[]> {
  const store = await cookies();
  return parse(store.get(COOKIE)?.value);
}

async function persist(ids: DataSourceId[]) {
  const store = await cookies();
  store.set(COOKIE, JSON.stringify(ids), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function connectSource(id: DataSourceId) {
  const current = await getConnectedSources();
  if (current.includes(id)) return { data: current };
  const next = [...current, id];
  await persist(next);
  revalidatePath("/", "layout");
  return { data: next };
}

export async function disconnectSource(id: DataSourceId) {
  const current = await getConnectedSources();
  const next = current.filter((x) => x !== id);
  await persist(next);
  revalidatePath("/", "layout");
  return { data: next };
}
