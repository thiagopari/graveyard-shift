import type { Bridge } from './model';

/** Hydraulic load by category (0 below action .. 4 major). Non-decreasing. */
export const HYDRO = [0, 0.15, 0.3, 0.5, 0.7] as const;
export const MINOR = 2;

export const isScourCritical = (b: Pick<Bridge, 'scourCritical'>) => /^[0-3]$/.test(b.scourCritical);
export const hasPoorSubstructure = (b: Pick<Bridge, 'substructure'>) => b.substructure !== null && b.substructure <= 4;

/** Pure and monotone in `category`: a higher category never gives a lower risk. */
export function bridgeRisk(b: Pick<Bridge, 'scourCritical' | 'substructure'>, category: number): number {
  const cat = Math.min(4, Math.max(0, Math.trunc(category)));
  const vuln = 1 + (isScourCritical(b) ? 0.5 : 0) + (hasPoorSubstructure(b) ? 0.5 : 0);
  return Math.min(1, HYDRO[cat] * vuln);
}
