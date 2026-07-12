/* HUD Editor — drag overlays anywhere on a mock game stage, with center
   snapping, per-element scale/color/opacity/background and live values. */

import { icon } from '../icons.js';
import { t } from '../i18n.js';
import { el, esc, toast, makeSwitch, makeSlider, settingRow, control } from '../components.js';
import { hudElements, resetHud, save, hudElementEnabled, hudElementLocked, fpsBoostLevel } from '../state.js';
import { FPS_BOOST_LEVELS, HUD_GROUPS } from '../catalog.js';

let selectedId = null;

export function render(root) {
  const page = el(`
    <div class="page wide" style="max-width:1400px;margin:0 auto">
      <div class="page-head">
        <div>
          <div class="page-title">${esc(t('hud.title'))}</div>
          <div class="page-sub">${esc(t('hud.sub'))}</div>
        </div>
        <div class="row">
          <span class="chip boost-chip" style="cursor:pointer;display:none"></span>
          <span class="chip">${icon('hud')}<span>${esc(t('hud.grid'))}</span><span class="g-switch"></span></span>
          <button class="btn ghost b-reset">${icon('refresh')}<span>${esc(t('hud.reset'))}</span></button>
        </div>
      </div>
      <div class="hud-layout">
        <div class="hud-stage-wrap">
          <div class="hud-stage show-grid">
            <div class="hud-guide-v"></div>
            <div class="hud-guide-h"></div>
            <div class="hud-hotbar">${'<span></span>'.repeat(9)}</div>
          </div>
        </div>
        <div class="hud-panel">
          <div class="card">
            <div class="small" style="font-weight:800;margin-bottom:8px">${esc(t('hud.elements'))}</div>
            <div class="hud-list"></div>
          </div>
          <div class="card sel-card">
            <div class="small" style="font-weight:800;margin-bottom:4px">${esc(t('hud.selected'))}</div>
            <div class="sel-body"><div class="muted small" style="padding:8px 0">${esc(t('hud.none'))}</div></div>
          </div>
        </div>
      </div>
    </div>`);

  const stage = page.querySelector('.hud-stage');
  page.querySelector('.hud-hotbar').children[4].classList.add('sel');

  const gSwitch = makeSwitch(true, (on) => stage.classList.toggle('show-grid', on));
  gSwitch.style.transform = 'scale(0.8)';
  page.querySelector('.g-switch').appendChild(gSwitch);

  const boostChip = page.querySelector('.boost-chip');
  const boostLvl = fpsBoostLevel();
  if (boostLvl > 0) {
    boostChip.style.display = 'inline-flex';
    boostChip.innerHTML = `${icon('zap')}<span>FPS Boost: ${esc(FPS_BOOST_LEVELS[boostLvl].label)}</span>`;
    boostChip.title = 'Hiding elements above their threshold — click to open Settings → Performance';
    boostChip.addEventListener('click', () => { location.hash = '#/settings?cat=performance'; });
  }

  page.querySelector('.b-reset').addEventListener('click', () => {
    resetHud();
    selectedId = null;
    paintStage();
    paintList();
    paintSelected();
    toast(t('hud.reset') + ' ✓');
  });

  /* ------------------------------------------------------------- painting */

  const els = () => hudElements();

  function paintStage() {
    stage.querySelectorAll('.hud-el').forEach((n) => n.remove());
    for (const e of els()) {
      if (!hudElementEnabled(e)) continue;
      const node = el(`<div class="hud-el ${e.boxed ? 'boxed' : ''} ${e.id === selectedId ? 'selected' : ''}" data-id="${e.id}"></div>`);
      node.style.left = `${e.x}%`;
      node.style.top = `${e.y}%`;
      node.style.color = e.color;
      node.style.transform = `scale(${e.scale})`;
      node.style.opacity = e.opacity ?? 1;
      node.innerHTML = contentFor(e);
      hookDrag(node, e);
      stage.appendChild(node);
    }
  }

  const listBox = page.querySelector('.hud-list');
  function paintList() {
    listBox.innerHTML = '';
    for (const g of HUD_GROUPS) {
      const inGroup = els().filter((e) => (e.group || 'misc') === g.id);
      if (!inGroup.length) continue;
      listBox.appendChild(el(`<div class="hud-group-label">${esc(g.label)}</div>`));
      for (const e of inGroup) {
        const locked = hudElementLocked(e);
        const row = el(`
          <div class="hud-list-row ${e.id === selectedId ? 'selected' : ''} ${locked ? 'locked' : ''}">
            <span class="grow">${esc(e.label)}</span>
            ${locked ? `<span class="lock-flag" title="Forced off by FPS Boost">${icon('alert')}</span>` : ''}
          </div>`);
        const sw = makeSwitch(e.on, (on) => {
          e.on = on;
          save('hud');
          paintStage();
        });
        sw.disabled = locked;
        row.appendChild(sw);
        row.addEventListener('click', (ev) => {
          if (ev.target.closest('.switch')) return;
          selectedId = e.id;
          paintStage();
          paintList();
          paintSelected();
        });
        listBox.appendChild(row);
      }
    }
  }

  const selBody = page.querySelector('.sel-body');
  function paintSelected() {
    const e = els().find((x) => x.id === selectedId);
    if (!e) {
      selBody.innerHTML = `<div class="muted small" style="padding:8px 0">${esc(t('hud.none'))}</div>`;
      return;
    }
    selBody.innerHTML = `<div style="font-weight:700;margin:6px 0 2px">${esc(e.label)}</div>`;
    if (hudElementLocked(e)) {
      selBody.appendChild(el(`<div class="tiny faint" style="margin-bottom:8px">${icon('alert')} Hidden right now by FPS Boost — position and style stay saved.</div>`));
    }
    selBody.appendChild(settingRow(t('hud.scale'), null,
      makeSlider({ min: 50, max: 250, value: Math.round(e.scale * 100), unit: '%' }, (v) => { e.scale = v / 100; save('hud'); paintStage(); })));
    selBody.appendChild(settingRow(t('hud.opacity'), null,
      makeSlider({ min: 10, max: 100, value: Math.round((e.opacity ?? 1) * 100), unit: '%' }, (v) => { e.opacity = v / 100; save('hud'); paintStage(); })));
    selBody.appendChild(settingRow(t('hud.color'), null,
      control({ t: 'color' }, e.color, (v) => { e.color = v; save('hud'); paintStage(); })));
    selBody.appendChild(settingRow(t('hud.background'), null,
      makeSwitch(e.boxed, (v) => { e.boxed = v; save('hud'); paintStage(); })));
  }

  /* ------------------------------------------------------------- dragging */

  function hookDrag(node, e) {
    node.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      node.setPointerCapture(ev.pointerId);
      node.classList.add('dragging');
      selectedId = e.id;
      paintList();
      paintSelected();
      stage.querySelectorAll('.hud-el').forEach((n) => n.classList.toggle('selected', n === node));

      const stageRect = stage.getBoundingClientRect();
      const nodeRect = node.getBoundingClientRect();
      const grabX = ev.clientX - nodeRect.left;
      const grabY = ev.clientY - nodeRect.top;
      const guideV = stage.querySelector('.hud-guide-v');
      const guideH = stage.querySelector('.hud-guide-h');

      const move = (mv) => {
        let xPct = ((mv.clientX - grabX - stageRect.left) / stageRect.width) * 100;
        let yPct = ((mv.clientY - grabY - stageRect.top) / stageRect.height) * 100;
        const wPct = (nodeRect.width / stageRect.width) * 100;
        const hPct = (nodeRect.height / stageRect.height) * 100;
        /* snap to horizontal/vertical center */
        const cx = 50 - wPct / 2;
        const cy = 50 - hPct / 2;
        guideV.style.display = Math.abs(xPct - cx) < 1.2 ? 'block' : 'none';
        guideH.style.display = Math.abs(yPct - cy) < 1.2 ? 'block' : 'none';
        if (Math.abs(xPct - cx) < 1.2) xPct = cx;
        if (Math.abs(yPct - cy) < 1.2) yPct = cy;
        e.x = Math.min(Math.max(xPct, 0), 100 - wPct);
        e.y = Math.min(Math.max(yPct, 0), 100 - hPct);
        node.style.left = `${e.x}%`;
        node.style.top = `${e.y}%`;
      };
      const up = () => {
        node.classList.remove('dragging');
        guideV.style.display = guideH.style.display = 'none';
        node.removeEventListener('pointermove', move);
        node.removeEventListener('pointerup', up);
        save('hud');
      };
      node.addEventListener('pointermove', move);
      node.addEventListener('pointerup', up);
    });
  }

  /* ------------------------------------------------------- live demo values */

  let tick = 0;
  const timer = setInterval(() => {
    tick++;
    for (const e of els()) {
      if (!hudElementEnabled(e)) continue;
      const node = stage.querySelector(`.hud-el[data-id="${e.id}"]`);
      if (!node) continue;
      const dyn = dynamicText(e, tick);
      if (dyn !== null) {
        const target = node.querySelector('.dyn');
        if (target) target.textContent = dyn;
      }
      if (e.id === 'keystrokes') {
        node.querySelectorAll('.keys span').forEach((k) => {
          k.classList.toggle('active', Math.random() < 0.28);
        });
      }
    }
  }, 600);

  paintStage();
  paintList();
  paintSelected();
  root.appendChild(page);
  return () => clearInterval(timer);
}

/* --------------------------------------------------------- element content */

function contentFor(e) {
  switch (e.id) {
    case 'keystrokes':
      return `<div class="keys">
        <span></span><span class="active">W</span><span></span>
        <span>A</span><span>S</span><span>D</span>
        <span style="grid-column:span 1">LMB</span><span style="grid-column:span 2">RMB</span>
        <span class="wide">———</span>
      </div>`;
    case 'armor':
      return `<div class="col" style="gap:3px">
        <div class="armor-row">${icon('shield')}<span>Helmet <b>92%</b></span></div>
        <div class="armor-row">${icon('shirt')}<span>Chest <b>78%</b></span></div>
        <div class="armor-row">${icon('shield')}<span>Legs <b>81%</b></span></div>
        <div class="armor-row">${icon('shield')}<span>Boots <b>64%</b></span></div>
      </div>`;
    case 'potions':
      return `<div class="col" style="gap:2px;font-size:11px">
        <span>⚡ Speed II <b>1:24</b></span>
        <span>💪 Strength <b>0:45</b></span>
      </div>`;
    case 'fpsgraph':
      return `<div class="hud-graph">${Array.from({ length: 24 }, (_, i) =>
        `<i style="height:${40 + Math.round(Math.sin(i / 2.4) * 22 + Math.random() * 14)}%"></i>`).join('')}</div>`;
    case 'xpbar':
      return `<div class="hud-xpbar"><i style="width:64%"></i></div>`;
    case 'bossbar':
      return `<div style="font-size:10px;text-align:center">Ender Dragon<div class="hud-xpbar boss"><i style="width:82%"></i></div></div>`;
    case 'tablist':
      return `<div class="hud-tablist"><b>play.example.net</b>${['BREND4N 12ms', 'Gemsip 23ms', 'You 21ms', 'Nexo_ 48ms'].map((p) => `<span>${p}</span>`).join('')}</div>`;
    case 'scoreboardhud':
      return `<div class="hud-tablist"><b>BEDWARS</b>${['Red ✔', 'Blue ✔', 'Green ✖', 'Kills: 7'].map((p) => `<span>${p}</span>`).join('')}</div>`;
    case 'chathud':
      return `<div class="hud-tablist chat"><span>&lt;Gemsip&gt; gg</span><span>&lt;BREND4N&gt; nice hit</span><span class="dyn">&lt;You&gt; thanks!</span></div>`;
    case 'clickhistory':
      return `<div class="hud-graph clicks">${Array.from({ length: 14 }, () =>
        `<i style="height:${20 + Math.round(Math.random() * 70)}%"></i>`).join('')}</div>`;
    default:
      return `<span class="dyn">${esc(staticText(e))}</span>`;
  }
}

function staticText(e) {
  return dynamicText(e, 0) ?? e.label;
}

function dynamicText(e, tick) {
  if (e.custom) return e.text || e.label; // developer-API elements
  switch (e.id) {
    case 'fps': return `${236 + Math.round(Math.sin(tick / 3) * 14)} FPS`;
    case 'avgfps': return `avg ${228 + (tick % 3)} FPS`;
    case 'tps': return `20.0 TPS`;
    case 'ram': return `RAM ${(2.1 + (tick % 5) / 10).toFixed(1)} / 4.0 GB`;
    case 'cpu': return `CPU ${18 + (tick % 7)}%`;
    case 'cps': return `${6 + (tick % 5)} | ${4 + (tick % 3)} CPS`;
    case 'ping': return `${23 + (tick % 4)} ms`;
    case 'hits': return `${12 + (tick % 9)} hits`;
    case 'coords': return `X: -128  Y: 64  Z: ${512 + tick % 9}`;
    case 'height': return `Y: ${64 + (tick % 3)}`;
    case 'chunk': return `chunk -8 / ${32 + (tick % 2)}`;
    case 'biome': return 'Cherry Grove';
    case 'clock': return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    case 'date': return new Date().toLocaleDateString();
    case 'playtime': return `${1 + Math.floor(tick / 90)}h ${12 + (tick % 48)}m`;
    case 'weather': return tick % 20 < 14 ? '☀ Clear' : '🌧 Rain';
    case 'moon': return '🌕 Full Moon';
    case 'direction': return 'S (180°)';
    case 'speed': return `${(5.6 + Math.sin(tick / 2)).toFixed(1)} m/s`;
    case 'combo': return `${3 + (tick % 4)} COMBO`;
    case 'reach': return `${(2.4 + (tick % 6) / 10).toFixed(2)} blocks`;
    case 'itemdur': return `⛏ ${1561 - (tick % 40)} / 1561`;
    case 'hunger': return `🍗 ${18 - (tick % 3)} / 20`;
    case 'health': return `❤ ${18 + (tick % 3)} / 20`;
    case 'level': return `Lv ${30 + (tick % 2)}`;
    case 'totems': return `🛡 ${3 - (tick % 2)} totems`;
    case 'sneak': return tick % 6 < 3 ? 'SNEAKING' : '—';
    case 'sprint': return tick % 4 < 3 ? 'SPRINTING' : '—';
    case 'serverip': return 'play.example.net';
    default: return null;
  }
}
