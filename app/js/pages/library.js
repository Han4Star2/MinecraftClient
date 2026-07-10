/* Library — installations/profiles. Each profile is isolated (own mods dir,
   RAM, Java, args) and stored as open JSON: exportable, importable, and
   editable by hand. No lock-in. */

import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { el, esc, toast, modal, confirmModal, contextMenu, makeSlider, timeAgo, fmtDuration } from '../components.js';
import { state, upsertProfile, removeProfile, newProfileId, selectProfile } from '../state.js';
import { LOADERS, LOADER_COLORS } from '../catalog.js';
import { launchProfile } from '../launch.js';
import { api, isConnected } from '../api.js';

export function render(root) {
  const page = el(`
    <div class="page">
      <div class="page-head">
        <div>
          <div class="page-title">${esc(t('lib.title'))}</div>
          <div class="page-sub">${esc(t('lib.sub'))}</div>
        </div>
        <div class="row">
          <button class="btn ghost b-import">${icon('upload')}<span>${esc(t('lib.import'))}</span></button>
          <button class="btn primary b-new">${icon('plus')}<span>${esc(t('lib.new'))}</span></button>
        </div>
      </div>
      <div class="lib-grid"></div>
    </div>`);

  const grid = page.querySelector('.lib-grid');

  const paint = () => {
    grid.innerHTML = '';
    for (const p of state.profiles) grid.appendChild(profileCard(p, paint));
    const create = el(`<div class="card lib-card create">${icon('plus')}<span style="font-weight:700">${esc(t('lib.new'))}</span></div>`);
    create.addEventListener('click', () => editProfile(null, paint));
    grid.appendChild(create);
  };
  paint();

  page.querySelector('.b-new').addEventListener('click', () => editProfile(null, paint));
  page.querySelector('.b-import').addEventListener('click', () => importProfile(paint));

  root.appendChild(page);
}

function profileCard(p, repaint) {
  const selected = p.id === state.settings.selectedProfile;
  const card = el(`
    <div class="card hover lib-card" style="${selected ? 'border-color:rgba(232,57,74,0.45)' : ''}">
      <div class="lib-top">
        <div class="lib-icon" style="background:${LOADER_COLORS[p.loader] || 'var(--bg4)'}">${esc(p.name[0]?.toUpperCase() || '?')}</div>
        <div class="grow" style="min-width:0">
          <div class="lib-name ellipsis">${esc(p.name)} ${selected ? `<span class="badge red" style="vertical-align:2px">active</span>` : ''}</div>
          <div class="lib-meta">
            <span class="chip mono">${esc(p.version)}</span>
            <span class="chip">${esc(loaderLabel(p.loader))}</span>
          </div>
        </div>
        <button class="icon-btn small b-menu" aria-label="More">${icon('dots')}</button>
      </div>
      <div class="lib-stats">
        <span title="${esc(t('lib.lastPlayed'))}">${icon('clock')}${p.lastPlayed ? esc(timeAgo(p.lastPlayed)) : esc(t('lib.never'))}</span>
        <span title="RAM">${icon('cpu')}${Math.round((p.ramMb || 2048) / 1024 * 10) / 10} GB</span>
        ${p.totalPlayMs ? `<span title="Playtime">${icon('gamepad')}${esc(fmtDuration(p.totalPlayMs))}</span>` : ''}
      </div>
      <div class="lib-actions">
        <button class="btn primary grow b-play">${icon('play')}<span>${esc(t('lib.play'))}</span></button>
        <button class="btn dark b-edit">${icon('edit')}<span>${esc(t('lib.edit'))}</span></button>
      </div>
    </div>`);

  card.querySelector('.b-play').addEventListener('click', () => {
    selectProfile(p.id);
    launchProfile(p);
  });
  card.querySelector('.b-edit').addEventListener('click', () => editProfile(p, repaint));

  const menu = (x, y) => contextMenu(x, y, [
    { label: t('lib.play'), icon: 'play', action: () => { selectProfile(p.id); launchProfile(p); } },
    { label: 'Set active', icon: 'check', action: () => { selectProfile(p.id); repaint(); } },
    { label: t('lib.duplicate'), icon: 'copy', action: () => duplicate(p, repaint) },
    { label: t('lib.export'), icon: 'download', action: () => exportProfile(p) },
    { label: t('lib.openFolder'), icon: 'folder', action: () => openFolder(p) },
    '-',
    { label: t('lib.delete'), icon: 'trash', danger: true, action: async () => {
      if (await confirmModal(t('lib.delete'), `"${p.name}" — ${t('lib.delete')}?`, t('lib.delete'))) {
        await removeProfile(p.id);
        repaint();
      }
    } },
  ]);
  card.querySelector('.b-menu').addEventListener('click', (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    menu(r.left, r.bottom + 4);
  });
  card.addEventListener('contextmenu', (e) => { e.preventDefault(); menu(e.clientX, e.clientY); });

  return card;
}

function loaderLabel(id) {
  return LOADERS.find((l) => l.id === id)?.label || id;
}

/* ------------------------------------------------------- create/edit modal */

function editProfile(existing, repaint) {
  const p = existing
    ? { ...existing }
    : { id: '', name: '', version: state.versions[0]?.id || '1.21.5', loader: 'fabric', ramMb: state.settings.defaultRamMb || 3072, javaPath: '', jvmArgs: '', gameDir: '', lastPlayed: 0, totalPlayMs: 0 };

  const body = el(`
    <div class="col" style="gap:16px">
      <div class="field">
        <label>${esc(t('lib.name'))}</label>
        <input class="input f-name" value="${esc(p.name)}" placeholder="My PvP setup" spellcheck="false">
      </div>
      <div class="row" style="align-items:flex-start">
        <div class="field grow">
          <label>${esc(t('lib.version'))}</label>
          <select class="input f-version">
            ${state.versions.slice(0, 60).map((v) => `<option ${v.id === p.version ? 'selected' : ''}>${esc(v.id)}</option>`).join('')}
          </select>
        </div>
        <div class="field grow">
          <label>${esc(t('lib.loader'))}</label>
          <select class="input f-loader">
            ${LOADERS.map((l) => `<option value="${l.id}" ${l.id === p.loader ? 'selected' : ''}>${esc(l.label)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field">
        <label>${esc(t('lib.ram'))}</label>
        <div class="f-ram"></div>
      </div>
      <details>
        <summary class="muted small" style="cursor:pointer">Advanced (Java, JVM args, game directory)</summary>
        <div class="col" style="gap:12px;margin-top:12px">
          <div class="field">
            <label>Java executable</label>
            <input class="input f-java mono" value="${esc(p.javaPath || '')}" placeholder="auto-detect" spellcheck="false">
            ${state.javas.length ? `<div class="hint">Detected: ${state.javas.map((j) => esc(`${j.version} — ${j.path}`)).join(' · ')}</div>` : ''}
          </div>
          <div class="field">
            <label>Extra JVM arguments</label>
            <input class="input f-args mono" value="${esc(p.jvmArgs || '')}" placeholder="-XX:+UseZGC" spellcheck="false">
          </div>
          <div class="field">
            <label>Game directory</label>
            <input class="input f-dir mono" value="${esc(p.gameDir || '')}" placeholder="default (per-profile)" spellcheck="false">
          </div>
        </div>
      </details>
    </div>`);

  let ram = p.ramMb || 3072;
  body.querySelector('.f-ram').appendChild(
    makeSlider({ min: 1024, max: 16384, step: 512, value: ram, format: (v) => `${(v / 1024).toFixed(1)} GB` }, (v) => { ram = v; }),
  );

  const saveBtn = el(`<button class="btn primary">${esc(existing ? t('lib.saveChanges') : t('lib.create'))}</button>`);
  const cancelBtn = el(`<button class="btn ghost">${esc(t('common.cancel'))}</button>`);
  const m = modal({ title: existing ? `${t('lib.edit')} — ${existing.name}` : t('lib.new'), body, footer: [cancelBtn, saveBtn] });
  cancelBtn.addEventListener('click', () => m.close());

  saveBtn.addEventListener('click', async () => {
    const name = body.querySelector('.f-name').value.trim() || 'Unnamed';
    const updated = {
      ...p,
      name,
      id: p.id || newProfileId(name),
      version: body.querySelector('.f-version').value,
      loader: body.querySelector('.f-loader').value,
      ramMb: ram,
      javaPath: body.querySelector('.f-java').value.trim(),
      jvmArgs: body.querySelector('.f-args').value.trim(),
      gameDir: body.querySelector('.f-dir').value.trim(),
    };
    await upsertProfile(updated);
    if (!existing) selectProfile(updated.id);
    m.close();
    repaint();
    toast(existing ? t('set.saved') : `${updated.name} — ${t('lib.create')} ✓`);
  });
}

function duplicate(p, repaint) {
  const copy = { ...p, id: newProfileId(`${p.name} copy`), name: `${p.name} (copy)`, lastPlayed: 0, totalPlayMs: 0 };
  upsertProfile(copy).then(repaint);
}

/* ------------------------------------------------------------ import/export */

function exportProfile(p) {
  const data = JSON.stringify({ quillProfile: 1, profile: { ...p, lastPlayed: 0, totalPlayMs: 0 } }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${p.id}.quill.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast(t('lib.export') + ' ✓');
}

function importProfile(repaint) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json,application/json';
  inp.addEventListener('change', async () => {
    const file = inp.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const p = data.profile || data; // accept bare profile JSON too
      if (!p.version) throw new Error('missing "version"');
      p.name = p.name || file.name.replace(/\.quill\.json$|\.json$/i, '');
      p.id = newProfileId(p.name);
      p.lastPlayed = 0;
      p.totalPlayMs = p.totalPlayMs || 0;
      await upsertProfile(p);
      repaint();
      toast(`${p.name} imported`);
    } catch (e) {
      toast(`Import failed: ${e.message}`, 'err');
    }
  });
  inp.click();
}

async function openFolder(p) {
  if (!isConnected()) { toast(t('common.demo'), 'info'); return; }
  try {
    const res = await api.post(`api/profiles/${encodeURIComponent(p.id)}/open`);
    toast(res.path ? `Folder: ${res.path}` : 'Opened');
  } catch (e) {
    toast(e.message, 'err');
  }
}
