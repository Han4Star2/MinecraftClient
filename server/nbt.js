/* Minimal NBT (Named Binary Tag) reader — the binary format Minecraft uses
   for schematics, level data and more. Reads gzip/zlib/raw payloads into
   plain JS objects. Big-endian, spec-complete for all 13 tag types; long
   values come back as Number (fine for schematic-scale data). */

import zlib from 'node:zlib';

const TAG = {
  END: 0, BYTE: 1, SHORT: 2, INT: 3, LONG: 4, FLOAT: 5, DOUBLE: 6,
  BYTE_ARRAY: 7, STRING: 8, LIST: 9, COMPOUND: 10, INT_ARRAY: 11, LONG_ARRAY: 12,
};

class Reader {
  constructor(buf) { this.buf = buf; this.pos = 0; }
  byte() { return this.buf.readInt8(this.pos++); }
  ubyte() { return this.buf.readUInt8(this.pos++); }
  short() { const v = this.buf.readInt16BE(this.pos); this.pos += 2; return v; }
  int() { const v = this.buf.readInt32BE(this.pos); this.pos += 4; return v; }
  long() { const v = this.buf.readBigInt64BE(this.pos); this.pos += 8; return Number(v); }
  float() { const v = this.buf.readFloatBE(this.pos); this.pos += 4; return v; }
  double() { const v = this.buf.readDoubleBE(this.pos); this.pos += 8; return v; }
  string() {
    const len = this.buf.readUInt16BE(this.pos); this.pos += 2;
    const v = this.buf.toString('utf8', this.pos, this.pos + len); this.pos += len;
    return v;
  }
}

function readPayload(r, type) {
  switch (type) {
    case TAG.BYTE: return r.byte();
    case TAG.SHORT: return r.short();
    case TAG.INT: return r.int();
    case TAG.LONG: return r.long();
    case TAG.FLOAT: return r.float();
    case TAG.DOUBLE: return r.double();
    case TAG.STRING: return r.string();
    case TAG.BYTE_ARRAY: {
      const n = r.int();
      const out = r.buf.subarray(r.pos, r.pos + n);
      r.pos += n;
      return out;
    }
    case TAG.INT_ARRAY: {
      const n = r.int();
      const out = new Array(n);
      for (let i = 0; i < n; i++) out[i] = r.int();
      return out;
    }
    case TAG.LONG_ARRAY: {
      const n = r.int();
      const out = new Array(n);
      for (let i = 0; i < n; i++) out[i] = r.long();
      return out;
    }
    case TAG.LIST: {
      const itemType = r.ubyte();
      const n = r.int();
      const out = new Array(n);
      for (let i = 0; i < n; i++) out[i] = readPayload(r, itemType);
      return out;
    }
    case TAG.COMPOUND: {
      const out = {};
      for (;;) {
        const t = r.ubyte();
        if (t === TAG.END) return out;
        out[r.string()] = readPayload(r, t);
      }
    }
    default:
      throw new Error(`unknown NBT tag type ${type} at ${r.pos}`);
  }
}

function decompress(buf) {
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) return zlib.gunzipSync(buf);
  if (buf.length >= 2 && buf[0] === 0x78) return zlib.inflateSync(buf);
  return buf;
}

/** Parse an NBT buffer (auto-detects gzip/zlib) → { name, value }. */
export function parseNbt(buf) {
  const r = new Reader(decompress(buf));
  const rootType = r.ubyte();
  if (rootType !== TAG.COMPOUND) throw new Error('NBT root must be a compound tag');
  const name = r.string();
  return { name, value: readPayload(r, TAG.COMPOUND) };
}

export { TAG };
