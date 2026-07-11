import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { buildZip } from './helpers.mjs';
import { listEntries, readEntry, extractZip, readZipFile } from '../server/zip.js';

test('zip: list + read deflated and stored entries', async () => {
  for (const store of [false, true]) {
    const zip = buildZip({
      'hello.txt': 'hello horus',
      'dir/nested.json': JSON.stringify({ ok: true }),
      'binary.bin': Buffer.from([0, 1, 2, 250, 255]),
    }, { store });

    const entries = listEntries(zip);
    assert.equal(entries.length, 3);
    const byName = Object.fromEntries(entries.map((e) => [e.name, e]));
    assert.equal(readEntry(zip, byName['hello.txt']).toString(), 'hello horus');
    assert.deepEqual(JSON.parse(readEntry(zip, byName['dir/nested.json']).toString()), { ok: true });
    assert.deepEqual([...readEntry(zip, byName['binary.bin'])], [0, 1, 2, 250, 255]);
  }
});

test('zip: extract with filter and zip-slip protection', async (t) => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'horus-zip-'));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));

  const zip = buildZip({
    'META-INF/MANIFEST.MF': 'Manifest-Version: 1.0',
    'libhorus.so': 'ELF-pretend',
    'sub/data.txt': 'data',
    '../escape.txt': 'evil',
  });
  const zipPath = path.join(dir, 'natives.jar');
  await fsp.writeFile(zipPath, zip);

  const out = path.join(dir, 'out');
  const written = await extractZip(zipPath, out, (n) => !n.startsWith('META-INF/'));
  assert.deepEqual(written.sort(), ['libhorus.so', 'sub/data.txt']);
  assert.equal(await fsp.readFile(path.join(out, 'libhorus.so'), 'utf8'), 'ELF-pretend');
  // zip-slip entry must not land outside the target directory
  await assert.rejects(fsp.access(path.join(dir, 'escape.txt')));
});

test('zip: readZipFile finds mod metadata', async (t) => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'horus-zip-'));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  const jar = path.join(dir, 'mod.jar');
  await fsp.writeFile(jar, buildZip({
    'fabric.mod.json': JSON.stringify({ id: 'sodium', name: 'Sodium', version: '0.6.0' }),
  }));
  const meta = JSON.parse((await readZipFile(jar, 'fabric.mod.json')).toString());
  assert.equal(meta.name, 'Sodium');
  assert.equal(await readZipFile(jar, 'missing.txt'), null);
});
