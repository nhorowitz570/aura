import { cn } from "@/lib/utils";

export function CalorieRing({
  current,
  goal,
  protein,
  proteinGoal,
  className,
}: {
  current: number;
  goal: number;
  protein?: number;
  proteinGoal?: number;
  className?: string;
}) {
  const size = 200;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = goal > 0 ? Math.min(1, current / goal) : 0;
  const dash = c * pct;

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent-solid)"
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold tabular-nums">{Math.round(current)}</span>
        <span className="text-xs text-muted-foreground">/ {goal} kcal</span>
        {protein != null && proteinGoal != null && (
          <span className="mt-1 text-[11px] text-muted-foreground tabular-nums">
            {Math.round(protein)}/{proteinGoal}g protein
          </span>
        )}
      </div>
    </div>
  );
}
