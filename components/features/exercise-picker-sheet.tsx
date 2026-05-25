"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Search, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { Exercise, ExerciseKind } from "@/types/database";
import { listExercises, createExercise } from "@/server/actions/workouts";

export function ExercisePickerSheet({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (exercise: Exercise) => void | Promise<void>;
}) {
  const [pending, start] = useTransition();
  const [items, setItems] = useState<Exercise[]>([]);
  const [q, setQ] = useState("");
  const [type, setType] = useState<ExerciseKind | "all">("all");
  const [muscle, setMuscle] = useState<string>("all");

  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<ExerciseKind>("strength");

  useEffect(() => {
    if (!open) return;
    let cancel = false;
    start(async () => {
      const rows = await listExercises({ q: q || undefined, type: type === "all" ? undefined : type });
      if (!cancel) setItems(rows);
    });
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, q, type]);

  const muscles = Array.from(new Set(items.map((e) => e.muscle_group).filter(Boolean) as string[])).sort();
  const filtered = muscle === "all" ? items : items.filter((e) => e.muscle_group === muscle);

  const onCreate = () => {
    if (!newName.trim()) return;
    start(async () => {
      const res = await createExercise({ name: newName, type: newType });
      if ("error" in res && res.error) toast.error(res.error);
      else if ("data" in res && res.data) {
        toast.success("Added");
        onPick(res.data);
        setNewName("");
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto pb-safe">
        <SheetHeader>
          <SheetTitle>Pick exercise</SheetTitle>
          <SheetDescription className="sr-only">Search and pick an exercise to add</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises…" className="pl-8" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(["all", "strength", "cardio"] as const).map((t) => (
              <Button key={t} size="sm" variant={type === t ? "secondary" : "outline"} onClick={() => setType(t)}>
                {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
            <span className="mx-1 self-center text-muted-foreground">·</span>
            <Button size="sm" variant={muscle === "all" ? "secondary" : "outline"} onClick={() => setMuscle("all")}>
              All muscles
            </Button>
            {muscles.slice(0, 8).map((m) => (
              <Button key={m} size="sm" variant={muscle === m ? "secondary" : "outline"} onClick={() => setMuscle(m)}>
                {m}
              </Button>
            ))}
          </div>
        </div>

        <ul className="mt-4 max-h-72 divide-y overflow-y-auto">
          {filtered.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between py-3 text-left hover:bg-secondary/40"
                onClick={() => onPick(e)}
                disabled={pending}
              >
                <div>
                  <p className="text-sm font-medium">{e.name}</p>
                  <p className="text-xs text-muted-foreground">{[e.muscle_group, e.equipment].filter(Boolean).join(" · ")}</p>
                </div>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase text-muted-foreground">{e.type}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && !pending && (
            <li className="py-4 text-center text-sm text-muted-foreground">No matches.</li>
          )}
        </ul>

        <Separator className="my-4" />

        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Create new</Label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Exercise name" />
            <div className="inline-flex rounded-md border p-0.5">
              {(["strength", "cardio"] as ExerciseKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setNewType(k)}
                  className={"px-3 py-1.5 text-sm rounded-[6px] capitalize " + (newType === k ? "bg-secondary" : "text-muted-foreground")}
                >
                  {k}
                </button>
              ))}
            </div>
            <Button onClick={onCreate} disabled={pending || !newName.trim()}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
