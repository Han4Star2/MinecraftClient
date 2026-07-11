/* The Horus shop: 200+ cosmetics, coins (earned in-app — never bought),
   seasonal rail, collections, quests and Horus+. Every item can be tried on
   in 3D before spending a single coin. */

import { icon } from '../icons.js';
import { el, esc, toast, modal } from '../components.js';
import { state, save, equipCosmetic } from '../state.js';
import {
  SHOP_ITEMS, COLLECTIONS, collectionPrice, shopItem, currentSeason, PLUS, QUESTS,
} from '../shopCatalog.js';
import {
  coins, owns, hasPlus, priceFor, buy, buyCollection, claimDaily, dailyClaimed,
  questState, claimQuest, subscribePlus, economy, monthlyDropAvailable, claimMonthlyDrop,
} from '../economy.js';
import { drawItemThumb } from '../thumbs.js';
import { mountPlayer } from '../player3d.js';

const CATS = [
  { id: 'featured', label: 'Featured' },
  { id: 'collections', label: 'Collections' },
  { id: 'cape', label: 'Capes' },
  { id: 'hat', label: 'Hats' },
  { id: 'wings', label: 'Wings' },
  { id: 'pet', label: 'Pets' },
  { id: 'emote', label: 'Emotes' },
  { id: 'nametag', label: 'Nametags' },
  { id: 'quests', label: 'Earn coins' },
  { id: 'plus', label: 'Horus+' },
];

let cat = 'featured';
let query = '';

export function render(root) {
  const page = el(`
    <div class="page">
      <div class="page-head">
        <div>
          <div class="page-title">Shop</div>
          <div class="page-sub">Hundreds of cosmetics — all earnable with coins from quests, minigames and daily check-ins. No real money, ever.</div>
        </div>
        <div class="row">
          <button class="btn dark b-daily">${icon('gift')}<span class="d-label"></span></button>
          <span class="coin-chip" title="Your coins">${icon('star')}<b class="c-count"></b></span>
        </div>
      </div>
      <div class="mods-toolbar">
        <div class="tabs t-cats"></div>
        <div class="search-box" style="width:220px;margin-left:auto">
          ${icon('search')}<input class="input" placeholder="Search" spellcheck="false">
        </div>
      </div>
      <div class="shop-body"></div>
    </div>`);

  const body = page.querySelector('.shop-body');
  const coinEl = page.querySelector('.c-count');
  const paintCoins = () => { coinEl.textContent = coins().toLocaleString(); };
  paintCoins();

  /* daily check-in */
  const dailyBtn = page.querySelector('.b-daily');
  const paintDaily = () => {
    dailyBtn.querySelector('.d-label').textContent = dailyClaimed()
      ? `Streak ${economy().daily.streak} ✓` : 'Daily reward';
    dailyBtn.disabled = dailyClaimed();
  };
  paintDaily();
  dailyBtn.addEventListener('click', () => {
    const r = claimDaily();
    if (r) toast(`+${r.amount} coins — ${r.reason}`, 'ok');
    paintCoins();
    paintDaily();
  });

  const tabs = page.querySelector('.t-cats');
  for (const c of CATS) {
    const b = el(`<button class="tab ${c.id === cat ? 'active' : ''}">${esc(c.label)}${c.id === 'plus' ? ' ✦' : ''}</button>`);
    b.addEventListener('click', () => {
      cat = c.id;
      tabs.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      paint();
    });
    tabs.appendChild(b);
  }
  const search = page.querySelector('.search-box input');
  search.value = query;
  search.addEventListener('input', () => { query = search.value.toLowerCase(); paint(); });

  function paint() {
    body.innerHTML = '';
    paintCoins();
    if (cat === 'quests') return paintQuests(body, paintCoins);
    if (cat === 'plus') return paintPlus(body, paintCoins);
    if (cat === 'collections') return paintCollections(body, paintCoins);

    let items = SHOP_ITEMS;
    if (cat === 'featured') {
      const season = currentSeason();
      body.appendChild(el(`<div class="mods-section-label">${esc(season.name)} season — rotating picks</div>`));
      items = SHOP_ITEMS.filter((x) => x.season === season.id);
    } else {
      items = SHOP_ITEMS.filter((x) => x.cat === cat);
    }
    if (query) items = items.filter((x) => x.name.toLowerCase().includes(query));

    const grid = el('<div class="cos-grid shop-grid"></div>');
    for (const item of items.slice(0, 120)) grid.appendChild(itemCard(item, paint));
    if (!items.length) grid.innerHTML = `<div class="empty" style="grid-column:1/-1">${icon('search')}<div class="e-title">Nothing found</div></div>`;
    body.appendChild(grid);
  }

  paint();
  root.appendChild(page);
}

/* ---------------------------------------------------------------- cards */

function itemCard(item, repaint) {
  const owned = owns(item.id);
  const locked = item.plusOnly && !hasPlus();
  const card = el(`
    <div class="card hover cos-card shop-card ${owned ? 'equipped' : ''}">
      ${item.plusOnly ? '<span class="badge gold new-flag">✦ PLUS</span>' : ''}
      <canvas></canvas>
      <div class="cos-name ellipsis" title="${esc(item.name)}">${esc(item.name)}</div>
      ${owned
        ? '<span class="equip-tag">Owned</span>'
        : `<span class="price-tag ${locked ? 'faint' : ''}">${icon('star')}${priceFor(item).toLocaleString()}${hasPlus() && item.price ? ` <s class="tiny faint">${item.price}</s>` : ''}</span>`}
    </div>`);
  drawItemThumb(card.querySelector('canvas'), item);
  card.addEventListener('click', () => openPreview(item, repaint));
  return card;
}

/* ------------------------------------------------- try-on preview + buy */

export function openPreview(item, onChange = () => {}) {
  const slotFor = { cape: 'cape', hat: 'hat', wings: 'wings', pet: 'pet', nametag: 'nametag' };
  const slot = slotFor[item.cat] || null;

  const body = el(`
    <div class="row" style="align-items:stretch;gap:16px">
      <div class="pv-stage grow" style="height:320px;min-width:0"></div>
      <div class="col" style="width:190px;flex:none;gap:8px">
        <div class="small muted">${item.cat === 'emote' ? 'Click to play the emote.' : 'Try it on — drag to rotate. Buying is never required to preview.'}</div>
        <div class="grow"></div>
        <div class="pv-price row"></div>
        <div class="pv-actions col" style="gap:8px"></div>
      </div>
    </div>`);

  const m = modal({ title: item.name, body, size: 'lg' });
  const stage = body.querySelector('.pv-stage');

  const preview = mountPlayer(stage, () => ({
    ...state.cosmetics,
    ...(slot ? { [slot]: item.id } : {}),
    name: state.settings.accountName || 'Player',
  }));
  m.root.addEventListener('click', (e) => { if (e.target === m.root) preview.destroy(); });
  if (item.cat === 'emote') {
    setTimeout(() => preview.playEmote(item.anim), 400);
    stage.addEventListener('click', () => preview.playEmote(item.anim));
  }

  const paintActions = () => {
    const price = body.querySelector('.pv-price');
    const actions = body.querySelector('.pv-actions');
    price.innerHTML = '';
    actions.innerHTML = '';
    const owned = owns(item.id);

    if (!owned) {
      price.appendChild(el(`<span class="coin-chip">${icon('star')}<b>${priceFor(item).toLocaleString()}</b></span>`));
      if (hasPlus() && item.price !== priceFor(item)) price.appendChild(el(`<s class="small faint">${item.price}</s>`));
      const buyBtn = el(`<button class="btn primary wide">${icon('download')}<span>Buy${item.plusOnly && !hasPlus() ? ' (Horus+ only)' : ''}</span></button>`);
      if (item.plusOnly && !hasPlus()) buyBtn.disabled = true;
      buyBtn.addEventListener('click', () => {
        const r = buy(item);
        if (!r.ok) { toast(r.error, 'err'); return; }
        toast(`${item.name} unlocked!`, 'ok');
        paintActions();
        onChange();
      });
      actions.appendChild(buyBtn);
    } else if (slot) {
      const equipped = state.cosmetics[slot] === item.id;
      const eqBtn = el(`<button class="btn ${equipped ? 'ghost' : 'green'} wide">${icon('check')}<span>${equipped ? 'Unequip' : 'Equip'}</span></button>`);
      eqBtn.addEventListener('click', () => {
        equipCosmetic(slot, equipped ? null : item.id);
        checkSetQuest();
        preview.refresh();
        paintActions();
        onChange();
      });
      actions.appendChild(eqBtn);
    } else {
      actions.appendChild(el('<span class="badge free">In your collection</span>'));
    }
  };
  paintActions();
}

function checkSetQuest() {
  const c = state.cosmetics;
  if (c.cape && c.hat && c.wings) {
    import('../economy.js').then(({ questProgress }) => questProgress('q-equip-set'));
  }
}

/* ------------------------------------------------------------ collections */

function paintCollections(body, paintCoins) {
  const grid = el('<div class="lib-grid"></div>');
  for (const col of COLLECTIONS) {
    const ownedCount = col.items.filter((id) => owns(id)).length;
    const complete = ownedCount === col.items.length;
    const card = el(`
      <div class="card hover lib-card">
        <div class="row">
          <div class="grow">
            <div class="lib-name">${esc(col.name)}</div>
            <div class="small faint">${esc(col.desc)}</div>
          </div>
          ${complete ? '<span class="badge free">COMPLETE</span>' : `<span class="badge outline">${ownedCount}/${col.items.length}</span>`}
        </div>
        <div class="row col-thumbs"></div>
        <div class="row">
          <span class="coin-chip">${icon('star')}<b>${collectionPrice(col).toLocaleString()}</b></span>
          <span class="tiny faint">-${Math.round(col.discount * 100)}% bundle</span>
          <button class="btn primary small right b-buy" ${complete ? 'disabled' : ''}>${complete ? 'Owned' : 'Buy set'}</button>
        </div>
      </div>`);
    const thumbs = card.querySelector('.col-thumbs');
    for (const id of col.items) {
      const item = shopItem(id);
      if (!item) continue;
      const cv = el('<canvas style="width:44px;height:44px;border-radius:7px;cursor:pointer" title="' + esc(item.name) + '"></canvas>');
      drawItemThumb(cv, item, 44);
      cv.addEventListener('click', () => openPreview(item, paintCoins));
      thumbs.appendChild(cv);
    }
    card.querySelector('.b-buy').addEventListener('click', () => {
      const r = buyCollection(col);
      if (!r.ok) { toast(r.error, 'err'); return; }
      toast(`${col.name} unlocked for ${r.price} coins!`, 'ok');
      paintCoins();
      paintCollections(body, paintCoins);
    });
    grid.appendChild(card);
  }
  body.innerHTML = '';
  body.appendChild(grid);
}

/* ----------------------------------------------------------------- quests */

function paintQuests(body, paintCoins) {
  body.innerHTML = '';
  body.appendChild(el(`<div class="mods-section-label">Quests — the only way to get coins (and that's the point)</div>`));
  const box = el('<div class="card"></div>');
  for (const q of QUESTS) {
    const st = questState(q);
    const row = el(`
      <div class="friend-row">
        <div class="lib-icon" style="width:36px;height:36px;font-size:15px;background:${st.claimed ? 'var(--green-grad)' : 'var(--bg4)'}">${st.claimed ? icon('check') : icon('zap')}</div>
        <div class="grow">
          <div class="friend-name">${esc(q.name)} <span class="badge outline" style="margin-left:6px">${q.kind}</span></div>
          <div class="friend-sub">${esc(q.desc)}</div>
        </div>
        <span class="coin-chip">${icon('star')}<b>${q.reward}</b></span>
        <button class="btn small ${st.claimable ? 'green' : 'ghost'}" ${st.claimable ? '' : 'disabled'}>
          ${st.claimed ? 'Claimed' : st.claimable ? 'Claim' : 'Locked'}
        </button>
      </div>`);
    row.querySelector('button').addEventListener('click', () => {
      const r = claimQuest(q);
      if (r) { toast(`+${r.amount} coins — ${q.name}`, 'ok'); paintCoins(); paintQuests(body, paintCoins); }
    });
    box.appendChild(row);
  }
  body.appendChild(box);
  body.appendChild(el(`<div class="tiny faint" style="margin-top:10px">Minigames also pay out coins (capped at 300/day). Daily check-ins build a streak bonus.</div>`));
}

/* ----------------------------------------------------------------- plus */

function paintPlus(body, paintCoins) {
  const active = hasPlus();
  const until = active ? new Date(economy().plusUntil).toLocaleDateString() : null;
  const card = el(`
    <div class="card pad" style="max-width:640px">
      <div class="row">
        <div style="font-size:22px;font-weight:800">Horus<span style="color:var(--gold)">+</span></div>
        ${active ? `<span class="badge gold">ACTIVE until ${until}</span>` : ''}
        <span class="right coin-chip">${icon('star')}<b>${PLUS.priceMonthly.toLocaleString()}</b>/month</span>
      </div>
      <div class="divider"></div>
      <div class="col" style="gap:8px">
        ${PLUS.perks.map((p) => `<div class="row small"><span style="color:#5ad391">${icon('check')}</span><span>${esc(p)}</span></div>`).join('')}
      </div>
      <div class="divider"></div>
      <div class="row">
        <span class="small faint">Paid with earned coins only — Horus+ is a goal, not a paywall.</span>
        <button class="btn primary right b-sub">${active ? 'Extend 30 days' : 'Activate Horus+'}</button>
      </div>
      <div class="drop-zone" style="margin-top:14px"></div>
    </div>`);
  card.querySelector('.b-sub').addEventListener('click', () => {
    const r = subscribePlus();
    if (!r.ok) { toast(r.error, 'err'); return; }
    toast('Horus+ active — enjoy!', 'ok');
    paintCoins();
    paintPlus(body, paintCoins);
  });

  /* monthly drop */
  const drop = card.querySelector('.drop-zone');
  if (monthlyDropAvailable()) {
    drop.appendChild(el(`<div class="mods-section-label">Your monthly drop — pick one, free</div>`));
    const rowEl = el('<div class="row wrap"></div>');
    const season = currentSeason();
    const picks = SHOP_ITEMS.filter((x) => !owns(x.id) && x.season === season.id && ['cape', 'hat', 'wings'].includes(x.cat)).slice(0, 3);
    for (const item of picks) {
      const mini = el(`<div class="card cos-card" style="width:120px;cursor:pointer"><canvas></canvas><div class="cos-name tiny">${esc(item.name)}</div></div>`);
      drawItemThumb(mini.querySelector('canvas'), item, 64);
      mini.addEventListener('click', () => {
        const r = claimMonthlyDrop(item.id);
        if (!r.ok) { toast(r.error, 'err'); return; }
        toast(`${item.name} added to your wardrobe!`, 'ok');
        paintPlus(body, paintCoins);
      });
      rowEl.appendChild(mini);
    }
    drop.appendChild(rowEl);
  } else if (active) {
    drop.appendChild(el('<div class="tiny faint">Monthly drop already claimed — next one on the 1st.</div>'));
  }

  body.innerHTML = '';
  body.appendChild(card);
}
