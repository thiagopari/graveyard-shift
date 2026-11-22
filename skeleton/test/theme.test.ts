import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/theme.css', import.meta.url), 'utf8');
const tok = (n: string): string => {
  const m = css.match(new RegExp(`--${n}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`missing token --${n}`);
  return m[1];
};
const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
export const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// Lightest background a text can sit on: the fog stop, the panel and the hover state.
const backgrounds = ['bg', 'fog', 'panel'];
const text = ['fg', 'muted', 'lantern', 'need', 'watch', 'fine'];

describe('theme contrast (WCAG AA 4.5:1 for text)', () => {
  for (const t of text) for (const b of backgrounds) {
    it(`--${t} on --${b}`, () => { expect(ratio(tok(t), tok(b))).toBeGreaterThanOrEqual(4.5); });
  }
  it('button hover background keeps text AA', () => { expect(ratio(tok('fg'), '#21262d')).toBeGreaterThanOrEqual(4.5); });
  it('focus ring (lantern) is 3:1 against bg', () => { expect(ratio(tok('lantern'), tok('bg'))).toBeGreaterThanOrEqual(3); });
  it('level colours on button hover and fog-lit body also AA', () => { expect(ratio(tok('need'), '#21262d')).toBeGreaterThanOrEqual(4.5); });
});

describe('theme motion', () => {
  it('every animation sits inside prefers-reduced-motion: no-preference', () => {
    const outside = css.replace(/@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}\n/, '');
    expect(outside).not.toMatch(/animation\s*:/);
    expect(css).toMatch(/prefers-reduced-motion: no-preference/);
  });
});
