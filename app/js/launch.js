/* Launch orchestration + the bottom-right launch dock.
   Connected mode drives a real launch via the backend and renders its SSE
   progress/log events. Demo mode simulates the same pipeline so the UI can
   be experienced without the backend. */

import { api, isConnected, onEvent, emitLocal } from './api.js';
import { el, esc, toast, fmtBytes } from './components.js';
import { icon } from './icons.js';
import { t } from './i18n.js';
import { state, save } from './state.js';

let dock = null;
let demoTimers = [];
let active = null; // { profile, phase }

onEvent(handleEvent);

function clearDemo() {
  for (const t of demoTimers) clearTimeout(t);
  demoTimers = [];
}

export function launchProfile(profile, opts = {}) {
  if (!profile) return;
  if (active && active.phase !== 'done' && active.phase !== 'failed') {
    toast('A launch is already in progress', 'info');
    return;
  }
  active = { profile, phase: 'preparing' };
  profile.lastPlayed = Date.now();
  save('profiles');
  openDock(profile, opts);

  if (isConnected()) {
    api.post('api/launch', { profileId: profile.id, server: opts.server || null })
      .catch((e) => {
        handleEvent({ type: 'launch', phase: 'failed', detail: e.message });
        handleEvent({ type: 'log', line: `[Quill] ${e.message}`, stream: 'err' });
      });
  } else {
    simulate(profile, opts);
  }
}

export function cancelLaunch() {
  clearDemo();
  if (isConnected()) api.post('api/launch/cancel').catch(() => {});
  handleEvent({ type: 'launch', phase: 'failed', detail: 'Cancelled' });
}

export function killGame() {
  if (isConnected()) api.post('api/launch/kill').catch(() => {});
  else handleEvent({ type: 'exit', code: 0 });
}

/* ------------------------------------------------------------------- dock */

function openDock(profile, opts) {
  closeDock(true);
  const host = document.getElementById('launch-dock');
  dock = el(`
    <div class="dock">
      <div class="dock-head">
        <span class="d-spin muted">${icon('refresh')}</span>
        <div class="grow">
          <div style="font-weight:800;font-size:14px" class="d-title">${esc(profile.name)}</div>
          <div class="small faint d-sub">${esc(profile.version)} · ${esc(profile.loader)}${opts.server ? ` · ${esc(opts.server)}` : ''}</div>
        </div>
        <button class="icon-btn small d-logs" title="${esc(t('launch.logs'))}">${icon('terminal')}</button>
        <button class="icon-btn small d-close" title="${esc(t('common.close'))}">${icon('x')}</button>
      </div>
      <div class="dock-body">
        <div class="row" style="margin-bottom:7px">
          <span class="small d-phase" style="font-weight:700">${esc(t('launch.preparing'))}…</span>
          <span class="small faint right d-detail"></span>
        </div>
        <div class="progress"><i class="d-bar"></i></div>
        <div class="console hidden d-console" aria-live="polite"></div>
        <div class="row" style="margin-top:11px">
          <span class="tiny faint d-stats"></span>
          <button class="btn small ghost right d-cancel">${esc(t('launch.cancel'))}</button>
        </div>
      </div>
    </div>`);
  dock.querySelector('.d-spin').classList.add('spin');
  dock.querySelector('.d-close').addEventListener('click', () => closeDock());
  dock.querySelector('.d-logs').addEventListener('click', () => {
    dock.querySelector('.d-console').classList.toggle('hidden');
  });
  dock.querySelector('.d-cancel').addEventListener('click', () => {
    if (active && active.phase === 'running') killGame();
    else cancelLaunch();
  });
  host.appendChild(dock);
}

function closeDock(instant = false) {
  clearDemo();
  if (!dock) return;
  const d = dock;
  dock = null;
  if (instant) { d.remove(); return; }
  d.classList.add('closing');
  setTimeout(() => d.remove(), 260);
}

function log(line, stream = 'out') {
  if (!dock) return;
  const con = dock.querySelector('.d-console');
  const cls = /ERROR|Exception|error:/i.test(line) || stream === 'err' ? 'ln-err'
    : /WARN/i.test(line) ? 'ln-warn'
    : /\[Quill]/.test(line) ? 'ln-ok' : '';
  const div = document.createElement('div');
  if (cls) div.className = cls;
  div.textContent = line;
  con.appendChild(div);
  while (con.childNodes.length > 400) con.firstChild.remove();
  con.scrollTop = con.scrollHeight;
}

function handleEvent(evt) {
  if (!dock) return;
  if (evt.type === 'log') { log(evt.line, evt.stream); return; }

  if (evt.type === 'progress') {
    const bar = dock.querySelector('.d-bar');
    bar.style.width = `${Math.round((evt.done / Math.max(1, evt.total)) * 100)}%`;
    dock.querySelector('.d-detail').textContent = evt.file || '';
    dock.querySelector('.d-stats').textContent =
      `${evt.done}/${evt.total}` + (evt.bytes ? ` · ${fmtBytes(evt.bytes)}` : '');
    return;
  }

  if (evt.type === 'launch') {
    if (active) active.phase = evt.phase;
    const phaseEl = dock.querySelector('.d-phase');
    const spin = dock.querySelector('.d-spin');
    const cancel = dock.querySelector('.d-cancel');
    const bar = dock.querySelector('.d-bar');
    const map = {
      preparing: t('launch.preparing'), downloading: t('launch.downloading'),
      launching: t('launch.launching'), running: t('launch.running'),
      done: t('launch.done'), failed: t('launch.failed'),
    };
    phaseEl.textContent = (map[evt.phase] || evt.phase) + (evt.phase === 'failed' && evt.detail ? ` — ${evt.detail}` : '');
    if (evt.detail && evt.phase !== 'failed') dock.querySelector('.d-detail').textContent = evt.detail;
    if (evt.phase === 'running') {
      bar.style.width = '100%';
      bar.parentElement.classList.add('green');
      cancel.textContent = t('launch.kill');
      spin.classList.remove('spin');
      spin.innerHTML = icon('play');
      spin.style.color = 'var(--green)';
    }
    if (evt.phase === 'failed') {
      spin.classList.remove('spin');
      spin.innerHTML = icon('alert');
      spin.style.color = 'var(--accent-2)';
      cancel.textContent = t('common.close');
      cancel.onclick = () => closeDock();
      dock.querySelector('.d-console').classList.remove('hidden');
    }
    return;
  }

  if (evt.type === 'exit') {
    if (active) active.phase = 'done';
    const spin = dock.querySelector('.d-spin');
    spin.classList.remove('spin');
    spin.innerHTML = icon('check');
    spin.style.color = 'var(--green)';
    dock.querySelector('.d-phase').textContent = `${t('launch.done')} (code ${evt.code ?? 0})`;
    dock.querySelector('.d-cancel').textContent = t('common.close');
    dock.querySelector('.d-cancel').onclick = () => closeDock();
    setTimeout(() => closeDock(), 5000);
  }
}

/* ------------------------------------------------------------------- demo */

function simulate(profile, opts) {
  const at = (ms, fn) => demoTimers.push(setTimeout(fn, ms));
  const files = ['client.jar', 'lwjgl-3.3.3.jar', 'fabric-loader.jar', 'sodium.jar', 'assets/index.json', 'natives/linux'];
  emitLocal({ type: 'log', line: `[Quill] Demo launch — start the backend (node server/index.js) for real launches.` });
  emitLocal({ type: 'log', line: `[Quill] Resolving ${profile.version} (${profile.loader})…` });
  at(500, () => emitLocal({ type: 'launch', phase: 'downloading', detail: 'verifying 6 files' }));
  files.forEach((f, i) => {
    at(650 + i * 320, () => {
      emitLocal({ type: 'progress', done: i + 1, total: files.length, file: f, bytes: 3.2e6 * (i + 1) });
      emitLocal({ type: 'log', line: `[Quill] ✓ ${f} (sha1 ok)` });
    });
  });
  at(650 + files.length * 320 + 200, () => {
    emitLocal({ type: 'launch', phase: 'launching', detail: `java -Xmx${Math.round((profile.ramMb || 3072) / 1024)}G …` });
    emitLocal({ type: 'log', line: `[Quill] Command: java -Xmx${profile.ramMb || 3072}M -cp … net.minecraft.client.main.Main` });
  });
  at(650 + files.length * 320 + 1300, () => {
    emitLocal({ type: 'launch', phase: 'running' });
    emitLocal({ type: 'log', line: `[Render thread/INFO]: Setting user: ${state.settings.accountName || 'Player'}` });
    if (opts.server) emitLocal({ type: 'log', line: `[Render thread/INFO]: Connecting to ${opts.server}` });
    emitLocal({ type: 'log', line: `[Render thread/INFO]: Backend library: LWJGL 3.3.3` });
    emitLocal({ type: 'log', line: `[Quill] Demo session — no real game was started.` });
  });
}
