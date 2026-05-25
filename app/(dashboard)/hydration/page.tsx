import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getGoals } from "@/server/actions/goals";
import { getWaterToday } from "@/server/actions/water";
import { getUserProfile } from "@/server/actions/auth";
import { HydrationClient } from "./hydration-client";
import { formatWater } from "@/lib/units";

export default async function HydrationPage() {
  const [profileRes, goalsRes, waterRes] = await Promise.all([
    getUserProfile(),
    getGoals(),
    getWaterToday(),
  ]);
  const units = profileRes.data?.units ?? "imperial";
  const goal = goalsRes.data?.water_ml ?? 2500;
  const pct = Math.min(100, Math.round((waterRes.total_ml / goal) * 100));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hydration</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track water across the day.</p>
      </div>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Today</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl font-semibold tabular-nums">{formatWater(waterRes.total_ml, units)}</span>
          <span className="text-sm text-muted-foreground">/ {formatWater(goal, units)}</span>
        </div>
        <Progress value={pct} className="mt-4" />
      </Card>

      <HydrationClient entries={waterRes.entries} units={units} />
    </div>
  );
}
