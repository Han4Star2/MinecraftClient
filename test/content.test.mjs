/* Content platform: registry seeding, upload validation + review gating,
   install into the right folder, and update detection. In-process, offline. */

import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { buildZip } from './helpers.mjs';

const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'horus-content-'));
process.env.HORUS_DATA = tmp;

const store = await import('../server/store.js');
await store.initStore({ data: tmp });
await store.upsertProfile('p-main', { name: 'Main', version: '1.21.5', loader: 'fabric', ramMb: 2048 });

const content = await import('../server/content.js');
const { writeZip } = await import('../server/zip.js');

test('registry seeds an approved, verified catalog', async () => {
  const mods = await content.listContent({ type: 'mod' });
  assert.ok(mods.length >= 5, 'seed mods present');
  assert.ok(mods.some((m) => m.verified), 'some are verified');
  assert.ok(mods.every((m) => m.status === 'approved'));
  // sorted by popularity by default
  assert.ok(mods[0].downloads >= mods[mods.length - 1].downloads);
});

test('category + version + verified filters work', async () => {
  const perf = await content.listContent({ type: 'mod', category: 'performance' });
  assert.ok(perf.every((m) => m.category === 'performance'));
  const v189 = await content.listContent({ type: 'resourcepack', version: '1.8.9' });
  assert.ok(v189.every((r) => r.versions.includes('1.8.9')));
  const verified = await content.listContent({ type: 'shader', verified: true });
  assert.ok(verified.every((s) => s.verified));
});

test('upload validates archive + metadata and enters review queue', async () => {
  await assert.rejects(
    content.uploadContent({ type: 'mod', name: 'Bad', author: 'x' }, Buffer.from('not a zip')),
    /valid \.zip\/\.jar/,
  );
  const jar = buildZip({ 'fabric.mod.json': JSON.stringify({ schemaVersion: 1, id: 'coolmod', name: 'Cool Mod', version: '1.2.0' }) });
  const up = await content.uploadContent({ type: 'mod', author: 'tester', category: 'utility', versions: ['1.21.5'] }, jar);
  assert.equal(up.status, 'pending');
  assert.equal(up.name, 'Cool Mod', 'name read from fabric.mod.json');
  assert.equal(up.latest.version, '1.2.0');
  assert.equal((await content.pendingCount()), 1);
  // pending content is not installable
  await assert.rejects(content.installContent(up.id, 'p-main'), /approved/);
});

test('resource pack without pack.mcmeta is rejected', async () => {
  await assert.rejects(
    content.uploadContent({ type: 'resourcepack', name: 'NoMeta', author: 'x' }, buildZip({ 'foo.txt': 'hi' })),
    /pack\.mcmeta/,
  );
});

test('review → verify makes content installable; installs to mods/', async () => {
  const list = await content.listContent({ status: 'pending' });
  const id = list[0].id;
  const reviewed = await content.reviewContent(id, 'verify');
  assert.equal(reviewed.status, 'approved');
  assert.equal(reviewed.verified, true);

  const res = await content.installContent(id, 'p-main');
  assert.equal(res.dir, 'mods');
  const modsDir = path.join(store.profileGameDir(store.getProfile('p-main')), 'mods');
  const files = await fsp.readdir(modsDir);
  assert.ok(files.some((f) => f.endsWith('.jar')), 'jar landed in mods/');
});

test('resource pack installs to resourcepacks/', async () => {
  const packs = await content.listContent({ type: 'resourcepack' });
  const res = await content.installContent(packs[0].id, 'p-main');
  assert.equal(res.dir, 'resourcepacks');
  const dir = path.join(store.profileGameDir(store.getProfile('p-main')), 'resourcepacks');
  assert.ok((await fsp.readdir(dir)).length >= 1);
});

test('review gate respects contentAdmin setting', async () => {
  await store.putSettings({ contentAdmin: false });
  await assert.rejects(content.reviewContent('seed-sodium', 'unverify'), /disabled/);
  await store.putSettings({ contentAdmin: true });
});

test('update detection flags a newer uploaded version', async () => {
  // install seed-lithium (v0), then upload a newer version of that id? seeds are
  // separate; instead re-upload the community mod with a higher version.
  const jar2 = buildZip({ 'fabric.mod.json': JSON.stringify({ schemaVersion: 1, id: 'coolmod', name: 'Cool Mod', version: '2.0.0' }) });
  const up = await content.uploadContent({ type: 'mod', author: 'tester', versions: ['1.21.5'] }, jar2);
  await content.reviewContent(up.id, 'approve');
  const updates = await content.checkUpdates('p-main');
  assert.ok(updates.some((u) => u.to === '2.0.0'), 'update to 2.0.0 detected');

  const done = await content.updateAll('p-main');
  assert.ok(done.length >= 1);
  assert.equal((await content.checkUpdates('p-main')).length, 0, 'no updates after updateAll');
});

test('server pack join builds a profile and installs its bundle', async () => {
  const packs = await content.listServerPacks();
  assert.ok(packs.length >= 1);
  const r = await content.joinServerPack(packs[0].id);
  assert.match(r.profileId, /^srv-/);
  assert.ok(r.installed.length >= 1);
  assert.ok(store.getProfile(r.profileId), 'profile created');
  const rec = await content.recommendedFor(packs[0].id);
  assert.ok(Array.isArray(rec));
});

test('writeZip round-trips through the reader', async () => {
  const { listEntries, readEntry } = await import('../server/zip.js');
  const buf = writeZip({ 'a.txt': 'hello', 'b/c.json': '{"x":1}' });
  const entries = listEntries(buf);
  assert.equal(entries.length, 2);
  const a = entries.find((e) => e.name === 'a.txt');
  assert.equal(readEntry(buf, a).toString(), 'hello');
});
