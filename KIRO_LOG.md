# Kiro log

## 2026-11-21 (wave 1)
- **Specs**: wrote `requirements.md` (EARS), `design.md`, `tasks.md` for `skeleton` and `mussel-memory` before any code, then implemented the tasks in order. Why: the spec fixed the triage levels, the "retake never scores" rule and the 10-point accuracy bar up front.
- **Steering** (`.kiro/steering/`): `product.md`, `tech.md`, `theme.md`. Why: keeps the stack, the three levels and the accessibility rules in every session.
- **Hook** (`.kiro/hooks/test-on-save.json`): runs `npm test` on saving .ts/.json. Why: fast feedback when tuning thresholds.
- **Agent mode with shell**: ran the synthetic suite to calibrate thresholds (blur, haze), then locked them in tests.

## 2026-11-21 (wave 2)
- **Specs**: wrote `.kiro/specs/bridge-troll/{requirements,design,tasks}.md` (EARS) before code. Why: it fixed the no-interpolation, stale-reading and monotone-priority rules up front.
- **Agent mode with shell**: verified three gauges via USGS iv/site APIs and NWS NWPS, then baked data with `npm run bake:bridge`. All kept. NWS has no stage thresholds for East Georgia (GEOV1), so discharge is used and the major threshold is shown as unknown.
- **Scaffold**: `npm run new-app bridge-troll` produced the app skeleton, then replaced with real adapters.
- **Hook**: test-on-save hook ran the suite during edits.
- **Steering**: theme and product rules applied to the new UI (skip link, live region, level text).
- **Smoke**: `npm run smoke` (playwright-core + system Chrome) loads each built page and saves `docs/screens/`.

## 2026-11-21 (wave 3, polish)
- **Specs**: added `.kiro/specs/polish/{requirements,design,tasks}.md` before touching code. Why: fixed the reduced-motion and AA rules and the Gemini audit fixes as checkable items.
- **Steering**: extended `theme.md` with the lantern-amber accent, tombstone cards and the motion rule.
- **Agent mode with shell**: measured the Essex Jct gap from the baked series (20.75 h, 2023-07-12T18:15Z to 2023-07-13T15:00Z) rather than quoting the audit, and added a contrast test that reads the real CSS tokens.
- **Smoke**: extended `npm run smoke` with mobile-width shots and checks for the new UI.

## 2026-11-21 (wave 4, pre-publish cleanup)
- **Cleanup**: removed the two banned words from README, `.kiro/steering/product.md` and `.kiro/specs/mussel-memory/requirements.md` (now "No real-site images").
- **Repo URL**: replaced the `REPO_URL` placeholder with `https://github.com/thiagopari/graveyard-shift` in `index.html`, `scripts/smoke.mjs` and the polish spec; added it to the README.
- **Retake title**: Mussel Memory retake card and evidence now show the plain file name; the `-N` counter stays only in the card id (`photoId`), so repeat uploads don't collide.
