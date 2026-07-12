/* Screenshots & Replay — gallery of the screenshots folder (real files when
   the backend is connected; generated demo shots otherwise) with a lightbox,
   plus the Replay corner: recording, camera paths & slow motion via the
   Replay Mod, installable with one click. */

import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { el, esc, toast, modal } from '../components.js';
import { api, isConnected } from '../api.js';
import { selectedProfile, modEnabled, setModEnabled } from '../state.js';
import { MODS } from '../catalog.js';

export function render(root) {
  const page = el(`
    <div class="page">
      <div class="page-head">
        <div>
          <div class="page-title">${esc(t('shots.title'))}</div>
          <div class="page-sub">${esc(t('shots.sub'))}</div>
        </div>
        <button class="btn ghost b-folder">${icon('folder')}<span>${esc(t('shots.openFolder'))}</span></button>
      </div>
      <div class="card pad row wrap replay-card" style="margin-bottom:18px;gap:14px">
        <span style="font-size:22px;line-height:0;flex:none;color:var(--accent-2)">${icon('camera')}</span>
        <div class="small grow" style="min-width:240px">
          <b>Replay & recording</b><div class="muted" style="margin-top:2px">Record sessions, fly the camera free, build camera paths and export in slow motion —
          via the open-source <b>Replay Mod</b>. The Replay module (Mods page) adds the client UI around it.</div>
        </div>
        <div class="row" style="gap:8px">
          <button class="btn small dark b-replay-mod">${icon('download')}<span>Install Replay Mod</span></button>
          <button class="btn small dark b-replay-module"></button>
        </div>
        <div class="replay-list col" style="width:100%;gap:4px"></div>
      </div>
      <div class="shot-grid"></div>
    </div>`);

  /* replay browser: real .mcpr recordings from every profile */
  (async () => {
    if (!isConnected()) return;
    const list = page.querySelector('.replay-list');
    try {
      const { replays } = await api.get('api/replays');
      if (!replays.length) return;
      list.appendChild(el(`<div class="tiny faint" style="margin-top:6px">${replays.length} recording${replays.length > 1 ? 's' : ''}:</div>`));
      for (const r of replays.slice(0, 8)) {
        const row = el(`
          <div class="version-row">
            <span class="grow ellipsis mono" style="font-size:12px">${esc(r.file)}</span>
            <span class="tiny faint nowrap">${esc(r.profileName)} · ${(r.size / 1048576).toFixed(1)} MB · ${new Date(r.mtime).toLocaleDateString()}</span>
            <button class="icon-btn small b-rdel" title="Delete">${icon('trash')}</button>
          </div>`);
        row.querySelector('.b-rdel').addEventListener('click', async () => {
          try {
            await api.post(`api/profiles/${encodeURIComponent(r.profileId)}/replays/delete`, { file: r.file });
            row.remove();
            toast(`${r.file} deleted`);
          } catch (e) { toast(e.message, 'err'); }
        });
        list.appendChild(row);
      }
    } catch { /* no recordings yet */ }
  })();

  const replayMod = MODS.find((m) => m.id === 'replay');
  const moduleBtn = page.querySelector('.b-replay-module');
  const paintModuleBtn = () => {
    moduleBtn.innerHTML = `${icon(modEnabled(replayMod) ? 'check' : 'plus')}<span>Module ${modEnabled(replayMod) ? 'on' : 'off'}</span>`;
  };
  paintModuleBtn();
  moduleBtn.addEventListener('click', () => {
    setModEnabled(replayMod, !modEnabled(replayMod));
    paintModuleBtn();
  });

  page.querySelector('.b-replay-mod').addEventListener('click', async (e) => {
    const p = selectedProfile();
    if (!isConnected() || !p) { toast(t('common.demo'), 'info'); return; }
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const res = await api.post('api/modrinth/install', { projectId: 'replaymod', profileId: p.id });
      toast(`Replay Mod ${res.version} installed to ${p.name}`, 'ok');
      btn.innerHTML = `${icon('check')}<span>Installed</span>`;
    } catch (err) {
      toast(`Replay Mod: ${err.message}`, 'err');
      btn.disabled = false;
    }
  });

  const grid = page.querySelector('.shot-grid');

  page.querySelector('.b-folder').addEventListener('click', async () => {
    if (!isConnected()) { toast(t('common.demo'), 'info'); return; }
    try {
      const res = await api.post('api/screenshots/open');
      toast(res.path ? `Folder: ${res.path}` : 'Opened');
    } catch (e) { toast(e.message, 'err'); }
  });

  (async () => {
    if (isConnected()) {
      try {
        const { screenshots } = await api.get('api/screenshots');
        if (screenshots.length) {
          for (const s of screenshots) grid.appendChild(realCard(s));
          return;
        }
      } catch { /* fall through to demo */ }
    }
    for (let i = 0; i < 8; i++) grid.appendChild(demoCard(i));
  })();

  root.appendChild(page);
}

function realCard(s) {
  const card = el(`
    <div class="card hover shot-card">
      <img loading="lazy" src="screenshots/${encodeURIComponent(s.file)}" alt="${esc(s.file)}">
      <div class="shot-meta">
        <span class="shot-name ellipsis">${esc(s.file)}</span>
        <span class="shot-date">${new Date(s.mtime).toLocaleDateString()}</span>
        <button class="icon-btn small b-edit" title="Edit (blur tool)">${icon('edit')}</button>
        <button class="icon-btn small b-del" title="Delete">${icon('trash')}</button>
      </div>
    </div>`);
  card.addEventListener('click', (e) => {
    if (e.target.closest('.icon-btn')) return;
    modal({
      title: s.file,
      size: 'lg',
      body: `<div class="lightbox"><img src="screenshots/${encodeURIComponent(s.file)}" alt=""></div>`,
    });
  });
  card.querySelector('.b-del').addEventListener('click', async () => {
    try {
      await api.post('api/screenshots/delete', { file: s.file });
      card.remove();
      toast(`${s.file} deleted`);
    } catch (e) { toast(e.message, 'err'); }
  });
  card.querySelector('.b-edit').addEventListener('click', () => openEditor(s));
  return card;
}

/* ------------------------------------------------------------ blur editor */
/* Drag a rectangle → that region gets pixelated (name tags, coordinates,
   server IPs). Saves as a new "-edited.png" next to the original. */

function openEditor(s) {
  const body = el(`
    <div class="col" style="gap:10px">
      <div class="tiny faint">Drag over the areas to censor — each drag pixelates its rectangle. Nothing is overwritten: saving creates <span class="mono">${esc(s.file.replace(/\.[^.]+$/, ''))}-edited.png</span>.</div>
      <canvas class="ed-canvas" style="max-width:100%;border-radius:9px;cursor:crosshair"></canvas>
    </div>`);
  const save = el(`<button class="btn primary">${icon('save')}<span>Save copy</span></button>`);
  const undo = el(`<button class="btn ghost">${icon('rotate')}<span>Reset</span></button>`);
  modal({ title: `Edit — ${s.file}`, body, size: 'lg', footer: [undo, save] });

  const cv = body.querySelector('canvas');
  const x = cv.getContext('2d');
  const img = new Image();
  img.onload = () => {
    cv.width = img.naturalWidth;
    cv.height = img.naturalHeight;
    x.drawImage(img, 0, 0);
  };
  img.src = `screenshots/${encodeURIComponent(s.file)}`;

  let dragFrom = null;
  const toCanvas = (e) => {
    const r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) * (cv.width / r.width), (e.clientY - r.top) * (cv.height / r.height)];
  };
  cv.addEventListener('pointerdown', (e) => { dragFrom = toCanvas(e); cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointerup', (e) => {
    if (!dragFrom) return;
    const [x2, y2] = toCanvas(e);
    pixelate(Math.min(dragFrom[0], x2), Math.min(dragFrom[1], y2), Math.abs(x2 - dragFrom[0]), Math.abs(y2 - dragFrom[1]));
    dragFrom = null;
  });

  function pixelate(px, py, w, h) {
    if (w < 4 || h < 4) return;
    const block = Math.max(8, Math.round(Math.min(w, h) / 6));
    for (let by = 0; by < h; by += block) {
      for (let bx = 0; bx < w; bx += block) {
        const d = x.getImageData(px + bx, py + by, 1, 1).data;
        x.fillStyle = `rgb(${d[0]},${d[1]},${d[2]})`;
        x.fillRect(px + bx, py + by, Math.min(block, w - bx), Math.min(block, h - by));
      }
    }
  }

  undo.addEventListener('click', () => x.drawImage(img, 0, 0));
  save.addEventListener('click', async () => {
    save.disabled = true;
    try {
      const res = await api.post('api/screenshots/save', { file: s.file, dataUrl: cv.toDataURL('image/png') });
      toast(`Saved as ${res.saved}`, 'ok');
      location.reload();
    } catch (e) {
      toast(e.message, 'err');
      save.disabled = false;
    }
  });
}

/* Procedural demo screenshot: a blocky voxel landscape drawn on canvas. */
function demoCard(seed) {
  const card = el(`
    <div class="card hover shot-card">
      <canvas width="480" height="270"></canvas>
      <div class="shot-meta">
        <span class="shot-name">${new Date(Date.now() - seed * 864e5).toISOString().slice(0, 10)}_${(14 + seed)}.22.0${seed}.png</span>
        <span class="shot-date">demo</span>
      </div>
    </div>`);
  paintScene(card.querySelector('canvas'), seed);
  card.addEventListener('click', () => {
    const big = document.createElement('canvas');
    big.width = 960;
    big.height = 540;
    paintScene(big, seed);
    const wrap = el('<div class="lightbox"></div>');
    wrap.appendChild(big);
    modal({ title: 'Screenshot (demo)', size: 'lg', body: wrap });
  });
  return card;
}

function paintScene(canvas, seed) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  let s = 1234 + seed * 999;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);

  /* sky */
  const night = seed % 3 === 2;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  if (night) { sky.addColorStop(0, '#0b1026'); sky.addColorStop(1, '#1c2547'); }
  else { sky.addColorStop(0, '#79b7e8'); sky.addColorStop(1, '#cfe6f4'); }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  if (night) {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 60; i++) ctx.fillRect(rnd() * W, rnd() * H * 0.6, 1.5, 1.5);
    ctx.fillStyle = '#e8e4d8';
    ctx.fillRect(W * 0.78, H * 0.12, 26, 26);
  } else {
    ctx.fillStyle = '#f7e8a0';
    ctx.fillRect(W * 0.8, H * 0.12, 30, 30);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 4; i++) {
      const cx = rnd() * W;
      const cy = rnd() * H * 0.3 + 10;
      for (let j = 0; j < 5; j++) ctx.fillRect(cx + j * 14 - 28, cy + (j % 2) * 7, 30, 12);
    }
  }

  /* voxel terrain columns */
  const cell = 16;
  const cols = Math.ceil(W / cell);
  let height = H * 0.55;
  for (let c = 0; c < cols; c++) {
    height += (rnd() - 0.5) * 26;
    height = Math.max(H * 0.4, Math.min(H * 0.8, height));
    const grass = night ? '#2c5a33' : '#4f9e44';
    const dirt = night ? '#3b2d20' : '#6d4c33';
    ctx.fillStyle = grass;
    ctx.fillRect(c * cell, height, cell, cell * 0.6);
    ctx.fillStyle = dirt;
    for (let y = height + cell * 0.6; y < H; y += cell) {
      ctx.fillStyle = rnd() > 0.85 ? (night ? '#4a4a52' : '#7a7a82') : dirt;
      ctx.fillRect(c * cell, y, cell, cell);
    }
    /* occasional tree */
    if (rnd() > 0.86) {
      ctx.fillStyle = '#4a3421';
      ctx.fillRect(c * cell + 4, height - 26, 8, 28);
      ctx.fillStyle = night ? '#1f4526' : '#2f7a35';
      ctx.fillRect(c * cell - 8, height - 52, 32, 30);
    }
  }

  /* hotbar mock for authenticity */
  ctx.fillStyle = 'rgba(10,10,12,0.5)';
  const hbW = 9 * 22 + 8;
  ctx.fillRect(W / 2 - hbW / 2, H - 30, hbW, 24);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 9; i++) ctx.strokeRect(W / 2 - hbW / 2 + 4 + i * 22, H - 27, 18, 18);
}
