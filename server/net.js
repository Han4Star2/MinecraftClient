/* Tiny HTTP(S) client on node:https — no undici surprises, explicit proxy
   support (HTTP CONNECT tunneling), redirects, timeouts. Used for Mojang
   meta, game files, Modrinth and MSA. */

import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import { URL } from 'node:url';

const DEFAULT_TIMEOUT = 30_000;

function proxyFromEnv(targetUrl) {
  const u = new URL(targetUrl);
  // Loopback never goes through a proxy.
  if (u.hostname === 'localhost' || u.hostname === '::1' || u.hostname.startsWith('127.')) return null;
  const noProxy = process.env.NO_PROXY || process.env.no_proxy || '';
  for (const entry of noProxy.split(',').map((s) => s.trim()).filter(Boolean)) {
    if (entry === '*' || u.hostname === entry || u.hostname.endsWith(`.${entry.replace(/^\./, '')}`)) return null;
  }
  return (
    process.env.HTTPS_PROXY || process.env.https_proxy ||
    process.env.HTTP_PROXY || process.env.http_proxy || null
  );
}

/** Open a raw socket to `host:port` through an HTTP proxy via CONNECT. */
function connectThroughProxy(proxyUrl, host, port, timeout) {
  return new Promise((resolve, reject) => {
    const p = new URL(proxyUrl);
    const req = http.request({
      host: p.hostname,
      port: Number(p.port) || 80,
      method: 'CONNECT',
      path: `${host}:${port}`,
      headers: { Host: `${host}:${port}` },
      timeout,
    });
    if (p.username) {
      const auth = Buffer.from(`${decodeURIComponent(p.username)}:${decodeURIComponent(p.password)}`).toString('base64');
      req.setHeader('Proxy-Authorization', `Basic ${auth}`);
    }
    req.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy();
        reject(new Error(`proxy CONNECT ${host}:${port} → ${res.statusCode}`));
        return;
      }
      resolve(socket);
    });
    req.on('timeout', () => { req.destroy(new Error('proxy CONNECT timeout')); });
    req.on('error', reject);
    req.end();
  });
}

/**
 * Fetch a URL into a Buffer.
 * @returns {Promise<{status:number, headers:object, body:Buffer}>}
 */
export async function fetchBuf(url, {
  method = 'GET',
  headers = {},
  body = null,
  proxy = undefined,          // undefined → use env; null/'' → direct
  timeout = DEFAULT_TIMEOUT,
  maxRedirects = 5,
  maxSize = 512 * 1024 * 1024,
} = {}) {
  let current = url;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const res = await once(current, { method, headers, body, proxy, timeout, maxSize });
    if ([301, 302, 303, 307, 308].includes(res.status) && res.headers.location) {
      current = new URL(res.headers.location, current).toString();
      if (res.status === 303) { method = 'GET'; body = null; }
      continue;
    }
    return res;
  }
  throw new Error(`too many redirects for ${url}`);
}

function once(url, { method, headers, body, proxy, timeout, maxSize }) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const isHttps = u.protocol === 'https:';
    const port = Number(u.port) || (isHttps ? 443 : 80);
    const proxyUrl = proxy === undefined ? proxyFromEnv(url) : (proxy || null);

    const options = {
      method,
      host: u.hostname,
      port,
      path: `${u.pathname}${u.search}`,
      headers: { 'User-Agent': 'quill-launcher/1.0 (+https://github.com/Han4Star2/MinecraftClient)', ...headers },
      timeout,
    };

    const onResponse = (res) => {
      const chunks = [];
      let size = 0;
      res.on('data', (c) => {
        size += c.length;
        if (size > maxSize) { res.destroy(new Error('response too large')); return; }
        chunks.push(c);
      });
      res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    };

    const fire = (createdSocket) => {
      const lib = isHttps ? https : http;
      const req = lib.request(
        createdSocket ? { ...options, createConnection: () => createdSocket } : options,
        onResponse,
      );
      req.on('timeout', () => req.destroy(new Error(`timeout after ${timeout}ms: ${url}`)));
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    };

    if (proxyUrl) {
      connectThroughProxy(proxyUrl, u.hostname, port, timeout)
        .then((raw) => {
          if (isHttps) {
            const secured = tls.connect({ socket: raw, servername: u.hostname });
            secured.on('error', reject);
            fire(secured);
          } else {
            fire(raw);
          }
        })
        .catch(reject);
    } else {
      fire(null);
    }
  });
}

/** GET JSON with status check. */
export async function fetchJson(url, opts = {}) {
  const res = await fetchBuf(url, opts);
  if (res.status !== 200) throw new Error(`GET ${url} → HTTP ${res.status}`);
  return JSON.parse(res.body.toString('utf8'));
}
