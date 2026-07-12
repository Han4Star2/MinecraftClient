/* Servers — save your servers, see live status/ping/player counts (real
   Server List Ping via the backend), favorite them, and jump straight in:
   Join launches the active instance with the address wired through
   --server / QuickPlay. Direct connect included. */

import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { el, esc, toast, modal } from '../components.js';
import { state, myServers, addServer, removeServer, toggleServerFav, setServerProfile, selectedProfile } from '../state.js';
import { PINNED_SERVERS } from '../catalog.js';
import { launchProfile } from '../launch.js';
import { api, isConnected } from '../api.js';

export function render(root) {
  const page = el(`
    <div class="page" style="max-width:980px">
      <div class="page-head">
        <div>
          <div class="page-title">${esc(t('sv.title'))}</div>
          <div class="page-sub">${esc(t('sv.sub'))}</div>
        </div>
        <div class="row">
          <button class="btn ghost b-refresh">${icon('refresh')}<span>Ping all</span></button>
          <button class="btn primary b-add">${icon('plus')}<span>${esc(t('sv.add'))}</span></button>
        </div>
      </div>

      <div class="card pad row" style="gap:10px;margin-bottom:18px">
        <div class="search-box grow" style="min-width:200px">
          ${icon('globe')}
          <input class="input f-direct mono" placeholder="play.example.net:25565" spellcheck="false">
        </div>
        <button class="btn green b-direct">${icon('play')}<span>${esc(t('sv.direct'))}</span></button>
      </div>

      <div class="sv-list"></div>

      <div class="mods-section-label">Recommended servers</div>
      <div class="sv-list sv-recommended"></div>
    </div>`);

  const listBox = page.querySelector('.sv-list');
  const recBox = page.querySelector('.sv-recommended');

  function paint() {
    listBox.innerHTML = '';
    const servers = [...myServers()].sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0));
    if (!servers.length) {
      listBox.innerHTML = `<div class="card"><div class="empty">${icon('globe')}<div class="e-title">${esc(t('sv.none'))}</div><div>${esc(t('sv.noneSub'))}</div></div></div>`;
    } else {
      const card = el('<div class="card"></div>');
      for (const s of servers) card.appendChild(serverRow(s, paint, true));
      listBox.appendChild(card);
    }

    recBox.innerHTML = '';
    const rec = el('<div class="card"></div>');
    for (const p of PINNED_SERVERS) {
      rec.appendChild(serverRow({ id: `pin-${p.id}`, name: p.name, addr: p.addr, pinned: true }, paint, false));
    }
    recBox.appendChild(rec);
  }
  paint();

  page.querySelector('.b-add').addEventListener('click', () => {
    const body = el(`
      <div class="col" style="gap:14px">
        <div class="field"><label>${esc(t('sv.name'))}</label><input class="input f-name" placeholder="My SMP" spellcheck="false"></div>
        <div class="field"><label>${esc(t('sv.addr'))}</label><input class="input f-addr mono" placeholder="play.example.net:25565" spellcheck="false"></div>
      </div>`);
    const add = el(`<button class="btn primary">${esc(t('sv.add'))}</button>`);
    const m = modal({ title: t('sv.add'), body, footer: [add], size: 'sm' });
    add.addEventListener('click', () => {
      const addr = body.querySelector('.f-addr').value.trim();
      if (!addr) { toast(t('sv.addrMissing'), 'err'); return; }
      addServer({ name: body.querySelector('.f-name').value.trim(), addr });
      m.close();
      paint();
    });
  });

  page.querySelector('.b-refresh').addEventListener('click', paint);

  const direct = page.querySelector('.f-direct');
  const joinDirect = () => {
    const addr = direct.value.trim();
    if (!addr) return;
    join(addr);
  };
  page.querySelector('.b-direct').addEventListener('click', joinDirect);
  direct.addEventListener('keydown', (e) => { if (e.key === 'Enter') joinDirect(); });

  root.appendChild(page);
}

function join(addr, profileId = '') {
  // Server profile system: a server bound to an instance always launches
  // that instance (its own mods, packs, shaders) — Hypixel starts with the
  // Hypixel setup, no matter what is globally active.
  const p = (profileId && state.profiles.find((x) => x.id === profileId)) || selectedProfile();
  if (!p) { location.hash = '#/library'; return; }
  toast(`${t('sv.joining')} ${addr} — ${p.name}`, 'info');
  launchProfile(p, { server: addr });
}

function serverRow(s, repaint, editable) {
  const row = el(`
    <div class="friend-row">
      <div class="lib-icon" style="width:38px;height:38px;font-size:15px;background:linear-gradient(135deg,#2e7d40,#1c4f28)">${esc((s.name || '?')[0].toUpperCase())}</div>
      <div class="grow" style="min-width:0">
        <div class="friend-name ellipsis">${esc(s.name)} ${s.fav ? '<span style="color:var(--gold)">★</span>' : ''}${s.pinned ? ' <span class="badge outline">recommended</span>' : ''}</div>
        <div class="friend-sub mono sv-status">${esc(s.addr)} · …</div>
      </div>
      ${editable ? `
        <select class="input sv-profile" title="Instance for this server — its own mods, packs & shaders" style="width:130px;flex:none">
          <option value="">Active instance</option>
          ${state.profiles.map((p) => `<option value="${esc(p.id)}" ${p.id === s.profileId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
        </select>
        <button class="icon-btn small b-fav" title="Favorite">${icon('star')}</button>` : `<button class="icon-btn small b-save" title="${esc(t('sv.save'))}">${icon('plus')}</button>`}
      <button class="btn small green b-join">${icon('play')}<span>${esc(t('sv.join'))}</span></button>
      ${editable ? `<button class="icon-btn small b-del" title="${esc(t('lib.delete'))}">${icon('trash')}</button>` : ''}
    </div>`);

  row.querySelector('.sv-profile')?.addEventListener('change', (e) => setServerProfile(s.id, e.target.value));

  const status = row.querySelector('.sv-status');
  if (isConnected()) {
    const [host, port] = s.addr.split(':');
    api.get(`api/ping?host=${encodeURIComponent(host)}${port ? `&port=${encodeURIComponent(port)}` : ''}`).then((r) => {
      status.textContent = r.online
        ? `${s.addr} · ${r.players.online.toLocaleString()}/${r.players.max.toLocaleString()} online · ${r.latencyMs} ms`
        : `${s.addr} · ${r.error || 'offline'}`;
      status.style.color = r.online ? 'var(--green)' : '';
    }).catch(() => { status.textContent = `${s.addr} · ping failed`; });
  } else {
    status.textContent = `${s.addr} · ${t('common.demo')}`;
  }

  row.querySelector('.b-join').addEventListener('click', () => join(s.addr, s.profileId));
  row.querySelector('.b-fav')?.addEventListener('click', () => { toggleServerFav(s.id); repaint(); });
  row.querySelector('.b-del')?.addEventListener('click', () => { removeServer(s.id); repaint(); });
  row.querySelector('.b-save')?.addEventListener('click', () => {
    addServer({ name: s.name, addr: s.addr });
    toast(`${s.name} ${t('sv.saved')}`);
    repaint();
  });
  return row;
}
