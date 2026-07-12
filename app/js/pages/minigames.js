/* Minigames — Tetris, Pong, Tic-Tac-Toe and Snake, right in the client.
   Scores pay out coins (capped per day) and feed the arcade quests. */

import { icon } from '../icons.js';
import { el, esc, toast } from '../components.js';
import { minigamePayout, economy, questProgress } from '../economy.js';
import { MINIGAME_DAILY_CAP } from '../shopCatalog.js';

const GAMES = [
  { id: 'tetris', name: 'Tetris', desc: 'Stack, clear, repeat', hint: '←→ move · ↑ rotate · ↓ drop · space slam' },
  { id: 'pong', name: 'Pong', desc: 'First to 5 beats the AI', hint: 'W/S or ↑↓ · first to 5' },
  { id: 'ttt', name: 'Tic Tac Toe', desc: 'Outsmart the client', hint: 'click a cell' },
  { id: 'snake', name: 'Snake', desc: 'Length 30 = quest done', hint: '←↑→↓ steer' },
  { id: 'aim', name: 'Aim Trainer', desc: '30 s — hit the targets', hint: 'click targets · smaller = more points' },
  { id: 'cps', name: 'CPS Test', desc: '10 s click speed test', hint: 'left-click as fast as you can' },
];

let cleanup = null;

export function render(root) {
  const page = el(`
    <div class="page">
      <div class="page-head">
        <div>
          <div class="page-title">Minigames</div>
          <div class="page-sub">Built into the client — waiting for a queue was never this productive. Coins are capped at ${MINIGAME_DAILY_CAP}/day.</div>
        </div>
        <span class="coin-chip">${icon('star')}<b class="c-count">${economy().coins.toLocaleString()}</b></span>
      </div>
      <div class="mg-home"></div>
    </div>`);
  const host = page.querySelector('.mg-home');
  menu(host, page);
  root.appendChild(page);
  return () => { cleanup?.(); cleanup = null; };
}

function refreshCoins(page) {
  page.querySelector('.c-count').textContent = economy().coins.toLocaleString();
}

function menu(host, page) {
  cleanup?.();
  cleanup = null;
  host.innerHTML = '';
  const grid = el('<div class="mg-grid"></div>');
  for (const g of GAMES) {
    const best = economy().minigame.best[g.id] || 0;
    const card = el(`
      <div class="card hover mg-card">
        <div class="mg-art"><canvas width="140" height="100" style="width:140px;height:100px"></canvas></div>
        <div class="mg-name">${esc(g.name)}</div>
        <div class="mg-best">${best ? `Best: ${best.toLocaleString()}` : esc(g.desc)}</div>
      </div>`);
    drawCover(card.querySelector('canvas'), g.id);
    card.addEventListener('click', () => play(host, page, g));
    grid.appendChild(card);
  }
  host.appendChild(grid);
}

function drawCover(cv, id) {
  const x = cv.getContext('2d');
  x.fillStyle = '#0b0c0f';
  x.fillRect(0, 0, 140, 100);
  if (id === 'tetris') {
    const cols = ['#e8394a', '#f3c14b', '#35d374', '#4b7bec', '#9b59d0', '#57d8c4'];
    for (let i = 0; i < 14; i++) {
      x.fillStyle = cols[i % cols.length];
      x.fillRect(10 + (i % 7) * 17, 78 - Math.floor(i / 7) * 17 - (i % 3) * 17, 15, 15);
    }
  } else if (id === 'pong') {
    x.fillStyle = '#e9ebef';
    x.fillRect(10, 30, 5, 30); x.fillRect(125, 45, 5, 30); x.fillRect(66, 48, 6, 6);
    x.strokeStyle = 'rgba(255,255,255,0.2)'; x.setLineDash([4, 6]);
    x.beginPath(); x.moveTo(70, 5); x.lineTo(70, 95); x.stroke();
  } else if (id === 'ttt') {
    x.strokeStyle = '#4a5160'; x.lineWidth = 3;
    x.strokeRect(35, 15, 70, 70);
    x.beginPath(); x.moveTo(58, 15); x.lineTo(58, 85); x.moveTo(81, 15); x.lineTo(81, 85);
    x.moveTo(35, 38); x.lineTo(105, 38); x.moveTo(35, 61); x.lineTo(105, 61); x.stroke();
    x.strokeStyle = '#e8394a'; x.beginPath(); x.moveTo(40, 20) ; x.lineTo(53, 33); x.moveTo(53, 20); x.lineTo(40, 33); x.stroke();
    x.strokeStyle = '#35d374'; x.beginPath(); x.arc(70, 49, 8, 0, 7); x.stroke();
  } else if (id === 'aim') {
    for (const [cx, cy, r, c] of [[45, 40, 18, '#e8394a'], [95, 65, 12, '#f3c14b'], [110, 25, 8, '#35d374']]) {
      x.strokeStyle = c; x.lineWidth = 3;
      x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke();
      x.beginPath(); x.arc(cx, cy, r * 0.4, 0, 7); x.stroke();
    }
  } else if (id === 'cps') {
    x.fillStyle = '#e9ebef'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center';
    x.fillText('CPS', 70, 48);
    x.fillStyle = '#e8394a'; x.font = 'bold 16px sans-serif';
    x.fillText('click!', 70, 74);
  } else {
    x.fillStyle = '#35d374';
    for (let i = 0; i < 7; i++) x.fillRect(20 + i * 12, 50 - (i > 3 ? (i - 3) * 12 : 0), 10, 10);
    x.fillStyle = '#e8394a'; x.fillRect(110, 14, 10, 10);
  }
}

/* ------------------------------------------------------------- framework */

function play(host, page, game) {
  cleanup?.();
  host.innerHTML = '';
  const wrap = el(`
    <div class="mg-stage-wrap">
      <div class="row" style="width:100%;max-width:560px">
        <button class="btn small ghost b-back">${icon('chevR')}<span style="transform:scaleX(-1)"></span><span>Back</span></button>
        <b class="grow center">${esc(game.name)}</b>
        <span class="tiny faint">${esc(game.hint)}</span>
      </div>
      <canvas class="mg-stage" tabindex="0"></canvas>
      <div class="mg-hud"></div>
    </div>`);
  host.appendChild(wrap);
  wrap.querySelector('.b-back').addEventListener('click', () => menu(host, page));
  const cv = wrap.querySelector('canvas');
  const hud = wrap.querySelector('.mg-hud');
  const finish = (score, extra = '') => {
    const r = minigamePayout(game.id, score);
    refreshCoins(page);
    toast(r.amount > 0 ? `+${r.amount} coins (${game.name})` : `Score saved — ${r.reason}`, r.amount ? 'ok' : 'info');
    hud.innerHTML = `<span>GAME OVER — score ${score.toLocaleString()} ${esc(extra)}</span><span>press R to retry</span>`;
  };
  const engines = { tetris, pong, ttt, snake, aim, cps };
  cleanup = engines[game.id](cv, hud, finish);
  cv.focus();
}

function keyloop(handlers) {
  const down = (e) => {
    if (handlers[e.key]) { e.preventDefault(); handlers[e.key](true); }
  };
  const up = (e) => { if (handlers[`up:${e.key}`]) handlers[`up:${e.key}`](); };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
}

/* ---------------------------------------------------------------- tetris */

function tetris(cv, hud, finish) {
  const COLS = 10, ROWS = 20, CELL = 24;
  cv.width = COLS * CELL; cv.height = ROWS * CELL;
  cv.style.width = `${COLS * CELL}px`;
  const x = cv.getContext('2d');
  const SHAPES = {
    I: [[1, 1, 1, 1]], O: [[1, 1], [1, 1]], T: [[1, 1, 1], [0, 1, 0]],
    S: [[0, 1, 1], [1, 1, 0]], Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]], L: [[0, 0, 1], [1, 1, 1]],
  };
  const COLORS = { I: '#57d8c4', O: '#f3c14b', T: '#9b59d0', S: '#35d374', Z: '#e8394a', J: '#4b7bec', L: '#e8963a' };
  let grid, piece, score, lines, over, dropMs, timer, raf;

  const newPiece = () => {
    const keys = Object.keys(SHAPES);
    const k = keys[Math.random() * keys.length | 0];
    return { k, m: SHAPES[k].map((r) => [...r]), x: 3, y: -1 };
  };
  const collides = (m, px, py) => m.some((row, dy) => row.some((v, dx) => {
    if (!v) return false;
    const nx = px + dx, ny = py + dy;
    return nx < 0 || nx >= COLS || ny >= ROWS || (ny >= 0 && grid[ny][nx]);
  }));
  const rotate = (m) => m[0].map((_, i) => m.map((r) => r[i]).reverse());
  const merge = () => {
    piece.m.forEach((row, dy) => row.forEach((v, dx) => {
      if (v && piece.y + dy >= 0) grid[piece.y + dy][piece.x + dx] = piece.k;
    }));
    let cleared = 0;
    grid = grid.filter((row) => { const full = row.every(Boolean); if (full) cleared++; return !full; });
    while (grid.length < ROWS) grid.unshift(Array(COLS).fill(null));
    if (cleared) {
      lines += cleared;
      score += [0, 100, 300, 500, 800][cleared] * (1 + Math.floor(lines / 10) * 0.5);
      dropMs = Math.max(120, 600 - Math.floor(lines / 10) * 60);
      if (score >= 1000) questProgress('q-tetris-1k');
    }
    piece = newPiece();
    if (collides(piece.m, piece.x, piece.y + 1)) end();
  };
  const step = () => { if (!move(0, 1)) merge(); };
  const move = (dx, dy) => {
    if (over) return false;
    if (!collides(piece.m, piece.x + dx, piece.y + dy)) { piece.x += dx; piece.y += dy; return true; }
    return false;
  };
  const end = () => { over = true; clearInterval(timer); finish(Math.round(score), `· ${lines} lines`); };
  const reset = () => {
    grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    piece = newPiece(); score = 0; lines = 0; over = false; dropMs = 600;
    clearInterval(timer);
    timer = setInterval(() => { step(); retime(); }, dropMs);
  };
  const retime = () => {
    clearInterval(timer);
    if (!over) timer = setInterval(() => { step(); retime(); }, dropMs);
  };

  const unkey = keyloop({
    ArrowLeft: () => move(-1, 0),
    ArrowRight: () => move(1, 0),
    ArrowDown: () => step(),
    ArrowUp: () => { const r = rotate(piece.m); if (!collides(r, piece.x, piece.y)) piece.m = r; },
    ' ': () => { while (move(0, 1)); merge(); },
    r: () => reset(), R: () => reset(),
  });

  const draw = () => {
    x.fillStyle = '#0b0c0f'; x.fillRect(0, 0, cv.width, cv.height);
    x.strokeStyle = 'rgba(255,255,255,0.04)';
    for (let i = 1; i < COLS; i++) { x.beginPath(); x.moveTo(i * CELL, 0); x.lineTo(i * CELL, cv.height); x.stroke(); }
    const cell = (cx, cy, k) => {
      x.fillStyle = COLORS[k];
      x.fillRect(cx * CELL + 1, cy * CELL + 1, CELL - 2, CELL - 2);
      x.fillStyle = 'rgba(255,255,255,0.22)';
      x.fillRect(cx * CELL + 1, cy * CELL + 1, CELL - 2, 4);
    };
    grid.forEach((row, cy) => row.forEach((k, cx) => k && cell(cx, cy, k)));
    if (!over) piece.m.forEach((row, dy) => row.forEach((v, dx) => v && piece.y + dy >= 0 && cell(piece.x + dx, piece.y + dy, piece.k)));
    hud.innerHTML = over ? hud.innerHTML : `<span>Score ${Math.round(score).toLocaleString()}</span><span>Lines ${lines}</span>`;
    raf = requestAnimationFrame(draw);
  };
  reset();
  draw();
  return () => { unkey(); clearInterval(timer); cancelAnimationFrame(raf); };
}

/* ------------------------------------------------------------------ pong */

function pong(cv, hud, finish) {
  const W = 560, H = 360;
  cv.width = W; cv.height = H; cv.style.width = `${W}px`;
  const x = cv.getContext('2d');
  const P = { y: H / 2 - 35, up: false, down: false };
  const A = { y: H / 2 - 35 };
  let ball, me = 0, ai = 0, over = false, raf;
  const serve = (dir) => { ball = { x: W / 2, y: H / 2, vx: 4.4 * dir, vy: (Math.random() - 0.5) * 5 }; };
  const reset = () => { me = 0; ai = 0; over = false; P.y = A.y = H / 2 - 35; serve(1); };
  serve(1);

  const unkey = keyloop({
    ArrowUp: () => { P.up = true; }, 'up:ArrowUp': () => { P.up = false; },
    ArrowDown: () => { P.down = true; }, 'up:ArrowDown': () => { P.down = false; },
    w: () => { P.up = true; }, 'up:w': () => { P.up = false; },
    s: () => { P.down = true; }, 'up:s': () => { P.down = false; },
    r: () => reset(), R: () => reset(),
  });
  cv.addEventListener('pointermove', (e) => {
    const r = cv.getBoundingClientRect();
    P.y = ((e.clientY - r.top) / r.height) * H - 35;
  });

  const tick = () => {
    if (!over) {
      if (P.up) P.y -= 6;
      if (P.down) P.y += 6;
      P.y = Math.max(0, Math.min(H - 70, P.y));
      A.y += Math.max(-4.2, Math.min(4.2, ball.y - (A.y + 35)));
      A.y = Math.max(0, Math.min(H - 70, A.y));
      ball.x += ball.vx; ball.y += ball.vy;
      if (ball.y < 5 || ball.y > H - 5) ball.vy *= -1;
      if (ball.x < 22 && ball.x > 12 && ball.y > P.y - 6 && ball.y < P.y + 76 && ball.vx < 0) {
        ball.vx = -ball.vx * 1.045;
        ball.vy += ((ball.y - (P.y + 35)) / 35) * 3;
      }
      if (ball.x > W - 22 && ball.x < W - 12 && ball.y > A.y - 6 && ball.y < A.y + 76 && ball.vx > 0) {
        ball.vx = -ball.vx * 1.045;
        ball.vy += ((ball.y - (A.y + 35)) / 35) * 3;
      }
      if (ball.x < -10) { ai++; serve(1); }
      if (ball.x > W + 10) { me++; serve(-1); }
      if ((me >= 5 || ai >= 5) && !over) {
        over = true;
        if (me > ai) questProgress('q-pong-win');
        finish(Math.max(0, me * 120 - ai * 40), me > ai ? '· you win! 🏆' : '· AI wins');
      }
    }
    x.fillStyle = '#0b0c0f'; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(255,255,255,0.15)'; x.setLineDash([6, 10]);
    x.beginPath(); x.moveTo(W / 2, 0); x.lineTo(W / 2, H); x.stroke(); x.setLineDash([]);
    x.fillStyle = '#e9ebef';
    x.fillRect(14, P.y, 7, 70);
    x.fillRect(W - 21, A.y, 7, 70);
    x.fillRect(ball.x - 5, ball.y - 5, 10, 10);
    if (!over) hud.innerHTML = `<span>You ${me}</span><span>AI ${ai}</span>`;
    raf = requestAnimationFrame(tick);
  };
  tick();
  return () => { unkey(); cancelAnimationFrame(raf); };
}

/* ------------------------------------------------------------------- ttt */

function ttt(cv, hud, finish) {
  const S = 360;
  cv.width = S; cv.height = S; cv.style.width = `${S}px`;
  const x = cv.getContext('2d');
  let board, turn, over;
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  const winner = (b) => {
    for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    return b.every(Boolean) ? 'draw' : null;
  };
  const reset = () => { board = Array(9).fill(null); turn = 'X'; over = false; draw(); hud.innerHTML = '<span>Your turn (X)</span>'; };

  const aiMove = () => {
    const tryWin = (sym) => {
      for (const [a, c, d] of LINES) {
        const line = [board[a], board[c], board[d]];
        if (line.filter((v) => v === sym).length === 2 && line.includes(null)) {
          return [a, c, d][line.indexOf(null)];
        }
      }
      return -1;
    };
    let mv = tryWin('O');
    if (mv < 0) mv = tryWin('X');
    if (mv < 0 && !board[4]) mv = 4;
    if (mv < 0) {
      const spots = [0, 2, 6, 8, 1, 3, 5, 7].filter((i) => !board[i]);
      mv = spots[Math.random() * spots.length | 0];
    }
    if (mv >= 0) board[mv] = 'O';
  };

  const endCheck = () => {
    const w = winner(board);
    if (!w) return false;
    over = true;
    if (w === 'X') finish(150, '· you win! 🏆');
    else if (w === 'draw') finish(50, '· draw');
    else finish(0, '· AI wins');
    return true;
  };

  cv.addEventListener('click', (e) => {
    if (over) return;
    const r = cv.getBoundingClientRect();
    const cx = Math.floor(((e.clientX - r.left) / r.width) * 3);
    const cy = Math.floor(((e.clientY - r.top) / r.height) * 3);
    const i = cy * 3 + cx;
    if (board[i]) return;
    board[i] = 'X';
    if (!endCheck()) { aiMove(); endCheck(); }
    draw();
  });

  const unkey = keyloop({ r: () => reset(), R: () => reset() });

  function draw() {
    x.fillStyle = '#0b0c0f'; x.fillRect(0, 0, S, S);
    x.strokeStyle = '#3a4152'; x.lineWidth = 4;
    for (const i of [1, 2]) {
      x.beginPath(); x.moveTo((S / 3) * i, 16); x.lineTo((S / 3) * i, S - 16); x.stroke();
      x.beginPath(); x.moveTo(16, (S / 3) * i); x.lineTo(S - 16, (S / 3) * i); x.stroke();
    }
    board?.forEach((v, i) => {
      if (!v) return;
      const cx = (i % 3) * (S / 3) + S / 6;
      const cy = Math.floor(i / 3) * (S / 3) + S / 6;
      x.lineWidth = 7;
      if (v === 'X') {
        x.strokeStyle = '#e8394a';
        x.beginPath(); x.moveTo(cx - 30, cy - 30); x.lineTo(cx + 30, cy + 30);
        x.moveTo(cx + 30, cy - 30); x.lineTo(cx - 30, cy + 30); x.stroke();
      } else {
        x.strokeStyle = '#35d374';
        x.beginPath(); x.arc(cx, cy, 32, 0, 7); x.stroke();
      }
    });
  }
  reset();
  return () => unkey();
}

/* ----------------------------------------------------------------- snake */

function snake(cv, hud, finish) {
  const N = 20, CELL = 20;
  cv.width = N * CELL; cv.height = N * CELL; cv.style.width = `${N * CELL}px`;
  const x = cv.getContext('2d');
  let body, dir, next, food, timer, over, grew;
  const place = () => {
    do { food = [Math.random() * N | 0, Math.random() * N | 0]; }
    while (body.some(([bx, by]) => bx === food[0] && by === food[1]));
  };
  const reset = () => {
    body = [[10, 10], [9, 10], [8, 10]];
    dir = [1, 0]; next = dir; over = false; grew = 0;
    place();
    clearInterval(timer);
    timer = setInterval(tick, 110);
  };
  const unkey = keyloop({
    ArrowUp: () => { if (dir[1] !== 1) next = [0, -1]; },
    ArrowDown: () => { if (dir[1] !== -1) next = [0, 1]; },
    ArrowLeft: () => { if (dir[0] !== 1) next = [-1, 0]; },
    ArrowRight: () => { if (dir[0] !== -1) next = [1, 0]; },
    r: () => reset(), R: () => reset(),
  });

  function tick() {
    dir = next;
    const head = [body[0][0] + dir[0], body[0][1] + dir[1]];
    if (head[0] < 0 || head[1] < 0 || head[0] >= N || head[1] >= N
      || body.some(([bx, by]) => bx === head[0] && by === head[1])) {
      over = true;
      clearInterval(timer);
      finish((body.length - 3) * 10, `· length ${body.length}`);
      draw();
      return;
    }
    body.unshift(head);
    if (head[0] === food[0] && head[1] === food[1]) { grew += 2; place(); }
    if (grew > 0) grew--;
    else body.pop();
    draw();
    if (!over) hud.innerHTML = `<span>Length ${body.length}</span><span>Score ${(body.length - 3) * 10}</span>`;
  }
  function draw() {
    x.fillStyle = '#0b0c0f'; x.fillRect(0, 0, cv.width, cv.height);
    x.fillStyle = '#e8394a';
    x.fillRect(food[0] * CELL + 3, food[1] * CELL + 3, CELL - 6, CELL - 6);
    body.forEach(([bx, by], i) => {
      x.fillStyle = i === 0 ? '#5ad391' : '#35d374';
      x.fillRect(bx * CELL + 1, by * CELL + 1, CELL - 2, CELL - 2);
    });
  }
  reset();
  draw();
  return () => { unkey(); clearInterval(timer); };
}

/* ------------------------------------------------------------ aim trainer */
/* 30-second round: targets spawn, shrink and expire; smaller hits score
   more. Tracks accuracy — real PvP warmup, not a toy. */

function aim(cv, hud, finish) {
  const W = 560, H = 380;
  cv.width = W; cv.height = H;
  cv.style.width = `${W}px`;
  cv.style.cursor = 'crosshair';
  const x = cv.getContext('2d');
  let targets, hits, misses, score, timeLeft, over, raf, tick;

  const spawn = () => targets.push({
    x: 30 + Math.random() * (W - 60),
    y: 30 + Math.random() * (H - 60),
    r: 26, life: 2200, born: performance.now(),
  });

  const reset = () => {
    targets = []; hits = 0; misses = 0; score = 0; timeLeft = 30; over = false;
    spawn(); spawn();
    clearInterval(tick);
    tick = setInterval(() => {
      if (over) return;
      timeLeft--;
      if (timeLeft <= 0) end();
      else if (targets.length < 4) spawn();
    }, 1000);
  };

  const end = () => {
    over = true;
    clearInterval(tick);
    const acc = hits + misses ? Math.round((hits / (hits + misses)) * 100) : 0;
    finish(score + acc * 2, `· ${hits} hits · ${acc}% accuracy`);
  };

  cv.addEventListener('mousedown', onClick);
  function onClick(e) {
    if (over) return;
    const rect = cv.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top) * (H / rect.height);
    const i = targets.findIndex((tg) => Math.hypot(tg.x - mx, tg.y - my) <= tg.r);
    if (i >= 0) {
      const tg = targets[i];
      score += Math.round(10 + (26 - tg.r) * 2); // shrunken target = harder = more
      hits++;
      targets.splice(i, 1);
      spawn();
    } else {
      misses++;
    }
  }

  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    for (const tg of targets) tg.r = 26 * Math.max(0.25, 1 - (now - tg.born) / tg.life);
    for (let i = targets.length - 1; i >= 0; i--) {
      if (now - targets[i].born > targets[i].life) { targets.splice(i, 1); misses++; spawn(); }
    }
    x.fillStyle = '#0b0c0f';
    x.fillRect(0, 0, W, H);
    for (const tg of targets) {
      for (const [rr, c] of [[1, '#e8394a'], [0.66, '#eef3ff'], [0.33, '#e8394a']]) {
        x.beginPath(); x.arc(tg.x, tg.y, tg.r * rr, 0, 7); x.fillStyle = c; x.fill();
      }
    }
    if (!over) {
      const acc = hits + misses ? Math.round((hits / (hits + misses)) * 100) : 100;
      hud.innerHTML = `<span>⏱ ${timeLeft}s</span><span>Score ${score}</span><span>${hits} hits · ${acc}%</span>`;
    }
  };
  raf = requestAnimationFrame(loop);

  const unkey = keyloop({ r: reset, R: reset });
  reset();
  return () => { unkey(); clearInterval(tick); cancelAnimationFrame(raf); cv.removeEventListener('mousedown', onClick); };
}

/* --------------------------------------------------------------- cps test */
/* Classic 10-second click-speed test with a live clicks-per-second curve. */

function cps(cv, hud, finish) {
  const W = 560, H = 300;
  cv.width = W; cv.height = H;
  cv.style.width = `${W}px`;
  const x = cv.getContext('2d');
  let clicks, startAt, over, raf;

  const reset = () => { clicks = []; startAt = 0; over = false; };

  cv.addEventListener('mousedown', onClick);
  function onClick() {
    if (over) return;
    if (!startAt) startAt = performance.now();
    clicks.push(performance.now());
  }

  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    const elapsed = startAt ? (now - startAt) / 1000 : 0;
    if (startAt && elapsed >= 10 && !over) {
      over = true;
      const rate = clicks.length / 10;
      finish(Math.round(rate * 25), `· ${rate.toFixed(1)} CPS (${clicks.length} clicks)`);
    }
    x.fillStyle = '#0b0c0f';
    x.fillRect(0, 0, W, H);
    x.textAlign = 'center';
    x.fillStyle = '#eef3ff';
    x.font = 'bold 52px sans-serif';
    const live = clicks.filter((t) => now - t < 1000).length;
    x.fillText(over ? `${(clicks.length / 10).toFixed(1)} CPS` : startAt ? `${live} CPS` : 'CLICK TO START', W / 2, 120);
    x.font = '15px sans-serif';
    x.fillStyle = '#8b93a8';
    x.fillText(over ? 'press R to retry' : startAt ? `${Math.max(0, 10 - elapsed).toFixed(1)}s left · ${clicks.length} clicks` : '10-second test — jitter & butterfly welcome', W / 2, 160);
    if (startAt && !over) {
      x.fillStyle = '#e8394a';
      x.fillRect(40, 220, (W - 80) * Math.min(1, elapsed / 10), 8);
      x.strokeStyle = 'rgba(255,255,255,0.15)';
      x.strokeRect(40, 220, W - 80, 8);
    }
    if (!over) hud.innerHTML = `<span>Best: ${(economy().minigame.best.cps || 0)} pts</span><span>score = avg CPS × 25</span>`;
  };
  raf = requestAnimationFrame(loop);

  const unkey = keyloop({ r: reset, R: reset });
  reset();
  return () => { unkey(); cancelAnimationFrame(raf); cv.removeEventListener('mousedown', onClick); };
}
