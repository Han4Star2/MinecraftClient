#!/usr/bin/env node
/* Quill Launcher backend — a single dependency-free Node process:
   static UI hosting + REST API + SSE + the launch pipeline.

     node server/index.js [--port 7411] [--host 127.0.0.1]
                          [--portable] [--data <dir>] [--no-open]

   Footprint stays tiny by design: no Electron, no bundler, no node_modules. */

import http from 'node:http';
import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { initStore, dirs } from './store.js';
import { handleApi } from './api.js';
import { loadPersistedSession } from './msa.js';
import { ensureDir } from './util.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.join(HERE, '..', 'app');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function parseArgs(argv) {
  const args = { port: 7411, host: '127.0.0.1', portable: false, data: '', open: true };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port') args.port = Number(argv[++i]) || args.port;
    else if (a === '--host') args.host = argv[++i] || args.host;
    else if (a === '--portable') args.portable = true;
    else if (a === '--data') args.data = argv[++i] || '';
    else if (a === '--no-open') args.open = false;
    else if (a === '--help' || a === '-h') {
      console.log('quill [--port 7411] [--host 127.0.0.1] [--portable] [--data <dir>] [--no-open]');
      process.exit(0);
    }
  }
  return args;
}

async function serveStatic(res, baseDir, relPath) {
  const safe = path.normalize(relPath).replace(/^(\.\.[/\\])+/, '');
  let file = path.join(baseDir, safe);
  if (!file.startsWith(path.resolve(baseDir))) return false;
  try {
    let st = await fsp.stat(file);
    if (st.isDirectory()) {
      file = path.join(file, 'index.html');
      st = await fsp.stat(file);
    }
    const body = await fsp.readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': 'no-cache',
    });
    res.end(body);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const dataDir = await initStore({ portable: args.portable, data: args.data });
  await loadPersistedSession();
  await ensureDir(dirs().screenshots);

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // Same-origin guard for state-changing calls (the API is localhost-only,
    // but browsers on the same machine shouldn't be able to cross-post to it).
    if (req.method !== 'GET' && url.pathname.startsWith('/api/')) {
      const origin = req.headers.origin;
      if (origin && !origin.includes(`${args.host}:${args.port}`) && !origin.includes('localhost')) {
        res.writeHead(403); res.end('{"error":"forbidden origin"}');
        return;
      }
    }

    if (await handleApi(req, res, url)) return;

    if (url.pathname.startsWith('/screenshots/')) {
      if (await serveStatic(res, dirs().screenshots, url.pathname.slice('/screenshots/'.length))) return;
    }

    if (await serveStatic(res, APP_DIR, url.pathname === '/' ? 'index.html' : url.pathname.slice(1))) return;

    // SPA fallback (hash router normally avoids this, but be forgiving).
    if (await serveStatic(res, APP_DIR, 'index.html')) return;
    res.writeHead(404); res.end('not found');
  });

  server.listen(args.port, args.host, () => {
    const addr = `http://${args.host}:${args.port}`;
    console.log('');
    console.log('  ┌───────────────────────────────────────────────┐');
    console.log('  │            Quill Launcher  v1.0.0             │');
    console.log('  │   open · feather-light · no lock-in · MIT     │');
    console.log('  └───────────────────────────────────────────────┘');
    console.log(`   UI:        ${addr}`);
    console.log(`   Data dir:  ${dataDir}`);
    console.log('');
    if (args.open && !process.env.CI && !process.env.QUILL_NO_OPEN) {
      const cmd = process.platform === 'win32' ? 'explorer'
        : process.platform === 'darwin' ? 'open' : 'xdg-open';
      try { spawn(cmd, [addr], { detached: true, stdio: 'ignore' }).unref(); } catch { /* headless */ }
    }
  });

  server.on('error', (e) => {
    console.error(`[quill] ${e.message}`);
    process.exit(1);
  });
}

main().catch((e) => {
  console.error('[quill] fatal:', e);
  process.exit(1);
});
