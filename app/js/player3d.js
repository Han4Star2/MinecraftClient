/* Reusable CSS-3D voxel player preview with cosmetics: capes (incl. custom
   pixel capes), hats, wings, pets (orbiting companions), nametag effects and
   emote animations. Used by the wardrobe, the shop try-on dialog and the
   cape studio. Each mount is independent (own rotation state). */

import { el, esc } from './components.js';
import { playerTextures, capeTexture, capeTextureFromPixels } from './skin.js';
import { shopItem } from './shopCatalog.js';
import { customCape } from './economy.js';
import { capeCanvas, capeById } from './vanillaCapes.js';

const S = 9; // px per skin-pixel
const px = (n) => n * S;

/**
 * Mount a rotating player into `stage`.
 * @param {HTMLElement} stage - container (position:relative, perspective set by CSS)
 * @param {() => {cape,hat,wings,pet,nametag,name}} getEquip
 * @returns {{refresh:Function, playEmote:Function, destroy:Function}}
 */
export function mountPlayer(stage, getEquip) {
  const rot = { y: 24, x: -8, auto: true };
  let raf = null;
  let player = null;

  function build() {
    stage.querySelector('.p3-anchor')?.remove();
    stage.querySelector('.pv-nametag')?.remove();
    const anchor = el('<div class="p3-anchor" style="position:relative;transform-style:preserve-3d"></div>');
    player = el('<div class="player3d"></div>');
    const rig = el('<div class="p3-rig" style="position:absolute;transform-style:preserve-3d"></div>');
    player.appendChild(rig);
    anchor.appendChild(player);
    stage.appendChild(anchor);

    const eq = getEquip();
    const tex = playerTextures();

    rig.appendChild(part(0, -px(12), box(px(8), px(8), px(8), tex.head)));
    rig.appendChild(part(0, -px(2), box(px(8), px(12), px(4), tex.body)));

    const mkArm = (side, texArm, delay) => {
      const arm = part(side * px(6), -px(2), box(px(4), px(12), px(4), texArm));
      arm.classList.add(side < 0 ? 'p3-arm-r' : 'p3-arm-l');
      const inner = el(`<div class="p3-arm-swing" style="position:absolute;transform-style:preserve-3d;${delay ? `animation-delay:${delay};` : ''}"></div>`);
      wrapInner(arm, inner);
      return arm;
    };
    rig.appendChild(mkArm(-1, tex.armR, ''));
    rig.appendChild(mkArm(1, tex.armL, '-1.7s'));

    const mkLeg = (side, texLeg) => {
      const leg = part(side * px(2), px(10), box(px(4), px(12), px(4), texLeg));
      leg.classList.add(side < 0 ? 'p3-leg-r' : 'p3-leg-l');
      const inner = el('<div class="p3-leg-inner" style="position:absolute;transform-style:preserve-3d"></div>');
      wrapInner(leg, inner);
      return leg;
    };
    rig.appendChild(mkLeg(-1, tex.legR));
    rig.appendChild(mkLeg(1, tex.legL));

    addCape(rig, eq.cape);
    addHat(rig, eq.hat);
    addWings(rig, eq.wings);
    addPet(player, eq.pet);
    addNametag(stage, eq.name || 'Player', eq.nametag);
  }

  function spin() {
    if (rot.auto) rot.y += 0.35;
    if (player) player.style.transform = `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`;
    raf = requestAnimationFrame(spin);
  }

  /* drag to rotate */
  let dragging = false;
  let last = null;
  const down = (e) => { dragging = true; last = { x: e.clientX, y: e.clientY }; rot.auto = false; stage.setPointerCapture?.(e.pointerId); };
  const move = (e) => {
    if (!dragging) return;
    rot.y += (e.clientX - last.x) * 0.5;
    rot.x = Math.max(-40, Math.min(20, rot.x + (e.clientY - last.y) * 0.3));
    last = { x: e.clientX, y: e.clientY };
  };
  const up = () => { dragging = false; setTimeout(() => { rot.auto = true; }, 2200); };
  stage.addEventListener('pointerdown', down);
  stage.addEventListener('pointermove', move);
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);

  build();
  spin();

  return {
    refresh: build,
    destroy() {
      cancelAnimationFrame(raf);
      stage.removeEventListener('pointerdown', down);
      stage.removeEventListener('pointermove', move);
      stage.removeEventListener('pointerup', up);
      stage.removeEventListener('pointercancel', up);
    },
    playEmote(anim) { playEmote(player, rot, anim); },
  };
}

/* -------------------------------------------------------------- geometry */

function part(x, y, boxEl) {
  const p = el('<div class="p3-part"></div>');
  p.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  p.appendChild(boxEl);
  return p;
}

function wrapInner(partEl, inner) {
  const boxEl = partEl.firstElementChild;
  partEl.replaceChild(inner, boxEl);
  inner.appendChild(boxEl);
}

function box(w, h, d, texMap, colors = null) {
  const b = el('<div style="position:absolute;transform-style:preserve-3d"></div>');
  const face = (fw, fh, transform, texture) => {
    const f = el('<div class="p3-face"></div>');
    f.style.width = `${fw}px`;
    f.style.height = `${fh}px`;
    f.style.left = `${-fw / 2}px`;
    f.style.top = `${-fh / 2}px`;
    f.style.transform = transform;
    if (texture && texture.startsWith?.('data:')) f.style.backgroundImage = `url(${texture})`;
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
  if (!hex?.startsWith?.('#')) return hex;
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

/* -------------------------------------------------------------- cosmetics */

export function resolveCapeCanvas(capeId, scale = 10) {
  if (!capeId) return null;
  const vanilla = capeById(capeId);
  if (vanilla) return capeCanvas(vanilla, scale);
  const custom = customCape(capeId);
  if (custom) return capeTextureFromPixels(custom.pixels, scale);
  const item = shopItem(capeId);
  if (item?.cat === 'cape') return capeTexture(item, scale);
  return null;
}

function addCape(rig, capeId) {
  const canvas = resolveCapeCanvas(capeId);
  if (!canvas) return;
  const plane = el('<div class="p3-part"></div>');
  plane.style.transform = `translate3d(0, ${-px(8)}px, ${-px(2) - 6}px)`;
  const inner = el('<div class="p3-cape-wave" style="position:absolute;transform-style:preserve-3d"></div>');
  const f = el('<div class="p3-face"></div>');
  const w = px(10) * 0.9;
  const h = px(16) * 0.9;
  f.style.cssText += `width:${w}px;height:${h}px;left:${-w / 2}px;top:0;backface-visibility:visible;`;
  f.style.backgroundImage = `url(${canvas.toDataURL()})`;
  inner.appendChild(f);
  plane.appendChild(inner);
  rig.appendChild(plane);
}

function addHat(rig, hatId) {
  const hat = shopItem(hatId);
  if (!hat) return;
  const topY = -px(16);
  const kind = hat.kind || hat.id.split('-')[1];

  if (kind === 'beanie') {
    rig.appendChild(part(0, topY - px(1), solidBox(px(8.8), px(2.4), px(8.8), hat.color)));
    rig.appendChild(part(0, topY - px(3.2), solidBox(px(2), px(2), px(2), hat.color2)));
  } else if (kind === 'tophat') {
    rig.appendChild(part(0, topY - px(0.5), solidBox(px(11), px(1), px(11), hat.color)));
    rig.appendChild(part(0, topY - px(4), solidBox(px(6.5), px(6.5), px(6.5), hat.color)));
    rig.appendChild(part(0, topY - px(1.6), solidBox(px(6.8), px(1.4), px(6.8), hat.color2)));
  } else if (kind === 'halo') {
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
    rig.appendChild(halo);
  } else if (kind === 'crown') {
    rig.appendChild(part(0, topY - px(1), solidBox(px(8.6), px(2), px(8.6), hat.color)));
    for (const cx of [-3, 0, 3]) {
      rig.appendChild(part(px(cx * 0.9), topY - px(2.8), solidBox(px(1.4), px(1.6), px(1.4), hat.color)));
    }
    const gem = part(0, topY - px(0.8), solidBox(px(1.2), px(1.2), px(0.4), hat.color2));
    gem.style.transform += ` translateZ(${px(4.4)}px)`;
    rig.appendChild(gem);
  } else if (kind === 'cap') {
    rig.appendChild(part(0, topY - px(1), solidBox(px(8.8), px(2.2), px(8.8), hat.color)));
    const brim = part(0, topY + px(0.2), solidBox(px(7), px(0.7), px(4), hat.color2));
    brim.style.transform += ` translateZ(${px(6)}px)`;
    rig.appendChild(brim);
  } else if (kind === 'horns') {
    for (const side of [-1, 1]) {
      const h1 = part(side * px(3), topY - px(1.4), solidBox(px(1.4), px(2.6), px(1.4), hat.color));
      h1.style.transform += ` rotateZ(${side * 18}deg)`;
      const h2 = part(side * px(3.9), topY - px(3.4), solidBox(px(1), px(1.8), px(1), hat.color2));
      h2.style.transform += ` rotateZ(${side * 32}deg)`;
      rig.appendChild(h1);
      rig.appendChild(h2);
    }
  }
}

const WING_CLIPS = {
  angel: [
    'polygon(0 12%, 78% 0, 100% 22%, 82% 38%, 96% 52%, 74% 62%, 84% 80%, 52% 82%, 40% 100%, 8% 70%, 0 40%)',
    'polygon(100% 12%, 22% 0, 0 22%, 18% 38%, 4% 52%, 26% 62%, 16% 80%, 48% 82%, 60% 100%, 92% 70%, 100% 40%)',
  ],
  dragon: [
    'polygon(0 20%, 60% 0, 100% 10%, 78% 30%, 100% 45%, 70% 58%, 92% 78%, 48% 78%, 30% 100%, 10% 62%, 0 40%)',
    'polygon(100% 20%, 40% 0, 0 10%, 22% 30%, 0 45%, 30% 58%, 8% 78%, 52% 78%, 70% 100%, 90% 62%, 100% 40%)',
  ],
  pixie: [
    'polygon(0 30%, 55% 0, 90% 8%, 100% 35%, 80% 55%, 95% 75%, 60% 95%, 20% 80%, 0 55%)',
    'polygon(100% 30%, 45% 0, 10% 8%, 0 35%, 20% 55%, 5% 75%, 40% 95%, 80% 80%, 100% 55%)',
  ],
  phantom: [
    'polygon(0 15%, 40% 0, 70% 12%, 100% 0, 88% 30%, 100% 48%, 78% 58%, 92% 82%, 60% 74%, 44% 100%, 22% 72%, 0 48%)',
    'polygon(100% 15%, 60% 0, 30% 12%, 0 0, 12% 30%, 0 48%, 22% 58%, 8% 82%, 40% 74%, 56% 100%, 78% 72%, 100% 48%)',
  ],
};

function addWings(rig, wingsId) {
  const wings = shopItem(wingsId);
  if (!wings) return;
  const kind = wings.kind || 'angel';
  const clips = WING_CLIPS[kind] || WING_CLIPS.angel;
  for (const dir of [-1, 1]) {
    const wing = el('<div class="p3-part"></div>');
    wing.style.transform = `translate3d(${dir * px(2)}px, ${-px(6)}px, ${-px(2) - 4}px) rotateY(${dir * 42}deg) rotateZ(${dir * 14}deg)`;
    const f = el('<div class="p3-face p3-wing-flap"></div>');
    const w = px(kind === 'phantom' ? 10.5 : 9);
    const h = px(12);
    f.style.cssText += `width:${w}px;height:${h}px;left:${dir === 1 ? 0 : -w}px;top:0;backface-visibility:visible;opacity:.95;`;
    f.style.background = `linear-gradient(${dir === 1 ? 105 : 75}deg, ${wings.color}, ${shade(wings.color, 0.65)})`;
    f.style.clipPath = clips[dir === 1 ? 0 : 1];
    wing.appendChild(f);
    rig.appendChild(wing);
  }
}

/* pets orbit the player on their own rotating carrier */
function addPet(player, petId) {
  const pet = shopItem(petId);
  if (!pet) return;
  const orbit = el('<div class="p3-part p3-pet-orbit" style="transform-style:preserve-3d"></div>');
  const holder = el('<div class="p3-part p3-pet-bob"></div>');
  holder.style.transform = `translate3d(${px(9)}px, ${-px(9)}px, 0)`;
  const tex = petFaceTexture(pet);
  const body = box(px(3.2), px(3.2), px(3.2), { front: tex }, { front: pet.color, side: shade(pet.color, 0.85), top: shade(pet.color, 1.12) });
  if (pet.glow) body.querySelectorAll('.p3-face').forEach((f) => { f.style.boxShadow = `0 0 16px ${pet.color}`; });
  holder.appendChild(body);
  orbit.appendChild(holder);
  player.appendChild(orbit);
}

function petFaceTexture(pet) {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 8;
  const ctx = c.getContext('2d');
  ctx.fillStyle = pet.color;
  ctx.fillRect(0, 0, 8, 8);
  const dark = shade(pet.color, 0.45);
  ctx.fillStyle = dark;
  switch (pet.face) {
    case 'creeper':
      ctx.fillRect(1, 2, 2, 2); ctx.fillRect(5, 2, 2, 2);
      ctx.fillRect(3, 4, 2, 2); ctx.fillRect(2, 5, 1, 2); ctx.fillRect(5, 5, 1, 2);
      break;
    case 'ghost':
      ctx.fillStyle = '#2b2d36'; ctx.fillRect(2, 3, 1, 2); ctx.fillRect(5, 3, 1, 2);
      ctx.fillRect(3, 6, 2, 1);
      break;
    case 'blaze':
      ctx.fillStyle = '#7a3208'; ctx.fillRect(1, 3, 2, 1); ctx.fillRect(5, 3, 2, 1);
      ctx.fillStyle = '#ffd35b'; ctx.fillRect(2, 5, 4, 1);
      break;
    case 'ender':
      ctx.fillStyle = '#c56cf0'; ctx.fillRect(1, 3, 2, 1); ctx.fillRect(5, 3, 2, 1);
      break;
    case 'bee':
      ctx.fillStyle = '#2b2d36'; ctx.fillRect(0, 2, 8, 1); ctx.fillRect(0, 5, 8, 1);
      ctx.fillRect(2, 3, 1, 1); ctx.fillRect(5, 3, 1, 1);
      break;
    case 'fox':
      ctx.fillStyle = '#fff'; ctx.fillRect(2, 4, 4, 3);
      ctx.fillStyle = '#2b2d36'; ctx.fillRect(2, 3, 1, 1); ctx.fillRect(5, 3, 1, 1); ctx.fillRect(3, 5, 2, 1);
      break;
    case 'star':
      ctx.fillStyle = '#e8963a'; ctx.fillRect(3, 1, 2, 6); ctx.fillRect(1, 3, 6, 2);
      break;
    default:
      ctx.fillRect(2, 3, 1, 1); ctx.fillRect(5, 3, 1, 1);
  }
  const big = document.createElement('canvas');
  big.width = 64; big.height = 64;
  const bctx = big.getContext('2d');
  bctx.imageSmoothingEnabled = false;
  bctx.drawImage(c, 0, 0, 64, 64);
  return big.toDataURL();
}

function addNametag(stage, name, tagId) {
  const fx = shopItem(tagId)?.fx || null;
  const tag = el(`<div class="pv-nametag ${fx ? `tagfx-${fx}` : ''}"></div>`);
  if (fx === 'wave' || fx === 'glitch') {
    for (const [i, ch] of [...name].entries()) {
      const s = el(`<span>${esc(ch)}</span>`);
      s.style.animationDelay = `${i * 0.09}s`;
      tag.appendChild(s);
    }
  } else {
    tag.textContent = name;
  }
  stage.appendChild(tag);
}

/* ---------------------------------------------------------------- emotes */

function playEmote(player, rot, anim) {
  if (!player) return;
  const rig = player.querySelector('.p3-rig');
  const armR = player.querySelector('.p3-arm-r .p3-arm-swing');
  const armL = player.querySelector('.p3-arm-l .p3-arm-swing');
  const legs = player.querySelectorAll('.p3-leg-inner');

  const tempClass = (nodes, cls, ms, origin = null) => {
    for (const n of nodes) {
      if (!n) continue;
      n.classList.remove('p3-arm-swing');
      if (origin) n.style.transformOrigin = origin;
      n.classList.add(cls);
    }
    setTimeout(() => {
      for (const n of nodes) {
        if (!n) continue;
        n.classList.remove(cls);
        n.style.transformOrigin = '';
        if (n === armR || n === armL) n.classList.add('p3-arm-swing');
      }
    }, ms);
  };

  switch (anim) {
    case 'wave':
      tempClass([armR], 'p3-wave', 3300, `0px ${-px(6)}px`);
      break;
    case 'spin': {
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
      break;
    }
    case 'flip':
      tempClass([rig], 'p3-flip', 1300);
      break;
    case 'bow':
      tempClass([rig], 'p3-bow', 1800);
      break;
    case 'dance':
      tempClass([armR, armL, rig], 'p3-dance', 3200, `0px ${-px(6)}px`);
      break;
    case 'clap':
      tempClass([armR, armL], 'p3-clap', 2400, `0px ${-px(6)}px`);
      break;
    case 'flex':
      tempClass([armR, armL], 'p3-flex', 2200, `0px ${-px(6)}px`);
      break;
    case 'sit':
      tempClass([...legs, rig], 'p3-sit', 3000, `0px ${-px(6)}px`);
      break;
  }
}
