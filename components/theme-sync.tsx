"use client";
import { useEffect } from "react";
import { useTheme } from "next-themes";
import type { ThemeMode } from "@/types/database";

/**
 * Pushes the persisted profile.theme into next-themes once on mount so the
 * user's choice survives across devices.
 */
export function ThemeSync({ theme }: { theme: ThemeMode }) {
  const { theme: current, setTheme } = useTheme();
  useEffect(() => {
    if (current !== theme) setTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
  return null;
}
