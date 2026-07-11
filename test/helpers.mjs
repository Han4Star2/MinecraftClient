/* Test helpers: an independent minimal ZIP *writer* (so zip.js is tested
   against archives it did not produce) and a tiny fixture HTTP server that
   plays Mojang/Fabric meta + CDN for fully offline launcher tests. */

import { deflateRawSync } from 'node:zlib';
import http from 'node:http';
import { createHash } from 'node:crypto';

/* ---------------------------------------------------------------- crc32 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ------------------------------------------------------------- zip writer */

/**
 * Build a zip Buffer from { "path/in/zip": Buffer|string } entries.
 * method: 8 (deflate) unless `store` is true.
 */
export function buildZip(files, { store = false } = {}) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const [name, raw] of Object.entries(files)) {
    const data = Buffer.isBuffer(raw) ? raw : Buffer.from(raw, 'utf8');
    const nameBuf = Buffer.from(name, 'utf8');
    const method = store ? 0 : 8;
    const comp = store ? data : deflateRawSync(data);
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);            // version needed
    local.writeUInt16LE(0, 6);             // flags
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(0, 10);            // time
    local.writeUInt16LE(0, 12);            // date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);            // extra len
    localParts.push(local, nameBuf, comp);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(comp.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30);          // extra
    central.writeUInt16LE(0, 32);          // comment
    central.writeUInt16LE(0, 34);          // disk
    central.writeUInt16LE(0, 36);          // int attrs
    central.writeUInt32LE(0, 38);          // ext attrs
    central.writeUInt32LE(offset, 42);     // local offset
    centralParts.push(central, nameBuf);

    offset += local.length + nameBuf.length + comp.length;
  }

  const centralStart = offset;
  const centralBuf = Buffer.concat(centralParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(Object.keys(files).length, 8);
  eocd.writeUInt16LE(Object.keys(files).length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(centralStart, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralBuf, eocd]);
}

/* --------------------------------------------------------- fixture server */

export const sha1hex = (buf) => createHash('sha1').update(buf).digest('hex');

/**
 * Start an HTTP server that serves a { "/path": Buffer|string|fn } map.
 * @returns {Promise<{port:number, base:string, close:Function, hits:string[]}>}
 */
export function fixtureServer(routes) {
  const hits = [];
  const server = http.createServer((req, res) => {
    const key = req.url.split('?')[0];
    hits.push(key);
    const val = routes[key];
    if (val === undefined) {
      res.writeHead(404);
      res.end('fixture 404: ' + key);
      return;
    }
    const body = typeof val === 'function' ? val() : val;
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
    res.writeHead(200, { 'Content-Length': buf.length });
    res.end(buf);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        port,
        base: `http://127.0.0.1:${port}`,
        hits,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}
