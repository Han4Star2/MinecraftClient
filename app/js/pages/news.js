/* News — updates, events, changelog, fresh cosmetics and live server status
   (real Server List Ping via the backend when connected). */

import { icon } from '../icons.js';
import { el, esc, toast } from '../components.js';
import { api, isConnected } from '../api.js';
import { PINNED_SERVERS } from '../catalog.js';
import { SHOP_ITEMS, currentSeason } from '../shopCatalog.js';
import { drawItemThumb } from '../thumbs.js';
import { openPreview } from './shop.js';
import { APP_VERSION } from '../version.js';

const NEWS = [
  { tag: 'UPDATE', color: 'var(--accent-2)', title: `Horus ${APP_VERSION} — the big one`, when: 'Today',
    text: 'Shop with 200+ cosmetics and earnable coins, Horus+ perks, Cape Studio (free!), minigames, social feed, hosted-worlds manager, Bedrock launch, CurseForge & Modrinth sources, themes and a server API.' },
  { tag: 'EVENT', color: 'var(--gold)', title: `${currentSeason().name} season is live`, when: 'This week',
    text: 'Seasonal cosmetics rotated into the Featured rail. Horus+ members can claim their monthly drop now.' },
  { tag: 'BLOG', color: 'var(--blue)', title: 'Why the Horus economy has no real-money store', when: '3 days ago',
    text: 'Coins come from quests, minigames and streaks — never from a credit card. A shop should be a goal, not a paywall. Read how the cap keeps it fair.' },
  { tag: 'CHANGELOG', color: 'var(--green)', title: 'Launcher core changelog', when: '1 week ago',
    text: 'SHA-1-verified parallel downloads · Fabric/Quilt auto-profiles · offline UUIDv3 sessions · Microsoft device-code login · CONNECT-proxy support · zip-slip-safe natives extraction.' },
  { tag: 'COMMUNITY', color: 'var(--purple)', title: 'Cape Studio showcase', when: '2 weeks ago',
    text: 'The best community-made capes this week — open the studio, remix them, they are all free. Share yours in the feed!' },
];

export function render(root) {
  const page = el(`
    <div class="page">
      <div class="page-head">
        <div>
          <div class="page-title">News</div>
          <div class="page-sub">Updates, events, changelogs and live server status — all in one place.</div>
        </div>
      </div>
      <div class="news-grid">
        <div class="col" style="gap:16px">
          <div class="card n-feed"></div>
          <div class="mods-section-label">Fresh in the shop</div>
          <div class="row wrap n-cosmetics"></div>
        </div>
        <div class="col" style="gap:16px">
          <div class="card pad n-status">
            <div class="row" style="margin-bottom:6px">
              <b class="small">Server status</b>
              <button class="icon-btn small right b-refresh" title="Refresh">${icon('refresh')}</button>
            </div>
            <div class="status-rows"></div>
            <div class="tiny faint" style="margin-top:8px">Live ping (Server List Protocol) when the backend is online.</div>
          </div>
          <div class="card pad">
            <b class="small">Quick links</b>
            <div class="col" style="gap:6px;margin-top:10px">
              <a class="btn small dark" href="#/shop">${icon('gift')}<span>Open the shop</span></a>
              <a class="btn small dark" href="#/minigames">${icon('gamepad')}<span>Play a minigame</span></a>
              <a class="btn small dark" href="#/cosmetics">${icon('edit')}<span>Create a free cape</span></a>
            </div>
          </div>
        </div>
      </div>
    </div>`);

  /* news feed */
  const feed = page.querySelector('.n-feed');
  for (const n of NEWS) {
    feed.appendChild(el(`
      <div class="news-item">
        <div class="row">
          <span class="news-tag" style="color:${n.color}">${esc(n.tag)}</span>
          <span class="tiny faint right">${esc(n.when)}</span>
        </div>
        <div style="font-weight:800;font-size:15px;margin-top:3px">${esc(n.title)}</div>
        <div class="small muted" style="margin-top:4px">${esc(n.text)}</div>
      </div>`));
  }

  /* fresh cosmetics rail */
  const rail = page.querySelector('.n-cosmetics');
  const season = currentSeason();
  const fresh = SHOP_ITEMS.filter((x) => x.season === season.id && ['cape', 'wings', 'hat', 'pet'].includes(x.cat)).slice(0, 6);
  for (const item of fresh) {
    const mini = el(`<div class="card hover cos-card" style="width:106px;padding:9px"><canvas></canvas><div class="cos-name tiny ellipsis" style="max-width:88px">${esc(item.name)}</div></div>`);
    drawItemThumb(mini.querySelector('canvas'), item, 64);
    mini.addEventListener('click', () => openPreview(item));
    rail.appendChild(mini);
  }

  /* server status */
  const rows = page.querySelector('.status-rows');
  async function paintStatus() {
    rows.innerHTML = '';
    for (const s of PINNED_SERVERS.slice(0, 5)) {
      const row = el(`
        <div class="server-status-row">
          <span class="rail-tile" style="width:26px;height:26px;font-size:${s.letter.length > 2 ? 8 : 12}px;background:${s.bg};color:${s.fg}">${esc(s.letter)}</span>
          <div class="grow" style="min-width:0">
            <div style="font-weight:700;font-size:12.5px">${esc(s.name)}</div>
            <div class="tiny faint s-detail">pinging…</div>
          </div>
          <span class="mode-badge s-badge"><span class="dot"></span></span>
        </div>`);
      rows.appendChild(row);
      const detail = row.querySelector('.s-detail');
      const badge = row.querySelector('.s-badge');
      if (!isConnected()) {
        detail.textContent = 'demo — backend offline';
        badge.classList.add('demo');
        continue;
      }
      api.get(`api/ping?host=${encodeURIComponent(s.addr)}`).then((r) => {
        if (r.online) {
          badge.classList.add('online');
          detail.textContent = `${r.players.online.toLocaleString()} / ${r.players.max.toLocaleString()} · ${r.latencyMs} ms`;
        } else {
          detail.textContent = r.error || 'offline';
        }
      }).catch((e) => { detail.textContent = e.message; });
    }
  }
  paintStatus();
  page.querySelector('.b-refresh').addEventListener('click', () => { paintStatus(); toast('Refreshing server status…', 'info', 1200); });

  root.appendChild(page);
}
