/* Static catalogs: built-in mod modules, cosmetics, HUD elements, demo data.
   Everything here is plain data — open JSON-ish structures, no store, no DRM. */

/* ------------------------------------------------------------------- mods */
/* cfg control types: toggle | slider | select | color | text | keybind */

const slider = (k, label, min, max, def, unit = '') => ({ k, t: 'slider', label, min, max, def, unit });
const toggle = (k, label, def = false) => ({ k, t: 'toggle', label, def });
const color = (k, label, def = '#ffffff') => ({ k, t: 'color', label, def });
const select = (k, label, opts, def) => ({ k, t: 'select', label, opts, def: def ?? opts[0] });
const text = (k, label, def = '') => ({ k, t: 'text', label, def });
const keybind = (k, label, def = 'None') => ({ k, t: 'keybind', label, def });

export const MODS = [
  { id: 'autohide-hud', name: 'Autohide HUD', cat: 'hud', icon: 'hud', isNew: true, on: false,
    desc: 'Hides HUD elements while you are not using them.',
    cfg: [slider('delay', 'Hide after', 1, 10, 3, 's'), toggle('fade', 'Fade out smoothly', true)] },
  { id: 'camera', name: 'Camera', cat: 'utility', icon: 'camera', isNew: true, on: true,
    desc: 'Freecam, cinematic paths and perspective tweaks.',
    cfg: [slider('speed', 'Camera speed', 10, 300, 100, '%'), toggle('smooth', 'Cinematic smoothing', true), keybind('key', 'Freecam key', 'F4')] },
  { id: 'uhc-overlay', name: 'UHC Overlay', cat: 'hypixel', icon: 'apple', isNew: true, on: false,
    desc: 'Head-up info for UHC: apples, kills, border.',
    cfg: [toggle('apples', 'Show golden apples', true), toggle('border', 'Border warning', true)] },
  { id: 'animations', name: 'Animations', cat: 'pvp', icon: 'sword', on: true,
    desc: 'Legacy-style swing, rod and block-hit animations.',
    cfg: [select('style', 'Animation style', ['1.7', '1.8', 'Modern'], '1.8'), toggle('punch', 'Old punch animation', true)] },
  { id: 'armor-bar', name: 'Armor Bar', cat: 'hud', icon: 'shield', on: true,
    desc: 'Compact armor durability bar above the hotbar.' },
  { id: 'armor-status', name: 'Armor Status', cat: 'hud', icon: 'shirt', on: true,
    desc: 'Shows equipped armor with durability percentages.',
    cfg: [select('layout', 'Layout', ['Vertical', 'Horizontal']), toggle('percent', 'Show percentages', true)] },
  { id: 'attack-indicator', name: 'Attack Indicator', cat: 'pvp', icon: 'crosshair', on: true,
    desc: 'Precise attack-cooldown indicator.' },
  { id: 'block-indicator', name: 'Block Indicator', cat: 'pvp', icon: 'box', on: false,
    desc: 'Shows the block you are looking at.' },
  { id: 'backups', name: 'Backups', cat: 'utility', icon: 'save', on: false,
    desc: 'Automatic world backups on a schedule you choose.',
    cfg: [slider('interval', 'Backup every', 5, 120, 30, 'min'), slider('keep', 'Keep backups', 1, 50, 10)] },
  { id: 'auto-text', name: 'Auto Text', cat: 'utility', icon: 'message', on: true,
    desc: 'Hotkey-triggered chat macros.',
    cfg: [text('text1', 'Macro 1', 'gg'), keybind('key1', 'Macro 1 key', 'G')] },
  { id: 'block-overlay', name: 'Block Overlay', cat: 'pvp', icon: 'grid', on: false,
    desc: 'Customizable block highlight outline.',
    cfg: [color('color', 'Outline color', '#3df08d'), slider('width', 'Line width', 1, 6, 2, 'px')] },
  { id: 'boss-bar', name: 'Boss Bar', cat: 'hud', icon: 'bar', on: false,
    desc: 'Movable, restylable boss health bar.' },

  { id: 'keystrokes', name: 'Keystrokes', cat: 'pvp', icon: 'keyboard', on: true,
    desc: 'Shows WASD, mouse buttons and space bar presses.',
    cfg: [slider('scale', 'Scale', 50, 200, 100, '%'), color('color', 'Key color', '#ffffff'), color('pressed', 'Pressed color', '#e8394a'), toggle('mouse', 'Show mouse buttons', true), toggle('cpsOnKeys', 'CPS on mouse keys', true)] },
  { id: 'cps', name: 'CPS Counter', cat: 'pvp', icon: 'zap', on: true,
    desc: 'Clicks per second, left and right.' },
  { id: 'fps', name: 'FPS Display', cat: 'hud', icon: 'monitor', on: true,
    desc: 'Frames per second, always visible.' },
  { id: 'ping', name: 'Ping Display', cat: 'hud', icon: 'wifi', on: true,
    desc: 'Live latency to the current server.' },
  { id: 'coordinates', name: 'Coordinates', cat: 'hud', icon: 'compass', on: true,
    desc: 'X / Y / Z position with biome info.' },
  { id: 'direction', name: 'Direction HUD', cat: 'hud', icon: 'compass', on: false,
    desc: 'Cardinal direction and yaw display.' },
  { id: 'potions', name: 'Potion Effects', cat: 'hud', icon: 'drop', on: true,
    desc: 'Active effects with remaining time.' },
  { id: 'toggle-sprint', name: 'Toggle Sprint', cat: 'pvp', icon: 'zap', on: true,
    desc: 'Sprint without holding the key. Optional HUD text.',
    cfg: [select('mode', 'Mode', ['Toggle', 'Hold']), toggle('hudText', 'Show HUD text', true)] },
  { id: 'zoom', name: 'Zoom', cat: 'utility', icon: 'search', on: true,
    desc: 'Smooth optical zoom on a hotkey.',
    cfg: [slider('factor', 'Zoom factor', 2, 10, 4, 'x'), toggle('smooth', 'Smooth camera', true), keybind('key', 'Zoom key', 'C')] },
  { id: 'fullbright', name: 'Fullbright', cat: 'utility', icon: 'eye', on: false,
    desc: 'Maximum gamma without editing files.',
    cfg: [slider('gamma', 'Gamma', 100, 1000, 400, '%')] },
  { id: 'time-changer', name: 'Time Changer', cat: 'utility', icon: 'clock', on: false,
    desc: 'Client-side time of day.',
    cfg: [select('time', 'Time', ['Default', 'Sunrise', 'Noon', 'Sunset', 'Midnight'])] },
  { id: 'motion-blur', name: 'Motion Blur', cat: 'utility', icon: 'camera', on: false,
    desc: 'Configurable motion blur shader.',
    cfg: [slider('strength', 'Strength', 0, 100, 40, '%')] },
  { id: 'reach', name: 'Reach Display', cat: 'pvp', icon: 'crosshair', on: false,
    desc: 'Distance of your last hit.' },
  { id: 'combo', name: 'Combo Counter', cat: 'pvp', icon: 'flame', on: false,
    desc: 'Current hit combo, with best-combo memory.' },
  { id: 'hit-color', name: 'Hit Color', cat: 'pvp', icon: 'heart', on: false,
    desc: 'Custom damage-flash color on entities.',
    cfg: [color('color', 'Hit color', '#ff4d4d'), slider('alpha', 'Intensity', 10, 100, 60, '%')] },
  { id: 'crosshair', name: 'Custom Crosshair', cat: 'pvp', icon: 'crosshair', on: false,
    desc: 'Styles, colors and dynamic scaling.',
    cfg: [select('style', 'Style', ['Cross', 'Dot', 'Circle', 'Square']), slider('size', 'Size', 4, 32, 12, 'px'), color('color', 'Color', '#ffffff')] },
  { id: 'scoreboard', name: 'Scoreboard', cat: 'hypixel', icon: 'list', on: true,
    desc: 'Restyle or hide the sidebar scoreboard.',
    cfg: [toggle('numbers', 'Hide red numbers', true), slider('scale', 'Scale', 50, 150, 100, '%')] },
  { id: 'auto-gg', name: 'Auto GG', cat: 'hypixel', icon: 'message', on: true,
    desc: 'Says "gg" when a game ends. Sportsmanship, automated.',
    cfg: [text('msg', 'Message', 'gg'), slider('delay', 'Delay', 0, 5, 1, 's')] },
  { id: 'bedwars-overlay', name: 'BedWars Overlay', cat: 'hypixel', icon: 'sword', isNew: true, on: false,
    desc: 'Stats overlay for BedWars lobbies.' },
  { id: 'quickplay', name: 'Quickplay', cat: 'hypixel', icon: 'zap', isNew: true, on: false,
    desc: 'Jump into any Hypixel game from one menu.' },
  { id: 'item-physics', name: 'Item Physics', cat: 'utility', icon: 'box', on: false,
    desc: 'Dropped items tumble realistically.' },
  { id: 'nametags', name: 'Nametags', cat: 'utility', icon: 'user', on: false,
    desc: 'Cleaner nametags, optional own tag.' },
  { id: 'chat-tweaks', name: 'Chat Tweaks', cat: 'utility', icon: 'message', on: true,
    desc: 'Timestamps, smooth chat, copy on click.',
    cfg: [toggle('timestamps', 'Timestamps', true), toggle('smooth', 'Smooth chat', true), toggle('copy', 'Click to copy', true)] },
  { id: 'memory', name: 'Memory Display', cat: 'hud', icon: 'cpu', on: false,
    desc: 'RAM usage of the game process.' },
  { id: 'session-timer', name: 'Session Timer', cat: 'hud', icon: 'clock', on: false,
    desc: 'How long you have been playing.' },
  { id: 'server-address', name: 'Server Address', cat: 'hud', icon: 'globe', on: false,
    desc: 'Current server IP on screen.' },
  { id: 'render-optimizer', name: 'Render Optimizer', cat: 'performance', icon: 'zap', on: true,
    desc: 'Sodium-class rendering pipeline optimizations.',
    cfg: [select('quality', 'Preset', ['Quality', 'Balanced', 'Max FPS'], 'Balanced'), slider('chunks', 'Chunk update budget', 1, 16, 6)] },
  { id: 'tick-optimizer', name: 'Tick Optimizer', cat: 'performance', icon: 'cpu', on: true,
    desc: 'Lithium-class game-logic optimizations.' },
  { id: 'dynamic-fps', name: 'Dynamic FPS', cat: 'performance', icon: 'monitor', on: true,
    desc: 'Reduces FPS when the window is unfocused.',
    cfg: [slider('idleFps', 'Unfocused FPS cap', 1, 60, 10)] },
  { id: 'fast-chunks', name: 'Fast Chunks', cat: 'performance', icon: 'layers', isNew: true, on: false,
    desc: 'Async chunk building for faster world loads.' },
];

export const MOD_CATS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'hud', label: 'HUD' },
  { id: 'pvp', label: 'PvP' },
  { id: 'hypixel', label: 'Hypixel' },
  { id: 'performance', label: 'Performance' },
  { id: 'utility', label: 'Utility' },
];

/* -------------------------------------------------------------- cosmetics */

export const COSMETICS = [
  { id: 'cape-quill', cat: 'cape', name: 'Quill Classic', base: '#7a1f2b', alt: '#e8394a', pattern: 'quill', seed: 3 },
  { id: 'cape-midnight', cat: 'cape', name: 'Midnight', base: '#191c24', alt: '#3a4152', pattern: 'gradient', seed: 5 },
  { id: 'cape-emerald', cat: 'cape', name: 'Emerald', base: '#1d6b3f', alt: '#35d374', pattern: 'stripe', seed: 8 },
  { id: 'cape-royal', cat: 'cape', name: 'Royal', base: '#2c2260', alt: '#7a5cff', pattern: 'vstripe', seed: 11 },
  { id: 'cape-honey', cat: 'cape', name: 'Honeycomb', base: '#b97e1f', alt: '#f3c14b', pattern: 'checker', seed: 2 },
  { id: 'cape-star', cat: 'cape', name: 'North Star', base: '#0e2a4a', alt: '#eef3ff', pattern: 'star', seed: 9 },
  { id: 'cape-creeper', cat: 'cape', name: 'Ssssurprise', base: '#2e7d40', alt: '#123f1e', pattern: 'creeper', seed: 4 },
  { id: 'cape-cherry', cat: 'cape', name: 'Cherry Bloom', base: '#b23a52', alt: '#ffb7c6', pattern: 'gradient', seed: 6 },

  { id: 'hat-beanie', cat: 'hat', name: 'Beanie', color: '#c8354a', color2: '#eef3ff' },
  { id: 'hat-tophat', cat: 'hat', name: 'Top Hat', color: '#17181d', color2: '#e8394a' },
  { id: 'hat-halo', cat: 'hat', name: 'Halo', color: '#f3c14b', glow: true },
  { id: 'hat-crown', cat: 'hat', name: 'Crown', color: '#e7b23c', color2: '#c22636' },

  { id: 'wings-angel', cat: 'wings', name: 'Angel Wings', color: '#f2f5fa' },
  { id: 'wings-dragon', cat: 'wings', name: 'Dragon Wings', color: '#7a1f2b' },
  { id: 'wings-pixie', cat: 'wings', name: 'Pixie Wings', color: '#57d8c4' },

  { id: 'band-red', cat: 'bandana', name: 'Red Bandana', color: '#c8354a' },
  { id: 'band-blue', cat: 'bandana', name: 'Blue Bandana', color: '#3a6fd8' },
  { id: 'band-black', cat: 'bandana', name: 'Black Bandana', color: '#1b1d22' },

  { id: 'pack-leather', cat: 'backpack', name: 'Leather Pack', color: '#7c4a24' },
  { id: 'pack-scout', cat: 'backpack', name: 'Scout Pack', color: '#3c6b3d' },
  { id: 'pack-tech', cat: 'backpack', name: 'Tech Pack', color: '#23262e', glow: true },

  { id: 'emote-wave', cat: 'emote', name: 'Wave', anim: 'wave' },
  { id: 'emote-spin', cat: 'emote', name: 'Spin', anim: 'spin' },
];

export const COS_CATS = [
  { id: 'cape', label: 'Capes' },
  { id: 'hat', label: 'Hats' },
  { id: 'wings', label: 'Wings' },
  { id: 'bandana', label: 'Bandanas' },
  { id: 'backpack', label: 'Backpacks' },
  { id: 'emote', label: 'Emotes' },
];

/* ------------------------------------------------------------ HUD elements */

export const HUD_DEFAULTS = [
  { id: 'fps', label: 'FPS', x: 2.5, y: 3, on: true, scale: 1, color: '#ffffff', boxed: true },
  { id: 'cps', label: 'CPS', x: 2.5, y: 10, on: true, scale: 1, color: '#ffffff', boxed: true },
  { id: 'ping', label: 'Ping', x: 2.5, y: 17, on: true, scale: 1, color: '#ffffff', boxed: true },
  { id: 'coords', label: 'Coordinates', x: 2.5, y: 88, on: true, scale: 1, color: '#ffffff', boxed: true },
  { id: 'keystrokes', label: 'Keystrokes', x: 84, y: 56, on: true, scale: 1, color: '#ffffff', boxed: false },
  { id: 'armor', label: 'Armor Status', x: 84, y: 26, on: true, scale: 1, color: '#ffffff', boxed: true },
  { id: 'clock', label: 'Clock', x: 88, y: 3, on: true, scale: 1, color: '#ffffff', boxed: true },
  { id: 'direction', label: 'Direction', x: 45, y: 3, on: false, scale: 1, color: '#ffffff', boxed: true },
  { id: 'speed', label: 'Speed', x: 2.5, y: 60, on: false, scale: 1, color: '#9be8ff', boxed: true },
  { id: 'combo', label: 'Combo', x: 45, y: 62, on: false, scale: 1.2, color: '#ffd35b', boxed: false },
  { id: 'reach', label: 'Reach', x: 45, y: 70, on: false, scale: 1, color: '#ffffff', boxed: true },
  { id: 'potions', label: 'Potions', x: 84, y: 80, on: true, scale: 1, color: '#ffffff', boxed: true },
];

/* --------------------------------------------------------------- demo data */

export const PINNED_SERVERS = [
  { id: 'hypixel', name: 'Hypixel', addr: 'mc.hypixel.net', letter: 'H', bg: 'linear-gradient(135deg,#9a3324,#5e1616)', fg: '#f3c14b' },
  { id: 'minemen', name: 'Minemen Club', addr: 'na.minemen.club', letter: 'M', bg: 'linear-gradient(135deg,#8c1f2f,#4e1019)', fg: '#ffffff' },
  { id: 'hive', name: 'The Hive', addr: 'geo.hivebedrock.network', letter: 'B', bg: 'linear-gradient(135deg,#d9a926,#8a6d1f)', fg: '#22222a' },
  { id: 'vanilla', name: 'Vanilla+', addr: 'play.vanillaplus.net', letter: 'V+', bg: 'linear-gradient(135deg,#2e7d40,#1c4f28)', fg: '#eafff2' },
  { id: 'complex', name: 'Complex Gaming', addr: 'hub.mc-complex.com', letter: 'C', bg: 'linear-gradient(135deg,#7a3fd0,#4a2680)', fg: '#ffffff' },
  { id: 'pvplegacy', name: 'PvP Legacy', addr: 'play.pvplegacy.net', letter: 'PVP', bg: 'linear-gradient(135deg,#2b2d36,#16171d)', fg: '#ff5560' },
];

export const DEMO_FRIENDS = [
  { name: 'BREND4N', status: 'ingame', detail: 'Hypixel — Bed Wars' },
  { name: 'Gemsip', status: 'online', detail: 'In the launcher' },
  { name: 'unidentiffie', status: 'ingame', detail: 'Playing 1.8.9 PvP' },
  { name: 'Histieroo', status: 'away', detail: 'AFK for 12 min' },
  { name: 'Nexo_', status: 'offline', detail: 'Last seen 2 h ago' },
];

export const DEMO_VERSIONS = [
  '1.21.5', '1.21.4', '1.21.1', '1.21', '1.20.6', '1.20.4', '1.20.1',
  '1.19.4', '1.19.2', '1.18.2', '1.17.1', '1.16.5', '1.12.2', '1.8.9', '1.7.10',
].map((id) => ({ id, type: 'release' }));

export const LOADERS = [
  { id: 'vanilla', label: 'Vanilla' },
  { id: 'fabric', label: 'Fabric' },
  { id: 'forge', label: 'Forge' },
  { id: 'neoforge', label: 'NeoForge' },
  { id: 'quilt', label: 'Quilt' },
];

export const LOADER_COLORS = {
  vanilla: 'linear-gradient(135deg,#5e8d4a,#3c5c30)',
  fabric: 'linear-gradient(135deg,#c9b78a,#8d7c53)',
  forge: 'linear-gradient(135deg,#465a7c,#2c3a52)',
  neoforge: 'linear-gradient(135deg,#c46231,#8a3f1c)',
  quilt: 'linear-gradient(135deg,#9b59d0,#5f3382)',
};

export function defaultProfiles() {
  return [
    { id: 'p-main', name: 'Latest & Greatest', version: '1.21.5', loader: 'fabric', ramMb: 4096, javaPath: '', jvmArgs: '', gameDir: '', lastPlayed: Date.now() - 36e5 * 5, totalPlayMs: 1000 * 60 * 60 * 41 },
    { id: 'p-pvp', name: '1.8.9 PvP', version: '1.8.9', loader: 'vanilla', ramMb: 2048, javaPath: '', jvmArgs: '', gameDir: '', lastPlayed: Date.now() - 864e5 * 2, totalPlayMs: 1000 * 60 * 60 * 128 },
    { id: 'p-modpack', name: 'Create: Astral', version: '1.20.1', loader: 'forge', ramMb: 6144, javaPath: '', jvmArgs: '', gameDir: '', lastPlayed: 0, totalPlayMs: 0 },
  ];
}

export function defaultSettings() {
  return {
    language: 'auto',
    animations: true,
    accent: '#e8394a',
    keepOpen: true,
    autoUpdate: true,
    defaultRamMb: 3072,
    gc: 'G1',
    threads: 0,
    fpsCap: 0,
    vsync: false,
    resolution: 'auto',
    fullscreen: false,
    javaPath: '',
    jvmArgs: '',
    gameDir: '',
    proxy: '',
    downloadConcurrency: 4,
    metaMirror: '',
    accountName: 'Player',
    accountType: 'offline',
    msaClientId: '',
    selectedProfile: 'p-main',
  };
}
