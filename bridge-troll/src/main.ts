import '../../skeleton/src/theme.css';
import { LEVEL_LABEL, buildCards, renderInbox, runAdapters, toMarkdown, type Decision, type Level } from '../../skeleton/src';
import { config } from './config';
import { decideAll, fmtET } from './decide';
import { CATEGORY_NAMES, categoryOf, isFresh, readingAt } from './gauge';
import { loadData } from './model';
import { STEP_MS, gapNotes, pageStep } from './ui';

const data = loadData();
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const slider = $<HTMLInputElement>('time');

const starts = data.gauges.map((g) => Date.parse(g.series[0][0]));
const ends = data.gauges.map((g) => Date.parse(g.series[g.series.length - 1][0]));
const T0 = Math.max(...starts);
const T1 = Math.min(...ends);
slider.max = String(Math.floor((T1 - T0) / STEP_MS));
const timeAt = () => T0 + Number(slider.value) * STEP_MS;

let current: Decision[] = [];
let announceTimer: number | undefined;

function renderGauges(atMs: number): void {
  const table = document.createElement('table');
  const cap = document.createElement('caption');
  cap.textContent = 'Latest gauge reading at or before the replay time';
  cap.className = 'visually-hidden';
  const head = table.createTHead().insertRow();
  for (const h of ['Gauge', 'Reading', 'Observed', 'Category']) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = h; head.append(th); }
  const body = table.createTBody();
  for (const g of data.gauges) {
    const r = readingAt(g.series, atMs);
    const row = body.insertRow();
    const val = r ? `${g.metric === 'stage' ? r.v.toFixed(2) : Math.round(r.v)} ${g.unit}` : 'none';
    const cat = r && isFresh(r) ? CATEGORY_NAMES[categoryOf(r.v, g.cats)] : 'No trusted reading';
    for (const text of [`${g.name} (${g.id})`, val, r ? fmtET(Date.parse(r.t)) : '-', cat]) row.insertCell().textContent = text;
  }
  $('gauges').replaceChildren(table);
}

function counts(ds: Decision[]): Record<Level, number> {
  const c: Record<Level, number> = { 'needs-you': 0, watch: 0, fine: 0 };
  for (const card of buildCards(ds)) c[card.level]++;
  return c;
}

async function update(announce: boolean): Promise<void> {
  const atMs = timeAt();
  $('when').textContent = fmtET(atMs);
  slider.setAttribute('aria-valuetext', fmtET(atMs));
  current = await runAdapters(config, atMs);
  renderGauges(atMs);
  renderInbox($('cards'), current);
  const c = counts(current);
  const text = `${fmtET(atMs)}: ${c['needs-you']} ${LEVEL_LABEL['needs-you']}, ${c.watch} ${LEVEL_LABEL.watch}, ${c.fine} ${LEVEL_LABEL.fine}.`;
  if (announce) { window.clearTimeout(announceTimer); announceTimer = window.setTimeout(() => ($('status').textContent = text), 400); }
}

slider.addEventListener('keydown', (e) => {
  const next = pageStep(e.key, Number(slider.value), Number(slider.max));
  if (next === null) return;
  e.preventDefault();
  slider.value = String(next);
  void update(true);
});
slider.addEventListener('input', () => { void update(true); });
$('peak').addEventListener('click', () => {
  const m = data.gauges.find((g) => g.id === '04286000') ?? data.gauges[0];
  const peak = m.series.reduce((a, b) => (b[1] > a[1] ? b : a));
  slider.value = String(Math.min(Number(slider.max), Math.max(0, Math.round((Date.parse(peak[0]) - T0) / STEP_MS))));
  void update(true);
});
$('export').addEventListener('click', () => {
  const atMs = timeAt();
  const md = toMarkdown(`Bridge Troll report, ${fmtET(atMs)}`, decideAll(data, atMs)) + '\n---\nDemo replay, not an engineering assessment.\n';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }));
  a.download = 'bridge-troll-report.md';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

for (const n of gapNotes(data)) { const li = document.createElement('li'); li.textContent = n; $('gaps').append(li); }

// Start at the first moment all gauges have data; the user moves from there.
void update(true);
