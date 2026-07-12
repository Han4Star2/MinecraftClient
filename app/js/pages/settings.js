/* Settings — general, performance, Minecraft, network, account, about.
   Every value is plain JSON in the open store; nothing is hidden. */

import { icon } from '../icons.js';
import { t, languages } from '../i18n.js';
import { el, esc, toast, settingRow, control, makeSlider, makeSwitch } from '../components.js';
import { state, save } from '../state.js';
import { api, isConnected, serverStatus } from '../api.js';
import { APP_VERSION } from '../version.js';
import { FPS_BOOST_LEVELS } from '../catalog.js';

const CATS = [
  { id: 'general', label: 'set.general', icon: 'settings' },
  { id: 'performance', label: 'set.performance', icon: 'zap' },
  { id: 'minecraft', label: 'set.minecraft', icon: 'box' },
  { id: 'network', label: 'set.network', icon: 'wifi' },
  { id: 'account', label: 'set.account', icon: 'user' },
  { id: 'about', label: 'set.about', icon: 'info' },
];

export function render(root) {
  const q = new URLSearchParams(location.hash.split('?')[1] || '');
  let cat = CATS.some((c) => c.id === q.get('cat')) ? q.get('cat') : 'general';

  const page = el(`
    <div class="page">
      <div class="page-head">
        <div>
          <div class="page-title">${esc(t('set.title'))}</div>
        </div>
      </div>
      <div class="settings-layout">
        <div class="settings-nav"></div>
        <div class="settings-main"></div>
      </div>
    </div>`);

  const nav = page.querySelector('.settings-nav');
  const main = page.querySelector('.settings-main');

  for (const c of CATS) {
    const item = el(`<button class="nav-item ${c.id === cat ? 'active' : ''}" data-cat="${c.id}">${icon(c.icon)}<span class="nav-label">${esc(t(c.label))}</span></button>`);
    item.addEventListener('click', () => {
      cat = c.id;
      nav.querySelectorAll('.nav-item').forEach((n) => n.classList.toggle('active', n.dataset.cat === cat));
      paint();
    });
    nav.appendChild(item);
  }

  const s = state.settings;
  const group = (title) => {
    const g = el(`<div class="settings-group"><h3>${esc(title)}</h3><div class="card"></div></div>`);
    main.appendChild(g);
    return g.querySelector('.card');
  };

  function paint() {
    main.innerHTML = '';
    if (cat === 'general') paintGeneral();
    if (cat === 'performance') paintPerformance();
    if (cat === 'minecraft') paintMinecraft();
    if (cat === 'network') paintNetwork();
    if (cat === 'account') paintAccount();
    if (cat === 'about') paintAbout();
  }

  /* ---------------------------------------------------------------- general */
  function paintGeneral() {
    const g = group(t('set.general'));
    g.appendChild(settingRow(t('set.language'), t('set.language.d'),
      control({ t: 'select', opts: ['auto', ...languages.map((l) => l.id)] }, s.language, (v) => { s.language = v; save('settings'); })));
    g.appendChild(settingRow('Theme', 'Dark, Midnight, Sandstone or Light — plus the accent color below',
      control({ t: 'select', opts: ['dark', 'midnight', 'sand', 'light'] }, s.theme || 'dark', (v) => { s.theme = v; save('settings'); })));
    g.appendChild(settingRow(t('set.animations'), t('set.animations.d'),
      makeSwitch(s.animations, (v) => { s.animations = v; save('settings'); })));
    const accent = settingRow(t('set.accent'), t('set.accent.d'),
      control({ t: 'color' }, s.accent, (v) => { s.accent = v; save('settings'); }));
    const presets = el(`<div class="row" style="gap:6px">${['#e8394a', '#4b7bec', '#2fa866', '#9b59d0', '#e7b23c'].map((c) => `<button class="icon-btn small" data-c="${c}" style="background:${c};border-color:transparent;width:22px;height:22px"></button>`).join('')}</div>`);
    presets.addEventListener('click', (e) => {
      const b = e.target.closest('[data-c]');
      if (!b) return;
      s.accent = b.dataset.c;
      save('settings');
      paint();
    });
    accent.querySelector('.s-ctrl').prepend(presets);
    g.appendChild(accent);
    g.appendChild(settingRow(t('set.keepOpen'), t('set.keepOpen.d'),
      makeSwitch(s.keepOpen, (v) => { s.keepOpen = v; save('settings'); })));
    g.appendChild(settingRow('Auto-update launcher', 'Pull releases from GitHub — no silent updates',
      makeSwitch(s.autoUpdate, (v) => { s.autoUpdate = v; save('settings'); })));

    const g2 = group('Privacy');
    g2.appendChild(el(`<div class="setting-row"><div class="s-label"><div class="name">Telemetry</div><div class="desc">Horus collects nothing. There is no analytics code to turn off.</div></div><span class="badge free">NONE — EVER</span></div>`));
  }

  /* ------------------------------------------------------------ performance */
  function paintPerformance() {
    const g = group(t('set.performance'));

    const boostIdx = Math.max(0, FPS_BOOST_LEVELS.findIndex((l) => l.id === (s.fpsBoost || 'off')));
    const boostRow = settingRow('FPS Boost', FPS_BOOST_LEVELS[boostIdx].tip,
      makeSlider({ min: 0, max: FPS_BOOST_LEVELS.length - 1, step: 1, value: boostIdx, format: (v) => FPS_BOOST_LEVELS[v].label },
        (v) => { s.fpsBoost = FPS_BOOST_LEVELS[v].id; save('settings'); paintBoostRow(v); }));
    g.appendChild(boostRow);
    const boostName = boostRow.querySelector('.s-label .name');
    const boostDesc = boostRow.querySelector('.s-label .desc');
    function paintBoostRow(idx) {
      const lvl = FPS_BOOST_LEVELS[idx];
      boostDesc.textContent = lvl.tip;
      boostName.querySelectorAll('.badge').forEach((b) => b.remove());
      if (lvl.id === 'extra') boostName.insertAdjacentHTML('beforeend', ' <span class="badge gold">Not recommended</span>');
      if (lvl.id === 'extraHigh') boostName.insertAdjacentHTML('beforeend', ' <span class="badge red">FPS tests only</span>');
    }
    paintBoostRow(boostIdx);
    g.appendChild(el(`<div class="tiny faint" style="padding:2px 0 6px">Forces off matching built-in modules (Mods page) and HUD elements (HUD Editor) above their threshold — your own on/off choices are remembered and come straight back when you lower this again.</div>`));

    const sys = serverStatus();
    const maxRam = sys?.totalMemMb ? Math.min(sys.totalMemMb, 32768) : 16384;
    const ramRow = settingRow(t('set.ram'), t('set.ram.d'),
      makeSlider({ min: 1024, max: maxRam, step: 512, value: s.defaultRamMb, format: (v) => `${(v / 1024).toFixed(1)} GB` }, (v) => { s.defaultRamMb = v; save('settings'); }));
    g.appendChild(ramRow);
    if (sys?.totalMemMb) ramRow.querySelector('.s-label .desc').textContent = `System memory: ${(sys.totalMemMb / 1024).toFixed(0)} GB`;
    g.appendChild(settingRow('Garbage collector', 'G1 is a safe default; ZGC shines on big heaps',
      control({ t: 'select', opts: ['G1', 'ZGC', 'Shenandoah', 'Parallel'] }, s.gc, (v) => { s.gc = v; save('settings'); })));
    g.appendChild(settingRow('Worker threads', '0 = automatic',
      control({ t: 'slider', min: 0, max: 16, def: 0 }, s.threads, (v) => { s.threads = v; save('settings'); })));
    g.appendChild(settingRow('FPS cap', '0 = unlimited',
      control({ t: 'slider', min: 0, max: 480, def: 0 }, s.fpsCap, (v) => { s.fpsCap = v; save('settings'); })));
    g.appendChild(settingRow('VSync', null, makeSwitch(s.vsync, (v) => { s.vsync = v; save('settings'); })));

    const g2 = group('Launcher footprint');
    g2.appendChild(el(`<div class="setting-row"><div class="s-label"><div class="name">Why Horus stays light</div><div class="desc">No Electron, no bundled browser: the backend is a dependency-free Node process (~35 MB RSS) and this UI runs in the browser/webview you already have. Turn off animations above to go even lower.</div></div><span class="badge free">~35 MB</span></div>`));
  }

  /* -------------------------------------------------------------- minecraft */
  function paintMinecraft() {
    const g = group(t('set.minecraft'));
    g.appendChild(settingRow('Java executable', state.javas.length ? `Detected: ${state.javas.map((j) => j.version).join(', ')}` : 'Leave empty to auto-detect',
      control({ t: 'text' }, s.javaPath, (v) => { s.javaPath = v; save('settings'); })));
    g.appendChild(settingRow('Global JVM arguments', 'Appended to every profile',
      control({ t: 'text' }, s.jvmArgs, (v) => { s.jvmArgs = v; save('settings'); })));
    g.appendChild(settingRow('Resolution', null,
      control({ t: 'select', opts: ['auto', '1280×720', '1600×900', '1920×1080', '2560×1440'] }, s.resolution, (v) => { s.resolution = v; save('settings'); })));
    g.appendChild(settingRow('Fullscreen', null, makeSwitch(s.fullscreen, (v) => { s.fullscreen = v; save('settings'); })));
    g.appendChild(settingRow('Shared game directory', 'Empty = isolated per-profile directories (recommended). Point it at your existing .minecraft to reuse it — Horus speaks the vanilla format.',
      control({ t: 'text' }, s.gameDir, (v) => { s.gameDir = v; save('settings'); })));
  }

  /* ---------------------------------------------------------------- network */
  function paintNetwork() {
    const g = group(t('set.network'));
    g.appendChild(settingRow('Proxy', 'http://host:port — applies to downloads',
      control({ t: 'text' }, s.proxy, (v) => { s.proxy = v; save('settings'); })));
    g.appendChild(settingRow('Parallel downloads', null,
      control({ t: 'slider', min: 1, max: 16, def: 4 }, s.downloadConcurrency, (v) => { s.downloadConcurrency = v; save('settings'); })));
    g.appendChild(settingRow('Version meta mirror', 'Alternative to piston-meta.mojang.com — no vendor lock-in, point Horus anywhere',
      control({ t: 'text' }, s.metaMirror, (v) => { s.metaMirror = v; save('settings'); })));
    g.appendChild(settingRow('CurseForge API key', 'Free at console.curseforge.com — enables the CurseForge tab in Content (Modrinth needs no key)',
      control({ t: 'text' }, s.curseforgeKey, (v) => { s.curseforgeKey = v.trim(); save('settings'); })));

    const gc = group('Content platform');
    gc.appendChild(settingRow('Content registry', 'Empty = your own local registry. Point at a shared, self-hostable registry that speaks the same open API.',
      control({ t: 'text' }, s.contentRegistry, (v) => { s.contentRegistry = v.trim(); save('settings'); })));
    gc.appendChild(settingRow('I moderate this registry', 'Enables the review queue (approve / reject / verify uploads). Turn off on a public registry served to others.',
      makeSwitch(s.contentAdmin !== false, (v) => { s.contentAdmin = v; save('settings'); })));
    gc.appendChild(settingRow('Auto-update installed content', 'Keep installed mods, packs & shaders on their latest reviewed version',
      makeSwitch(s.autoUpdateContent !== false, (v) => { s.autoUpdateContent = v; save('settings'); })));

    const g2 = group('Cache');
    const row = el(`<div class="setting-row"><div class="s-label"><div class="name">Download cache</div><div class="desc">Verified files are reused across profiles</div></div><div class="s-ctrl"></div></div>`);
    const btn = el(`<button class="btn small ghost">${icon('trash')}<span>Clear cache</span></button>`);
    btn.addEventListener('click', async () => {
      if (!isConnected()) { toast(t('common.demo'), 'info'); return; }
      try {
        const res = await api.post('api/cache/clear');
        toast(`Cache cleared (${res.freedMb ?? 0} MB freed)`);
      } catch (e) { toast(e.message, 'err'); }
    });
    row.querySelector('.s-ctrl').appendChild(btn);
    g2.appendChild(row);
  }

  /* ---------------------------------------------------------------- account */
  function paintAccount() {
    const g = group(t('set.account'));
    g.appendChild(settingRow('Player name', 'Used for offline sessions and the UI',
      control({ t: 'text' }, s.accountName, (v) => { s.accountName = v.trim() || 'Player'; save('settings'); })));
    g.appendChild(settingRow('Session type', 'Offline plays singleplayer & offline-mode servers without any account',
      control({ t: 'select', opts: ['offline', 'msa'] }, s.accountType, (v) => { s.accountType = v; save('settings'); paint(); })));

    if (s.accountType === 'msa') {
      const g2 = group('Microsoft sign-in (device code)');
      g2.appendChild(settingRow('Azure client ID', 'Open source ships no secrets: register a free Azure app (public client, device-code flow) and paste its ID — or use any client ID you already trust.',
        control({ t: 'text' }, s.msaClientId, (v) => { s.msaClientId = v.trim(); save('settings'); })));
      const row = el(`<div class="setting-row"><div class="s-label"><div class="name">Sign in</div><div class="desc msa-desc">Starts the device-code flow on the backend</div></div><div class="s-ctrl"></div></div>`);
      const btn = el(`<button class="btn primary small">${icon('key')}<span>Sign in with Microsoft</span></button>`);
      btn.addEventListener('click', async () => {
        if (!isConnected()) { toast(t('common.demo'), 'info'); return; }
        if (!s.msaClientId) { toast('Set an Azure client ID first', 'err'); return; }
        btn.disabled = true;
        try {
          const res = await api.post('api/msa/start');
          row.querySelector('.msa-desc').innerHTML =
            `Go to <b>${esc(res.verification_uri)}</b> and enter code <b class="mono">${esc(res.user_code)}</b> — Horus finishes automatically.`;
          const poll = setInterval(async () => {
            try {
              const st = await api.get('api/msa/status');
              if (st.state === 'done') {
                clearInterval(poll);
                s.accountName = st.name || s.accountName;
                save('settings');
                toast(`Signed in as ${st.name}`, 'ok');
                paint();
              } else if (st.state === 'failed') {
                clearInterval(poll);
                toast(st.error || 'Sign-in failed', 'err');
                btn.disabled = false;
              }
            } catch { /* keep polling */ }
          }, 3000);
        } catch (e) {
          toast(e.message, 'err');
          btn.disabled = false;
        }
      });
      row.querySelector('.s-ctrl').appendChild(btn);
      g2.appendChild(row);
    }
  }

  /* ------------------------------------------------------------------ about */
  function paintAbout() {
    main.appendChild(el(`
      <div class="settings-group">
        <div class="card about-hero">
          <span style="color:#fff">${icon('logo')}</span>
          <div>
            <div style="font-size:19px;font-weight:800">Horus Launcher <span class="muted" style="font-weight:400">v${APP_VERSION}</span></div>
            <div class="muted small">An open, feather-light Minecraft launcher. MIT licensed — the whole thing, not just parts.</div>
            <div class="row" style="margin-top:8px;gap:8px">
              <span class="badge free">MIT</span>
              <span class="badge outline">0 dependencies</span>
              <span class="badge outline">no telemetry</span>
              <span class="badge outline">no account required</span>
            </div>
          </div>
        </div>
      </div>`));

    const fixes = [
      ['Proprietary, closed source', 'Fully open source under MIT — audit it, fork it, ship it.'],
      ['Paid cosmetics', 'Every cape, hat and wing is free, stored as local JSON.'],
      ['Heavy launcher (Electron)', 'Zero-dependency Node core + your own browser/webview: a fraction of the RAM.'],
      ['Ecosystem lock-in', 'Vanilla .minecraft format, standard mods folder, JSON import/export, configurable meta mirrors.'],
      ['Fragile with big modpacks', 'Real loaders (Fabric/Forge/Quilt/NeoForge), per-profile isolation, plain jars from Modrinth.'],
      ['Forced online account', 'Offline sessions built in; Microsoft login is optional and self-configured.'],
    ];
    const g = el(`<div class="settings-group"><h3>Feather weaknesses → fixed in Horus</h3><div class="fix-list"></div></div>`);
    for (const [weak, fix] of fixes) {
      g.querySelector('.fix-list').appendChild(el(`
        <div class="card fix-row">${icon('check')}<div><div class="fx-weak">${esc(weak)}</div><div class="fx-fix">${esc(fix)}</div></div></div>`));
    }
    main.appendChild(g);

    main.appendChild(el(`
      <div class="settings-group"><h3>Stack</h3>
        <div class="card pad small muted">
          Backend: Node.js, zero npm dependencies — HTTP + SSE server, SHA-1-verified downloader,
          minimal ZIP reader, Mojang/Fabric meta resolution, offline &amp; MSA auth, process supervisor.<br>
          Frontend: vanilla JS + CSS, no build step, ~60 KB total. Runs in any modern browser or webview.
        </div>
      </div>`));
  }

  paint();
  root.appendChild(page);
}
