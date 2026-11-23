import { makeEvidence, type Decision } from '../../skeleton/src';
import type { Analysis } from './analyze';

export interface Reading {
  /** Unique card id. */
  photoId: string;
  /** Plain file name shown to people (titles, evidence). Defaults to photoId. */
  fileName?: string;
  source: string;
  takenAt: string;
  license: string;
  daysSinceCleaning: number;
  /** Previous trusted blocked fraction, for growth. */
  previousBlocked?: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** risk = % blocked x growth x days-since-cleaning factor, capped at 1. */
export function riskFor(blocked: number, daysSinceCleaning: number, previousBlocked?: number): number {
  const growth = previousBlocked && previousBlocked > 0 ? clamp(blocked / previousBlocked, 1, 3) : 1;
  const days = clamp(daysSinceCleaning / 14, 0.25, 2);
  return Math.min(1, blocked * growth * days);
}

export function toDecision(a: Analysis, r: Reading): Decision {
  const shown = r.fileName ?? r.photoId;
  const evidence = [makeEvidence({ id: shown, source: r.source, time: r.takenAt, license: r.license })];
  if (a.retake || a.blocked === null) {
    const failed = a.checks.filter((c) => !c.pass).map((c) => c.id).join(', ');
    return {
      id: r.photoId, title: `Retake photo ${shown}`,
      summary: `Photo not trustworthy (${failed}). No score given. Retake it.`,
      risk: 0, checks: a.checks, evidence,
    };
  }
  const risk = riskFor(a.blocked, r.daysSinceCleaning, r.previousBlocked);
  const pct = Math.round(a.blocked * 100);
  return {
    id: r.photoId, title: `Screen ${pct}% blocked`,
    summary: `${pct}% blocked, ${r.daysSinceCleaning} days since cleaning, risk ${(risk * 100).toFixed(0)}/100.`,
    risk, checks: a.checks, evidence,
  };
}

export const photosTriaged = (n: number): string => `${n} ${n === 1 ? 'photo' : 'photos'} triaged`;
