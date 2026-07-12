/* First-run setup — "What do you play?". One click configures modules,
   HUD and performance for a playstyle and saves it as a named preset, so
   nothing is locked in: everything it does is visible in Mods / HUD /
   Settings afterwards and can be changed piece by piece. */

import { icon } from './icons.js';
import { el, esc, toast, modal } from './components.js';
import { state, save, setModEnabled, hudElements, saveModPreset } from './state.js';
import { MODS } from './catalog.js';

const STYLES = [
  { id: 'pvp', name: 'PvP', icon: 'sword', desc: 'Keystrokes, CPS, reach, combo — 1.8-feel, max FPS',
    mods: { on: ['toggle-sprint', 'keystrokes', 'cps', 'fps', 'ping', 'reach', 'combo', 'hit-color', 'crosshair', 'animations', 'attack-indicator'], off: ['minimap', 'world-map'] },
    hud: ['fps', 'cps', 'ping', 'keystrokes', 'combo', 'reach', 'armor', 'potions'],
    settings: { fpsBoost: 'low', particles: 'decreased' } },
  { id: 'survival', name: 'Survival / SMP', icon: 'apple', desc: 'Minimap, waypoints, tooltips, inventory comfort',
    mods: { on: ['minimap', 'waypoints', 'tooltips-plus', 'shulker-preview', 'inventory-tweaks', 'fps', 'coordinates', 'chat-tweaks'], off: [] },
    hud: ['fps', 'coords', 'biome', 'clock', 'armor', 'potions'],
    settings: {} },
  { id: 'building', name: 'Building', icon: 'grid', desc: 'Schematics, ghost blocks, material tracker',
    mods: { on: ['ghost-blocks', 'build-progress', 'material-tracker', 'build-presets', 'world-map', 'waypoints', 'zoom', 'fullbright'], off: [] },
    hud: ['fps', 'coords', 'chunk', 'height', 'direction'],
    settings: {} },
  { id: 'skyblock', name: 'Skyblock / Hypixel', icon: 'zap', desc: 'Scoreboard, Auto GG, Quickplay, item counter',
    mods: { on: ['scoreboard', 'auto-gg', 'quickplay', 'item-counter', 'tooltips-plus', 'fps', 'ping', 'chat-tweaks'], off: [] },
    hud: ['fps', 'ping', 'coords', 'armor', 'potions', 'clock'],
    settings: {} },
  { id: 'modded', name: 'Modded', icon: 'mods', desc: 'Performance modules on, ready for big packs',
    mods: { on: ['fps', 'coordinates', 'tooltips-plus', 'shulker-preview', 'inventory-tweaks'], off: [] },
    hud: ['fps', 'ram', 'coords', 'clock'],
    settings: { defaultRamMb: 4096 },
    note: 'Then open Mods → Recommended pack — Sodium & friends install with one click.' },
];

export function maybeShowSetupWizard() {
  if (state.settings.setupDone) return;

  const body = el(`
    <div class="col" style="gap:14px">
      <div class="muted small">One click sets up modules, HUD and performance for how you play. Everything stays visible and changeable afterwards — this is a starting point, not a lock-in.</div>
      <div class="setup-grid"></div>
      <button class="btn ghost small b-skip" style="align-self:center">Skip — I'll configure everything myself</button>
    </div>`);

  const m = modal({
    title: 'Welcome to Horus — what do you play?',
    body,
    size: 'lg',
    onClose: () => { state.settings.setupDone = true; save('settings'); },
  });

  body.querySelector('.b-skip').addEventListener('click', () => m.close());

  const grid = body.querySelector('.setup-grid');
  for (const s of STYLES) {
    const card = el(`
      <button class="card hover setup-card">
        <div class="mod-art" style="height:56px">${icon(s.icon)}</div>
        <b>${esc(s.name)}</b>
        <div class="tiny muted">${esc(s.desc)}</div>
      </button>`);
    card.addEventListener('click', () => {
      apply(s);
      m.close();
      toast(`${s.name} setup applied — saved as preset "${s.name}"${s.note ? `. ${s.note}` : ''}`, 'ok', 6500);
    });
    grid.appendChild(card);
  }
}

function apply(style) {
  for (const id of style.mods.on) {
    const mod = MODS.find((x) => x.id === id);
    if (mod) setModEnabled(mod, true);
  }
  for (const id of style.mods.off) {
    const mod = MODS.find((x) => x.id === id);
    if (mod) setModEnabled(mod, false);
  }
  for (const e of hudElements()) e.on = style.hud.includes(e.id);
  Object.assign(state.settings, style.settings, { setupDone: true });
  saveModPreset(style.name);
  save('settings');
  save('hud');
}
