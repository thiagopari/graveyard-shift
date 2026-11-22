# Design: skeleton

Modules in `skeleton/src`:
- `evidence.ts`: `Evidence`, `makeEvidence` (validates).
- `checks.ts`: `Check {id, pass, reason, blocking?}`, `check()` helper.
- `triage.ts`: `Decision {id, title, summary, risk (0..1), checks, evidence}`, `triage(d)` returns `Level`. Score = risk + 0.2 x failed checks. >=0.6 Needs you, >=0.25 Watch, else Fine. Failed blocking check forces Needs you. Monotone by construction.
- `report.ts`: `toMarkdown(cards)`.
- `inbox.ts`: `buildCards` (sorting, pure) and `renderInbox` (DOM, textContent only, no innerHTML).
- `app.ts`: `AppConfig`, `Adapter`, `runAdapters`.
- `theme.css`: night-shift styles.
- `scripts/new-app.mjs`: scaffolds from a template; validates name.

Testing: unit tests plus a fast-check property that worse evidence never lowers level.
