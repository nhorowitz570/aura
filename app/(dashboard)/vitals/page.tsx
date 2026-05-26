import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConnectSourcePrompt } from "@/components/features/connect-source-prompt";
import { LogVitalSheet } from "@/components/features/log-vital-sheet";
import { getUserProfile } from "@/server/actions/auth";
import { getConnectedSources } from "@/server/actions/dataSources";
import { hasSourceFor } from "@/lib/data-sources";
import { getRecentVitals } from "@/server/actions/vitals";
import { getTzOffsetMin, formatLocalDateTime } from "@/lib/dates";

export default async function VitalsPage() {
  const [profileRes, connected] = await Promise.all([getUserProfile(), getConnectedSources()]);
  const profile = profileRes.data;
  const gated = !hasSourceFor("vitals", connected) && !profile?.manual_mode_vitals;

  if (gated) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vitals</h1>
        </div>
        <ConnectSourcePrompt feature="vitals" />
      </div>
    );
  }

  const [records, offsetMin] = await Promise.all([getRecentVitals(30), getTzOffsetMin()]);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vitals</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manual logging.</p>
        </div>
        <LogVitalSheet trigger={<Button size="sm"><Plus className="mr-1 h-4 w-4" />Log reading</Button>} />
      </div>

      {records.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">No readings yet.</Card>
      ) : (
        <ul className="space-y-2">
          {records.map((r) => (
            <li key={r.id}>
              <Card className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">{formatLocalDateTime(r.at, offsetMin)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {[
                      r.resting_hr != null ? `RHR ${r.resting_hr}` : null,
                      r.hrv_ms != null ? `HRV ${r.hrv_ms}ms` : null,
                      r.bp_sys != null || r.bp_dia != null ? `BP ${r.bp_sys ?? "?"}/${r.bp_dia ?? "?"}` : null,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
