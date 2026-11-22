# Tech

- Static TypeScript + Vite. No server. Must deploy to GitHub Pages (relative `base: './'`).
- Tests: vitest + fast-check. `npm test` runs `vitest run`. `npm run build` must pass.
- Layout: `skeleton/` (library), `mussel-memory/`, `bridge-troll/`, each app has `src/`, `test/`, `index.html`.
- An app = a config + adapters, built on `skeleton/src`. Scaffold with `npm run new-app <name>`.
- Analysis code works on plain `{width,height,data}` RGBA buffers so it runs in Node tests and in the browser canvas.
- Never gitignore `.kiro`.
