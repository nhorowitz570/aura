import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConnectSourcePrompt } from "@/components/features/connect-source-prompt";
import { LogSleepSheet } from "@/components/features/log-sleep-sheet";
import { getUserProfile } from "@/server/actions/auth";
import { getConnectedSources } from "@/server/actions/dataSources";
import { hasSourceFor } from "@/lib/data-sources";
import { getRecentSleep } from "@/server/actions/sleep";
import { formatMinutes } from "@/lib/units";
import { getTzOffsetMin, formatLocalDateShort, formatLocalTime } from "@/lib/dates";
import { Plus } from "lucide-react";

function diffMinutes(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

export default async function SleepPage() {
  const [profileRes, connected] = await Promise.all([getUserProfile(), getConnectedSources()]);
  const profile = profileRes.data;
  const gated = !hasSourceFor("sleep", connected) && !profile?.manual_mode_sleep;

  if (gated) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sleep</h1>
        </div>
        <ConnectSourcePrompt feature="sleep" />
      </div>
    );
  }

  const [records, offsetMin] = await Promise.all([getRecentSleep(30), getTzOffsetMin()]);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sleep</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manual logging.</p>
        </div>
        <LogSleepSheet trigger={<Button size="sm"><Plus className="mr-1 h-4 w-4" />Log sleep</Button>} />
      </div>

      {records.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No sleep logged yet.</Card>
      ) : (
        <ul className="space-y-2">
          {records.map((r) => {
            const min = diffMinutes(r.start_at, r.end_at);
            return (
              <li key={r.id}>
                <Card className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">{formatLocalDateShort(r.end_at, offsetMin)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      {formatLocalTime(r.start_at, offsetMin)} → {formatLocalTime(r.end_at, offsetMin)}
                      {r.quality ? ` · quality ${r.quality}/5` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{formatMinutes(min)}</p>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
