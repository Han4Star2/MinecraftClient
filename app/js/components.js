/* Small UI toolkit: element helper, modals, toasts, context menus,
   switches/sliders and a schema-driven control renderer shared by the
   mod settings, HUD editor and settings pages. */

import { icon } from './icons.js';

/** Create an element from an HTML string. */
export function el(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild;
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* ------------------------------------------------------------------ toasts */

export function toast(msg, kind = 'ok', ms = 3200) {
  const stack = document.getElementById('toasts');
  const iconName = kind === 'ok' ? 'check' : kind === 'err' ? 'alert' : 'info';
  const t = el(`<div class="toast ${kind}">${icon(iconName)}<span>${esc(msg)}</span></div>`);
  stack.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 300);
  }, ms);
}

/* ------------------------------------------------------------------ modals */

export function modal({ title, body, footer, size = '', onClose }) {
  const overlays = document.getElementById('overlays');
  const wrap = el(`
    <div class="overlay">
      <div class="modal ${size}" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div class="m-title">${esc(title)}</div>
          <button class="icon-btn small m-close" aria-label="Close">${icon('x')}</button>
        </div>
        <div class="modal-body"></div>
      </div>
    </div>`);
  const box = wrap.querySelector('.modal');
  const bodyEl = wrap.querySelector('.modal-body');
  if (typeof body === 'string') bodyEl.innerHTML = body;
  else if (body) bodyEl.appendChild(body);
  if (footer) {
    const foot = el('<div class="modal-foot"></div>');
    for (const b of footer) foot.appendChild(b);
    box.appendChild(foot);
  }
  const close = () => {
    wrap.remove();
    document.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) close(); });
  wrap.querySelector('.m-close').addEventListener('click', close);
  overlays.appendChild(wrap);
  return { close, body: bodyEl, root: wrap };
}

export function confirmModal(title, message, confirmLabel = 'Confirm') {
  return new Promise((resolve) => {
    const ok = el(`<button class="btn primary">${esc(confirmLabel)}</button>`);
    const no = el('<button class="btn ghost">Cancel</button>');
    const m = modal({
      title,
      body: `<p class="muted">${esc(message)}</p>`,
      footer: [no, ok],
      size: 'sm',
      onClose: () => resolve(false),
    });
    ok.addEventListener('click', () => { resolve(true); m.close(); });
    no.addEventListener('click', () => m.close());
  });
}

/* ------------------------------------------------------------ context menu */

export function contextMenu(x, y, items) {
  document.querySelector('.ctx-menu')?.remove();
  const menu = el('<div class="ctx-menu" role="menu"></div>');
  for (const it of items) {
    if (it === '-') { menu.appendChild(el('<div class="ctx-sep"></div>')); continue; }
    const btn = el(`<button class="ctx-item ${it.danger ? 'danger' : ''}">${icon(it.icon || '')}<span>${esc(it.label)}</span></button>`);
    btn.addEventListener('click', () => { close(); it.action?.(); });
    menu.appendChild(btn);
  }
  const close = () => { menu.remove(); document.removeEventListener('mousedown', outside); };
  const outside = (e) => { if (!menu.contains(e.target)) close(); };
  document.addEventListener('mousedown', outside);
  document.body.appendChild(menu);
  const r = menu.getBoundingClientRect();
  menu.style.left = `${Math.min(x, innerWidth - r.width - 8)}px`;
  menu.style.top = `${Math.min(y, innerHeight - r.height - 8)}px`;
  return close;
}

/* --------------------------------------------------------------- controls */

/** iOS-style switch button. */
export function makeSwitch(on, onChange, red = false) {
  const sw = el(`<button class="switch ${red ? 'red' : ''} ${on ? 'on' : ''}" role="switch" aria-checked="${on}"></button>`);
  sw.addEventListener('click', () => {
    const now = !sw.classList.contains('on');
    sw.classList.toggle('on', now);
    sw.setAttribute('aria-checked', String(now));
    onChange(now);
  });
  return sw;
}

/** Styled range slider with live fill + value output. */
export function makeSlider({ min, max, value, step = 1, unit = '', format }, onChange) {
  const wrap = el(`<div class="slider-wrap">
    <input type="range" class="slider" min="${min}" max="${max}" step="${step}" value="${value}">
    <output></output>
  </div>`);
  const input = wrap.querySelector('input');
  const out = wrap.querySelector('output');
  const paint = () => {
    const pct = ((input.value - min) / (max - min)) * 100;
    input.style.setProperty('--fill', `${pct}%`);
    out.textContent = format ? format(Number(input.value)) : `${input.value}${unit}`;
  };
  input.addEventListener('input', () => { paint(); onChange(Number(input.value)); });
  paint();
  return wrap;
}

/** Render one schema control (used by mod config + settings). */
export function control(def, value, onChange) {
  switch (def.t) {
    case 'toggle':
      return makeSwitch(!!value, onChange);
    case 'slider':
      return makeSlider({ min: def.min, max: def.max, value: value ?? def.def, unit: def.unit || '' }, onChange);
    case 'select': {
      const sel = el(`<select class="input" style="width:170px">${def.opts.map((o) => `<option ${o === value ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`);
      sel.addEventListener('change', () => onChange(sel.value));
      return sel;
    }
    case 'color': {
      const inp = el(`<input type="color" class="color-input" value="${esc(value || '#ffffff')}">`);
      inp.addEventListener('input', () => onChange(inp.value));
      return inp;
    }
    case 'text': {
      const inp = el(`<input class="input" style="width:170px" value="${esc(value ?? '')}">`);
      inp.addEventListener('change', () => onChange(inp.value));
      return inp;
    }
    case 'keybind': {
      const btn = el(`<button class="keybind-btn">${esc(value || 'None')}</button>`);
      btn.addEventListener('click', () => {
        btn.classList.add('listening');
        btn.textContent = 'Press a key…';
        const onKey = (e) => {
          e.preventDefault();
          const name = e.key === 'Escape' ? 'None' : (e.key.length === 1 ? e.key.toUpperCase() : e.key);
          btn.textContent = name;
          btn.classList.remove('listening');
          document.removeEventListener('keydown', onKey, true);
          onChange(name);
        };
        document.addEventListener('keydown', onKey, true);
      });
      return btn;
    }
    default:
      return el('<span class="faint">—</span>');
  }
}

/** A settings-style row: label + description on the left, control right. */
export function settingRow(name, desc, ctrl) {
  const row = el(`<div class="setting-row">
    <div class="s-label"><div class="name">${esc(name)}</div>${desc ? `<div class="desc">${esc(desc)}</div>` : ''}</div>
    <div class="s-ctrl"></div>
  </div>`);
  row.querySelector('.s-ctrl').appendChild(ctrl);
  return row;
}

/* ------------------------------------------------------------ misc helpers */

export function timeAgo(ts) {
  if (!ts) return null;
  const s = (Date.now() - ts) / 1000;
  if (s < 90) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400 * 2) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86400)} d ago`;
}

export function fmtBytes(n) {
  if (!Number.isFinite(n)) return '—';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 100 || i === 0 ? 0 : 1)} ${u[i]}`;
}

export function fmtDuration(ms) {
  const h = Math.floor(ms / 36e5);
  const m = Math.round((ms % 36e5) / 6e4);
  return h ? `${h} h ${m} min` : `${m} min`;
}
