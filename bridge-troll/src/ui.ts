import type { Data } from './model';

export const STEP_MS = 15 * 60_000;
export const PAGE_STEPS = (6 * 60 * 60_000) / STEP_MS; // 24 steps = 6 hours

/** New slider value after a keydown, or null when the key is not ours. Clamped to [0, max]. */
export function pageStep(key: string, value: number, max: number): number | null {
  if (key !== 'PageUp' && key !== 'PageDown') return null;
  const next = value + (key === 'PageUp' ? PAGE_STEPS : -PAGE_STEPS);
  return Math.min(max, Math.max(0, next));
}

/** Short, factual notes on public-data gaps, computed from the baked data. */
export function gapNotes(data: Pick<Data, 'gauges'>): string[] {
  const notes: string[] = [];
  for (const g of data.gauges) {
    let gap = 0; let from = ''; let to = '';
    for (let i = 1; i < g.series.length; i++) {
      const d = Date.parse(g.series[i][0]) - Date.parse(g.series[i - 1][0]);
      if (d > gap) { gap = d; from = g.series[i - 1][0]; to = g.series[i][0]; }
    }
    const hours = gap / 3_600_000;
    if (hours > 6) {
      notes.push(`${g.name} (${g.id}) has no readings for about ${Math.round(hours)} hours, from ${from.slice(0, 16)}Z to ${to.slice(0, 16)}Z. During that time it shows "No trusted reading" instead of a guess.`);
    }
    if (g.cats.major === null) {
      notes.push(`${g.name} (${g.id}): NWS publishes no major flood threshold, so the major category is unknown and never shown.`);
    }
  }
  return notes;
}
