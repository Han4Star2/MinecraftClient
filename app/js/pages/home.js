/* Home — the launcher's face. Mirrors the classic Feather main menu:
   feather logo + wordmark, a stack of quick actions, a big red play button,
   pinned-server rail on the left, account cluster top-right, promo card. */

import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { el, esc, toast, modal } from '../components.js';
import { state, selectedProfile, selectProfile } from '../state.js';
import { PINNED_SERVERS } from '../catalog.js';
import { drawFace } from '../skin.js';
import { launchProfile } from '../launch.js';
import { APP_VERSION, BUILD } from '../main.js';

export function render(root) {
  const profile = selectedProfile();

  const wrap = el(`
    <div class="home-wrap">
      <div class="home-top">
        <button class="home-account" title="${esc(t('set.account'))}">
          <canvas></canvas><b></b>
        </button>
        <button class="icon-btn" data-go="library" title="${esc(t('nav.library'))}">${icon('library')}</button>
        <button class="icon-btn" data-go="friends" title="${esc(t('nav.friends'))}">${icon('message')}</button>
        <button class="icon-btn" data-go="settings" title="${esc(t('nav.settings'))}">${icon('settings')}</button>
        <button class="icon-btn" data-go="cosmetics" title="${esc(t('nav.cosmetics'))}">${icon('gift')}</button>
        <button class="icon-btn" data-go="mods" title="${esc(t('nav.mods'))}">${icon('list')}</button>
      </div>

      <div class="server-rail" aria-label="Pinned servers"></div>

      <div class="hero">
        <div class="hero-logo">
          <span style="color:#fff">${icon('logo')}</span>
          <div class="word"><b>QUILL</b> <span>CLIENT</span></div>
        </div>

        <button class="hero-profile" title="${esc(t('lib.title'))}">
          ${icon('box')}
          <span>${esc(t('home.readyProfile'))}: <b class="hp-name"></b> <span class="hp-ver muted"></span></span>
          ${icon('chevD')}
        </button>

        <div class="hero-stack">
          <button class="hero-btn" data-act="single">${icon('user')}<span>${esc(t('home.singleplayer'))}</span></button>
          <button class="hero-btn" data-act="multi">${icon('users')}<span>${esc(t('home.multiplayer'))}</span></button>
          <button class="hero-btn" data-go="cosmetics">${icon('shirt')}<span>${esc(t('home.cosmetics'))}</span></button>
          <button class="hero-btn" data-go="screenshots">${icon('screenshot')}<span>${esc(t('home.screenshots'))}</span></button>
          <button class="hero-btn play" data-act="play">${icon('play')}<span>${esc(t('home.play'))}</span></button>
        </div>

        <button class="hero-quit">${esc(t('home.quit'))}</button>
      </div>

      <div class="card hover home-promo" data-go="cosmetics">
        <div class="promo-art"></div>
        <div class="promo-body">
          <div class="promo-title">${esc(t('home.promo.title'))}</div>
          <div class="promo-sub">${esc(t('home.promo.sub'))}</div>
        </div>
      </div>

      <div class="hero-version">Quill ${APP_VERSION} (${BUILD}) · ${esc(profile ? profile.version : '—')}</div>
    </div>`);

  /* account chip */
  drawFace(wrap.querySelector('.home-account canvas'), 30);
  wrap.querySelector('.home-account b').textContent = (state.settings.accountName || 'PLAYER').toUpperCase();
  wrap.querySelector('.home-account').addEventListener('click', () => { location.hash = '#/settings?cat=account'; });

  /* profile pill */
  const applyProfile = () => {
    const p = selectedProfile();
    wrap.querySelector('.hp-name').textContent = p ? p.name : '—';
    wrap.querySelector('.hp-ver').textContent = p ? `· ${p.version} ${p.loader !== 'vanilla' ? p.loader : ''}` : '';
  };
  applyProfile();
  wrap.querySelector('.hero-profile').addEventListener('click', () => pickProfile(applyProfile));

  /* sparkles on promo art */
  const art = wrap.querySelector('.promo-art');
  for (let i = 0; i < 26; i++) {
    const s = document.createElement('span');
    s.className = 'sparkle';
    const size = 1 + Math.random() * 2.5;
    s.style.cssText = `width:${size}px;height:${size}px;left:${Math.random() * 100}%;top:${Math.random() * 100}%;opacity:${0.25 + Math.random() * 0.6}`;
    art.appendChild(s);
  }

  /* pinned servers rail */
  const rail = wrap.querySelector('.server-rail');
  for (const s of PINNED_SERVERS) {
    const tile = el(`
      <button class="rail-tile" style="background:${s.bg};color:${s.fg};font-size:${s.letter.length > 2 ? 10 : 15}px">
        ${esc(s.letter)}
        <span class="online-dot"></span>
        <span class="tip">${esc(s.name)} — ${esc(s.addr)}</span>
      </button>`);
    tile.addEventListener('click', () => {
      launchProfile(selectedProfile(), { server: s.addr });
    });
    rail.appendChild(tile);
  }

  /* actions */
  wrap.addEventListener('click', (e) => {
    const go = e.target.closest('[data-go]');
    if (go) { location.hash = `#/${go.dataset.go}`; return; }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    const p = selectedProfile();
    if (act.dataset.act === 'play' || act.dataset.act === 'single') launchProfile(p);
    if (act.dataset.act === 'multi') pickServer(p);
  });

  wrap.querySelector('.hero-quit').addEventListener('click', async () => {
    toast('Closing Quill…', 'info', 1500);
    try { await fetch('api/quit', { method: 'POST' }); } catch { /* demo */ }
    setTimeout(() => window.close(), 300);
  });

  root.appendChild(wrap);
}

/* Profile picker modal (quick-switch from Home). */
function pickProfile(onPicked) {
  const body = el('<div class="version-pick-grid"></div>');
  const m = modal({ title: t('lib.title'), body, size: 'sm' });
  for (const p of state.profiles) {
    const row = el(`
      <div class="version-row ${p.id === state.settings.selectedProfile ? 'selected' : ''}">
        <span class="lib-icon" style="width:30px;height:30px;font-size:13px;border-radius:7px;background:${loaderBg(p.loader)}">${esc(p.name[0].toUpperCase())}</span>
        <div class="grow">
          <div style="font-weight:700">${esc(p.name)}</div>
          <div class="tiny faint">${esc(p.version)} · ${esc(p.loader)}</div>
        </div>
        ${p.id === state.settings.selectedProfile ? icon('check') : ''}
      </div>`);
    row.addEventListener('click', () => { selectProfile(p.id); onPicked(); m.close(); });
    body.appendChild(row);
  }
}

/* Multiplayer quick-join modal. */
function pickServer(profile) {
  const body = el('<div class="version-pick-grid"></div>');
  const m = modal({ title: t('home.multiplayer'), body });
  for (const s of PINNED_SERVERS) {
    const row = el(`
      <div class="version-row">
        <span class="rail-tile" style="width:32px;height:32px;font-size:${s.letter.length > 2 ? 9 : 13}px;background:${s.bg};color:${s.fg};cursor:pointer">${esc(s.letter)}</span>
        <div class="grow">
          <div style="font-weight:700">${esc(s.name)}</div>
          <div class="tiny faint mono">${esc(s.addr)}</div>
        </div>
        ${icon('chevR')}
      </div>`);
    row.addEventListener('click', () => { m.close(); launchProfile(profile, { server: s.addr }); });
    body.appendChild(row);
  }
  const custom = el(`
    <div class="row" style="margin-top:12px">
      <input class="input grow" placeholder="play.example.net" spellcheck="false">
      <button class="btn primary">${icon('play')}<span>Join</span></button>
    </div>`);
  custom.querySelector('button').addEventListener('click', () => {
    const addr = custom.querySelector('input').value.trim();
    if (!addr) return;
    m.close();
    launchProfile(profile, { server: addr });
  });
  body.parentElement.appendChild(custom);
}

function loaderBg(loader) {
  return {
    vanilla: 'linear-gradient(135deg,#5e8d4a,#3c5c30)',
    fabric: 'linear-gradient(135deg,#c9b78a,#8d7c53)',
    forge: 'linear-gradient(135deg,#465a7c,#2c3a52)',
    neoforge: 'linear-gradient(135deg,#c46231,#8a3f1c)',
    quilt: 'linear-gradient(135deg,#9b59d0,#5f3382)',
  }[loader] || 'var(--bg4)';
}
