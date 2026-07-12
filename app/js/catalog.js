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
  { id: 'camera', name: 'Camera', cat: 'utility', icon: 'camera', isNew: true, on: true, boostCutoff: 2,
    desc: 'Freecam, cinematic paths and perspective tweaks.',
    cfg: [slider('speed', 'Camera speed', 10, 300, 100, '%'), toggle('smooth', 'Cinematic smoothing', true), keybind('key', 'Freecam key', 'F4')] },
  { id: 'uhc-overlay', name: 'UHC Overlay', cat: 'hypixel', icon: 'apple', isNew: true, on: false, boostCutoff: 3,
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
  { id: 'block-overlay', name: 'Block Overlay', cat: 'pvp', icon: 'grid', on: false, boostCutoff: 3,
    desc: 'Customizable block highlight outline.',
    cfg: [color('color', 'Outline color', '#3df08d'), slider('width', 'Line width', 1, 6, 2, 'px')] },
  { id: 'boss-bar', name: 'Boss Bar', cat: 'hud', icon: 'bar', on: false, boostCutoff: 4,
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
  { id: 'toggle-sneak', name: 'Toggle Sneak', cat: 'pvp', icon: 'user', on: false,
    desc: 'Sneak stays on until you press the key again.',
    cfg: [toggle('hudText', 'Show HUD text', true), keybind('key', 'Sneak key', 'Shift')] },
  { id: 'auto-sprint', name: 'Auto Sprint', cat: 'pvp', icon: 'running', on: false,
    desc: 'Always sprint while moving forward — no key needed.',
    cfg: [toggle('allDirs', 'Sprint in all directions', false)] },
  { id: 'freelook', name: 'Freelook', cat: 'pvp', icon: 'eye', on: false,
    desc: 'Look around without changing your movement direction.',
    cfg: [keybind('key', 'Freelook key', 'LAlt'), toggle('invert', 'Invert camera', false)] },
  { id: 'hitboxes', name: 'Hitboxes', cat: 'pvp', icon: 'box', on: false, boostCutoff: 2,
    desc: 'Show entity hitboxes with custom colors.',
    cfg: [color('color', 'Hitbox color', '#ff3355'), toggle('eyeline', 'Show eye line', false)] },
  { id: 'hit-animation', name: 'Hit Animation', cat: 'pvp', icon: 'sword', on: false, boostCutoff: 2,
    desc: 'Legacy block-hit and hurt animations.',
    cfg: [select('style', 'Style', ['1.8', '1.9+', 'Off'], '1.8')] },
  { id: 'damage-tint', name: 'Damage Tint', cat: 'pvp', icon: 'heart', on: false, boostCutoff: 2,
    desc: 'Adjust the red flash entities show when hurt.',
    cfg: [slider('alpha', 'Tint strength', 0, 100, 60, '%'), color('color', 'Tint color', '#ff2a2a')] },
  { id: 'item-counter', name: 'Item Counter', cat: 'pvp', icon: 'layers', on: false, boostCutoff: 3,
    desc: 'Counts arrows, pearls, blocks or any held item stack.',
    cfg: [toggle('arrows', 'Count arrows', true), toggle('blocks', 'Count blocks', true)] },
  { id: 'enemy-info', name: 'Enemy Info', cat: 'pvp', icon: 'crosshair', on: false, boostCutoff: 3,
    desc: 'Health and armor of the player you are looking at.',
    cfg: [toggle('armor', 'Show enemy armor', true), toggle('health', 'Show health', true)] },
  { id: 'zoom', name: 'Zoom', cat: 'utility', icon: 'search', on: true,
    desc: 'Smooth optical zoom on a hotkey.',
    cfg: [slider('factor', 'Zoom factor', 2, 10, 4, 'x'), toggle('smooth', 'Smooth camera', true), keybind('key', 'Zoom key', 'C')] },
  { id: 'fullbright', name: 'Fullbright', cat: 'utility', icon: 'eye', on: false,
    desc: 'Maximum gamma without editing files.',
    cfg: [slider('gamma', 'Gamma', 100, 1000, 400, '%')] },
  { id: 'time-changer', name: 'Time Changer', cat: 'utility', icon: 'clock', on: false, boostCutoff: 2,
    desc: 'Client-side time of day.',
    cfg: [select('time', 'Time', ['Default', 'Sunrise', 'Noon', 'Sunset', 'Midnight'])] },
  { id: 'motion-blur', name: 'Motion Blur', cat: 'utility', icon: 'camera', on: false, boostCutoff: 1,
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
  { id: 'scoreboard', name: 'Scoreboard', cat: 'hypixel', icon: 'list', on: true, boostCutoff: 4,
    desc: 'Restyle or hide the sidebar scoreboard.',
    cfg: [toggle('numbers', 'Hide red numbers', true), slider('scale', 'Scale', 50, 150, 100, '%')] },
  { id: 'auto-gg', name: 'Auto GG', cat: 'hypixel', icon: 'message', on: true,
    desc: 'Says "gg" when a game ends. Sportsmanship, automated.',
    cfg: [text('msg', 'Message', 'gg'), slider('delay', 'Delay', 0, 5, 1, 's')] },
  { id: 'bedwars-overlay', name: 'BedWars Overlay', cat: 'hypixel', icon: 'sword', isNew: true, on: false, boostCutoff: 3,
    desc: 'Stats overlay for BedWars lobbies.' },
  { id: 'quickplay', name: 'Quickplay', cat: 'hypixel', icon: 'zap', isNew: true, on: false,
    desc: 'Jump into any Hypixel game from one menu.' },
  { id: 'item-physics', name: 'Item Physics', cat: 'utility', icon: 'box', on: false, boostCutoff: 1,
    desc: 'Dropped items tumble realistically.' },
  { id: 'nametags', name: 'Nametags', cat: 'utility', icon: 'user', on: false, boostCutoff: 2,
    desc: 'Cleaner nametags, optional own tag.' },
  { id: 'chat-tweaks', name: 'Chat Tweaks', cat: 'utility', icon: 'message', on: true, boostCutoff: 3,
    desc: 'Copyable chat, saved history, clickable links, colors, timestamps, scale & background.',
    cfg: [toggle('timestamps', 'Timestamps', true), toggle('smooth', 'Smooth chat', true), toggle('copy', 'Click to copy', true),
      toggle('history', 'Keep history across worlds', true), toggle('links', 'Clickable links', true), toggle('colors', 'Colored messages', true),
      slider('scale', 'Chat scale', 50, 150, 100, '%'), slider('bg', 'Background opacity', 0, 100, 50, '%')] },
  { id: 'chat-filter', name: 'Chat Filter', cat: 'utility', icon: 'shield', on: false,
    desc: 'Hide messages matching your filter words; highlight mentions.',
    cfg: [text('words', 'Filtered words (comma-separated)', ''), toggle('mentions', 'Highlight mentions of your name', true), toggle('sound', 'Mention sound', true)] },
  { id: 'better-tab', name: 'Better Tab', cat: 'utility', icon: 'list', on: false, boostCutoff: 3,
    desc: 'Searchable, restyled tab player list with ping numbers.',
    cfg: [toggle('ping', 'Numeric ping', true), slider('rows', 'Max rows', 10, 80, 40)] },
  { id: 'waypoints', name: 'Waypoints', cat: 'utility', icon: 'compass', on: false, boostCutoff: 3,
    desc: 'Set, name and color waypoints; beam and distance in the world.',
    cfg: [keybind('key', 'New waypoint key', 'B'), toggle('deathpoint', 'Auto deathpoint', true)] },
  { id: 'minimap', name: 'Minimap', cat: 'utility', icon: 'grid', on: false, boostCutoff: 2,
    desc: 'Rotating minimap with entities, waypoints and cave mode.',
    cfg: [slider('size', 'Size', 80, 240, 140, 'px'), toggle('entities', 'Show entities', true), toggle('caves', 'Cave mode', false)] },
  { id: 'world-map', name: 'World Map', cat: 'utility', icon: 'globe', on: false, boostCutoff: 1,
    desc: 'Fullscreen explored-world map, shared with the minimap.',
    cfg: [keybind('key', 'Open map', 'M')] },
  { id: 'inventory-tweaks', name: 'Inventory Tweaks', cat: 'utility', icon: 'package', on: false,
    desc: 'Sort, quick-stack to chests, auto-refill and inventory search.',
    cfg: [keybind('sortKey', 'Sort key', 'R'), toggle('quickStack', 'Quick-stack button in chests', true), toggle('refill', 'Auto-refill hotbar', true), toggle('search', 'Inventory search bar', true)] },
  { id: 'item-scroller', name: 'Item Scroller', cat: 'utility', icon: 'rotate', on: false,
    desc: 'Move item stacks with the scroll wheel, drag to mass-move.' },
  { id: 'shulker-preview', name: 'Shulker Preview', cat: 'utility', icon: 'gift', on: false,
    desc: 'See shulker box and bundle contents in the tooltip.',
    cfg: [toggle('bundles', 'Also preview bundles', true)] },
  { id: 'tooltips-plus', name: 'Better Tooltips', cat: 'utility', icon: 'info', on: false,
    desc: 'Durability, enchant details, food stats and item IDs in tooltips.',
    cfg: [toggle('durability', 'Show durability', true), toggle('food', 'Show food stats', true), toggle('ids', 'Show item IDs', false)] },
  { id: 'screenshot-tool', name: 'Screenshot Tool', cat: 'utility', icon: 'camera', on: true,
    desc: 'Instant preview after F2 with copy, share and folder shortcuts.',
    cfg: [keybind('key', 'Screenshot key', 'F2'), toggle('preview', 'Show preview popup', true)] },
  { id: 'replay', name: 'Replay', cat: 'utility', icon: 'screenshot', on: false, boostCutoff: 1,
    desc: 'Record sessions, free camera, slow motion, camera paths — UI for the Replay Mod (installable below).',
    cfg: [toggle('autoRecord', 'Record automatically', false), slider('slowmo', 'Slow-motion factor', 10, 100, 50, '%'), keybind('key', 'Replay menu', 'F8')] },
  { id: 'voice', name: 'Voice Chat', cat: 'utility', icon: 'headset', on: false,
    desc: 'Mic, volume, push-to-talk, channels, friends-only & per-player mute — UI for Simple Voice Chat (installable below).',
    cfg: [select('mic', 'Microphone', ['Default', 'Device 1', 'Device 2']), slider('volume', 'Voice volume', 0, 100, 80, '%'),
      slider('range', 'Voice range', 8, 64, 48, ' blocks'), toggle('ptt', 'Push-to-talk', true), keybind('pttKey', 'Push-to-talk key', 'V'),
      select('channel', 'Channel', ['Proximity', 'Group 1', 'Group 2', 'Friends']), toggle('friendsOnly', 'Hear friends only', false)] },
  { id: 'discord-rpc', name: 'Discord Rich Presence', cat: 'utility', icon: 'gamepad', on: false,
    desc: 'Show server and game state in your Discord status. Local IPC only — nothing is sent anywhere else.',
    cfg: [toggle('showServer', 'Show current server', true), toggle('showVersion', 'Show version', true)] },
  { id: 'memory', name: 'Memory Display', cat: 'hud', icon: 'cpu', on: false, boostCutoff: 4,
    desc: 'RAM usage of the game process.' },
  { id: 'session-timer', name: 'Session Timer', cat: 'hud', icon: 'clock', on: false, boostCutoff: 4,
    desc: 'How long you have been playing.' },
  { id: 'server-address', name: 'Server Address', cat: 'hud', icon: 'globe', on: false, boostCutoff: 4,
    desc: 'Current server IP on screen.' },
  { id: 'render-optimizer', name: 'Render Optimizer', cat: 'performance', icon: 'zap', on: true, boostForceOn: true,
    desc: 'Sodium-class rendering pipeline optimizations.',
    cfg: [select('quality', 'Preset', ['Quality', 'Balanced', 'Max FPS'], 'Balanced'), slider('chunks', 'Chunk update budget', 1, 16, 6)] },
  { id: 'tick-optimizer', name: 'Tick Optimizer', cat: 'performance', icon: 'cpu', on: true, boostForceOn: true,
    desc: 'Lithium-class game-logic optimizations.' },
  { id: 'dynamic-fps', name: 'Dynamic FPS', cat: 'performance', icon: 'monitor', on: true, boostForceOn: true,
    desc: 'Reduces FPS when the window is unfocused.',
    cfg: [slider('idleFps', 'Unfocused FPS cap', 1, 60, 10)] },
  { id: 'fast-chunks', name: 'Fast Chunks', cat: 'performance', icon: 'layers', isNew: true, on: false, boostForceOn: true,
    desc: 'Async chunk building for faster world loads.' },
];

/* -------------------------------------------------------------- fps boost */
/* A single dial that trades visuals for frames: each step force-disables
   more built-in modules (boostCutoff, see MODS above) and HUD elements
   (boostCutoff, see HUD_DEFAULTS below) — without touching the user's own
   on/off choice, so turning the dial back down restores everything. */

export const FPS_BOOST_LEVELS = [
  { id: 'off', label: 'Off', tip: 'Nothing forced off — full HUD and every built-in module runs as you configured it.' },
  { id: 'low', label: 'Low', tip: 'Turns off a few purely cosmetic touches: item physics, motion blur, direction & speed HUD.' },
  { id: 'medium', label: 'Medium', tip: 'Also drops camera cinematics, nametag cosmetics, relighting, and the combo/reach HUD.' },
  { id: 'high', label: 'High', tip: 'Only core PvP HUD and modules remain — clock, keystrokes and most overlays are off.' },
  { id: 'extra', label: 'Extra', tip: 'Not recommended — disables almost everything. The game is just barely still playable.' },
  { id: 'extraHigh', label: 'Extra High', tip: 'Only use for FPS tests — disables everything except the FPS counter itself.' },
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

/* --------------------------------------------------------- recommended pack */
/* The pre-configured Fabric mod collection — the "biggest difference to a
   plain setup". Real Modrinth slugs, installed as plain jars into the
   profile's mods/ folder with required dependencies resolved automatically. */

export const RECOMMENDED_PACK = [
  { group: 'Performance', items: [
    { slug: 'sodium', name: 'Sodium', note: 'The rendering engine — biggest FPS win' },
    { slug: 'lithium', name: 'Lithium', note: 'Game-logic optimizations, vanilla-identical' },
    { slug: 'ferrite-core', name: 'FerriteCore', note: 'Big memory-usage reduction' },
    { slug: 'modernfix', name: 'ModernFix', note: 'Faster launch, lower RAM, bug fixes' },
    { slug: 'entityculling', name: 'Entity Culling', note: 'Skip rendering hidden entities' },
    { slug: 'moreculling', name: 'More Culling', note: 'Cull more block faces & particles' },
    { slug: 'dynamic-fps', name: 'Dynamic FPS', note: 'Idle FPS drop when unfocused' },
    { slug: 'krypton', name: 'Krypton', note: 'Network stack optimizations' },
    { slug: 'memoryleakfix', name: 'Memory Leak Fix', note: 'Patches known memory leaks' },
    { slug: 'lazydfu', name: 'LazyDFU', note: 'Faster startup (older versions)' },
    { slug: 'fastquit', name: 'FastQuit', note: 'Leave worlds without the saving wait' },
    { slug: 'no-chat-reports', name: 'No Chat Reports', note: 'Strips chat-report metadata' },
  ] },
  { group: 'Graphics', items: [
    { slug: 'iris', name: 'Iris Shaders', note: 'Shader support (OptiFine-compatible packs)' },
    { slug: 'indium', name: 'Indium', note: 'Sodium compatibility for rendering-API mods' },
    { slug: 'continuity', name: 'Continuity', note: 'Connected textures' },
    { slug: 'lambdynamiclights', name: 'LambDynamicLights', note: 'Held torches light the world' },
    { slug: 'zoomify', name: 'Zoomify', note: 'Smooth configurable zoom' },
  ] },
  { group: 'Quality of Life', items: [
    { slug: 'modmenu', name: 'Mod Menu', note: 'In-game mod list & config screens' },
    { slug: 'cloth-config', name: 'Cloth Config', note: 'Config library many mods need' },
    { slug: 'appleskin', name: 'AppleSkin', note: 'Hunger & saturation preview' },
    { slug: 'betterf3', name: 'BetterF3', note: 'Readable, configurable debug HUD' },
    { slug: 'jade', name: 'Jade', note: '"What am I looking at" tooltips' },
    { slug: 'emi', name: 'EMI', note: 'Recipe viewer' },
    { slug: 'inventory-profiles-next', name: 'Inventory Profiles Next', note: 'Sorting & inventory tools' },
    { slug: 'shulkerboxtooltip', name: 'Shulker Box Tooltip', note: 'Preview shulker contents' },
    { slug: 'better-stats', name: 'Better Statistics Screen', note: 'Useful stats screen' },
    { slug: 'mouse-tweaks', name: 'Mouse Tweaks', note: 'Better drag & scroll in inventories' },
    { slug: 'chat-heads', name: 'Chat Heads', note: 'Player heads next to chat messages' },
  ] },
];

/* ---------------------------------------------------------------- keybinds */
/* Central client shortcuts — shown in Settings and the in-game overlay. */

export const KEYBIND_ACTIONS = [
  { id: 'overlay', label: 'Open in-game overlay', def: 'RShift' },
  { id: 'zoom', label: 'Zoom', def: 'C' },
  { id: 'freelook', label: 'Freelook', def: 'LAlt' },
  { id: 'freecam', label: 'Freecam', def: 'F4' },
  { id: 'screenshot', label: 'Screenshot', def: 'F2' },
  { id: 'fullbright', label: 'Toggle Fullbright', def: 'G' },
  { id: 'emotes', label: 'Emote wheel', def: 'B' },
  { id: 'ptt', label: 'Voice push-to-talk', def: 'V' },
  { id: 'hudEditor', label: 'HUD editor', def: 'H' },
  { id: 'worldMap', label: 'World map', def: 'M' },
];

/* -------------------------------------------------------------- cosmetics */

export const COSMETICS = [
  { id: 'cape-horus', cat: 'cape', name: 'Horus Classic', base: '#7a1f2b', alt: '#e8394a', pattern: 'horus', seed: 3 },
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
  { id: 'emote-sit', cat: 'emote', name: 'Sit', anim: 'sit' },
  { id: 'emote-cheer', cat: 'emote', name: 'Cheer', anim: 'cheer' },
  { id: 'emote-dance', cat: 'emote', name: 'Dance', anim: 'dance' },
  { id: 'emote-clap', cat: 'emote', name: 'Clap', anim: 'clap' },
  { id: 'emote-point', cat: 'emote', name: 'Point', anim: 'point' },
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
/* Grouped like the in-game editor: Performance · PvP · Movement · Player ·
   World · Misc. Every element is draggable/scalable/colorable; boostCutoff
   is the FPS-Boost level at which it is force-hidden (fps never hides). */

export const HUD_GROUPS = [
  { id: 'performance', label: 'Performance' },
  { id: 'pvp', label: 'PvP' },
  { id: 'movement', label: 'Movement' },
  { id: 'player', label: 'Player' },
  { id: 'world', label: 'World' },
  { id: 'misc', label: 'Misc' },
];

export const HUD_DEFAULTS = [
  /* performance */
  { id: 'fps', label: 'FPS', group: 'performance', x: 2.5, y: 3, on: true, scale: 1, color: '#ffffff', boxed: true },
  { id: 'avgfps', label: 'Avg FPS', group: 'performance', x: 9, y: 3, on: false, scale: 1, color: '#c9d4e8', boxed: true, boostCutoff: 4 },
  { id: 'fpsgraph', label: 'FPS Graph', group: 'performance', x: 2.5, y: 24, on: false, scale: 1, color: '#5ad391', boxed: true, boostCutoff: 1 },
  { id: 'ping', label: 'Ping', group: 'performance', x: 2.5, y: 17, on: true, scale: 1, color: '#ffffff', boxed: true, boostCutoff: 5 },
  { id: 'tps', label: 'TPS', group: 'performance', x: 9, y: 17, on: false, scale: 1, color: '#ffffff', boxed: true, boostCutoff: 4 },
  { id: 'ram', label: 'RAM Usage', group: 'performance', x: 2.5, y: 31, on: false, scale: 1, color: '#ffffff', boxed: true, boostCutoff: 4 },
  { id: 'cpu', label: 'CPU Usage', group: 'performance', x: 2.5, y: 38, on: false, scale: 1, color: '#ffffff', boxed: true, boostCutoff: 4 },
  /* pvp */
  { id: 'cps', label: 'CPS (L | R)', group: 'pvp', x: 2.5, y: 10, on: true, scale: 1, color: '#ffffff', boxed: true, boostCutoff: 5 },
  { id: 'combo', label: 'Combo Counter', group: 'pvp', x: 45, y: 62, on: false, scale: 1.2, color: '#ffd35b', boxed: false, boostCutoff: 2 },
  { id: 'reach', label: 'Reach', group: 'pvp', x: 45, y: 70, on: false, scale: 1, color: '#ffffff', boxed: true, boostCutoff: 2 },
  { id: 'clickhistory', label: 'Click History', group: 'pvp', x: 9, y: 10, on: false, scale: 1, color: '#ffffff', boxed: true, boostCutoff: 2 },
  { id: 'hits', label: 'Hit Counter', group: 'pvp', x: 45, y: 78, on: false, scale: 1, color: '#ff9b9b', boxed: true, boostCutoff: 2 },
  /* movement */
  { id: 'coords', label: 'Coordinates (XYZ)', group: 'movement', x: 2.5, y: 88, on: true, scale: 1, color: '#ffffff', boxed: true, boostCutoff: 4 },
  { id: 'direction', label: 'Direction', group: 'movement', x: 45, y: 3, on: false, scale: 1, color: '#ffffff', boxed: true, boostCutoff: 1 },
  { id: 'speed', label: 'Speed', group: 'movement', x: 2.5, y: 60, on: false, scale: 1, color: '#9be8ff', boxed: true, boostCutoff: 1 },
  { id: 'height', label: 'Y Level', group: 'movement', x: 2.5, y: 81, on: false, scale: 1, color: '#ffffff', boxed: true, boostCutoff: 1 },
  { id: 'chunk', label: 'Chunk Coords', group: 'movement', x: 2.5, y: 95, on: false, scale: 1, color: '#c9d4e8', boxed: true, boostCutoff: 1 },
  { id: 'biome', label: 'Biome', group: 'movement', x: 14, y: 88, on: false, scale: 1, color: '#a8e8b0', boxed: true, boostCutoff: 2 },
  /* player */
  { id: 'armor', label: 'Armor Status', group: 'player', x: 84, y: 26, on: true, scale: 1, color: '#ffffff', boxed: true, boostCutoff: 4 },
  { id: 'itemdur', label: 'Item Durability', group: 'player', x: 84, y: 47, on: false, scale: 1, color: '#ffffff', boxed: true, boostCutoff: 3 },
  { id: 'hunger', label: 'Hunger', group: 'player', x: 60, y: 88, on: false, scale: 1, color: '#f0b46a', boxed: true, boostCutoff: 4 },
  { id: 'health', label: 'Health', group: 'player', x: 33, y: 88, on: false, scale: 1, color: '#ff6a6a', boxed: true, boostCutoff: 4 },
  { id: 'xpbar', label: 'XP Bar', group: 'player', x: 40, y: 82, on: false, scale: 1, color: '#7ce860', boxed: false, boostCutoff: 3 },
  { id: 'level', label: 'XP Level', group: 'player', x: 48.5, y: 76, on: false, scale: 1, color: '#7ce860', boxed: false, boostCutoff: 3 },
  { id: 'totems', label: 'Totem Counter', group: 'player', x: 55, y: 70, on: false, scale: 1, color: '#ffe08a', boxed: true, boostCutoff: 3 },
  /* world */
  { id: 'clock', label: 'Time', group: 'world', x: 88, y: 3, on: true, scale: 1, color: '#ffffff', boxed: true, boostCutoff: 3 },
  { id: 'playtime', label: 'Playtime', group: 'world', x: 88, y: 10, on: false, scale: 1, color: '#c9d4e8', boxed: true, boostCutoff: 2 },
  { id: 'weather', label: 'Weather', group: 'world', x: 81, y: 3, on: false, scale: 1, color: '#9be8ff', boxed: true, boostCutoff: 2 },
  { id: 'moon', label: 'Moon Phase', group: 'world', x: 81, y: 10, on: false, scale: 1, color: '#d8d4f8', boxed: true, boostCutoff: 1 },
  /* misc */
  { id: 'keystrokes', label: 'Keystrokes', group: 'misc', x: 84, y: 56, on: true, scale: 1, color: '#ffffff', boxed: false, boostCutoff: 3 },
  { id: 'potions', label: 'Potion Effects', group: 'misc', x: 84, y: 80, on: true, scale: 1, color: '#ffffff', boxed: true, boostCutoff: 4 },
  { id: 'date', label: 'Date', group: 'misc', x: 94, y: 10, on: false, scale: 1, color: '#c9d4e8', boxed: true, boostCutoff: 2 },
  { id: 'bossbar', label: 'Boss Bar', group: 'misc', x: 38, y: 8, on: false, scale: 1, color: '#c86aff', boxed: false, boostCutoff: 3 },
  { id: 'sneak', label: 'Sneak Indicator', group: 'misc', x: 45, y: 94, on: false, scale: 1, color: '#ffffff', boxed: true, boostCutoff: 2 },
  { id: 'sprint', label: 'Sprint Indicator', group: 'misc', x: 52, y: 94, on: false, scale: 1, color: '#ffffff', boxed: true, boostCutoff: 2 },
  { id: 'tablist', label: 'Tab List', group: 'misc', x: 36, y: 16, on: false, scale: 1, color: '#ffffff', boxed: true, boostCutoff: 2 },
  { id: 'scoreboardhud', label: 'Scoreboard', group: 'misc', x: 80, y: 34, on: false, scale: 1, color: '#ffffff', boxed: true, boostCutoff: 3 },
  { id: 'chathud', label: 'Chat', group: 'misc', x: 2.5, y: 68, on: false, scale: 1, color: '#ffffff', boxed: true, boostCutoff: 3 },
  { id: 'serverip', label: 'Server IP', group: 'misc', x: 88, y: 95, on: false, scale: 1, color: '#8b93a8', boxed: false, boostCutoff: 3 },
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
  { id: 'bedrock', label: 'Bedrock Edition' },
];

export const LOADER_COLORS = {
  vanilla: 'linear-gradient(135deg,#5e8d4a,#3c5c30)',
  fabric: 'linear-gradient(135deg,#c9b78a,#8d7c53)',
  forge: 'linear-gradient(135deg,#465a7c,#2c3a52)',
  neoforge: 'linear-gradient(135deg,#c46231,#8a3f1c)',
  quilt: 'linear-gradient(135deg,#9b59d0,#5f3382)',
  bedrock: 'linear-gradient(135deg,#7a7a82,#4a4a52)',
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
    fpsBoost: 'off',
    resolution: 'auto',
    fullscreen: false,
    javaPath: '',
    jvmArgs: '',
    gameDir: '',
    proxy: '',
    downloadConcurrency: 4,
    metaMirror: '',
    curseforgeKey: '',
    contentRegistry: '',
    contentAdmin: true,
    autoUpdateContent: true,
    theme: 'dark',
    accountName: 'Player',
    accountType: 'offline',
    msaClientId: '',
    selectedProfile: 'p-main',
    /* video/audio — written into the game's options.txt at launch;
       0 / -1 / 'leave' = don't touch what the player set in-game */
    applyVideoSettings: true,
    renderDistance: 0,
    simulationDistance: 0,
    guiScale: 'leave',
    brightness: -1,
    mouseSensitivity: -1,
    masterVolume: -1,
    particles: 'leave',
    /* saved accounts & servers, client keybinds, module presets */
    accounts: [],
    servers: [],
    keybinds: {},
    modProfiles: {},
  };
}
