/* The Horus cosmetics catalog — 200+ items, generated from open data.
   Every item is earnable with in-app coins (quests, minigames, daily
   rewards). There is NO real-money path anywhere in Horus.

   Categories: capes, hats, wings, pets, emotes, nametag effects.
   Collections group matching items into sets; seasons rotate a shop rail. */

/* ------------------------------------------------------------ palettes */

export const PALETTES = [
  { id: 'crimson', name: 'Crimson', base: '#7a1f2b', alt: '#e8394a' },
  { id: 'midnight', name: 'Midnight', base: '#181b23', alt: '#3a4152' },
  { id: 'emerald', name: 'Emerald', base: '#1d6b3f', alt: '#35d374' },
  { id: 'royal', name: 'Royal', base: '#2c2260', alt: '#7a5cff' },
  { id: 'honey', name: 'Honey', base: '#b97e1f', alt: '#f3c14b' },
  { id: 'arctic', name: 'Arctic', base: '#155e70', alt: '#7fdbe8' },
  { id: 'cherry', name: 'Cherry', base: '#b23a52', alt: '#ffb7c6' },
  { id: 'void', name: 'Void', base: '#221430', alt: '#8b3bd9' },
  { id: 'sandstone', name: 'Sandstone', base: '#a4763a', alt: '#e8d3a4' },
  { id: 'ocean', name: 'Ocean', base: '#123a6b', alt: '#3f8fe8' },
];

export const CAPE_PATTERNS = [
  { id: 'solid', name: 'Classic', price: 200 },
  { id: 'stripe', name: 'Banded', price: 250 },
  { id: 'vstripe', name: 'Pillar', price: 250 },
  { id: 'checker', name: 'Checkered', price: 300 },
  { id: 'gradient', name: 'Fade', price: 300 },
  { id: 'star', name: 'Star', price: 350 },
  { id: 'horus', name: 'Eye of Horus', price: 500 },
  { id: 'creeper', name: 'Creeper', price: 400 },
  { id: 'diamond', name: 'Diamond', price: 350 },
  { id: 'arrow', name: 'Chevron', price: 300 },
  { id: 'split', name: 'Duality', price: 280 },
  { id: 'border', name: 'Framed', price: 260 },
];

const HATS = [
  { kind: 'beanie', name: 'Beanie', price: 320 },
  { kind: 'tophat', name: 'Top Hat', price: 450 },
  { kind: 'crown', name: 'Crown', price: 600 },
  { kind: 'halo', name: 'Halo', price: 550 },
  { kind: 'cap', name: 'Cap', price: 300 },
  { kind: 'horns', name: 'Horns', price: 480 },
];
const HAT_COLORWAYS = [
  { id: 'red', name: 'Red', color: '#c8354a', color2: '#eef3ff' },
  { id: 'black', name: 'Black', color: '#17181d', color2: '#e8394a' },
  { id: 'gold', name: 'Gold', color: '#e7b23c', color2: '#c22636' },
  { id: 'teal', name: 'Teal', color: '#2e8b8b', color2: '#d6f5f0' },
  { id: 'violet', name: 'Violet', color: '#7a3fd0', color2: '#f0e5ff' },
  { id: 'white', name: 'White', color: '#e8ecf2', color2: '#2b2d36' },
];

const WING_SHAPES = [
  { kind: 'angel', name: 'Angel Wings', price: 700 },
  { kind: 'dragon', name: 'Dragon Wings', price: 900 },
  { kind: 'pixie', name: 'Pixie Wings', price: 650 },
  { kind: 'phantom', name: 'Phantom Wings', price: 850 },
];
const WING_COLORS = [
  { id: 'white', name: 'Ivory', color: '#f2f5fa' },
  { id: 'crimson', name: 'Crimson', color: '#a52639' },
  { id: 'teal', name: 'Teal', color: '#57d8c4' },
  { id: 'gold', name: 'Gold', color: '#f3c14b' },
  { id: 'void', name: 'Void', color: '#6b30b8' },
  { id: 'jade', name: 'Jade', color: '#3fae6a' },
  { id: 'sky', name: 'Sky', color: '#7fb8f0' },
  { id: 'shadow', name: 'Shadow', color: '#2b2d36' },
];

const PETS = [
  { id: 'pet-creeper', name: 'Creeper Buddy', color: '#3fae4a', face: 'creeper', price: 900 },
  { id: 'pet-ghost', name: 'Lil Ghost', color: '#eef2f8', face: 'ghost', price: 850 },
  { id: 'pet-blaze', name: 'Ember', color: '#e8963a', face: 'blaze', glow: true, price: 1000 },
  { id: 'pet-ender', name: 'Ender Eye', color: '#1d3b2f', face: 'ender', glow: true, price: 1100 },
  { id: 'pet-bee', name: 'Bumble', color: '#f3c14b', face: 'bee', price: 800 },
  { id: 'pet-fox', name: 'Foxel', color: '#d8712a', face: 'fox', price: 900 },
  { id: 'pet-star', name: 'Twinkle', color: '#fff3c4', face: 'star', glow: true, price: 950 },
  { id: 'pet-wyrm', name: 'Cloud Wyrm', color: '#b8c6e8', face: 'wyrm', price: 1200 },
];

const EMOTES = [
  { id: 'emote-wave', name: 'Wave', anim: 'wave', price: 0 },
  { id: 'emote-spin', name: 'Spin', anim: 'spin', price: 0 },
  { id: 'emote-flip', name: 'Backflip', anim: 'flip', price: 300 },
  { id: 'emote-bow', name: 'Bow', anim: 'bow', price: 250 },
  { id: 'emote-dance', name: 'Dance', anim: 'dance', price: 350 },
  { id: 'emote-clap', name: 'Clap', anim: 'clap', price: 250 },
  { id: 'emote-flex', name: 'Flex', anim: 'flex', price: 300 },
  { id: 'emote-sit', name: 'Sit', anim: 'sit', price: 200 },
];

export const NAMETAG_FX = [
  { id: 'tag-rainbow', name: 'Rainbow Flow', fx: 'rainbow', price: 800 },
  { id: 'tag-gold', name: 'Golden Glow', fx: 'gold', price: 600 },
  { id: 'tag-pulse', name: 'Pulse', fx: 'pulse', price: 450 },
  { id: 'tag-wave', name: 'Wavy', fx: 'wave', price: 550 },
  { id: 'tag-frost', name: 'Frostbite', fx: 'frost', price: 650 },
  { id: 'tag-fire', name: 'On Fire', fx: 'fire', price: 700 },
  { id: 'tag-shadow', name: 'Shadowed', fx: 'shadow', price: 400 },
  { id: 'tag-glitch', name: 'Glitch', fx: 'glitch', price: 750 },
];

/* --------------------------------------------------------- catalog build */

function seasonOf(i) {
  // deterministic pseudo-seasonal tagging; the current season is rotated below
  return ['solstice', 'harvest', 'frost', 'bloom'][i % 4];
}

export function currentSeason(date = new Date()) {
  const m = date.getMonth();
  if (m >= 5 && m <= 7) return { id: 'solstice', name: 'Solstice' };
  if (m >= 8 && m <= 10) return { id: 'harvest', name: 'Harvest' };
  if (m === 11 || m <= 1) return { id: 'frost', name: 'Frost' };
  return { id: 'bloom', name: 'Bloom' };
}

function buildCatalog() {
  const items = [];
  let i = 0;

  for (const pat of CAPE_PATTERNS) {
    for (const pal of PALETTES) {
      items.push({
        id: `cape-${pat.id}-${pal.id}`,
        cat: 'cape',
        name: `${pal.name} ${pat.name}`,
        base: pal.base,
        alt: pal.alt,
        pattern: pat.id,
        seed: i * 7 + 3,
        price: pat.price + (pal.id === 'void' || pal.id === 'honey' ? 50 : 0),
        season: seasonOf(i),
        plusOnly: pat.id === 'horus' && (pal.id === 'void' || pal.id === 'gold'),
      });
      i++;
    }
  }
  for (const hat of HATS) {
    for (const cw of HAT_COLORWAYS) {
      items.push({
        id: `hat-${hat.kind}-${cw.id}`,
        cat: 'hat',
        kind: hat.kind,
        name: `${cw.name} ${hat.name}`,
        color: cw.color,
        color2: cw.color2,
        glow: hat.kind === 'halo',
        price: hat.price,
        season: seasonOf(i++),
      });
    }
  }
  for (const shape of WING_SHAPES) {
    for (const col of WING_COLORS) {
      items.push({
        id: `wings-${shape.kind}-${col.id}`,
        cat: 'wings',
        kind: shape.kind,
        name: `${col.name} ${shape.name}`,
        color: col.color,
        price: shape.price,
        season: seasonOf(i++),
        plusOnly: shape.kind === 'phantom' && col.id === 'void',
      });
    }
  }
  for (const p of PETS) items.push({ ...p, cat: 'pet', season: seasonOf(i++) });
  for (const e of EMOTES) items.push({ ...e, cat: 'emote', season: seasonOf(i++) });
  for (const t of NAMETAG_FX) items.push({ ...t, cat: 'nametag', season: seasonOf(i++) });
  return items;
}

export const SHOP_ITEMS = buildCatalog();
export const shopItem = (id) => SHOP_ITEMS.find((x) => x.id === id) || null;

/* Items every player owns from the start. */
export const STARTER_ITEMS = ['cape-solid-crimson', 'emote-wave', 'emote-spin'];

/* ---------------------------------------------------------- collections */

export const COLLECTIONS = [
  {
    id: 'col-horus', name: 'Eye of Horus', desc: 'The signature set.',
    items: ['cape-horus-honey', 'hat-halo-gold', 'wings-angel-gold', 'tag-gold', 'pet-star'],
    discount: 0.25,
  },
  {
    id: 'col-void', name: 'Voidwalker', desc: 'For those who stare back.',
    items: ['cape-gradient-void', 'hat-horns-violet', 'wings-phantom-void', 'tag-glitch', 'pet-ender'],
    discount: 0.25,
  },
  {
    id: 'col-frost', name: 'Frostbound', desc: 'Cold hands, warm heart.',
    items: ['cape-star-arctic', 'hat-beanie-white', 'wings-pixie-sky', 'tag-frost', 'pet-ghost'],
    discount: 0.2,
  },
  {
    id: 'col-ember', name: 'Emberforge', desc: 'Forged in lava, cooled in style.',
    items: ['cape-arrow-crimson', 'hat-cap-red', 'wings-dragon-crimson', 'tag-fire', 'pet-blaze'],
    discount: 0.2,
  },
  {
    id: 'col-meadow', name: 'Meadowsong', desc: 'Buzzing with charm.',
    items: ['cape-checker-emerald', 'hat-beanie-teal', 'wings-pixie-jade', 'pet-bee'],
    discount: 0.15,
  },
  {
    id: 'col-royalty', name: 'True Royalty', desc: 'Crowned, caped, unbothered.',
    items: ['cape-border-royal', 'hat-crown-gold', 'wings-angel-white', 'tag-rainbow'],
    discount: 0.2,
  },
];

export function collectionPrice(col) {
  const total = col.items.reduce((sum, id) => sum + (shopItem(id)?.price || 0), 0);
  return Math.round(total * (1 - col.discount));
}

/* ------------------------------------------------------------- Horus+ */

export const PLUS = {
  priceMonthly: 2000, // coins — earnable in-app; Horus has no real-money purchases
  perks: [
    'A fresh cosmetic + emote every month',
    '20% shop discount on everything',
    '50 friend slots (instead of 10)',
    '5 hosted worlds (instead of 2)',
    'Animated nametag effects unlocked in multiplayer',
    'Exclusive Horus+ items (marked in the shop)',
  ],
  discount: 0.2,
  friendSlots: { free: 10, plus: 50 },
  worldSlots: { free: 2, plus: 5 },
};

/* -------------------------------------------------------------- quests */

export const QUESTS = [
  { id: 'q-daily-login', name: 'Check in', desc: 'Open Horus today', reward: 50, kind: 'daily' },
  { id: 'q-launch', name: 'Adventure time', desc: 'Launch the game', reward: 60, kind: 'daily' },
  { id: 'q-minigame', name: 'Arcade hour', desc: 'Play any minigame', reward: 40, kind: 'daily' },
  { id: 'q-tetris-1k', name: 'Block artist', desc: 'Score 1,000 in Tetris', reward: 120, kind: 'weekly' },
  { id: 'q-pong-win', name: 'Paddle master', desc: 'Beat the Pong AI', reward: 100, kind: 'weekly' },
  { id: 'q-snake-30', name: 'Well fed', desc: 'Reach length 30 in Snake', reward: 100, kind: 'weekly' },
  { id: 'q-cape-create', name: 'Fashion designer', desc: 'Create a custom cape in the studio', reward: 150, kind: 'once' },
  { id: 'q-equip-set', name: 'Full drip', desc: 'Equip a cape, hat and wings together', reward: 120, kind: 'once' },
  { id: 'q-add-profile', name: 'Collector', desc: 'Create a second installation profile', reward: 80, kind: 'once' },
  { id: 'q-mod-install', name: 'Tinkerer', desc: 'Install a mod from Modrinth or CurseForge', reward: 100, kind: 'once' },
];

/* Coins from minigames are capped per day so the economy stays a game. */
export const MINIGAME_DAILY_CAP = 300;
