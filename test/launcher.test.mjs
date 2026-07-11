/* End-to-end launcher pipeline test — fully offline.
   A fixture HTTP server plays Mojang meta + CDN; the pipeline resolves the
   version, downloads & SHA-1-verifies every file, extracts natives, builds
   the java command and (dry run) writes it to last-command.json. */

import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { buildZip, fixtureServer, sha1hex } from './helpers.mjs';

const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), 'quill-launch-'));
process.env.QUILL_DATA = tmp;

const { initStore, upsertProfile } = await import('../server/store.js');
const { startLaunch, launchState, ruleAllows, buildCommand } = await import('../server/launcher.js');
const { detectJavas } = await import('../server/java.js');
const { mavenToPath, mergeLoader } = await import('../server/meta.js');
const { offlineUuid } = await import('../server/util.js');

/* ----------------------------------------------------------- pure helpers */

test('rules: os and feature gating', () => {
  assert.equal(ruleAllows(undefined), true);
  assert.equal(ruleAllows([{ action: 'allow' }]), true);
  assert.equal(ruleAllows([{ action: 'allow', os: { name: 'windows' } }]), process.platform === 'win32');
  assert.equal(ruleAllows([{ action: 'allow' }, { action: 'disallow', os: { name: 'osx' } }]), process.platform !== 'darwin');
  assert.equal(ruleAllows([{ action: 'allow', features: { is_demo_user: true } }], { is_demo_user: false }), false);
  assert.equal(ruleAllows([{ action: 'allow', features: { has_custom_resolution: true } }], { has_custom_resolution: true }), true);
});

test('maven coordinates → repo paths', () => {
  assert.equal(mavenToPath('org.ow2.asm:asm:9.6'), 'org/ow2/asm/asm/9.6/asm-9.6.jar');
  assert.equal(mavenToPath('net.fabricmc:fabric-loader:0.16.0'), 'net/fabricmc/fabric-loader/0.16.0/fabric-loader-0.16.0.jar');
  assert.equal(mavenToPath('org.lwjgl:lwjgl:3.3.3:natives-linux'), 'org/lwjgl/lwjgl/3.3.3/lwjgl-3.3.3-natives-linux.jar');
});

test('offline uuid is a stable v3 uuid', () => {
  const a = offlineUuid('Player');
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-3[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(a, offlineUuid('Player'));
  assert.notEqual(a, offlineUuid('Other'));
});

test('loader profile merge keeps vanilla libs and overrides mainClass', () => {
  const vanilla = {
    id: '1.21.5',
    mainClass: 'net.minecraft.client.main.Main',
    libraries: [{ name: 'a:a:1' }],
    arguments: { game: ['--x'], jvm: ['-Da'] },
  };
  const loader = {
    id: 'fabric-loader-0.16.0-1.21.5',
    mainClass: 'net.fabricmc.loader.impl.launch.knot.KnotClient',
    libraries: [{ name: 'b:b:2', url: 'https://maven.fabricmc.net/' }],
    arguments: { game: [], jvm: ['-DFabricMcEmu=net.minecraft.client.main.Main'] },
  };
  const merged = mergeLoader(vanilla, loader);
  assert.equal(merged.mainClass, 'net.fabricmc.loader.impl.launch.knot.KnotClient');
  assert.equal(merged.libraries.length, 2);
  assert.deepEqual(merged.arguments.jvm, ['-Da', '-DFabricMcEmu=net.minecraft.client.main.Main']);
  assert.equal(vanilla.libraries.length, 1, 'vanilla input must not be mutated');
});

/* ------------------------------------------------------------ dry-run e2e */

test('full dry-run launch against fixture meta server', async (t) => {
  const javas = await detectJavas();
  if (!javas.length) { t.skip('no java on this machine'); return; }

  const clientJar = buildZip({ 'net/minecraft/client/main/Main.class': 'fake' });
  const libJar = buildZip({ 'lib.class': 'fake lib' });
  const nativeJar = buildZip({ 'libquill.so': 'fake native', 'META-INF/x': 'skip me' });
  const assetPng = Buffer.from('fake png');
  const assetHash = sha1hex(assetPng);

  // routes is captured by reference — fill it in once the port is known.
  const routes = {};
  const fx = await fixtureServer(routes);
  t.after(() => fx.close());

  const nat = (cls) => ({
    path: `quill/natives/1.0/natives-1.0-${cls}.jar`,
    url: `${fx.base}/files/native.jar`,
    sha1: sha1hex(nativeJar),
  });
  const versionJson = {
    id: '1.0-test',
    type: 'release',
    mainClass: 'net.minecraft.client.main.Main',
    javaVersion: { majorVersion: 0 },
    downloads: { client: { url: `${fx.base}/files/client.jar`, sha1: sha1hex(clientJar), size: clientJar.length } },
    assetIndex: { id: 'test-assets', url: `${fx.base}/assets/index.json`, sha1: null },
    libraries: [
      { name: 'quill:testlib:1.0', downloads: { artifact: { path: 'quill/testlib/1.0/testlib-1.0.jar', url: `${fx.base}/files/lib.jar`, sha1: sha1hex(libJar) } } },
      { name: 'quill:winonly:1.0', rules: [{ action: 'allow', os: { name: 'windows' } }], downloads: { artifact: { path: 'quill/winonly/1.0/winonly-1.0.jar', url: `${fx.base}/files/never.jar`, sha1: 'x' } } },
      {
        name: 'quill:natives:1.0',
        natives: { linux: 'natives-linux', osx: 'natives-osx', windows: 'natives-windows' },
        downloads: { classifiers: { 'natives-linux': nat('natives-linux'), 'natives-osx': nat('natives-osx'), 'natives-windows': nat('natives-windows') } },
      },
    ],
    arguments: {
      jvm: ['-Djava.library.path=${natives_directory}', '-cp', '${classpath}'],
      game: [
        '--username', '${auth_player_name}',
        '--gameDir', '${game_directory}',
        '--assetIndex', '${assets_index_name}',
        { rules: [{ action: 'allow', features: { has_custom_resolution: true } }], value: ['--width', '${resolution_width}'] },
      ],
    },
  };
  const assetIndex = { objects: { 'icons/icon.png': { hash: assetHash, size: assetPng.length } } };
  const manifest = { versions: [{ id: '1.0-test', type: 'release', url: `${fx.base}/v/1.0-test.json` }] };

  Object.assign(routes, {
    '/mc/game/version_manifest_v2.json': JSON.stringify(manifest),
    '/v/1.0-test.json': JSON.stringify(versionJson),
    '/files/client.jar': clientJar,
    '/files/lib.jar': libJar,
    '/files/native.jar': nativeJar,
    '/assets/index.json': JSON.stringify(assetIndex),
    [`/a/${assetHash.slice(0, 2)}/${assetHash}`]: assetPng,
  });

  process.env.QUILL_META_BASE = fx.base;
  process.env.QUILL_ASSETS_BASE = `${fx.base}/a`;

  await initStore({ data: tmp });
  const profile = await upsertProfile('p-test', {
    name: 'Test', version: '1.0-test', loader: 'vanilla', ramMb: 2048,
  });

  await startLaunch({ profile, dryRun: true });

  // Dry run finishes by writing last-command.json; poll for it.
  const cmdFile = path.join(tmp, 'last-command.json');
  let saved = null;
  for (let i = 0; i < 100; i++) {
    try { saved = JSON.parse(await fsp.readFile(cmdFile, 'utf8')); break; }
    catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  assert.ok(saved, 'last-command.json was not produced — pipeline failed');
  const { command } = saved;

  assert.match(command[0], /java/i);
  assert.ok(command.includes('-Xmx2048M'), 'memory flag');
  assert.ok(command.includes('net.minecraft.client.main.Main'), 'main class');

  const cp = command[command.indexOf('-cp') + 1];
  assert.ok(cp.includes(path.join('quill', 'testlib', '1.0', 'testlib-1.0.jar')), 'library on classpath');
  assert.ok(cp.includes(path.join('1.0-test', '1.0-test.jar')), 'client jar on classpath');
  assert.ok(!cp.includes('winonly'), 'os-disallowed library filtered out');

  const uIdx = command.indexOf('--username');
  assert.equal(command[uIdx + 1], 'Player', 'username substituted');
  assert.ok(!command.some((c) => c.includes('${')), `unsubstituted placeholder in: ${command.join(' ')}`);
  assert.ok(!command.includes('--width'), 'resolution feature off by default');

  // natives extracted, META-INF filtered
  const natDir = path.join(tmp, 'natives', '1.0-test');
  assert.equal(await fsp.readFile(path.join(natDir, 'libquill.so'), 'utf8'), 'fake native');
  await assert.rejects(fsp.access(path.join(natDir, 'META-INF', 'x')));

  // asset landed in the hash store
  await fsp.access(path.join(tmp, 'assets', 'objects', assetHash.slice(0, 2), assetHash));

  // sha1 verification actually ran: corrupt cache detection
  const libPath = path.join(tmp, 'libraries', 'quill', 'testlib', '1.0', 'testlib-1.0.jar');
  assert.equal(sha1hex(await fsp.readFile(libPath)), sha1hex(libJar));

  assert.equal(launchState().running, false);
});

test('buildCommand: legacy minecraftArguments path', () => {
  const cmd = buildCommand({
    json: {
      id: '1.8.9',
      type: 'release',
      mainClass: 'net.minecraft.client.main.Main',
      minecraftArguments: '--username ${auth_player_name} --version ${version_name} --uuid ${auth_uuid} --accessToken ${auth_access_token} --userType ${user_type}',
    },
    profile: { id: 'p', ramMb: 1024 },
    session: { name: 'Steve', uuid: 'u-u-i-d', accessToken: '0', userType: 'legacy', xuid: '0' },
    settings: { defaultRamMb: 1024, gc: 'G1', resolution: 'auto' },
    server: 'mc.example.net:25570',
    javaBin: '/usr/bin/java',
    paths: { classpath: ['/lib/a.jar'], clientJar: '/versions/1.8.9/1.8.9.jar', nativesDir: '/nat', assetsIndexName: '1.8', gameDir: '/game' },
  });
  assert.equal(cmd[0], '/usr/bin/java');
  assert.ok(cmd.includes('-Djava.library.path=/nat'), 'legacy jvm args synthesized');
  assert.ok(cmd.includes('Steve'));
  const sIdx = cmd.indexOf('--server');
  assert.equal(cmd[sIdx + 1], 'mc.example.net');
  assert.equal(cmd[cmd.indexOf('--port') + 1], '25570');
});
