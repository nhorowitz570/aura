"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logWeight } from "@/server/actions/weight";
import { kgToLb, lbToKg } from "@/lib/units";
import type { Units } from "@/types/database";

export function WeightLogSheet({ units, trigger }: { units: Units; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [w, setW] = useState("");
  const [bf, setBf] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const imperial = units === "imperial";

  const submit = () => start(async () => {
    const wn = parseFloat(w);
    const bfn = parseFloat(bf);
    const res = await logWeight({
      weight_kg: Number.isFinite(wn) ? (imperial ? lbToKg(wn) : wn) : null,
      body_fat_pct: Number.isFinite(bfn) ? bfn : null,
    });
    if ("error" in res && res.error) toast.error(res.error);
    else { toast.success("Logged"); setOpen(false); setW(""); setBf(""); router.refresh(); }
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="pb-safe">
        <SheetHeader>
          <SheetTitle>Log weight</SheetTitle>
          <SheetDescription className="sr-only">Record today&apos;s weight or body fat percentage</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="w">{imperial ? "Weight (lb)" : "Weight (kg)"}</Label>
            <Input id="w" inputMode="decimal" value={w} onChange={(e) => setW(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="bf">Body fat (%)</Label>
            <Input id="bf" inputMode="decimal" value={bf} onChange={(e) => setBf(e.target.value)} className="mt-1.5" placeholder="optional" />
          </div>
        </div>
        <Button onClick={submit} disabled={pending} className="mt-5 w-full">Log</Button>
      </SheetContent>
    </Sheet>
  );
}
