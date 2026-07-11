/* API smoke test: boots the real server process on a random port with an
   isolated data dir, exercises the JSON endpoints, then shuts it down. */

import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENTRY = path.join(HERE, '..', 'server', 'index.js');

async function bootServer(t) {
  const dataDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'horus-api-'));
  const port = 17000 + Math.floor(Math.random() * 4000);
  const child = spawn(process.execPath, [ENTRY, '--port', String(port), '--no-open', '--data', dataDir], {
    env: { ...process.env, HORUS_NO_OPEN: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => { child.kill('SIGTERM'); });
  t.after(() => fsp.rm(dataDir, { recursive: true, force: true }));

  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`${base}/api/status`);
      if (res.ok) return { base, child, dataDir };
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('server did not come up');
}

test('api: status, settings, profiles, mods, static UI', async (t) => {
  const { base, dataDir } = await bootServer(t);

  /* status */
  const status = await (await fetch(`${base}/api/status`)).json();
  assert.equal(status.name, 'horus');
  assert.ok(status.totalMemMb > 0);
  assert.equal(status.launch.running, false);

  /* static UI served */
  const html = await (await fetch(`${base}/`)).text();
  assert.match(html, /Horus Launcher/);
  const css = await fetch(`${base}/css/base.css`);
  assert.equal(css.headers.get('content-type'), 'text/css; charset=utf-8');

  /* settings roundtrip + sanitization */
  let settings = await (await fetch(`${base}/api/settings`)).json();
  assert.equal(settings.accountType, 'offline');
  settings = await (await fetch(`${base}/api/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountName: 'Tester', defaultRamMb: 4096, evil: 'ignored', animations: 'not-a-bool' }),
  })).json();
  assert.equal(settings.accountName, 'Tester');
  assert.equal(settings.defaultRamMb, 4096);
  assert.equal(settings.evil, undefined);
  assert.equal(settings.animations, true, 'wrong-typed value rejected');

  /* profiles CRUD */
  let profiles = await (await fetch(`${base}/api/profiles`)).json();
  const before = profiles.length;
  await fetch(`${base}/api/profiles/p-test`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'API Test', version: '1.8.9', loader: 'vanilla', ramMb: 1536 }),
  });
  profiles = await (await fetch(`${base}/api/profiles`)).json();
  assert.equal(profiles.length, before + 1);
  const created = profiles.find((p) => p.id === 'p-test');
  assert.equal(created.name, 'API Test');

  /* per-profile mods folder: create a fake jar, list, toggle, delete */
  const modsDir = path.join(dataDir, 'profiles', 'p-test', 'mods');
  await fsp.mkdir(modsDir, { recursive: true });
  await fsp.writeFile(path.join(modsDir, 'example.jar'), 'not really a jar');
  let mods = (await (await fetch(`${base}/api/profiles/p-test/mods`)).json()).mods;
  assert.equal(mods.length, 1);
  assert.equal(mods[0].enabled, true);

  const toggled = await (await fetch(`${base}/api/profiles/p-test/mods/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: 'example.jar' }),
  })).json();
  assert.equal(toggled.enabled, false);
  assert.equal(toggled.file, 'example.jar.disabled');
  await fsp.access(path.join(modsDir, 'example.jar.disabled'));

  await fetch(`${base}/api/profiles/p-test/mods/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: 'example.jar.disabled' }),
  });
  mods = (await (await fetch(`${base}/api/profiles/p-test/mods`)).json()).mods;
  assert.equal(mods.length, 0);

  /* delete profile */
  await fetch(`${base}/api/profiles/p-test`, { method: 'DELETE' });
  profiles = await (await fetch(`${base}/api/profiles`)).json();
  assert.equal(profiles.length, before);

  /* versions endpoint always answers (fallback list offline) */
  const versions = await (await fetch(`${base}/api/versions`)).json();
  assert.ok(Array.isArray(versions.versions));
  assert.ok(versions.versions.length > 0);
  assert.ok(['online', 'cache', 'fallback'].includes(versions.source));

  /* unknown endpoint */
  const nope = await fetch(`${base}/api/nope`);
  assert.equal(nope.status, 404);

  /* economy persistence roundtrip */
  const empty = await (await fetch(`${base}/api/economy`)).json();
  assert.equal(empty.coins, undefined, 'no economy until the client seeds one');
  const eco = { coins: 750, owned: ['cape-solid-crimson'], plusUntil: 0, daily: { last: '', streak: 0 }, quests: {}, minigame: { date: '', earned: 0, best: {} }, customCapes: [] };
  const putRes = await fetch(`${base}/api/economy`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eco),
  });
  assert.equal(putRes.status, 200);
  const echoed = await (await fetch(`${base}/api/economy`)).json();
  assert.equal(echoed.coins, 750);
  assert.deepEqual(echoed.owned, ['cape-solid-crimson']);
  const bad = await fetch(`${base}/api/economy`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coins: 'lots' }),
  });
  assert.equal(bad.status, 500, 'invalid economy payload rejected');

  /* worlds endpoint answers (empty is fine) */
  const worlds = await (await fetch(`${base}/api/worlds`)).json();
  assert.ok(Array.isArray(worlds.worlds));

  /* curseforge without key → helpful error */
  const cf = await (await fetch(`${base}/api/curseforge/search?q=jei`)).json();
  assert.match(cf.error || '', /API key/);
});
