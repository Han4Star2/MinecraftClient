/* Per-profile jar manager on the STANDARD mods folder.
   Enable/disable = rename .jar ⇄ .jar.disabled — exactly what every other
   launcher and hand-managed setup understands. Metadata is read from
   fabric.mod.json / quilt.mod.json / mcmod.info when present. */

import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { readZipFile } from './zip.js';
import { profileGameDir } from './store.js';
import { ensureDir } from './util.js';

export function modsDir(profile) {
  return path.join(profileGameDir(profile), 'mods');
}

async function readMeta(jarPath) {
  try {
    for (const name of ['fabric.mod.json', 'quilt.mod.json']) {
      const raw = await readZipFile(jarPath, name);
      if (raw) {
        const j = JSON.parse(raw.toString('utf8'));
        const meta = j.quilt_loader ? j.quilt_loader.metadata || {} : j;
        return { name: meta.name || j.id || null, version: j.version || j.quilt_loader?.version || null };
      }
    }
    const legacy = await readZipFile(jarPath, 'mcmod.info');
    if (legacy) {
      const arr = JSON.parse(legacy.toString('utf8'));
      const first = Array.isArray(arr) ? arr[0] : arr.modList?.[0];
      if (first) return { name: first.name || null, version: first.version || null };
    }
  } catch { /* unreadable metadata — fall back to file name */ }
  return { name: null, version: null };
}

export async function listMods(profile) {
  const dir = modsDir(profile);
  await ensureDir(dir);
  const files = await fsp.readdir(dir);
  const out = [];
  for (const file of files.sort()) {
    const enabled = file.endsWith('.jar');
    if (!enabled && !file.endsWith('.jar.disabled')) continue;
    const meta = await readMeta(path.join(dir, file));
    out.push({
      file,
      enabled,
      name: meta.name || file.replace(/\.jar(\.disabled)?$/, ''),
      version: meta.version,
    });
  }
  return out;
}

function safeJoin(dir, file) {
  const p = path.join(dir, path.basename(file));
  if (!p.startsWith(dir)) throw new Error('invalid file name');
  return p;
}

export async function toggleMod(profile, file) {
  const dir = modsDir(profile);
  const from = safeJoin(dir, file);
  const to = file.endsWith('.disabled') ? from.slice(0, -'.disabled'.length) : `${from}.disabled`;
  await fsp.rename(from, to);
  return { file: path.basename(to), enabled: to.endsWith('.jar') };
}

export async function deleteMod(profile, file) {
  await fsp.rm(safeJoin(modsDir(profile), file));
  return { deleted: path.basename(file) };
}
