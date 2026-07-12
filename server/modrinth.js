/* Modrinth integration — the open mod ecosystem. Search and install plain
   files into the profile's standard folders (mods/, shaderpacks/,
   resourcepacks/), auto-resolve required dependencies, and check installed
   jars for updates by their sha1. Nothing proprietary: the same files work
   in any launcher. https://docs.modrinth.com/api */

import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { fetchJson } from './net.js';
import { downloadAll } from './downloads.js';
import { getSettings } from './store.js';
import { modsDir, listMods } from './mods.js';
import { contentDir } from './folders.js';
import { sha1, exists } from './util.js';

const BASE = () => (process.env.HORUS_MODRINTH_BASE || 'https://api.modrinth.com/v2').replace(/\/+$/, '');

const TYPES = {
  mod: { projectType: 'mod', dir: (p) => modsDir(p), loaderFacet: true },
  shader: { projectType: 'shader', dir: (p) => contentDir(p, 'shaderpacks'), loaderFacet: false },
  resourcepack: { projectType: 'resourcepack', dir: (p) => contentDir(p, 'resourcepacks'), loaderFacet: false },
};

export async function searchMods({ query, version, loader, type = 'mod', limit = 10 }) {
  const kind = TYPES[type] || TYPES.mod;
  const proxy = getSettings().proxy || undefined;
  const facets = [[`project_type:${kind.projectType}`]];
  if (version) facets.push([`versions:${version}`]);
  if (kind.loaderFacet && loader && loader !== 'vanilla') facets.push([`categories:${loader}`]);
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

async function bestVersion({ projectId, profile, type, proxy }) {
  const kind = TYPES[type] || TYPES.mod;
  const gv = encodeURIComponent(JSON.stringify([profile.version]));
  const ld = kind.loaderFacet && profile.loader !== 'vanilla'
    ? `&loaders=${encodeURIComponent(JSON.stringify([profile.loader]))}` : '';
  const versions = await fetchJson(`${BASE()}/project/${encodeURIComponent(projectId)}/version?game_versions=${gv}${ld}`, { proxy });
  if (!Array.isArray(versions) || !versions.length) return null;
  return versions[0];
}

function primaryFile(version) {
  return version.files.find((f) => f.primary) || version.files[0] || null;
}

/** Install a project (and, for mods, every *required* dependency that isn't
    already present — the "client detects missing dependencies and fetches
    them automatically" behavior). */
export async function installMod({ projectId, profile, type = 'mod' }) {
  const kind = TYPES[type] || TYPES.mod;
  const proxy = getSettings().proxy || undefined;
  const version = await bestVersion({ projectId, profile, type, proxy });
  if (!version) throw new Error(`no compatible build for ${profile.version} (${profile.loader})`);
  const file = primaryFile(version);
  if (!file) throw new Error('release has no files');

  const destDir = kind.dir(profile);
  await downloadAll(
    [{ url: file.url, dest: path.join(destDir, file.filename), sha1: file.hashes?.sha1, label: file.filename }],
    { proxy, concurrency: 1 },
  );

  const dependencies = [];
  if (type === 'mod') {
    await installRequiredDeps({ version, profile, proxy, seen: new Set([version.project_id]), out: dependencies, depth: 0 });
  }
  return { installed: file.filename, version: version.version_number, dependencies };
}

async function installRequiredDeps({ version, profile, proxy, seen, out, depth }) {
  if (depth >= 3) return; // dependency chains deeper than this are a modpack, not a mod
  for (const dep of version.dependencies || []) {
    if (dep.dependency_type !== 'required' || !dep.project_id || seen.has(dep.project_id)) continue;
    seen.add(dep.project_id);
    let depVersion;
    try {
      depVersion = await bestVersion({ projectId: dep.project_id, profile, type: 'mod', proxy });
    } catch { continue; /* dependency metadata unavailable — the main mod is still installed */ }
    const file = depVersion && primaryFile(depVersion);
    if (!file) continue;
    const dest = path.join(modsDir(profile), file.filename);
    if (!(await exists(dest)) && !(await exists(`${dest}.disabled`))) {
      await downloadAll([{ url: file.url, dest, sha1: file.hashes?.sha1, label: `dependency ${file.filename}` }], { proxy, concurrency: 1 });
      out.push(file.filename);
    }
    await installRequiredDeps({ version: depVersion, profile, proxy, seen, out, depth: depth + 1 });
  }
}

/* ------------------------------------------------------------- jar updates */

/** Which installed jars have a newer compatible build on Modrinth?
    Identified by sha1 (Modrinth's version_files lookup), so it works for
    jars installed by hand or by any other launcher too. */
export async function checkJarUpdates(profile) {
  const proxy = getSettings().proxy || undefined;
  const jars = await listMods(profile);
  if (!jars.length) return [];

  const dir = modsDir(profile);
  const byHash = new Map();
  for (const jar of jars) {
    try {
      byHash.set(sha1(await fsp.readFile(path.join(dir, jar.file))), jar);
    } catch { /* unreadable file — skip */ }
  }
  if (!byHash.size) return [];

  const known = await fetchJson(`${BASE()}/version_files`, {
    proxy,
    method: 'POST',
    body: JSON.stringify({ hashes: [...byHash.keys()], algorithm: 'sha1' }),
    headers: { 'Content-Type': 'application/json' },
  });

  const updates = [];
  for (const [hash, current] of Object.entries(known || {})) {
    const jar = byHash.get(hash);
    if (!jar) continue;
    const latest = await bestVersion({ projectId: current.project_id, profile, type: 'mod', proxy }).catch(() => null);
    if (!latest || latest.id === current.id) continue;
    const file = primaryFile(latest);
    if (!file) continue;
    updates.push({
      file: jar.file,
      name: jar.name,
      projectId: current.project_id,
      current: current.version_number,
      latest: latest.version_number,
      url: file.url,
      filename: file.filename,
      sha1: file.hashes?.sha1,
    });
  }
  return updates;
}

/** Apply updates: download the new build, remove the old jar, and keep the
    enabled/disabled state the user had chosen. */
export async function applyJarUpdates(profile, updates) {
  const proxy = getSettings().proxy || undefined;
  const dir = modsDir(profile);
  const applied = [];
  for (const u of updates) {
    const wasDisabled = u.file.endsWith('.disabled');
    const dest = path.join(dir, u.filename + (wasDisabled ? '.disabled' : ''));
    await downloadAll([{ url: u.url, dest, sha1: u.sha1, label: u.filename }], { proxy, concurrency: 1 });
    if (path.basename(dest) !== u.file) {
      await fsp.rm(path.join(dir, u.file), { force: true });
    }
    applied.push({ file: path.basename(dest), from: u.current, to: u.latest });
  }
  return applied;
}
