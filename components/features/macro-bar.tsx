import { Progress } from "@/components/ui/progress";

export function MacroBar({
  label,
  current,
  goal,
  unit = "g",
}: {
  label: string;
  current: number;
  goal: number;
  unit?: string;
}) {
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {Math.round(current)}{unit} <span className="text-muted-foreground/60">/ {goal}{unit}</span>
        </span>
      </div>
      <Progress value={pct} />
    </div>
  );
}
