// Date helpers. All "today" / "day window" math is anchored to the user's
// local timezone, not the server's. The offset is supplied by a `tz_offset`
// cookie set by `<TimezoneSync />` on the client (value = the JS
// `getTimezoneOffset()` in minutes, positive for west of UTC).
//
// Falls back to UTC (offset 0) if the cookie is missing — first request after
// sign-in, server-rendered pre-hydration, etc. The cookie is replaced as soon
// as the client mounts, so subsequent requests use the real local day.

import { cookies } from "next/headers";

const TZ_COOKIE = "tz_offset";

export async function getTzOffsetMin(): Promise<number> {
  return readOffsetMin();
}

export function toLocalISODate(d: Date | string, offsetMin: number): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const { y, m, day } = localPartsForInstant(date, offsetMin);
  return `${y}-${pad(m + 1)}-${pad(day)}`;
}

// Format a UTC timestamp as the user's local "h:mm AM/PM". Used for
// server-rendered times — the client could use `toLocaleTimeString` but on
// the server that resolves to the server's locale/UTC.
export function formatLocalTime(d: Date | string, offsetMin: number): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const shifted = new Date(date.getTime() - offsetMin * 60_000);
  const h24 = shifted.getUTCHours();
  const m = shifted.getUTCMinutes();
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${pad(m)} ${period}`;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// "Mon, Jan 5" in the user's local zone.
export function formatLocalDateShort(d: Date | string, offsetMin: number): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const shifted = new Date(date.getTime() - offsetMin * 60_000);
  const w = WEEKDAYS_SHORT[shifted.getUTCDay()];
  const mo = MONTHS_SHORT[shifted.getUTCMonth()];
  const day = shifted.getUTCDate();
  return `${w}, ${mo} ${day}`;
}

// "Jan 5, 2026, 3:14 PM" in the user's local zone.
export function formatLocalDateTime(d: Date | string, offsetMin: number): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const shifted = new Date(date.getTime() - offsetMin * 60_000);
  const mo = MONTHS_SHORT[shifted.getUTCMonth()];
  const day = shifted.getUTCDate();
  const year = shifted.getUTCFullYear();
  return `${mo} ${day}, ${year}, ${formatLocalTime(date, offsetMin)}`;
}

async function readOffsetMin(): Promise<number> {
  try {
    const store = await cookies();
    const v = store.get(TZ_COOKIE)?.value;
    if (!v) return 0;
    const n = parseInt(v, 10);
    if (!Number.isFinite(n)) return 0;
    // Clamp to a sane range (±14h covers every real-world IANA zone).
    return Math.max(-14 * 60, Math.min(14 * 60, n));
  } catch {
    // `cookies()` throws when called outside a request scope (e.g. scripts).
    return 0;
  }
}

function localPartsForInstant(d: Date, offsetMin: number) {
  // Shift the instant by the user's UTC offset, then read UTC fields to get
  // the components of the user's local clock at that instant.
  const shifted = new Date(d.getTime() - offsetMin * 60_000);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

function isoFromLocalMidnight(y: number, m: number, day: number, offsetMin: number): string {
  // Local midnight (y-m-day 00:00 in the user's zone) expressed as a UTC instant.
  return new Date(Date.UTC(y, m, day) + offsetMin * 60_000).toISOString();
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export async function todayISO(): Promise<string> {
  const offsetMin = await readOffsetMin();
  const { y, m, day } = localPartsForInstant(new Date(), offsetMin);
  return `${y}-${pad(m + 1)}-${pad(day)}`;
}

export async function isoDate(d: Date): Promise<string> {
  const offsetMin = await readOffsetMin();
  const { y, m, day } = localPartsForInstant(d, offsetMin);
  return `${y}-${pad(m + 1)}-${pad(day)}`;
}

export async function dayBounds(d: Date): Promise<{ start: string; end: string }> {
  const offsetMin = await readOffsetMin();
  const { y, m, day } = localPartsForInstant(d, offsetMin);
  const start = isoFromLocalMidnight(y, m, day, offsetMin);
  const end = isoFromLocalMidnight(y, m, day + 1, offsetMin);
  return { start, end };
}

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function rangeBounds(days: number): Promise<{ start: string; end: string }> {
  const offsetMin = await readOffsetMin();
  const { y, m, day } = localPartsForInstant(new Date(), offsetMin);
  const end = isoFromLocalMidnight(y, m, day + 1, offsetMin);
  const start = isoFromLocalMidnight(y, m, day + 1 - days, offsetMin);
  return { start, end };
}

export async function listDateStrings(days: number): Promise<string[]> {
  const offsetMin = await readOffsetMin();
  const { y, m, day } = localPartsForInstant(new Date(), offsetMin);
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const t = new Date(Date.UTC(y, m, day - i));
    out.push(`${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`);
  }
  return out;
}
