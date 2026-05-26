import { Camera, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MacroBar } from "@/components/features/macro-bar";
import { LogMealSheet } from "@/components/features/log-meal-sheet";
import { FoodScanSheet } from "@/components/features/food-scan-sheet";
import { getGoals } from "@/server/actions/goals";
import { getMealsToday } from "@/server/actions/meals";
import { getTzOffsetMin, formatLocalTime } from "@/lib/dates";
import { MealDeleteButton } from "./meal-delete-button";

export default async function NutritionPage() {
  const [goalsRes, { meals, totals }, offsetMin] = await Promise.all([getGoals(), getMealsToday(), getTzOffsetMin()]);
  const g = goalsRes.data;
  const calorieGoal = g?.calories ?? 2200;
  const proteinGoal = g?.protein_g ?? 150;
  const calPct = Math.min(100, Math.round((totals.calories / calorieGoal) * 100));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nutrition</h1>
          <p className="mt-1 text-sm text-muted-foreground">Today&apos;s meals and macros.</p>
        </div>
        <div className="flex gap-2">
          <FoodScanSheet trigger={<Button size="sm" variant="outline"><Camera className="mr-1 h-4 w-4" /> Scan</Button>} />
          <LogMealSheet trigger={<Button size="sm"><Plus className="mr-1 h-4 w-4" /> Log meal</Button>} />
        </div>
      </div>

      <Card className="p-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Calories</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">{Math.round(totals.calories)}</span>
          <span className="text-sm text-muted-foreground">/ {calorieGoal} kcal</span>
        </div>
        <Progress value={calPct} className="mt-3" />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <MacroBar label="Protein" current={totals.protein_g} goal={proteinGoal} />
          <MacroBar label="Carbs" current={totals.carbs_g} goal={g ? Math.round(g.calories * 0.45 / 4) : 220} />
          <MacroBar label="Fat" current={totals.fat_g} goal={g ? Math.round(g.calories * 0.25 / 9) : 70} />
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-medium">Today&apos;s meals</p>
        {meals.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No meals logged yet.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {meals.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {Math.round(m.calories)} kcal · P {Math.round(m.protein_g)} · C {Math.round(m.carbs_g)} · F {Math.round(m.fat_g)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {formatLocalTime(m.at, offsetMin)}
                  </span>
                  <MealDeleteButton id={m.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
