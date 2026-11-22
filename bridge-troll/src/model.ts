import sourcesJson from '../data/sources.json';
import sitesJson from '../data/usgs-sites.json';
import nwsJson from '../data/nws-flood-categories.json';
import bridgesJson from '../data/nbi-vt-bridges.json';
import g04286000 from '../data/usgs-04286000.json';
import g04290500 from '../data/usgs-04290500.json';
import g04292500 from '../data/usgs-04292500.json';

export type Obs = [string, number]; // [UTC ISO time, value]
export type Metric = 'stage' | 'discharge';
export interface Cats { action: number | null; minor: number | null; moderate: number | null; major: number | null }
export interface Source { file: string; url: string; retrieved: string; license: string; note: string }
export interface Bridge {
  id: string; feature: string; carries: string; lat: number; lon: number; yearBuilt: number | null;
  deck: number | null; superstructure: number | null; substructure: number | null;
  scourCritical: string; adt: number; gauge: string; gaugeKm: number;
}
export interface Gauge {
  id: string; lid: string; name: string; river: string; lat: number; lon: number;
  metric: Metric; unit: string; cats: Cats; series: Obs[];
}
export interface Data { gauges: Gauge[]; bridges: Bridge[]; sources: Source[] }

const series = [g04286000, g04290500, g04292500] as unknown as { gauge: string; series: Partial<Record<Metric, Obs[]>> }[];

export function loadData(): Data {
  const nws = nwsJson as unknown as Record<string, { lid: string; name: string; metric: Metric; unit: string; categories: Cats }>;
  const gauges: Gauge[] = (sitesJson as unknown as { gauge: string; river: string; lat: number; lon: number }[]).map((s) => {
    const n = nws[s.gauge];
    const raw = series.find((x) => x.gauge === s.gauge)?.series[n.metric] ?? [];
    const sorted = [...raw].sort((a, b) => Date.parse(a[0]) - Date.parse(b[0]));
    return { id: s.gauge, lid: n.lid, name: n.name, river: s.river, lat: s.lat, lon: s.lon, metric: n.metric, unit: n.unit, cats: n.categories, series: sorted };
  });
  return { gauges, bridges: bridgesJson as unknown as Bridge[], sources: sourcesJson as Source[] };
}

/** URL of the registered source for a baked file; `match` picks one entry when a file has several. */
export function sourceUrl(data: Pick<Data, 'sources'>, file: string, match?: string): string {
  const s = data.sources.find((x) => x.file === file && (!match || x.url.includes(match)));
  if (!s) throw new Error(`No source registered for ${file}${match ? ` (${match})` : ''}`);
  return s.url;
}
export function sourceEntry(data: Pick<Data, 'sources'>, file: string, match?: string): Source {
  return data.sources.find((x) => x.file === file && (!match || x.url.includes(match)))!;
}
