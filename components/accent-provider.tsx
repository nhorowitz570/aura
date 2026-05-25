"use client";
import { useEffect } from "react";
import { ACCENTS, type Accent } from "@/lib/accent";

export function AccentProvider({ accent, children }: { accent: Accent; children: React.ReactNode }) {
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.accent = (ACCENTS as readonly string[]).includes(accent) ? accent : "neutral";
  }, [accent]);
  return <>{children}</>;
}
