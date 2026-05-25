"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { logVitals } from "@/server/actions/vitals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

export function LogVitalSheet({ trigger }: { trigger?: React.ReactNode } = {}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parse = (k: string) => {
      const v = form.get(k);
      if (!v) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    start(async () => {
      const res = await logVitals({
        resting_hr: parse("resting_hr"),
        hrv_ms: parse("hrv_ms"),
        bp_sys: parse("bp_sys"),
        bp_dia: parse("bp_dia"),
      });
      if ("error" in res && res.error) toast.error(res.error);
      else { toast.success("Reading logged"); setOpen(false); router.refresh(); }
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? <Button size="sm"><Plus className="mr-1 h-4 w-4" />Log reading</Button>}
      </SheetTrigger>
      <SheetContent side="bottom" className="pb-safe">
        <SheetHeader>
          <SheetTitle>Log vitals</SheetTitle>
          <SheetDescription className="sr-only">Log resting heart rate, HRV, and blood pressure</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="mt-4 grid grid-cols-2 gap-3">
          <div className="space-y-2"><Label htmlFor="resting_hr">Resting HR (bpm)</Label><Input id="resting_hr" name="resting_hr" inputMode="numeric" /></div>
          <div className="space-y-2"><Label htmlFor="hrv_ms">HRV (ms)</Label><Input id="hrv_ms" name="hrv_ms" inputMode="numeric" /></div>
          <div className="space-y-2"><Label htmlFor="bp_sys">BP systolic</Label><Input id="bp_sys" name="bp_sys" inputMode="numeric" /></div>
          <div className="space-y-2"><Label htmlFor="bp_dia">BP diastolic</Label><Input id="bp_dia" name="bp_dia" inputMode="numeric" /></div>
          <SheetFooter className="col-span-2">
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">{pending ? "Logging…" : "Log reading"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
