/* The launch pipeline:
   resolve version → plan & run verified downloads → extract natives →
   build the java command → spawn & supervise the game process.
   Everything streams progress/logs to the UI via the SSE bus. */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { promises as fsp } from 'node:fs';
import * as bus from './events.js';
import { downloadAll } from './downloads.js';
import { resolveVersion, assetsBase, mavenToPath } from './meta.js';
import { pickJava } from './java.js';
import { extractZip } from './zip.js';
import { dirs, getSettings, profileGameDir, touchProfile, getProfile } from './store.js';
import { ensureDir, exists, mojangOs, mojangArch, offlineUuid, readJson, writeJson, writeFileAtomic } from './util.js';
import { getMsaSession } from './msa.js';
import { patchOptions, videoEntriesFromSettings } from './options.js';
import { tunedJvmArgs } from './core.js';

let active = null; // { profileId, child, abort, startedAt, phase }

export function launchState() {
  return active
    ? { running: true, profileId: active.profileId, phase: active.phase, pid: active.child?.pid || null }
    : { running: false };
}

export function cancelLaunch() {
  if (!active) return false;
  active.abort.abort();
  if (active.child) active.child.kill('SIGTERM');
  return true;
}

export function killGame() {
  if (!active?.child) return false;
  active.child.kill('SIGTERM');
  setTimeout(() => { try { active?.child?.kill('SIGKILL'); } catch { /* gone */ } }, 4000);
  return true;
}

/* ------------------------------------------------------------------- rules */

export function ruleAllows(rules, features = {}) {
  if (!rules || !rules.length) return true;
  let allowed = false;
  for (const rule of rules) {
    let applies = true;
    if (rule.os) {
      if (rule.os.name && rule.os.name !== mojangOs()) applies = false;
      if (rule.os.arch && rule.os.arch !== mojangArch()) applies = false;
      if (rule.os.version && !(new RegExp(rule.os.version).test(process.release?.lts || ''))) {
        // OS-version regexes target Windows 10/11 builds; treat as matching elsewhere.
        if (mojangOs() !== 'windows') applies = true;
      }
    }
    if (rule.features) {
      for (const [k, v] of Object.entries(rule.features)) {
        if ((features[k] ?? false) !== v) applies = false;
      }
    }
    if (applies) allowed = rule.action === 'allow';
  }
  return allowed;
}

/* ---------------------------------------------------------- download plan */

function libraryTasks(json) {
  const L = dirs().libraries;
  const tasks = [];
  const classpath = [];
  const nativeJars = [];

  for (const lib of json.libraries || []) {
    if (!ruleAllows(lib.rules)) continue;

    const art = lib.downloads?.artifact;
    if (art?.url) {
      const dest = path.join(L, art.path || mavenToPath(lib.name));
      tasks.push({ url: art.url, dest, sha1: art.sha1, label: lib.name });
      classpath.push(dest);
    } else if (lib.name && (lib.url || !lib.downloads)) {
      // Loader-style library: maven name + repo base URL (Fabric/Quilt).
      const rel = mavenToPath(lib.name);
      const base = (lib.url || 'https://libraries.minecraft.net/').replace(/\/+$/, '');
      const dest = path.join(L, rel);
      tasks.push({ url: `${base}/${rel}`, dest, sha1: lib.sha1, label: lib.name });
      classpath.push(dest);
    }

    // Old-style natives (≤1.18): classifier jars extracted at launch.
    if (lib.natives) {
      const key = lib.natives[mojangOs()];
      if (key) {
        const classifier = key.replace('${arch}', process.arch === 'ia32' ? '32' : '64');
        const nat = lib.downloads?.classifiers?.[classifier];
        if (nat?.url) {
          const dest = path.join(L, nat.path || `${mavenToPath(lib.name)}-${classifier}.jar`);
          tasks.push({ url: nat.url, dest, sha1: nat.sha1, label: `${lib.name} (${classifier})` });
          nativeJars.push({ dest, extractExclude: lib.extract?.exclude || ['META-INF/'] });
        }
      }
    }
  }
  return { tasks, classpath, nativeJars };
}

async function assetTasks(json, proxy) {
  const A = dirs().assets;
  const idx = json.assetIndex;
  if (!idx?.url) return { tasks: [], assetsIndexName: json.assets || 'legacy', virtual: false };

  const indexFile = path.join(A, 'indexes', `${idx.id}.json`);
  if (!(await exists(indexFile))) {
    await downloadAll([{ url: idx.url, dest: indexFile, sha1: idx.sha1, label: `asset index ${idx.id}` }], { proxy });
  }
  const index = await readJson(indexFile, { objects: {} });
  const tasks = [];
  for (const [name, obj] of Object.entries(index.objects || {})) {
    const sub = `${obj.hash.slice(0, 2)}/${obj.hash}`;
    tasks.push({
      url: `${assetsBase()}/${sub}`,
      dest: path.join(A, 'objects', obj.hash.slice(0, 2), obj.hash),
      sha1: obj.hash,
      label: `asset ${name}`,
    });
  }
  return { tasks, assetsIndexName: idx.id, virtual: !!(index.virtual || index.map_to_resources), index };
}

/** Pre-1.7.3-style assets want real files, not the hash store. */
async function materializeVirtualAssets(index, indexName) {
  const A = dirs().assets;
  const target = path.join(A, 'virtual', indexName);
  for (const [name, obj] of Object.entries(index.objects || {})) {
    const src = path.join(A, 'objects', obj.hash.slice(0, 2), obj.hash);
    const dst = path.join(target, name);
    if (await exists(dst)) continue;
    await ensureDir(path.dirname(dst));
    await fsp.copyFile(src, dst);
  }
  return target;
}

/* ------------------------------------------------------------- arguments */

function substitute(str, vars) {
  return str.replace(/\$\{([^}]+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `\${${k}}`));
}

function collectArgs(list, vars, features) {
  const out = [];
  for (const item of list || []) {
    if (typeof item === 'string') {
      out.push(substitute(item, vars));
    } else if (item && ruleAllows(item.rules, features)) {
      const vals = Array.isArray(item.value) ? item.value : [item.value];
      out.push(...vals.map((v) => substitute(v, vars)));
    }
  }
  return out;
}

export function buildCommand({ json, profile, session, paths, javaBin, settings, server }) {
  const os = mojangOs();
  const sep = os === 'windows' ? ';' : ':';
  const classpath = [...paths.classpath, paths.clientJar].join(sep);

  const wantsResolution = settings.resolution && settings.resolution !== 'auto';
  const [resW, resH] = wantsResolution ? settings.resolution.split('×').map((n) => parseInt(n, 10)) : [854, 480];
  const features = {
    is_demo_user: false,
    has_custom_resolution: !!wantsResolution,
    has_quick_plays_support: false,
    is_quick_play_singleplayer: false,
    is_quick_play_multiplayer: !!server,
    is_quick_play_realms: false,
  };

  const vars = {
    auth_player_name: session.name,
    version_name: json.id,
    game_directory: paths.gameDir,
    assets_root: dirs().assets,
    game_assets: paths.virtualAssets || dirs().assets,
    assets_index_name: paths.assetsIndexName,
    auth_uuid: session.uuid,
    auth_access_token: session.accessToken,
    auth_session: session.accessToken === '0' ? '-' : `token:${session.accessToken}:${session.uuid}`,
    clientid: 'horus',
    auth_xuid: session.xuid || '0',
    user_type: session.userType,
    version_type: `Horus ${json.type || 'release'}`,
    user_properties: '{}',
    natives_directory: paths.nativesDir,
    launcher_name: 'horus',
    launcher_version: '1.0.0',
    classpath,
    library_directory: dirs().libraries,
    classpath_separator: sep,
    resolution_width: resW || 854,
    resolution_height: resH || 480,
    quickPlayMultiplayer: server || '',
  };

  const ramMb = profile.ramMb || settings.defaultRamMb || 2048;
  const jvm = tunedJvmArgs({ ramMb, gc: settings.gc, javaMajor: json.javaVersion?.majorVersion || 17 });
  if (settings.threads > 0) jvm.push(`-XX:ActiveProcessorCount=${settings.threads}`);
  for (const extra of [settings.jvmArgs, profile.jvmArgs]) {
    if (extra) jvm.push(...extra.split(/\s+/).filter(Boolean));
  }

  if (json.arguments?.jvm) {
    jvm.push(...collectArgs(json.arguments.jvm, vars, features));
  } else {
    // Legacy versions define no JVM args — provide the classic trio.
    jvm.push(`-Djava.library.path=${paths.nativesDir}`, '-cp', classpath);
  }

  let game;
  if (json.arguments?.game) {
    game = collectArgs(json.arguments.game, vars, features);
  } else {
    game = (json.minecraftArguments || '').split(' ').filter(Boolean).map((a) => substitute(a, vars));
  }

  if (server && !game.includes('--quickPlayMultiplayer')) {
    const [host, port] = server.split(':');
    game.push('--server', host, '--port', port || '25565');
  }
  if (settings.fullscreen) game.push('--fullscreen');

  return [javaBin, ...jvm, json.mainClass, ...game];
}

/* -------------------------------------------------------------- the launch */

export async function startLaunch({ profile, server = null, dryRun = false }) {
  if (active) throw new Error('a launch is already in progress');
  const abort = new AbortController();
  active = { profileId: profile.id, child: null, abort, startedAt: Date.now(), phase: 'preparing' };

  runPipeline({ profile, server, dryRun, abort }).catch((e) => {
    bus.emit({ type: 'launch', phase: 'failed', profileId: profile.id, detail: e.message });
    bus.log(`[Horus] Launch failed: ${e.message}`, 'err');
    active = null;
  });
  return { started: true };
}

async function runPipeline({ profile, server, dryRun, abort }) {
  const settings = getSettings();
  const proxy = settings.proxy || undefined;
  const phase = (p, detail) => {
    if (active) active.phase = p;
    bus.emit({ type: 'launch', phase: p, profileId: profile.id, detail });
  };

  bus.clearBacklog();

  /* Bedrock Edition: launched through the OS protocol handler on Windows. */
  if (profile.loader === 'bedrock') {
    if (process.platform !== 'win32') {
      throw new Error('Bedrock Edition can only be launched on Windows (Microsoft Store app)');
    }
    phase('launching', 'minecraft:// protocol');
    bus.log('[Horus] Starting Bedrock Edition via the Windows protocol handler…');
    if (dryRun || process.env.HORUS_DRY_RUN === '1') {
      await writeJson(path.join(dirs().data, 'last-command.json'), { command: ['cmd', '/c', 'start', '', 'minecraft://'] });
    } else {
      spawn('cmd', ['/c', 'start', '', 'minecraft://'], { detached: true, stdio: 'ignore' }).unref();
    }
    await touchProfile(profile.id, { lastPlayed: Date.now() });
    phase('running', 'Bedrock hand-off');
    bus.log('[Horus] Bedrock launched. Version switching uses the Store-installed build — see README for multi-version setups.');
    bus.emit({ type: 'exit', code: 0 });
    active = null;
    return;
  }

  phase('preparing', `resolving ${profile.version} (${profile.loader})`);
  bus.log(`[Horus] Resolving ${profile.version} (${profile.loader})…`);

  const { json } = await resolveVersion(profile, { proxy });
  const requiredMajor = json.javaVersion?.majorVersion || 0;
  const java = await pickJava({ preferred: profile.javaPath || settings.javaPath, requiredMajor });
  bus.log(`[Horus] Java: ${java.version} (${java.path})`);

  /* plan downloads */
  const clientJar = path.join(dirs().versions, json.id, `${json.id}.jar`);
  const tasks = [];
  if (json.downloads?.client?.url) {
    tasks.push({ url: json.downloads.client.url, dest: clientJar, sha1: json.downloads.client.sha1, label: `${json.id} client` });
  } else if (!(await exists(clientJar))) {
    throw new Error(`version json for ${json.id} has no client download`);
  }
  const { tasks: libTasks, classpath, nativeJars } = libraryTasks(json);
  tasks.push(...libTasks);
  const { tasks: aTasks, assetsIndexName, virtual, index } = await assetTasks(json, proxy);
  tasks.push(...aTasks);

  phase('downloading', `${tasks.length} files`);
  const { bytes } = await downloadAll(tasks, {
    concurrency: settings.downloadConcurrency || 4,
    proxy,
    signal: abort.signal,
    onProgress: (p) => bus.emit({ type: 'progress', ...p }),
  });
  bus.log(`[Horus] Verified ${tasks.length} files (${(bytes / 1048576).toFixed(1)} MB fetched, rest cached)`);

  /* natives */
  const nativesDir = path.join(dirs().natives, json.id);
  await ensureDir(nativesDir);
  for (const nat of nativeJars) {
    await extractZip(nat.dest, nativesDir, (name) => !nat.extractExclude.some((ex) => name.startsWith(ex)));
  }
  if (nativeJars.length) bus.log(`[Horus] Extracted ${nativeJars.length} native jars`);

  /* assets → virtual layout for legacy versions */
  let virtualAssets = null;
  if (virtual && index) virtualAssets = await materializeVirtualAssets(index, assetsIndexName);

  /* session */
  const msa = settings.accountType === 'msa' ? getMsaSession() : null;
  const session = msa || {
    name: settings.accountName || 'Player',
    uuid: offlineUuid(settings.accountName || 'Player'),
    accessToken: '0',
    userType: 'legacy',
    xuid: '0',
  };
  if (!msa && settings.accountType === 'msa') {
    bus.log('[Horus] No Microsoft session — falling back to offline mode', 'err');
  }

  const gameDir = profileGameDir(profile);
  await ensureDir(gameDir);
  await ensureDir(path.join(gameDir, 'mods'));

  /* video/audio settings → options.txt (only keys the user set; "leave"
     sentinels never touch what was configured in-game) */
  if (settings.applyVideoSettings !== false) {
    try {
      const entries = videoEntriesFromSettings(settings);
      if (Object.keys(entries).length) {
        await patchOptions(gameDir, entries);
        bus.log(`[Horus] Applied ${Object.keys(entries).length} video/audio settings to options.txt`);
      }
    } catch (e) {
      bus.log(`[Horus] Could not patch options.txt: ${e.message}`, 'err');
    }
  }

  const command = buildCommand({
    json,
    profile,
    session,
    settings,
    server,
    javaBin: java.path,
    paths: { classpath, clientJar, nativesDir, assetsIndexName, gameDir, virtualAssets },
  });

  phase('launching', `java -Xmx${profile.ramMb || settings.defaultRamMb}M …`);
  bus.log(`[Horus] ${command.map((c) => (c.includes(' ') ? JSON.stringify(c) : c)).join(' ').slice(0, 900)}`);

  if (dryRun || process.env.HORUS_DRY_RUN === '1') {
    await writeJson(path.join(dirs().data, 'last-command.json'), { command, gameDir });
    bus.emit({ type: 'launch', phase: 'running', profileId: profile.id, detail: 'dry run' });
    bus.log('[Horus] Dry run: command written to last-command.json — game not started.');
    bus.emit({ type: 'exit', code: 0 });
    active = null;
    return;
  }

  const child = spawn(command[0], command.slice(1), { cwd: gameDir, env: { ...process.env } });
  if (active) active.child = child;
  const startedAt = Date.now();
  await touchProfile(profile.id, { lastPlayed: startedAt });

  phase('running');
  bus.log(`[Horus] Game started (pid ${child.pid})`);

  const pipe = (stream, tag) => {
    let buf = '';
    stream.on('data', (chunk) => {
      buf += chunk.toString('utf8');
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trimEnd();
        buf = buf.slice(nl + 1);
        if (line) bus.log(line, tag);
      }
    });
  };
  pipe(child.stdout, 'out');
  pipe(child.stderr, 'err');

  child.on('exit', async (code) => {
    bus.emit({ type: 'exit', code: code ?? 0 });
    bus.log(`[Horus] Game exited with code ${code ?? 0}`);
    if (code) {
      // Non-zero exit = crash: dump the session log next to the game files.
      try {
        const crashDir = path.join(dirs().data, 'crash-reports');
        await ensureDir(crashDir);
        const file = path.join(crashDir, `crash-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
        const lines = bus.recentLogs(600).map((l) => `[${new Date(l.t).toISOString()}] ${l.line}`);
        await writeFileAtomic(file, `Horus crash report — exit code ${code}\nprofile: ${profile.id} (${profile.version} ${profile.loader})\n\n${lines.join('\n')}\n`);
        bus.emit({ type: 'crash', code, file });
        bus.log(`[Horus] Crash report saved: ${file}`, 'err');
      } catch { /* the log stream itself already has everything */ }
    }
    const wasActive = active;
    active = null;
    if (wasActive) {
      const playMs = Date.now() - startedAt;
      const prof = getProfile(profile.id);
      if (prof) await touchProfile(profile.id, { totalPlayMs: (prof.totalPlayMs || 0) + playMs });
    }
  });
  child.on('error', (e) => {
    bus.emit({ type: 'launch', phase: 'failed', profileId: profile.id, detail: e.message });
    active = null;
  });
}
