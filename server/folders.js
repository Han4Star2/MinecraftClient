/* Per-profile content folders beyond mods/: shaderpacks/ and resourcepacks/.
   Same conventions as the jar manager — enable/disable is a plain
   `.disabled` rename any launcher (or hand) understands, files stay
   standard zips in the standard folders. */

import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { profileGameDir } from './store.js';
import { ensureDir } from './util.js';
import { getPackOrder } from './options.js';

export const FOLDER_KINDS = { shaderpacks: 'shaderpacks', resourcepacks: 'resourcepacks' };

export function contentDir(profile, kind) {
  if (!FOLDER_KINDS[kind]) throw new Error(`unknown folder kind: ${kind}`);
  return path.join(profileGameDir(profile), FOLDER_KINDS[kind]);
}

function safeJoin(dir, file) {
  const p = path.join(dir, path.basename(file));
  if (!p.startsWith(dir)) throw new Error('invalid file name');
  return p;
}

export async function listFolder(profile, kind) {
  const dir = contentDir(profile, kind);
  await ensureDir(dir);
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const items = [];
  for (const e of entries) {
    const disabled = e.name.endsWith('.disabled');
    const base = disabled ? e.name.slice(0, -'.disabled'.length) : e.name;
    if (!e.isDirectory() && !/\.zip$/i.test(base)) continue;
    const st = await fsp.stat(path.join(dir, e.name));
    items.push({
      file: e.name,
      name: base.replace(/\.zip$/i, ''),
      enabled: !disabled,
      isDir: e.isDirectory(),
      size: e.isDirectory() ? 0 : st.size,
    });
  }
  items.sort((a, b) => a.name.localeCompare(b.name));
  if (kind === 'resourcepacks') {
    // Attach the active load order (index 0 = highest priority) from options.txt.
    const order = await getPackOrder(profileGameDir(profile));
    for (const it of items) it.orderIndex = order.indexOf(it.file);
  }
  return { items, dir };
}

export async function toggleFolderItem(profile, kind, file) {
  const dir = contentDir(profile, kind);
  const from = safeJoin(dir, file);
  const to = file.endsWith('.disabled') ? from.slice(0, -'.disabled'.length) : `${from}.disabled`;
  await fsp.rename(from, to);
  return { file: path.basename(to), enabled: !to.endsWith('.disabled') };
}

export async function deleteFolderItem(profile, kind, file) {
  const target = safeJoin(contentDir(profile, kind), file);
  await fsp.rm(target, { recursive: true });
  return { deleted: path.basename(file) };
}
