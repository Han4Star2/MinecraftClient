/* Programmatic Minecraft-style skin.
   Horus ships no binary assets — the default skin is painted at runtime onto a
   64×64 canvas following the standard skin layout, so the avatar, friends list
   and the 3D cosmetics preview all work fully offline. If the backend is
   online it can substitute a real skin fetched by player name. */

const PAL = {
  hair: '#4a2f1c',
  hairD: '#3b2413',
  skin: '#c98e68',
  skinD: '#b57c58',
  eyeW: '#ffffff',
  eye: '#4a5adf',
  mouth: '#8a5c3e',
  shirt: '#2e8b8b',
  shirtD: '#25716f',
  pants: '#3d4d9e',
  pantsD: '#32407f',
  shoes: '#6e6e72',
  shoesD: '#57575b',
};

/* Deterministic tiny PRNG for pixel noise so the skin looks "textured". */
function prng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, ((n >> 16) & 255) * f));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) * f));
  const b = Math.min(255, Math.max(0, (n & 255) * f));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function noisyRect(ctx, x, y, w, h, color, rnd, amount = 0.07) {
  for (let px = x; px < x + w; px++) {
    for (let py = y; py < y + h; py++) {
      ctx.fillStyle = shade(color, 1 - amount / 2 + rnd() * amount);
      ctx.fillRect(px, py, 1, 1);
    }
  }
}

let cachedSkin = null;

/** Build (once) and return the default 64×64 skin canvas. */
export function defaultSkin() {
  if (cachedSkin) return cachedSkin;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  const rnd = prng(1337);
  const R = (x, y, w, h, col, amt) => noisyRect(ctx, x, y, w, h, col, rnd, amt);

  /* ---- head (top 8,0 / bottom 16,0 / right 0,8 / front 8,8 / left 16,8 / back 24,8) */
  R(8, 0, 8, 8, PAL.hair);                    // top = hair
  R(16, 0, 8, 8, PAL.skinD);                  // bottom
  for (const [sx] of [[0], [8], [16], [24]]) { // sides: hair cap upper 3 rows, skin below
    R(sx, 8, 8, 3, sx === 8 ? PAL.hair : PAL.hairD);
    R(sx, 11, 8, 5, sx === 8 ? PAL.skin : PAL.skinD);
  }
  R(24, 8, 8, 8, PAL.hairD);                  // back of head fully hair
  /* face details on front (8,8)-(15,15) */
  R(8, 11, 8, 1, PAL.skin, 0.03);             // brow line
  ctx.fillStyle = PAL.eyeW; ctx.fillRect(9, 12, 1, 1); ctx.fillRect(14, 12, 1, 1);
  ctx.fillStyle = PAL.eye;  ctx.fillRect(10, 12, 1, 1); ctx.fillRect(13, 12, 1, 1);
  ctx.fillStyle = PAL.skinD; ctx.fillRect(11, 13, 2, 1);           // nose
  ctx.fillStyle = PAL.mouth; ctx.fillRect(11, 15, 2, 1);           // mouth

  /* ---- body (front 20,20 8×12 / back 32,20 / right 16,20 4×12 / left 28,20 / top 20,16 / bottom 28,16) */
  R(20, 16, 8, 4, PAL.shirt);
  R(28, 16, 8, 4, PAL.shirtD);
  R(20, 20, 8, 12, PAL.shirt);
  R(32, 20, 8, 12, PAL.shirtD);
  R(16, 20, 4, 12, PAL.shirtD);
  R(28, 20, 4, 12, PAL.shirtD);
  /* small logo detail on chest */
  ctx.fillStyle = '#e8ecf2'; ctx.fillRect(23, 23, 1, 3); ctx.fillRect(24, 22, 1, 1);

  /* ---- arms: block origin (40,16) right, (32,48) left (modern layout) */
  for (const [ox, oy] of [[40, 16], [32, 48]]) {
    R(ox + 4, oy, 4, 4, PAL.shirt);        // top
    R(ox + 8, oy, 4, 4, PAL.skinD);        // bottom (hand)
    R(ox, oy + 4, 4, 12, PAL.shirtD);      // right
    R(ox + 4, oy + 4, 4, 12, PAL.shirt);   // front
    R(ox + 8, oy + 4, 4, 12, PAL.shirtD);  // left
    R(ox + 12, oy + 4, 4, 12, PAL.shirtD); // back
    /* sleeve is short: hands = skin on the lower 5 rows of every face */
    for (const dx of [0, 4, 8, 12]) R(ox + dx, oy + 11, 4, 5, dx === 4 ? PAL.skin : PAL.skinD);
  }

  /* ---- right leg (0,16 block) & left leg (16,48 block) */
  for (const [bx, by] of [[0, 16], [16, 48]]) {
    R(bx + 4, by, 8, 4, PAL.pants);
    for (const dx of [0, 4, 8, 12]) {
      const col = dx === 4 ? PAL.pants : PAL.pantsD;
      R(bx + dx, by + 4, 4, 9, col);
      R(bx + dx, by + 13, 4, 3, dx === 4 ? PAL.shoes : PAL.shoesD);
    }
  }

  cachedSkin = c;
  return c;
}

/** Draw the face (head front, incl. overlay-free) onto a canvas at given size. */
export function drawFace(canvas, size = 32, skin = defaultSkin()) {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(skin, 8, 8, 8, 8, 0, 0, size, size);
  return canvas;
}

/** Extract a skin region as a data URL (used as CSS background for 3D faces). */
export function regionURL(sx, sy, sw, sh, scale = 8, skin = defaultSkin()) {
  const c = document.createElement('canvas');
  c.width = sw * scale;
  c.height = sh * scale;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(skin, sx, sy, sw, sh, 0, 0, sw * scale, sh * scale);
  return c.toDataURL();
}

/** All texture regions needed by the 3D preview, keyed by body part. */
export function playerTextures() {
  const r = regionURL;
  return {
    head: { front: r(8, 8, 8, 8), back: r(24, 8, 8, 8), right: r(0, 8, 8, 8), left: r(16, 8, 8, 8), top: r(8, 0, 8, 8), bottom: r(16, 0, 8, 8) },
    body: { front: r(20, 20, 8, 12), back: r(32, 20, 8, 12), right: r(16, 20, 4, 12), left: r(28, 20, 4, 12), top: r(20, 16, 8, 4), bottom: r(28, 16, 8, 4) },
    armR: { front: r(44, 20, 4, 12), back: r(52, 20, 4, 12), right: r(40, 20, 4, 12), left: r(48, 20, 4, 12), top: r(44, 16, 4, 4), bottom: r(48, 16, 4, 4) },
    armL: { front: r(36, 52, 4, 12), back: r(44, 52, 4, 12), right: r(32, 52, 4, 12), left: r(40, 52, 4, 12), top: r(36, 48, 4, 4), bottom: r(40, 48, 4, 4) },
    legR: { front: r(4, 20, 4, 12), back: r(12, 20, 4, 12), right: r(0, 20, 4, 12), left: r(8, 20, 4, 12), top: r(4, 16, 4, 4), bottom: r(8, 16, 4, 4) },
    legL: { front: r(20, 52, 4, 12), back: r(28, 52, 4, 12), right: r(16, 52, 4, 12), left: r(24, 52, 4, 12), top: r(20, 48, 4, 4), bottom: r(24, 48, 4, 4) },
  };
}

/** Paint a cape texture (10×16 px design, upscaled) for a given style. */
export function capeTexture(style, scale = 10) {
  const c = document.createElement('canvas');
  c.width = 10 * scale;
  c.height = 16 * scale;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const px = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * scale, y * scale, w * scale, h * scale); };
  const rnd = prng(style.seed || 7);

  // base with subtle per-pixel noise
  for (let x = 0; x < 10; x++)
    for (let y = 0; y < 16; y++) {
      ctx.fillStyle = shade(style.base, 0.94 + rnd() * 0.12);
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }

  switch (style.pattern) {
    case 'stripe':
      px(0, 0, 10, 3, style.alt);
      px(0, 13, 10, 3, style.alt);
      break;
    case 'vstripe':
      px(4, 0, 2, 16, style.alt);
      break;
    case 'checker':
      for (let x = 0; x < 10; x++) for (let y = 0; y < 16; y++) if ((x + y) % 2) px(x, y, 1, 1, style.alt);
      break;
    case 'gradient':
      for (let y = 0; y < 16; y++) {
        ctx.fillStyle = mix(style.base, style.alt, y / 15);
        ctx.fillRect(0, y * scale, 10 * scale, scale);
      }
      break;
    case 'star':
      px(4, 3, 2, 1, style.alt); px(3, 4, 4, 1, style.alt); px(2, 5, 6, 1, style.alt);
      px(3, 6, 4, 1, style.alt); px(4, 7, 2, 1, style.alt);
      px(2, 7, 1, 1, style.alt); px(7, 7, 1, 1, style.alt);
      break;
    case 'horus':
      px(5, 2, 1, 10, style.alt); px(4, 3, 1, 8, style.alt); px(6, 3, 1, 6, style.alt);
      px(3, 5, 1, 4, style.alt); px(7, 4, 1, 3, style.alt);
      break;
    case 'creeper':
      px(2, 4, 2, 2, style.alt); px(6, 4, 2, 2, style.alt);
      px(4, 6, 2, 3, style.alt); px(3, 8, 1, 2, style.alt); px(6, 8, 1, 2, style.alt);
      break;
    case 'diamond':
      px(4, 4, 2, 1, style.alt); px(3, 5, 4, 1, style.alt); px(2, 6, 6, 2, style.alt);
      px(3, 8, 4, 1, style.alt); px(4, 9, 2, 1, style.alt);
      break;
    case 'arrow':
      for (let k = 0; k < 4; k++) { px(2 + k, 3 + k, 1, 2, style.alt); px(7 - k, 3 + k, 1, 2, style.alt); }
      for (let k = 0; k < 4; k++) { px(2 + k, 9 + k, 1, 2, style.alt); px(7 - k, 9 + k, 1, 2, style.alt); }
      break;
    case 'split':
      px(0, 0, 5, 16, style.alt);
      break;
    case 'border':
      px(0, 0, 10, 1, style.alt); px(0, 15, 10, 1, style.alt);
      px(0, 0, 1, 16, style.alt); px(9, 0, 1, 16, style.alt);
      px(0, 1, 10, 1, style.alt);
      break;
  }
  // hem shading
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, 15 * scale, 10 * scale, scale);
  return c;
}

/** Render a Cape-Studio pixel grid (16 rows × 10 cols of hex|null) to a canvas. */
export function capeTextureFromPixels(pixels, scale = 10, bg = '#20232a') {
  const c = document.createElement('canvas');
  c.width = 10 * scale;
  c.height = 16 * scale;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 10; x++) {
      ctx.fillStyle = pixels?.[y]?.[x] || bg;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(0, 15 * scale, 10 * scale, scale);
  return c;
}

function mix(a, b, f) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (sa, sb) => Math.round(sa + (sb - sa) * f);
  return `rgb(${ch((pa >> 16) & 255, (pb >> 16) & 255)},${ch((pa >> 8) & 255, (pb >> 8) & 255)},${ch(pa & 255, pb & 255)})`;
}
