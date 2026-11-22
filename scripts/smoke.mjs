#!/usr/bin/env node
// Browser smoke: serve dist/, load each built page in headless Chrome, fail on console errors, save screenshots.
// Needs a Chrome/Chromium binary: set CHROME_PATH or install google-chrome. Run `npm run build` first.
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const shots = join(root, 'docs', 'screens');
const chrome = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find((p) => p && existsSync(p));
if (!chrome) { console.error('No Chrome/Chromium found. Set CHROME_PATH.'); process.exit(2); }
if (!existsSync(join(dist, 'index.html'))) { console.error('dist/ missing. Run npm run build.'); process.exit(2); }
mkdirSync(shots, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  let p = normalize(join(dist, decodeURIComponent(url.pathname)));
  if (!p.startsWith(dist)) { res.writeHead(403).end(); return; }
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' }).end(readFileSync(p));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
let failed = false;
const assert = (cond, msg) => { if (!cond) throw new Error(`assertion: ${msg}`); };
const pages = [
  { name: 'landing', path: '/', expect: 'h1', act: async (page) => {
      assert(await page.locator('svg[role=img]').count() === 1, 'landing diagram');
      assert(await page.locator('a[href="./mussel-memory/"]').count() > 0 && await page.locator('a[href="./bridge-troll/"]').count() > 0, 'app links');
      assert(await page.locator('a[href="https://github.com/thiagopari/graveyard-shift"]').count() > 0, 'https://github.com/thiagopari/graveyard-shift link');
    } },
  { name: 'mussel-memory', path: '/mussel-memory/', expect: '#inbox', act: async (page, mobile) => {
      assert(await page.locator('a.backlink[href="../"]').count() === 1, 'back link');
      assert(await page.locator('#prompt').isVisible(), 'upload prompt before first photo');
      await page.click('#sample');
      await page.waitForSelector('#inbox article');
      assert(await page.locator('#prompt').isHidden(), 'prompt hidden after sample');
      if (!mobile) { await page.click('#sample'); await page.waitForSelector('#inbox article:nth-of-type(2)'); }
      await page.waitForTimeout(300);
    } },
  { name: 'bridge-troll', path: '/bridge-troll/', expect: '#cards article', act: async (page) => {
      assert(await page.locator('a.backlink[href="../"]').count() === 1, 'back link');
      assert(await page.locator('#gaps li').count() >= 2, 'data gaps notes');
      await page.click('#peak');
      await page.waitForSelector('.level-needs-you');
      const before = Number(await page.inputValue('#time'));
      await page.focus('#time');
      await page.keyboard.press('PageDown');
      assert(Number(await page.inputValue('#time')) === before - 24, 'PageDown = 6 hours');
      await page.keyboard.press('PageUp');
      assert(Number(await page.inputValue('#time')) === before, 'PageUp = 6 hours');
      await page.waitForTimeout(600);
    } },
];
const sizes = [{ suffix: '', width: 1100, height: 900, mobile: false }, { suffix: '-mobile', width: 390, height: 844, mobile: true }];
for (const p of pages) for (const sz of sizes) {
  const page = await browser.newPage({ viewport: { width: sz.width, height: sz.height } });
  const problems = [];
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`); });
  try {
    await page.goto(base + p.path, { waitUntil: 'networkidle' });
    await page.waitForSelector(p.expect, { state: 'attached', timeout: 10000 });
    await p.act(page, sz.mobile);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) problems.push(`horizontal overflow ${overflow}px`);
    await page.screenshot({ path: join(shots, `${p.name}${sz.suffix}.png`), fullPage: false });
  } catch (e) { problems.push(String(e.message ?? e)); }
  console.log(`${problems.length ? 'FAIL' : 'ok  '} ${p.name}${sz.suffix} ${problems.join(' | ')}`);
  if (problems.length) failed = true;
  await page.close();
}
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
