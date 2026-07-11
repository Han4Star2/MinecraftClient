/* Version metadata: Mojang manifest + version JSON, with
   - configurable mirrors (Settings → Network or HORUS_META_BASE): no lock-in,
   - a local cache so previously used versions keep working offline,
   - a bundled fallback list so the UI is never empty,
   - Fabric/Quilt loader profile merging (same open meta APIs the loaders publish). */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchJson } from './net.js';
import { readJson, writeJson } from './util.js';
import { dirs, getSettings } from './store.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export function metaBase() {
  return (process.env.HORUS_META_BASE || getSettings().metaMirror || 'https://piston-meta.mojang.com').replace(/\/+$/, '');
}

export function assetsBase() {
  return (process.env.HORUS_ASSETS_BASE || 'https://resources.download.minecraft.net').replace(/\/+$/, '');
}

function loaderBase(loader) {
  if (loader === 'fabric') return (process.env.HORUS_FABRIC_BASE || 'https://meta.fabricmc.net/v2').replace(/\/+$/, '');
  if (loader === 'quilt') return (process.env.HORUS_QUILT_BASE || 'https://meta.quiltmc.org/v3').replace(/\/+$/, '');
  return null;
}

const manifestCacheFile = () => path.join(dirs().cache, 'version_manifest_v2.json');
const versionCacheFile = (id) => path.join(dirs().cache, 'versions', `${id}.json`);
const loaderCacheFile = (loader, mc) => path.join(dirs().cache, loader, `${mc}.json`);

/* ----------------------------------------------------------------- manifest */

/**
 * @returns {{versions: Array<{id:string,type:string,url?:string,sha1?:string}>, source: string}}
 */
export async function getManifest({ refresh = false, proxy } = {}) {
  const cached = await readJson(manifestCacheFile());
  if (cached && !refresh) return { versions: cached.versions, source: 'cache' };
  try {
    const data = await fetchJson(`${metaBase()}/mc/game/version_manifest_v2.json`, { proxy });
    await writeJson(manifestCacheFile(), data);
    return { versions: data.versions, source: 'online' };
  } catch (e) {
    if (cached) return { versions: cached.versions, source: 'cache' };
    const fallback = await readJson(path.join(HERE, 'fixtures', 'manifest-fallback.json'), { versions: [] });
    return { versions: fallback.versions, source: 'fallback', error: e.message };
  }
}

/* ------------------------------------------------------------- version json */

export async function getVersionJson(id, { proxy } = {}) {
  const cached = await readJson(versionCacheFile(id));
  if (cached) return cached;

  const { versions, source } = await getManifest({ proxy });
  let entry = versions.find((v) => v.id === id);
  if (!entry || !entry.url) {
    // Cache may be stale (new snapshot) — refresh once before giving up.
    const fresh = await getManifest({ refresh: true, proxy });
    entry = fresh.versions.find((v) => v.id === id);
    if (!entry || !entry.url) {
      throw new Error(source === 'fallback'
        ? `version ${id}: metadata requires one online fetch first (bundled fallback has no download URLs)`
        : `unknown Minecraft version: ${id}`);
    }
  }
  const json = await fetchJson(entry.url, { proxy });
  await writeJson(versionCacheFile(id), json);
  return json;
}

/* ------------------------------------------------------------ loader merge */

/**
 * Resolve the effective version JSON for a profile: vanilla, or vanilla
 * merged with a Fabric/Quilt loader profile (mainClass, extra libraries,
 * extra arguments). Forge/NeoForge need their own installers — we say so
 * clearly instead of half-working (see README roadmap).
 */
export async function resolveVersion(profile, { proxy } = {}) {
  const vanilla = await getVersionJson(profile.version, { proxy });

  if (profile.loader === 'vanilla' || !profile.loader) {
    return { json: vanilla, launchId: profile.version };
  }

  if (profile.loader === 'fabric' || profile.loader === 'quilt') {
    const loaderJson = await getLoaderProfile(profile.loader, profile.version, { proxy });
    const merged = mergeLoader(vanilla, loaderJson);
    return { json: merged, launchId: `${profile.loader}-${profile.version}` };
  }

  throw new Error(
    `${profile.loader} is not automated yet. Run its installer once, or use a Fabric/Quilt/Vanilla profile. ` +
    `Horus uses only standard formats, so an existing ${profile.loader} installation keeps working via the shared game directory.`,
  );
}

async function getLoaderProfile(loader, mcVersion, { proxy } = {}) {
  const cached = await readJson(loaderCacheFile(loader, mcVersion));
  if (cached) return cached;
  const base = loaderBase(loader);
  const loaders = await fetchJson(`${base}/versions/loader/${encodeURIComponent(mcVersion)}`, { proxy });
  if (!Array.isArray(loaders) || !loaders.length) {
    throw new Error(`${loader} has no build for Minecraft ${mcVersion}`);
  }
  const stable = loaders.find((l) => l.loader?.stable) || loaders[0];
  const loaderVersion = stable.loader.version;
  const profileJson = await fetchJson(
    `${base}/versions/loader/${encodeURIComponent(mcVersion)}/${encodeURIComponent(loaderVersion)}/profile/json`,
    { proxy },
  );
  await writeJson(loaderCacheFile(loader, mcVersion), profileJson);
  return profileJson;
}

/** Merge an inheritsFrom-style loader profile onto the vanilla version JSON. */
export function mergeLoader(vanilla, loaderJson) {
  const merged = structuredClone(vanilla);
  merged.id = loaderJson.id || merged.id;
  merged.mainClass = loaderJson.mainClass || merged.mainClass;
  merged.libraries = [...(loaderJson.libraries || []), ...(vanilla.libraries || [])];
  if (loaderJson.arguments) {
    merged.arguments = merged.arguments || {};
    merged.arguments.game = [...(merged.arguments.game || []), ...(loaderJson.arguments.game || [])];
    merged.arguments.jvm = [...(merged.arguments.jvm || []), ...(loaderJson.arguments.jvm || [])];
  }
  if (loaderJson.minecraftArguments) merged.minecraftArguments = loaderJson.minecraftArguments;
  return merged;
}

/* --------------------------------------------------- maven name → path/url */

/** "org.ow2.asm:asm:9.6" → "org/ow2/asm/asm/9.6/asm-9.6.jar" (classifier- and @ext-aware). */
export function mavenToPath(name) {
  const parts = name.split(':');
  const [group, artifact, ver] = parts;
  const cls = parts[3] ? `-${parts[3]}` : '';
  let file = `${artifact}-${ver}${cls}.jar`;
  let v = ver;
  if (ver && ver.includes('@')) {
    const [realVer, ext] = ver.split('@');
    v = realVer;
    file = `${artifact}-${realVer}${cls}.${ext}`;
  }
  return `${group.replace(/\./g, '/')}/${artifact}/${v}/${file}`;
}
