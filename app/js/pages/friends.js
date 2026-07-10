/* Friends — optional social layer. Quill never requires an account to play;
   the demo data shows how the UI behaves. The protocol is documented and the
   relay is self-hostable (see README), so nobody is locked into our servers. */

import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { el, esc, toast } from '../components.js';
import { DEMO_FRIENDS } from '../catalog.js';
import { drawFace } from '../skin.js';

export function render(root) {
  const page = el(`
    <div class="page" style="max-width:860px">
      <div class="page-head">
        <div>
          <div class="page-title">${esc(t('friends.title'))}</div>
          <div class="page-sub">${esc(t('friends.sub'))}</div>
        </div>
      </div>

      <div class="row" style="margin-bottom:18px">
        <div class="search-box grow">
          ${icon('user')}
          <input class="input" placeholder="Player name…" spellcheck="false">
        </div>
        <button class="btn primary b-add">${icon('plus')}<span>${esc(t('friends.add'))}</span></button>
      </div>

      <div class="mods-section-label">${esc(t('friends.online'))}</div>
      <div class="card f-online"></div>

      <div class="mods-section-label">${esc(t('friends.offline'))}</div>
      <div class="card f-offline"></div>

      <div class="card pad row" style="margin-top:22px;gap:14px">
        <span style="font-size:26px;line-height:0;flex:none;color:#5ad391">${icon('shield')}</span>
        <div class="small muted">
          <b style="color:var(--txt)">Privacy first.</b>
          The friends system is opt-in and runs over an open protocol. You can point Quill at a
          self-hosted relay in <a href="#/settings?cat=network" style="color:var(--accent-2)">Settings → Network</a>
          — or never use it at all. Playing never requires an account.
        </div>
      </div>
    </div>`);

  const online = page.querySelector('.f-online');
  const offline = page.querySelector('.f-offline');

  for (const f of DEMO_FRIENDS) {
    const row = el(`
      <div class="friend-row">
        <div class="friend-avatar">
          <canvas></canvas>
          <span class="st-dot st-${f.status}"></span>
        </div>
        <div class="grow" style="min-width:0">
          <div class="friend-name">${esc(f.name)}</div>
          <div class="friend-sub">${esc(f.detail)}</div>
        </div>
        ${f.status === 'ingame' ? `<button class="btn small green b-join">${icon('play')}<span>Join</span></button>` : ''}
        ${f.status !== 'offline' ? `<button class="btn small dark b-invite">${icon('users')}<span>Invite</span></button>` : ''}
        <button class="icon-btn small" title="Message">${icon('message')}</button>
      </div>`);
    drawFace(row.querySelector('canvas'), 38);
    row.querySelector('.b-join')?.addEventListener('click', () => toast(`Joining ${f.name} — ${f.detail}`, 'info'));
    row.querySelector('.b-invite')?.addEventListener('click', () => toast(`Invite sent to ${f.name}`, 'ok'));
    (f.status === 'offline' ? offline : online).appendChild(row);
  }

  page.querySelector('.b-add').addEventListener('click', () => {
    const input = page.querySelector('.search-box input');
    const name = input.value.trim();
    if (!name) return;
    toast(`Friend request sent to ${name}`, 'ok');
    input.value = '';
  });

  root.appendChild(page);
}
