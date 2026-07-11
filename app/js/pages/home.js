/* Home — the NoRisk-style launch screen: a big 3D render of your skin
   (with equipped cape/cosmetics) centered over a soft backdrop, the player
   name above, a large LAUNCH button with the selected version and a version
   dropdown, and a NEWS panel down the right side. */

import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { el, esc, toast, modal } from '../components.js';
import { state, selectedProfile, selectProfile } from '../state.js';
import { mountPlayer } from '../player3d.js';
import { launchProfile } from '../launch.js';
import { currentSeason } from '../shopCatalog.js';
import { APP_VERSION } from '../version.js';

const NEWS = [
  { tag: 'Some choices are tough', hue: 140 },
  { tag: `${currentSeason().name} Collection 2026`, hue: 330 },
  { tag: 'Heaven Collection Drop', hue: 200 },
  { tag: 'Happy New Year 2026', hue: 270 },
];

export function render(root) {
  const wrap = el(`
    <div class="nr-home">
      <div class="nr-stage-col">
        <div class="nr-name"></div>
        <div class="nr-stage"></div>
        <div class="nr-launch-row">
          <button class="nr-launch">
            <span class="nr-launch-main">${icon('play')}<b>LAUNCH</b></span>
            <span class="nr-launch-sub"></span>
          </button>
          <button class="nr-launch-drop" title="Choose instance">${icon('chevD')}</button>
        </div>
      </div>

      <aside class="nr-news">
        <div class="nr-news-head">${icon('list')}<b>NEWS</b></div>
        <div class="nr-news-list"></div>
      </aside>
    </div>`);

  const profile = selectedProfile();
  wrap.querySelector('.nr-name').textContent = (state.settings.accountName || 'Player').toUpperCase();
  const sub = wrap.querySelector('.nr-launch-sub');
  const applySub = () => {
    const p = selectedProfile();
    sub.textContent = p ? `NRC ${p.version}` : 'no instance';
  };
  applySub();

  const stage = wrap.querySelector('.nr-stage');
  const preview = mountPlayer(stage, () => ({ ...state.cosmetics, name: state.settings.accountName || 'Player' }));

  wrap.querySelector('.nr-launch').addEventListener('click', () => {
    const p = selectedProfile();
    if (!p) { location.hash = '#/library'; return; }
    launchProfile(p);
  });
  wrap.querySelector('.nr-launch-drop').addEventListener('click', () => pickInstance(applySub));

  /* news cards */
  const list = wrap.querySelector('.nr-news-list');
  for (const n of NEWS) {
    const card = el(`
      <button class="nr-news-card">
        <div class="nr-news-title">${esc(n.tag)}</div>
        <div class="nr-news-art" style="--hue:${n.hue}"><span class="nr-news-bolt">${icon('zap')}</span></div>
      </button>`);
    card.addEventListener('click', () => { location.hash = '#/news'; });
    list.appendChild(card);
  }
  const more = el(`<button class="btn ghost small" style="width:100%;margin-top:6px">All news →</button>`);
  more.addEventListener('click', () => { location.hash = '#/news'; });
  list.appendChild(more);

  void APP_VERSION;
  root.appendChild(wrap);
  return () => preview.destroy();
}

function pickInstance(onPicked) {
  const body = el('<div class="version-pick-grid"></div>');
  const m = modal({ title: 'Choose instance', body, size: 'sm' });
  for (const p of state.profiles) {
    const row = el(`
      <div class="version-row ${p.id === state.settings.selectedProfile ? 'selected' : ''}">
        <span class="lib-icon" style="width:30px;height:30px;font-size:13px;border-radius:7px;background:linear-gradient(135deg,#7a3fd0,#4a2680)">${icon('zap')}</span>
        <div class="grow">
          <div style="font-weight:700">${esc(p.name)}</div>
          <div class="tiny faint">NRC ${esc(p.version)} · ${esc(p.loader)}</div>
        </div>
        ${p.id === state.settings.selectedProfile ? icon('check') : ''}
      </div>`);
    row.addEventListener('click', () => { selectProfile(p.id); onPicked(); m.close(); });
    body.appendChild(row);
  }
  const manage = el(`<button class="btn ghost small" style="width:100%;margin-top:10px">Manage instances →</button>`);
  manage.addEventListener('click', () => { m.close(); location.hash = '#/library'; });
  body.parentElement.appendChild(manage);
  void t;
}
