import Link from "next/link";
import { Card } from "@/components/ui/card";
import { listSessions } from "@/server/actions/workouts";
import { getUserProfile } from "@/server/actions/auth";
import { kgToLb } from "@/lib/units";
import { getTzOffsetMin, formatLocalDateTime } from "@/lib/dates";

export default async function HistoryPage() {
  const [sessions, profileRes, offsetMin] = await Promise.all([listSessions(60), getUserProfile(), getTzOffsetMin()]);
  const imperial = profileRes.data?.units === "imperial";
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/workouts" className="text-xs text-muted-foreground hover:underline">← Workouts</Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">History</h1>
      </div>
      {sessions.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">No sessions logged yet.</Card>
      )}
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li key={s.id}>
            <Card className="p-4">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium">{formatLocalDateTime(s.started_at, offsetMin)}</p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {s.sets.length} sets · {imperial ? `${Math.round(kgToLb(s.volume_kg)).toLocaleString()} lb` : `${Math.round(s.volume_kg).toLocaleString()} kg`} vol
                </p>
              </div>
              {s.notes && <p className="mt-2 text-xs text-muted-foreground">{s.notes}</p>}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
