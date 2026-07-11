/* CurseForge integration. Their API requires a personal (free) API key —
   open source ships no secrets, so you paste yours in Settings → Network.
   Modrinth needs no key and stays the default source. */

import path from 'node:path';
import { fetchBuf } from './net.js';
import { downloadAll } from './downloads.js';
import { getSettings } from './store.js';
import { modsDir } from './mods.js';

const BASE = () => (process.env.HORUS_CURSEFORGE_BASE || 'https://api.curseforge.com/v1').replace(/\/+$/, '');
const GAME_MINECRAFT = 432;
const LOADER_TYPES = { forge: 1, fabric: 4, quilt: 5, neoforge: 6 };

async function cfJson(pathname) {
  const settings = getSettings();
  if (!settings.curseforgeKey) {
    throw new Error('CurseForge needs an API key — get a free one at console.curseforge.com and paste it in Settings → Network');
  }
  const res = await fetchBuf(`${BASE()}${pathname}`, {
    headers: { 'x-api-key': settings.curseforgeKey, Accept: 'application/json' },
    proxy: settings.proxy || undefined,
  });
  if (res.status === 403) throw new Error('CurseForge rejected the API key (403)');
  if (res.status !== 200) throw new Error(`CurseForge → HTTP ${res.status}`);
  return JSON.parse(res.body.toString('utf8'));
}

export async function cfSearch({ query, version, loader, limit = 10 }) {
  const loaderType = LOADER_TYPES[loader];
  const params = new URLSearchParams({
    gameId: String(GAME_MINECRAFT),
    searchFilter: query,
    pageSize: String(limit),
    sortField: '2', // popularity
    sortOrder: 'desc',
    classId: '6', // mods
  });
  if (version) params.set('gameVersion', version);
  if (loaderType) params.set('modLoaderType', String(loaderType));
  const data = await cfJson(`/mods/search?${params}`);
  return {
    hits: (data.data || []).map((m) => ({
      project_id: String(m.id),
      title: m.name,
      description: m.summary,
      downloads: m.downloadCount,
      slug: m.slug,
    })),
  };
}

export async function cfInstall({ modId, profile }) {
  const loaderType = LOADER_TYPES[profile.loader];
  const params = new URLSearchParams({ pageSize: '20' });
  if (profile.version) params.set('gameVersion', profile.version);
  if (loaderType) params.set('modLoaderType', String(loaderType));
  const data = await cfJson(`/mods/${encodeURIComponent(modId)}/files?${params}`);
  const file = (data.data || []).find((f) => f.isAvailable && f.downloadUrl);
  if (!file) {
    throw new Error('no downloadable build for this version/loader (some CurseForge projects disallow API downloads — use Modrinth or download manually)');
  }
  const dest = path.join(modsDir(profile), file.fileName);
  const sha1 = file.hashes?.find((h) => h.algo === 1)?.value;
  await downloadAll(
    [{ url: file.downloadUrl, dest, sha1, label: file.fileName }],
    { proxy: getSettings().proxy || undefined, concurrency: 1 },
  );
  return { installed: file.fileName, version: file.displayName };
}
