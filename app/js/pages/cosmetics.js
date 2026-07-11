/* Wardrobe — everything you own: capes (incl. your own free creations from
   the Cape Studio), hats, wings, pets, emotes and nametag effects, all live
   on the 3D player. Buying happens in the Shop; creating capes is FREE. */

import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { el, esc, toast, modal, contextMenu, makeSwitch } from '../components.js';
import { state, equipCosmetic } from '../state.js';
import { SHOP_ITEMS } from '../shopCatalog.js';
import { owns, economy, saveCustomCape, deleteCustomCape, customCape, questProgress } from '../economy.js';
import { drawItemThumb } from '../thumbs.js';
import { mountPlayer } from '../player3d.js';
import { capeTextureFromPixels } from '../skin.js';

const CATS = [
  { id: 'cape', label: 'Capes', slot: 'cape' },
  { id: 'hat', label: 'Hats', slot: 'hat' },
  { id: 'wings', label: 'Wings', slot: 'wings' },
  { id: 'pet', label: 'Pets', slot: 'pet' },
  { id: 'emote', label: 'Emotes', slot: null },
  { id: 'nametag', label: 'Nametags', slot: 'nametag' },
];

let cat = 'cape';

export function render(root) {
  const page = el(`
    <div class="page">
      <div class="page-head">
        <div>
          <div class="page-title">${esc(t('cos.title'))}</div>
          <div class="page-sub">Your collection. Create your own capes for free in the studio — everything else is earned with coins in the shop.</div>
        </div>
        <div class="row">
          <button class="btn ghost b-shop">${icon('gift')}<span>Shop</span></button>
          <button class="btn primary b-studio">${icon('edit')}<span>Cape Studio</span></button>
        </div>
      </div>
      <div class="cos-layout">
        <div class="cos-main">
          <div class="cos-cats tabs"></div>
          <div class="cos-grid"></div>
        </div>
        <div class="cos-preview">
          <div class="card">
            <div class="small" style="font-weight:800;margin-bottom:10px">${esc(t('cos.preview'))}</div>
            <div class="pv-stage"></div>
            <div class="pv-meta">
              <div class="row">
                <b>${esc(state.settings.accountName || 'Player')}</b>
                <span class="badge free right">no paywall</span>
              </div>
              <div class="pv-slots"></div>
            </div>
          </div>
        </div>
      </div>
    </div>`);

  page.querySelector('.b-shop').addEventListener('click', () => { location.hash = '#/shop'; });
  const afterStudio = () => { paintGrid(); paintSlots(); preview.refresh(); };
  page.querySelector('.b-studio').addEventListener('click', () => openStudio(null, afterStudio));

  const tabs = page.querySelector('.cos-cats');
  for (const c of CATS) {
    const b = el(`<button class="tab ${c.id === cat ? 'active' : ''}">${esc(c.label)}</button>`);
    b.addEventListener('click', () => {
      cat = c.id;
      tabs.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      paintGrid();
    });
    tabs.appendChild(b);
  }

  const grid = page.querySelector('.cos-grid');
  const stage = page.querySelector('.pv-stage');
  const slots = page.querySelector('.pv-slots');

  const preview = mountPlayer(stage, () => ({
    ...state.cosmetics,
    name: state.settings.accountName || 'Player',
  }));

  function ownedItems() {
    const items = SHOP_ITEMS.filter((x) => x.cat === cat && owns(x.id));
    if (cat === 'cape') {
      return [
        ...economy().customCapes.map((c) => ({ id: c.id, cat: 'cape', name: c.name, pixels: c.pixels, custom: true })),
        ...items,
      ];
    }
    return items;
  }

  function paintGrid() {
    grid.innerHTML = '';
    const def = CATS.find((c) => c.id === cat);
    for (const item of ownedItems()) {
      const equipped = def.slot && state.cosmetics[def.slot] === item.id;
      const card = el(`
        <div class="card hover cos-card ${equipped ? 'equipped' : ''}">
          <canvas></canvas>
          <div class="cos-name ellipsis">${esc(item.name)}</div>
          ${item.custom ? '<span class="badge free">YOURS</span>' : equipped ? `<span class="equip-tag">${esc(t('cos.equipped'))}</span>` : ''}
        </div>`);
      drawItemThumb(card.querySelector('canvas'), item);
      card.addEventListener('click', () => {
        if (cat === 'emote') {
          preview.playEmote(item.anim);
          return;
        }
        equipCosmetic(def.slot, equipped ? null : item.id);
        checkSetQuest();
        paintGrid();
        paintSlots();
        preview.refresh();
      });
      if (item.custom) {
        card.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          contextMenu(e.clientX, e.clientY, [
            { label: 'Edit in studio', icon: 'edit', action: () => openStudio(item.id, afterStudio) },
            { label: 'Export PNG', icon: 'download', action: () => exportCapePng(item) },
            '-',
            { label: 'Delete', icon: 'trash', danger: true, action: () => { deleteCustomCape(item.id); afterStudio(); } },
          ]);
        });
      }
      grid.appendChild(card);
    }
    const more = el(`
      <div class="card lib-card create cos-card" style="min-height:150px">
        ${icon('plus')}<span class="small" style="font-weight:700">${cat === 'cape' ? 'Create (free) or shop' : 'Get more in the shop'}</span>
      </div>`);
    more.addEventListener('click', () => {
      if (cat === 'cape') openStudio(null, afterStudio);
      else location.hash = '#/shop';
    });
    grid.appendChild(more);
  }

  function paintSlots() {
    slots.innerHTML = '';
    for (const c of CATS) {
      if (!c.slot) continue;
      const id = state.cosmetics[c.slot];
      const cur = id ? (customCape(id) || SHOP_ITEMS.find((x) => x.id === id)) : null;
      slots.appendChild(el(`
        <div class="pv-slot">
          <span class="sl-name">${esc(c.label)}</span>
          <span class="sl-val ${cur ? '' : 'faint'}">${esc(cur ? cur.name : '—')}</span>
        </div>`));
    }
  }

  paintGrid();
  paintSlots();
  root.appendChild(page);
  return () => preview.destroy();
}

function checkSetQuest() {
  const c = state.cosmetics;
  if (c.cape && c.hat && c.wings) questProgress('q-equip-set');
}

function exportCapePng(item) {
  const canvas = capeTextureFromPixels(item.pixels, 16);
  const a = document.createElement('a');
  a.href = canvas.toDataURL('image/png');
  a.download = `${item.name.replace(/\W+/g, '-')}.png`;
  a.click();
}

/* =============================================================== studio */

const PALETTE = [
  '#ffffff', '#c9ced8', '#7a8294', '#2b2d36', '#17181d', '#e8394a', '#b23a52', '#ff8a3c',
  '#f3c14b', '#8a6d1f', '#35d374', '#1d6b3f', '#57d8c4', '#4b7bec', '#123a6b', '#9b59d0',
];

function openStudio(editId, onDone) {
  const existing = editId ? customCape(editId) : null;
  const pixels = existing
    ? existing.pixels.map((r) => [...r])
    : Array.from({ length: 16 }, () => Array(10).fill(null));

  let color = '#e8394a';
  let tool = 'paint'; // paint | fill | erase
  let mirror = false;

  const body = el(`
    <div class="studio-layout">
      <div class="studio-canvas-wrap col">
        <div class="studio-grid"></div>
        <div class="tiny faint center">10 × 16 — left-drag to paint, right-click to erase</div>
      </div>
      <div class="studio-tools">
        <div class="field">
          <label>Name</label>
          <input class="input s-name" maxlength="24" value="${esc(existing?.name || 'My Cape')}" spellcheck="false">
        </div>
        <div class="field">
          <label>Palette</label>
          <div class="studio-palette"></div>
          <div class="row" style="margin-top:6px">
            <input type="color" class="color-input s-custom" value="${color}">
            <span class="tiny faint">custom color</span>
          </div>
        </div>
        <div class="row wrap">
          <button class="btn small dark s-tool active" data-tool="paint">${icon('edit')}<span>Paint</span></button>
          <button class="btn small dark s-tool" data-tool="fill">${icon('drop')}<span>Fill</span></button>
          <button class="btn small dark s-tool" data-tool="erase">${icon('x')}<span>Erase</span></button>
        </div>
        <div class="row">
          <span class="small muted">Mirror horizontally</span>
          <span class="s-mirror right"></span>
        </div>
        <div class="row wrap">
          <button class="btn small ghost s-import">${icon('upload')}<span>Import PNG</span></button>
          <button class="btn small ghost s-clear">${icon('trash')}<span>Clear</span></button>
        </div>
        <div class="row" style="margin-top:4px">
          <span class="small muted">Preview</span>
          <canvas class="s-preview right" style="width:50px;height:80px;image-rendering:pixelated;border-radius:6px"></canvas>
        </div>
      </div>
    </div>`);

  const saveBtn = el(`<button class="btn primary">${icon('save')}<span>Save — free</span></button>`);
  const cancel = el(`<button class="btn ghost">${esc(t('common.cancel'))}</button>`);
  const m = modal({ title: existing ? `Cape Studio — ${existing.name}` : 'Cape Studio', body, footer: [cancel, saveBtn], size: 'lg' });
  cancel.addEventListener('click', () => m.close());

  /* grid */
  const gridEl = body.querySelector('.studio-grid');
  const cells = [];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 10; x++) {
      const cell = document.createElement('div');
      cell.dataset.x = x;
      cell.dataset.y = y;
      cells.push(cell);
      gridEl.appendChild(cell);
    }
  }
  const paintCell = (x, y, val) => {
    pixels[y][x] = val;
    if (mirror) pixels[y][9 - x] = val;
    repaintCells();
  };
  const fillFrom = (x, y) => {
    const target = pixels[y][x];
    if (target === color) return;
    const stack = [[x, y]];
    const seen = new Set();
    while (stack.length) {
      const [cx, cy] = stack.pop();
      const key = `${cx},${cy}`;
      if (seen.has(key) || cx < 0 || cy < 0 || cx > 9 || cy > 15 || pixels[cy][cx] !== target) continue;
      seen.add(key);
      pixels[cy][cx] = color;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    repaintCells();
  };
  function repaintCells() {
    for (const cell of cells) {
      const v = pixels[cell.dataset.y][cell.dataset.x];
      cell.style.background = v || '#20232a';
    }
    const pv = body.querySelector('.s-preview');
    pv.width = 20; pv.height = 32;
    pv.getContext('2d').drawImage(capeTextureFromPixels(pixels, 2), 0, 0);
  }
  repaintCells();

  let drawing = false;
  gridEl.addEventListener('pointerdown', (e) => {
    const cell = e.target.closest('[data-x]');
    if (!cell) return;
    e.preventDefault();
    const x = +cell.dataset.x;
    const y = +cell.dataset.y;
    if (e.button === 2 || tool === 'erase') { drawing = 'erase'; paintCell(x, y, null); return; }
    if (tool === 'fill') { fillFrom(x, y); return; }
    drawing = 'paint';
    paintCell(x, y, color);
  });
  gridEl.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-x]');
    if (cell) paintCell(+cell.dataset.x, +cell.dataset.y, drawing === 'erase' ? null : color);
  });
  window.addEventListener('pointerup', () => { drawing = false; }, { once: false });
  gridEl.addEventListener('contextmenu', (e) => e.preventDefault());

  /* palette + tools */
  const pal = body.querySelector('.studio-palette');
  for (const c of PALETTE) {
    const b = el(`<button style="background:${c}" title="${c}" class="${c === color ? 'sel' : ''}"></button>`);
    b.addEventListener('click', () => {
      color = c;
      pal.querySelectorAll('button').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
    });
    pal.appendChild(b);
  }
  body.querySelector('.s-custom').addEventListener('input', (e) => {
    color = e.target.value;
    pal.querySelectorAll('button').forEach((x) => x.classList.remove('sel'));
  });
  body.querySelectorAll('.s-tool').forEach((b) => {
    b.addEventListener('click', () => {
      tool = b.dataset.tool;
      body.querySelectorAll('.s-tool').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
    });
  });
  body.querySelector('.s-mirror').appendChild(makeSwitch(false, (v) => { mirror = v; }));
  body.querySelector('.s-clear').addEventListener('click', () => {
    for (const row of pixels) row.fill(null);
    repaintCells();
  });

  /* PNG import: any image is downsampled onto the 10×16 grid */
  body.querySelector('.s-import').addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.addEventListener('change', () => {
      const file = inp.files?.[0];
      if (!file) return;
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 10; c.height = 16;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, 10, 16);
        const data = ctx.getImageData(0, 0, 10, 16).data;
        for (let y = 0; y < 16; y++) {
          for (let x = 0; x < 10; x++) {
            const i = (y * 10 + x) * 4;
            pixels[y][x] = data[i + 3] < 40 ? null
              : `#${[data[i], data[i + 1], data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
          }
        }
        repaintCells();
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    });
    inp.click();
  });

  saveBtn.addEventListener('click', () => {
    const name = body.querySelector('.s-name').value.trim() || 'My Cape';
    const id = saveCustomCape(name, pixels, editId);
    equipCosmetic('cape', id);
    toast(`${name} saved & equipped — free, of course`, 'ok');
    m.close();
    onDone?.();
  });
}
