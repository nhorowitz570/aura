"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Plus, Trash2, Flag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExercisePickerSheet } from "@/components/features/exercise-picker-sheet";
import { logSet, deleteSet, finishSession } from "@/server/actions/workouts";
import { kgToLb, lbToKg } from "@/lib/units";
import type {
  Exercise,
  Units,
  WorkoutDayExercise,
  WorkoutSession,
  WorkoutSessionSet,
} from "@/types/database";

type Planned = WorkoutDayExercise & { exercise: Exercise };

export function SessionRunner({
  session,
  planned,
  initialSets,
  units,
}: {
  session: WorkoutSession;
  planned: Planned[];
  initialSets: WorkoutSessionSet[];
  units: Units;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sets, setSets] = useState<WorkoutSessionSet[]>(initialSets);
  const [extras, setExtras] = useState<Exercise[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notes, setNotes] = useState("");

  const lineup: Planned[] = [
    ...planned,
    ...extras.map<Planned>((e) => ({
      id: `extra-${e.id}`,
      day_id: "",
      exercise_id: e.id,
      exercise: e,
      position: 0,
      target_sets: null,
      target_reps: null,
      target_weight_kg: null,
      target_duration_s: null,
    })),
  ];

  const finish = () =>
    start(async () => {
      const res = await finishSession(session.id, notes.trim() || undefined);
      if ("error" in res && res.error) toast.error(res.error);
      else {
        toast.success("Session saved");
        router.replace("/workouts/history");
        router.refresh();
      }
    });

  const onAdd = async (exId: string, payload: Omit<Parameters<typeof logSet>[0], "session_id" | "exercise_id" | "set_index">) => {
    const idx = sets.filter((s) => s.exercise_id === exId).length;
    const res = await logSet({ session_id: session.id, exercise_id: exId, set_index: idx, ...payload });
    if ("error" in res && res.error) toast.error(res.error);
    else if ("data" in res && res.data) setSets((xs) => [...xs, res.data]);
  };

  const onDelete = (id: string) =>
    start(async () => {
      const res = await deleteSet(id);
      if ("error" in res && res.error) toast.error(res.error);
      else setSets((xs) => xs.filter((s) => s.id !== id));
    });

  return (
    <>
      {lineup.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Add exercises to begin logging.
        </Card>
      )}

      {lineup.map((p) => (
        <ExerciseCard
          key={p.id}
          planned={p}
          sets={sets.filter((s) => s.exercise_id === p.exercise.id)}
          units={units}
          onAdd={onAdd}
          onDelete={onDelete}
        />
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" onClick={() => setPickerOpen(true)} disabled={pending}>
          <Plus className="mr-1 h-4 w-4" /> Add exercise
        </Button>
      </div>

      <Card className="p-5">
        <p className="text-sm font-medium">Notes</p>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did this session feel?"
          className="mt-2"
        />
      </Card>

      <Button onClick={finish} disabled={pending} className="w-full">
        <Flag className="mr-1.5 h-4 w-4" /> Finish session
      </Button>

      <ExercisePickerSheet
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(ex) => { setExtras((xs) => (xs.find((e) => e.id === ex.id) ? xs : [...xs, ex])); setPickerOpen(false); }}
      />
    </>
  );
}

function ExerciseCard({
  planned,
  sets,
  units,
  onAdd,
  onDelete,
}: {
  planned: Planned;
  sets: WorkoutSessionSet[];
  units: Units;
  onAdd: (exId: string, payload: { reps?: number | null; weight_kg?: number | null; duration_s?: number | null }) => void | Promise<void>;
  onDelete: (id: string) => void;
}) {
  const isCardio = planned.exercise.type === "cardio";
  const imperial = units === "imperial";
  const [reps, setReps] = useState<string>(planned.target_reps ? String(planned.target_reps) : "");
  const [weight, setWeight] = useState<string>(
    planned.target_weight_kg ? (imperial ? kgToLb(planned.target_weight_kg).toFixed(0) : planned.target_weight_kg.toString()) : "",
  );
  const [dur, setDur] = useState<string>(planned.target_duration_s ? String(Math.round(planned.target_duration_s / 60)) : "");

  const add = () => {
    if (isCardio) {
      const m = parseFloat(dur);
      if (!Number.isFinite(m)) return;
      onAdd(planned.exercise.id, { duration_s: Math.round(m * 60) });
    } else {
      const r = parseInt(reps, 10);
      const w = parseFloat(weight);
      onAdd(planned.exercise.id, {
        reps: Number.isFinite(r) ? r : null,
        weight_kg: Number.isFinite(w) ? (imperial ? lbToKg(w) : w) : null,
      });
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-base font-semibold">{planned.exercise.name}</p>
          <p className="text-xs text-muted-foreground">
            {isCardio
              ? planned.target_duration_s ? `Target ${Math.round(planned.target_duration_s / 60)} min` : "Cardio"
              : `Target ${planned.target_sets ?? "?"} × ${planned.target_reps ?? "?"}${planned.target_weight_kg ? ` @ ${planned.target_weight_kg}kg` : ""}`}
          </p>
        </div>
      </div>

      <ul className="mt-3 divide-y">
        {sets.map((s) => (
          <li key={s.id} className="flex items-center justify-between py-2 text-sm">
            <span className="tabular-nums text-muted-foreground">Set {s.set_index + 1}</span>
            <span className="tabular-nums">
              {isCardio
                ? s.duration_s ? `${Math.round(s.duration_s / 60)} min` : "—"
                : `${s.reps ?? "?"} reps${s.weight_kg ? ` · ${imperial ? `${Math.round(kgToLb(s.weight_kg))} lb` : `${s.weight_kg} kg`}` : ""}`}
            </span>
            <Button size="icon" variant="ghost" onClick={() => onDelete(s.id)} aria-label="Delete set">
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        {isCardio ? (
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Duration (min)</label>
            <Input inputMode="decimal" value={dur} onChange={(e) => setDur(e.target.value)} />
          </div>
        ) : (
          <>
            <div className="w-24">
              <label className="text-xs text-muted-foreground">Reps</label>
              <Input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
            </div>
            <div className="w-28">
              <label className="text-xs text-muted-foreground">{imperial ? "Weight (lb)" : "Weight (kg)"}</label>
              <Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
          </>
        )}
        <Button onClick={add} className="ml-auto"><Check className="mr-1 h-4 w-4" /> Log set</Button>
      </div>
    </Card>
  );
}
