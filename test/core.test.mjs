/* Horus Core — tuned JVM flags and the verified-file cache that makes
   repeat launches skip re-hashing. */

import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { promises as fsp } from 'node:fs';

import {
  tunedJvmArgs, hardwareProfile, initVerifiedCache, isVerified, markVerified, flushVerifiedCache,
} from '../server/core.js';

test('tunedJvmArgs: heap bounds, GC selection, hardware awareness', () => {
  const bigBox = { totalMemMb: 32768, cores: 16, lowEnd: false };
  const oldBox = { totalMemMb: 8192, cores: 4, lowEnd: true };

  const g1 = tunedJvmArgs({ ramMb: 4096, gc: 'G1', javaMajor: 17, hw: bigBox });
  assert.ok(g1.includes('-Xmx4096M'));
  assert.ok(g1.includes('-Xms4096M'), 'fixed heap when RAM is plentiful');
  assert.ok(g1.includes('-XX:+UseG1GC'));
  assert.ok(g1.includes('-XX:+ParallelRefProcEnabled'));
  assert.ok(g1.includes('-XX:+UseStringDeduplication'));
  assert.ok(g1.includes('-XX:+AlwaysPreTouch'));
  assert.ok(g1.includes('-XX:G1HeapRegionSize=16M'), '16M regions for a 4G heap');

  const tight = tunedJvmArgs({ ramMb: 6144, gc: 'G1', javaMajor: 8, hw: oldBox });
  assert.ok(tight.includes('-Xms1024M'), 'small initial heap when headroom < 2×');
  assert.ok(tight.includes('-XX:MaxGCPauseMillis=50'), 'relaxed pause target on low-end');

  const low = tunedJvmArgs({ ramMb: 2048, gc: 'G1', javaMajor: 8, hw: oldBox });
  assert.ok(low.includes('-Xms2048M'), '2G heap on an 8G box is comfortable → fixed');
  assert.ok(!low.includes('-XX:+AlwaysPreTouch'), 'but never pre-touch on low-end boxes');

  const zgc = tunedJvmArgs({ ramMb: 2048, gc: 'ZGC', javaMajor: 21, hw: bigBox });
  assert.ok(zgc.includes('-XX:+UseZGC'));
  assert.ok(!zgc.includes('-XX:+UseG1GC'));
  assert.ok(tunedJvmArgs({ ramMb: 2048, gc: 'Parallel', javaMajor: 17, hw: bigBox }).includes('-XX:+UseParallelGC'));
});

test('hardwareProfile reports this machine', () => {
  const hw = hardwareProfile();
  assert.ok(hw.totalMemMb > 0);
  assert.ok(hw.cores >= 1);
  assert.equal(typeof hw.lowEnd, 'boolean');
});

test('verified cache: hit on unchanged file, miss on touch/change, survives flush', async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'horus-vcache-'));
  initVerifiedCache(dir);

  const file = path.join(dir, 'lib.jar');
  await fsp.writeFile(file, 'jar-bytes');
  const hash = 'abc123';

  assert.equal(await isVerified(file, hash), false, 'unknown file is not verified');
  await markVerified(file, hash);
  assert.equal(await isVerified(file, hash), true, 'hit after marking');
  assert.equal(await isVerified(file, 'otherhash'), false, 'expected-hash change invalidates');

  await fsp.writeFile(file, 'tampered!!');
  assert.equal(await isVerified(file, hash), false, 'size/mtime change invalidates');

  // persistence round-trip
  await fsp.writeFile(file, 'jar-bytes');
  await markVerified(file, hash);
  await flushVerifiedCache();
  initVerifiedCache(dir); // fresh load from disk
  assert.equal(await isVerified(file, hash), true, 'cache survives a restart');

  assert.equal(await isVerified(file, undefined), false, 'no expected hash → never cached-verified');
});
