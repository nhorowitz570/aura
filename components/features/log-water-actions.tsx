"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { addWater } from "@/server/actions/water";
import { Button } from "@/components/ui/button";
import { flOzToMl } from "@/lib/units";
import type { Units } from "@/types/database";

const PRESETS_ML = [250, 500, 750];
const PRESETS_OZ = [8, 16, 24];

export function LogWaterActions({ compact = false, units = "metric" }: { compact?: boolean; units?: Units }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const imperial = units === "imperial";

  const log = (ml: number, label: string) =>
    start(async () => {
      const res = await addWater(ml);
      if ("error" in res && res.error) toast.error(res.error);
      else { toast.success(ml > 0 ? `+${label}` : `-${label}`); router.refresh(); }
    });

  const presets = imperial
    ? PRESETS_OZ.map((oz) => ({ ml: Math.round(flOzToMl(oz)), label: `${oz} oz` }))
    : PRESETS_ML.map((ml) => ({ ml, label: `${ml} ml` }));

  const undo = imperial
    ? { ml: -Math.round(flOzToMl(8)), label: "8 oz" }
    : { ml: -250, label: "250 ml" };

  return (
    <div className={"grid gap-2 " + (compact ? "grid-cols-4" : "grid-cols-2 sm:grid-cols-4")}>
      {presets.map((p) => (
        <Button key={p.label} variant="outline" disabled={pending} onClick={() => log(p.ml, p.label)} className="h-11">
          <Plus className="mr-1 h-3 w-3" />{p.label}
        </Button>
      ))}
      <Button variant="outline" disabled={pending} onClick={() => log(undo.ml, undo.label)} className="h-11 text-muted-foreground">
        <Minus className="mr-1 h-3 w-3" />{undo.label}
      </Button>
    </div>
  );
}
