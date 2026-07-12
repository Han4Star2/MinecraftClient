/* Minecraft options.txt patching — how launcher settings like render
   distance, brightness or the resource-pack order actually reach the game.
   Vanilla format: one "key:value" per line; unknown lines are preserved
   verbatim so hand-edits and mod-added keys survive every patch. */

import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { writeFileAtomic, ensureDir } from './util.js';

export function optionsFile(gameDir) {
  return path.join(gameDir, 'options.txt');
}

export async function readOptions(gameDir) {
  const out = new Map();
  try {
    const raw = await fsp.readFile(optionsFile(gameDir), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const i = line.indexOf(':');
      if (i > 0) out.set(line.slice(0, i), line.slice(i + 1));
    }
  } catch { /* no options.txt yet — vanilla writes one on first run */ }
  return out;
}

/** Merge entries into options.txt, preserving every untouched line/order. */
export async function patchOptions(gameDir, entries) {
  const file = optionsFile(gameDir);
  let lines = [];
  try {
    lines = (await fsp.readFile(file, 'utf8')).split(/\r?\n/);
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
  } catch { /* start fresh */ }

  const pending = new Map(Object.entries(entries).map(([k, v]) => [k, String(v)]));
  lines = lines.map((line) => {
    const i = line.indexOf(':');
    const key = i > 0 ? line.slice(0, i) : null;
    if (key && pending.has(key)) {
      const v = pending.get(key);
      pending.delete(key);
      return `${key}:${v}`;
    }
    return line;
  });
  for (const [k, v] of pending) lines.push(`${k}:${v}`);

  await ensureDir(gameDir);
  await writeFileAtomic(file, lines.join('\n') + '\n');
  return Object.keys(entries).length;
}

/** Map Horus settings → options.txt keys. "Leave" sentinels (0 / -1 / 'leave')
    mean "don't touch what the player set in-game". */
export function videoEntriesFromSettings(s) {
  const e = {};
  if (Number(s.renderDistance) > 0) e.renderDistance = Math.round(s.renderDistance);
  if (Number(s.simulationDistance) > 0) e.simulationDistance = Math.round(s.simulationDistance);
  if (s.guiScale !== undefined && s.guiScale !== 'leave') {
    e.guiScale = s.guiScale === 'auto' ? 0 : parseInt(s.guiScale, 10) || 0;
  }
  if (Number(s.brightness) >= 0) e.gamma = (Math.min(100, Number(s.brightness)) / 100).toFixed(2);
  if (Number(s.mouseSensitivity) >= 0) e.mouseSensitivity = (Math.min(100, Number(s.mouseSensitivity)) / 100).toFixed(2);
  if (Number(s.masterVolume) >= 0) e.soundCategory_master = (Math.min(100, Number(s.masterVolume)) / 100).toFixed(2);
  if (Number(s.fpsCap) > 0) e.maxFps = Math.min(260, Math.round(s.fpsCap));
  if (typeof s.vsync === 'boolean') e.enableVsync = s.vsync;
  if (typeof s.fullscreen === 'boolean') e.fullscreen = s.fullscreen;
  if (s.particles && s.particles !== 'leave') {
    e.particles = { all: 0, decreased: 1, minimal: 2 }[s.particles] ?? 0;
  }
  return e;
}

/** Resource-pack load order. UI sends highest-priority first; vanilla wants
    lowest first, with the built-in "vanilla" pack at the bottom. */
export async function setPackOrder(gameDir, enabledNames) {
  const order = ['vanilla', ...[...enabledNames].reverse().map((n) => `file/${n}`)];
  return patchOptions(gameDir, { resourcePacks: JSON.stringify(order) });
}

export async function getPackOrder(gameDir) {
  const opts = await readOptions(gameDir);
  try {
    const arr = JSON.parse(opts.get('resourcePacks') || '[]');
    return arr.filter((x) => typeof x === 'string' && x.startsWith('file/')).map((x) => x.slice(5)).reverse();
  } catch {
    return [];
  }
}
