# Design: mussel-memory

- `src/image.ts`: `RawImage`, luma, Laplacian variance, percentiles.
- `src/analyze.ts`: `analyze(img, opts)` returns `{checks, blockedPct | null, retake}`. Thresholds in `THRESHOLDS`.
- `src/triage.ts`: `riskFor`, `toDecision` mapping to skeleton `Decision`.
- `src/synth.ts`: seeded generator (mulberry32) painting mesh, water, debris cells, with known blocked fraction, plus blur/dark/haze degradations.
- `src/png.ts`: minimal PNG encoder using node zlib (script only).
- `scripts/generate.ts` (run via `npm run gen:mussel`): writes `mussel-memory/samples/*.png` and `manifest.json`.
- `src/main.ts`, `index.html`: browser UI, decodes file to canvas ImageData.

ROI is the central 80% of the frame. Debris = warm, saturated pixels (r > b+20, saturation > 0.25) with local texture; mesh = pale steel; water = dark teal.
