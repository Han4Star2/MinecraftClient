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
import * as hud from './pages/hud.js';
import * as shop from './pages/shop.js';
import * as cosmetics from './pages/cosmetics.js';
import * as minigames from './pages/minigames.js';
import * as social from './pages/social.js';
import * as worlds from './pages/worlds.js';
import * as screenshots from './pages/screenshots.js';
import * as settings from './pages/settings.js';

export { APP_VERSION, BUILD } from './version.js';
import { APP_VERSION } from './version.js';

const routes = {
  home: { mod: home, icon: 'home', label: 'nav.home' },
  news: { mod: news, icon: 'list', label: 'nav.news' },
  library: { mod: library, icon: 'library', label: 'nav.library' },
  mods: { mod: mods, icon: 'mods', label: 'nav.mods' },
  hud: { mod: hud, icon: 'hud', label: 'nav.hud' },
  shop: { mod: shop, icon: 'gift', label: 'nav.shop' },
  cosmetics: { mod: cosmetics, icon: 'shirt', label: 'nav.cosmetics' },
  minigames: { mod: minigames, icon: 'gamepad', label: 'nav.minigames' },
  social: { mod: social, icon: 'users', label: 'nav.social' },
  worlds: { mod: worlds, icon: 'globe', label: 'nav.worlds' },
  screenshots: { mod: screenshots, icon: 'camera', label: 'nav.screenshots' },
  settings: { mod: settings, icon: 'settings', label: 'nav.settings' },
};

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
  document.querySelectorAll('.nav-item[data-route]').forEach((n) => {
    n.classList.toggle('active', n.dataset.route === current);
  });
}

/* ----------------------------------------------------------------- sidebar */

function renderSidebar() {
  const side = document.getElementById('sidebar');
  side.innerHTML = '';

  const logo = el(`
    <div class="side-logo">
      <span style="color:#fff">${icon('logo')}</span>
      <div class="wordmark"><b>HORUS</b><span>CLIENT</span></div>
    </div>`);
  side.appendChild(logo);

  const nav = el('<nav class="side-nav" aria-label="Main"></nav>');
  const order = ['home', 'news', 'library', 'mods', 'hud', null, 'shop', 'cosmetics', 'minigames', null, 'social', 'worlds', 'screenshots', null, 'settings'];
  for (const key of order) {
    if (!key) { nav.appendChild(el('<div class="nav-sep"></div>')); continue; }
    const r = routes[key];
    const item = el(`<button class="nav-item" data-route="${key}">${icon(r.icon)}<span class="nav-label">${esc(t(r.label))}</span></button>`);
    item.addEventListener('click', () => { location.hash = `#/${key}`; });
    nav.appendChild(item);
  }
  side.appendChild(nav);

  const foot = el('<div class="side-foot"></div>');
  const acc = el(`
    <div class="account-card" title="${esc(t('set.account'))}">
      <canvas></canvas>
      <div class="col" style="gap:0;min-width:0">
        <span class="acc-name ellipsis"></span>
        <span class="acc-type"></span>
      </div>
    </div>`);
  drawFace(acc.querySelector('canvas'), 28);
  acc.querySelector('.acc-name').textContent = state.settings.accountName || 'Player';
  acc.querySelector('.acc-type').textContent = state.settings.accountType === 'msa' ? 'Microsoft' : 'Offline';
  acc.addEventListener('click', () => { location.hash = '#/settings?cat=account'; });
  foot.appendChild(acc);

  const mode = el(`
    <div class="mode-line">
      <span class="mode-badge ${isConnected() ? 'online' : 'demo'}">
        <span class="dot"></span>${isConnected() ? 'Backend connected' : 'Demo mode'}
      </span>
      <span class="mono">v${APP_VERSION}</span>
    </div>`);
  foot.appendChild(mode);
  side.appendChild(foot);
  updateNav();
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
  renderSidebar();

  await detect();
  if (isConnected()) {
    await syncFromServer();
    applySettingsSideEffects();
  }
  if (!state.versions.length) state.versions = DEMO_VERSIONS;

  renderSidebar();
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
      renderSidebar();
      render();
      return;
    }
    if (what === 'profiles' || what === 'settings' || what === 'sync') renderSidebar();
  });
}

boot();

/* Re-export bits some pages want via a single import point. */
export { selectedProfile, serverStatus };
