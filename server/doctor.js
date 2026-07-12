/* Horus Doctor — the rule-based assistant. No cloud, no LLM, no magic:
   every finding is a concrete, checkable rule over real local state
   (settings, hardware, the profile's mods folder, the latest crash log),
   and every suggested fix names exactly what it would change. */

import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { getSettings, dirs } from './store.js';
import { listMods } from './mods.js';
import { detectJavas } from './java.js';
import { hardwareProfile } from './core.js';

/* Known-incompatible / redundant jar pairs (by fuzzy jar-name match). */
const CONFLICTS = [
  ['optifine', 'sodium', 'OptiFine and Sodium patch the same renderer — the game usually crashes or loses all Sodium gains. Keep Sodium (+ Iris for shaders).'],
  ['optifine', 'iris', 'OptiFine and Iris both implement shaders — pick one; Iris pairs with Sodium.'],
  ['sodium', 'canvas', 'Sodium and Canvas are competing renderers — enable only one.'],
];

/* Crash-log signatures → plain-language explanation + fix. */
const CRASH_PATTERNS = [
  [/OutOfMemoryError|GC overhead limit/i,
    'The game ran out of memory.',
    'Raise the RAM slider for this instance (Settings → Performance or the profile editor). If the machine has little RAM, lower the render distance instead of raising the heap.'],
  [/UnsupportedClassVersionError|class file version/i,
    'A mod (or the game) needs a newer Java than the one that launched it.',
    'Horus auto-picks Java per version — remove any hard-coded Java path in Settings → Minecraft, or install a newer JRE.'],
  [/DuplicateModsFoundException|Duplicate mod/i,
    'Two copies of the same mod are in the mods folder.',
    'Open Mods → the duplicate check below names the files; delete the older copy.'],
  [/ModResolutionException|requires.*version|Missing or unsupported mandatory dependencies/i,
    'A mod is missing a dependency or does not fit this Minecraft version.',
    'Installing via Mods → search resolves required dependencies automatically. Check that every mod matches the profile version.'],
  [/GLFW error|Failed to create.*GL|LWJGL|EXCEPTION_ACCESS_VIOLATION.*ig\d+icd/i,
    'The graphics driver failed while creating the game window.',
    'Update the GPU driver. On old Intel/NVIDIA cards also try disabling VSync and lowering resolution in Settings.'],
  [/java\.net\.(ConnectException|UnknownHostException)/i,
    'The game could not reach a server (network problem).',
    'Check the address on the Servers page (live ping shows reachability) and any proxy in Settings → Network.'],
];

export async function diagnose(profile) {
  const s = getSettings();
  const hw = hardwareProfile();
  const findings = [];
  const add = (severity, title, detail, fix = null) => findings.push({ severity, title, detail, fix });

  /* ------------------------------------------------------- memory sanity */
  const ram = profile?.ramMb || s.defaultRamMb || 2048;
  if (ram > hw.totalMemMb * 0.6) {
    add('warn', `Heap too big for this machine (${(ram / 1024).toFixed(1)} GB of ${(hw.totalMemMb / 1024).toFixed(0)} GB)`,
      'Giving Minecraft more than ~60% of system RAM starves the OS and causes stutter, not speed.',
      { label: `Set RAM to ${Math.round(hw.totalMemMb * 0.4 / 512) * 512} MB`, settings: { defaultRamMb: Math.round(hw.totalMemMb * 0.4 / 512) * 512 } });
  } else if (ram < 2048 && !hw.lowEnd) {
    add('info', 'RAM slider is conservative',
      `${(ram / 1024).toFixed(1)} GB heap on a ${(hw.totalMemMb / 1024).toFixed(0)} GB machine — modern versions run smoother with 3–4 GB.`,
      { label: 'Set RAM to 3 GB', settings: { defaultRamMb: 3072 } });
  }

  /* ------------------------------------------------- low-end boost check */
  if (hw.lowEnd && (s.fpsBoost === 'off' || !s.fpsBoost)) {
    add('info', 'Low-end hardware, FPS Boost is off',
      `${hw.cores} cores / ${(hw.totalMemMb / 1024).toFixed(0)} GB RAM detected — the FPS Boost dial and the Low-end preset exist exactly for this machine class.`,
      { label: 'Set FPS Boost to High', settings: { fpsBoost: 'high' } });
  }
  if (s.vsync && s.fpsCap > 0) {
    add('info', 'VSync and an FPS cap are both active',
      'They fight each other; VSync alone already caps at the display rate.',
      { label: 'Remove the FPS cap', settings: { fpsCap: 0 } });
  }

  /* ------------------------------------------------------------- java fit */
  try {
    const javas = await detectJavas([s.javaPath]);
    if (!javas.length) {
      add('crit', 'No Java runtime found', 'Nothing can launch without a JRE.', null);
    } else if (profile && /^1\.(2[1-9]|20\.[5-9])/.test(profile.version) && !javas.some((j) => j.major >= 21)) {
      add('warn', `${profile.version} needs Java 21+`, `Newest detected: Java ${javas[0].major}. Horus falls back to it, but launch will fail.`, null);
    }
  } catch { /* detection is best-effort */ }

  /* ------------------------------------------ duplicate / conflicting jars */
  if (profile) {
    try {
      const jars = await listMods(profile);
      const byBase = new Map();
      for (const j of jars) {
        // "sodium-fabric-0.5.8.jar" → "sodium"; group by leading name part
        const base = j.file.toLowerCase().replace(/\.jar(\.disabled)?$/, '').replace(/[-_]?(fabric|forge|mc)?[-_]?v?\d[\d.+a-z-]*$/, '');
        if (!byBase.has(base)) byBase.set(base, []);
        byBase.get(base).push(j);
      }
      for (const [base, group] of byBase) {
        if (group.length > 1 && group.some((g) => g.enabled)) {
          add('warn', `Duplicate mod: ${base}`,
            `${group.map((g) => g.file).join(' + ')} — two versions of one mod crash the loader.`,
            { label: 'Review in Mods', link: '#/mods' });
        }
      }
      const names = jars.filter((j) => j.enabled).map((j) => j.file.toLowerCase());
      for (const [a, b, why] of CONFLICTS) {
        if (names.some((n) => n.includes(a)) && names.some((n) => n.includes(b))) {
          add('crit', `Conflict: ${a} + ${b}`, why, { label: 'Review in Mods', link: '#/mods' });
        }
      }
    } catch { /* no mods dir yet */ }
  }

  /* ------------------------------------------------------ last crash log */
  try {
    const crashDir = path.join(dirs().data, 'crash-reports');
    const files = (await fsp.readdir(crashDir)).filter((f) => f.endsWith('.log')).sort();
    if (files.length) {
      const latest = files[files.length - 1];
      const text = await fsp.readFile(path.join(crashDir, latest), 'utf8');
      for (const [re, what, fix] of CRASH_PATTERNS) {
        if (re.test(text)) {
          add('crit', `Last crash: ${what}`, `Found in ${latest}.`, { label: fix, link: null });
          break;
        }
      }
    }
  } catch { /* no crashes — the best finding of all */ }

  if (!findings.length) {
    add('ok', 'Everything looks healthy',
      `${hw.cores} cores, ${(hw.totalMemMb / 1024).toFixed(0)} GB RAM, ${(ram / 1024).toFixed(1)} GB heap, FPS Boost "${s.fpsBoost || 'off'}" — no conflicts, no crash reports.`);
  }
  return { hw, findings };
}
