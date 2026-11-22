import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { LEVELS, levelRank, triage, runAdapters } from '../../skeleton/src';
import { config } from '../src/config';
import { decideBridge } from '../src/decide';
import { STALE_HOURS, categoryOf, readingAt } from '../src/gauge';
import { loadData, type Bridge, type Cats } from '../src/model';
import { bridgeRisk } from '../src/risk';

const data = loadData();
const arbBridge = fc.record({
  scourCritical: fc.constantFrom('0', '1', '3', '4', '5', '8', '9', 'U', 'N'),
  substructure: fc.option(fc.integer({ min: 0, max: 9 }), { nil: null }),
});

describe('data', () => {
  it('has gauges, 1..60 bridges, and every bridge points at a kept gauge', () => {
    expect(data.gauges.length).toBeGreaterThan(0);
    expect(data.bridges.length).toBeGreaterThan(0);
    expect(data.bridges.length).toBeLessThanOrEqual(60);
    for (const b of data.bridges) expect(data.gauges.some((g) => g.id === b.gauge)).toBe(true);
  });
  it('series are sorted and strictly from Jul 2023', () => {
    for (const g of data.gauges) {
      expect(g.series.length).toBeGreaterThan(100);
      for (let i = 1; i < g.series.length; i++) expect(Date.parse(g.series[i][0])).toBeGreaterThan(Date.parse(g.series[i - 1][0]));
      expect(g.series[0][0].startsWith('2023-07')).toBe(true);
    }
  });
  it('every card cites a source listed in sources.json, plus gauge id + timestamp and NBI structure number', async () => {
    const urls = new Set(data.sources.map((s) => s.url));
    for (const at of [Date.parse('2023-07-09T12:00:00Z'), Date.parse('2023-07-11T15:00:00Z'), Date.parse('2023-07-13T00:00:00Z')]) {
      const ds = await runAdapters(config, at);
      expect(ds.length).toBe(data.bridges.length);
      for (const d of ds) {
        expect(d.evidence.length).toBeGreaterThanOrEqual(3);
        for (const e of d.evidence) { expect(urls.has(e.source)).toBe(true); expect(e.license).toBeTruthy(); }
        expect(d.evidence.some((e) => /^USGS-\d{8}@/.test(e.id) && !Number.isNaN(Date.parse(e.time)))).toBe(true);
        expect(d.evidence.some((e) => /^NBI-VT-/.test(e.id) && d.title.includes(e.id.replace('NBI-VT-', '')))).toBe(true);
      }
    }
  });
  it('sources.json lists url, retrieval date and licence for every baked data file', async () => {
    const { readdirSync } = await import('node:fs');
    const files = readdirSync(new URL('../data', import.meta.url)).filter((f) => f.endsWith('.json') && f !== 'sources.json' && f !== 'dropped.json');
    for (const f of files) {
      const s = data.sources.filter((x) => x.file === f);
      expect(s.length, f).toBeGreaterThan(0);
      for (const x of s) { expect(x.url).toMatch(/^https:\/\//); expect(Date.parse(x.retrieved)).not.toBeNaN(); expect(x.license).toBeTruthy(); }
    }
  });
});

describe('gauge reading', () => {
  const series: [string, number][] = [['2023-07-10T00:00:00.000Z', 5], ['2023-07-10T01:00:00.000Z', 9]];
  it('uses the latest observation at or before t and never interpolates', () => {
    expect(readingAt(series, Date.parse('2023-07-09T23:59:00Z'))).toBeNull();
    expect(readingAt(series, Date.parse('2023-07-10T00:30:00Z'))?.v).toBe(5);
    expect(readingAt(series, Date.parse('2023-07-10T01:00:00Z'))?.v).toBe(9);
  });
  it('skips unknown thresholds', () => {
    const c: Cats = { action: 14000, minor: 23000, moderate: 24000, major: null };
    expect(categoryOf(13999, c)).toBe(0);
    expect(categoryOf(33300, c)).toBe(3);
  });
});

describe('triage', () => {
  it('property: a higher category never lowers a bridge risk or priority', () => {
    fc.assert(fc.property(arbBridge, fc.integer({ min: 0, max: 4 }), fc.integer({ min: 0, max: 4 }), (b, c1, c2) => {
      const [lo, hi] = c1 <= c2 ? [c1, c2] : [c2, c1];
      expect(bridgeRisk(b, hi)).toBeGreaterThanOrEqual(bridgeRisk(b, lo));
    }));
  });
  it('property: a higher gauge value never lowers a real bridge priority', () => {
    const fresh = (b: Bridge, v: number) => {
      const g = data.gauges.find((x) => x.id === b.gauge)!;
      const t = '2023-07-11T12:00:00.000Z';
      const g2 = { ...g, series: [[t, v]] as [string, number][] };
      const d2 = { ...data, gauges: data.gauges.map((x) => (x.id === g.id ? g2 : x)) };
      return triage(decideBridge(d2, b, Date.parse(t)));
    };
    fc.assert(fc.property(fc.constantFrom(...data.bridges), fc.double({ min: 0, max: 60000, noNaN: true }), fc.double({ min: 0, max: 60000, noNaN: true }), (b, x, y) => {
      const [lo, hi] = x <= y ? [x, y] : [y, x];
      expect(levelRank(fresh(b, hi))).toBeGreaterThanOrEqual(levelRank(fresh(b, lo)));
    }), { numRuns: 500 });
  });
  it('property: scour critical or poor substructure never lowers priority at the same stage', () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 4 }), fc.integer({ min: 0, max: 9 }), (c, sub) => {
      const base = { scourCritical: '8', substructure: sub };
      const worse = { scourCritical: '3', substructure: sub };
      expect(bridgeRisk(worse, c)).toBeGreaterThanOrEqual(bridgeRisk(base, c));
    }));
  });
  it('a stale or missing reading gives no score and asks for a fresh reading (Needs you)', () => {
    const b = data.bridges[0];
    const g = data.gauges.find((x) => x.id === b.gauge)!;
    const after = Date.parse(g.series[0][0]) + (STALE_HOURS + 1) * 3_600_000;
    const stale = { ...data, gauges: data.gauges.map((x) => (x.id === g.id ? { ...g, series: [g.series[0]] } : x)) };
    for (const at of [Date.parse(g.series[0][0]) - 1000, after]) {
      const d = decideBridge(stale, b, at);
      expect(d.risk).toBe(0);
      expect(triage(d)).toBe('needs-you');
      expect(d.summary).toMatch(/no score/i);
      expect(d.summary).toMatch(/fresh reading/i);
    }
  });
  it('the flood peak produces at least one Needs you and a calm start has none', async () => {
    const peak = await runAdapters(config, Date.parse('2023-07-11T13:00:00Z'));
    const start = await runAdapters(config, Date.parse(data.gauges[0].series[0][0]) + 3_600_000);
    expect(peak.some((d) => triage(d) === 'needs-you')).toBe(true);
    expect(start.every((d) => triage(d) !== 'needs-you')).toBe(true);
    expect(new Set(LEVELS).size).toBe(3);
  });
});
