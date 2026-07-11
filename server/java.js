/* Java runtime discovery: PATH, JAVA_HOME and the usual install locations.
   Results are cached for the process lifetime. */

import { execFile } from 'node:child_process';
import { promises as fsp } from 'node:fs';
import path from 'node:path';

let cache = null;

function probe(bin) {
  return new Promise((resolve) => {
    execFile(bin, ['-version'], { timeout: 8000 }, (err, stdout, stderr) => {
      if (err) { resolve(null); return; }
      const out = `${stderr}\n${stdout}`;
      const m = out.match(/version "([^"]+)"/);
      const major = m ? Number((m[1].startsWith('1.') ? m[1].slice(2) : m[1]).split(/[.+-]/)[0]) : 0;
      resolve({ path: bin, version: m ? m[1] : 'unknown', major });
    });
  });
}

async function globDirs(base, suffix) {
  try {
    const entries = await fsp.readdir(base, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => path.join(base, e.name, suffix));
  } catch {
    return [];
  }
}

export async function detectJavas(extra = []) {
  if (cache) return cache;
  const bin = process.platform === 'win32' ? 'java.exe' : 'java';
  const candidates = new Set(extra.filter(Boolean));
  candidates.add('java'); // PATH
  if (process.env.JAVA_HOME) candidates.add(path.join(process.env.JAVA_HOME, 'bin', bin));

  if (process.platform === 'linux') {
    for (const c of await globDirs('/usr/lib/jvm', path.join('bin', 'java'))) candidates.add(c);
  } else if (process.platform === 'darwin') {
    for (const c of await globDirs('/Library/Java/JavaVirtualMachines', path.join('Contents', 'Home', 'bin', 'java'))) candidates.add(c);
  } else if (process.platform === 'win32') {
    for (const root of ['C:\\Program Files\\Java', 'C:\\Program Files\\Eclipse Adoptium', 'C:\\Program Files\\Microsoft']) {
      for (const c of await globDirs(root, path.join('bin', 'java.exe'))) candidates.add(c);
    }
  }

  const found = [];
  const seen = new Set();
  for (const c of candidates) {
    const info = await probe(c);
    if (info && !seen.has(info.version + info.path)) {
      seen.add(info.version + info.path);
      found.push(info);
    }
  }
  found.sort((a, b) => b.major - a.major);
  cache = found;
  return found;
}

/** Pick a java for a Minecraft version's required major (best effort). */
export async function pickJava({ preferred = '', requiredMajor = 0 } = {}) {
  if (preferred) {
    const p = await probe(preferred);
    if (p) return p;
    throw new Error(`configured Java not found: ${preferred}`);
  }
  const javas = await detectJavas();
  if (!javas.length) throw new Error('no Java runtime found — install a JRE/JDK or set a path in Settings → Minecraft');
  if (requiredMajor) {
    const exact = javas.find((j) => j.major === requiredMajor);
    if (exact) return exact;
    const newer = javas.filter((j) => j.major >= requiredMajor).pop();
    if (newer) return newer;
  }
  return javas[0];
}
