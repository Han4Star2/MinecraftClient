/* Minecraft Java Edition Server List Ping (modern protocol, 1.7+):
   handshake(next_state=1) → status request → JSON response.
   Pure node:net — used by the News page's live server status. */

import net from 'node:net';

function writeVarInt(value) {
  const bytes = [];
  let v = value >>> 0;
  do {
    let b = v & 0x7f;
    v >>>= 7;
    if (v !== 0) b |= 0x80;
    bytes.push(b);
  } while (v !== 0);
  return Buffer.from(bytes);
}

function readVarInt(buf, offset) {
  let result = 0;
  let shift = 0;
  let pos = offset;
  for (;;) {
    if (pos >= buf.length) return null; // need more data
    const b = buf[pos++];
    result |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) break;
    shift += 7;
    if (shift > 35) throw new Error('varint too long');
  }
  return { value: result, next: pos };
}

function packet(id, payload) {
  const body = Buffer.concat([writeVarInt(id), payload]);
  return Buffer.concat([writeVarInt(body.length), body]);
}

function mcString(s) {
  const b = Buffer.from(s, 'utf8');
  return Buffer.concat([writeVarInt(b.length), b]);
}

/** Flatten a chat-component MOTD to plain text. */
function motdText(desc) {
  if (typeof desc === 'string') return desc;
  if (!desc) return '';
  let out = desc.text || '';
  for (const part of desc.extra || []) out += motdText(part);
  return out;
}

export function pingServer(host, port = 25565, timeout = 4000) {
  return new Promise((resolve) => {
    const started = Date.now();
    const socket = net.connect({ host, port, timeout });
    let buf = Buffer.alloc(0);
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.on('connect', () => {
      // handshake: protocol version (any works for status), address, port, next state = 1
      const hs = packet(0x00, Buffer.concat([
        writeVarInt(767),
        mcString(host),
        Buffer.from([(port >> 8) & 0xff, port & 0xff]),
        writeVarInt(1),
      ]));
      socket.write(hs);
      socket.write(packet(0x00, Buffer.alloc(0))); // status request
    });

    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      try {
        const len = readVarInt(buf, 0);
        if (!len) return;
        if (buf.length < len.next + len.value) return; // wait for full packet
        const pid = readVarInt(buf, len.next);
        if (!pid || pid.value !== 0x00) { done({ online: false, error: 'unexpected packet' }); return; }
        const strLen = readVarInt(buf, pid.next);
        if (!strLen || buf.length < strLen.next + strLen.value) return;
        const json = JSON.parse(buf.toString('utf8', strLen.next, strLen.next + strLen.value));
        done({
          online: true,
          latencyMs: Date.now() - started,
          version: json.version?.name || '?',
          players: { online: json.players?.online ?? 0, max: json.players?.max ?? 0 },
          motd: motdText(json.description).replace(/§./g, '').trim().slice(0, 120),
        });
      } catch (e) {
        done({ online: false, error: e.message });
      }
    });

    socket.on('timeout', () => done({ online: false, error: 'timeout' }));
    socket.on('error', (e) => done({ online: false, error: e.code || e.message }));
  });
}
