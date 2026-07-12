/* Central client state.
   - Always persisted to localStorage (open JSON — copy it, edit it, sync it).
   - When the backend is connected, settings & profiles are loaded from and
     written back to the server store (~/.horus or ./data in portable mode). */

import { defaultProfiles, defaultSettings, HUD_DEFAULTS, MODS, FPS_BOOST_LEVELS } from './catalog.js';
import { api, isConnected } from './api.js';

const LS_KEY = 'horus.state.v1';

export const state = {
  settings: defaultSettings(),
  profiles: defaultProfiles(),
  favorites: ['keystrokes', 'fps'],
  modOverrides: {},            // modId → bool (built-in module toggles)
  modConfigs: {},              // modId → { key: value }
  hud: null,                   // array of HUD elements (lazy default)
  cosmetics: { cape: 'cape-solid-crimson', hat: null, wings: null, pet: null, nametag: null },
  economy: null,               // coins/owned/quests — lazily seeded by economy.js
  versions: [],                // populated from backend or demo list
  javas: [],
};

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(what) {
  for (const fn of listeners) fn(what);
}

/* ------------------------------------------------------------- persistence */

export function loadLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.settings) state.settings = { ...defaultSettings(), ...data.settings };
    if (Array.isArray(data.profiles) && data.profiles.length) state.profiles = data.profiles;
    if (Array.isArray(data.favorites)) state.favorites = data.favorites;
    if (data.modOverrides) state.modOverrides = data.modOverrides;
    if (data.modConfigs) state.modConfigs = data.modConfigs;
    if (Array.isArray(data.hud)) state.hud = data.hud;
    if (data.cosmetics) state.cosmetics = { ...state.cosmetics, ...data.cosmetics };
    if (data.economy) state.economy = data.economy;
  } catch { /* corrupted local state → fall back to defaults */ }
}

let saveTimer = null;

export function save(what = 'state') {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        settings: state.settings,
        profiles: state.profiles,
        favorites: state.favorites,
        modOverrides: state.modOverrides,
        modConfigs: state.modConfigs,
        hud: state.hud,
        cosmetics: state.cosmetics,
        economy: state.economy,
      }));
    } catch { /* storage full/blocked — non-fatal */ }
    if (isConnected()) {
      api.put('api/settings', state.settings).catch(() => {});
      if (state.economy) api.put('api/economy', state.economy).catch(() => {});
    }
  }, 150);
  notify(what);
}

/** Pull authoritative data from the backend after connecting. */
export async function syncFromServer() {
  try {
    const [settings, profiles, versions, javas, economyData] = await Promise.all([
      api.get('api/settings'),
      api.get('api/profiles'),
      api.get('api/versions').catch(() => ({ versions: [] })),
      api.get('api/javas').catch(() => ({ javas: [] })),
      api.get('api/economy').catch(() => null),
    ]);
    if (settings && typeof settings === 'object') state.settings = { ...defaultSettings(), ...settings };
    if (Array.isArray(profiles)) state.profiles = profiles;
    if (economyData && typeof economyData.coins === 'number') state.economy = economyData;
    state.versions = versions.versions || [];
    state.javas = javas.javas || [];
    notify('sync');
  } catch { /* stay on local state */ }
}

/* ---------------------------------------------------------------- profiles */

export function selectedProfile() {
  return state.profiles.find((p) => p.id === state.settings.selectedProfile) || state.profiles[0] || null;
}

export function selectProfile(id) {
  state.settings.selectedProfile = id;
  save('profiles');
}

export async function upsertProfile(profile) {
  const i = state.profiles.findIndex((p) => p.id === profile.id);
  if (i >= 0) state.profiles[i] = profile;
  else state.profiles.push(profile);
  if (isConnected()) await api.put(`api/profiles/${encodeURIComponent(profile.id)}`, profile).catch(() => {});
  save('profiles');
  return profile;
}

export async function removeProfile(id) {
  state.profiles = state.profiles.filter((p) => p.id !== id);
  if (state.settings.selectedProfile === id) state.settings.selectedProfile = state.profiles[0]?.id || '';
  if (isConnected()) await api.del(`api/profiles/${encodeURIComponent(id)}`).catch(() => {});
  save('profiles');
}

export function newProfileId(name) {
  const base = `p-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'profile'}`;
  let id = base;
  let n = 2;
  while (state.profiles.some((p) => p.id === id)) id = `${base}-${n++}`;
  return id;
}

/* ---------------------------------------------------------------- fps boost */
/* One dial, six steps: forces some built-in modules/HUD elements on or off
   without touching the user's own stored preference, so lowering the dial
   again brings everything straight back. */

export function fpsBoostLevel() {
  const i = FPS_BOOST_LEVELS.findIndex((l) => l.id === (state.settings.fpsBoost || 'off'));
  return i < 0 ? 0 : i;
}

function boostForcesOff(cutoff) {
  return cutoff !== undefined && fpsBoostLevel() >= cutoff;
}

/* -------------------------------------------------------------------- mods */

export function modEnabled(mod) {
  if (mod.boostForceOn && fpsBoostLevel() >= 1) return true;
  if (boostForcesOff(mod.boostCutoff)) return false;
  return state.modOverrides[mod.id] ?? mod.on;
}

export function modLocked(mod) {
  return (mod.boostForceOn && fpsBoostLevel() >= 1) || boostForcesOff(mod.boostCutoff);
}

export function setModEnabled(mod, on) {
  state.modOverrides[mod.id] = on;
  save('mods');
}

export function modConfig(mod) {
  const stored = state.modConfigs[mod.id] || {};
  const out = {};
  for (const c of mod.cfg || []) out[c.k] = stored[c.k] ?? c.def;
  return out;
}

export function setModConfigValue(mod, key, value) {
  state.modConfigs[mod.id] = { ...(state.modConfigs[mod.id] || {}), [key]: value };
  save('modcfg');
}

export function toggleFavorite(modId) {
  const i = state.favorites.indexOf(modId);
  if (i >= 0) state.favorites.splice(i, 1);
  else state.favorites.push(modId);
  save('mods');
}

export function isFavorite(modId) {
  return state.favorites.includes(modId);
}

export function enabledModCount() {
  return MODS.filter((m) => modEnabled(m)).length;
}

/* --------------------------------------------------------------------- hud */

export function hudElements() {
  if (!state.hud) {
    state.hud = HUD_DEFAULTS.map((e) => ({ ...e }));
    return state.hud;
  }
  // Migrate saved layouts: adopt newly added elements, refresh metadata
  // (group/label/boost threshold) while keeping the user's position & style.
  for (const def of HUD_DEFAULTS) {
    const cur = state.hud.find((e) => e.id === def.id);
    if (!cur) state.hud.push({ ...def });
    else {
      cur.group = def.group;
      cur.label = def.label;
      cur.boostCutoff = def.boostCutoff;
    }
  }
  return state.hud;
}

export function resetHud() {
  state.hud = HUD_DEFAULTS.map((e) => ({ ...e }));
  save('hud');
}

export function hudElementEnabled(e) {
  return e.on && !boostForcesOff(e.boostCutoff);
}

export function hudElementLocked(e) {
  return boostForcesOff(e.boostCutoff);
}

/* --------------------------------------------------------------- cosmetics */

export function equipCosmetic(cat, idOrNull) {
  state.cosmetics[cat] = idOrNull;
  save('cosmetics');
}

/* ----------------------------------------------------------------- servers */

export function myServers() {
  if (!Array.isArray(state.settings.servers)) state.settings.servers = [];
  return state.settings.servers;
}

export function addServer({ name, addr }) {
  const list = myServers();
  const id = `sv-${Date.now().toString(36)}`;
  list.push({ id, name: name || addr, addr, fav: false });
  save('servers');
  return list[list.length - 1];
}

export function removeServer(id) {
  state.settings.servers = myServers().filter((s) => s.id !== id);
  save('servers');
}

export function toggleServerFav(id) {
  const s = myServers().find((x) => x.id === id);
  if (s) { s.fav = !s.fav; save('servers'); }
}

/* ---------------------------------------------------------------- accounts */
/* Saved account list. The active account is what settings.accountName /
   accountType already were — switching just swaps those two fields, so the
   whole launch pipeline keeps working unchanged. */

export function accounts() {
  if (!Array.isArray(state.settings.accounts)) state.settings.accounts = [];
  const list = state.settings.accounts;
  if (!list.some((a) => a.name === state.settings.accountName)) {
    list.unshift({ id: `acc-${Date.now().toString(36)}`, name: state.settings.accountName || 'Player', type: state.settings.accountType || 'offline' });
  }
  return list;
}

export function addAccount(name, type = 'offline') {
  const list = accounts();
  if (list.some((a) => a.name === name && a.type === type)) return null;
  const acc = { id: `acc-${Date.now().toString(36)}`, name, type };
  list.push(acc);
  save('accounts');
  return acc;
}

export function switchAccount(id) {
  const acc = accounts().find((a) => a.id === id);
  if (!acc) return;
  state.settings.accountName = acc.name;
  state.settings.accountType = acc.type;
  save('settings');
}

export function removeAccount(id) {
  const list = accounts();
  const acc = list.find((a) => a.id === id);
  if (!acc || acc.name === state.settings.accountName) return; // never remove the active one
  state.settings.accounts = list.filter((a) => a.id !== id);
  save('accounts');
}

/* ------------------------------------------------------------- mod presets */
/* Named snapshots of the whole module setup (on/off + per-module config). */

export function modPresets() {
  if (!state.settings.modProfiles || typeof state.settings.modProfiles !== 'object') state.settings.modProfiles = {};
  return state.settings.modProfiles;
}

export function saveModPreset(name) {
  modPresets()[name] = {
    overrides: { ...state.modOverrides },
    configs: JSON.parse(JSON.stringify(state.modConfigs)),
  };
  save('mods');
}

export function applyModPreset(name) {
  const p = modPresets()[name];
  if (!p) return false;
  state.modOverrides = { ...p.overrides };
  state.modConfigs = JSON.parse(JSON.stringify(p.configs || {}));
  save('mods');
  return true;
}

export function deleteModPreset(name) {
  delete modPresets()[name];
  save('mods');
}
