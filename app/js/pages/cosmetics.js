/* Cosmetics — capes, hats, wings, bandanas, backpacks, emotes.
   Everything is FREE and rendered locally: the preview is a CSS-3D voxel
   player textured from the runtime-painted skin. No store, no tokens. */

import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { el, esc, toast } from '../components.js';
import { state, equipCosmetic } from '../state.js';
import { COSMETICS, COS_CATS } from '../catalog.js';
import { playerTextures, capeTexture } from '../skin.js';

const S = 9; // px per skin-pixel

let cat = 'cape';

export function render(root) {
  const page = el(`
    <div class="page">
      <div class="page-head">
        <div>
          <div class="page-title">${esc(t('cos.title'))}</div>
          <div class="page-sub">${esc(t('cos.sub'))}</div>
        </div>
      </div>
      <div class="free-banner">${icon('gift')}<span>${t('cos.banner')}</span></div>
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
                <span class="badge free right">100% free</span>
              </div>
              <div class="pv-slots"></div>
            </div>
          </div>
        </div>
      </div>
    </div>`);

  /* tabs */
  const tabs = page.querySelector('.cos-cats');
  for (const c of COS_CATS) {
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

  function paintGrid() {
    grid.innerHTML = '';
    for (const item of COSMETICS.filter((x) => x.cat === cat)) {
      const equipped = state.cosmetics[item.cat] === item.id;
      const card = el(`
        <div class="card hover cos-card ${equipped ? 'equipped' : ''}">
          <canvas width="84" height="84"></canvas>
          <div class="cos-name">${esc(item.name)}</div>
          ${equipped ? `<span class="equip-tag">${esc(t('cos.equipped'))}</span>` : `<span class="badge free">FREE</span>`}
        </div>`);
      thumb(card.querySelector('canvas'), item);
      card.addEventListener('click', () => {
        if (item.cat === 'emote') {
          playEmote(item.anim);
          toast(`${item.name}!`, 'info', 1400);
          return;
        }
        equipCosmetic(item.cat, equipped ? null : item.id);
        paintGrid();
        paintPlayer(stage);
        paintSlots(slots);
      });
      grid.appendChild(card);
    }
  }

  paintGrid();
  paintPlayer(stage);
  paintSlots(slots);
  hookRotation(stage);
  root.appendChild(page);
  return () => stopRotation();
}

function paintSlots(slots) {
  slots.innerHTML = '';
  for (const c of COS_CATS) {
    if (c.id === 'emote') continue;
    const cur = COSMETICS.find((x) => x.id === state.cosmetics[c.id]);
    slots.appendChild(el(`
      <div class="pv-slot">
        <span class="sl-name">${esc(c.label)}</span>
        <span class="sl-val ${cur ? '' : 'faint'}">${esc(cur ? cur.name : '—')}</span>
      </div>`));
  }
}

/* ------------------------------------------------------------- thumbnails */

function thumb(canvas, item) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#101116';
  ctx.fillRect(0, 0, 84, 84);
  switch (item.cat) {
    case 'cape': {
      const tex = capeTexture(item, 6);
      ctx.drawImage(tex, 17, 6, 50, 74);
      break;
    }
    case 'hat':
      drawHatThumb(ctx, item);
      break;
    case 'wings':
      drawWingThumb(ctx, item);
      break;
    case 'bandana':
      ctx.fillStyle = '#c98e68'; ctx.fillRect(24, 14, 36, 36);           // head
      ctx.fillStyle = item.color; ctx.fillRect(20, 48, 44, 14);          // band
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(20, 58, 44, 4);
      break;
    case 'backpack':
      ctx.fillStyle = item.color; ctx.fillRect(22, 18, 40, 50);
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(22, 30, 40, 7);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(36, 18, 12, 50);
      if (item.glow) { ctx.fillStyle = '#57d8c4'; ctx.fillRect(38, 40, 8, 8); }
      break;
    case 'emote':
      ctx.font = '44px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.anim === 'wave' ? '👋' : '🌀', 42, 46);
      break;
  }
}

function drawHatThumb(ctx, item) {
  ctx.fillStyle = '#c98e68';
  ctx.fillRect(24, 34, 36, 34); // head under hat
  ctx.fillStyle = item.color;
  if (item.id === 'hat-beanie') {
    ctx.fillRect(20, 22, 44, 18);
    ctx.fillStyle = item.color2; ctx.fillRect(36, 12, 12, 12);
  } else if (item.id === 'hat-tophat') {
    ctx.fillRect(16, 30, 52, 6);
    ctx.fillRect(26, 6, 32, 26);
    ctx.fillStyle = item.color2; ctx.fillRect(26, 24, 32, 7);
  } else if (item.id === 'hat-halo') {
    ctx.strokeStyle = item.color; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.ellipse(42, 16, 22, 8, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowColor = item.color;
  } else if (item.id === 'hat-crown') {
    ctx.fillRect(22, 22, 40, 14);
    ctx.beginPath();
    ctx.moveTo(22, 22); ctx.lineTo(28, 8); ctx.lineTo(34, 22);
    ctx.lineTo(42, 6); ctx.lineTo(50, 22); ctx.lineTo(56, 8); ctx.lineTo(62, 22);
    ctx.fill();
    ctx.fillStyle = item.color2; ctx.fillRect(40, 26, 6, 6);
  }
}

function drawWingThumb(ctx, item) {
  ctx.fillStyle = item.color;
  for (const dir of [-1, 1]) {
    ctx.save();
    ctx.translate(42, 44);
    ctx.scale(dir, 1);
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.quadraticCurveTo(34, -30, 36, -6);
    ctx.quadraticCurveTo(30, 2, 34, 10);
    ctx.quadraticCurveTo(22, 8, 20, 16);
    ctx.quadraticCurveTo(12, 12, 4, 18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/* ---------------------------------------------------------------- 3D player */

let raf = null;
let rot = { y: 24, x: -8, auto: true };

function stopRotation() {
  cancelAnimationFrame(raf);
  raf = null;
}

function hookRotation(stage) {
  let dragging = false;
  let last = null;
  stage.addEventListener('pointerdown', (e) => {
    dragging = true;
    last = { x: e.clientX, y: e.clientY };
    rot.auto = false;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    rot.y += (e.clientX - last.x) * 0.5;
    rot.x = Math.max(-40, Math.min(20, rot.x + (e.clientY - last.y) * 0.3));
    last = { x: e.clientX, y: e.clientY };
  });
  const end = () => { dragging = false; setTimeout(() => { rot.auto = true; }, 2200); };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
}

function paintPlayer(stage) {
  stage.querySelector('.p3-anchor')?.remove();
  const anchor = el('<div class="p3-anchor" style="position:relative;transform-style:preserve-3d"></div>');
  const player = el('<div class="player3d"></div>');
  anchor.appendChild(player);
  stage.appendChild(anchor);

  const tex = playerTextures();
  const px = (n) => n * S;

  player.appendChild(part(0, -px(12), box(px(8), px(8), px(8), tex.head)));
  player.appendChild(part(0, -px(2), box(px(8), px(12), px(4), tex.body)));

  const armR = part(-px(6), -px(2), box(px(4), px(12), px(4), tex.armR));
  armR.classList.add('p3-arm');
  const armRInner = el('<div class="p3-arm-swing" style="position:absolute;transform-style:preserve-3d"></div>');
  wrapInner(armR, armRInner);
  const armL = part(px(6), -px(2), box(px(4), px(12), px(4), tex.armL));
  const armLInner = el('<div class="p3-arm-swing" style="position:absolute;animation-delay:-1.7s;transform-style:preserve-3d"></div>');
  wrapInner(armL, armLInner);

  player.appendChild(armR);
  player.appendChild(armL);
  player.appendChild(part(-px(2), px(10), box(px(4), px(12), px(4), tex.legR)));
  player.appendChild(part(px(2), px(10), box(px(4), px(12), px(4), tex.legL)));

  addCosmetics(player, px);

  /* rotation loop */
  stopRotation();
  const spin = () => {
    if (rot.auto) rot.y += 0.35;
    player.style.transform = `translateY(${px(0)}px) rotateX(${rot.x}deg) rotateY(${rot.y}deg)`;
    raf = requestAnimationFrame(spin);
  };
  spin();
}

/** Position a box assembly at (x, y) relative to player center. */
function part(x, y, boxEl) {
  const p = el('<div class="p3-part"></div>');
  p.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  p.appendChild(boxEl);
  return p;
}

/** Move a box's faces into an inner wrapper (for part-level animations). */
function wrapInner(partEl, inner) {
  const boxEl = partEl.firstElementChild;
  partEl.replaceChild(inner, boxEl);
  inner.appendChild(boxEl);
}

/** Build a 6-face CSS box of w×h×d px, textured with data-URLs. */
function box(w, h, d, texMap, colors = null) {
  const b = el('<div style="position:absolute;transform-style:preserve-3d"></div>');
  const face = (fw, fh, transform, texture) => {
    const f = el('<div class="p3-face"></div>');
    f.style.width = `${fw}px`;
    f.style.height = `${fh}px`;
    f.style.left = `${-fw / 2}px`;
    f.style.top = `${-fh / 2}px`;
    f.style.transform = transform;
    if (texture && texture.startsWith('data:')) f.style.backgroundImage = `url(${texture})`;
    else if (texture) f.style.background = texture;
    b.appendChild(f);
  };
  const T = texMap || {};
  const C = colors || {};
  face(w, h, `translateZ(${d / 2}px)`, T.front || C.front);
  face(w, h, `rotateY(180deg) translateZ(${d / 2}px)`, T.back || C.back || T.front || C.front);
  face(d, h, `rotateY(90deg) translateZ(${w / 2}px)`, T.right || C.side || T.front || C.front);
  face(d, h, `rotateY(-90deg) translateZ(${w / 2}px)`, T.left || C.side || T.front || C.front);
  face(w, d, `rotateX(90deg) translateZ(${h / 2}px)`, T.top || C.top || C.front);
  face(w, d, `rotateX(-90deg) translateZ(${h / 2}px)`, T.bottom || C.top || C.front);
  return b;
}

function solidBox(w, h, d, color, topColor) {
  return box(w, h, d, null, { front: color, side: shade(color, 0.85), top: topColor || shade(color, 1.12) });
}

function shade(hex, f) {
  if (!hex.startsWith('#')) return hex;
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

/* ------------------------------------------------------- equipped cosmetics */

function addCosmetics(player, px) {
  const eq = (catId) => COSMETICS.find((x) => x.id === state.cosmetics[catId]);

  const cape = eq('cape');
  if (cape) {
    const plane = el('<div class="p3-part"></div>');
    plane.style.transform = `translate3d(0, ${-px(8)}px, ${-px(2) - 6}px)`;
    const inner = el('<div class="p3-cape-wave" style="position:absolute;transform-style:preserve-3d"></div>');
    const f = el('<div class="p3-face"></div>');
    const w = px(10) * 0.9;
    const h = px(16) * 0.9;
    f.style.width = `${w}px`;
    f.style.height = `${h}px`;
    f.style.left = `${-w / 2}px`;
    f.style.top = '0px';
    f.style.backgroundImage = `url(${capeTexture(cape, 10).toDataURL()})`;
    f.style.backfaceVisibility = 'visible';
    inner.appendChild(f);
    plane.appendChild(inner);
    player.appendChild(plane);
  }

  const hat = eq('hat');
  if (hat) addHat(player, hat, px);

  const wings = eq('wings');
  if (wings) {
    for (const dir of [-1, 1]) {
      const wing = el('<div class="p3-part"></div>');
      wing.style.transform = `translate3d(${dir * px(2)}px, ${-px(6)}px, ${-px(2) - 4}px) rotateY(${dir * 42}deg) rotateZ(${dir * 14}deg)`;
      const f = el('<div class="p3-face"></div>');
      const w = px(9);
      const h = px(12);
      f.style.width = `${w}px`;
      f.style.height = `${h}px`;
      f.style.left = dir === 1 ? '0px' : `${-w}px`;
      f.style.top = '0px';
      f.style.background = `linear-gradient(${dir === 1 ? 105 : 75}deg, ${wings.color}, ${shade(wings.color, 0.7)})`;
      f.style.clipPath = dir === 1
        ? 'polygon(0 12%, 78% 0, 100% 22%, 82% 38%, 96% 52%, 74% 62%, 84% 80%, 52% 82%, 40% 100%, 8% 70%, 0 40%)'
        : 'polygon(100% 12%, 22% 0, 0 22%, 18% 38%, 4% 52%, 26% 62%, 16% 80%, 48% 82%, 60% 100%, 92% 70%, 100% 40%)';
      f.style.backfaceVisibility = 'visible';
      f.style.opacity = '0.95';
      wing.appendChild(f);
      player.appendChild(wing);
    }
  }

  const band = eq('bandana');
  if (band) {
    const b = part(0, -px(8) - 2, solidBox(px(8.6), px(1.6), px(8.6) - 4, band.color));
    player.appendChild(b);
  }

  const pack = eq('backpack');
  if (pack) {
    const p = part(0, -px(2), solidBox(px(7), px(8), px(3), pack.color));
    p.style.transform += ` translateZ(${-px(2) - px(1.5) - 1}px)`;
    player.appendChild(p);
    if (pack.glow) {
      const led = part(0, -px(2), solidBox(px(1.4), px(1.4), px(0.4), '#57d8c4'));
      led.style.transform += ` translateZ(${-px(2) - px(3) - 3}px)`;
      led.firstElementChild.firstElementChild.style.boxShadow = '0 0 14px #57d8c4';
      player.appendChild(led);
    }
  }
}

function addHat(player, hat, px) {
  const topY = -px(16); // top of head
  if (hat.id === 'hat-beanie') {
    player.appendChild(part(0, topY - px(1), solidBox(px(8.8), px(2.4), px(8.8), hat.color)));
    player.appendChild(part(0, topY - px(3.2), solidBox(px(2), px(2), px(2), hat.color2)));
  } else if (hat.id === 'hat-tophat') {
    player.appendChild(part(0, topY - px(0.5), solidBox(px(11), px(1), px(11), hat.color)));
    player.appendChild(part(0, topY - px(4), solidBox(px(6.5), px(6.5), px(6.5), hat.color)));
    player.appendChild(part(0, topY - px(1.6), solidBox(px(6.8), px(1.4), px(6.8), hat.color2)));
  } else if (hat.id === 'hat-halo') {
    const halo = el('<div class="p3-part"></div>');
    halo.style.transform = `translate3d(0, ${topY - px(3)}px, 0)`;
    const bob = el('<div class="p3-bob" style="position:absolute;transform-style:preserve-3d"></div>');
    const ring = el('<div style="position:absolute"></div>');
    const size = px(7);
    ring.style.cssText += `width:${size}px;height:${size}px;left:${-size / 2}px;top:${-size / 2}px;` +
      `transform:rotateX(90deg);border:${px(0.9)}px solid ${hat.color};border-radius:50%;` +
      `box-shadow:0 0 18px ${hat.color}, inset 0 0 12px ${hat.color};`;
    bob.appendChild(ring);
    halo.appendChild(bob);
    player.appendChild(halo);
  } else if (hat.id === 'hat-crown') {
    player.appendChild(part(0, topY - px(1), solidBox(px(8.6), px(2), px(8.6), hat.color)));
    for (const [cx, cz] of [[-3, -3], [3, -3], [-3, 3], [3, 3], [0, -4.2]]) {
      player.appendChild(part(px(cx * 0.9), topY - px(2.8), solidBox(px(1.4), px(1.6), px(1.4), hat.color)));
      void cz;
    }
    const gem = part(0, topY - px(0.8), solidBox(px(1.2), px(1.2), px(0.4), hat.color2));
    gem.style.transform += ` translateZ(${px(4.4)}px)`;
    player.appendChild(gem);
  }
}

/* ---------------------------------------------------------------- emotes */

function playEmote(anim) {
  const player = document.querySelector('.player3d');
  if (!player) return;
  if (anim === 'wave') {
    const arm = player.querySelector('.p3-arm .p3-arm-swing');
    if (!arm) return;
    arm.classList.remove('p3-arm-swing');
    arm.style.transformOrigin = `0px ${-6 * S}px`;
    arm.classList.add('p3-wave');
    setTimeout(() => {
      arm.classList.remove('p3-wave');
      arm.classList.add('p3-arm-swing');
      arm.style.transformOrigin = '';
    }, 3300);
  } else if (anim === 'spin') {
    const prev = rot.auto;
    rot.auto = false;
    const start = rot.y;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 900);
      rot.y = start + 360 * (1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(step);
      else rot.auto = prev;
    };
    requestAnimationFrame(step);
  }
}
