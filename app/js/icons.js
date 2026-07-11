/* Compact inline SVG icon set (stroke-based, 24×24 viewBox). No icon font,
   no external requests — part of keeping Horus lightweight and offline-able. */

const S = (inner, extra = '') =>
  `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra} aria-hidden="true">${inner}</svg>`;

export const icons = {
  /* Eye of Horus — the client's mark. */
  logo: `<svg viewBox="0 0 32 32" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3.5 12.5C7.5 8 12 6 16 6s8.5 2 12.5 6.5"/>
    <path d="M4.5 16.5c3.5-4.2 7.5-6.3 11.5-6.3s8 2.1 11.5 6.3c-3.5 4.2-7.5 6.3-11.5 6.3S8 20.7 4.5 16.5z" stroke-width="1.8"/>
    <circle cx="16" cy="16.4" r="3.5" fill="currentColor" stroke="none"/>
    <circle cx="17.1" cy="15.3" r="0.9" fill="#0f1013" stroke="none"/>
    <path d="M10.7 22 8.2 27.5"/>
    <path d="M21.3 22c1.2 3.2 4.2 4.4 5.4 2.2.9-1.8-.6-3.6-2.7-3.2"/>
  </svg>`,

  home: S('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>'),
  library: S('<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>'),
  mods: S('<path d="M9 3.5a2 2 0 0 1 4 0V5h3a2 2 0 0 1 2 2v3h1.5a2 2 0 0 1 0 4H18v3a2 2 0 0 1-2 2h-3v-1.5a2 2 0 0 0-4 0V20H6a2 2 0 0 1-2-2v-3H5.5a2 2 0 0 0 0-4H4V7a2 2 0 0 1 2-2h3z"/>'),
  hud: S('<rect x="2.5" y="4" width="19" height="14" rx="2"/><path d="M6 8h4M6 11h2"/><rect x="14.5" y="12.5" width="4" height="2.5" rx="0.5"/><path d="M8 21h8"/>'),
  shirt: S('<path d="M16 4l4.5 2.5-1.6 3.6L17 9.3V20H7V9.3l-1.9.8L3.5 6.5 8 4a4 4 0 0 0 8 0z"/>'),
  users: S('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.7-3.4 3.3-5.5 6.5-5.5s5.8 2.1 6.5 5.5"/><circle cx="17.5" cy="9" r="2.6"/><path d="M16.8 14.6c2.6.3 4.3 2 4.7 4.9"/>'),
  camera: S('<path d="M4 7h3l1.5-2h7L17 7h3a1.5 1.5 0 0 1 1.5 1.5V18a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 18V8.5A1.5 1.5 0 0 1 4 7z"/><circle cx="12" cy="13" r="3.6"/>'),
  screenshot: S('<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3.4"/>'),
  settings: S('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M4.5 4.5l1.7 1.7M17.8 17.8l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.5 19.5l1.7-1.7M17.8 6.2l1.7-1.7"/>'),
  play: S('<path d="M7 4.5 19 12 7 19.5z" fill="currentColor" stroke="none"/>'),
  user: S('<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6"/>'),
  search: S('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>'),
  heart: S('<path d="M12 20.5s-7.8-4.7-9.3-9.6C1.6 7.4 4 4.5 7.1 4.5c2 0 3.8 1.1 4.9 2.9 1.1-1.8 2.9-2.9 4.9-2.9 3.1 0 5.5 2.9 4.4 6.4-1.5 4.9-9.3 9.6-9.3 9.6z"/>'),
  gear: S('<path d="M10.3 3.6a2 2 0 0 1 3.4 0l.5.9a2 2 0 0 0 2 1l1-.2a2 2 0 0 1 2.2 2.6l-.4 1a2 2 0 0 0 .5 2.1l.8.7a2 2 0 0 1 0 3l-.8.7a2 2 0 0 0-.5 2.1l.4 1a2 2 0 0 1-2.3 2.7l-1-.2a2 2 0 0 0-2 1l-.4.8a2 2 0 0 1-3.4 0l-.5-.9a2 2 0 0 0-2-1l-1 .2a2 2 0 0 1-2.2-2.6l.4-1a2 2 0 0 0-.5-2.1l-.8-.7a2 2 0 0 1 0-3l.8-.7a2 2 0 0 0 .5-2.1l-.4-1A2 2 0 0 1 6.9 5.3l1 .2a2 2 0 0 0 2-1z"/><circle cx="12" cy="12" r="2.6"/>'),
  x: S('<path d="M5.5 5.5l13 13M18.5 5.5l-13 13"/>'),
  plus: S('<path d="M12 5v14M5 12h14"/>'),
  check: S('<path d="m4.5 12.5 5 5L19.5 7"/>'),
  info: S('<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><circle cx="12" cy="7.6" r="0.4" fill="currentColor"/>'),
  alert: S('<path d="M12 3 22 20H2z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.4" r="0.4" fill="currentColor"/>'),
  folder: S('<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2.5h9A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>'),
  download: S('<path d="M12 3.5v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/>'),
  upload: S('<path d="M12 14.5v-11M7.5 8 12 3.5 16.5 8"/><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/>'),
  refresh: S('<path d="M20 5v5h-5"/><path d="M20 10a8 8 0 1 0 .6 4.5"/>'),
  trash: S('<path d="M4.5 6.5h15M9 6V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V6"/><path d="M6.5 6.5 7.4 20a1.5 1.5 0 0 0 1.5 1.4h6.2A1.5 1.5 0 0 0 16.6 20l.9-13.5"/><path d="M10 10.5v6M14 10.5v6"/>'),
  copy: S('<rect x="9" y="9" width="11.5" height="11.5" rx="1.5"/><path d="M5.5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5v1"/>'),
  edit: S('<path d="M16.7 3.8a2.1 2.1 0 0 1 3 3L8 18.5l-4.2 1.2L5 15.5z"/>'),
  dots: S('<circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/>'),
  chevD: S('<path d="m6 9.5 6 6 6-6"/>'),
  chevR: S('<path d="m9.5 6 6 6-6 6"/>'),
  clock: S('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  zap: S('<path d="M13.5 2.5 4.5 13.5h6l-1 8 9-11h-6z"/>'),
  cpu: S('<rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="10" y="10" width="4" height="4"/><path d="M9 2.5V6M15 2.5V6M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"/>'),
  wifi: S('<path d="M2.5 9.5C8 4.5 16 4.5 21.5 9.5M5.5 13c4-3.5 9-3.5 13 0M8.5 16.3c2.2-1.8 4.8-1.8 7 0"/><circle cx="12" cy="19.5" r="0.8" fill="currentColor"/>'),
  shield: S('<path d="M12 2.8 20 6v5.5c0 5-3.4 8.3-8 9.7-4.6-1.4-8-4.7-8-9.7V6z"/><path d="m8.7 11.7 2.4 2.4 4.4-4.6"/>'),
  globe: S('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.6 2.5 4 5.7 4 9s-1.4 6.5-4 9c-2.6-2.5-4-5.7-4-9s1.4-6.5 4-9z"/>'),
  moon: S('<path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z"/>'),
  compass: S('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z" fill="currentColor" stroke="none"/>'),
  box: S('<path d="m12 2.7 8.5 4.4v9.8L12 21.3l-8.5-4.4V7.1z"/><path d="M3.8 7.3 12 11.6l8.2-4.3M12 11.6v9.4"/>'),
  sword: S('<path d="M4 20l4-1 11.5-11.5L21 4l-3.5 1.5L6 17z"/><path d="m4 20 2.5-2.5"/>'),
  eye: S('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
  key: S('<circle cx="8" cy="15" r="4.5"/><path d="m11.5 11.5 8-8M17 6l3 3M14.5 8.5 17 11"/>'),
  message: S('<path d="M21 11.5c0 4.4-4 8-9 8-1.2 0-2.4-.2-3.4-.6L3 20.5l1.7-4A7.4 7.4 0 0 1 3 11.5c0-4.4 4-8 9-8s9 3.6 9 8z"/>'),
  gift: S('<rect x="3.5" y="8" width="17" height="4"/><path d="M5 12v8.5h14V12M12 8v12.5M12 8s-4.5.3-5.5-2C5.7 4 8 2.5 9.5 4c1.3 1.3 2.5 4 2.5 4zm0 0s4.5.3 5.5-2c.8-2-1.5-3.5-3-2-1.3 1.3-2.5 4-2.5 4z"/>'),
  list: S('<path d="M8.5 6h12M8.5 12h12M8.5 18h12"/><circle cx="4" cy="6" r="0.8" fill="currentColor"/><circle cx="4" cy="12" r="0.8" fill="currentColor"/><circle cx="4" cy="18" r="0.8" fill="currentColor"/>'),
  grid: S('<rect x="3.5" y="3.5" width="7" height="7" rx="1"/><rect x="13.5" y="3.5" width="7" height="7" rx="1"/><rect x="3.5" y="13.5" width="7" height="7" rx="1"/><rect x="13.5" y="13.5" width="7" height="7" rx="1"/>'),
  monitor: S('<rect x="2.5" y="4" width="19" height="13" rx="1.5"/><path d="M9 21h6M12 17.5V21"/>'),
  power: S('<path d="M12 3v8"/><path d="M6.5 6.5a8 8 0 1 0 11 0"/>'),
  terminal: S('<path d="m5 7 5 5-5 5M12 17.5h7"/>'),
  package: S('<path d="m12 2.7 8.5 4.4v9.8L12 21.3l-8.5-4.4V7.1z"/><path d="m7.5 5 8.6 4.5M3.8 7.3 12 11.6l8.2-4.3M12 11.6v9.4"/>'),
  layers: S('<path d="m12 3 9 5-9 5-9-5z"/><path d="m4.5 12.5 7.5 4 7.5-4M4.5 16.5l7.5 4 7.5-4"/>'),
  star: S('<path d="m12 3 2.7 5.8 6.3.8-4.6 4.3 1.2 6.2L12 17l-5.6 3.1 1.2-6.2L3 9.6l6.3-.8z"/>'),
  link: S('<path d="M10 14a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.1"/><path d="M14 10a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.1"/>'),
  logout: S('<path d="M15 4h4a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 19 20h-4M9.5 16.5 5 12l4.5-4.5M5 12h11"/>'),
  gamepad: S('<path d="M6.5 7h11A4.5 4.5 0 0 1 22 11.5l-.6 5A2.7 2.7 0 0 1 16.7 18L15 15.5H9L7.3 18a2.7 2.7 0 0 1-4.7-1.5l-.6-5A4.5 4.5 0 0 1 6.5 7z"/><path d="M7.5 10v3.5M5.7 11.7h3.6"/><circle cx="16" cy="10.7" r="0.7" fill="currentColor"/><circle cx="18.2" cy="12.7" r="0.7" fill="currentColor"/>'),
  apple: S('<path d="M12 6.5c2 0 3-1.5 3-3.5-2 0-3 1.5-3 3.5zm0 0c-1-1-3-1.4-4.5-.4C4.7 8 4.5 12.7 6.5 16.5c1.2 2.3 3 4 4.2 4 .9 0 1-.5 1.3-.5s.4.5 1.3.5c1.3 0 3-1.7 4.2-4 .6-1.2 1-2.5 1.2-3.8-2.7-1-3.3-4.9-.4-6.2C17 5 13.5 5 12 6.5z"/>'),
  bar: S('<rect x="3" y="9.5" width="18" height="5" rx="2.5"/><path d="M7 9.5v5"/>'),
  crosshair: S('<circle cx="12" cy="12" r="7.5"/><path d="M12 2.5V7M12 17v4.5M2.5 12H7M17 12h4.5"/>'),
  keyboard: S('<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6"/>'),
  drop: S('<path d="M12 3s6.5 7 6.5 11.5a6.5 6.5 0 1 1-13 0C5.5 10 12 3 12 3z"/>'),
  flame: S('<path d="M12 22c4 0 7-2.9 7-7 0-3-2-5.5-3.5-7C15 10 14 11 13 11c0-3-1-6.5-4-9 .5 3-.5 4.5-2 6.5S4.9 12 5 15c.1 4.1 3 7 7 7z"/>'),
  save: S('<path d="M5 3.5h11L20.5 8v11A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V5A1.5 1.5 0 0 1 5 3.5z"/><path d="M8 3.5V9h7V3.5M8 20.5V14h8v6.5"/>'),
  rotate: S('<path d="M4 10a8 8 0 0 1 14.9-2M20 14a8 8 0 0 1-14.9 2"/><path d="M18 3.5V8h-4.5M6 20.5V16h4.5"/>'),
  bell: S('<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
  winMin: S('<path d="M5 12h14"/>'),
  winMax: S('<rect x="5" y="5" width="14" height="14" rx="1.5"/>'),
  arrowL: S('<path d="M15 5l-7 7 7 7"/>'),
  arrowR: S('<path d="M9 5l7 7-7 7"/>'),
  idcard: S('<rect x="2.5" y="5" width="19" height="14" rx="2"/><circle cx="8" cy="11" r="2.2"/><path d="M4.8 16c.5-1.7 1.7-2.6 3.2-2.6s2.7.9 3.2 2.6"/><path d="M14.5 10h4M14.5 13h4"/>'),
  face: S('<circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10.5" r="0.6" fill="currentColor"/><circle cx="15.5" cy="10.5" r="0.6" fill="currentColor"/><path d="M8.5 14.5c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8"/>'),
  running: S('<circle cx="14" cy="5.5" r="1.8"/><path d="M13 9l-3 2 1 4-2 4M13 9l3 1 3-1M10 11l-3 1M13 13l3 3"/>'),
  headset: S('<path d="M5 13v-1a7 7 0 0 1 14 0v1"/><rect x="3.5" y="13" width="3.5" height="6" rx="1.5"/><rect x="17" y="13" width="3.5" height="6" rx="1.5"/><path d="M19 19a4 4 0 0 1-4 3.5h-2"/>'),
};

/** Return the SVG markup for an icon name (empty string if unknown). */
export function icon(name) {
  return icons[name] || '';
}
