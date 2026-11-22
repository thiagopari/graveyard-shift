#!/usr/bin/env node
import { cpSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const name = process.argv[2];
if (!name || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
  console.error('Usage: npm run new-app <name>   (lowercase kebab-case, e.g. river-watch)');
  process.exit(1);
}
const dest = join(root, name);
if (existsSync(dest)) {
  console.error(`Refusing: ${name}/ already exists.`);
  process.exit(1);
}
const title = name.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
cpSync(join(root, 'scripts/templates/app'), dest, { recursive: true });
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else writeFileSync(p, readFileSync(p, 'utf8').replaceAll('__NAME__', name).replaceAll('__TITLE__', title));
  }
})(dest);
console.log(`Created ${name}/ . Edit ${name}/src/config.ts, then: npm test && npm run build`);
