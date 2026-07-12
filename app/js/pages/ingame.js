/* In-Game overlay — what appears inside Minecraft when you press Right Shift.
   This is the home of the built-in client mods (the "MOD MENU"), the
   minigames, performance quick-settings, emotes, voice, servers, profiles,
   shortcuts, cosmetics quick-swap, social and screenshots — none of which
   live in the launcher chrome itself. Here it is presented as a faithful
   preview over a mock game scene, and every panel is interactive. */

import { icon } from '../icons.js';
import { el, esc, toast, makeSlider, makeSwitch, settingRow, control } from '../components.js';
import { state, save, fpsBoostLevel, selectedProfile, selectProfile, myServers, modConfig, setModConfigValue } from '../state.js';
import { FPS_BOOST_LEVELS, KEYBIND_ACTIONS, COSMETICS, MODS, PINNED_SERVERS } from '../catalog.js';
import { launchProfile } from '../launch.js';
import { render as renderModMenu } from './mods.js';
import { render as renderMinigames } from './minigames.js';
import { render as renderHud } from './hud.js';

const PANELS = [
  { id: 'menu', label: 'Mod Menu', icon: 'mods' },
  { id: 'performance', label: 'Performance', icon: 'zap' },
  { id: 'hud', label: 'HUD', icon: 'hud' },
  { id: 'emotes', label: 'Emotes', icon: 'face' },
  { id: 'cosmetics', label: 'Cosmetics', icon: 'shirt' },
  { id: 'voice', label: 'Voice', icon: 'headset' },
  { id: 'servers', label: 'Servers', icon: 'globe' },
  { id: 'profiles', label: 'Profiles', icon: 'box' },
  { id: 'keybinds', label: 'Shortcuts', icon: 'keyboard' },
  { id: 'minigames', label: 'Minigames', icon: 'running' },
  { id: 'social', label: 'Social', icon: 'users' },
  { id: 'screenshot', label: 'Screenshot', icon: 'camera' },
];

export function render(root) {
  let sub = null;

  const page = el(`
    <div class="ig-root">
      <div class="ig-scene">
        <div class="ig-hotbar">${'<span></span>'.repeat(9)}</div>
        <div class="ig-scoreboard">
          <div class="ig-sb-title">HORUS</div>
          ${Array.from({ length: 6 }, (_, i) => `<div class="ig-sb-row"><span>${['Rank', 'Level', 'Coins', 'Server', 'Online', 'www'][i]}</span><b>${['MVP+', '132', '1,450', 'Hypixel', '82k', 'horus.gg'][i]}</b></div>`).join('')}
        </div>

        <div class="ig-menu">
          <div class="ig-brand">${icon('logo')}<span>HORUS <b>${icon('zap')}</b> CLIENT</span></div>
          <button class="ig-modmenu">MOD MENU</button>
          <div class="ig-icons"></div>
          <div class="ig-hint">This is your in-game overlay — press <kbd>Right Shift</kbd> in a world to open it. Built-in mods, minigames &amp; cosmetics live here, not in the launcher.</div>
        </div>
      </div>

      <div class="ig-panel-host"></div>
    </div>`);

  const icons = page.querySelector('.ig-icons');
  for (const p of PANELS.filter((x) => x.id !== 'menu')) {
    const b = el(`<button class="ig-icon" title="${esc(p.label)}">${icon(p.icon)}</button>`);
    b.addEventListener('click', () => open(p.id));
    icons.appendChild(b);
  }
  page.querySelector('.ig-modmenu').addEventListener('click', () => open('menu'));

  const host = page.querySelector('.ig-panel-host');
  function open(id) {
    sub?.();
    sub = null;
    host.innerHTML = '';
    host.classList.add('active');

    const panel = el(`
      <div class="ig-panel">
        <div class="ig-panel-head">
          <button class="icon-btn small ig-back">${icon('arrowL')}</button>
          <b>${esc(PANELS.find((x) => x.id === id).label)}</b>
          <button class="icon-btn small right ig-close">${icon('x')}</button>
        </div>
        <div class="ig-panel-body"></div>
      </div>`);
    const body = panel.querySelector('.ig-panel-body');
    panel.querySelector('.ig-back').addEventListener('click', close);
    panel.querySelector('.ig-close').addEventListener('click', close);
    host.appendChild(panel);

    if (id === 'menu') sub = asCleanup(renderModMenu(body));
    else if (id === 'minigames') sub = asCleanup(renderMinigames(body));
    else if (id === 'hud') sub = asCleanup(renderHud(body));
    else if (id === 'performance') renderPerformance(body);
    else if (id === 'emotes') renderEmotes(body);
    else if (id === 'voice') renderVoice(body);
    else if (id === 'servers') renderServers(body);
    else if (id === 'profiles') renderProfiles(body);
    else if (id === 'keybinds') renderKeybinds(body);
    else if (id === 'cosmetics') location.hash = '#/cosmetics';
    else if (id === 'social') location.hash = '#/social';
    else if (id === 'screenshot') { takeShot(body); }
  }
  function close() {
    sub?.();
    sub = null;
    host.classList.remove('active');
    host.innerHTML = '';
  }

  root.appendChild(page);
  return () => { sub?.(); };
}

function asCleanup(r) {
  return typeof r === 'function' ? r : (r && r.destroy ? () => r.destroy() : null);
}

function takeShot(body) {
  body.innerHTML = `<div class="empty">${icon('camera')}<div class="e-title">Screenshot captured</div><div>Saved to your screenshots folder. Open the gallery to view and share.</div></div>`;
  const btn = el(`<div class="center" style="margin-top:12px"><button class="btn primary">${icon('screenshot')}<span>Open gallery</span></button></div>`);
  btn.querySelector('button').addEventListener('click', () => { location.hash = '#/screenshots'; });
  body.appendChild(btn);
  toast('Screenshot saved', 'ok', 1600);
  import('../economy.js').then(({ track }) => track('screenshots'));
}

/* ------------------------------------------------------ quick performance */

function renderPerformance(body) {
  const s = state.settings;
  const card = el('<div class="card pad"></div>');
  const idx = fpsBoostLevel();
  const row = settingRow('FPS Boost', FPS_BOOST_LEVELS[idx].tip,
    makeSlider({ min: 0, max: FPS_BOOST_LEVELS.length - 1, step: 1, value: idx, format: (v) => FPS_BOOST_LEVELS[v].label },
      (v) => { s.fpsBoost = FPS_BOOST_LEVELS[v].id; save('settings'); row.querySelector('.desc').textContent = FPS_BOOST_LEVELS[v].tip; }));
  card.appendChild(row);
  card.appendChild(settingRow('FPS cap', '0 = unlimited',
    makeSlider({ min: 0, max: 480, value: s.fpsCap || 0, format: (v) => (v ? `${v}` : '∞') }, (v) => { s.fpsCap = v; save('settings'); })));
  card.appendChild(settingRow('VSync', null, makeSwitch(s.vsync, (v) => { s.vsync = v; save('settings'); })));
  card.appendChild(settingRow('Particles', null,
    control({ t: 'select', opts: ['leave', 'all', 'decreased', 'minimal'] }, s.particles || 'leave', (v) => { s.particles = v; save('settings'); })));
  body.appendChild(card);
  body.appendChild(el(`<div class="tiny faint" style="margin-top:8px">Same settings as Settings → Performance — changes apply immediately, video values reach options.txt on the next launch.</div>`));
}

/* ---------------------------------------------------------------- emotes */

function renderEmotes(body) {
  const grid = el('<div class="mod-grid" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr))"></div>');
  for (const e of COSMETICS.filter((c) => c.cat === 'emote')) {
    const card = el(`
      <div class="card hover mod-card" style="align-items:center;text-align:center;cursor:pointer">
        <div class="mod-art" style="height:52px;width:100%">${icon('face')}</div>
        <b style="font-size:13px">${esc(e.name)}</b>
      </div>`);
    card.addEventListener('click', () => toast(`${e.name} — emote played`, 'ok', 1400));
    grid.appendChild(card);
  }
  body.appendChild(grid);
  body.appendChild(el(`<div class="tiny faint" style="margin-top:10px">Bind the emote wheel in Settings → Shortcuts (default <b>B</b>). More emotes in the Shop & Wardrobe.</div>`));
}

/* ----------------------------------------------------------------- voice */

function renderVoice(body) {
  const mod = MODS.find((m) => m.id === 'voice');
  const values = modConfig(mod);
  const card = el('<div class="card pad"></div>');
  for (const def of mod.cfg) {
    card.appendChild(settingRow(def.label, null, control(def, values[def.k] ?? def.def, (v) => setModConfigValue(mod, def.k, v))));
  }
  body.appendChild(card);
  body.appendChild(el(`<div class="tiny faint" style="margin-top:8px">${esc(mod.desc)} — install Simple Voice Chat via Mods → Recommended or the search.</div>`));
}

/* --------------------------------------------------------------- servers */

function renderServers(body) {
  const list = el('<div class="col" style="gap:6px"></div>');
  const all = [...myServers(), ...PINNED_SERVERS.map((p) => ({ id: `pin-${p.id}`, name: p.name, addr: p.addr }))];
  for (const s of all.slice(0, 8)) {
    const row = el(`
      <div class="version-row">
        <span class="grow" style="font-weight:600">${esc(s.name)} <span class="tiny faint mono">${esc(s.addr)}</span></span>
        <button class="btn small green">${icon('play')}<span>Join</span></button>
      </div>`);
    row.querySelector('button').addEventListener('click', () => {
      const p = selectedProfile();
      if (p) launchProfile(p, { server: s.addr });
    });
    list.appendChild(row);
  }
  body.appendChild(list);
  const more = el(`<button class="btn ghost small" style="width:100%;margin-top:10px">Manage servers →</button>`);
  more.addEventListener('click', () => { location.hash = '#/servers'; });
  body.appendChild(more);
}

/* -------------------------------------------------------------- profiles */

function renderProfiles(body) {
  const list = el('<div class="col" style="gap:6px"></div>');
  for (const p of state.profiles) {
    const active = p.id === state.settings.selectedProfile;
    const row = el(`
      <div class="version-row ${active ? 'selected' : ''}">
        <span class="grow" style="font-weight:600">${esc(p.name)} <span class="tiny faint">${esc(p.version)} · ${esc(p.loader)}</span></span>
        ${active ? icon('check') : `<button class="btn small dark">Switch</button>`}
      </div>`);
    row.querySelector('button')?.addEventListener('click', () => {
      selectProfile(p.id);
      toast(`${p.name} is now active — takes effect on the next launch`, 'ok');
      renderProfilesRepaint(body);
    });
    list.appendChild(row);
  }
  body.appendChild(list);
}

function renderProfilesRepaint(body) {
  body.innerHTML = '';
  renderProfiles(body);
}

/* -------------------------------------------------------------- keybinds */

function renderKeybinds(body) {
  const kb = state.settings.keybinds || {};
  const list = el('<div class="col" style="gap:4px"></div>');
  for (const a of KEYBIND_ACTIONS) {
    list.appendChild(el(`
      <div class="version-row">
        <span class="grow">${esc(a.label)}</span>
        <span class="keybind-btn" style="pointer-events:none">${esc(kb[a.id] || a.def)}</span>
      </div>`));
  }
  body.appendChild(list);
  const edit = el(`<button class="btn ghost small" style="width:100%;margin-top:10px">Edit in Settings → Shortcuts</button>`);
  edit.addEventListener('click', () => { location.hash = '#/settings?cat=keybinds'; });
  body.appendChild(edit);
}
