/* Mods — built-in client modules in a Feather-style card grid, plus the real
   per-profile jar manager (standard mods folder) and Modrinth search when the
   backend is connected. */

import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { el, esc, toast, modal, settingRow, control } from '../components.js';
import {
  state, modEnabled, setModEnabled, modConfig, setModConfigValue,
  toggleFavorite, isFavorite, selectedProfile,
} from '../state.js';
import { MODS, MOD_CATS } from '../catalog.js';
import { api, isConnected } from '../api.js';

let cat = 'all';
let query = '';
let favsOnly = false;

export function render(root) {
  const page = el(`
    <div class="page">
      <div class="page-head">
        <div>
          <div class="page-title">${esc(t('mods.title'))}</div>
          <div class="page-sub">${esc(t('mods.sub'))}</div>
        </div>
        <span class="chip">${icon('box')}<span class="p-name"></span></span>
      </div>

      <div class="mods-toolbar">
        <div class="tabs t-cats"></div>
        <div class="search-box">
          ${icon('search')}
          <input class="input" placeholder="${esc(t('mods.search'))}" spellcheck="false">
        </div>
        <button class="icon-btn b-favs" title="Favorites">${icon('heart')}</button>
      </div>

      <div class="mod-grid"></div>

      <div class="installed-wrap"></div>
      <div class="modrinth-wrap"></div>
    </div>`);

  page.querySelector('.p-name').textContent = selectedProfile()?.name || '—';

  /* category tabs */
  const tabs = page.querySelector('.t-cats');
  for (const c of MOD_CATS) {
    const b = el(`<button class="tab ${c.id === cat ? 'active' : ''}">${esc(c.label)}</button>`);
    b.addEventListener('click', () => {
      cat = c.id;
      tabs.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      paint();
    });
    tabs.appendChild(b);
  }

  const search = page.querySelector('.search-box input');
  search.value = query;
  search.addEventListener('input', () => { query = search.value.toLowerCase(); paint(); });

  const favBtn = page.querySelector('.b-favs');
  favBtn.classList.toggle('active', favsOnly);
  favBtn.addEventListener('click', () => {
    favsOnly = !favsOnly;
    favBtn.classList.toggle('active', favsOnly);
    paint();
  });

  const grid = page.querySelector('.mod-grid');

  function paint() {
    grid.innerHTML = '';
    const list = MODS.filter((m) => {
      if (cat === 'new' && !m.isNew) return false;
      if (cat !== 'all' && cat !== 'new' && m.cat !== cat) return false;
      if (favsOnly && !isFavorite(m.id)) return false;
      if (query && !(`${m.name} ${m.desc || ''}`).toLowerCase().includes(query)) return false;
      return true;
    });
    if (!list.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">${icon('search')}<div class="e-title">No mods found</div><div>Try a different search or category.</div></div>`;
      return;
    }
    for (const m of list) grid.appendChild(modCard(m));
  }
  paint();

  renderInstalled(page.querySelector('.installed-wrap'));
  renderModrinth(page.querySelector('.modrinth-wrap'));

  root.appendChild(page);
}

/* --------------------------------------------------------------- mod cards */

function modCard(m) {
  const card = el(`
    <div class="card hover mod-card">
      ${m.isNew ? '<span class="badge new new-flag">NEW!</span>' : ''}
      <div class="mod-head">
        <span class="mod-title ellipsis" title="${esc(m.desc || '')}">${esc(m.name)}</span>
        <button class="heart-btn ${isFavorite(m.id) ? 'faved' : ''}" aria-label="Favorite">${icon('heart')}</button>
      </div>
      <div class="mod-art">${icon(m.icon)}</div>
      <div class="mod-foot">
        <button class="icon-btn small b-cfg" title="${esc(t('mods.configure'))}">${icon('gear')}</button>
        <button class="state-btn ${modEnabled(m) ? 'on' : ''}"></button>
      </div>
    </div>`);

  const stateBtn = card.querySelector('.state-btn');
  const paintState = () => {
    const on = modEnabled(m);
    stateBtn.classList.toggle('on', on);
    stateBtn.textContent = on ? t('mods.enabled') : t('mods.disabled');
  };
  paintState();
  stateBtn.addEventListener('click', () => { setModEnabled(m, !modEnabled(m)); paintState(); });

  card.querySelector('.heart-btn').addEventListener('click', (e) => {
    toggleFavorite(m.id);
    e.currentTarget.classList.toggle('faved', isFavorite(m.id));
  });

  card.querySelector('.b-cfg').addEventListener('click', () => openConfig(m, paintState));
  return card;
}

/* Schema-driven per-mod settings dialog. */
function openConfig(m, onToggle) {
  const body = el('<div></div>');
  const values = modConfig(m);

  const head = el(`
    <div class="row" style="margin-bottom:8px">
      <div class="mod-art" style="height:56px;width:56px;flex:none">${icon(m.icon)}</div>
      <div class="grow">
        <div class="muted small">${esc(m.desc || '')}</div>
        <div class="tiny faint" style="margin-top:2px">Module · ${esc(m.cat.toUpperCase())}</div>
      </div>
    </div>`);
  body.appendChild(head);

  const enabledCtrl = control({ t: 'toggle' }, modEnabled(m), (v) => { setModEnabled(m, v); onToggle?.(); });
  body.appendChild(settingRow(t('mods.enabled'), null, enabledCtrl));

  const schema = m.cfg && m.cfg.length ? m.cfg : [
    { k: 'scale', t: 'slider', label: t('hud.scale'), min: 50, max: 200, def: 100, unit: '%' },
    { k: 'color', t: 'color', label: t('hud.color'), def: '#ffffff' },
  ];
  for (const def of schema) {
    body.appendChild(settingRow(def.label, null, control(def, values[def.k] ?? def.def, (v) => setModConfigValue(m, def.k, v))));
  }

  modal({ title: m.name, body });
}

/* ---------------------------------------------------- installed jars (real) */

async function renderInstalled(host) {
  const profile = selectedProfile();
  host.innerHTML = `<div class="mods-section-label">${esc(t('mods.installed'))} — mods/</div>`;

  if (!isConnected()) {
    host.appendChild(el(`<div class="card pad muted small">${esc(t('common.demo'))} — the jar manager (enable/disable/delete files in the profile's <span class="mono">mods/</span> folder) appears here.</div>`));
    return;
  }

  const box = el('<div class="card"></div>');
  host.appendChild(box);
  try {
    const { mods } = await api.get(`api/profiles/${encodeURIComponent(profile.id)}/mods`);
    if (!mods.length) {
      box.innerHTML = `<div class="empty">${icon('package')}<div class="e-title">No jars yet</div><div>Drop .jar files into the profile's mods folder or install from Modrinth below.</div></div>`;
      return;
    }
    for (const jar of mods) {
      const row = el(`
        <div class="friend-row">
          <div class="lib-icon" style="width:36px;height:36px;font-size:14px;background:${jar.enabled ? 'var(--green-grad)' : 'var(--bg4)'}">${icon('package')}</div>
          <div class="grow" style="min-width:0">
            <div class="friend-name ellipsis">${esc(jar.name)}</div>
            <div class="friend-sub mono">${esc(jar.file)}${jar.version ? ` · ${esc(jar.version)}` : ''}</div>
          </div>
          <button class="state-btn ${jar.enabled ? 'on' : ''}" style="flex:none;width:110px">${jar.enabled ? esc(t('mods.enabled')) : esc(t('mods.disabled'))}</button>
          <button class="icon-btn small b-del" title="${esc(t('lib.delete'))}">${icon('trash')}</button>
        </div>`);
      row.querySelector('.state-btn').addEventListener('click', async (e) => {
        try {
          const res = await api.post(`api/profiles/${encodeURIComponent(profile.id)}/mods/toggle`, { file: jar.file });
          jar.enabled = res.enabled;
          jar.file = res.file;
          e.target.classList.toggle('on', jar.enabled);
          e.target.textContent = jar.enabled ? t('mods.enabled') : t('mods.disabled');
        } catch (err) { toast(err.message, 'err'); }
      });
      row.querySelector('.b-del').addEventListener('click', async () => {
        try {
          await api.post(`api/profiles/${encodeURIComponent(profile.id)}/mods/delete`, { file: jar.file });
          row.remove();
          toast(`${jar.name} deleted`);
        } catch (err) { toast(err.message, 'err'); }
      });
      box.appendChild(row);
    }
  } catch (e) {
    box.innerHTML = `<div class="pad muted small" style="padding:14px">mods/: ${esc(e.message)}</div>`;
  }
}

/* ------------------------------------------------------------- Modrinth */

function renderModrinth(host) {
  host.innerHTML = `<div class="mods-section-label">${esc(t('mods.getMore'))}</div>`;
  const card = el(`
    <div class="card pad">
      <div class="row">
        <div class="search-box grow">
          ${icon('search')}
          <input class="input" placeholder="${esc(t('mods.browse'))} — sodium, iris, lithium…" spellcheck="false">
        </div>
        <button class="btn dark b-go">${icon('search')}<span>${esc(t('mods.search'))}</span></button>
      </div>
      <div class="mr-results col" style="gap:8px;margin-top:14px"></div>
      <div class="tiny faint" style="margin-top:10px">Open ecosystem: Quill installs standard jars from Modrinth into the profile's <span class="mono">mods/</span> folder — the same files any launcher can use.</div>
    </div>`);
  host.appendChild(card);

  const input = card.querySelector('input');
  const results = card.querySelector('.mr-results');

  const go = async () => {
    const q = input.value.trim();
    if (!q) return;
    if (!isConnected()) { toast(t('common.demo'), 'info'); return; }
    results.innerHTML = `<div class="progress indeterminate"><i></i></div>`;
    try {
      const profile = selectedProfile();
      const { hits } = await api.get(`api/modrinth/search?q=${encodeURIComponent(q)}&version=${encodeURIComponent(profile.version)}&loader=${encodeURIComponent(profile.loader)}`);
      results.innerHTML = '';
      if (!hits.length) { results.innerHTML = '<div class="muted small">No results.</div>'; return; }
      for (const hit of hits.slice(0, 8)) {
        const row = el(`
          <div class="row" style="padding:8px;border:1px solid var(--line);border-radius:9px">
            <div class="lib-icon" style="width:34px;height:34px;font-size:13px;background:var(--bg4)">${esc((hit.title || '?')[0])}</div>
            <div class="grow" style="min-width:0">
              <div style="font-weight:700" class="ellipsis">${esc(hit.title)}</div>
              <div class="tiny faint ellipsis">${esc(hit.description || '')}</div>
            </div>
            <span class="tiny faint nowrap">${Number(hit.downloads || 0).toLocaleString()} ⤓</span>
            <button class="btn small green">${icon('download')}<span>Install</span></button>
          </div>`);
        row.querySelector('button').addEventListener('click', async (e) => {
          e.target.closest('button').disabled = true;
          try {
            await api.post(`api/modrinth/install`, { projectId: hit.project_id, profileId: profile.id });
            toast(`${hit.title} installed to mods/`);
          } catch (err) {
            toast(err.message, 'err');
            e.target.closest('button').disabled = false;
          }
        });
        results.appendChild(row);
      }
    } catch (e) {
      results.innerHTML = `<div class="muted small">Modrinth: ${esc(e.message)}</div>`;
    }
  };
  card.querySelector('.b-go').addEventListener('click', go);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}
