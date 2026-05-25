"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WEEKDAY_LABEL } from "@/lib/workouts/schedule";
import { ExercisePickerSheet } from "@/components/features/exercise-picker-sheet";
import {
  addProgramDay,
  deleteProgramDay,
  addDayExercise,
  deleteDayExercise,
} from "@/server/actions/workouts";
import type { ProgramDeep } from "@/server/actions/workouts";
import type { Exercise } from "@/types/database";

export function ProgramEditor({ program }: { program: ProgramDeep }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const [newDayLabel, setNewDayLabel] = useState("");
  const [newDayWeekday, setNewDayWeekday] = useState<number | null>(null);
  const [pickerForDay, setPickerForDay] = useState<string | null>(null);

  const addDay = () => {
    if (!newDayLabel.trim()) return;
    start(async () => {
      const res = await addProgramDay({
        program_id: program.id,
        label: newDayLabel,
        weekday: program.schedule_kind === "weekly" ? newDayWeekday : null,
      });
      if ("error" in res && res.error) toast.error(res.error);
      else { setNewDayLabel(""); setNewDayWeekday(null); router.refresh(); }
    });
  };

  const removeDay = (id: string) => {
    if (!confirm("Delete this day?")) return;
    start(async () => {
      const res = await deleteProgramDay(id);
      if ("error" in res && res.error) toast.error(res.error);
      else router.refresh();
    });
  };

  const onPick = (dayId: string) => async (ex: Exercise) => {
    const res = await addDayExercise({
      day_id: dayId,
      exercise_id: ex.id,
      target_sets: ex.type === "strength" ? 3 : null,
      target_reps: ex.type === "strength" ? 8 : null,
      target_duration_s: ex.type === "cardio" ? 1200 : null,
    });
    if ("error" in res && res.error) toast.error(res.error);
    else { setPickerForDay(null); router.refresh(); }
  };

  const removeEx = (id: string) =>
    start(async () => {
      const res = await deleteDayExercise(id);
      if ("error" in res && res.error) toast.error(res.error);
      else router.refresh();
    });

  return (
    <>
      <Card className="p-5">
        <p className="text-sm font-medium">Add day</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label htmlFor="day-label">Label</Label>
            <Input id="day-label" value={newDayLabel} onChange={(e) => setNewDayLabel(e.target.value)} placeholder='e.g. "Push"' className="mt-1.5" />
          </div>
          {program.schedule_kind === "weekly" && (
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Weekday</Label>
              <div className="mt-1.5 flex gap-1">
                {WEEKDAY_LABEL.map((w, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setNewDayWeekday(i)}
                    className={"h-8 w-9 rounded-md border text-xs " + (newDayWeekday === i ? "bg-secondary" : "text-muted-foreground")}
                  >
                    {w[0]}
                  </button>
                ))}
              </div>
            </div>
          )}
          <Button onClick={addDay} disabled={pending || !newDayLabel.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Add day
          </Button>
        </div>
      </Card>

      {program.days.map((day) => (
        <Card key={day.id} className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-base font-semibold">{day.label}</p>
              {day.weekday != null && (
                <p className="text-xs text-muted-foreground">{WEEKDAY_LABEL[day.weekday]}</p>
              )}
            </div>
            <Button size="icon" variant="ghost" onClick={() => removeDay(day.id)} disabled={pending} aria-label="Delete day">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <ul className="mt-3 divide-y">
            {day.exercises.map((dx) => (
              <li key={dx.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm">{dx.exercise.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {dx.exercise.type === "cardio"
                      ? dx.target_duration_s ? `${Math.round(dx.target_duration_s / 60)} min` : "—"
                      : `${dx.target_sets ?? "?"} × ${dx.target_reps ?? "?"}${dx.target_weight_kg ? ` @ ${dx.target_weight_kg}kg` : ""}`}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeEx(dx.id)} disabled={pending} aria-label="Remove exercise">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setPickerForDay(day.id)} disabled={pending}>
            <Plus className="mr-1 h-3 w-3" /> Add exercise
          </Button>
        </Card>
      ))}

      <ExercisePickerSheet
        open={!!pickerForDay}
        onOpenChange={(v) => { if (!v) setPickerForDay(null); }}
        onPick={pickerForDay ? onPick(pickerForDay) : () => undefined}
      />
    </>
  );
}
