// Accent color presets. Drives `--accent` and `--ring` overrides on <html data-accent="...">.

export const ACCENTS = ["neutral", "blue", "violet", "emerald", "rose"] as const;
export type Accent = (typeof ACCENTS)[number];

export const ACCENT_LABEL: Record<Accent, string> = {
  neutral: "Neutral",
  blue: "Blue",
  violet: "Violet",
  emerald: "Emerald",
  rose: "Rose",
};

// Tailwind-class swatches for the settings selector preview.
export const ACCENT_SWATCH: Record<Accent, string> = {
  neutral: "bg-neutral-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
};

export function isAccent(v: unknown): v is Accent {
  return typeof v === "string" && (ACCENTS as readonly string[]).includes(v);
}
