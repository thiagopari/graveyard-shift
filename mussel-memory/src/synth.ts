import type { RawImage } from './image';

export const W = 192, H = 144, CELL = 8;
export const ROI = { x: 16, y: 12, w: 160, h: 120 }; // 20 x 15 cells = 300

export type Variant = 'clean' | 'blurred' | 'dark' | 'hazy' | 'offscreen';
export interface SynthSpec { name: string; blocked: number; variant: Variant; seed: number }
export interface Synth { spec: SynthSpec; image: RawImage; trueBlocked: number; expectRetake: boolean }

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function boxBlur(img: RawImage, radius: number, passes: number): void {
  const { width: w, height: h } = img;
  for (let p = 0; p < passes; p++) {
    const src = Uint8ClampedArray.from(img.data);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        for (let c = 0; c < 3; c++) {
          let s = 0, n = 0;
          for (let dy = -radius; dy <= radius; dy++)
            for (let dx = -radius; dx <= radius; dx++) {
              const xx = x + dx, yy = y + dy;
              if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
              s += src[(yy * w + xx) * 4 + c]; n++;
            }
          img.data[(y * w + x) * 4 + c] = s / n;
        }
  }
}

/**
 * Paints a synthetic intake screen: concrete surround, steel mesh over dark water,
 * and debris (brown/olive) filling exactly round(blocked x 300) cells. trueBlocked is
 * measured from the painted mask, so it is ground truth.
 */
export function synthesize(spec: SynthSpec): Synth {
  const rand = rng(spec.seed);
  const data = new Uint8ClampedArray(W * H * 4);
  const noise = (a: number) => (rand() - 0.5) * a;
  const set = (x: number, y: number, r: number, g: number, b: number) => {
    const i = (y * W + x) * 4;
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) set(x, y, 130 + noise(10), 128 + noise(10), 124 + noise(10));

  // Offscreen: the screen is only a small part of the frame (camera pointed away).
  const scr = spec.variant === 'offscreen' ? { x: 16, y: 12, w: 64, h: 48 } : ROI;
  const cols = scr.w / CELL, rows = scr.h / CELL, total = cols * rows;
  const order = Array.from({ length: total }, (_, i) => i);
  for (let i = total - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const debrisCells = new Set(order.slice(0, Math.round(spec.blocked * total)));
  const olive = rand() < 0.5;
  for (let c = 0; c < total; c++) {
    const cx = scr.x + (c % cols) * CELL, cy = scr.y + Math.floor(c / cols) * CELL;
    for (let y = 0; y < CELL; y++)
      for (let x = 0; x < CELL; x++) {
        if (debrisCells.has(c)) {
          const t = noise(50);
          olive ? set(cx + x, cy + y, 95 + t, 105 + t, 45 + t / 2) : set(cx + x, cy + y, 120 + t, 85 + t, 45 + t / 2);
        } else if (x < 3 || y < 3) set(cx + x, cy + y, 175 + noise(12), 185 + noise(12), 195 + noise(12));
        else set(cx + x, cy + y, 28 + noise(8), 70 + noise(8), 82 + noise(8));
      }
  }
  const image: RawImage = { width: W, height: H, data };
  const trueBlocked = spec.variant === 'offscreen' ? debrisCells.size / total : debrisCells.size / total;

  if (spec.variant === 'blurred') boxBlur(image, 2, 2);
  if (spec.variant === 'dark') for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) data[i + c] *= 0.22;
  if (spec.variant === 'hazy')
    for (let i = 0; i < data.length; i += 4) {
      data[i] = data[i] * 0.4 + 200 * 0.6; data[i + 1] = data[i + 1] * 0.4 + 205 * 0.6; data[i + 2] = data[i + 2] * 0.4 + 210 * 0.6;
    }
  return { spec, image, trueBlocked, expectRetake: spec.variant !== 'clean' };
}

/** 30 specs: 18 clean spread 0..90% blocked, 4 blurred, 4 dark, 2 hazy, 2 offscreen. */
export function suite(): SynthSpec[] {
  const specs: SynthSpec[] = [];
  for (let i = 0; i < 18; i++) specs.push({ name: `clean-${String(i).padStart(2, '0')}`, blocked: (i * 5) / 100 + 0.02 * (i % 3), variant: 'clean', seed: 100 + i });
  const extra: [Variant, number][] = [['blurred', 4], ['dark', 4], ['hazy', 2], ['offscreen', 2]];
  let k = 0;
  for (const [variant, n] of extra)
    for (let i = 0; i < n; i++, k++) specs.push({ name: `${variant}-${i}`, blocked: 0.15 + 0.2 * i + 0.05 * (k % 2), variant, seed: 500 + k });
  return specs;
}
