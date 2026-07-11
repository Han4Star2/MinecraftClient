/* Modrinth integration — the open mod ecosystem. Search and install plain
   jars into the profile's standard mods folder. Nothing proprietary: the
   same files work in any launcher. https://docs.modrinth.com/api */

import path from 'node:path';
import { fetchJson } from './net.js';
import { downloadAll } from './downloads.js';
import { getSettings } from './store.js';
import { modsDir } from './mods.js';

const BASE = () => (process.env.QUILL_MODRINTH_BASE || 'https://api.modrinth.com/v2').replace(/\/+$/, '');

export async function searchMods({ query, version, loader, limit = 10 }) {
  const proxy = getSettings().proxy || undefined;
  const facets = [['project_type:mod']];
  if (version) facets.push([`versions:${version}`]);
  if (loader && loader !== 'vanilla') facets.push([`categories:${loader}`]);
  const url = `${BASE()}/search?query=${encodeURIComponent(query)}&limit=${limit}&index=relevance&facets=${encodeURIComponent(JSON.stringify(facets))}`;
  const data = await fetchJson(url, { proxy });
  return {
    hits: (data.hits || []).map((h) => ({
      project_id: h.project_id,
      title: h.title,
      description: h.description,
      downloads: h.downloads,
      slug: h.slug,
    })),
  };
}

export async function installMod({ projectId, profile }) {
  const proxy = getSettings().proxy || undefined;
  const gv = encodeURIComponent(JSON.stringify([profile.version]));
  const ld = profile.loader !== 'vanilla' ? `&loaders=${encodeURIComponent(JSON.stringify([profile.loader]))}` : '';
  const versions = await fetchJson(`${BASE()}/project/${encodeURIComponent(projectId)}/version?game_versions=${gv}${ld}`, { proxy });
  if (!Array.isArray(versions) || !versions.length) {
    throw new Error(`no compatible build for ${profile.version} (${profile.loader})`);
  }
  const file = versions[0].files.find((f) => f.primary) || versions[0].files[0];
  if (!file) throw new Error('release has no files');
  const dest = path.join(modsDir(profile), file.filename);
  await downloadAll(
    [{ url: file.url, dest, sha1: file.hashes?.sha1, label: file.filename }],
    { proxy, concurrency: 1 },
  );
  return { installed: file.filename, version: versions[0].version_number };
}
