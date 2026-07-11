/* Minimal ZIP reader (STORE + DEFLATE) built on node:zlib.
   Enough for two jobs: extracting native libraries from jars and reading
   mod metadata (fabric.mod.json / mcmod.info / mods.toml) — without pulling
   in a single npm dependency. */

import { inflateRawSync, deflateRawSync } from 'node:zlib';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { ensureDir } from './util.js';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Build a valid zip Buffer from { "path": Buffer|string } (deflate). */
export function writeZip(files) {
  const local = [];
  const central = [];
  let offset = 0;
  const names = Object.keys(files);
  for (const name of names) {
    const raw = Buffer.isBuffer(files[name]) ? files[name] : Buffer.from(files[name], 'utf8');
    const comp = deflateRawSync(raw);
    const nameBuf = Buffer.from(name, 'utf8');
    const crc = crc32(raw);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(8, 8); lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26); lh.writeUInt16LE(0, 28);
    local.push(lh, nameBuf, comp);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6);
    ch.writeUInt16LE(0, 8); ch.writeUInt16LE(8, 10); ch.writeUInt16LE(0, 12); ch.writeUInt16LE(0, 14);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(raw.length, 24);
    ch.writeUInt16LE(nameBuf.length, 28); ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32);
    ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36); ch.writeUInt32LE(0, 38); ch.writeUInt32LE(offset, 42);
    central.push(ch, nameBuf);
    offset += lh.length + nameBuf.length + comp.length;
  }
  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(0, 4); eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(names.length, 8); eocd.writeUInt16LE(names.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12); eocd.writeUInt32LE(offset, 16); eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...local, centralBuf, eocd]);
}

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
