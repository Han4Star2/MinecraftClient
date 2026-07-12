/* NBT reader + schematic parser — verified against a hand-built,
   spec-correct Sponge .schem fixture (gzip'd NBT with varint block data). */

import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { promises as fsp } from 'node:fs';

import { parseNbt } from '../server/nbt.js';

/* ------------------------------------------------- tiny NBT writer (test) */

const w = {
  byte: (v) => { const b = Buffer.alloc(1); b.writeInt8(v); return b; },
  short: (v) => { const b = Buffer.alloc(2); b.writeInt16BE(v); return b; },
  int: (v) => { const b = Buffer.alloc(4); b.writeInt32BE(v); return b; },
  str: (s) => Buffer.concat([w.short(Buffer.byteLength(s)), Buffer.from(s, 'utf8')]),
  tag: (type, name, payload) => Buffer.concat([w.byte(type), w.str(name), payload]),
};

/** 2×1×2 structure: 3 stone, 1 air. Palette {air:0, stone:1}. */
function buildSchem() {
  const palette = Buffer.concat([
    w.tag(3, 'minecraft:air', w.int(0)),
    w.tag(3, 'minecraft:stone', w.int(1)),
    w.byte(0), // TAG_End of palette compound
  ]);
  const blockData = Buffer.from([1, 0, 1, 1]); // varints, all < 128
  const root = Buffer.concat([
    w.byte(10), w.str(''), // root compound
    w.tag(2, 'Width', w.short(2)),
    w.tag(2, 'Height', w.short(1)),
    w.tag(2, 'Length', w.short(2)),
    w.tag(3, 'Version', w.int(2)),
    w.tag(10, 'Palette', palette),
    Buffer.concat([w.byte(7), w.str('BlockData'), w.int(blockData.length), blockData]),
    w.byte(0), // TAG_End of root
  ]);
  return zlib.gzipSync(root);
}

test('parseNbt: reads a gzip\'d compound with shorts, ints, byte arrays, nested compounds', () => {
  const { name, value } = parseNbt(buildSchem());
  assert.equal(name, '');
  assert.equal(value.Width, 2);
  assert.equal(value.Height, 1);
  assert.equal(value.Length, 2);
  assert.equal(value.Version, 2);
  assert.equal(value.Palette['minecraft:stone'], 1);
  assert.equal(value.BlockData.length, 4);
});

test('schematics: list + parse produce dimensions and a material list', async () => {
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'horus-schem-'));
  process.env.HORUS_DATA = tmp;
  const { initStore, upsertProfile } = await import('../server/store.js');
  const { listSchematics, parseSchematic } = await import('../server/schematics.js');
  await initStore({ data: tmp });
  const profile = await upsertProfile('p-s', { id: 'p-s', name: 'S', version: '1.21.5', loader: 'fabric' });

  const { dir } = await listSchematics(profile);
  await fsp.writeFile(path.join(dir, 'tower.schem'), buildSchem());
  await fsp.writeFile(path.join(dir, 'notes.txt'), 'ignored');

  const { items } = await listSchematics(profile);
  assert.deepEqual(items.map((i) => i.file), ['tower.schem']);

  const parsed = await parseSchematic(profile, 'tower.schem');
  assert.equal(parsed.width, 2);
  assert.equal(parsed.height, 1);
  assert.equal(parsed.length, 2);
  assert.equal(parsed.totalBlocks, 3, 'air is not a material');
  assert.deepEqual(parsed.materials, [{ id: 'minecraft:stone', name: 'stone', count: 3, stacks: 1 }]);
});
