/** Plain RGBA buffer. Same shape as a browser ImageData, so Node tests need no canvas. */
export interface RawImage {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
}

export interface Roi {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Central 80% of the frame. The operator is asked to frame the screen inside it. */
export function defaultRoi(img: RawImage): Roi {
  const x = Math.round(img.width * 0.1);
  const y = Math.round(img.height * 0.1);
  return { x, y, w: img.width - 2 * x, h: img.height - 2 * y };
}

export function lumaAt(d: ArrayLike<number>, i: number): number {
  return 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
}

export function lumaPlane(img: RawImage): Float32Array {
  const out = new Float32Array(img.width * img.height);
  for (let p = 0; p < out.length; p++) out[p] = lumaAt(img.data, p * 4);
  return out;
}

/** Variance of the 4-neighbour Laplacian of luma inside the ROI. Low means blurry. */
export function laplacian(luma: Float32Array, width: number, roi: Roi): { variance: number; absMean: (x: number, y: number, w: number, h: number) => number } {
  const lap = (x: number, y: number) =>
    luma[(y - 1) * width + x] + luma[(y + 1) * width + x] + luma[y * width + x - 1] + luma[y * width + x + 1] - 4 * luma[y * width + x];
  let n = 0, sum = 0, sumSq = 0;
  for (let y = roi.y + 1; y < roi.y + roi.h - 1; y++)
    for (let x = roi.x + 1; x < roi.x + roi.w - 1; x++) {
      const v = lap(x, y);
      sum += v; sumSq += v * v; n++;
    }
  const mean = sum / n;
  return {
    variance: sumSq / n - mean * mean,
    absMean: (x0, y0, w, h) => {
      let s = 0, c = 0;
      for (let y = Math.max(1, y0); y < Math.min(y0 + h, luma.length / width - 1); y++)
        for (let x = Math.max(1, x0); x < Math.min(x0 + w, width - 1); x++) { s += Math.abs(lap(x, y)); c++; }
      return c ? s / c : 0;
    },
  };
}
