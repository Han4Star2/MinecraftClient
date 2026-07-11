/* Every official Minecraft cape, recreated as high-quality pixel art.

   Minecraft's cape texture front face is a 10×16 region. Each cape below is
   painted into that 10×16 grid with a compact draw routine (base fill + a
   recognizable emblem), then upscaled for crisp display and used both as the
   3D preview texture and the browser thumbnails. Colors approximate the real
   capes as closely as flat pixels allow.

   These are original pixel renditions for cosmetic previews — Horus ships no
   ripped game assets. */

/* ------------------------------------------------------------- paint utils */

function mix(a, b, f) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s, t) => Math.round(s + (t - s) * f);
  const r = ch((pa >> 16) & 255, (pb >> 16) & 255);
  const g = ch((pa >> 8) & 255, (pb >> 8) & 255);
  const bl = ch(pa & 255, pb & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1)}`;
}
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `#${((1 << 24) + (c((n >> 16) & 255) << 16) + (c((n >> 8) & 255) << 8) + c(n & 255)).toString(16).slice(1)}`;
}

/* Draw helper factory bound to a canvas context + scale. */
function painter(ctx, s) {
  return (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x * s, y * s, w * s, h * s); };
}

function fillBase(ctx, s, spec, rnd) {
  if (spec.gradient) {
    for (let y = 0; y < 16; y++) {
      ctx.fillStyle = mix(spec.gradient[0], spec.gradient[1], y / 15);
      ctx.fillRect(0, y * s, 10 * s, s);
    }
  } else {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 10; x++) {
      ctx.fillStyle = shade(spec.base, 0.96 + rnd() * 0.08);
      ctx.fillRect(x * s, y * s, s, s);
    }
  }
  // subtle inner border + hem shading every real cape has
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(0, 15 * s, 10 * s, s);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(0, 0, 10 * s, s);
}

function prng(seed) {
  let n = seed >>> 0;
  return () => ((n = (n * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/* ------------------------------------------------------------- cape roster */
/* Each: id, name, uses (flavor), draw(P, C, ctx, s) painting the 10×16 face. */

export const VANILLA_CAPES = [
  { id: 'vc-migrator', name: 'Migrator', uses: 9120000, base: '#0e5a5a', draw: (P) => {
    // teal with a golden swirl (Mojang migration mark)
    P(0, 0, 10, 16, '#0e5a5a');
    for (let i = 0; i < 6; i++) P(2 + i, 4 + i, 2, 1, '#e8b13a');
    P(3, 4, 4, 1, '#f3c85b'); P(2, 5, 1, 4, '#e8b13a'); P(7, 7, 1, 4, '#e8b13a');
    P(4, 9, 3, 1, '#f3c85b'); P(4, 6, 2, 3, '#0b4747');
  } },
  { id: 'vc-cherry', name: 'Cherry Blossom', uses: 4870000, gradient: ['#7fb2e0', '#f7c9dd'], draw: (P, C, ctx, s) => {
    // sky-to-pink with a branch and petals
    for (let y = 0; y < 16; y++) { ctx.fillStyle = mix('#8fbfe8', '#f6c7db', y / 15); ctx.fillRect(0, y * s, 10 * s, s); }
    P(1, 9, 6, 1, '#5a3b2a'); P(2, 8, 1, 1, '#5a3b2a'); P(4, 7, 1, 1, '#5a3b2a'); P(6, 6, 1, 2, '#5a3b2a');
    for (const [x, y] of [[2, 6], [3, 5], [5, 5], [7, 4], [1, 7], [8, 6], [4, 3], [6, 9], [8, 9]]) {
      P(x, y, 1, 1, '#ffd7e6'); P(x, y, 1, 1, Math.random() < 0.5 ? '#ff9dc0' : '#ffd7e6');
    }
    P(2, 12, 1, 1, '#ffb3d1'); P(7, 13, 1, 1, '#ffb3d1'); P(4, 14, 1, 1, '#ffc9de');
  } },
  { id: 'vc-anniv15', name: '15th Anniversary', uses: 3110000, base: '#141a3a', draw: (P) => {
    P(0, 0, 10, 16, '#141a3a');
    // golden "15"
    P(2, 5, 1, 6, '#f3c14b'); P(1, 5, 1, 1, '#f3c14b'); P(1, 10, 3, 1, '#f3c14b');
    P(4, 5, 3, 1, '#f3c14b'); P(4, 6, 1, 1, '#f3c14b'); P(4, 7, 3, 1, '#f3c14b'); P(6, 8, 1, 2, '#f3c14b'); P(4, 10, 3, 1, '#f3c14b');
    P(8, 5, 1, 6, '#c99a2e');
  } },
  { id: 'vc-vanilla', name: 'Vanilla', uses: 2760000, base: '#efe6d0', draw: (P) => {
    P(0, 0, 10, 16, '#efe6d0');
    // vanilla flower + pod
    P(4, 4, 2, 2, '#f6efdd'); P(3, 5, 4, 2, '#f6efdd'); P(4, 6, 2, 2, '#f6efdd');
    P(4, 5, 2, 2, '#d8c48a'); P(4, 8, 1, 5, '#6a4a2a'); P(5, 9, 1, 4, '#7c5836');
    P(3, 5, 1, 1, '#e7dcbf'); P(6, 6, 1, 1, '#e7dcbf');
  } },
  { id: 'vc-mojang', name: 'Mojang Studios', uses: 5540000, base: '#7a1524', draw: (P) => {
    P(0, 0, 10, 16, '#7a1524');
    // white rounded logo mark
    P(3, 5, 4, 1, '#f2e9df'); P(2, 6, 6, 4, '#f2e9df'); P(3, 10, 4, 1, '#f2e9df');
    P(3, 7, 1, 2, '#7a1524'); P(6, 7, 1, 2, '#7a1524'); P(4, 8, 2, 1, '#c53a4a');
  } },
  { id: 'vc-mojang-classic', name: 'Mojang (Classic)', uses: 1980000, base: '#101014', draw: (P) => {
    P(0, 0, 10, 16, '#101014');
    P(2, 6, 6, 1, '#d33b3b'); P(2, 7, 1, 3, '#d33b3b'); P(4, 7, 1, 3, '#d33b3b'); P(3, 9, 1, 1, '#d33b3b');
    P(6, 6, 1, 4, '#d33b3b'); P(5, 6, 1, 1, '#d33b3b'); P(7, 6, 1, 1, '#d33b3b');
  } },
  { id: 'vc-minecon2011', name: 'MineCon 2011', uses: 890000, base: '#245a8c', draw: (P) => {
    P(0, 0, 10, 16, '#245a8c');
    creeper(P, '#3fae4a'); P(2, 12, 6, 1, '#8fd0f0');
  } },
  { id: 'vc-minecon2012', name: 'MineCon 2012', uses: 760000, base: '#1f7a3a', draw: (P) => {
    P(0, 0, 10, 16, '#1f7a3a'); P(0, 0, 10, 16, '#1f7a3a');
    P(1, 2, 8, 1, '#8be0a0'); diamond(P, 4, 6, '#eafff0'); P(2, 13, 6, 1, '#155e2c');
  } },
  { id: 'vc-minecon2013', name: 'MineCon 2013', uses: 700000, base: '#b5892e', draw: (P) => {
    P(0, 0, 10, 16, '#b5892e'); diamond(P, 4, 5, '#f6d98a');
    P(2, 10, 6, 1, '#8a6720'); P(3, 12, 4, 1, '#8a6720'); P(2, 3, 6, 1, '#e8c874');
  } },
  { id: 'vc-minecon2015', name: 'MineCon 2015', uses: 640000, base: '#3f9fd4', draw: (P) => {
    P(0, 0, 10, 16, '#3f9fd4'); creeper(P, '#2f7a35'); P(1, 1, 8, 1, '#bfe8fa');
  } },
  { id: 'vc-minecon2016', name: 'MineCon 2016', uses: 610000, base: '#5a2d8c', draw: (P) => {
    P(0, 0, 10, 16, '#5a2d8c'); creeper(P, '#f3c14b'); P(2, 12, 6, 1, '#8a5fd0');
  } },
  { id: 'vc-realms', name: 'Realms Mapmaker', uses: 540000, base: '#1d5f8c', draw: (P) => {
    P(0, 0, 10, 16, '#1d5f8c');
    // green globe
    P(3, 5, 4, 1, '#3fae4a'); P(2, 6, 6, 4, '#3fae4a'); P(3, 10, 4, 1, '#3fae4a');
    P(3, 7, 1, 1, '#2c8038'); P(5, 8, 2, 1, '#2c8038'); P(4, 6, 1, 1, '#66d06f');
  } },
  { id: 'vc-translator', name: 'Translator', uses: 430000, base: '#2a7ab0', draw: (P) => {
    P(0, 0, 10, 16, '#2a7ab0');
    // speech bubble with characters
    P(2, 5, 6, 4, '#eef4fa'); P(3, 9, 1, 1, '#eef4fa'); P(3, 6, 1, 2, '#2a7ab0'); P(6, 6, 1, 2, '#2a7ab0'); P(4, 7, 2, 1, '#2a7ab0');
  } },
  { id: 'vc-translator-cn', name: 'Chinese Translator', uses: 210000, base: '#b0342e', draw: (P) => {
    P(0, 0, 10, 16, '#b0342e');
    P(4, 4, 1, 8, '#ffd94a'); P(2, 6, 6, 1, '#ffd94a'); P(2, 9, 6, 1, '#ffd94a'); P(3, 4, 3, 1, '#ffd94a');
  } },
  { id: 'vc-cobalt', name: 'Cobalt', uses: 320000, base: '#1c3f8c', draw: (P) => {
    P(0, 0, 10, 16, '#1c3f8c'); diamond(P, 4, 6, '#5fa8ff'); P(4, 7, 2, 2, '#bfe0ff');
  } },
  { id: 'vc-scrolls', name: 'Scrolls', uses: 260000, base: '#1f6b63', draw: (P) => {
    P(0, 0, 10, 16, '#1f6b63');
    // scroll "S"
    P(3, 5, 4, 1, '#f0e6c8'); P(2, 6, 2, 1, '#f0e6c8'); P(3, 7, 4, 1, '#f0e6c8'); P(6, 8, 2, 1, '#f0e6c8'); P(3, 9, 4, 1, '#f0e6c8');
  } },
  { id: 'vc-prismarine', name: 'Prismarine', uses: 380000, base: '#3aa89a', draw: (P, C, ctx, s) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 10; x++) { ctx.fillStyle = (x + y) % 2 ? '#3aa89a' : '#47c0b0'; ctx.fillRect(x * s, y * s, s, s); }
    diamond(P, 4, 6, '#d8fff6');
  } },
  { id: 'vc-turtle', name: 'Turtle', uses: 290000, base: '#4c8a3f', draw: (P) => {
    P(0, 0, 10, 16, '#c9b273');
    P(3, 5, 4, 1, '#4c8a3f'); P(2, 6, 6, 4, '#4c8a3f'); P(3, 10, 4, 1, '#4c8a3f');
    P(4, 6, 2, 1, '#3a6b30'); P(3, 8, 1, 1, '#3a6b30'); P(6, 8, 1, 1, '#3a6b30');
  } },
  { id: 'vc-founders', name: "Founder's", uses: 180000, base: '#2b2d36', draw: (P) => {
    P(0, 0, 10, 16, '#2b2d36'); diamond(P, 4, 5, '#f3c14b'); P(2, 11, 6, 1, '#f3c14b'); P(3, 13, 4, 1, '#c99a2e');
  } },
  { id: 'vc-purpleheart', name: 'Purple Heart', uses: 240000, base: '#241633', draw: (P) => {
    P(0, 0, 10, 16, '#241633'); heart(P, '#9b59d0');
  } },
  { id: 'vc-snowman', name: 'Snowman', uses: 150000, base: '#dfe9f2', draw: (P) => {
    P(0, 0, 10, 16, '#cfe0ef');
    P(4, 4, 2, 2, '#ffffff'); P(3, 7, 4, 4, '#ffffff');
    P(4, 4, 1, 1, '#2b2d36'); P(5, 4, 1, 1, '#2b2d36'); P(4, 8, 1, 1, '#2b2d36'); P(4, 9, 1, 1, '#2b2d36');
    P(6, 5, 1, 1, '#e8963a');
  } },
  { id: 'vc-spade', name: 'Spade', uses: 120000, base: '#101014', draw: (P) => {
    P(0, 0, 10, 16, '#101014');
    P(4, 4, 2, 1, '#e9ebef'); P(3, 5, 4, 2, '#e9ebef'); P(2, 6, 6, 2, '#e9ebef'); P(4, 8, 2, 2, '#e9ebef'); P(3, 10, 4, 1, '#e9ebef');
  } },
  { id: 'vc-birthday', name: 'Birthday', uses: 200000, base: '#2b6bb0', draw: (P) => {
    P(0, 0, 10, 16, '#2b6bb0');
    P(3, 8, 4, 3, '#f6efdd'); P(3, 7, 4, 1, '#e85a8a'); P(4, 5, 1, 2, '#f3c14b'); P(4, 4, 1, 1, '#ff8a3c');
    P(3, 9, 4, 1, '#e85a8a');
  } },
  { id: 'vc-common', name: 'Common', uses: 990000, base: '#8a8f9c', draw: (P) => {
    P(0, 0, 10, 16, '#8a8f9c'); P(0, 0, 3, 16, '#767b88'); P(7, 0, 3, 16, '#767b88'); diamond(P, 4, 6, '#c3c8d2');
  } },
  { id: 'vc-home', name: 'Home', uses: 870000, base: '#2f7a55', draw: (P) => {
    P(0, 0, 10, 16, '#2f7a55');
    P(2, 6, 6, 5, '#d9c39a'); P(3, 5, 4, 1, '#8a4a2a'); P(2, 5, 6, 1, '#8a4a2a'); P(4, 8, 2, 3, '#6a4a2a'); P(3, 6, 1, 1, '#9fd0e8');
  } },
  { id: 'vc-menace', name: 'Menace', uses: 1450000, base: '#2a0e33', draw: (P, C, ctx, s) => {
    for (let y = 0; y < 16; y++) { ctx.fillStyle = mix('#3a0e4a', '#8a1f5a', y / 15); ctx.fillRect(0, y * s, 10 * s, s); }
    P(3, 4, 1, 3, '#e83a7a'); P(4, 5, 1, 3, '#ff5b9a'); P(5, 4, 1, 4, '#e83a7a'); P(6, 6, 1, 3, '#ff5b9a');
    P(2, 10, 6, 1, '#ff5b9a');
  } },
  { id: 'vc-followers', name: "Follower's", uses: 330000, base: '#101820', draw: (P) => {
    P(0, 0, 10, 16, '#101820');
    // eye of ender-ish
    P(3, 6, 4, 4, '#2fd0a0'); P(4, 7, 2, 2, '#0c3a2c'); P(4, 6, 1, 1, '#bfffe8');
  } },
  { id: 'vc-millionth', name: 'Millionth Customer', uses: 90000, base: '#b58a2e', draw: (P) => {
    P(0, 0, 10, 16, '#b58a2e');
    P(3, 7, 4, 4, '#f0e6c8'); P(3, 6, 4, 1, '#e85a8a'); P(4, 5, 1, 2, '#e85a8a'); P(4, 8, 1, 3, '#d8b04a');
  } },
];

/* Community capes — the kind players upload (tasteful demo set), shown in the
   ALL / FAVORITES tabs alongside the official ones. */
export const COMMUNITY_CAPES = [
  { id: 'cc-spezi', name: 'Spezi', author: 'WinniePat', uses: 13182, community: true, base: '#e8963a', draw: (P) => {
    P(0, 0, 10, 16, '#e8963a'); P(2, 3, 6, 8, '#7a2d8c'); P(2, 3, 6, 1, '#f3c14b'); P(3, 5, 4, 1, '#ffe08a'); P(3, 7, 4, 1, '#ffe08a'); P(2, 11, 6, 2, '#5a1f6b');
  } },
  { id: 'cc-sakura', name: 'Sakura Night', author: 'yukii', uses: 11204, community: true, gradient: ['#1a1030', '#3a2050'], draw: (P, C, ctx, s) => {
    for (let y = 0; y < 16; y++) { ctx.fillStyle = mix('#151030', '#3a2450', y / 15); ctx.fillRect(0, y * s, 10 * s, s); }
    P(1, 10, 5, 1, '#4a3020'); P(3, 9, 1, 1, '#4a3020'); P(5, 8, 1, 2, '#4a3020');
    for (const [x, y] of [[2, 8], [4, 7], [6, 6], [1, 9], [7, 5], [3, 11], [7, 12]]) P(x, y, 1, 1, '#ffb3d1');
  } },
  { id: 'cc-redmoon', name: 'Red Moon', author: 'Vreez_', uses: 14947, community: true, gradient: ['#1a0808', '#3a0e0e'], draw: (P, C, ctx, s) => {
    for (let y = 0; y < 16; y++) { ctx.fillStyle = mix('#160606', '#360c0c', y / 15); ctx.fillRect(0, y * s, 10 * s, s); }
    P(5, 3, 3, 3, '#e04a4a'); P(6, 3, 2, 3, '#ff6a6a'); P(6, 4, 1, 1, '#a52626');
  } },
  { id: 'cc-moon', name: 'Lonely Moon', author: '1onur', uses: 20942, community: true, base: '#0a0c14', draw: (P) => {
    P(0, 0, 10, 16, '#0a0c14');
    P(6, 3, 2, 2, '#e8e4d0'); P(5, 3, 1, 2, '#e8e4d0'); P(6, 2, 2, 1, '#e8e4d0'); P(7, 4, 1, 1, '#c9c4a8');
    for (const [x, y] of [[2, 6], [4, 9], [1, 11], [8, 8], [3, 13]]) P(x, y, 1, 1, '#8a8f9c');
  } },
  { id: 'cc-galaxy', name: 'Galaxy', author: 'Nova', uses: 9312, community: true, gradient: ['#1a0e3a', '#5a2d8c'], draw: (P, C, ctx, s) => {
    for (let y = 0; y < 16; y++) { ctx.fillStyle = mix('#140a2e', '#4a2378', y / 15); ctx.fillRect(0, y * s, 10 * s, s); }
    const rnd = prng(42); for (let i = 0; i < 20; i++) P((rnd() * 10) | 0, (rnd() * 16) | 0, 1, 1, rnd() < 0.5 ? '#fff' : '#bfa8ff');
  } },
  { id: 'cc-ocean', name: 'Ocean Depths', author: 'Marin', uses: 7640, community: true, gradient: ['#0a3a5a', '#1a7a9a'], draw: (P, C, ctx, s) => {
    for (let y = 0; y < 16; y++) { ctx.fillStyle = mix('#0a3050', '#1c7090', y / 15); ctx.fillRect(0, y * s, 10 * s, s); }
    for (const [x, y] of [[2, 4], [5, 6], [7, 9], [3, 11]]) { P(x, y, 1, 1, '#bfeaff'); P(x, y + 1, 1, 1, '#9fd8f0'); }
  } },
  { id: 'cc-flame', name: 'Inferno', author: 'Blaze', uses: 6021, community: true, gradient: ['#2a0a00', '#e8531a'], draw: (P, C, ctx, s) => {
    for (let y = 0; y < 16; y++) { ctx.fillStyle = mix('#200800', '#e8531a', y / 15); ctx.fillRect(0, y * s, 10 * s, s); }
    P(3, 10, 1, 3, '#ffd35b'); P(5, 9, 1, 4, '#ffd35b'); P(6, 11, 1, 2, '#ff8a3c');
  } },
  { id: 'cc-mint', name: 'Mint Fresh', author: 'Coolio', uses: 4880, community: true, base: '#2fd0a0', draw: (P) => {
    P(0, 0, 10, 16, '#2fd0a0'); diamond(P, 4, 6, '#eafff6'); P(0, 0, 10, 1, '#bfffe8'); P(0, 15, 10, 1, '#1c8f6c');
  } },
];

/* --------------------------------------------------------------- emblems */

function creeper(P, col) {
  P(2, 5, 2, 2, col); P(6, 5, 2, 2, col);
  P(4, 7, 2, 2, col); P(3, 9, 1, 2, col); P(6, 9, 1, 2, col); P(4, 9, 2, 1, col);
}
function diamond(P, cx, cy, col) {
  P(cx, cy - 1, 2, 1, col); P(cx - 1, cy, 4, 1, col); P(cx - 1, cy + 1, 4, 1, col); P(cx, cy + 2, 2, 1, col);
}
function heart(P, col) {
  P(2, 5, 2, 1, col); P(6, 5, 2, 1, col);
  P(1, 6, 8, 2, col); P(2, 8, 6, 1, col); P(3, 9, 4, 1, col); P(4, 10, 2, 1, col);
}

/* ---------------------------------------------------------------- render */

const cache = new Map();

/** Return a canvas with the cape's 10×16 face painted at `scale` px/pixel. */
export function capeCanvas(cape, scale = 12) {
  const key = `${cape.id}@${scale}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = 10 * scale;
  c.height = 16 * scale;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const rnd = prng(hashId(cape.id));
  fillBase(ctx, scale, cape, rnd);
  cape.draw(painter(ctx, scale), {}, ctx, scale);
  // hem shadow to give depth
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(0, 15 * scale, 10 * scale, scale);
  cache.set(key, c);
  return c;
}

function hashId(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export const capeById = (id) =>
  VANILLA_CAPES.find((c) => c.id === id) || COMMUNITY_CAPES.find((c) => c.id === id) || null;
