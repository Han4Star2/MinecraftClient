/* Social — friends with requests & statuses, chat, a feed and notifications.
   Runs on local demo data; the protocol is open and the relay self-hostable
   (docs/server-api.md) — and none of it is ever required to play. */

import { icon } from '../icons.js';
import { el, esc, toast, timeAgo } from '../components.js';
import { state } from '../state.js';
import { DEMO_FRIENDS } from '../catalog.js';
import { drawFace } from '../skin.js';
import { hasPlus } from '../economy.js';
import { PLUS } from '../shopCatalog.js';

const LS = 'horus.social.v1';

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(LS));
    if (d && d.friends) return d;
  } catch { /* fresh */ }
  return {
    friends: DEMO_FRIENDS.map((f) => ({ ...f })),
    requests: [{ name: 'Skyfall_7', mutual: 2 }, { name: 'ChorusFruit', mutual: 5 }],
    posts: [
      { who: 'BREND4N', when: Date.now() - 36e5 * 2, text: 'Finally hit 500 wins in Bed Wars 🎉', likes: 12, liked: false },
      { who: 'Gemsip', when: Date.now() - 36e5 * 7, text: 'The new Frostbound collection is clean. Worth every coin.', likes: 8, liked: false },
      { who: 'unidentiffie', when: Date.now() - 864e5, text: 'Anyone up for some 1.8.9 PvP tonight? My reach display says I need practice…', likes: 5, liked: false },
      { who: 'Horus Team', when: Date.now() - 864e5 * 2, text: 'Horus 2.0 is out: shop, minigames, cape studio, Bedrock launch & more. Changelog in News →', likes: 41, liked: true },
    ],
    chats: {},
    notifs: [
      { text: 'ChorusFruit sent you a friend request', when: Date.now() - 36e5 },
      { text: 'Daily reward is ready to claim', when: Date.now() - 36e5 * 3 },
    ],
  };
}

let s = null;
const persist = () => localStorage.setItem(LS, JSON.stringify(s));

let tab = 'feed';
let chatWith = null;

export function render(root) {
  s = s || load();
  const slots = hasPlus() ? PLUS.friendSlots.plus : PLUS.friendSlots.free;

  const page = el(`
    <div class="page">
      <div class="page-head">
        <div>
          <div class="page-title">Social</div>
          <div class="page-sub">Friends, chat, feed — optional, open and self-hostable. Playing never requires any of this.</div>
        </div>
        <span class="chip">${icon('users')}<span class="f-count"></span></span>
      </div>
      <div class="social-layout">
        <div class="social-main col" style="gap:14px">
          <div class="tabs">
            <button class="tab ${tab === 'feed' ? 'active' : ''}" data-tab="feed">Feed</button>
            <button class="tab ${tab === 'chat' ? 'active' : ''}" data-tab="chat">Chats</button>
          </div>
          <div class="social-content"></div>
        </div>
        <div class="social-side">
          <div class="card notif-card"></div>
          <div class="card friends-card"></div>
        </div>
      </div>
    </div>`);

  const content = page.querySelector('.social-content');
  page.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
    tab = b.dataset.tab;
    page.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('active', x === b));
    paintMain();
  }));

  const paintCount = () => {
    page.querySelector('.f-count').textContent = `${s.friends.length}/${slots} friends${hasPlus() ? ' ✦' : ''}`;
  };

  function paintMain() {
    content.innerHTML = '';
    if (tab === 'feed') paintFeed(content);
    else paintChat(content);
  }

  /* ------------------------------------------------------------- feed */
  function paintFeed(host) {
    const composer = el(`
      <div class="card pad row">
        <canvas width="34" height="34" style="border-radius:8px;image-rendering:pixelated"></canvas>
        <input class="input grow" placeholder="Share something…" maxlength="240" spellcheck="false">
        <button class="btn primary small">${icon('message')}<span>Post</span></button>
      </div>`);
    drawFace(composer.querySelector('canvas'), 34);
    const doPost = () => {
      const input = composer.querySelector('input');
      const text = input.value.trim();
      if (!text) return;
      s.posts.unshift({ who: state.settings.accountName || 'Player', when: Date.now(), text, likes: 0, liked: false, mine: true });
      persist();
      input.value = '';
      paintMain();
    };
    composer.querySelector('button').addEventListener('click', doPost);
    composer.querySelector('input').addEventListener('keydown', (e) => { if (e.key === 'Enter') doPost(); });
    host.appendChild(composer);

    const feed = el('<div class="card"></div>');
    for (const post of s.posts) {
      const row = el(`
        <div class="feed-post">
          <div class="row">
            <canvas width="30" height="30" style="border-radius:7px;image-rendering:pixelated"></canvas>
            <b>${esc(post.who)}</b>
            <span class="tiny faint">${esc(timeAgo(post.when) || 'now')}</span>
          </div>
          <div class="small" style="margin-top:7px">${esc(post.text)}</div>
          <div class="feed-actions">
            <button class="b-like ${post.liked ? 'liked' : ''}">${icon('heart')}<span>${post.likes}</span></button>
            <button class="b-reply">${icon('message')}<span>Reply</span></button>
          </div>
        </div>`);
      drawFace(row.querySelector('canvas'), 30);
      row.querySelector('.b-like').addEventListener('click', (e) => {
        post.liked = !post.liked;
        post.likes += post.liked ? 1 : -1;
        persist();
        e.currentTarget.classList.toggle('liked', post.liked);
        e.currentTarget.querySelector('span').textContent = post.likes;
      });
      row.querySelector('.b-reply').addEventListener('click', () => {
        tab = 'chat';
        chatWith = post.who;
        page.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('active', x.dataset.tab === 'chat'));
        paintMain();
      });
      feed.appendChild(row);
    }
    host.appendChild(feed);
  }

  /* ------------------------------------------------------------- chat */
  function paintChat(host) {
    const wrap = el(`
      <div class="row" style="align-items:stretch;gap:14px">
        <div class="card" style="width:180px;flex:none;overflow-y:auto;max-height:380px"><div class="col" style="gap:0" id="chat-list"></div></div>
        <div class="card chat-box grow">
          <div class="chat-log"></div>
          <div class="chat-input">
            <input class="input grow" placeholder="Message…" spellcheck="false">
            <button class="btn primary small">${icon('chevR')}</button>
          </div>
        </div>
      </div>`);
    const list = wrap.querySelector('#chat-list');
    const log = wrap.querySelector('.chat-log');
    chatWith = chatWith || s.friends[0]?.name;

    for (const f of s.friends) {
      const row = el(`
        <div class="hud-list-row ${f.name === chatWith ? 'selected' : ''}" style="padding:9px 10px">
          <span class="st-dot st-${f.status}" style="position:static;width:8px;height:8px;border:none;border-radius:50%"></span>
          <span class="grow ellipsis">${esc(f.name)}</span>
        </div>`);
      row.addEventListener('click', () => { chatWith = f.name; paintMain(); });
      list.appendChild(row);
    }

    const paintLog = () => {
      log.innerHTML = '';
      const msgs = s.chats[chatWith] || [];
      if (!msgs.length) log.appendChild(el(`<div class="tiny faint center" style="margin:auto">Say hi to ${esc(chatWith || '…')} 👋</div>`));
      for (const m of msgs) {
        log.appendChild(el(`<div class="chat-msg ${m.me ? 'me' : ''}">${m.me ? '' : `<div class="who">${esc(chatWith)}</div>`}${esc(m.text)}</div>`));
      }
      log.scrollTop = log.scrollHeight;
    };
    paintLog();

    const input = wrap.querySelector('.chat-input input');
    const send = () => {
      const text = input.value.trim();
      if (!text || !chatWith) return;
      (s.chats[chatWith] = s.chats[chatWith] || []).push({ me: true, text, when: Date.now() });
      input.value = '';
      persist();
      paintLog();
      const friend = s.friends.find((f) => f.name === chatWith);
      if (friend && friend.status !== 'offline') {
        setTimeout(() => {
          const replies = ['gg', 'nice one!', 'wanna hop on Hypixel?', 'brb, one more round of Tetris', 'love the new cape 👀', 'sure!'];
          s.chats[chatWith].push({ me: false, text: replies[Math.random() * replies.length | 0], when: Date.now() });
          persist();
          if (document.contains(log)) paintLog();
        }, 900 + Math.random() * 1200);
      }
    };
    wrap.querySelector('.chat-input button').addEventListener('click', send);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
    host.appendChild(wrap);
  }

  /* ---------------------------------------------------------- sidebar */
  function paintSide() {
    const notif = page.querySelector('.notif-card');
    notif.innerHTML = `<div class="row" style="padding:12px 14px 6px"><b class="small">Notifications</b>
      <button class="btn small ghost right b-clear">Clear</button></div>`;
    notif.querySelector('.b-clear').addEventListener('click', () => { s.notifs = []; persist(); paintSide(); });
    if (!s.notifs.length) notif.appendChild(el('<div class="tiny faint" style="padding:0 14px 12px">All caught up ✓</div>'));
    for (const n of s.notifs) {
      notif.appendChild(el(`<div class="friend-row" style="padding:8px 14px"><span style="color:var(--gold)">${icon('info')}</span><div class="grow small">${esc(n.text)}<div class="tiny faint">${esc(timeAgo(n.when) || '')}</div></div></div>`));
    }

    const card = page.querySelector('.friends-card');
    card.innerHTML = `<div class="row" style="padding:12px 14px 6px"><b class="small">Friends</b><span class="tiny faint right f-slots"></span></div>`;
    card.querySelector('.f-slots').textContent = `${s.friends.length}/${slots} slots${hasPlus() ? '' : ' — Horus+ raises to 50'}`;

    /* requests */
    for (const r of s.requests) {
      const row = el(`
        <div class="friend-row" style="background:rgba(243,193,75,0.05)">
          <div class="friend-avatar"><canvas></canvas></div>
          <div class="grow"><div class="friend-name">${esc(r.name)}</div><div class="friend-sub">${r.mutual} mutual friends</div></div>
          <button class="icon-btn small b-yes" style="color:#5ad391">${icon('check')}</button>
          <button class="icon-btn small b-no">${icon('x')}</button>
        </div>`);
      drawFace(row.querySelector('canvas'), 38);
      row.querySelector('.b-yes').addEventListener('click', () => {
        if (s.friends.length >= slots) { toast(`Friend slots full (${slots}) — Horus+ raises the limit`, 'err'); return; }
        s.friends.push({ name: r.name, status: 'online', detail: 'Just joined your friends' });
        s.requests = s.requests.filter((x) => x !== r);
        persist();
        paintSide();
        paintCount();
        toast(`${r.name} added`, 'ok');
      });
      row.querySelector('.b-no').addEventListener('click', () => {
        s.requests = s.requests.filter((x) => x !== r);
        persist();
        paintSide();
      });
      card.appendChild(row);
    }

    for (const f of s.friends) {
      const row = el(`
        <div class="friend-row">
          <div class="friend-avatar"><canvas></canvas><span class="st-dot st-${f.status}"></span></div>
          <div class="grow" style="min-width:0">
            <div class="friend-name ellipsis">${esc(f.name)}</div>
            <div class="friend-sub ellipsis">${esc(f.detail || f.status)}</div>
          </div>
          <button class="icon-btn small b-msg" title="Message">${icon('message')}</button>
        </div>`);
      drawFace(row.querySelector('canvas'), 38);
      row.querySelector('.b-msg').addEventListener('click', () => {
        tab = 'chat';
        chatWith = f.name;
        page.querySelectorAll('[data-tab]').forEach((x) => x.classList.toggle('active', x.dataset.tab === 'chat'));
        paintMain();
      });
      card.appendChild(row);
    }

    const add = el(`
      <div class="row" style="padding:10px 14px 14px">
        <input class="input grow" placeholder="Add by name…" spellcheck="false">
        <button class="btn small primary">${icon('plus')}</button>
      </div>`);
    add.querySelector('button').addEventListener('click', () => {
      const name = add.querySelector('input').value.trim();
      if (!name) return;
      toast(`Friend request sent to ${name}`, 'ok');
      add.querySelector('input').value = '';
    });
    card.appendChild(add);
  }

  paintMain();
  paintSide();
  paintCount();
  root.appendChild(page);
}
