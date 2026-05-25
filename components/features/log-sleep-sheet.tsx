"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { logSleep } from "@/server/actions/sleep";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

function defaultBedtime() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(23, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}
function defaultWakeup() {
  const d = new Date();
  d.setHours(7, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}

export function LogSleepSheet({ trigger }: { trigger?: React.ReactNode } = {}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    start(async () => {
      const res = await logSleep({
        start_at: new Date(String(form.get("start"))).toISOString(),
        end_at: new Date(String(form.get("end"))).toISOString(),
        quality: form.get("quality") ? Number(form.get("quality")) : null,
      });
      if ("error" in res && res.error) toast.error(res.error);
      else { toast.success("Sleep logged"); setOpen(false); router.refresh(); }
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? <Button size="sm"><Plus className="mr-1 h-4 w-4" />Log sleep</Button>}
      </SheetTrigger>
      <SheetContent side="bottom" className="pb-safe">
        <SheetHeader>
          <SheetTitle>Log sleep</SheetTitle>
          <SheetDescription className="sr-only">Log bedtime, wakeup, and sleep quality</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="start">Bedtime</Label><Input id="start" name="start" type="datetime-local" required defaultValue={defaultBedtime()} /></div>
            <div className="space-y-2"><Label htmlFor="end">Wakeup</Label><Input id="end" name="end" type="datetime-local" required defaultValue={defaultWakeup()} /></div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quality">Quality (1–5)</Label>
            <Input id="quality" name="quality" type="number" min="1" max="5" defaultValue="4" />
          </div>
          <SheetFooter>
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">{pending ? "Logging…" : "Log sleep"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
