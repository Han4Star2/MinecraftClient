#!/usr/bin/env node
/* Capture screenshots of every page with headless Chromium — used to keep
   the README pictures honest (they are the real UI, not mockups).

     node tools/screenshots.mjs [--out docs/screenshots] [--port 7419]

   Chromium is found via $CHROME, $CHROME_BIN or common binary names. */

import { spawn, execFile } from 'node:child_process';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

const PAGES = [
  ['home', 'home'],
  ['news', 'news'],
  ['library', 'library'],
  ['mods', 'mods'],
  ['hud', 'hud'],
  ['shop', 'shop'],
  ['cosmetics', 'cosmetics'],
  ['minigames', 'minigames'],
  ['social', 'social'],
  ['worlds', 'worlds'],
  ['screenshots', 'screenshots'],
  ['settings', 'settings'],
];

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : def;
}

async function findChrome() {
  const candidates = [
    process.env.CHROME,
    process.env.CHROME_BIN,
    '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell',
    'chromium',
    'chromium-browser',
    'google-chrome',
    'google-chrome-stable',
  ].filter(Boolean);
  for (const c of candidates) {
    const ok = await new Promise((r) => execFile(c, ['--version'], (e) => r(!e)));
    if (ok) return c;
  }
  throw new Error('no Chromium/Chrome found — set $CHROME');
}

async function main() {
  const out = path.resolve(arg('out', 'docs/screenshots'));
  const port = Number(arg('port', 7419));
  await fsp.mkdir(out, { recursive: true });
  const chrome = await findChrome();

  const dataDir = await fsp.mkdtemp(path.join((await import('node:os')).tmpdir(), 'horus-shots-'));
  const server = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js'), '--port', String(port), '--no-open', '--data', dataDir], {
    stdio: 'ignore',
  });
  try {
    // wait for the server
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch(`http://127.0.0.1:${port}/api/status`)).ok) break; } catch { /* boot */ }
      await new Promise((r) => setTimeout(r, 150));
    }
    for (const [route, name] of PAGES) {
      const file = path.join(out, `${name}.png`);
      await new Promise((resolve, reject) => {
        execFile(chrome, [
          '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
          '--window-size=1600,900', '--virtual-time-budget=5000',
          `--screenshot=${file}`, `http://127.0.0.1:${port}/#/${route}`,
        ], { timeout: 45_000 }, (e) => (e ? reject(e) : resolve()));
      });
      console.log(`✓ ${name}.png`);
    }
  } finally {
    server.kill('SIGTERM');
    await fsp.rm(dataDir, { recursive: true, force: true });
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
