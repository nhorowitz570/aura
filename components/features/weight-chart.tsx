"use client";

import type { BodyMetric, Units } from "@/types/database";
import { kgToLb } from "@/lib/units";

export function WeightChart({ rows, units }: { rows: BodyMetric[]; units: Units }) {
  const imperial = units === "imperial";
  const points = rows
    .filter((r) => r.weight_kg != null)
    .map((r) => ({
      date: r.date,
      weight: imperial ? kgToLb(r.weight_kg!) : r.weight_kg!,
      bf: r.body_fat_pct,
    }));

  if (points.length < 2) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Log weight a few days to see trends.
      </div>
    );
  }

  const W = 600, H = 180, PAD = 24;
  const ws = points.map((p) => p.weight);
  const minW = Math.min(...ws);
  const maxW = Math.max(...ws);
  const rangeW = maxW - minW || 1;
  const bfs = points.map((p) => p.bf).filter((v): v is number => v != null);
  const hasBf = bfs.length >= 2;
  const minBf = hasBf ? Math.min(...bfs) : 0;
  const maxBf = hasBf ? Math.max(...bfs) : 1;
  const rangeBf = maxBf - minBf || 1;

  const x = (i: number) => PAD + (i * (W - PAD * 2)) / Math.max(1, points.length - 1);
  const yW = (v: number) => H - PAD - ((v - minW) / rangeW) * (H - PAD * 2);
  const yBf = (v: number) => H - PAD - ((v - minBf) / rangeBf) * (H - PAD * 2);

  const wPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${yW(p.weight)}`).join(" ");
  const bfPath = points.map((p, i) =>
    p.bf == null ? "" : `${i === 0 ? "M" : "L"} ${x(i)} ${yBf(p.bf)}`,
  ).filter(Boolean).join(" ");

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-48 w-full">
        <path d={wPath} fill="none" stroke="var(--accent-solid)" strokeWidth="2" />
        {hasBf && <path d={bfPath} fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeDasharray="4 3" />}
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={yW(p.weight)} r="2" fill="var(--accent-solid)" />
        ))}
      </svg>
      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-3 bg-accent-solid rounded" /> {imperial ? "Weight (lb)" : "Weight (kg)"}
        </span>
        {hasBf && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-3 rounded border border-muted-foreground" /> Body fat %
          </span>
        )}
      </div>
    </div>
  );
}
