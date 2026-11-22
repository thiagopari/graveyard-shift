import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { analyze } from '../src/analyze';
import { riskFor, toDecision } from '../src/triage';
import { suite, synthesize } from '../src/synth';
import { encodePng } from '../src/png';
import { triage } from '../../skeleton/src';

const all = suite().map(synthesize);
const reading = (id: string, days = 14, prev?: number) => ({
  photoId: id, source: 'synthetic generator', takenAt: '2026-11-21T00:00:00Z', license: 'CC0-1.0', daysSinceCleaning: days, previousBlocked: prev,
});

describe('synthetic suite', () => {
  it('has 30 images', () => expect(all).toHaveLength(30));

  it('estimates % blocked within 10 points on usable images', () => {
    const errs: number[] = [];
    for (const s of all.filter((x) => !x.expectRetake)) {
      const a = analyze(s.image);
      expect(a.retake, s.spec.name).toBe(false);
      errs.push(Math.abs(a.blocked! - s.trueBlocked) * 100);
    }
    expect(errs).toHaveLength(18);
    expect(Math.max(...errs)).toBeLessThanOrEqual(10);
  });

  it('says retake, with no score, for every blurred, dark, hazy or off-target image', () => {
    for (const s of all.filter((x) => x.expectRetake)) {
      const a = analyze(s.image);
      expect(a.retake, s.spec.name).toBe(true);
      expect(a.blocked, s.spec.name).toBeNull();
    }
    expect(all.filter((s) => ['blurred', 'dark'].includes(s.spec.variant))).toHaveLength(8);
  });

  it('names the failing check', () => {
    const failed = (v: string) => analyze(all.find((s) => s.spec.variant === v)!.image).checks.filter((c) => !c.pass).map((c) => c.id);
    expect(failed('blurred')).toContain('blur');
    expect(failed('dark')).toContain('exposure');
    expect(failed('hazy')).toContain('haze');
    expect(failed('offscreen')).toContain('coverage');
  });

  it('is deterministic', () => {
    const a = synthesize(suite()[3]), b = synthesize(suite()[3]);
    expect(Buffer.from(a.image.data).equals(Buffer.from(b.image.data))).toBe(true);
  });
});

describe('triage', () => {
  it('retake becomes a Needs you card with no score', () => {
    const s = all.find((x) => x.spec.variant === 'blurred')!;
    const d = toDecision(analyze(s.image), reading('b'));
    expect(triage(d)).toBe('needs-you');
    expect(d.summary).toMatch(/Retake/);
    expect(d.summary).not.toMatch(/\d+% blocked/);
    expect(d.evidence[0].id).toBe('b');
  });
  it('clean fresh screen is fine, clogged old screen needs you', () => {
    const lo = all[1], hi = all[17];
    expect(triage(toDecision(analyze(lo.image), reading('lo', 3)))).toBe('fine');
    expect(triage(toDecision(analyze(hi.image), reading('hi', 28)))).toBe('needs-you');
  });
  it('property: risk is monotone in blocked, growth input and days', () => {
    const u = fc.double({ min: 0, max: 1, noNaN: true });
    fc.assert(fc.property(u, u, fc.integer({ min: 0, max: 60 }), fc.integer({ min: 0, max: 60 }), (a, b, d1, d2) => {
      const [lo, hi] = a < b ? [a, b] : [b, a];
      const [dl, dh] = d1 < d2 ? [d1, d2] : [d2, d1];
      expect(riskFor(hi, dh)).toBeGreaterThanOrEqual(riskFor(lo, dl) - 1e-12);
      expect(riskFor(hi, dh)).toBeLessThanOrEqual(1);
    }));
  });
  it('growth raises risk', () => expect(riskFor(0.3, 14, 0.1)).toBeGreaterThan(riskFor(0.3, 14)));
});

describe('png + samples', () => {
  it('encodes a valid PNG header', () => {
    const buf = encodePng(all[0].image);
    expect(buf.subarray(1, 4).toString()).toBe('PNG');
    expect(buf.readUInt32BE(16)).toBe(192);
  });
  it('committed samples match the manifest (run npm run gen:mussel if this fails)', () => {
    const dir = join(__dirname, '..', 'samples');
    expect(existsSync(join(dir, 'manifest.json'))).toBe(true);
    const m = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
    expect(m.images).toHaveLength(30);
    for (const i of m.images) expect(existsSync(join(dir, i.file))).toBe(true);
  });
});

describe('retake card text', () => {
  it('shows the plain file name while keeping the card id unique', () => {
    const bad = all.find((x) => x.expectRetake)!;
    const a = analyze(bad.image);
    const d = toDecision(a, { ...reading('sample-blurred-1.png-2'), fileName: 'sample-blurred-1.png' });
    expect(d.title).toBe('Retake photo sample-blurred-1.png');
    expect(d.evidence[0].id).toBe('sample-blurred-1.png');
    expect(d.id).toBe('sample-blurred-1.png-2');
  });
});
