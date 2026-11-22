import { check, makeEvidence, type Decision } from '../../skeleton/src';
import { CATEGORY_NAMES, STALE_HOURS, categoryOf, isFresh, readingAt, unknownCategories } from './gauge';
import { sourceEntry, type Bridge, type Data, type Gauge } from './model';
import { MINOR, bridgeRisk, hasPoorSubstructure, isScourCritical } from './risk';

const ET = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
export const fmtET = (ms: number) => ET.format(new Date(ms));
const fmtVal = (g: Gauge, v: number) => `${g.metric === 'stage' ? v.toFixed(2) : Math.round(v)} ${g.unit}`;

export function gaugeFor(data: Data, b: Bridge): Gauge {
  const g = data.gauges.find((x) => x.id === b.gauge);
  if (!g) throw new Error(`Bridge ${b.id} references unknown gauge ${b.gauge}`);
  return g;
}

export function decideBridge(data: Data, b: Bridge, atMs: number): Decision {
  const g = gaugeFor(data, b);
  const r = readingAt(g.series, atMs);
  const fresh = r !== null && isFresh(r);
  const category = fresh ? categoryOf(r.v, g.cats) : 0;
  const scour = isScourCritical(b);
  const poor = hasPoorSubstructure(b);
  const active = fresh && category >= MINOR;

  const usgs = sourceEntry(data, `usgs-${g.id}.json`);
  const nws = sourceEntry(data, 'nws-flood-categories.json', `/${g.lid}`);
  const nbi = sourceEntry(data, 'nbi-vt-bridges.json');
  const evidence = [
    makeEvidence({ id: `USGS-${g.id}@${r ? r.t : new Date(atMs).toISOString()}`, source: usgs.url, time: r ? r.t : new Date(atMs).toISOString(), license: usgs.license }),
    makeEvidence({ id: `NWS-${g.lid}-flood-categories`, source: nws.url, time: nws.retrieved, license: nws.license }),
    makeEvidence({ id: `NBI-VT-${b.id}`, source: nbi.url, time: nbi.retrieved, license: nbi.license }),
  ];

  const missing = unknownCategories(g.cats);
  const title = `${b.carries || 'Unnamed road'} over ${b.feature.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())} (NBI ${b.id})`;
  const nbiText = `Built ${b.yearBuilt ?? 'unknown'}, deck ${b.deck ?? 'n/a'}, superstructure ${b.superstructure ?? 'n/a'}, substructure ${b.substructure ?? 'n/a'}, scour code ${b.scourCritical}, ADT ${b.adt}.`;

  const checks = [
    check('gauge-reading', fresh,
      fresh ? `Gauge ${g.id} observed ${fmtET(Date.parse(r.t))}, ${r.ageHours.toFixed(1)} h before slider time.`
        : r ? `Latest ${g.id} reading is ${r.ageHours.toFixed(1)} h old (limit ${STALE_HOURS} h). Ask for a fresh gauge reading.`
          : `No ${g.id} reading at or before this time. Ask for a fresh gauge reading.`, true),
    check('scour', !(active && scour), scour ? 'NBI item 113 says scour critical (code 0-3).' : `NBI item 113 code ${b.scourCritical}: not scour critical.`),
    check('substructure', !(active && poor), poor ? `Substructure rating ${b.substructure} is poor (4 or lower).` : `Substructure rating ${b.substructure ?? 'n/a'} is not poor.`),
  ];

  const summary = fresh
    ? `Gauge ${g.id} (${g.name}) reads ${fmtVal(g, r.v)} at ${fmtET(Date.parse(r.t))}: ${CATEGORY_NAMES[category]} flood category.${missing.length ? ` NWS publishes no ${missing.join(', ')} threshold for this metric.` : ''} ${nbiText} ${b.gaugeKm} km from gauge.`
    : `No trusted gauge reading at ${fmtET(atMs)}, so no score. Ask for a fresh reading from gauge ${g.id}. ${nbiText}`;

  return { id: `b-${b.id}`, title, summary, risk: fresh ? bridgeRisk(b, category) : 0, checks, evidence };
}

export function decideAll(data: Data, atMs: number): Decision[] {
  return data.bridges.map((b) => decideBridge(data, b, atMs));
}
