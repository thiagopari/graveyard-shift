import type { Cats, Obs } from './model';

export const STALE_HOURS = 6;
export const CATEGORY_NAMES = ['Below action', 'Action', 'Minor', 'Moderate', 'Major'] as const;

export interface Reading { t: string; v: number; ageHours: number }

/** Latest observation at or before `atMs`. Never interpolates. Series must be sorted ascending. */
export function readingAt(series: Obs[], atMs: number): Reading | null {
  let lo = 0, hi = series.length - 1, found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (Date.parse(series[mid][0]) <= atMs) { found = mid; lo = mid + 1; } else hi = mid - 1;
  }
  if (found < 0) return null;
  const [t, v] = series[found];
  return { t, v, ageHours: (atMs - Date.parse(t)) / 3_600_000 };
}

export const isFresh = (r: Reading | null): boolean => r !== null && r.ageHours <= STALE_HOURS;

/** 0 below action, 1 action, 2 minor, 3 moderate, 4 major. Unknown thresholds are skipped. */
export function categoryOf(value: number, c: Cats): number {
  const order: (keyof Cats)[] = ['action', 'minor', 'moderate', 'major'];
  let cat = 0;
  order.forEach((k, i) => { const th = c[k]; if (th !== null && value >= th) cat = i + 1; });
  return cat;
}

export function unknownCategories(c: Cats): string[] {
  return (['action', 'minor', 'moderate', 'major'] as const).filter((k) => c[k] === null);
}
