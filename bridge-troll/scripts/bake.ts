/**
 * Bakes public data for bridge-troll into bridge-troll/data/*.json.
 * Run: npm run bake:bridge
 * Never invents or interpolates values. If a source fails, that part is skipped and reported.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const RETRIEVED = new Date().toISOString();
const PD = 'Public domain (US Government work)';

const CANDIDATES = [
  { id: '04286000', lid: 'MONV1', river: 'WINOOSKI RIVER' },
  { id: '04290500', lid: 'ESSV1', river: 'WINOOSKI RIVER' },
  { id: '04292500', lid: 'GEOV1', river: 'LAMOILLE RIVER' },
];
const RADIUS_KM = 25;
const MAX_BRIDGES = 60;
const START = '2023-07-08T00:00:00-04:00';
const END = '2023-07-14T23:59:00-04:00';

interface Source { file: string; url: string; retrieved: string; license: string; note: string }
const sources: Source[] = [];
const dropped: { what: string; why: string }[] = [];
const failures: string[] = [];

async function get(url: string, tries = 3): Promise<string> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'graveyard-shift-bake/0.1' }, redirect: 'follow' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.text();
    } catch (e) { last = e; await new Promise((res) => setTimeout(res, 1500 * (i + 1))); }
  }
  throw new Error(`${url}: ${last}`);
}

function save(file: string, data: unknown, url: string, license: string, note: string): void {
  writeFileSync(join(OUT, file), JSON.stringify(data) + '\n');
  sources.push({ file, url, retrieved: RETRIEVED, license, note });
  console.log('wrote', file);
}

const kmDist = (a: [number, number], b: [number, number]) =>
  Math.hypot((a[0] - b[0]) * 111.2, (a[1] - b[1]) * 111.2 * Math.cos((a[0] * Math.PI) / 180));

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// ---- 1. USGS series + site info, 2. NWS categories ------------------------------------
interface Cat { action: number | null; minor: number | null; moderate: number | null; major: number | null }
const known = (n: unknown): number | null => (typeof n === 'number' && n > -9000 ? n : null);
const kept: { id: string; lid: string; river: string; name: string; lat: number; lon: number; metric: 'stage' | 'discharge'; unit: string; cats: Cat }[] = [];
const nwsOut: Record<string, unknown> = {};

for (const c of CANDIDATES) {
  try {
    const ivUrl = `https://nwis.waterservices.usgs.gov/nwis/iv/?format=json&sites=${c.id}&startDT=${START}&endDT=${END}&parameterCd=00060,00065&siteStatus=all`;
    const iv = JSON.parse(await get(ivUrl));
    const series: Record<string, [string, number][]> = {};
    let name = '';
    for (const ts of iv.value.timeSeries) {
      name = ts.sourceInfo.siteName;
      const code = ts.variable.variableCode[0].value;
      const key = code === '00065' ? 'stage' : code === '00060' ? 'discharge' : null;
      if (!key) continue;
      series[key] = ts.values[0].value
        .filter((v: { value: string }) => v.value !== '' && Number(v.value) > -999)
        .map((v: { dateTime: string; value: string }) => [new Date(v.dateTime).toISOString(), Number(v.value)]);
    }
    if (!Object.values(series).some((s) => s.length > 0)) { dropped.push({ what: c.id, why: 'USGS returned no series for Jul 8-14 2023' }); continue; }

    const siteUrl = `https://waterservices.usgs.gov/nwis/site/?format=rdb&sites=${c.id}&siteOutput=expanded`;
    const rdb = (await get(siteUrl)).split('\n').filter((l) => !l.startsWith('#'));
    const hdr = rdb[0].split('\t'); const row = rdb[2].split('\t');
    const col = (n: string) => row[hdr.indexOf(n)];
    const lat = Number(col('dec_lat_va')); const lon = Number(col('dec_long_va'));
    if (col('site_no') !== c.id || !Number.isFinite(lat) || !Number.isFinite(lon)) { dropped.push({ what: c.id, why: 'USGS site service did not confirm the site' }); continue; }

    const nwsUrl = `https://api.water.noaa.gov/nwps/v1/gauges/${c.lid}`;
    const nws = JSON.parse(await get(nwsUrl));
    if (nws.usgsId !== c.id) { dropped.push({ what: c.id, why: `NWS ${c.lid} is not linked to USGS ${c.id}` }); continue; }
    const cat = nws.flood.categories;
    const stage: Cat = { action: known(cat.action.stage), minor: known(cat.minor.stage), moderate: known(cat.moderate.stage), major: known(cat.major.stage) };
    const flow: Cat = { action: known(cat.action.flow), minor: known(cat.minor.flow), moderate: known(cat.moderate.flow), major: known(cat.major.flow) };
    const count = (x: Cat) => Object.values(x).filter((v) => v !== null).length;
    // Use whichever metric has more published thresholds (ties go to stage), and only if we have that series.
    let metric: 'stage' | 'discharge' = count(stage) >= count(flow) ? 'stage' : 'discharge';
    if (!series[metric]?.length) metric = metric === 'stage' ? 'discharge' : 'stage';
    const cats = metric === 'stage' ? stage : flow;
    if (count(cats) === 0 || !series[metric]?.length) { dropped.push({ what: c.id, why: 'NWS publishes no usable flood category for a series we have' }); continue; }

    save(`usgs-${c.id}.json`, { gauge: c.id, name, series }, ivUrl, PD, `USGS NWIS instantaneous values, 00065 gage height (ft) and 00060 discharge (cfs), ${START} to ${END}`);
    nwsOut[c.id] = { lid: c.lid, name: nws.name, metric, unit: metric === 'stage' ? 'ft' : 'cfs', categories: cats, stageCategories: stage, flowCategories: flow };
    sources.push({ file: 'nws-flood-categories.json', url: nwsUrl, retrieved: RETRIEVED, license: PD, note: `NWS NWPS gauge ${c.lid}, flood categories (-9999 = not published, stored as null)` });
    sources.push({ file: 'usgs-sites.json', url: siteUrl, retrieved: RETRIEVED, license: PD, note: `USGS site service, location of ${c.id}` });
    kept.push({ id: c.id, lid: c.lid, river: c.river, name, lat, lon, metric, unit: metric === 'stage' ? 'ft' : 'cfs', cats });
  } catch (e) {
    failures.push(`${c.id}: ${e}`); dropped.push({ what: c.id, why: `source unreachable: ${e}` });
  }
}
if (kept.length) {
  writeFileSync(join(OUT, 'nws-flood-categories.json'), JSON.stringify(nwsOut) + '\n');
  writeFileSync(join(OUT, 'usgs-sites.json'), JSON.stringify(kept.map((k) => ({ gauge: k.id, lid: k.lid, name: k.name, river: k.river, lat: k.lat, lon: k.lon, metric: k.metric, unit: k.unit }))) + '\n');
  console.log('wrote nws-flood-categories.json, usgs-sites.json');
}

// ---- 3. NBI bridges ------------------------------------------------------------------
const NBI_URL = 'https://www.fhwa.dot.gov/bridge/nbi/2023/delimited/VT23.txt';
if (kept.length) {
  try {
    const lines = (await get(NBI_URL)).split(/\r?\n/).filter(Boolean);
    const H = lines[0].split(',');
    const ix = (n: string) => H.indexOf(n);
    const rating = (s: string) => (/^[0-9]$/.test(s) ? Number(s) : null);
    const out: unknown[] = [];
    for (const line of lines.slice(1)) {
      const f = line.split(',');
      const feature = f[ix('FEATURES_DESC_006A')].replace(/['"]/g, '').trim().toUpperCase();
      if (feature !== 'WINOOSKI RIVER' && feature !== 'LAMOILLE RIVER') continue;
      const la = f[ix('LAT_016')].trim(); const lo = f[ix('LONG_017')].trim();
      if (!/^\d{8}$/.test(la) || !/^\d{9}$/.test(lo)) continue;
      const lat = +la.slice(0, 2) + +la.slice(2, 4) / 60 + +la.slice(4) / 100 / 3600;
      const lon = -(+lo.slice(0, 3) + +lo.slice(3, 5) / 60 + +lo.slice(5) / 100 / 3600);
      const near = kept.filter((k) => k.river === feature).map((k) => ({ k, d: kmDist([lat, lon], [k.lat, k.lon]) })).sort((a, b) => a.d - b.d)[0];
      if (!near || near.d > RADIUS_KM) continue;
      const year = Number(f[ix('YEAR_BUILT_027')]);
      out.push({
        id: f[ix('STRUCTURE_NUMBER_008')].trim(),
        feature, carries: f[ix('FACILITY_CARRIED_007')].replace(/['"]/g, '').trim(),
        lat: +lat.toFixed(5), lon: +lon.toFixed(5), yearBuilt: year > 0 ? year : null,
        deck: rating(f[ix('DECK_COND_058')]), superstructure: rating(f[ix('SUPERSTRUCTURE_COND_059')]), substructure: rating(f[ix('SUBSTRUCTURE_COND_060')]),
        scourCritical: f[ix('SCOUR_CRITICAL_113')].trim(), adt: Number(f[ix('ADT_029')]) || 0,
        gauge: near.k.id, gaugeKm: +near.d.toFixed(1),
      });
    }
    (out as { gaugeKm: number }[]).sort((a, b) => a.gaugeKm - b.gaugeKm);
    const bridges = out.slice(0, MAX_BRIDGES);
    if (bridges.length === 0) throw new Error('no bridges matched');
    save('nbi-vt-bridges.json', bridges, NBI_URL, PD, `FHWA National Bridge Inventory 2023, Vermont delimited file, subset: Winooski/Lamoille River crossings within ${RADIUS_KM} km of a kept gauge (${out.length} matched, ${bridges.length} kept)`);
  } catch (e) { failures.push(`NBI: ${e}`); dropped.push({ what: 'NBI bridges', why: `source unreachable or empty: ${e}` }); }
}

writeFileSync(join(OUT, 'dropped.json'), JSON.stringify(dropped, null, 2) + '\n');
// one entry per distinct file+url
const seen = new Set<string>();
const uniq = sources.filter((s) => !seen.has(s.file + s.url) && seen.add(s.file + s.url));
writeFileSync(join(OUT, 'sources.json'), JSON.stringify(uniq, null, 2) + '\n');
console.log(`kept gauges: ${kept.map((k) => k.id).join(', ') || 'none'}; dropped: ${JSON.stringify(dropped)}`);
if (failures.length) { console.error('FAILURES:\n' + failures.join('\n')); process.exitCode = 1; }
