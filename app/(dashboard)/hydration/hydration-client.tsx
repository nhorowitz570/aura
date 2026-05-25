"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addWater, deleteWaterEntry } from "@/server/actions/water";
import { formatWater, flOzToMl } from "@/lib/units";
import type { WaterLog, Units } from "@/types/database";

const PRESETS_ML = [250, 500, 750];
const PRESETS_OZ = [8, 16, 24];

export function HydrationClient({ entries, units }: { entries: WaterLog[]; units: Units }) {
  const [pending, start] = useTransition();
  const [custom, setCustom] = useState("");
  const router = useRouter();
  const imperial = units === "imperial";

  const presets = imperial
    ? PRESETS_OZ.map((oz) => ({ ml: Math.round(flOzToMl(oz)), label: `${oz} oz` }))
    : PRESETS_ML.map((ml) => ({ ml, label: `${ml} ml` }));

  const undo = imperial
    ? { ml: -Math.round(flOzToMl(8)), label: "8 oz" }
    : { ml: -250, label: "250 ml" };

  const add = (ml: number, label?: string) =>
    start(async () => {
      const res = await addWater(ml);
      if ("error" in res && res.error) toast.error(res.error);
      else { toast.success(`${ml > 0 ? "+" : "-"}${label ?? Math.abs(ml) + " ml"}`); router.refresh(); }
    });

  const onCustom = () => {
    const n = parseFloat(custom);
    if (!Number.isFinite(n) || n === 0) { toast.error("Enter a number"); return; }
    const ml = imperial ? Math.round(flOzToMl(n)) : Math.round(n);
    add(ml, imperial ? `${n} oz` : `${ml} ml`);
    setCustom("");
  };

  const del = (id: string) =>
    start(async () => {
      const res = await deleteWaterEntry(id);
      if ("error" in res && res.error) toast.error(res.error);
      else router.refresh();
    });

  return (
    <>
      <Card className="p-5">
        <p className="text-sm font-medium">Quick add</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {presets.map((p) => (
            <Button key={p.label} variant="outline" disabled={pending} onClick={() => add(p.ml, p.label)} className="h-11">
              <Plus className="mr-1 h-3 w-3" />{p.label}
            </Button>
          ))}
          <Button variant="outline" disabled={pending} onClick={() => add(undo.ml, undo.label)} className="h-11 text-muted-foreground">
            <Minus className="mr-1 h-3 w-3" />{undo.label}
          </Button>
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            inputMode="decimal"
            placeholder={imperial ? "Custom (oz)" : "Custom (ml)"}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
          <Button onClick={onCustom} disabled={pending}>Add</Button>
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-medium">Today</p>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No entries yet.</p>
        ) : (
          <ul className="mt-3 divide-y">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm tabular-nums">{e.delta_ml > 0 ? "+" : "-"}{formatWater(Math.abs(e.delta_ml), units)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(e.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
                </div>
                <Button size="icon" variant="ghost" disabled={pending} onClick={() => del(e.id)} aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
