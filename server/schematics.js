/* Schematics — parse real .schem (Sponge v1-v3, the WorldEdit/Litematica-
   export standard) and legacy .schematic (MCEdit) files from the profile's
   schematics/ folder, and turn them into what a builder actually needs:
   dimensions, total blocks and a material list ("what do I need to farm"). */

import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { parseNbt } from './nbt.js';
import { profileGameDir } from './store.js';
import { ensureDir } from './util.js';

export function schematicsDir(profile) {
  return path.join(profileGameDir(profile), 'schematics');
}

export async function listSchematics(profile) {
  const dir = schematicsDir(profile);
  await ensureDir(dir);
  const files = await fsp.readdir(dir);
  const items = [];
  for (const f of files.sort()) {
    if (!/\.(schem|schematic|litematic)$/i.test(f)) continue;
    const st = await fsp.stat(path.join(dir, f));
    items.push({ file: f, size: st.size, mtime: st.mtimeMs });
  }
  return { items, dir };
}

/** varint stream → palette indices (Sponge .schem BlockData encoding). */
function decodeVarints(bytes) {
  const out = [];
  let value = 0;
  let shift = 0;
  for (const b of bytes) {
    value |= (b & 0x7f) << shift;
    if (b & 0x80) { shift += 7; continue; }
    out.push(value);
    value = 0;
    shift = 0;
  }
  return out;
}

const pretty = (id) => id
  .replace(/^minecraft:/, '')
  .replace(/\[.*$/, '') // strip block states: oak_stairs[facing=east] → oak_stairs
  .replace(/_/g, ' ');

export async function parseSchematic(profile, file) {
  const full = path.join(schematicsDir(profile), path.basename(file));
  const { value: root } = parseNbt(await fsp.readFile(full));

  // Sponge v3 nests everything under "Schematic"; v1/v2 are flat.
  const s = root.Schematic || root;

  if (s.Palette || s.Blocks?.Palette) {
    /* ------------------------------- Sponge .schem (v1/v2 flat, v3 nested) */
    const palette = s.Palette || s.Blocks.Palette;
    const data = s.BlockData || s.Blocks?.Data;
    const byIndex = [];
    for (const [id, idx] of Object.entries(palette)) byIndex[idx] = id;

    const counts = new Map();
    let total = 0;
    for (const idx of decodeVarints(data)) {
      const id = byIndex[idx] || 'unknown';
      if (id.includes('air')) continue;
      counts.set(id, (counts.get(id) || 0) + 1);
      total++;
    }
    return result(file, s.Width, s.Height, s.Length, total, counts);
  }

  if (s.Blocks && s.Width !== undefined) {
    /* -------------------------------------- legacy MCEdit .schematic (ids) */
    const counts = new Map();
    let total = 0;
    for (const id of s.Blocks) {
      const v = id & 0xff;
      if (v === 0) continue; // air
      counts.set(`block #${v}`, (counts.get(`block #${v}`) || 0) + 1);
      total++;
    }
    return result(file, s.Width, s.Height, s.Length, total, counts);
  }

  if (root.Metadata && root.Regions) {
    /* ------------------------------------------- .litematic: header only */
    const size = root.Metadata.EnclosingSize || {};
    return {
      file, format: 'litematic',
      width: size.x || 0, height: size.y || 0, length: size.z || 0,
      totalBlocks: root.Metadata.TotalBlocks || 0,
      materials: [],
      note: 'Litematica region data uses packed longs — dimensions and totals are read from the header; open in Litematica for the full material list.',
    };
  }

  throw new Error('unrecognized schematic format');
}

function result(file, width, height, length, totalBlocks, counts) {
  const materials = [...counts.entries()]
    .map(([id, count]) => ({ id, name: pretty(id), count, stacks: Math.ceil(count / 64) }))
    .sort((a, b) => b.count - a.count);
  return { file, format: 'schem', width, height, length, totalBlocks, materials };
}
