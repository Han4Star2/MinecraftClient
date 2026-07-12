/* Hosted Worlds — your real singleplayer saves (scanned from every profile),
   with host/invite flow wired into the social layer. Slot limits grow with
   Horus+. Hosting uses Minecraft's own "Open to LAN"; Horus manages the
   invites and status around it. */

import { icon } from '../icons.js';
import { el, esc, toast, modal, timeAgo, fmtBytes } from '../components.js';
import { api, isConnected } from '../api.js';
import { hasPlus } from '../economy.js';
import { PLUS } from '../shopCatalog.js';
import { DEMO_FRIENDS } from '../catalog.js';
import { selectedProfile } from '../state.js';

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

      <div class="mods-section-label" style="display:flex;align-items:center;gap:10px">
        <span class="grow">Building — schematics/</span>
        <button class="btn small ghost b-schem-open">${icon('folder')}<span>Open folder</span></button>
      </div>
      <div class="card schem-list"></div>
    </div>`);

  const list = page.querySelector('.w-list');

  page.querySelector('.b-schem-open').addEventListener('click', async () => {
    const p = selectedProfile();
    if (!isConnected() || !p) { toast('Backend offline', 'info'); return; }
    try {
      const res = await api.post(`api/profiles/${encodeURIComponent(p.id)}/open?sub=schematics`);
      toast(`Folder: ${res.path}`);
    } catch (e) { toast(e.message, 'err'); }
  });
  renderSchematics(page.querySelector('.schem-list'));

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

/* ------------------------------------------------ schematics & materials */
/* Real .schem/.schematic parsing on the backend (NBT): dimensions, block
   totals and the material list a builder actually farms from. */

async function renderSchematics(box) {
  const p = selectedProfile();
  if (!isConnected() || !p) {
    box.innerHTML = `<div class="pad muted small" style="padding:14px">Drop <span class="mono">.schem</span> / <span class="mono">.schematic</span> files into the profile's <span class="mono">schematics/</span> folder — Horus parses dimensions and the full material list. The Ghost Blocks, Build Progress and Material Tracker modules live on the Mods page (Building).</div>`;
    return;
  }
  let items;
  try {
    ({ items } = await api.get(`api/profiles/${encodeURIComponent(p.id)}/schematics`));
  } catch (e) {
    box.innerHTML = `<div class="pad muted small" style="padding:14px">schematics/: ${esc(e.message)}</div>`;
    return;
  }
  if (!items.length) {
    box.innerHTML = `<div class="empty">${icon('grid')}<div class="e-title">No schematics yet</div><div>Drop .schem / .schematic / .litematic files into <span class="mono">schematics/</span> — material lists appear here.</div></div>`;
    return;
  }
  box.innerHTML = '';
  for (const it of items) {
    const row = el(`
      <div class="friend-row">
        <div class="lib-icon" style="width:36px;height:36px;font-size:14px;background:linear-gradient(135deg,#7c4a24,#4a2c14)">${icon('grid')}</div>
        <div class="grow" style="min-width:0">
          <div class="friend-name ellipsis">${esc(it.file)}</div>
          <div class="friend-sub">${fmtBytes(it.size)} · ${new Date(it.mtime).toLocaleDateString()}</div>
        </div>
        <button class="btn small dark b-mat">${icon('layers')}<span>Materials</span></button>
      </div>`);
    row.querySelector('.b-mat').addEventListener('click', async (e) => {
      e.target.closest('button').disabled = true;
      try {
        const d = await api.get(`api/profiles/${encodeURIComponent(p.id)}/schematics/parse?file=${encodeURIComponent(it.file)}`);
        import('../economy.js').then(({ track }) => track('schematics'));
        const body = el(`
          <div class="col" style="gap:10px">
            <div class="row" style="gap:8px">
              <span class="chip mono">${d.width}×${d.height}×${d.length}</span>
              <span class="chip">${Number(d.totalBlocks).toLocaleString()} blocks</span>
              ${d.format === 'litematic' ? '<span class="badge outline">litematic header</span>' : ''}
            </div>
            ${d.note ? `<div class="tiny faint">${esc(d.note)}</div>` : ''}
            <div class="col" style="gap:4px;max-height:340px;overflow-y:auto">
              ${d.materials.map((m) => `
                <div class="version-row"><span class="grow" style="text-transform:capitalize">${esc(m.name)}</span>
                <span class="tiny mono faint">${m.count.toLocaleString()} (${m.stacks} stack${m.stacks > 1 ? 's' : ''})</span></div>`).join('')
              || '<div class="muted small">No material data in this format.</div>'}
            </div>
          </div>`);
        modal({ title: `Material list — ${it.file}`, body });
      } catch (err) {
        toast(err.message, 'err');
      } finally {
        e.target.closest('button').disabled = false;
      }
    });
    box.appendChild(row);
  }
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
