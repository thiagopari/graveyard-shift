# Graveyard Shift

Kiroween 2026, Skeleton Crew category. Built with Kiro (specs, steering, hook). One small skeleton library with four bones (Evidence, Checks, Triage, Inbox) powers night-shift triage apps. Static TypeScript + Vite, no server, GitHub Pages friendly.

Source: https://github.com/thiagopari/graveyard-shift

| Dir | What |
|---|---|
| `skeleton/` | The four bones, Markdown report export, dark accessible inbox UI |
| `mussel-memory/` | Water-intake screen triage from photos, scored in the browser canvas. Blur, exposure, haze and coverage checks; a bad photo gets "retake", never a score |
| `bridge-troll/` | Wave 2: Vermont July 2023 flood replay (USGS + NWS + NBI, 47 bridges) |

All data is synthetic or public. No real-site images.

## Use
```
npm install
npm test                  # vitest + fast-check
npm run build             # typecheck + one dist/ (landing + both apps) for GitHub Pages
npm run smoke             # headless Chrome load of dist/, fails on console errors, writes docs/screens/
npm run bake:bridge       # re-fetch USGS, NWS and NBI data into bridge-troll/data
npm run dev:mussel        # local dev server
npm run gen:mussel        # regenerate the 30 synthetic images in mussel-memory/samples
npm run new-app my-app    # scaffold a new app (config + adapters)
```

An app is a config plus adapters: adapters turn input into `Decision`s, the skeleton triages them (Needs you / Watch / Fine) and renders cards that cite evidence.

## Kiro
Specs in `.kiro/specs/`, steering in `.kiro/steering/`, a test-on-save hook in `.kiro/hooks/`. See `KIRO_LOG.md`.

## How Kiro built this
- **Specs first.** Each app has `requirements.md` (EARS), `design.md` and `tasks.md` in `.kiro/specs/` (skeleton, mussel-memory, bridge-troll). The Bridge Troll spec fixed rules before code: no invented or interpolated data, a reading older than 6 h blocks scoring, and a higher stage never lowers priority. Those three became tests.
- **Steering.** `.kiro/steering/{product,tech,theme}.md` load in every session: the three levels, the "retake, never score" rule, the Vite/Vitest stack, and the dark, keyboard and screen-reader rules. New apps came out on-theme without re-explaining.
- **Hook.** `.kiro/hooks/test-on-save.json` runs `npm test` when a .ts or .json file is saved, which gave quick feedback while tuning thresholds and baking data.
- **Agent with a shell.** Kiro verified gauges against the USGS and NWS APIs before keeping them, wrote the bake script, ran it, and checked results (47 bridges, 3 gauges, all sources recorded in `sources.json`). It also drove headless Chrome for the smoke test.
- **What worked.** The skeleton made a second app small: a config, one adapter and a UI. `npm run new-app` scaffolded Bridge Troll. Writing the monotone-priority property in the spec made the risk model easy to design.
- **What needed care.** Public data is messy: the NWS publishes only discharge thresholds for East Georgia and no major threshold, so the app says so instead of filling gaps. Essex Junction stage has a gap of about 21 h in the flood, which shows as "no trusted reading".

MIT licensed.
