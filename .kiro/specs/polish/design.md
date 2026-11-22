# Design: polish
- `skeleton/src/theme.css` holds all tokens and shared styles. Pages only add layout. Amber `--lantern` is the single accent; level colours stay as in steering.
- Tombstone: `.level-needs-you` gets a rounded-top border radius and amber/red border. Flourish: a drifting fog layer (`body::before`) with a CSS animation, wrapped in `@media (prefers-reduced-motion: no-preference)`.
- Contrast: `skeleton/test/theme.test.ts` parses `--*` custom properties from theme.css and asserts ratios with a WCAG luminance function.
- Pure helpers (`pageStep`, `gapNotes`) live in `bridge-troll/src/ui.ts` and are unit tested. The keydown handler calls `pageStep`.
- Mussel samples are imported with Vite `?url` so they ship in `dist/`. Sample load fetches the URL and goes through the same `load(file)` path.
