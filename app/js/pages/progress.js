/* Progress — level, achievements, badges and play statistics. XP comes
   from actually using Horus (launches, playtime, quests, minigames, the
   cape studio); achievements pay out XP and a few coins. All local, all
   in the same open economy.json as the rest. */

import { icon } from '../icons.js';
import { el, esc, fmtDuration } from '../components.js';
import { state } from '../state.js';
import { progress, ACHIEVEMENTS, coins } from '../economy.js';

export function render(root) {
  const p = progress();
  const totalPlayMs = state.profiles.reduce((s, x) => s + (x.totalPlayMs || 0), 0);
  const pct = Math.round((p.into / p.needed) * 100);

  const page = el(`
    <div class="page" style="max-width:980px">
      <div class="page-head">
        <div>
          <div class="page-title">Progress</div>
          <div class="page-sub">Level, achievements and statistics — earned by playing, never bought.</div>
        </div>
      </div>

      <div class="card pad row" style="gap:18px;align-items:center">
        <div class="level-ring" style="--pct:${pct}"><b>${p.level}</b><span class="tiny faint">LEVEL</span></div>
        <div class="grow">
          <div class="row" style="margin-bottom:6px">
            <b>${p.xp.toLocaleString()} XP</b>
            <span class="tiny faint right">${p.into.toLocaleString()} / ${p.needed.toLocaleString()} to level ${p.level + 1}</span>
          </div>
          <div class="progress"><i style="width:${pct}%"></i></div>
          <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap">
            <span class="chip">${icon('gift')}<span>${coins().toLocaleString()} coins</span></span>
            <span class="chip">${icon('clock')}<span>${esc(fmtDuration(totalPlayMs) || '0 min')} played</span></span>
            <span class="chip">${icon('play')}<span>${(p.counters.launches || 0).toLocaleString()} launches</span></span>
            <span class="chip">${icon('star')}<span>${p.unlocked.length}/${ACHIEVEMENTS.length} achievements</span></span>
          </div>
        </div>
      </div>

      <div class="mods-section-label">Achievements</div>
      <div class="ach-grid"></div>
    </div>`);

  const grid = page.querySelector('.ach-grid');
  const sorted = [...ACHIEVEMENTS].sort((a, b) =>
    (p.unlocked.includes(b.id) ? 1 : 0) - (p.unlocked.includes(a.id) ? 1 : 0));
  for (const a of sorted) {
    const done = p.unlocked.includes(a.id);
    const cur = Math.min(p.counters[a.counter] || 0, a.at);
    grid.appendChild(el(`
      <div class="card ach-card ${done ? 'done' : ''}">
        <div class="ach-icon">${icon(a.icon)}</div>
        <div class="grow" style="min-width:0">
          <div style="font-weight:800;font-size:13.5px">${esc(a.name)} ${done ? '<span style="color:var(--green)">✓</span>' : ''}</div>
          <div class="tiny muted">${esc(a.desc)}</div>
          ${done ? `<div class="tiny faint">+${a.xp} XP</div>`
            : `<div class="progress" style="height:4px;margin-top:6px"><i style="width:${Math.round((cur / a.at) * 100)}%"></i></div>
               <div class="tiny faint" style="margin-top:2px">${Math.floor(cur).toLocaleString()} / ${a.at.toLocaleString()}</div>`}
        </div>
      </div>`));
  }

  root.appendChild(page);
}
