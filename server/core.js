/* Horus Core — the performance engine.
   Modular, dependency-free subsystems that make the game itself start
   faster and run smoother, especially on older hardware:

     · hardwareProfile()  — what this machine actually is (RAM, cores, class)
     · tunedJvmArgs()     — version/GC/hardware-aware JVM flags (Aikar-class
                            G1 tuning, safe on Java 8 through 21+)
     · verified-file cache — remembers sha1-verified files by size+mtime so
                            repeat launches skip re-hashing hundreds of MB
                            (the single biggest repeat-start win on HDDs)

   Everything here is measurable, standard-JVM behavior — no snake oil. */

import os from 'node:os';
import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { readJson, writeJson } from './util.js';

/* ------------------------------------------------------------- hardware */

export function hardwareProfile() {
  const totalMemMb = Math.round(os.totalmem() / 1048576);
  const cores = os.cpus().length || 2;
  // "low end" ≈ the i7-4790/GTX-1060/DDR3 class and below: ≤4 real cores
  // or ≤8 GB RAM. Used to pick more conservative heap/pause targets.
  const lowEnd = cores <= 4 || totalMemMb <= 8192;
  return { totalMemMb, cores, lowEnd };
}

/* ------------------------------------------------------------ JVM flags */

/** Version- and hardware-tuned JVM arguments.
    Returns the full memory+GC flag set (callers append user extras). */
export function tunedJvmArgs({ ramMb, gc = 'G1', javaMajor = 17, hw = hardwareProfile() }) {
  const args = [];

  // Fixed heap (-Xms = -Xmx) avoids resize pauses — but only when the
  // machine has comfortable headroom; on tight RAM keep the small default
  // so the OS isn't starved while the game loads.
  const fixedHeap = hw.totalMemMb >= ramMb * 2;
  args.push(`-Xms${fixedHeap ? ramMb : Math.min(1024, ramMb)}M`, `-Xmx${ramMb}M`);

  if (gc === 'ZGC') {
    args.push('-XX:+UseZGC');
  } else if (gc === 'Shenandoah') {
    args.push('-XX:+UseShenandoahGC');
  } else if (gc === 'Parallel') {
    args.push('-XX:+UseParallelGC');
  } else {
    // G1, Aikar-style, valid from Java 8u40 through 21+.
    args.push(
      '-XX:+UseG1GC',
      '-XX:+ParallelRefProcEnabled',
      `-XX:MaxGCPauseMillis=${hw.lowEnd ? 50 : 37}`,
      '-XX:+UnlockExperimentalVMOptions',
      '-XX:+DisableExplicitGC',
      '-XX:G1NewSizePercent=30',
      '-XX:G1MaxNewSizePercent=40',
      `-XX:G1HeapRegionSize=${ramMb >= 4096 ? 16 : 8}M`,
      '-XX:G1ReservePercent=20',
      '-XX:G1HeapWastePercent=5',
      '-XX:G1MixedGCCountTarget=4',
      '-XX:InitiatingHeapOccupancyPercent=15',
      '-XX:G1MixedGCLiveThresholdPercent=90',
      '-XX:G1RSetUpdatingPauseTimePercent=5',
      '-XX:SurvivorRatio=32',
      '-XX:MaxTenuringThreshold=1',
      '-XX:+PerfDisableSharedMem', // avoids hsperfdata write stalls on HDDs
    );
    if (javaMajor >= 9 || javaMajor === 8) args.push('-XX:+UseStringDeduplication');
    // Pre-touching the whole heap only pays off with a fixed heap and
    // plenty of free RAM — otherwise it just slows the start down.
    if (fixedHeap && !hw.lowEnd) args.push('-XX:+AlwaysPreTouch');
  }

  return args;
}

/* -------------------------------------------------- verified-file cache */
/* dest → { size, mtimeMs, sha1 }. A file whose size+mtime are unchanged
   since we last verified it does not get re-hashed — repeat launches go
   from "hash ~500 MB of jars and assets" to "stat a few thousand files". */

let cacheFile = null;
let cache = null;
let dirty = false;

export function initVerifiedCache(dataDir) {
  cacheFile = path.join(dataDir, 'verified-files.json');
  cache = null; // lazy re-load against the (possibly new) location
}

async function load() {
  if (cache) return cache;
  cache = (cacheFile && (await readJson(cacheFile, null))) || {};
  return cache;
}

export async function isVerified(dest, sha1) {
  if (!sha1) return false;
  const c = await load();
  const entry = c[dest];
  if (!entry || entry.sha1 !== sha1) return false;
  try {
    const st = await fsp.stat(dest);
    return st.size === entry.size && st.mtimeMs === entry.mtimeMs;
  } catch {
    return false;
  }
}

export async function markVerified(dest, sha1) {
  if (!sha1) return;
  const c = await load();
  try {
    const st = await fsp.stat(dest);
    c[dest] = { size: st.size, mtimeMs: st.mtimeMs, sha1 };
    dirty = true;
  } catch { /* file vanished — nothing to remember */ }
}

export async function flushVerifiedCache() {
  if (!dirty || !cacheFile || !cache) return;
  dirty = false;
  try {
    await writeJson(cacheFile, cache);
  } catch { /* cache is an optimization — never fatal */ }
}
