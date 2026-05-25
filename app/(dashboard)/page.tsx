import Link from "next/link";
import { Droplet, Moon, Dumbbell, Flame, ArrowRight, Apple } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalorieRing } from "@/components/features/calorie-ring";
import { LogWaterActions } from "@/components/features/log-water-actions";
import { getUserProfile } from "@/server/actions/auth";
import { getGoals } from "@/server/actions/goals";
import { getMealsToday } from "@/server/actions/meals";
import { getWaterToday } from "@/server/actions/water";
import { getSleepToday } from "@/server/actions/sleep";
import { hasWorkoutToday, getTodayProgramDay } from "@/server/actions/workouts";
import { getStreaks } from "@/server/actions/streaks";
import { formatWater, formatMinutes } from "@/lib/units";

function diffMinutes(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}

export default async function HomePage() {
  const [profileRes, goalsRes, mealsRes, waterRes, sleepToday, workedOut, todayDay, streaks] = await Promise.all([
    getUserProfile(),
    getGoals(),
    getMealsToday(),
    getWaterToday(),
    getSleepToday(),
    hasWorkoutToday(),
    getTodayProgramDay(),
    getStreaks(),
  ]);

  const profile = profileRes.data;
  const goals = goalsRes.data;
  const units = profile?.units ?? "imperial";

  const calorieGoal = goals?.calories ?? 2200;
  const proteinGoal = goals?.protein_g ?? 150;
  const waterGoal = goals?.water_ml ?? 2500;
  const sleepGoal = goals?.sleep_min ?? 480;

  const sleepMin = sleepToday ? diffMinutes(sleepToday.start_at, sleepToday.end_at) : 0;
  const waterPct = Math.min(100, Math.round((waterRes.total_ml / waterGoal) * 100));
  const sleepPct = sleepMin ? Math.min(100, Math.round((sleepMin / sleepGoal) * 100)) : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = profile?.display_name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{greeting}{firstName ? `, ${firstName}` : ""}.</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Today</h1>
      </div>

      <Card className="flex flex-col items-center p-6 sm:flex-row sm:gap-8 sm:p-8">
        <CalorieRing
          current={mealsRes.totals.calories}
          goal={calorieGoal}
          protein={mealsRes.totals.protein_g}
          proteinGoal={proteinGoal}
        />
        <div className="mt-4 flex-1 space-y-2 text-center sm:mt-0 sm:text-left">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Calories</p>
          {streaks.log > 0 && (
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Flame className="h-3.5 w-3.5" /> {streaks.log}-day log streak
            </p>
          )}
          <Button asChild variant="outline" className="mt-2">
            <Link href="/nutrition"><Apple className="mr-1.5 h-4 w-4" /> Log a meal</Link>
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <Link href="/hydration" className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Water</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{formatWater(waterRes.total_ml, units)}</p>
              <p className="text-xs text-muted-foreground">{waterPct}% of goal</p>
            </div>
            <Droplet className="h-5 w-5 text-muted-foreground" />
          </Link>
          <div className="mt-4"><LogWaterActions compact units={units} /></div>
        </Card>

        <Link href="/nutrition">
          <Card className="p-5 h-full">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Protein</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {Math.round(mealsRes.totals.protein_g)}
                  <span className="text-sm font-normal text-muted-foreground"> / {proteinGoal} g</span>
                </p>
              </div>
              <Apple className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{mealsRes.meals.length} meals today</p>
          </Card>
        </Link>

        <Link href="/sleep">
          <Card className="p-5 h-full">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Sleep</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{sleepToday ? formatMinutes(sleepMin) : "—"}</p>
                <p className="text-xs text-muted-foreground">{sleepToday ? `${sleepPct}% of goal` : "Not logged"}</p>
              </div>
              <Moon className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        </Link>

        <Link href="/workouts">
          <Card className="p-5 h-full">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Workout</p>
                <p className="mt-1 text-2xl font-semibold">{workedOut ? "Done" : todayDay.day ? "Ready" : "Rest"}</p>
                <p className="text-xs text-muted-foreground">
                  {todayDay.day ? todayDay.day.label : todayDay.program ? "No day scheduled" : "No active program"}
                </p>
              </div>
              <Dumbbell className="h-5 w-5 text-muted-foreground" />
            </div>
          </Card>
        </Link>
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" asChild>
          <Link href="/goals">View trends <ArrowRight className="ml-1 h-4 w-4" /></Link>
        </Button>
      </div>
    </div>
  );
}
