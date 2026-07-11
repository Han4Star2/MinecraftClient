/* Persistent state: settings + profiles as plain JSON on disk.
   Default location is ~/.horus; `--portable` (or HORUS_DATA) keeps everything
   next to the app — no registry, no hidden databases, no lock-in. */

import os from 'node:os';
import path from 'node:path';
import { readJson, writeJson, ensureDir } from './util.js';

let dataDir = null;
let settings = null;
let profiles = null;

export const DEFAULT_SETTINGS = {
  language: 'auto',
  animations: true,
  accent: '#e8394a',
  keepOpen: true,
  autoUpdate: true,
  defaultRamMb: 3072,
  gc: 'G1',
  threads: 0,
  fpsCap: 0,
  vsync: false,
  resolution: 'auto',
  fullscreen: false,
  javaPath: '',
  jvmArgs: '',
  gameDir: '',
  proxy: '',
  downloadConcurrency: 4,
  metaMirror: '',
  curseforgeKey: '',
  theme: 'dark',
  accountName: 'Player',
  accountType: 'offline',
  msaClientId: '',
  selectedProfile: 'p-main',
};

const DEFAULT_PROFILES = [
  { id: 'p-main', name: 'Latest & Greatest', version: '1.21.5', loader: 'fabric', ramMb: 4096, javaPath: '', jvmArgs: '', gameDir: '', lastPlayed: 0, totalPlayMs: 0 },
  { id: 'p-pvp', name: '1.8.9 PvP', version: '1.8.9', loader: 'vanilla', ramMb: 2048, javaPath: '', jvmArgs: '', gameDir: '', lastPlayed: 0, totalPlayMs: 0 },
];

export async function initStore({ portable = false, data = '' } = {}) {
  dataDir = data
    || process.env.HORUS_DATA
    || (portable ? path.resolve('data') : path.join(os.homedir(), '.horus'));
  await ensureDir(dataDir);
  settings = { ...DEFAULT_SETTINGS, ...(await readJson(settingsFile(), {})) };
  profiles = await readJson(profilesFile(), null);
  if (!Array.isArray(profiles) || !profiles.length) {
    profiles = DEFAULT_PROFILES.map((p) => ({ ...p }));
    await writeJson(profilesFile(), profiles);
  }
  return dataDir;
}

const settingsFile = () => path.join(dataDir, 'settings.json');
const profilesFile = () => path.join(dataDir, 'profiles.json');

export function getDataDir() {
  return dataDir;
}

export function dirs() {
  return {
    data: dataDir,
    cache: path.join(dataDir, 'cache'),
    libraries: path.join(dataDir, 'libraries'),
    versions: path.join(dataDir, 'versions'),
    assets: path.join(dataDir, 'assets'),
    natives: path.join(dataDir, 'natives'),
    profiles: path.join(dataDir, 'profiles'),
    screenshots: path.join(dataDir, 'screenshots'),
  };
}

/* ---------------------------------------------------------------- settings */

export function getSettings() {
  return settings;
}

export async function putSettings(patch) {
  settings = { ...DEFAULT_SETTINGS, ...settings, ...sanitize(patch) };
  await writeJson(settingsFile(), settings);
  return settings;
}

function sanitize(patch) {
  const out = {};
  for (const k of Object.keys(DEFAULT_SETTINGS)) {
    if (patch[k] !== undefined && typeof patch[k] === typeof DEFAULT_SETTINGS[k]) out[k] = patch[k];
  }
  return out;
}

/* ---------------------------------------------------------------- profiles */

export function getProfiles() {
  return profiles;
}

export function getProfile(id) {
  return profiles.find((p) => p.id === id) || null;
}

export async function upsertProfile(id, data) {
  const clean = {
    id,
    name: String(data.name || id).slice(0, 80),
    version: String(data.version || '1.21.5').slice(0, 40),
    loader: ['vanilla', 'fabric', 'forge', 'neoforge', 'quilt', 'bedrock'].includes(data.loader) ? data.loader : 'vanilla',
    ramMb: Math.min(65536, Math.max(512, Number(data.ramMb) || 2048)),
    javaPath: String(data.javaPath || '').slice(0, 400),
    jvmArgs: String(data.jvmArgs || '').slice(0, 1000),
    gameDir: String(data.gameDir || '').slice(0, 400),
    lastPlayed: Number(data.lastPlayed) || 0,
    totalPlayMs: Number(data.totalPlayMs) || 0,
  };
  const i = profiles.findIndex((p) => p.id === id);
  if (i >= 0) profiles[i] = clean;
  else profiles.push(clean);
  await writeJson(profilesFile(), profiles);
  return clean;
}

export async function deleteProfile(id) {
  profiles = profiles.filter((p) => p.id !== id);
  await writeJson(profilesFile(), profiles);
}

export async function touchProfile(id, patch) {
  const p = getProfile(id);
  if (!p) return;
  Object.assign(p, patch);
  await writeJson(profilesFile(), profiles);
}

/* ---------------------------------------------------------------- economy */

const economyFile = () => path.join(dataDir, 'economy.json');
let economy = null;

export async function getEconomy() {
  if (economy === null) economy = await readJson(economyFile(), null);
  return economy;
}

export async function putEconomy(data) {
  // Light validation — Horus is a single-user local app; the client owns
  // the economy logic, the server just persists it durably.
  if (!data || typeof data !== 'object' || typeof data.coins !== 'number' || !Array.isArray(data.owned)) {
    throw new Error('invalid economy payload');
  }
  economy = data;
  await writeJson(economyFile(), economy);
  return economy;
}

/** Game directory for a profile (isolated by default, overridable). */
export function profileGameDir(profile) {
  if (profile.gameDir) return path.resolve(profile.gameDir);
  if (settings.gameDir) return path.resolve(settings.gameDir);
  return path.join(dirs().profiles, profile.id);
}
