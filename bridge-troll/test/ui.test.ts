import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { loadData } from '../src/model';
import { PAGE_STEPS, gapNotes, pageStep } from '../src/ui';

describe('pageStep', () => {
  it('moves 6 hours (24 steps of 15 min)', () => {
    expect(PAGE_STEPS).toBe(24);
    expect(pageStep('PageUp', 10, 1000)).toBe(34);
    expect(pageStep('PageDown', 100, 1000)).toBe(76);
  });
  it('ignores other keys', () => { expect(pageStep('ArrowRight', 5, 10)).toBeNull(); });
  it('always stays within [0, max]', () => {
    fc.assert(fc.property(fc.nat(2000), fc.nat(2000), fc.constantFrom('PageUp', 'PageDown'), (v, extra, key) => {
      const max = v + extra; const r = pageStep(key, v, max)!;
      return r >= 0 && r <= max;
    }));
  });
});

describe('gapNotes', () => {
  const notes = gapNotes(loadData());
  it('reports the Essex Jct gap', () => { expect(notes.some((n) => n.includes('04290500') && /about 2\d hours/.test(n))).toBe(true); });
  it('reports East Georgia has no major threshold', () => { expect(notes.some((n) => n.includes('04292500') && n.includes('major'))).toBe(true); });
});
