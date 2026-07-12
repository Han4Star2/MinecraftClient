/* Discover — the integrated content platform: a browsable library of
   community mods, resource packs and shaders with filters, verified badges,
   ratings and one-click install; an upload flow with admin review; and
   server packs that bundle content + settings for one-click joining. */

import { icon } from '../icons.js';
import { el, esc, toast, modal, confirmModal } from '../components.js';
import { state, selectedProfile } from '../state.js';
import { isConnected } from '../api.js';
import { launchProfile } from '../launch.js';
import { LOADERS } from '../catalog.js';
import * as content from '../content.js';

const TYPE_META = {
  mod: { label: 'Mods', icon: 'mods', color: 'linear-gradient(135deg,#4b7bec,#2c4f9e)' },
  resourcepack: { label: 'Resource Packs', icon: 'grid', color: 'linear-gradient(135deg,#2fa866,#1c6b40)' },
  shader: { label: 'Shaders', icon: 'drop', color: 'linear-gradient(135deg,#9b59d0,#5f3382)' },
};

let tab = 'mod';
let category = '';
let version = '';
let sort = 'popular';
let query = '';

export function render(root) {
  const admin = isConnected() ? (state.settings.contentAdmin !== false) : true;

  const page = el(`
    <div class="page">
      <div class="page-head">
        <div>
          <div class="page-title">Discover</div>
          <div class="page-sub">Community mods, resource packs and shaders — reviewed for safety, installed in one click. Upload your own; servers can bundle their own packs.</div>
        </div>
        <div class="row">
          <button class="btn ghost b-updates">${icon('refresh')}<span>Check updates</span></button>
          <button class="btn primary b-upload">${icon('upload')}<span>Upload</span></button>
        </div>
      </div>

      <div class="mods-toolbar">
        <div class="tabs t-types"></div>
        <span class="chip right" title="Installing into">${icon('box')}<span class="p-name"></span></span>
      </div>

      <div class="disc-filters row wrap" style="gap:10px;margin-bottom:16px">
        <select class="input f-cat" style="width:auto"><option value="">All categories</option></select>
        <select class="input f-ver" style="width:auto"><option value="">All versions</option></select>
        <select class="input f-sort" style="width:auto">
          <option value="popular">Most popular</option>
          <option value="rating">Top rated</option>
          <option value="newest">Newest</option>
        </select>
        <div class="search-box grow" style="min-width:180px">${icon('search')}<input class="input f-q" placeholder="Search content" spellcheck="false"></div>
        ${admin ? '<button class="btn dark b-review">' + icon('shield') + '<span>Review queue</span><span class="badge red pend-badge hidden"></span></button>' : ''}
      </div>

      <div class="update-banner hidden"></div>
      <div class="disc-body"></div>
    </div>`);

  page.querySelector('.p-name').textContent = selectedProfile()?.name || '—';

  const types = page.querySelector('.t-types');
  for (const [id, m] of [...Object.entries(TYPE_META), ['serverpack', { label: 'Server Packs', icon: 'globe' }]]) {
    const b = el(`<button class="tab ${id === tab ? 'active' : ''}" data-type="${id}">${esc(m.label)}</button>`);
    b.addEventListener('click', () => {
      tab = id;
      types.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      paint();
    });
    types.appendChild(b);
  }

  const catSel = page.querySelector('.f-cat');
  const verSel = page.querySelector('.f-ver');
  const sortSel = page.querySelector('.f-sort');
  for (const v of ['1.21.5', '1.21.1', '1.20.6', '1.20.1', '1.19.2', '1.8.9']) verSel.appendChild(el(`<option>${v}</option>`));
  catSel.value = category; verSel.value = version; sortSel.value = sort;
  catSel.addEventListener('change', () => { category = catSel.value; paint(); });
  verSel.addEventListener('change', () => { version = verSel.value; paint(); });
  sortSel.addEventListener('change', () => { sort = sortSel.value; paint(); });
  const qIn = page.querySelector('.f-q');
  qIn.value = query;
  qIn.addEventListener('input', () => { query = qIn.value; paint(); });

  page.querySelector('.b-upload').addEventListener('click', () => openUpload(paint));
  page.querySelector('.b-updates').addEventListener('click', () => refreshUpdates(page, true));
  page.querySelector('.b-review')?.addEventListener('click', () => openReview(page));

  const body = page.querySelector('.disc-body');

  async function paint() {
    body.innerHTML = `<div class="progress indeterminate" style="max-width:200px"><i></i></div>`;
    page.querySelector('.disc-filters').style.display = tab === 'serverpack' ? 'none' : '';
    if (tab === 'serverpack') { await paintPacks(body); return; }

    try {
      const data = await content.listContent({ type: tab, category, version, query, sort });
      // populate category dropdown from result set (once)
      if (catSel.options.length <= 1 && data.categories) {
        for (const c of data.categories) catSel.appendChild(el(`<option>${esc(c)}</option>`));
      }
      if (data.pending != null) {
        const pb = page.querySelector('.pend-badge');
        if (pb) { pb.textContent = data.pending; pb.classList.toggle('hidden', !data.pending); }
      }
      body.innerHTML = '';
      const grid = el('<div class="disc-grid"></div>');
      if (!data.content.length) grid.innerHTML = `<div class="empty" style="grid-column:1/-1">${icon('search')}<div class="e-title">Nothing here yet</div><div>Try another filter, or upload the first one.</div></div>`;
      for (const c of data.content) grid.appendChild(contentCard(c, paint));
      body.appendChild(grid);
    } catch (e) {
      body.innerHTML = `<div class="empty">${icon('alert')}<div class="e-title">Couldn't load</div><div>${esc(e.message)}</div></div>`;
    }
  }

  paint();
  refreshUpdates(page, false);
  root.appendChild(page);
}

/* ------------------------------------------------------------- content card */

function stars(rating) {
  const full = Math.round(rating);
  let out = '';
  for (let i = 1; i <= 5; i++) out += `<span style="color:${i <= full ? '#f3c14b' : 'var(--bg4)'}">★</span>`;
  return `<span class="stars" title="${rating}">${out}</span>`;
}

function contentCard(c, repaint) {
  const tm = TYPE_META[c.type] || {};
  const installed = content.isInstalled(c.id, selectedProfile()?.id);
  const card = el(`
    <div class="card hover disc-card">
      <div class="disc-icon" style="background:${tm.color || 'var(--bg4)'}">${icon(tm.icon || 'box')}</div>
      <div class="grow" style="min-width:0">
        <div class="row" style="gap:6px">
          <span class="disc-name ellipsis">${esc(c.name)}</span>
          ${c.verified ? `<span class="verified-badge" title="Verified by the Horus team">${icon('shield')}</span>` : ''}
          ${c.mine ? '<span class="badge free">yours</span>' : ''}
        </div>
        <div class="tiny faint">by ${esc(c.author)} · v${esc(c.latest?.version || '?')}</div>
        <div class="small muted disc-desc">${esc(c.summary || '')}</div>
        <div class="row" style="gap:12px;margin-top:6px">
          ${stars(c.rating || 0)}
          <span class="tiny faint">${Number(c.downloads || 0).toLocaleString()} ${icon('download')}</span>
          <span class="tiny faint chip" style="padding:1px 8px">${esc(c.category || 'misc')}</span>
        </div>
      </div>
      <div class="col" style="gap:6px;flex:none;align-items:flex-end">
        <button class="btn small ${installed ? 'ghost' : 'green'} b-install">${icon(installed ? 'check' : 'download')}<span>${installed ? 'Installed' : 'Install'}</span></button>
        <button class="btn small dark b-rate" ${content.hasRated(c.id) ? 'disabled' : ''}>${icon('star')}<span>Rate</span></button>
      </div>
    </div>`);

  card.querySelector('.b-install').addEventListener('click', async (e) => {
    const profile = selectedProfile();
    if (!profile) { toast('Pick a profile first', 'err'); return; }
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const r = await content.install(c.id, profile.id);
      toast(`${c.name} installed to ${r.dir}/`, 'ok');
      btn.innerHTML = `${icon('check')}<span>Installed</span>`;
      btn.classList.replace('green', 'ghost');
    } catch (err) {
      toast(err.message, 'err');
      btn.disabled = false;
    }
  });

  card.querySelector('.b-rate').addEventListener('click', (e) => rateDialog(c, e.currentTarget));
  return card;
}

function rateDialog(c, btn) {
  const body = el(`<div class="center"><div class="rate-stars" style="font-size:34px;letter-spacing:6px;cursor:pointer"></div><div class="small faint" style="margin-top:8px">Click to rate ${esc(c.name)}</div></div>`);
  const box = body.querySelector('.rate-stars');
  let picked = 0;
  const paint = (n) => { box.innerHTML = ''; for (let i = 1; i <= 5; i++) { const s = el(`<span style="color:${i <= n ? '#f3c14b' : 'var(--bg4)'}">★</span>`); s.addEventListener('mouseenter', () => paint(i)); s.addEventListener('click', () => submit(i)); box.appendChild(s); } };
  const m = modal({ title: 'Rate content', body, size: 'sm' });
  async function submit(n) {
    picked = n;
    try { await content.rate(c.id, n); toast(`Rated ${n}★ — thanks!`, 'ok'); btn.disabled = true; m.close(); }
    catch (err) { toast(err.message, 'err'); m.close(); }
  }
  paint(0);
  void picked;
}

/* ------------------------------------------------------------------ upload */

function openUpload(onDone) {
  let file = null;
  const body = el(`
    <div class="col" style="gap:14px">
      <div class="upload-drop">
        ${icon('upload')}
        <div class="u-label">Choose a .jar (mod) or .zip (pack/shader)</div>
        <input type="file" accept=".jar,.zip" class="u-file" hidden>
      </div>
      <div class="row">
        <div class="field grow"><label>Name</label><input class="input u-name" placeholder="auto-detected if empty" spellcheck="false"></div>
        <div class="field"><label>Type</label>
          <select class="input u-type"><option value="mod">Mod</option><option value="resourcepack">Resource Pack</option><option value="shader">Shader</option></select>
        </div>
      </div>
      <div class="row">
        <div class="field grow"><label>Author</label><input class="input u-author" value="${esc(state.settings.accountName || '')}" spellcheck="false"></div>
        <div class="field"><label>Category</label><input class="input u-cat" placeholder="performance" spellcheck="false"></div>
      </div>
      <div class="field"><label>Summary</label><input class="input u-sum" placeholder="One line about your content" maxlength="120" spellcheck="false"></div>
      <div class="field"><label>Compatible versions (comma-separated)</label><input class="input u-ver" placeholder="1.21.5, 1.20.1" spellcheck="false"></div>
      <div class="hint">${icon('shield')} Uploads enter a review queue. An admin approves them for safety, quality and compatibility before they appear in the library.</div>
    </div>`);

  const drop = body.querySelector('.upload-drop');
  const input = body.querySelector('.u-file');
  const pick = (f) => {
    file = f;
    body.querySelector('.u-label').textContent = f.name;
    drop.classList.add('has-file');
    if (f.name.endsWith('.zip')) body.querySelector('.u-type').value = 'resourcepack';
    if (!body.querySelector('.u-name').value) body.querySelector('.u-name').value = f.name.replace(/\.(jar|zip)$/i, '');
  };
  drop.addEventListener('click', () => input.click());
  input.addEventListener('change', () => input.files[0] && pick(input.files[0]));
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('drag'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('drag'); if (e.dataTransfer.files[0]) pick(e.dataTransfer.files[0]); });

  const submit = el(`<button class="btn primary">${icon('upload')}<span>Submit for review</span></button>`);
  const cancel = el('<button class="btn ghost">Cancel</button>');
  const m = modal({ title: 'Upload content', body, footer: [cancel, submit], size: 'lg' });
  cancel.addEventListener('click', () => m.close());

  submit.addEventListener('click', async () => {
    if (!file) { toast('Pick a file first', 'err'); return; }
    const meta = {
      type: body.querySelector('.u-type').value,
      name: body.querySelector('.u-name').value.trim(),
      author: body.querySelector('.u-author').value.trim() || 'anonymous',
      category: body.querySelector('.u-cat').value.trim() || 'misc',
      summary: body.querySelector('.u-sum').value.trim(),
      versions: body.querySelector('.u-ver').value.split(',').map((s) => s.trim()).filter(Boolean),
    };
    submit.disabled = true;
    try {
      await content.upload(meta, file);
      toast('Uploaded — pending review', 'ok');
      m.close();
      onDone?.();
    } catch (e) {
      toast(e.message, 'err');
      submit.disabled = false;
    }
  });
}

/* ------------------------------------------------------------------ review */

async function openReview(page) {
  const body = el('<div class="col" style="gap:8px"><div class="progress indeterminate"><i></i></div></div>');
  const m = modal({ title: 'Review queue', body, size: 'lg' });
  let data;
  try { data = await content.listContent({ status: 'pending' }); }
  catch (e) { body.innerHTML = `<div class="muted small">${esc(e.message)}</div>`; return; }
  const render = (items) => {
    body.innerHTML = '';
    if (!items.length) { body.innerHTML = `<div class="empty">${icon('check')}<div class="e-title">Queue empty</div><div>No content is waiting for review.</div></div>`; return; }
    for (const c of items) {
      const row = el(`
        <div class="card pad row">
          <div class="disc-icon" style="width:38px;height:38px;background:${(TYPE_META[c.type] || {}).color}">${icon((TYPE_META[c.type] || {}).icon || 'box')}</div>
          <div class="grow" style="min-width:0">
            <div style="font-weight:700">${esc(c.name)} <span class="tiny faint">v${esc(c.latest?.version)} · ${esc(c.type)} · by ${esc(c.author)}</span></div>
            <div class="tiny faint">${esc(c.summary || 'no description')}</div>
            ${c.latest?.scan ? `
              <div class="tiny" style="margin-top:4px;color:${{ low: 'var(--green)', medium: 'var(--gold)', high: 'var(--accent-2)' }[c.latest.scan.risk]}">
                ${icon('shield')} Security scan: ${esc(c.latest.scan.risk)} risk${c.latest.scan.flags.length ? ` — ${esc(c.latest.scan.flags.join(' · '))}` : ' — archive clean'}
              </div>` : ''}
          </div>
          <button class="btn small green b-verify">${icon('shield')}<span>Verify</span></button>
          <button class="btn small dark b-approve">${icon('check')}<span>Approve</span></button>
          <button class="icon-btn small b-reject" title="Reject">${icon('trash')}</button>
        </div>`);
      const act = async (action) => {
        try { await content.review(c.id, action); toast(`${c.name}: ${action}`, 'ok'); row.remove(); page && page.querySelector('.disc-body') && refreshCounts(page); }
        catch (e) { toast(e.message, 'err'); }
      };
      row.querySelector('.b-verify').addEventListener('click', () => act('verify'));
      row.querySelector('.b-approve').addEventListener('click', () => act('approve'));
      row.querySelector('.b-reject').addEventListener('click', async () => {
        if (await confirmModal('Reject content', `Reject "${c.name}"?`, 'Reject')) act('reject');
      });
      body.appendChild(row);
    }
  };
  render(data.content);
}

async function refreshCounts(page) {
  try {
    const data = await content.listContent({ type: tab });
    const pb = page.querySelector('.pend-badge');
    if (pb && data.pending != null) { pb.textContent = data.pending; pb.classList.toggle('hidden', !data.pending); }
  } catch { /* ignore */ }
}

/* ----------------------------------------------------------------- updates */

async function refreshUpdates(page, notify) {
  const profile = selectedProfile();
  const banner = page.querySelector('.update-banner');
  if (!profile) return;
  let updates = [];
  try { updates = await content.checkUpdates(profile.id); } catch { /* ignore */ }
  if (!updates.length) {
    banner.classList.add('hidden');
    if (notify) toast('Everything is up to date', 'ok');
    return;
  }
  banner.classList.remove('hidden');
  banner.innerHTML = `
    <div class="card pad row" style="border-color:rgba(243,193,75,0.4);background:rgba(243,193,75,0.06)">
      <span style="font-size:20px;line-height:0;color:var(--gold)">${icon('refresh')}</span>
      <div class="grow small"><b>${updates.length} update${updates.length > 1 ? 's' : ''} available</b> for ${esc(profile.name)}: ${updates.map((u) => esc(u.name)).join(', ')}</div>
      <button class="btn small primary b-update-all">Update all</button>
    </div>`;
  banner.querySelector('.b-update-all').addEventListener('click', async (e) => {
    e.target.disabled = true;
    try { const done = await content.updateAll(profile.id); toast(`Updated ${done.length} item(s)`, 'ok'); banner.classList.add('hidden'); }
    catch (err) { toast(err.message, 'err'); e.target.disabled = false; }
  });
}

/* -------------------------------------------------------------- server packs */

async function paintPacks(body) {
  body.innerHTML = '';
  body.appendChild(el(`<div class="mods-section-label">Server packs — one click installs the mods, packs & settings a server needs</div>`));
  let packs = [];
  try { packs = await content.serverPacks(); } catch (e) { body.innerHTML = `<div class="muted small">${esc(e.message)}</div>`; return; }
  const grid = el('<div class="lib-grid"></div>');
  for (const pack of packs) {
    const card = el(`
      <div class="card hover lib-card">
        <div class="row">
          <div class="lib-icon" style="background:linear-gradient(135deg,#c8354a,#7a1f2b)">${icon('globe')}</div>
          <div class="grow" style="min-width:0">
            <div class="lib-name ellipsis">${esc(pack.name)}</div>
            <div class="tiny faint mono">${esc(pack.address || '')}</div>
          </div>
          <span class="chip">${esc(pack.version)} · ${esc(pack.loader || 'fabric')}</span>
        </div>
        <div class="small muted">${esc(pack.desc || '')}</div>
        <div class="row wrap" style="gap:6px">
          ${(pack.content || []).map((id) => `<span class="chip tiny pk-item" data-id="${esc(id)}">${icon('package')}${esc(shortId(id))}</span>`).join('')}
          ${(pack.recommended || []).length ? `<span class="chip tiny" style="border-style:dashed">+${pack.recommended.length} recommended</span>` : ''}
        </div>
        <div class="row">
          <span class="tiny faint">${(pack.content || []).length} item(s) auto-installed</span>
          <button class="btn primary small right b-join">${icon('play')}<span>Join</span></button>
        </div>
      </div>`);
    card.querySelector('.b-join').addEventListener('click', async (e) => {
      e.target.disabled = true;
      toast(`Setting up ${pack.name}…`, 'info');
      try {
        const r = await content.joinServerPack(pack.id);
        toast(`${pack.name} ready — ${r.installed.length} item(s) installed`, 'ok');
        const profile = state.profiles.find((p) => p.id === r.profileId) || { id: r.profileId, name: pack.name, version: pack.version, loader: pack.loader, ramMb: pack.ramMb };
        launchProfile(profile, { server: r.address });
      } catch (err) { toast(err.message, 'err'); e.target.disabled = false; }
    });
    grid.appendChild(card);
  }
  body.appendChild(grid);
}

function shortId(id) {
  return id.replace(/^seed-|^usr-/, '');
}
