/* Minimal ZIP reader (STORE + DEFLATE) built on node:zlib.
   Enough for two jobs: extracting native libraries from jars and reading
   mod metadata (fabric.mod.json / mcmod.info / mods.toml) — without pulling
   in a single npm dependency. */

import { inflateRawSync } from 'node:zlib';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { ensureDir } from './util.js';

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;
const LOC_SIG = 0x04034b50;

/** Parse the central directory of a zip Buffer → entry list. */
export function listEntries(buf) {
  // EOCD is within the last 65557 bytes (comment can be up to 64 KiB).
  const start = Math.max(0, buf.length - 65557);
  let eocd = -1;
  for (let i = buf.length - 22; i >= start; i--) {
    if (buf.readUInt32LE(i) === EOCD_SIG) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('not a zip file (no end-of-central-directory)');

  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(off) !== CEN_SIG) throw new Error('corrupt zip: bad central directory entry');
    const method = buf.readUInt16LE(off + 10);
    const crc = buf.readUInt32LE(off + 16);
    const compSize = buf.readUInt32LE(off + 20);
    const size = buf.readUInt32LE(off + 24);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOffset = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen);
    entries.push({ name, method, crc, compSize, size, localOffset, isDir: name.endsWith('/') });
    off += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/** Decompress one entry to a Buffer. */
export function readEntry(buf, entry) {
  const off = entry.localOffset;
  if (buf.readUInt32LE(off) !== LOC_SIG) throw new Error(`corrupt zip: bad local header for ${entry.name}`);
  // Local header name/extra lengths can differ from the central directory's.
  const nameLen = buf.readUInt16LE(off + 26);
  const extraLen = buf.readUInt16LE(off + 28);
  const dataStart = off + 30 + nameLen + extraLen;
  const raw = buf.subarray(dataStart, dataStart + entry.compSize);
  if (entry.method === 0) return Buffer.from(raw);
  if (entry.method === 8) return inflateRawSync(raw);
  throw new Error(`unsupported zip compression method ${entry.method} for ${entry.name}`);
}

/** Read a single named file from a zip on disk (null if missing). */
export async function readZipFile(zipPath, innerName) {
  const buf = await fsp.readFile(zipPath);
  const entry = listEntries(buf).find((e) => e.name === innerName);
  return entry ? readEntry(buf, entry) : null;
}

/**
 * Extract entries matching `filter(name)` into destDir.
 * Rejects entries that would escape destDir (zip-slip protection).
 */
export async function extractZip(zipPath, destDir, filter = () => true) {
  const buf = await fsp.readFile(zipPath);
  const out = [];
  for (const entry of listEntries(buf)) {
    if (entry.isDir || !filter(entry.name)) continue;
    const dest = path.join(destDir, entry.name);
    const rel = path.relative(destDir, dest);
    if (rel.startsWith('..') || path.isAbsolute(rel)) continue; // zip-slip
    await ensureDir(path.dirname(dest));
    await fsp.writeFile(dest, readEntry(buf, entry));
    out.push(entry.name);
  }
  return out;
}
