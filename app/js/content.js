/* Client content-platform layer. Connected mode talks to the backend
   registry; demo mode runs the same flows over a local seed + localStorage
   so the Discover page is fully explorable offline. */

import { api, isConnected } from './api.js';
import { state } from './state.js';

/* ------------------------------------------------------------- demo seed */

const DEMO = [
  { id: 'seed-sodium', type: 'mod', name: 'Rapid Render', author: 'horus-team', category: 'performance', summary: 'Sodium-class rendering optimizations for buttery FPS.', versions: ['1.21.5', '1.21.1', '1.20.6', '1.20.1'], loaders: ['fabric', 'quilt'], verified: true, downloads: 184213, rating: 4.9, ratingCount: 210, latest: { version: '0.6.0' } },
  { id: 'seed-lithium', type: 'mod', name: 'Tick Boost', author: 'horus-team', category: 'performance', summary: 'Server-side game-logic optimizations, no behavior changes.', versions: ['1.21.5', '1.21.1', '1.20.1'], loaders: ['fabric'], verified: true, downloads: 142980, rating: 4.8, ratingCount: 150, latest: { version: '0.13.0' } },
  { id: 'seed-iris', type: 'mod', name: 'Prism Shaders Loader', author: 'horus-team', category: 'graphics', summary: 'Load and manage shader packs on Fabric.', versions: ['1.21.5', '1.21.1', '1.20.1'], loaders: ['fabric'], verified: true, downloads: 98771, rating: 4.7, ratingCount: 132, latest: { version: '1.8.1' } },
  { id: 'seed-jei', type: 'mod', name: 'Recipe Compass', author: 'community', category: 'utility', summary: 'Item and recipe lookup index for modded play.', versions: ['1.21.1', '1.20.1'], loaders: ['forge', 'neoforge'], verified: false, downloads: 76540, rating: 4.6, ratingCount: 88, latest: { version: '15.3.0' } },
  { id: 'seed-map', type: 'mod', name: 'Atlas Minimap', author: 'cartoq', category: 'utility', summary: 'Minimap with waypoints, cave mode and a fullscreen atlas.', versions: ['1.21.5', '1.21.1'], loaders: ['fabric', 'forge'], verified: true, downloads: 51230, rating: 4.5, ratingCount: 64, latest: { version: '3.2.0' } },
  { id: 'seed-carry', type: 'mod', name: 'Backpacks+', author: 'loothoarder', category: 'gameplay', summary: 'Tiered backpacks with upgrades and auto-pickup.', versions: ['1.21.1', '1.20.1'], loaders: ['fabric'], verified: false, downloads: 21044, rating: 4.3, ratingCount: 41, latest: { version: '1.4.2' } },
  { id: 'seed-faithful', type: 'resourcepack', name: 'Crisp 32x', author: 'pixelforge', category: 'realistic', summary: 'Clean 32× textures faithful to the vanilla look.', versions: ['1.21.5', '1.21.1', '1.20.1'], verified: true, downloads: 88110, rating: 4.8, ratingCount: 176, latest: { version: '11.0' } },
  { id: 'seed-pvp', type: 'resourcepack', name: 'Edge PvP 16x', author: 'clutch', category: 'pvp', summary: 'Short-sword low-fire PvP pack with clean UI.', versions: ['1.8.9', '1.21.5'], verified: true, downloads: 64980, rating: 4.7, ratingCount: 120, latest: { version: '4.1' } },
  { id: 'seed-cozy', type: 'resourcepack', name: 'Cozy Cottage', author: 'meadowmaker', category: 'cartoon', summary: 'Warm, hand-painted cartoon textures.', versions: ['1.21.5', '1.21.1'], verified: false, downloads: 30221, rating: 4.6, ratingCount: 58, latest: { version: '2.0' } },
  { id: 'seed-ui', type: 'resourcepack', name: 'Modern UI', author: 'flatlab', category: 'gui', summary: 'Flat, high-contrast interface and HUD overhaul.', versions: ['1.21.5'], verified: false, downloads: 18740, rating: 4.4, ratingCount: 33, latest: { version: '1.2' } },
  { id: 'seed-bsl', type: 'shader', name: 'Aurora Shaders', author: 'lightbend', category: 'realistic', summary: 'Balanced realistic lighting with volumetric clouds.', versions: ['1.21.5', '1.21.1', '1.20.1'], verified: true, downloads: 71203, rating: 4.9, ratingCount: 190, latest: { version: '8.4' } },
  { id: 'seed-complementary', type: 'shader', name: 'Harmony Shaders', author: 'shaderworks', category: 'balanced', summary: 'Great looks at high FPS — a safe default.', versions: ['1.21.5', '1.21.1'], verified: true, downloads: 66042, rating: 4.8, ratingCount: 165, latest: { version: '5.1' } },
  { id: 'seed-lofi', type: 'shader', name: 'Soft Toon', author: 'inkwell', category: 'stylized', summary: 'Soft cel-shaded stylized lighting.', versions: ['1.21.5'], verified: false, downloads: 24110, rating: 4.5, ratingCount: 47, latest: { version: '1.0' } },
];

const DEMO_PACKS = [
  { id: 'skyblock', name: 'Horus Skyblock', address: 'play.horus-demo.net', version: '1.21.1', loader: 'fabric', content: ['seed-sodium', 'seed-map', 'seed-faithful'], recommended: ['seed-bsl'], settings: { renderDistance: 12, fov: 80 }, desc: 'Everything you need for our Skyblock realm — performance, minimap and our official texture pack, auto-installed.' },
  { id: 'pvparena', name: 'Edge PvP Network', address: 'pvp.horus-demo.net', version: '1.8.9', loader: 'vanilla', content: ['seed-pvp'], recommended: [], settings: { fov: 90 }, desc: 'Our 1.8.9 PvP pack and tuned settings — join and you\'re ready to duel.' },
  { id: 'createpack', name: 'Cogworks (Create)', address: 'create.horus-demo.net', version: '1.20.1', loader: 'forge', content: ['seed-jei', 'seed-lithium', 'seed-cozy'], recommended: ['seed-carry'], settings: { renderDistance: 10 }, desc: 'A curated Create-style modpack profile with the recipe index and optimizations preloaded.' },
];

/* -------------------------------------------------------------- demo store */

const LS = 'horus.content.v1';
function demoState() {
  if (!state._content) {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(LS)) || {}; } catch { /* fresh */ }
    state._content = {
      uploads: saved.uploads || [],        // user uploads (pending/approved)
      installed: saved.installed || {},     // profileId → [{id, version}]
      ratedBy: saved.ratedBy || {},         // id → true
      overrides: saved.overrides || {},     // id → {status, verified, ratingBump}
    };
  }
  return state._content;
}
function demoSave() {
  try { localStorage.setItem(LS, JSON.stringify(state._content)); } catch { /* ignore */ }
}
function allDemo() {
  const s = demoState();
  return [...s.uploads, ...DEMO].map((c) => {
    const o = s.overrides[c.id];
    return o ? { ...c, ...o } : c;
  });
}

/* ---------------------------------------------------------------- read API */

export async function listContent(filter = {}) {
  if (isConnected()) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(filter)) if (v) p.set(k === 'query' ? 'q' : k, v === true ? '1' : v);
    const data = await api.get(`api/content?${p}`);
    return data;
  }
  const status = filter.status || 'approved';
  let list = allDemo().filter((c) => {
    if ((c.status || 'approved') !== status) return false;
    if (filter.type && c.type !== filter.type) return false;
    if (filter.category && c.category !== filter.category) return false;
    if (filter.version && !(c.versions || []).includes(filter.version)) return false;
    if (filter.verified && !c.verified) return false;
    if (filter.query) {
      const q = filter.query.toLowerCase();
      if (!`${c.name} ${c.author} ${c.summary}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const sort = filter.sort || 'popular';
  list = [...list].sort((a, b) => sort === 'newest' ? (b.latest?.uploadedAt || 0) - (a.latest?.uploadedAt || 0)
    : sort === 'rating' ? (b.rating || 0) - (a.rating || 0)
    : (b.downloads || 0) - (a.downloads || 0));
  const cats = [...new Set(allDemo().map((c) => c.category).filter(Boolean))].sort();
  const pending = allDemo().filter((c) => (c.status || 'approved') === 'pending').length;
  return { content: list, categories: cats, pending };
}

export async function serverPacks() {
  if (isConnected()) return (await api.get('api/serverpacks')).serverpacks;
  return DEMO_PACKS;
}

/* ----------------------------------------------------------- install/ledger */

export async function installedFor(profileId) {
  if (isConnected()) {
    try { return (await api.get(`api/content/updates?profileId=${encodeURIComponent(profileId)}`)).updates; }
    catch { return []; }
  }
  return [];
}

export function isInstalled(id, profileId) {
  if (isConnected()) return false; // backend is source of truth; UI re-fetches
  return (demoState().installed[profileId] || []).some((e) => e.id === id);
}

export async function install(id, profileId) {
  if (isConnected()) return api.post(`api/content/${encodeURIComponent(id)}/install`, { profileId });
  const s = demoState();
  const c = allDemo().find((x) => x.id === id);
  s.installed[profileId] = (s.installed[profileId] || []).filter((e) => e.id !== id);
  s.installed[profileId].push({ id, version: c?.latest?.version || '1.0' });
  demoSave();
  return { installed: c?.name, version: c?.latest?.version, dir: c?.type === 'mod' ? 'mods' : c?.type === 'shader' ? 'shaderpacks' : 'resourcepacks' };
}

/* -------------------------------------------------------------- upload/review */

export async function upload(meta, file) {
  if (isConnected()) {
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(meta))));
    const res = await fetch('api/content/upload', {
      method: 'POST',
      headers: { 'x-horus-meta': b64, 'Content-Type': 'application/octet-stream' },
      body: file,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'upload failed');
    return data;
  }
  // demo: register a pending entry
  const s = demoState();
  const id = `usr-${Date.now().toString(36)}`;
  const entry = {
    id, type: meta.type, name: meta.name || file.name.replace(/\.(jar|zip)$/i, ''),
    author: meta.author || 'you', category: meta.category || 'misc',
    summary: meta.summary || '', versions: meta.versions || ['1.21.5'],
    loaders: meta.loaders || (meta.type === 'mod' ? ['fabric'] : []),
    status: 'pending', verified: false, source: 'community', downloads: 0,
    rating: 0, ratingCount: 0, mine: true, latest: { version: meta.version || '1.0.0', uploadedAt: Date.now() },
  };
  s.uploads.unshift(entry);
  demoSave();
  return entry;
}

export async function review(id, action) {
  if (isConnected()) return api.post(`api/content/${encodeURIComponent(id)}/review`, { action });
  const s = demoState();
  const up = s.uploads.find((x) => x.id === id);
  const patch = action === 'approve' ? { status: 'approved' }
    : action === 'reject' ? { status: 'rejected' }
    : action === 'verify' ? { status: 'approved', verified: true }
    : { verified: false };
  if (up) Object.assign(up, patch);
  else s.overrides[id] = { ...(s.overrides[id] || {}), ...patch };
  demoSave();
  return { id, ...patch };
}

export async function rate(id, stars) {
  if (isConnected()) return api.post(`api/content/${encodeURIComponent(id)}/rate`, { stars });
  const s = demoState();
  if (s.ratedBy[id]) throw new Error('already rated');
  s.ratedBy[id] = true;
  demoSave();
  return { ok: true };
}
export function hasRated(id) {
  return isConnected() ? false : !!demoState().ratedBy[id];
}

/* --------------------------------------------------------------- updates */

export async function checkUpdates(profileId) {
  if (isConnected()) return (await api.get(`api/content/updates?profileId=${encodeURIComponent(profileId)}`)).updates;
  return [];
}

export async function updateAll(profileId) {
  if (isConnected()) return (await api.post('api/content/update-all', { profileId })).updated;
  return [];
}

export async function joinServerPack(id) {
  if (isConnected()) return api.post(`api/serverpacks/${encodeURIComponent(id)}/join`, {});
  // demo: pretend to build the profile
  const pack = DEMO_PACKS.find((p) => p.id === id);
  return { profileId: `srv-${id}`, address: pack?.address, installed: (pack?.content || []).map((cid) => ({ installed: cid })), settings: pack?.settings || {}, demo: true };
}
