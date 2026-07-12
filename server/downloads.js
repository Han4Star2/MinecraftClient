/* Download queue: parallel, SHA-1 verified, resumable in the sense that
   files already on disk with a matching hash are skipped. Files verified
   once are remembered by size+mtime (Horus Core verified-cache), so repeat
   launches skip re-hashing entirely. Progress streams to the UI over SSE. */

import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { fetchBuf } from './net.js';
import { sha1, ensureDir, exists } from './util.js';
import { isVerified, markVerified, flushVerifiedCache } from './core.js';

/**
 * @param {Array<{url:string, dest:string, sha1?:string, size?:number, label?:string}>} tasks
 * @param {{concurrency?:number, proxy?:string, onProgress?:Function, signal?:AbortSignal}} opts
 */
export async function downloadAll(tasks, { concurrency = 4, proxy = undefined, onProgress = () => {}, signal } = {}) {
  let done = 0;
  let bytes = 0;
  const total = tasks.length;
  const errors = [];
  const queue = tasks.slice();

  async function worker() {
    while (queue.length) {
      if (signal?.aborted) throw new Error('cancelled');
      const task = queue.shift();
      if (!task) return;
      try {
        const fetched = await downloadOne(task, proxy, signal);
        bytes += fetched;
        done++;
        onProgress({ done, total, bytes, file: task.label || path.basename(task.dest) });
      } catch (e) {
        if (String(e.message).includes('cancelled')) throw e;
        errors.push(`${task.label || task.url}: ${e.message}`);
        if (errors.length > 4) throw new Error(`too many download failures — ${errors[0]}`);
        done++;
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, 16)) }, () => worker());
  try {
    await Promise.all(workers);
  } finally {
    await flushVerifiedCache();
  }
  if (errors.length) throw new Error(errors.join('; '));
  return { done, bytes };
}

async function downloadOne(task, proxy, signal, attempt = 0) {
  // Verified on a previous run and untouched since (size+mtime match)?
  // Skip both the network and the re-hash.
  if (await isVerified(task.dest, task.sha1)) return 0;

  // Already present and verified? Skip the network entirely.
  if (await exists(task.dest)) {
    if (!task.sha1) return 0;
    const cur = sha1(await fsp.readFile(task.dest));
    if (cur === task.sha1) {
      await markVerified(task.dest, task.sha1);
      return 0;
    }
  }

  try {
    if (signal?.aborted) throw new Error('cancelled');
    const res = await fetchBuf(task.url, { proxy, timeout: 60_000 });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (task.sha1) {
      const got = sha1(res.body);
      if (got !== task.sha1) throw new Error(`sha1 mismatch (expected ${task.sha1.slice(0, 10)}…, got ${got.slice(0, 10)}…)`);
    }
    await ensureDir(path.dirname(task.dest));
    const tmp = `${task.dest}.part`;
    await fsp.writeFile(tmp, res.body);
    await fsp.rename(tmp, task.dest);
    await markVerified(task.dest, task.sha1);
    return res.body.length;
  } catch (e) {
    if (attempt < 2 && !String(e.message).includes('cancelled') && !String(e.message).includes('sha1')) {
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
      return downloadOne(task, proxy, signal, attempt + 1);
    }
    throw e;
  }
}
