import '../../skeleton/src/theme.css';
import { renderInbox, toMarkdown, type Decision } from '../../skeleton/src';
import { analyze } from './analyze';
import { toDecision } from './triage';
import cleanUrl from '../samples/clean-05.png?url';
import busyUrl from '../samples/clean-12.png?url';
import blurredUrl from '../samples/blurred-1.png?url';
import hazyUrl from '../samples/hazy-1.png?url';
import darkUrl from '../samples/dark-1.png?url';

/** Bundled synthetic images (CC0, generated). Cycled by the "Try a sample" button. */
const SAMPLES = [
  { name: 'sample-clean-05.png', url: cleanUrl }, { name: 'sample-blurred-1.png', url: blurredUrl },
  { name: 'sample-clean-12.png', url: busyUrl }, { name: 'sample-hazy-1.png', url: hazyUrl }, { name: 'sample-dark-1.png', url: darkUrl },
];
let nextSample = 0;

const decisions: Decision[] = [];
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

async function load(file: File): Promise<void> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 640 / bmp.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  decisions.unshift(toDecision(analyze(img), {
    photoId: `${file.name}-${decisions.length + 1}`, source: 'uploaded photo (local)', takenAt: new Date(file.lastModified).toISOString(),
    license: 'user-owned', daysSinceCleaning: Number($<HTMLInputElement>('days').value) || 0,
  }));
  $('prompt').hidden = true;
  renderInbox($('inbox'), decisions);
  $('status').textContent = `${decisions.length} photo(s) triaged. Top: ${decisions[0].title}`;
}

$<HTMLInputElement>('file').addEventListener('change', (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) load(f).catch((err) => ($('status').textContent = `Could not read photo: ${err}`));
});
$('sample').addEventListener('click', () => {
  const s = SAMPLES[nextSample++ % SAMPLES.length];
  fetch(s.url).then((r) => r.blob()).then((b) => load(new File([b], s.name, { type: 'image/png' })))
    .catch((err) => ($('status').textContent = `Could not load sample: ${err}`));
});
$('export').addEventListener('click', () => {
  const blob = new Blob([toMarkdown('Mussel Memory report', decisions)], { type: 'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mussel-memory-report.md';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
