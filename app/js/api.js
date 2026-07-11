/* Backend transport. The UI runs in two modes:
   - connected: served by the Horus backend (node server/index.js) → real
     profiles, real launches, real mod folders, live SSE events.
   - demo: opened statically (or backend down) → everything still works with
     local persistence, so the interface can be explored anywhere. */

let connected = false;
let status = null;
let es = null;
const eventHandlers = new Set();

export function isConnected() {
  return connected;
}

export function serverStatus() {
  return status;
}

/** Try to reach the backend once at boot (with a short timeout). */
export async function detect() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch('api/status', { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(String(res.status));
    status = await res.json();
    connected = true;
    openStream(); // handlers registered before detect() (module init) get their stream now
  } catch {
    connected = false;
    status = null;
  }
  return connected;
}

function openStream() {
  if (!connected || !eventHandlers.size || es) return;
  es = new EventSource('api/events');
  es.onmessage = (m) => {
    let evt;
    try { evt = JSON.parse(m.data); } catch { return; }
    for (const h of eventHandlers) h(evt);
  };
  es.onerror = () => { /* EventSource retries automatically */ };
}

async function req(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${method} ${path} → ${res.status}`);
  return data;
}

export const api = {
  get: (p) => req('GET', p),
  post: (p, b = {}) => req('POST', p, b),
  put: (p, b = {}) => req('PUT', p, b),
  del: (p) => req('DELETE', p),
};

/** Subscribe to server-sent events (launch progress, logs, downloads). */
export function onEvent(fn) {
  eventHandlers.add(fn);
  openStream();
  return () => eventHandlers.delete(fn);
}

/** Demo helper: locally emit a fake event to the same handlers. */
export function emitLocal(evt) {
  for (const h of eventHandlers) h(evt);
}
