/* REST API — the contract between the UI and the launcher core.
   Everything returns JSON; long-running work streams over /api/events. */

import os from 'node:os';
import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { spawn } from 'node:child_process';
import { sendJson, readJsonBody, dirSizeMb, ensureDir } from './util.js';
import * as store from './store.js';
import * as events from './events.js';
import { detectJavas } from './java.js';
import { getManifest } from './meta.js';
import { startLaunch, cancelLaunch, killGame, launchState } from './launcher.js';
import { listMods, toggleMod, deleteMod, modsDir } from './mods.js';
import { searchMods, installMod } from './modrinth.js';
import { startMsa, msaStatus, signOut } from './msa.js';
import { pingServer } from './ping.js';
import { cfSearch, cfInstall } from './curseforge.js';

const VERSION = '2.0.0';

function openInFileManager(dir) {
  const cmd = process.platform === 'win32' ? 'explorer'
    : process.platform === 'darwin' ? 'open' : 'xdg-open';
  try {
    spawn(cmd, [dir], { detached: true, stdio: 'ignore' }).unref();
  } catch { /* headless — the path in the response is still useful */ }
}

/** @returns {boolean} true when the request was handled. */
export async function handleApi(req, res, url) {
  const { pathname } = url;
  if (!pathname.startsWith('/api/')) return false;
  const method = req.method || 'GET';

  try {
    /* ------------------------------------------------------------- status */
    if (method === 'GET' && pathname === '/api/status') {
      sendJson(res, 200, {
        name: 'horus',
        version: VERSION,
        os: process.platform,
        arch: process.arch,
        totalMemMb: Math.round(os.totalmem() / 1048576),
        dataDir: store.getDataDir(),
        launch: launchState(),
      });
      return true;
    }

    /* ----------------------------------------------------------- settings */
    if (pathname === '/api/settings') {
      if (method === 'GET') { sendJson(res, 200, store.getSettings()); return true; }
      if (method === 'PUT') {
        const body = await readJsonBody(req);
        sendJson(res, 200, await store.putSettings(body));
        return true;
      }
    }

    /* ------------------------------------------------------------ economy */
    if (pathname === '/api/economy') {
      if (method === 'GET') {
        // 200 with an empty object before first seed — the client treats a
        // payload without numeric `coins` as "not seeded yet".
        sendJson(res, 200, (await store.getEconomy()) || {});
        return true;
      }
      if (method === 'PUT') {
        sendJson(res, 200, await store.putEconomy(await readJsonBody(req)));
        return true;
      }
    }

    /* ----------------------------------------------------------- profiles */
    if (method === 'GET' && pathname === '/api/profiles') {
      sendJson(res, 200, store.getProfiles());
      return true;
    }
    let m = pathname.match(/^\/api\/profiles\/([^/]+)$/);
    if (m) {
      const id = decodeURIComponent(m[1]);
      if (method === 'PUT') {
        const body = await readJsonBody(req);
        sendJson(res, 200, await store.upsertProfile(id, body));
        return true;
      }
      if (method === 'DELETE') {
        await store.deleteProfile(id);
        sendJson(res, 200, { deleted: id });
        return true;
      }
    }
    m = pathname.match(/^\/api\/profiles\/([^/]+)\/open$/);
    if (m && method === 'POST') {
      const profile = store.getProfile(decodeURIComponent(m[1]));
      if (!profile) { sendJson(res, 404, { error: 'unknown profile' }); return true; }
      const dir = store.profileGameDir(profile);
      await ensureDir(dir);
      openInFileManager(dir);
      sendJson(res, 200, { path: dir });
      return true;
    }

    /* ------------------------------------------------------------- javas */
    if (method === 'GET' && pathname === '/api/javas') {
      sendJson(res, 200, { javas: await detectJavas([store.getSettings().javaPath]) });
      return true;
    }

    /* ----------------------------------------------------------- versions */
    if (method === 'GET' && pathname === '/api/versions') {
      const refresh = url.searchParams.get('refresh') === '1';
      const { versions, source, error } = await getManifest({ refresh, proxy: store.getSettings().proxy || undefined });
      sendJson(res, 200, {
        source,
        error: error || null,
        versions: versions
          .filter((v) => v.type === 'release' || url.searchParams.get('snapshots') === '1')
          .map((v) => ({ id: v.id, type: v.type })),
      });
      return true;
    }

    /* --------------------------------------------------------------- mods */
    m = pathname.match(/^\/api\/profiles\/([^/]+)\/mods$/);
    if (m && method === 'GET') {
      const profile = store.getProfile(decodeURIComponent(m[1]));
      if (!profile) { sendJson(res, 404, { error: 'unknown profile' }); return true; }
      sendJson(res, 200, { mods: await listMods(profile), dir: modsDir(profile) });
      return true;
    }
    m = pathname.match(/^\/api\/profiles\/([^/]+)\/mods\/(toggle|delete)$/);
    if (m && method === 'POST') {
      const profile = store.getProfile(decodeURIComponent(m[1]));
      if (!profile) { sendJson(res, 404, { error: 'unknown profile' }); return true; }
      const { file } = await readJsonBody(req);
      if (typeof file !== 'string' || !file) { sendJson(res, 400, { error: 'missing file' }); return true; }
      sendJson(res, 200, m[2] === 'toggle' ? await toggleMod(profile, file) : await deleteMod(profile, file));
      return true;
    }

    /* ----------------------------------------------------------- modrinth */
    if (method === 'GET' && pathname === '/api/modrinth/search') {
      sendJson(res, 200, await searchMods({
        query: url.searchParams.get('q') || '',
        version: url.searchParams.get('version') || '',
        loader: url.searchParams.get('loader') || '',
      }));
      return true;
    }
    if (method === 'POST' && pathname === '/api/modrinth/install') {
      const { projectId, profileId } = await readJsonBody(req);
      const profile = store.getProfile(profileId);
      if (!profile) { sendJson(res, 404, { error: 'unknown profile' }); return true; }
      sendJson(res, 200, await installMod({ projectId, profile }));
      return true;
    }

    /* ---------------------------------------------------------- curseforge */
    if (method === 'GET' && pathname === '/api/curseforge/search') {
      sendJson(res, 200, await cfSearch({
        query: url.searchParams.get('q') || '',
        version: url.searchParams.get('version') || '',
        loader: url.searchParams.get('loader') || '',
      }));
      return true;
    }
    if (method === 'POST' && pathname === '/api/curseforge/install') {
      const { modId, profileId } = await readJsonBody(req);
      const profile = store.getProfile(profileId);
      if (!profile) { sendJson(res, 404, { error: 'unknown profile' }); return true; }
      sendJson(res, 200, await cfInstall({ modId, profile }));
      return true;
    }

    /* ------------------------------------------------------------- launch */
    if (method === 'POST' && pathname === '/api/launch') {
      const { profileId, server, dryRun } = await readJsonBody(req);
      const profile = store.getProfile(profileId);
      if (!profile) { sendJson(res, 404, { error: 'unknown profile' }); return true; }
      sendJson(res, 200, await startLaunch({ profile, server: server || null, dryRun: !!dryRun }));
      return true;
    }
    if (method === 'POST' && pathname === '/api/launch/cancel') {
      sendJson(res, 200, { cancelled: cancelLaunch() });
      return true;
    }
    if (method === 'POST' && pathname === '/api/launch/kill') {
      sendJson(res, 200, { killed: killGame() });
      return true;
    }

    /* -------------------------------------------------------------- events */
    if (method === 'GET' && pathname === '/api/events') {
      events.addClient(req, res);
      return true;
    }

    /* --------------------------------------------------------- screenshots */
    if (method === 'GET' && pathname === '/api/screenshots') {
      const dir = store.dirs().screenshots;
      await ensureDir(dir);
      const files = await fsp.readdir(dir);
      const shots = [];
      for (const f of files) {
        if (!/\.(png|jpe?g|webp)$/i.test(f)) continue;
        const st = await fsp.stat(path.join(dir, f));
        shots.push({ file: f, size: st.size, mtime: st.mtimeMs });
      }
      shots.sort((a, b) => b.mtime - a.mtime);
      sendJson(res, 200, { screenshots: shots, dir });
      return true;
    }
    if (method === 'POST' && pathname === '/api/screenshots/open') {
      const dir = store.dirs().screenshots;
      await ensureDir(dir);
      openInFileManager(dir);
      sendJson(res, 200, { path: dir });
      return true;
    }

    /* --------------------------------------------------------------- cache */
    if (method === 'POST' && pathname === '/api/cache/clear') {
      const dir = store.dirs().cache;
      const freedMb = await dirSizeMb(dir);
      await fsp.rm(dir, { recursive: true, force: true });
      sendJson(res, 200, { freedMb });
      return true;
    }

    /* ----------------------------------------------------------------- msa */
    if (method === 'POST' && pathname === '/api/msa/start') {
      sendJson(res, 200, await startMsa());
      return true;
    }
    if (method === 'GET' && pathname === '/api/msa/status') {
      sendJson(res, 200, msaStatus());
      return true;
    }
    if (method === 'POST' && pathname === '/api/msa/signout') {
      await signOut();
      sendJson(res, 200, { signedOut: true });
      return true;
    }

    /* ------------------------------------------------------- server ping */
    if (method === 'GET' && pathname === '/api/ping') {
      const host = String(url.searchParams.get('host') || '');
      const port = Math.min(65535, Math.max(1, Number(url.searchParams.get('port')) || 25565));
      if (!/^[a-zA-Z0-9._-]{1,253}$/.test(host)) { sendJson(res, 400, { error: 'invalid host' }); return true; }
      sendJson(res, 200, await pingServer(host, port));
      return true;
    }

    /* ------------------------------------------------------------- worlds */
    if (method === 'GET' && pathname === '/api/worlds') {
      const worlds = [];
      for (const profile of store.getProfiles()) {
        const savesDir = path.join(store.profileGameDir(profile), 'saves');
        let entries = [];
        try { entries = await fsp.readdir(savesDir, { withFileTypes: true }); } catch { continue; }
        for (const e of entries) {
          if (!e.isDirectory()) continue;
          const worldPath = path.join(savesDir, e.name);
          const st = await fsp.stat(worldPath);
          let iconData = null;
          try {
            const iconBuf = await fsp.readFile(path.join(worldPath, 'icon.png'));
            if (iconBuf.length < 128 * 1024) iconData = `data:image/png;base64,${iconBuf.toString('base64')}`;
          } catch { /* no icon */ }
          worlds.push({
            profileId: profile.id,
            profileName: profile.name,
            version: profile.version,
            name: e.name,
            path: worldPath,
            mtime: st.mtimeMs,
            icon: iconData,
          });
        }
      }
      worlds.sort((a, b) => b.mtime - a.mtime);
      sendJson(res, 200, { worlds });
      return true;
    }

    /* --------------------------------------------- server API (overlays) */
    if (method === 'POST' && pathname === '/api/serverapi/overlay') {
      const body = await readJsonBody(req);
      events.emit({ type: 'overlay', payload: {
        title: String(body.title || '').slice(0, 60),
        text: String(body.text || '').slice(0, 240),
        kind: ['info', 'ok', 'err'].includes(body.kind) ? body.kind : 'info',
      } });
      sendJson(res, 200, { delivered: true });
      return true;
    }

    /* ---------------------------------------------------------------- quit */
    if (method === 'POST' && pathname === '/api/quit') {
      sendJson(res, 200, { bye: true });
      setTimeout(() => process.exit(0), 150);
      return true;
    }

    sendJson(res, 404, { error: `no such endpoint: ${method} ${pathname}` });
    return true;
  } catch (e) {
    sendJson(res, 500, { error: e.message || String(e) });
    return true;
  }
}
