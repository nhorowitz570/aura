"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { logMeal } from "@/server/actions/meals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

export function LogMealSheet({ trigger }: { trigger?: React.ReactNode } = {}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    start(async () => {
      const res = await logMeal({
        name: String(form.get("name") || ""),
        calories: Number(form.get("calories") || 0),
        protein_g: Number(form.get("protein") || 0),
        carbs_g: Number(form.get("carbs") || 0),
        fat_g: Number(form.get("fat") || 0),
      });
      if ("error" in res && res.error) toast.error(res.error);
      else { toast.success("Meal logged"); setOpen(false); router.refresh(); }
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? <Button size="sm"><Plus className="mr-1 h-4 w-4" />Log meal</Button>}
      </SheetTrigger>
      <SheetContent side="bottom" className="pb-safe">
        <SheetHeader>
          <SheetTitle>Log a meal</SheetTitle>
          <SheetDescription>Enter calories and macros manually.</SheetDescription>
        </SheetHeader>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="e.g. Chicken bowl" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label htmlFor="calories">Calories</Label><Input id="calories" name="calories" type="number" min="0" required /></div>
            <div className="space-y-2"><Label htmlFor="protein">Protein (g)</Label><Input id="protein" name="protein" type="number" min="0" step="0.1" defaultValue="0" /></div>
            <div className="space-y-2"><Label htmlFor="carbs">Carbs (g)</Label><Input id="carbs" name="carbs" type="number" min="0" step="0.1" defaultValue="0" /></div>
            <div className="space-y-2"><Label htmlFor="fat">Fat (g)</Label><Input id="fat" name="fat" type="number" min="0" step="0.1" defaultValue="0" /></div>
          </div>
          <SheetFooter>
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">{pending ? "Logging…" : "Log meal"}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
