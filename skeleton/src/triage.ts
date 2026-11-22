import type { Check } from './checks';
import type { Evidence } from './evidence';

export type Level = 'needs-you' | 'watch' | 'fine';
export const LEVELS: readonly Level[] = ['fine', 'watch', 'needs-you'];
export const LEVEL_LABEL: Record<Level, string> = { 'needs-you': 'Needs you', watch: 'Watch', fine: 'Fine' };

export interface Decision {
  id: string;
  title: string;
  summary: string;
  /** 0..1, higher is worse. Use 0 when the reading is untrusted (blocking check failed). */
  risk: number;
  checks: Check[];
  evidence: Evidence[];
}

export const NEEDS_YOU_AT = 0.6;
export const WATCH_AT = 0.25;
export const FAIL_WEIGHT = 0.2;

export function levelRank(l: Level): number {
  return LEVELS.indexOf(l);
}

export function triage(d: Pick<Decision, 'risk' | 'checks'>): Level {
  if (d.checks.some((c) => !c.pass && c.blocking)) return 'needs-you';
  const risk = Math.min(1, Math.max(0, d.risk));
  const score = risk + FAIL_WEIGHT * d.checks.filter((c) => !c.pass).length;
  if (score >= NEEDS_YOU_AT) return 'needs-you';
  if (score >= WATCH_AT) return 'watch';
  return 'fine';
}
