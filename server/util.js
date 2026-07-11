/* Shared helpers: hashing, fs, JSON responses. Zero dependencies. */

import { createHash } from 'node:crypto';
import { promises as fsp } from 'node:fs';
import path from 'node:path';

export function sha1(buf) {
  return createHash('sha1').update(buf).digest('hex');
}

export function md5(buf) {
  return createHash('md5').update(buf).digest();
}

/** Offline-mode UUID, compatible with vanilla servers: UUIDv3 of "OfflinePlayer:<name>". */
export function offlineUuid(name) {
  const h = md5(Buffer.from(`OfflinePlayer:${name}`, 'utf8'));
  h[6] = (h[6] & 0x0f) | 0x30; // version 3
  h[8] = (h[8] & 0x3f) | 0x80; // variant
  const hex = h.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
  return dir;
}

/** Write atomically: tmp file + rename, so crashes never corrupt state. */
export async function writeFileAtomic(file, data) {
  await ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fsp.writeFile(tmp, data);
  await fsp.rename(tmp, file);
}

export async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await fsp.readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export async function writeJson(file, obj) {
  await writeFileAtomic(file, JSON.stringify(obj, null, 2));
}

export async function exists(file) {
  try {
    await fsp.access(file);
    return true;
  } catch {
    return false;
  }
}

export async function dirSizeMb(dir) {
  let total = 0;
  async function walk(d) {
    let entries;
    try { entries = await fsp.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile()) total += (await fsp.stat(p)).size;
    }
  }
  await walk(dir);
  return Math.round(total / 1048576);
}

/* ------------------------------------------------------------ http replies */

export function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

export function readBody(req, limit = 4 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export async function readJsonBody(req) {
  const raw = await readBody(req);
  if (!raw.length) return {};
  return JSON.parse(raw.toString('utf8'));
}

/** Current OS in Mojang rule terms. */
export function mojangOs() {
  return process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'osx' : 'linux';
}

export function mojangArch() {
  return process.arch === 'x64' ? 'x86_64' : process.arch === 'ia32' ? 'x86' : process.arch;
}
