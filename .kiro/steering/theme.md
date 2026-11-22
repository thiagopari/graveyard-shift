# Theme: night shift

- Dark background (#0d1117), light text (#e6edf3), WCAG AA contrast minimum.
- Level colours: Needs you = amber/red (#ff7b72), Watch = yellow (#e3b341), Fine = green (#3fb950). Never rely on colour alone: always show the level text.
- Keyboard: cards are focusable (`tabindex=0`), visible focus ring, skip link to the inbox.
- Screen readers: inbox is a labelled `section`, cards are `article` with headings, live region announces updates.
- Respect `prefers-reduced-motion`.
- Wave 3: one accent, lantern amber (#f2b24a), for headings, links, focus ring and buttons. Tokens live in `skeleton/src/theme.css`; pages add layout only.
- "Needs you" cards are tombstone-shaped (rounded top) and still show the level text.
- One flourish: drifting fog. Every animation sits inside `prefers-reduced-motion: no-preference`. `skeleton/test/theme.test.ts` enforces AA contrast and this rule.
