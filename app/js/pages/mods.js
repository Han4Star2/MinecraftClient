/* Mods — built-in client modules in a Feather-style card grid, the
   pre-configured recommended pack (real Modrinth installs incl. required
   dependencies), the per-profile jar manager with update checks, and the
   shader-pack / resource-pack managers. All files are plain zips/jars in the
   standard folders — usable by any launcher. */

import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { el, esc, toast, modal, inputModal, settingRow, control, fmtBytes } from '../components.js';
import {
  state, modEnabled, modLocked, setModEnabled, modConfig, setModConfigValue,
  toggleFavorite, isFavorite, selectedProfile,
  modPresets, saveModPreset, applyModPreset, deleteModPreset,
} from '../state.js';
import { MODS, MOD_CATS, RECOMMENDED_PACK } from '../catalog.js';
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
        <div class="preset-box"></div>
      </div>

      <div class="mod-grid"></div>

      <div class="recommended-wrap"></div>
      <div class="installed-wrap"></div>
      <div class="folder-wrap-shaders"></div>
      <div class="folder-wrap-packs"></div>
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

  renderPresets(page.querySelector('.preset-box'), paint);
  renderRecommended(page.querySelector('.recommended-wrap'));
  renderInstalled(page.querySelector('.installed-wrap'));
  renderFolder(page.querySelector('.folder-wrap-shaders'), 'shaderpacks', 'Shader packs', 'shader');
  renderFolder(page.querySelector('.folder-wrap-packs'), 'resourcepacks', 'Resource packs', 'resourcepack');
  renderModrinth(page.querySelector('.modrinth-wrap'));

  root.appendChild(page);
}

/* ------------------------------------------------------------- mod presets */
/* Save the whole module setup (on/off + config) under a name and switch
   between setups — e.g. "PvP", "Building", "Streaming". */

function renderPresets(host, repaintGrid) {
  const paint = () => {
    host.innerHTML = '';
    const names = Object.keys(modPresets());
    const sel = el(`<select class="input" style="width:130px" title="Module preset">
      <option value="">Preset…</option>
      ${names.map((n) => `<option>${esc(n)}</option>`).join('')}
    </select>`);
    sel.addEventListener('change', () => {
      if (!sel.value) return;
      applyModPreset(sel.value);
      repaintGrid();
      toast(`Preset "${sel.value}" applied`);
      sel.value = '';
    });
    const saveBtn = el(`<button class="icon-btn" title="Save current setup as preset">${icon('save')}</button>`);
    saveBtn.addEventListener('click', async () => {
      const name = await inputModal('Save module preset', { label: 'Current module setup will be saved as', placeholder: 'PvP', okLabel: 'Save' });
      if (!name) return;
      saveModPreset(name);
      paint();
      toast(`Preset "${name}" saved`);
    });
    host.appendChild(sel);
    host.appendChild(saveBtn);
    if (names.length) {
      const delBtn = el(`<button class="icon-btn" title="Delete a preset">${icon('trash')}</button>`);
      delBtn.addEventListener('click', async () => {
        const name = await inputModal('Delete preset', { label: `Which one? (${names.join(', ')})`, okLabel: 'Delete' });
        if (name && modPresets()[name]) {
          deleteModPreset(name);
          paint();
          toast(`Preset "${name}" deleted`);
        }
      });
      host.appendChild(delBtn);
    }
  };
  paint();
}

/* -------------------------------------------------------- recommended pack */
/* The pre-configured collection: one click installs real jars (with required
   dependencies) from Modrinth into this profile's mods folder. */

function renderRecommended(host) {
  const profile = selectedProfile();
  host.innerHTML = `<div class="mods-section-label">Recommended pack — pre-configured like a real client</div>`;
  const card = el(`
    <div class="card pad">
      <div class="row wrap" style="margin-bottom:4px">
        <div class="small muted grow" style="min-width:240px">
          The biggest difference to a plain setup: performance, graphics and comfort mods,
          pre-picked and installed as plain jars with required dependencies resolved automatically.
          Best on a <b>Fabric</b> instance${profile && profile.loader !== 'fabric' ? ` — <span style="color:var(--gold)">"${esc(profile.name)}" uses ${esc(profile.loader)}</span>` : ''}.
        </div>
        <button class="btn primary b-all">${icon('download')}<span>Install all</span></button>
      </div>
      <div class="rec-groups"></div>
      <div class="tiny faint" style="margin-top:8px">Live from Modrinth for ${esc(profile?.version || '?')} — skips anything without a compatible build (e.g. LazyDFU on modern versions). Backend required.</div>
    </div>`);
  host.appendChild(card);

  const groupsBox = card.querySelector('.rec-groups');
  const rows = new Map(); // slug → row element
  for (const group of RECOMMENDED_PACK) {
    groupsBox.appendChild(el(`<div class="rec-group-label">${esc(group.group)}</div>`));
    const grid = el('<div class="rec-grid"></div>');
    for (const item of group.items) {
      const row = el(`
        <div class="rec-item" title="${esc(item.note)}">
          <span class="ellipsis grow"><b>${esc(item.name)}</b><span class="tiny faint rec-note"> — ${esc(item.note)}</span></span>
          <button class="btn small dark b-one" ${isConnected() ? '' : 'disabled'}>${icon('download')}</button>
        </div>`);
      row.querySelector('.b-one').addEventListener('click', () => installOne(item, row));
      rows.set(item.slug, row);
      grid.appendChild(row);
    }
    groupsBox.appendChild(grid);
  }

  async function installOne(item, row) {
    const p = selectedProfile();
    if (!isConnected() || !p) { toast(t('common.demo'), 'info'); return; }
    const btn = row.querySelector('.b-one');
    btn.disabled = true;
    btn.innerHTML = icon('refresh');
    try {
      const res = await api.post('api/modrinth/install', { projectId: item.slug, profileId: p.id });
      btn.innerHTML = icon('check');
      row.classList.add('done');
      const deps = res.dependencies?.length ? ` (+${res.dependencies.length} dependencies)` : '';
      toast(`${item.name} ${res.version}${deps} installed`);
      const { track } = await import('../economy.js');
      track('modsInstalled');
      return true;
    } catch (e) {
      btn.innerHTML = icon('x');
      btn.title = e.message;
      row.classList.add('skip');
      return false;
    }
  }

  card.querySelector('.b-all').addEventListener('click', async (e) => {
    if (!isConnected()) { toast(t('common.demo'), 'info'); return; }
    const btn = e.currentTarget;
    btn.disabled = true;
    let ok = 0;
    let skip = 0;
    for (const group of RECOMMENDED_PACK) {
      for (const item of group.items) {
        (await installOne(item, rows.get(item.slug))) ? ok++ : skip++;
      }
    }
    btn.innerHTML = `${icon('check')}<span>${ok} installed${skip ? `, ${skip} skipped` : ''}</span>`;
    toast(`Recommended pack: ${ok} mods installed${skip ? `, ${skip} without a compatible build` : ''}`, 'ok', 5000);
  });
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
    const locked = modLocked(m);
    stateBtn.classList.toggle('on', on);
    stateBtn.classList.toggle('locked', locked);
    stateBtn.disabled = locked;
    stateBtn.title = locked ? `Locked ${on ? 'on' : 'off'} by FPS Boost — lower it in Settings → Performance to change this` : '';
    stateBtn.textContent = on ? t('mods.enabled') : t('mods.disabled');
  };
  paintState();
  stateBtn.addEventListener('click', () => {
    if (modLocked(m)) return;
    setModEnabled(m, !modEnabled(m));
    paintState();
  });

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

  const locked = modLocked(m);
  const enabledCtrl = control({ t: 'toggle' }, modEnabled(m), (v) => { setModEnabled(m, v); onToggle?.(); });
  if (locked) enabledCtrl.disabled = true;
  body.appendChild(settingRow(t('mods.enabled'), locked ? 'Locked by FPS Boost — lower it in Settings → Performance to change this' : null, enabledCtrl));

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
  host.innerHTML = '';
  const head = el(`
    <div class="mods-section-label" style="display:flex;align-items:center;gap:10px">
      <span class="grow">${esc(t('mods.installed'))} — mods/</span>
      <button class="btn small ghost b-updates">${icon('refresh')}<span>Check updates</span></button>
      <button class="btn small ghost b-open">${icon('folder')}<span>Open folder</span></button>
    </div>`);
  host.appendChild(head);
  head.querySelector('.b-open').addEventListener('click', async () => {
    if (!isConnected()) { toast(t('common.demo'), 'info'); return; }
    try {
      const res = await api.post(`api/profiles/${encodeURIComponent(profile.id)}/open?sub=mods`);
      toast(`Folder: ${res.path}`);
    } catch (e) { toast(e.message, 'err'); }
  });
  head.querySelector('.b-updates').addEventListener('click', () => checkUpdates(profile, head.querySelector('.b-updates')));

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

/* Update check: sha1-identified against Modrinth, applies keep the user's
   enabled/disabled state. */
async function checkUpdates(profile, btn) {
  if (!isConnected()) { toast(t('common.demo'), 'info'); return; }
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Checking…';
  try {
    const { updates } = await api.get(`api/profiles/${encodeURIComponent(profile.id)}/mod-updates`);
    if (!updates.length) {
      btn.querySelector('span').textContent = 'All up to date ✓';
      setTimeout(() => { btn.disabled = false; btn.querySelector('span').textContent = 'Check updates'; }, 2500);
      return;
    }
    const body = el(`<div class="col" style="gap:6px">
      ${updates.map((u) => `
        <div class="version-row"><span class="grow" style="font-weight:600">${esc(u.name)}</span>
        <span class="tiny mono faint">${esc(u.current)} → <b style="color:var(--green)">${esc(u.latest)}</b></span></div>`).join('')}
    </div>`);
    const apply = el(`<button class="btn primary">${icon('download')}<span>Update all (${updates.length})</span></button>`);
    const m = modal({ title: `${updates.length} mod update${updates.length > 1 ? 's' : ''} available`, body, footer: [apply] });
    apply.addEventListener('click', async () => {
      apply.disabled = true;
      try {
        const res = await api.post(`api/profiles/${encodeURIComponent(profile.id)}/mod-updates/apply`);
        toast(`${res.applied.length} mods updated`, 'ok');
        m.close();
        location.reload();
      } catch (e) { toast(e.message, 'err'); apply.disabled = false; }
    });
  } catch (e) {
    toast(e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.querySelector('span').textContent = 'Check updates';
  }
}

/* --------------------------------------- shader & resource pack managers */
/* Plain files in the standard folders: shaderpacks/ and resourcepacks/.
   Enable/disable = .disabled rename; resource packs also get a priority
   order written into the game's options.txt. */

async function renderFolder(host, kind, title, mrType) {
  const profile = selectedProfile();
  host.innerHTML = '';
  const head = el(`
    <div class="mods-section-label" style="display:flex;align-items:center;gap:10px">
      <span class="grow">${esc(title)} — ${esc(kind)}/</span>
      <button class="btn small ghost b-open">${icon('folder')}<span>Open folder</span></button>
    </div>`);
  host.appendChild(head);
  head.querySelector('.b-open').addEventListener('click', async () => {
    if (!isConnected()) { toast(t('common.demo'), 'info'); return; }
    try {
      const res = await api.post(`api/profiles/${encodeURIComponent(profile.id)}/open?sub=${kind}`);
      toast(`Folder: ${res.path}`);
    } catch (e) { toast(e.message, 'err'); }
  });

  const box = el('<div class="card"></div>');
  host.appendChild(box);
  if (!isConnected()) {
    box.innerHTML = `<div class="pad muted small" style="padding:14px">${esc(t('common.demo'))} — drop .zip files into <span class="mono">${esc(kind)}/</span>, then enable, reorder and remove them here. Get more via the search below (source: ${esc(mrType)}).</div>`;
    return;
  }

  async function paint() {
    box.innerHTML = '';
    let items;
    try {
      ({ items } = await api.get(`api/profiles/${encodeURIComponent(profile.id)}/folder/${kind}`));
    } catch (e) {
      box.innerHTML = `<div class="pad muted small" style="padding:14px">${esc(kind)}/: ${esc(e.message)}</div>`;
      return;
    }
    if (!items.length) {
      box.innerHTML = `<div class="empty">${icon(kind === 'shaderpacks' ? 'eye' : 'layers')}<div class="e-title">Nothing here yet</div><div>Import a .zip into <span class="mono">${esc(kind)}/</span> or install from the search below (set source to “${esc(mrType)}”).</div></div>`;
      return;
    }
    const enabledPacks = kind === 'resourcepacks'
      ? items.filter((i) => i.enabled).sort((a, b) => (a.orderIndex < 0 ? 99 : a.orderIndex) - (b.orderIndex < 0 ? 99 : b.orderIndex))
      : null;

    for (const item of items) {
      const row = el(`
        <div class="friend-row">
          <div class="lib-icon" style="width:36px;height:36px;font-size:14px;background:${item.enabled ? 'var(--green-grad)' : 'var(--bg4)'}">${icon(kind === 'shaderpacks' ? 'eye' : 'layers')}</div>
          <div class="grow" style="min-width:0">
            <div class="friend-name ellipsis">${esc(item.name)}</div>
            <div class="friend-sub mono">${esc(item.file)}${item.size ? ` · ${fmtBytes(item.size)}` : ''}${item.isDir ? ' · folder' : ''}</div>
          </div>
          <span class="order-btns"></span>
          <button class="state-btn ${item.enabled ? 'on' : ''}" style="flex:none;width:110px">${item.enabled ? esc(t('mods.enabled')) : esc(t('mods.disabled'))}</button>
          <button class="icon-btn small b-del" title="${esc(t('lib.delete'))}">${icon('trash')}</button>
        </div>`);

      if (enabledPacks && item.enabled && enabledPacks.length > 1) {
        const pos = enabledPacks.indexOf(item);
        const ob = row.querySelector('.order-btns');
        const move = async (dir) => {
          const next = [...enabledPacks];
          const j = pos + dir;
          if (j < 0 || j >= next.length) return;
          [next[pos], next[j]] = [next[j], next[pos]];
          try {
            await api.put(`api/profiles/${encodeURIComponent(profile.id)}/packorder`, { order: next.map((x) => x.file) });
            paint();
          } catch (e) { toast(e.message, 'err'); }
        };
        const up = el(`<button class="icon-btn small" title="Higher priority">${icon('upload')}</button>`);
        const down = el(`<button class="icon-btn small" title="Lower priority">${icon('download')}</button>`);
        up.disabled = pos === 0;
        down.disabled = pos === enabledPacks.length - 1;
        up.addEventListener('click', () => move(-1));
        down.addEventListener('click', () => move(1));
        ob.appendChild(up);
        ob.appendChild(down);
      }

      row.querySelector('.state-btn').addEventListener('click', async () => {
        try {
          await api.post(`api/profiles/${encodeURIComponent(profile.id)}/folder/${kind}/toggle`, { file: item.file });
          paint();
        } catch (e) { toast(e.message, 'err'); }
      });
      row.querySelector('.b-del').addEventListener('click', async () => {
        try {
          await api.post(`api/profiles/${encodeURIComponent(profile.id)}/folder/${kind}/delete`, { file: item.file });
          toast(`${item.name} deleted`);
          paint();
        } catch (e) { toast(e.message, 'err'); }
      });
      box.appendChild(row);
    }
    if (kind === 'resourcepacks') {
      box.appendChild(el(`<div class="tiny faint" style="padding:8px 14px">Order (top = highest priority) is written to the game's <span class="mono">options.txt</span>.</div>`));
    }
  }
  paint();
}

/* ------------------------------------------- mod marketplace (2 sources) */

let source = 'modrinth';
let mrKind = 'mod'; // mod | shader | resourcepack (Modrinth only)

const KIND_DIRS = { mod: 'mods/', shader: 'shaderpacks/', resourcepack: 'resourcepacks/' };

function renderModrinth(host) {
  host.innerHTML = `<div class="mods-section-label">${esc(t('mods.getMore'))}</div>`;
  const card = el(`
    <div class="card pad">
      <div class="row wrap">
        <div class="tabs">
          <button class="tab src-tab ${source === 'modrinth' ? 'active' : ''}" data-src="modrinth">Modrinth</button>
          <button class="tab src-tab ${source === 'curseforge' ? 'active' : ''}" data-src="curseforge">CurseForge</button>
        </div>
        <select class="input t-kind" style="width:150px" title="Content type">
          <option value="mod" ${mrKind === 'mod' ? 'selected' : ''}>Mods</option>
          <option value="shader" ${mrKind === 'shader' ? 'selected' : ''}>Shaders</option>
          <option value="resourcepack" ${mrKind === 'resourcepack' ? 'selected' : ''}>Resource packs</option>
        </select>
        <div class="search-box grow" style="min-width:180px">
          ${icon('search')}
          <input class="input" placeholder="${esc(t('mods.browse'))} — sodium, iris, jei…" spellcheck="false">
        </div>
        <button class="btn dark b-go">${icon('search')}<span>${esc(t('mods.search'))}</span></button>
      </div>
      <div class="mr-results col" style="gap:8px;margin-top:14px"></div>
      <div class="tiny faint src-hint" style="margin-top:10px"></div>
    </div>`);
  host.appendChild(card);

  const input = card.querySelector('input');
  const results = card.querySelector('.mr-results');
  const hint = card.querySelector('.src-hint');
  const kindSel = card.querySelector('.t-kind');
  const paintHint = () => {
    hint.innerHTML = source === 'modrinth'
      ? `Open ecosystem: standard files land in the profile's <span class="mono">${KIND_DIRS[mrKind]}</span> folder — usable by any launcher. Required dependencies install automatically. No API key needed.`
      : 'CurseForge requires a free personal API key (<span class="mono">console.curseforge.com</span>) — set it in Settings → Network. Files are the same plain jars (mods only here).';
  };
  paintHint();

  kindSel.addEventListener('change', () => {
    mrKind = kindSel.value;
    results.innerHTML = '';
    paintHint();
  });
  card.querySelectorAll('.src-tab').forEach((b) => b.addEventListener('click', () => {
    source = b.dataset.src;
    card.querySelectorAll('.src-tab').forEach((x) => x.classList.toggle('active', x === b));
    kindSel.disabled = source === 'curseforge';
    if (source === 'curseforge') { mrKind = 'mod'; kindSel.value = 'mod'; }
    results.innerHTML = '';
    paintHint();
  }));

  const go = async () => {
    const q = input.value.trim();
    if (!q) return;
    if (!isConnected()) { toast(t('common.demo'), 'info'); return; }
    results.innerHTML = `<div class="progress indeterminate"><i></i></div>`;
    try {
      const profile = selectedProfile();
      const { hits } = await api.get(`api/${source}/search?q=${encodeURIComponent(q)}&version=${encodeURIComponent(profile.version)}&loader=${encodeURIComponent(profile.loader)}&type=${mrKind}`);
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
            const payload = source === 'modrinth'
              ? { projectId: hit.project_id, profileId: profile.id, type: mrKind }
              : { modId: hit.project_id, profileId: profile.id };
            const res = await api.post(`api/${source}/install`, payload);
            const { questProgress, track } = await import('../economy.js');
            questProgress('q-mod-install');
            track('modsInstalled');
            const deps = res.dependencies?.length ? ` (+${res.dependencies.length} dependencies)` : '';
            toast(`${hit.title} installed to ${KIND_DIRS[mrKind]}${deps}`);
          } catch (err) {
            toast(err.message, 'err');
            e.target.closest('button').disabled = false;
          }
        });
        results.appendChild(row);
      }
    } catch (e) {
      results.innerHTML = `<div class="muted small">${esc(source)}: ${esc(e.message)}</div>`;
    }
  };
  card.querySelector('.b-go').addEventListener('click', go);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}
