import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePng } from '../src/png';
import { suite, synthesize } from '../src/synth';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'samples');
mkdirSync(out, { recursive: true });
const manifest = suite().map((spec) => {
  const s = synthesize(spec);
  writeFileSync(join(out, `${spec.name}.png`), encodePng(s.image));
  return { file: `${spec.name}.png`, variant: spec.variant, trueBlockedPct: Math.round(s.trueBlocked * 1000) / 10, expectRetake: s.expectRetake };
});
writeFileSync(join(out, 'manifest.json'), JSON.stringify({ synthetic: true, license: 'CC0-1.0', images: manifest }, null, 2));
console.log(`Wrote ${manifest.length} images to ${out}`);
