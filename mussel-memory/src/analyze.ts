import { check, type Check } from '../../skeleton/src';
import { defaultRoi, laplacian, lumaAt, lumaPlane, type RawImage, type Roi } from './image';

export const THRESHOLDS = {
  /** Laplacian variance below this: too blurry to trust. */
  minSharpness: 150,
  /** Mean luma outside [min, max]: too dark / too bright. */
  minMeanLuma: 50,
  maxMeanLuma: 205,
  /** Share of ROI pixels whose darkest channel is below darkChannel. Haze lifts every pixel, so this collapses. */
  darkChannel: 70,
  minDarkShare: 0.05,
  /** Share of ROI tiles that look like screen (mesh edges or debris). */
  minCoverage: 0.8,
  tile: 8,
  tileEdge: 8,
  /** Debris pixel: warm and saturated. */
  debrisRB: 20,
  debrisSat: 0.25,
} as const;

export interface Analysis {
  checks: Check[];
  retake: boolean;
  /** Fraction 0..1. null when retake: a photo too bad to trust never gets a score. */
  blocked: number | null;
  metrics: { sharpness: number; meanLuma: number; darkShare: number; coverage: number };
}

export function isDebris(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  return r - b > THRESHOLDS.debrisRB && sat > THRESHOLDS.debrisSat;
}

export function analyze(img: RawImage, roi: Roi = defaultRoi(img)): Analysis {
  const T = THRESHOLDS;
  const luma = lumaPlane(img);
  const lap = laplacian(luma, img.width, roi);
  let lumaSum = 0, dark = 0, debris = 0, n = 0;
  for (let y = roi.y; y < roi.y + roi.h; y++)
    for (let x = roi.x; x < roi.x + roi.w; x++) {
      const i = (y * img.width + x) * 4, d = img.data;
      lumaSum += lumaAt(d, i);
      if (Math.min(d[i], d[i + 1], d[i + 2]) < T.darkChannel) dark++;
      if (isDebris(d[i], d[i + 1], d[i + 2])) debris++;
      n++;
    }
  // Coverage: ROI tiles with debris colour or mesh edges.
  let tiles = 0, screenTiles = 0;
  for (let ty = roi.y; ty + T.tile <= roi.y + roi.h; ty += T.tile)
    for (let tx = roi.x; tx + T.tile <= roi.x + roi.w; tx += T.tile) {
      tiles++;
      let deb = 0;
      for (let y = ty; y < ty + T.tile; y++)
        for (let x = tx; x < tx + T.tile; x++) {
          const i = (y * img.width + x) * 4;
          if (isDebris(img.data[i], img.data[i + 1], img.data[i + 2])) deb++;
        }
      if (deb > (T.tile * T.tile) / 2 || lap.absMean(tx, ty, T.tile, T.tile) > T.tileEdge) screenTiles++;
    }
  const metrics = {
    sharpness: lap.variance,
    meanLuma: lumaSum / n,
    darkShare: dark / n,
    coverage: tiles ? screenTiles / tiles : 0,
  };
  const checks: Check[] = [
    check('blur', metrics.sharpness >= T.minSharpness, `Laplacian variance ${metrics.sharpness.toFixed(0)} (need >= ${T.minSharpness})`, true),
    check('exposure', metrics.meanLuma >= T.minMeanLuma && metrics.meanLuma <= T.maxMeanLuma,
      `Mean brightness ${metrics.meanLuma.toFixed(0)} (need ${T.minMeanLuma} to ${T.maxMeanLuma})`, true),
    check('haze', metrics.darkShare >= T.minDarkShare, `Dark pixel share ${(metrics.darkShare * 100).toFixed(0)}% (need >= ${T.minDarkShare * 100}%)`, true),
    check('coverage', metrics.coverage >= T.minCoverage, `Screen fills ${(metrics.coverage * 100).toFixed(0)}% of the frame area (need >= ${T.minCoverage * 100}%)`, true),
  ];
  const retake = checks.some((c) => !c.pass);
  return { checks, retake, blocked: retake ? null : debris / n, metrics };
}
