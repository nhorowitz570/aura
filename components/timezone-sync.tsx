"use client";

import { useEffect } from "react";

// Writes the browser's UTC offset (in minutes, JS sign convention — positive
// west of UTC) to a `tz_offset` cookie so server actions can compute the
// user's local day. Mounted once in the dashboard layout.
export function TimezoneSync() {
  useEffect(() => {
    const offset = new Date().getTimezoneOffset();
    const current = document.cookie
      .split("; ")
      .find((c) => c.startsWith("tz_offset="))
      ?.split("=")[1];
    if (current === String(offset)) return;
    // 400d, lax, path=/ so every server action sees it.
    document.cookie = `tz_offset=${offset}; path=/; max-age=${60 * 60 * 24 * 400}; samesite=lax`;
  }, []);
  return null;
}
