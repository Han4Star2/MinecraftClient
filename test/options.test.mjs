/* options.txt patcher + shader/resourcepack folder manager — the pieces
   that let launcher settings reach the actual game files. */

import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fsp } from 'node:fs';

import {
  patchOptions, readOptions, videoEntriesFromSettings, setPackOrder, getPackOrder,
} from '../server/options.js';

test('patchOptions: creates the file and preserves foreign keys on re-patch', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'horus-opts-'));
  await patchOptions(dir, { renderDistance: 8, enableVsync: false });

  // hand-edit like the game (or the player) would
  const file = path.join(dir, 'options.txt');
  await fsp.appendFile(file, 'lang:de_de\nkey_key.jump:key.keyboard.space\n');

  await patchOptions(dir, { renderDistance: 16, gamma: '0.80' });
  const opts = await readOptions(dir);
  assert.equal(opts.get('renderDistance'), '16');       // updated in place
  assert.equal(opts.get('enableVsync'), 'false');       // untouched
  assert.equal(opts.get('gamma'), '0.80');              // appended
  assert.equal(opts.get('lang'), 'de_de');              // foreign keys survive
  assert.equal(opts.get('key_key.jump'), 'key.keyboard.space');
  const raw = await fsp.readFile(file, 'utf8');
  assert.equal((raw.match(/renderDistance:/g) || []).length, 1, 'no duplicate keys');
});

test('videoEntriesFromSettings: leave-sentinels write nothing', () => {
  const none = videoEntriesFromSettings({
    renderDistance: 0, simulationDistance: 0, guiScale: 'leave',
    brightness: -1, mouseSensitivity: -1, masterVolume: -1, fpsCap: 0, particles: 'leave',
  });
  assert.deepEqual(none, {});

  const all = videoEntriesFromSettings({
    renderDistance: 12, simulationDistance: 8, guiScale: 'auto', brightness: 100,
    mouseSensitivity: 50, masterVolume: 80, fpsCap: 144, vsync: true, fullscreen: false, particles: 'minimal',
  });
  assert.equal(all.renderDistance, 12);
  assert.equal(all.simulationDistance, 8);
  assert.equal(all.guiScale, 0);
  assert.equal(all.gamma, '1.00');
  assert.equal(all.mouseSensitivity, '0.50');
  assert.equal(all.soundCategory_master, '0.80');
  assert.equal(all.maxFps, 144);
  assert.equal(all.enableVsync, true);
  assert.equal(all.fullscreen, false);
  assert.equal(all.particles, 2);
});

test('pack order round-trip: UI priority list ⇄ vanilla resourcePacks line', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'horus-packs-'));
  await setPackOrder(dir, ['top.zip', 'middle.zip', 'base.zip']);
  const opts = await readOptions(dir);
  // vanilla wants lowest priority first, built-in pack at the bottom
  assert.equal(opts.get('resourcePacks'), '["vanilla","file/base.zip","file/middle.zip","file/top.zip"]');
  assert.deepEqual(await getPackOrder(dir), ['top.zip', 'middle.zip', 'base.zip']);
});

test('folder manager: list/toggle/delete on shaderpacks + resourcepacks', async () => {
  const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'horus-folders-'));
  process.env.HORUS_DATA = tmp;
  const { initStore, upsertProfile } = await import('../server/store.js');
  const { listFolder, toggleFolderItem, deleteFolderItem } = await import('../server/folders.js');
  await initStore({ portable: false, data: tmp });
  const profile = await upsertProfile('p-t', { id: 'p-t', name: 'T', version: '1.21.5', loader: 'fabric' });

  const { dir } = await listFolder(profile, 'shaderpacks');
  await fsp.writeFile(path.join(dir, 'BSL_v8.zip'), 'x');
  await fsp.writeFile(path.join(dir, 'notes.txt'), 'ignored');
  await fsp.mkdir(path.join(dir, 'UnpackedShader'));

  let { items } = await listFolder(profile, 'shaderpacks');
  assert.deepEqual(items.map((i) => i.name).sort(), ['BSL_v8', 'UnpackedShader']);
  assert.ok(items.every((i) => i.enabled));

  const toggled = await toggleFolderItem(profile, 'shaderpacks', 'BSL_v8.zip');
  assert.equal(toggled.enabled, false);
  assert.equal(toggled.file, 'BSL_v8.zip.disabled');
  ({ items } = await listFolder(profile, 'shaderpacks'));
  assert.equal(items.find((i) => i.name === 'BSL_v8').enabled, false);

  await deleteFolderItem(profile, 'shaderpacks', 'BSL_v8.zip.disabled');
  ({ items } = await listFolder(profile, 'shaderpacks'));
  assert.deepEqual(items.map((i) => i.name), ['UnpackedShader']);

  // resourcepacks list carries the options.txt order index
  const rp = await listFolder(profile, 'resourcepacks');
  await fsp.writeFile(path.join(rp.dir, 'PackA.zip'), 'a');
  await fsp.writeFile(path.join(rp.dir, 'PackB.zip'), 'b');
  const { setPackOrder: spo } = await import('../server/options.js');
  const { profileGameDir } = await import('../server/store.js');
  await spo(profileGameDir(profile), ['PackB.zip', 'PackA.zip']);
  const listed = await listFolder(profile, 'resourcepacks');
  assert.equal(listed.items.find((i) => i.file === 'PackB.zip').orderIndex, 0);
  assert.equal(listed.items.find((i) => i.file === 'PackA.zip').orderIndex, 1);
});
