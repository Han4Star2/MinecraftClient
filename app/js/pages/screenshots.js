/* Screenshots — gallery of the screenshots folder (real files when the
   backend is connected; generated demo shots otherwise) with a lightbox. */

import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { el, esc, toast, modal } from '../components.js';
import { api, isConnected } from '../api.js';

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
      <div class="shot-grid"></div>
    </div>`);

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
      </div>
    </div>`);
  card.addEventListener('click', () => {
    modal({
      title: s.file,
      size: 'lg',
      body: `<div class="lightbox"><img src="screenshots/${encodeURIComponent(s.file)}" alt=""></div>`,
    });
  });
  return card;
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
