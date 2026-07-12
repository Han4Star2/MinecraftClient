/* Horus Launcher — boot, hash router and sidebar. */

import { icon } from './icons.js';
import { t, setLang, detectLang, getLang } from './i18n.js';
import { detect, isConnected, serverStatus } from './api.js';
import { state, loadLocal, syncFromServer, subscribe, selectedProfile } from './state.js';
import { el, esc } from './components.js';
import { drawFace } from './skin.js';
import { DEMO_VERSIONS } from './catalog.js';

import * as home from './pages/home.js';
import * as news from './pages/news.js';
import * as library from './pages/library.js';
import * as mods from './pages/mods.js';
import * as discover from './pages/discover.js';
import * as hud from './pages/hud.js';
import * as shop from './pages/shop.js';
import * as cosmetics from './pages/cosmetics.js';
import * as minigames from './pages/minigames.js';
import * as social from './pages/social.js';
import * as servers from './pages/servers.js';
import * as worlds from './pages/worlds.js';
import * as screenshots from './pages/screenshots.js';
import * as settings from './pages/settings.js';
import * as ingame from './pages/ingame.js';

export { APP_VERSION, BUILD } from './version.js';
import { APP_VERSION } from './version.js';

const routes = {
  home: { mod: home, icon: 'play', label: 'nav.home' },
  library: { mod: library, icon: 'idcard', label: 'nav.library' },
  discover: { mod: discover, icon: 'grid', label: 'nav.content' },
  servers: { mod: servers, icon: 'globe', label: 'nav.servers' },
  cosmetics: { mod: cosmetics, icon: 'face', label: 'nav.cosmetics' },
  social: { mod: social, icon: 'headset', label: 'nav.social' },
  settings: { mod: settings, icon: 'settings', label: 'nav.settings' },
  ingame: { mod: ingame, icon: 'gamepad', label: 'nav.ingame' },
  // secondary routes — reachable from inside pages, not on the rail
  news: { mod: news, icon: 'list', label: 'nav.news', off: true },
  shop: { mod: shop, icon: 'gift', label: 'nav.shop', off: true },
  worlds: { mod: worlds, icon: 'globe', label: 'nav.worlds', off: true },
  screenshots: { mod: screenshots, icon: 'camera', label: 'nav.screenshots', off: true },
  // in-game features (accessible via the in-game overlay / Right Shift)
  mods: { mod: mods, icon: 'mods', label: 'nav.mods', off: true },
  hud: { mod: hud, icon: 'hud', label: 'nav.hud', off: true },
  minigames: { mod: minigames, icon: 'gamepad', label: 'nav.minigames', off: true },
};

const RAIL = ['home', 'library', 'discover', 'servers', 'cosmetics', 'social', null, 'ingame', 'settings'];

let current = null;
let cleanup = null;

function routeName() {
  const h = location.hash.replace(/^#\/?/, '').split('?')[0];
  return routes[h] ? h : 'home';
}

function render() {
  const name = routeName();
  cleanup?.();
  cleanup = null;
  current = name;
  const content = document.getElementById('content');
  content.innerHTML = '';
  content.scrollTop = 0;
  const result = routes[name].mod.render(content);
  if (typeof result === 'function') cleanup = result;
  else if (result && typeof result.destroy === 'function') cleanup = () => result.destroy();
  updateNav();
}

function updateNav() {
  document.querySelectorAll('.rail-item[data-route]').forEach((n) => {
    n.classList.toggle('active', n.dataset.route === current
      || (current === 'ingame' && n.dataset.route === 'ingame')
      || (['mods', 'hud', 'minigames'].includes(current) && n.dataset.route === 'ingame')
      || (['shop', 'worlds', 'screenshots', 'news'].includes(current) && n.dataset.route === 'home'));
  });
}

/* -------------------------------------------------------------- icon rail */

function renderRail() {
  const rail = document.getElementById('rail');
  rail.innerHTML = '';

  rail.appendChild(el(`<div class="rail-logo" title="Horus Client">${icon('logo')}</div>`));

  const nav = el('<nav class="rail-nav" aria-label="Main"></nav>');
  for (const key of RAIL) {
    if (!key) { nav.appendChild(el('<div class="rail-spacer"></div>')); continue; }
    const r = routes[key];
    const item = el(`<button class="rail-item" data-route="${key}" aria-label="${esc(t(r.label))}">${icon(r.icon)}<span class="rail-tip">${esc(t(r.label))}</span></button>`);
    item.addEventListener('click', () => { location.hash = `#/${key}`; });
    nav.appendChild(item);
  }
  rail.appendChild(nav);
  updateNav();
}

/* ----------------------------------------------------------------- topbar */

function renderTopbar() {
  const bar = document.getElementById('topbar');
  bar.innerHTML = '';
  const profile = selectedProfile();
  const online = 18000 + Math.floor(Math.random() * 900);

  const wrap = el(`
    <div class="tb-inner">
      <div class="tb-nav">
        <button class="tb-arrow" data-nav="back" title="Back">${icon('arrowL')}</button>
        <button class="tb-arrow" data-nav="fwd" title="Forward">${icon('arrowR')}</button>
      </div>
      <div class="tb-title">
        <b>HORUS<span style="color:var(--accent-2)"> CLIENT</span></b>
        <span class="tb-online"><span class="dot"></span>${online.toLocaleString()}</span>
      </div>
      <div class="grow"></div>
      <button class="tb-pill tb-instances">${icon('box')}<span class="ellipsis">${profile ? esc(profile.name) : 'No instance'}</span>${icon('chevD')}</button>
      <button class="tb-pill tb-account">
        <canvas width="22" height="22"></canvas>
        <b class="ellipsis">${esc((state.settings.accountName || 'Player').toUpperCase())}</b>${icon('chevD')}
      </button>
      <button class="icon-btn tb-friends" title="${esc(t('nav.social'))}">${icon('users')}</button>
      <button class="icon-btn tb-notif" title="Notifications">${icon('bell')}</button>
      <div class="tb-winctl">
        <button class="tb-win" data-win="min" title="Minimize">${icon('winMin')}</button>
        <button class="tb-win" data-win="max" title="Maximize">${icon('winMax')}</button>
        <button class="tb-win tb-close" data-win="close" title="Close">${icon('x')}</button>
      </div>
    </div>`);

  drawFace(wrap.querySelector('.tb-account canvas'), 22);
  wrap.querySelector('.tb-instances').addEventListener('click', () => { location.hash = '#/library'; });
  wrap.querySelector('.tb-account').addEventListener('click', () => { location.hash = '#/settings?cat=account'; });
  wrap.querySelector('.tb-friends').addEventListener('click', () => { location.hash = '#/social'; });
  wrap.querySelector('.tb-notif').addEventListener('click', () => { location.hash = '#/social'; });
  wrap.querySelector('[data-nav="back"]').addEventListener('click', () => history.back());
  wrap.querySelector('[data-nav="fwd"]').addEventListener('click', () => history.forward());
  wrap.querySelector('[data-win="close"]').addEventListener('click', async () => {
    try { await fetch('api/quit', { method: 'POST' }); } catch { /* demo */ }
    window.close();
  });
  wrap.querySelector('[data-win="min"]').addEventListener('click', () => document.body.classList.add('minimized-demo'));
  bar.appendChild(wrap);
}

function renderChrome() {
  renderRail();
  renderTopbar();
}

/* ------------------------------------------------------------ settings fx */

export function applySettingsSideEffects() {
  const s = state.settings;
  setLang(s.language === 'auto' ? detectLang() : s.language);
  document.body.classList.toggle('no-anim', !s.animations);
  document.body.dataset.theme = s.theme || 'dark';
  if (s.accent && /^#[0-9a-f]{6}$/i.test(s.accent)) {
    const root = document.documentElement.style;
    root.setProperty('--accent', s.accent);
    root.setProperty('--accent-2', s.accent);
    root.setProperty('--accent-grad', `linear-gradient(135deg, ${s.accent}, ${shade(s.accent, 0.72)})`);
    root.setProperty('--accent-soft', hexToRgba(s.accent, 0.14));
  }
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

function hexToRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/* -------------------------------------------------------------------- boot */

let lastLang = null;

async function boot() {
  loadLocal();
  applySettingsSideEffects();
  lastLang = getLang();
  renderChrome();

  await detect();
  if (isConnected()) {
    await syncFromServer();
    applySettingsSideEffects();
  }
  if (!state.versions.length) state.versions = DEMO_VERSIONS;

  renderChrome();
  render();

  window.addEventListener('hashchange', render);

  // Server API demo: overlay payloads pushed by game servers surface as toasts.
  const { onEvent } = await import('./api.js');
  const { toast } = await import('./components.js');
  onEvent((evt) => {
    if (evt.type === 'overlay' && evt.payload) {
      toast(`${evt.payload.title ? `${evt.payload.title}: ` : ''}${evt.payload.text}`, evt.payload.kind || 'info', 5000);
    }
  });

  subscribe((what) => {
    // Language or account changes affect the chrome around the page.
    applySettingsSideEffects();
    if (getLang() !== lastLang) {
      lastLang = getLang();
      renderChrome();
      render();
      return;
    }
    if (what === 'profiles' || what === 'settings' || what === 'sync') renderChrome();
  });
}

boot();

/* Re-export bits some pages want via a single import point. */
export { selectedProfile, serverStatus };
