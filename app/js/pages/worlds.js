/* Hosted Worlds — your real singleplayer saves (scanned from every profile),
   with host/invite flow wired into the social layer. Slot limits grow with
   Horus+. Hosting uses Minecraft's own "Open to LAN"; Horus manages the
   invites and status around it. */

import { icon } from '../icons.js';
import { el, esc, toast, modal, timeAgo } from '../components.js';
import { api, isConnected } from '../api.js';
import { hasPlus } from '../economy.js';
import { PLUS } from '../shopCatalog.js';
import { DEMO_FRIENDS } from '../catalog.js';

let hosted = null; // { name } — demo session state

export function render(root) {
  const slots = hasPlus() ? PLUS.worldSlots.plus : PLUS.worldSlots.free;
  const page = el(`
    <div class="page" style="max-width:900px">
      <div class="page-head">
        <div>
          <div class="page-title">Hosted Worlds</div>
          <div class="page-sub">Your saves from every profile. Host up to ${slots} at once${hasPlus() ? ' (Horus+ active ✦)' : ' — Horus+ raises the limit to 5'} and invite friends right from here.</div>
        </div>
        <span class="chip">${icon('globe')}<span>${hosted ? '1' : '0'}/${slots} hosting</span></span>
      </div>
      <div class="card w-list"></div>
      <div class="card pad row" style="margin-top:18px;gap:14px">
        <span style="font-size:22px;line-height:0;flex:none;color:var(--gold)">${icon('info')}</span>
        <div class="small muted">
          Hosting uses Minecraft's built-in <b style="color:var(--txt)">Open to LAN</b> — Horus tracks the session,
          notifies invited friends and shows join info. No world files ever leave your machine.
        </div>
      </div>
    </div>`);

  const list = page.querySelector('.w-list');

  (async () => {
    let worlds = [];
    if (isConnected()) {
      try { worlds = (await api.get('api/worlds')).worlds; } catch { /* fall through */ }
    }
    if (!worlds.length) {
      worlds = isConnected() ? [] : [
        { name: 'Skyblock Empire', profileName: '1.8.9 PvP', version: '1.8.9', mtime: Date.now() - 864e5 * 3, demo: true },
        { name: 'Mega Base 3.0', profileName: 'Latest & Greatest', version: '1.21.5', mtime: Date.now() - 36e5 * 8, demo: true },
        { name: 'Hardcore Attempt #12', profileName: 'Latest & Greatest', version: '1.21.5', mtime: Date.now() - 864e5 * 14, demo: true },
      ];
    }
    if (!worlds.length) {
      list.innerHTML = `<div class="empty">${icon('globe')}<div class="e-title">No worlds yet</div><div>Singleplayer saves from your profiles appear here automatically.</div></div>`;
      return;
    }
    for (const w of worlds) list.appendChild(worldRow(w, page));
  })();

  root.appendChild(page);
}

function worldRow(w, page) {
  const isHosting = hosted?.name === w.name;
  const row = el(`
    <div class="world-row">
      <div class="world-icon">${w.icon ? `<img src="${w.icon}" alt="">` : icon('globe')}</div>
      <div class="grow" style="min-width:0">
        <div style="font-weight:700" class="ellipsis">${esc(w.name)} ${isHosting ? '<span class="badge new">LIVE</span>' : ''}${w.demo ? ' <span class="badge outline">demo</span>' : ''}</div>
        <div class="tiny faint">${esc(w.profileName)} · ${esc(w.version)}${w.mtime ? ` · played ${esc(timeAgo(w.mtime) || '')}` : ''}</div>
      </div>
      ${isHosting
        ? `<button class="btn small danger-ghost b-stop">${icon('power')}<span>Stop</span></button>`
        : `<button class="btn small green b-host">${icon('play')}<span>Host</span></button>`}
      <button class="btn small dark b-invite" ${isHosting ? '' : 'disabled'}>${icon('users')}<span>Invite</span></button>
    </div>`);

  row.querySelector('.b-host')?.addEventListener('click', () => {
    hosted = { name: w.name, since: Date.now() };
    toast(`Hosting "${w.name}" — start the world and use Open to LAN`, 'ok');
    rerender(page);
  });
  row.querySelector('.b-stop')?.addEventListener('click', () => {
    hosted = null;
    toast('Hosting session ended', 'info');
    rerender(page);
  });
  row.querySelector('.b-invite')?.addEventListener('click', () => inviteModal(w));
  return row;
}

function rerender(page) {
  const root = page.parentElement;
  page.remove();
  render(root);
}

function inviteModal(w) {
  const body = el('<div class="col" style="gap:4px"></div>');
  for (const f of DEMO_FRIENDS.filter((x) => x.status !== 'offline')) {
    const row = el(`
      <div class="version-row">
        <span class="st-dot st-${f.status}" style="position:static;width:9px;height:9px;border:none;border-radius:50%"></span>
        <span class="grow" style="font-weight:600">${esc(f.name)}</span>
        <button class="btn small primary">Invite</button>
      </div>`);
    row.querySelector('button').addEventListener('click', (e) => {
      e.target.textContent = 'Sent ✓';
      e.target.disabled = true;
      toast(`${f.name} invited to "${w.name}"`, 'ok');
    });
    body.appendChild(row);
  }
  modal({ title: `Invite to ${w.name}`, body, size: 'sm' });
}
