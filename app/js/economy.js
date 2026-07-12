/* The Horus economy: coins, ownership, quests, daily streak, Horus+.
   Coins are ONLY earnable in-app (daily check-in, quests, minigames) —
   there is no real-money path. State lives in state.economy, persists to
   localStorage and (when connected) to the backend's economy.json. */

import { state, save } from './state.js';
import { shopItem, STARTER_ITEMS, QUESTS, PLUS, MINIGAME_DAILY_CAP, collectionPrice } from './shopCatalog.js';

const DAY = 864e5;
const today = () => new Date().toISOString().slice(0, 10);

export function economy() {
  if (!state.economy) {
    state.economy = {
      coins: 500,
      owned: [...STARTER_ITEMS],
      plusUntil: 0,
      plusMonthlyClaimed: '',
      daily: { last: '', streak: 0 },
      quests: {},            // id → { done: bool|count, claimed: 'YYYY-MM-DD' | true }
      minigame: { date: '', earned: 0, best: {} },
      customCapes: [],       // { id, name, pixels: [[hex|null]*10]*16 }
      capeFavorites: [],     // favorited cape ids (any source)
      xp: 0,                 // progress system
      counters: {},          // achievement counters: launches, screenshots…
      unlocked: [],          // achievement ids
    };
  }
  if (state.economy.xp === undefined) { state.economy.xp = 0; state.economy.counters = {}; state.economy.unlocked = []; }
  return state.economy;
}

export const coins = () => economy().coins;

export function owns(id) {
  const e = economy();
  return e.owned.includes(id) || id?.startsWith('custom-');
}

export function hasPlus() {
  return economy().plusUntil > Date.now();
}

export function priceFor(item) {
  const p = typeof item === 'string' ? shopItem(item)?.price || 0 : item.price || 0;
  return hasPlus() ? Math.round(p * (1 - PLUS.discount)) : p;
}

/* --------------------------------------------------------------- earning */

function grant(amount, reason) {
  const e = economy();
  e.coins += amount;
  save('economy');
  return { amount, reason, coins: e.coins };
}

/** Daily check-in with streak bonus. Returns null if already claimed. */
export function claimDaily() {
  const e = economy();
  if (e.daily.last === today()) return null;
  const yesterday = new Date(Date.now() - DAY).toISOString().slice(0, 10);
  e.daily.streak = e.daily.last === yesterday ? e.daily.streak + 1 : 1;
  e.daily.last = today();
  const bonus = Math.min(50, (e.daily.streak - 1) * 10);
  questProgress('q-daily-login');
  if (e.daily.streak > (e.counters.streak || 0)) track('streak', e.daily.streak - (e.counters.streak || 0));
  return grant(50 + bonus, `daily (streak ${e.daily.streak})`);
}

export function dailyClaimed() {
  return economy().daily.last === today();
}

/** Mark quest progress (call from anywhere: launch, minigames, studio…). */
export function questProgress(id) {
  const e = economy();
  const q = QUESTS.find((x) => x.id === id);
  if (!q) return;
  const s = e.quests[id] || (e.quests[id] = {});
  if (q.kind === 'once' && s.claimed) return;
  s.done = true;
  s.doneAt = Date.now();
  save('economy');
}

export function questState(q) {
  const e = economy();
  const s = e.quests[q.id] || {};
  let claimable = false;
  let claimed = false;
  if (q.kind === 'once') {
    claimed = s.claimed === true;
    claimable = !!s.done && !claimed;
  } else if (q.kind === 'daily') {
    claimed = s.claimed === today();
    claimable = !!s.done && s.doneAt > Date.now() - DAY && !claimed;
  } else { // weekly
    claimed = s.claimed && Date.now() - s.claimedAt < 7 * DAY;
    claimable = !!s.done && !claimed;
  }
  return { done: !!s.done, claimable, claimed };
}

export function claimQuest(q) {
  const e = economy();
  const st = questState(q);
  if (!st.claimable) return null;
  const s = e.quests[q.id];
  s.claimed = q.kind === 'once' ? true : today();
  s.claimedAt = Date.now();
  if (q.kind !== 'once') s.done = false;
  return grant(q.reward, q.name);
}

/** Minigame payout: 1 coin per `per` points, capped per day. */
export function minigamePayout(game, score, per = 25) {
  const e = economy();
  if (e.minigame.date !== today()) { e.minigame.date = today(); e.minigame.earned = 0; }
  e.minigame.best[game] = Math.max(e.minigame.best[game] || 0, score);
  questProgress('q-minigame');
  track('minigames');
  if (game === 'tetris' && score >= 1000) questProgress('q-tetris-1k');
  if (game === 'snake' && score >= 30) questProgress('q-snake-30');
  const room = Math.max(0, MINIGAME_DAILY_CAP - e.minigame.earned);
  const payout = Math.min(room, Math.floor(score / per));
  e.minigame.earned += payout;
  if (payout > 0) return grant(payout, game);
  save('economy');
  return { amount: 0, reason: 'daily cap reached', coins: e.coins };
}

/* ---------------------------------------------------------------- buying */

export function buy(item) {
  const e = economy();
  if (owns(item.id)) return { ok: false, error: 'already owned' };
  if (item.plusOnly && !hasPlus()) return { ok: false, error: 'Horus+ exclusive' };
  const price = priceFor(item);
  if (e.coins < price) return { ok: false, error: `not enough coins (${price} needed)` };
  e.coins -= price;
  e.owned.push(item.id);
  save('economy');
  return { ok: true, price };
}

export function buyCollection(col) {
  const e = economy();
  const missing = col.items.filter((id) => !owns(id));
  if (!missing.length) return { ok: false, error: 'already owned' };
  const full = collectionPrice(col);
  const alreadyPaid = col.items.filter((id) => owns(id))
    .reduce((s, id) => s + (shopItem(id)?.price || 0), 0);
  const price = Math.max(0, Math.round((full - alreadyPaid * (1 - col.discount)) * (hasPlus() ? 1 - PLUS.discount : 1)));
  if (e.coins < price) return { ok: false, error: `not enough coins (${price} needed)` };
  e.coins -= price;
  for (const id of missing) e.owned.push(id);
  save('economy');
  return { ok: true, price };
}

export function subscribePlus() {
  const e = economy();
  if (e.coins < PLUS.priceMonthly) return { ok: false, error: `not enough coins (${PLUS.priceMonthly} needed)` };
  e.coins -= PLUS.priceMonthly;
  const base = Math.max(Date.now(), e.plusUntil);
  e.plusUntil = base + 30 * DAY;
  save('economy');
  return { ok: true };
}

/** Horus+ monthly drop: one free cosmetic + emote per calendar month. */
export function claimMonthlyDrop(pick) {
  const e = economy();
  const month = today().slice(0, 7);
  if (!hasPlus() || e.plusMonthlyClaimed === month) return { ok: false, error: 'not available' };
  if (owns(pick)) return { ok: false, error: 'already owned' };
  e.plusMonthlyClaimed = month;
  e.owned.push(pick);
  save('economy');
  return { ok: true };
}

export function monthlyDropAvailable() {
  return hasPlus() && economy().plusMonthlyClaimed !== today().slice(0, 7);
}

/* ------------------------------------------------------------ custom capes */

export function saveCustomCape(name, pixels, id = null) {
  const e = economy();
  const capeId = id || `custom-${Date.now().toString(36)}`;
  const existing = e.customCapes.find((c) => c.id === capeId);
  if (existing) { existing.name = name; existing.pixels = pixels; }
  else { e.customCapes.push({ id: capeId, name, pixels }); track('capesCreated'); }
  questProgress('q-cape-create');
  save('economy');
  return capeId;
}

export function deleteCustomCape(id) {
  const e = economy();
  e.customCapes = e.customCapes.filter((c) => c.id !== id);
  if (state.cosmetics.cape === id) state.cosmetics.cape = null;
  save('economy');
}

export function customCape(id) {
  return economy().customCapes.find((c) => c.id === id) || null;
}

/* ----------------------------------------------------- progress & levels */
/* XP comes from playing the launcher itself: launches, quests, minigames,
   the cape studio. Level curve: level n needs n·100 XP beyond the last. */

export const ACHIEVEMENTS = [
  { id: 'a-first-launch', name: 'First Flight', desc: 'Launch Minecraft once', icon: 'play', counter: 'launches', at: 1, xp: 50 },
  { id: 'a-ten-launches', name: 'Regular', desc: 'Launch 10 times', icon: 'play', counter: 'launches', at: 10, xp: 150 },
  { id: 'a-hundred-launches', name: 'Veteran', desc: 'Launch 100 times', icon: 'flame', counter: 'launches', at: 100, xp: 500 },
  { id: 'a-first-mod', name: 'Tinkerer', desc: 'Install a mod', icon: 'mods', counter: 'modsInstalled', at: 1, xp: 50 },
  { id: 'a-ten-mods', name: 'Mod Collector', desc: 'Install 10 mods', icon: 'package', counter: 'modsInstalled', at: 10, xp: 200 },
  { id: 'a-first-cape', name: 'Designer', desc: 'Create a cape in the studio', icon: 'edit', counter: 'capesCreated', at: 1, xp: 100 },
  { id: 'a-five-capes', name: 'Fashion House', desc: 'Create 5 capes', icon: 'shirt', counter: 'capesCreated', at: 5, xp: 250 },
  { id: 'a-first-game', name: 'Player Two', desc: 'Play a minigame', icon: 'gamepad', counter: 'minigames', at: 1, xp: 50 },
  { id: 'a-arcade', name: 'Arcade Rat', desc: 'Play 25 minigame rounds', icon: 'gamepad', counter: 'minigames', at: 25, xp: 300 },
  { id: 'a-screenshotter', name: 'Say Cheese', desc: 'Take 10 screenshots', icon: 'camera', counter: 'screenshots', at: 10, xp: 150 },
  { id: 'a-week-streak', name: 'Streak Week', desc: '7-day check-in streak', icon: 'clock', counter: 'streak', at: 7, xp: 300 },
  { id: 'a-playtime-10', name: 'Getting Comfortable', desc: '10 hours played', icon: 'clock', counter: 'playHours', at: 10, xp: 300 },
  { id: 'a-playtime-100', name: 'Centurion', desc: '100 hours played', icon: 'star', counter: 'playHours', at: 100, xp: 1000 },
  { id: 'a-builder', name: 'Builder', desc: 'Parse a schematic material list', icon: 'grid', counter: 'schematics', at: 1, xp: 100 },
  { id: 'a-server-join', name: 'Multiplayer', desc: 'Join a server via quick-connect', icon: 'globe', counter: 'serverJoins', at: 1, xp: 100 },
];

export function levelFromXp(xp) {
  // cumulative cost: 100, 200, 300… per level → level L at 50·L·(L+1)
  let level = 0;
  while (50 * (level + 1) * (level + 2) <= xp) level++;
  const floor = 50 * level * (level + 1);
  const next = 50 * (level + 1) * (level + 2);
  return { level: level + 1, into: xp - floor, needed: next - floor };
}

export function progress() {
  const e = economy();
  return { xp: e.xp, ...levelFromXp(e.xp), counters: e.counters, unlocked: e.unlocked };
}

/** Bump an achievement counter; unlocks award XP (and a few coins). */
export function track(counter, amount = 1) {
  const e = economy();
  e.counters[counter] = (e.counters[counter] || 0) + amount;
  e.xp += amount * (counter === 'playHours' ? 20 : 5);
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (a.counter === counter && !e.unlocked.includes(a.id) && e.counters[counter] >= a.at) {
      e.unlocked.push(a.id);
      e.xp += a.xp;
      e.coins += Math.round(a.xp / 5);
      newly.push(a);
    }
  }
  save('economy');
  if (newly.length) {
    import('./components.js').then(({ toast }) => {
      for (const a of newly) toast(`🏆 Achievement: ${a.name} (+${a.xp} XP, +${Math.round(a.xp / 5)} coins)`, 'ok', 4500);
    });
  }
  return newly;
}

export function toggleCapeFavorite(id) {
  const e = economy();
  if (!e.capeFavorites) e.capeFavorites = [];
  const i = e.capeFavorites.indexOf(id);
  if (i >= 0) e.capeFavorites.splice(i, 1);
  else e.capeFavorites.push(id);
  save('cosmetics');
  return i < 0;
}

export function isCapeFavorite(id) {
  return (economy().capeFavorites || []).includes(id);
}
