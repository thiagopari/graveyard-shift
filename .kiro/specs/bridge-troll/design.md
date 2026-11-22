# Design: bridge-troll

- `scripts/bake.ts` (`npm run bake:bridge`): fetches USGS iv + site, NWS NWPS gauge, FHWA NBI VT23 delimited file. Writes `data/usgs-<id>.json`, `data/usgs-sites.json`, `data/nws-flood-categories.json`, `data/nbi-vt-bridges.json`, `data/dropped.json`, `data/sources.json`. Raw responses are parsed, never edited. Times are stored as UTC ISO strings.
- `src/model.ts`: types and `loadData()` over the baked JSON (imported by Vite).
- `src/gauge.ts`: `readingAt(series, t)` returns the latest observation at or before `t` (or null) plus age; `categoryOf(value, thresholds)` returns 0 (below action), 1 action, 2 minor, 3 moderate, 4 major, using only known thresholds.
- `src/risk.ts`: `bridgeRisk(bridge, category)` is pure and monotone in category. `hydro = [0, .15, .3, .5, .7][category]`; `vuln = 1 + .5*scourCritical + .5*poorSubstructure`; `risk = min(1, hydro * vuln)`. Scour critical = item 113 in 0..3. Poor substructure = rating <= 4. Both vulnerability checks only fail once the category is minor or higher (so they never fire at low water, and never un-fire as stage rises).
- `src/decide.ts`: `decideBridge(data, bridge, t)` builds a skeleton `Decision` with checks (`gauge-reading` blocking, `scour`, `substructure`) and evidence (USGS reading, NWS category, NBI record). `decideAll` runs one adapter over all bridges.
- `src/config.ts`: the app config, one adapter, input is the slider time.
- `src/main.ts`, `index.html`: slider, gauge strip, inbox, export, footer, live region.

Triage thresholds come from the skeleton (`NEEDS_YOU_AT` .6, `WATCH_AT` .25, `FAIL_WEIGHT` .2). Bridges with no usable reading show Needs you with no number, matching the "retake, never score" rule.

Why monotone: `triage` is monotone in risk and in the count of failed checks. Risk is monotone in category, and category is monotone in the gauge value. Check failures are monotone in category. So priority never falls as the value rises.

Assignment: Winooski bridges go to the nearer of the kept Winooski gauges, Lamoille bridges to the Lamoille gauge. Straight-line distance, not hydraulic routing; that is a stated limit.
