import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionDeep } from "@/server/actions/workouts";
import { getUserProfile } from "@/server/actions/auth";
import { SessionRunner } from "./session-runner";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ session, day, planned, sets }, profileRes] = await Promise.all([
    getSessionDeep(id),
    getUserProfile(),
  ]);
  if (!session) notFound();
  const units = profileRes.data?.units ?? "imperial";
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/workouts" className="text-xs text-muted-foreground hover:underline">← Workouts</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{day?.label ?? "Free session"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Started {new Date(session.started_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </p>
      </div>
      <SessionRunner session={session} planned={planned} initialSets={sets} units={units} />
    </div>
  );
}
