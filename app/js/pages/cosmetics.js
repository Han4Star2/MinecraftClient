/* Cosmetics — the cape browser (NoRisk-style). Every official Minecraft cape
   1:1, community capes, and your own creations from the Cape Studio. Tabs:
   ALL / MY CAPES / FAVORITES / VANILLA. Search, favorite hearts, uses counts,
   a live 3D preview and a free Cape Studio. All capes are free. */

import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { el, esc, toast, contextMenu, modal, makeSwitch } from '../components.js';
import { state, equipCosmetic } from '../state.js';
import {
  economy, saveCustomCape, deleteCustomCape, customCape,
  toggleCapeFavorite, isCapeFavorite, questProgress,
} from '../economy.js';
import { VANILLA_CAPES, COMMUNITY_CAPES, capeCanvas, capeById } from '../vanillaCapes.js';
import { capeTextureFromPixels } from '../skin.js';
import { mountPlayer } from '../player3d.js';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'My Capes' },
  { id: 'fav', label: 'Favorites' },
  { id: 'vanilla', label: 'Vanilla' },
];

let tab = 'all';
let query = '';

export function render(root) {
  const page = el(`
    <div class="page wide" style="max-width:1500px;margin:0 auto">
      <div class="cape-toolbar">
        <div class="tabs t-tabs"></div>
        <div class="search-box" style="width:260px">
          ${icon('search')}<input class="input f-q" placeholder="Search capes…" spellcheck="false">
        </div>
        <button class="icon-btn b-favonly" title="Favorites only">${icon('heart')}</button>
        <div class="grow"></div>
        <button class="btn dark b-template">${icon('grid')}<span>Templates</span></button>
        <button class="btn primary b-upload">${icon('upload')}<span>Create / Upload</span></button>
      </div>

      <div class="cape-layout">
        <div class="cape-main">
          <div class="cape-grid"></div>
        </div>
        <div class="cape-preview">
          <div class="card" style="padding:16px">
            <div class="row" style="margin-bottom:10px"><b class="small">Preview</b><span class="badge free right">all free</span></div>
            <div class="pv-stage cape-stage"></div>
            <div class="pv-meta">
              <div class="row"><b class="pv-cape-name">—</b></div>
              <div class="tiny faint pv-cape-sub"></div>
              <div class="row" style="margin-top:10px;gap:8px">
                <button class="btn green grow b-equip">${icon('check')}<span>Equip</span></button>
                <button class="icon-btn b-fav" title="Favorite">${icon('heart')}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`);

  let favOnly = false;
  let selected = state.cosmetics.cape || 'vc-migrator';

  const tabs = page.querySelector('.t-tabs');
  for (const tb of TABS) {
    const b = el(`<button class="tab ${tb.id === tab ? 'active' : ''}">${esc(tb.label)}</button>`);
    b.addEventListener('click', () => {
      tab = tb.id;
      tabs.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      paintGrid();
    });
    tabs.appendChild(b);
  }

  const q = page.querySelector('.f-q');
  q.value = query;
  q.addEventListener('input', () => { query = q.value.toLowerCase(); paintGrid(); });

  const favBtn = page.querySelector('.b-favonly');
  favBtn.addEventListener('click', () => { favOnly = !favOnly; favBtn.classList.toggle('active', favOnly); paintGrid(); });

  page.querySelector('.b-upload').addEventListener('click', () => openStudio(null, afterStudio));
  page.querySelector('.b-template').addEventListener('click', () => openTemplates());

  const grid = page.querySelector('.cape-grid');
  const stage = page.querySelector('.cape-stage');
  const preview = mountPlayer(stage, () => ({ ...state.cosmetics, cape: selected, name: state.settings.accountName || 'Player' }));

  function customList() {
    return economy().customCapes.map((c) => ({ id: c.id, name: c.name, uses: 1, mine: true, custom: true }));
  }
  function poolFor(tabId) {
    if (tabId === 'vanilla') return VANILLA_CAPES;
    if (tabId === 'mine') return customList();
    if (tabId === 'fav') {
      const favs = economy().capeFavorites || [];
      return [...VANILLA_CAPES, ...COMMUNITY_CAPES, ...customList()].filter((c) => favs.includes(c.id));
    }
    return [...customList(), ...COMMUNITY_CAPES, ...VANILLA_CAPES];
  }

  function capeThumb(cv, cape) {
    if (cape.custom) { const c = customCape(cape.id); if (c) return cv.getContext('2d').drawImage(capeTextureFromPixels(c.pixels, 8), 0, 0, cv.width, cv.height); }
    const src = capeCanvas(cape, 8);
    const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.drawImage(src, 0, 0, cv.width, cv.height);
  }

  function paintGrid() {
    grid.innerHTML = '';
    let pool = poolFor(tab);
    if (query) pool = pool.filter((c) => `${c.name} ${c.author || ''}`.toLowerCase().includes(query));
    if (favOnly) pool = pool.filter((c) => isCapeFavorite(c.id));
    if (!pool.length) {
      grid.innerHTML = `<div class="empty" style="grid-column:1/-1">${icon('shirt')}<div class="e-title">No capes here</div><div>${tab === 'mine' ? 'Create one in the studio — it\'s free.' : 'Try another tab or search.'}</div></div>`;
      return;
    }
    for (const cape of pool) {
      const card = el(`
        <div class="card hover cape-card ${cape.id === selected ? 'sel' : ''}" data-id="${esc(cape.id)}">
          <button class="cape-heart ${isCapeFavorite(cape.id) ? 'on' : ''}">${icon('heart')}</button>
          <canvas width="120" height="192"></canvas>
          <div class="cape-name ellipsis">${esc(cape.name)}</div>
          <div class="cape-uses">${cape.custom ? 'yours' : `${icon('download')}${(cape.uses || 0).toLocaleString()} uses`}</div>
        </div>`);
      capeThumb(card.querySelector('canvas'), cape);
      card.addEventListener('click', (e) => {
        if (e.target.closest('.cape-heart')) return;
        selected = cape.id;
        grid.querySelectorAll('.cape-card').forEach((n) => n.classList.toggle('sel', n.dataset.id === selected));
        preview.refresh();
        paintPreview();
      });
      card.querySelector('.cape-heart').addEventListener('click', (e) => {
        const on = toggleCapeFavorite(cape.id);
        e.currentTarget.classList.toggle('on', on);
      });
      if (cape.custom) {
        card.addEventListener('contextmenu', (ev) => {
          ev.preventDefault();
          contextMenu(ev.clientX, ev.clientY, [
            { label: 'Edit in studio', icon: 'edit', action: () => openStudio(cape.id, afterStudio) },
            { label: 'Export PNG', icon: 'download', action: () => exportPng(cape.id) },
            '-',
            { label: 'Delete', icon: 'trash', danger: true, action: () => { deleteCustomCape(cape.id); if (selected === cape.id) selected = 'vc-migrator'; afterStudio(); } },
          ]);
        });
      }
      grid.appendChild(card);
    }
  }

  function paintPreview() {
    const cape = capeById(selected) || customList().find((c) => c.id === selected);
    const name = cape?.name || (customCape(selected)?.name) || '—';
    page.querySelector('.pv-cape-name').textContent = name;
    page.querySelector('.pv-cape-sub').textContent = cape?.author ? `by ${cape.author} · ${(cape.uses || 0).toLocaleString()} uses`
      : VANILLA_CAPES.some((c) => c.id === selected) ? 'Official Minecraft cape' : customCape(selected) ? 'Your creation' : '';
    const equipped = state.cosmetics.cape === selected;
    const eq = page.querySelector('.b-equip');
    eq.innerHTML = `${icon(equipped ? 'check' : 'shirt')}<span>${equipped ? 'Equipped' : 'Equip'}</span>`;
    eq.classList.toggle('ghost', equipped);
    eq.classList.toggle('green', !equipped);
    page.querySelector('.b-fav').classList.toggle('active', isCapeFavorite(selected));
  }

  page.querySelector('.b-equip').addEventListener('click', () => {
    equipCosmetic('cape', state.cosmetics.cape === selected ? null : selected);
    paintPreview();
    toast(state.cosmetics.cape ? 'Cape equipped' : 'Cape removed', 'ok', 1400);
  });
  page.querySelector('.b-fav').addEventListener('click', () => {
    toggleCapeFavorite(selected);
    paintPreview();
    paintGrid();
  });

  function afterStudio() { paintGrid(); paintPreview(); preview.refresh(); }

  paintGrid();
  paintPreview();
  root.appendChild(page);
  return () => preview.destroy();
}

function exportPng(id) {
  const c = customCape(id);
  if (!c) return;
  const a = document.createElement('a');
  a.href = capeTextureFromPixels(c.pixels, 16).toDataURL('image/png');
  a.download = `${c.name.replace(/\W+/g, '-')}.png`;
  a.click();
}

/* Templates: start the studio pre-loaded from a vanilla cape's pixels. */
function openTemplates() {
  const body = el('<div class="cape-grid" style="max-height:60vh;overflow:auto"></div>');
  const m = modal({ title: 'Start from a template', body, size: 'lg' });
  for (const cape of VANILLA_CAPES) {
    const card = el(`<div class="card hover cape-card"><canvas width="120" height="192"></canvas><div class="cape-name ellipsis">${esc(cape.name)}</div></div>`);
    const ctx = card.querySelector('canvas').getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(capeCanvas(cape, 8), 0, 0, 120, 192);
    card.addEventListener('click', () => { m.close(); openStudio(null, null, capeToPixels(cape)); });
    body.appendChild(card);
  }
}

/** Downsample a vanilla cape canvas back into a 16×10 pixel grid for editing. */
function capeToPixels(cape) {
  const src = capeCanvas(cape, 1);
  const ctx = src.getContext('2d');
  const data = ctx.getImageData(0, 0, 10, 16).data;
  const px = Array.from({ length: 16 }, (_, y) => Array.from({ length: 10 }, (_, x) => {
    const i = (y * 10 + x) * 4;
    return data[i + 3] < 30 ? null : `#${[data[i], data[i + 1], data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  }));
  return px;
}

/* ============================================================== studio */

const PALETTE = [
  '#ffffff', '#c9ced8', '#7a8294', '#2b2d36', '#17181d', '#e8394a', '#b23a52', '#ff8a3c',
  '#f3c14b', '#8a6d1f', '#35d374', '#1d6b3f', '#57d8c4', '#4b7bec', '#123a6b', '#9b59d0',
];

function openStudio(editId, onDone, presetPixels) {
  const existing = editId ? customCape(editId) : null;
  const pixels = existing ? existing.pixels.map((r) => [...r])
    : presetPixels ? presetPixels.map((r) => [...r])
    : Array.from({ length: 16 }, () => Array(10).fill(null));

  let color = '#e8394a';
  let tool = 'paint';
  let mirror = false;

  const body = el(`
    <div class="studio-layout">
      <div class="studio-canvas-wrap col">
        <div class="studio-grid"></div>
        <div class="tiny faint center">10 × 16 — drag to paint, right-click erases</div>
      </div>
      <div class="studio-tools">
        <div class="field"><label>Name</label><input class="input s-name" maxlength="24" value="${esc(existing?.name || 'My Cape')}" spellcheck="false"></div>
        <div class="field"><label>Palette</label><div class="studio-palette"></div>
          <div class="row" style="margin-top:6px"><input type="color" class="color-input s-custom" value="${color}"><span class="tiny faint">custom color</span></div>
        </div>
        <div class="row wrap">
          <button class="btn small dark s-tool active" data-tool="paint">${icon('edit')}<span>Paint</span></button>
          <button class="btn small dark s-tool" data-tool="fill">${icon('drop')}<span>Fill</span></button>
          <button class="btn small dark s-tool" data-tool="erase">${icon('x')}<span>Erase</span></button>
        </div>
        <div class="row"><span class="small muted">Mirror horizontally</span><span class="s-mirror right"></span></div>
        <div class="row wrap"><button class="btn small ghost s-import">${icon('upload')}<span>Import PNG</span></button><button class="btn small ghost s-clear">${icon('trash')}<span>Clear</span></button></div>
        <div class="row" style="margin-top:4px"><span class="small muted">Preview</span><canvas class="s-preview right" style="width:50px;height:80px;image-rendering:pixelated;border-radius:6px"></canvas></div>
      </div>
    </div>`);

  const saveBtn = el(`<button class="btn primary">${icon('save')}<span>Save — free</span></button>`);
  const cancel = el(`<button class="btn ghost">${esc(t('common.cancel'))}</button>`);
  const m = modal({ title: existing ? `Cape Studio — ${existing.name}` : 'Cape Studio', body, footer: [cancel, saveBtn], size: 'lg' });
  cancel.addEventListener('click', () => m.close());

  const gridEl = body.querySelector('.studio-grid');
  const cells = [];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 10; x++) { const c = document.createElement('div'); c.dataset.x = x; c.dataset.y = y; cells.push(c); gridEl.appendChild(c); }
  const paintCell = (x, y, v) => { pixels[y][x] = v; if (mirror) pixels[y][9 - x] = v; repaint(); };
  const fillFrom = (x, y) => {
    const tgt = pixels[y][x]; if (tgt === color) return;
    const st = [[x, y]]; const seen = new Set();
    while (st.length) { const [cx, cy] = st.pop(); const k = `${cx},${cy}`; if (seen.has(k) || cx < 0 || cy < 0 || cx > 9 || cy > 15 || pixels[cy][cx] !== tgt) continue; seen.add(k); pixels[cy][cx] = color; st.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]); }
    repaint();
  };
  function repaint() {
    for (const c of cells) c.style.background = pixels[c.dataset.y][c.dataset.x] || '#20232a';
    const pv = body.querySelector('.s-preview'); pv.width = 20; pv.height = 32; pv.getContext('2d').drawImage(capeTextureFromPixels(pixels, 2), 0, 0);
  }
  repaint();

  let drawing = false;
  gridEl.addEventListener('pointerdown', (e) => {
    const cell = e.target.closest('[data-x]'); if (!cell) return; e.preventDefault();
    const x = +cell.dataset.x, y = +cell.dataset.y;
    if (e.button === 2 || tool === 'erase') { drawing = 'erase'; paintCell(x, y, null); return; }
    if (tool === 'fill') { fillFrom(x, y); return; }
    drawing = 'paint'; paintCell(x, y, color);
  });
  gridEl.addEventListener('pointermove', (e) => { if (!drawing) return; const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-x]'); if (cell) paintCell(+cell.dataset.x, +cell.dataset.y, drawing === 'erase' ? null : color); });
  window.addEventListener('pointerup', () => { drawing = false; });
  gridEl.addEventListener('contextmenu', (e) => e.preventDefault());

  const pal = body.querySelector('.studio-palette');
  for (const c of PALETTE) { const b = el(`<button style="background:${c}" class="${c === color ? 'sel' : ''}"></button>`); b.addEventListener('click', () => { color = c; pal.querySelectorAll('button').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); }); pal.appendChild(b); }
  body.querySelector('.s-custom').addEventListener('input', (e) => { color = e.target.value; pal.querySelectorAll('button').forEach((x) => x.classList.remove('sel')); });
  body.querySelectorAll('.s-tool').forEach((b) => b.addEventListener('click', () => { tool = b.dataset.tool; body.querySelectorAll('.s-tool').forEach((x) => x.classList.remove('active')); b.classList.add('active'); }));
  body.querySelector('.s-mirror').appendChild(makeSwitch(false, (v) => { mirror = v; }));
  body.querySelector('.s-clear').addEventListener('click', () => { for (const r of pixels) r.fill(null); repaint(); });
  body.querySelector('.s-import').addEventListener('click', () => {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
    inp.addEventListener('change', () => {
      const f = inp.files?.[0]; if (!f) return; const img = new Image();
      img.onload = () => { const c = document.createElement('canvas'); c.width = 10; c.height = 16; const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, 10, 16); const d = ctx.getImageData(0, 0, 10, 16).data; for (let y = 0; y < 16; y++) for (let x = 0; x < 10; x++) { const i = (y * 10 + x) * 4; pixels[y][x] = d[i + 3] < 40 ? null : `#${[d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`; } repaint(); URL.revokeObjectURL(img.src); };
      img.src = URL.createObjectURL(f);
    });
    inp.click();
  });

  saveBtn.addEventListener('click', () => {
    const name = body.querySelector('.s-name').value.trim() || 'My Cape';
    const id = saveCustomCape(name, pixels, editId);
    equipCosmetic('cape', id);
    questProgress('q-cape-create');
    toast(`${name} saved & equipped — free`, 'ok');
    m.close();
    onDone?.();
  });
}
