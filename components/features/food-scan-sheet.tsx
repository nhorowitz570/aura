"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Upload, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { scanFood } from "@/server/actions/foodScan";
import { logMeal } from "@/server/actions/meals";
import type { FoodScanResult } from "@/lib/ai/prompts/food-scan";

export function FoodScanSheet({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [scanning, startScan] = useTransition();
  const [saving, startSave] = useTransition();
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [result, setResult] = useState<FoodScanResult | null>(null);
  const cameraRef = useRef<HTMLInputElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const reset = () => { setImagePath(null); setResult(null); };

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      startScan(async () => {
        const res = await scanFood({ dataUrl });
        if (res.error || !res.data) { toast.error(res.error ?? "Scan failed"); return; }
        setImagePath(res.data.image_path);
        setResult(res.data.parsed);
      });
    };
    reader.readAsDataURL(file);
  };

  const onSave = () => {
    if (!result) return;
    startSave(async () => {
      const res = await logMeal({
        name: result.name || "Scanned meal",
        calories: result.totals.calories,
        protein_g: result.totals.protein_g,
        carbs_g: result.totals.carbs_g,
        fat_g: result.totals.fat_g,
        source: "scan",
        image_path: imagePath,
      });
      if ("error" in res && res.error) toast.error(res.error);
      else { toast.success("Meal logged"); setOpen(false); reset(); router.refresh(); }
    });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto pb-safe">
        <SheetHeader>
          <SheetTitle>Scan food</SheetTitle>
          <SheetDescription className="sr-only">Take or upload a photo of your meal and confirm the parsed macros.</SheetDescription>
        </SheetHeader>

        {!result && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
            <Button variant="outline" className="h-20 flex-col gap-1" onClick={() => cameraRef.current?.click()} disabled={scanning}>
              <Camera className="h-5 w-5" /> Take photo
            </Button>
            <Button variant="outline" className="h-20 flex-col gap-1" onClick={() => fileRef.current?.click()} disabled={scanning}>
              <Upload className="h-5 w-5" /> Upload
            </Button>
            {scanning && (
              <p className="col-span-2 mt-2 inline-flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing image…
              </p>
            )}
          </div>
        )}

        {result && (
          <EditableResult result={result} setResult={setResult} onSave={onSave} saving={saving} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function EditableResult({
  result, setResult, onSave, saving,
}: {
  result: FoodScanResult;
  setResult: (r: FoodScanResult) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const t = result.totals;
  const set = (k: keyof typeof t, v: string) => setResult({ ...result, totals: { ...t, [k]: parseFloat(v) || 0 } });
  return (
    <div className="mt-4 space-y-4">
      <div>
        <Label>Meal name</Label>
        <Input value={result.name} onChange={(e) => setResult({ ...result, name: e.target.value })} className="mt-1.5" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Calories</Label>
          <Input inputMode="numeric" value={t.calories} onChange={(e) => set("calories", e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label>Protein (g)</Label>
          <Input inputMode="decimal" value={t.protein_g} onChange={(e) => set("protein_g", e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label>Carbs (g)</Label>
          <Input inputMode="decimal" value={t.carbs_g} onChange={(e) => set("carbs_g", e.target.value)} className="mt-1.5" />
        </div>
        <div>
          <Label>Fat (g)</Label>
          <Input inputMode="decimal" value={t.fat_g} onChange={(e) => set("fat_g", e.target.value)} className="mt-1.5" />
        </div>
      </div>
      {result.items.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Detected items</p>
          <ul className="mt-1.5 space-y-1">
            {result.items.map((i, idx) => (
              <li key={idx} className="flex items-baseline justify-between text-sm">
                <span>{i.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">{Math.round(i.calories)} kcal</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Button onClick={onSave} disabled={saving} className="w-full">Log meal</Button>
    </div>
  );
}
