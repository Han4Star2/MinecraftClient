/* Server-sent-events bus: launch progress, downloads and game logs stream
   to every connected UI. */

const clients = new Set();
const backlog = []; // last N events so a UI that connects mid-launch catches up
const BACKLOG_MAX = 120;
const logbuf = []; // rolling session log — served by /api/logs, dumped on crash
const LOGBUF_MAX = 600;

export function addClient(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(':ok\n\n');
  for (const evt of backlog) res.write(`data: ${JSON.stringify(evt)}\n\n`);
  clients.add(res);
  const heartbeat = setInterval(() => {
    try { res.write(':hb\n\n'); } catch { /* handled by close */ }
  }, 20_000);
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
}

export function emit(evt) {
  backlog.push(evt);
  if (backlog.length > BACKLOG_MAX) backlog.shift();
  const line = `data: ${JSON.stringify(evt)}\n\n`;
  for (const res of clients) {
    try { res.write(line); } catch { clients.delete(res); }
  }
}

export function log(line, stream = 'out') {
  logbuf.push({ t: Date.now(), line, stream });
  if (logbuf.length > LOGBUF_MAX) logbuf.shift();
  emit({ type: 'log', line, stream });
}

export function recentLogs(n = 400) {
  return logbuf.slice(-n);
}

export function clearBacklog() {
  backlog.length = 0;
}
