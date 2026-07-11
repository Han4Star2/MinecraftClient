/* In-Game overlay — what appears inside Minecraft when you press Right Shift.
   This is the home of the built-in client mods (the "MOD MENU"), the
   minigames, the in-game cosmetics quick-swap, social and screenshots — none
   of which live in the launcher chrome itself. Here it is presented as a
   faithful preview over a mock game scene, and every panel is interactive. */

import { icon } from '../icons.js';
import { el, esc, toast } from '../components.js';
import { state } from '../state.js';
import { render as renderModMenu } from './mods.js';
import { render as renderMinigames } from './minigames.js';
import { render as renderHud } from './hud.js';

const PANELS = [
  { id: 'menu', label: 'Mod Menu', icon: 'mods' },
  { id: 'minigames', label: 'Minigames', icon: 'running' },
  { id: 'cosmetics', label: 'Cosmetics', icon: 'shirt' },
  { id: 'hud', label: 'HUD', icon: 'hud' },
  { id: 'social', label: 'Social', icon: 'headset' },
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
  void state;
}
