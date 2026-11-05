/* ---------- Иконки (нарисованы SVG-путями) ---------- */
export const FILL = { fill: 'currentColor', stroke: 'none' };
export const ICONS = {
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.5-4.5" /></>,
  group: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M16 11h6" /></>,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  back: <path d="M15 18l-6-6 6-6" />,
  clip: <path d="M21.4 11l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" />,
  smile: <><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" /></>,
  mic: <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" /></>,
  send: <><path d="M3 11.5L20.5 4 14 20l-3.2-6.3L3 11.5z" /><path d="M10.8 13.7L20.5 4" /></>,
  check: <path d="M20 6L9 17l-5-5" />,
  dcheck: <><path d="M2 12.5L7 17.5 16.5 7" /><path d="M11 15l2.5 2.5L22 7" /></>,
  reply: <><path d="M9 14L4 9l5-5" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></>,
  copy: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  edit: <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
  trash: <><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" /></>,
  play: <path d="M7 4.5v15l12-7.5z" {...FILL} />,
  pause: <><rect x="6" y="4.5" width="4" height="15" rx="1.2" {...FILL} /><rect x="14" y="4.5" width="4" height="15" rx="1.2" {...FILL} /></>,
  camera: <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>,
};
export const Icon = ({ n, size = 22 }) => (
  <svg className="ic" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICONS[n]}</svg>);


Object.assign(ICONS, {
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  more: <path d="M12 5h.01M12 12h.01M12 19h.01" strokeWidth="3" />,
  chev: <path d="M9 18l6-6-6-6" />,
  down: <path d="M12 5v14M19 12l-7 7-7-7" />,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  paw: <><circle cx="6.5" cy="11" r="1.7" /><circle cx="10" cy="6.5" r="1.7" /><circle cx="14" cy="6.5" r="1.7" /><circle cx="17.5" cy="11" r="1.7" /><path d="M12 12c-2.6 0-5 3.2-5 5.3 0 1.7 1.6 2.2 2.8 1.8 1-.4 1.6-.6 2.2-.6s1.2.2 2.2.6c1.2.4 2.8-.1 2.8-1.8 0-2.1-2.4-5.3-5-5.3z" /></>,
  apple: <><path d="M12 8c-2-2-6-1-6 4 0 4 2.5 9 5 9 .8 0 .8-.4 1-.4s.2.4 1 .4c2.5 0 5-5 5-9 0-5-4-6-6-4z" /><path d="M12 8c0-2 1-3.500 3-4" /></>,
  car: <><path d="M5 16l1.500-5a2 2 0 0 1 2-1.500h7a2 2 0 0 1 2 1.500L19 16" /><rect x="3" y="16" width="18" height="3.500" rx="1" /><path d="M7 19.500V21M17 19.500V21" /></>,
  ball: <><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18M5.600 5.600c3 3 3 9.800 0 12.800M18.400 5.600c-3 3-3 9.800 0 12.800" /></>,
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.500 10.900c.6.5 1 1.200 1 2.100h5c0-.9.4-1.600 1-2.100A6 6 0 0 0 12 3z" />,
  hash: <path d="M5 9h14M5 15h14M10 4L8 20M16 4l-2 16" />,
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  backspace: <path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1zM17 9l-6 6M11 9l6 6" />,
  bookmark: <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
  user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  users: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.900M16 3.100a4 4 0 0 1 0 7.800" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.900 4.900l2.100 2.100M17 17l2.100 2.100M4.900 19.100L7 17M17 7l2.100-2.100" /></>,
  moon: <path d="M21 12.800A9 9 0 1 1 11.200 3 7 7 0 0 0 21 12.800z" />,
  help: <><circle cx="12" cy="12" r="10" /><path d="M9.100 9a3 3 0 0 1 5.800 1c0 2-3 3-3 3M12 17h.01" /></>,
  bug: <path d="M8 8a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0zM4 13h4M16 13h4M5 7l3 2M19 7l-3 2M5 20l3-2M19 20l-3-2" />,
  megaphone: <path d="M3 11v2a1 1 0 0 0 1 1h2l8 4V6L6 10H4a1 1 0 0 0-1 1zM18 9a4 4 0 0 1 0 6" />,
  volume: <path d="M11 5L6 9H2v6h4l5 4zM15.500 8.500a5 5 0 0 1 0 7" />,
  volumeoff: <path d="M11 5L6 9H2v6h4l5 4zM23 9l-6 6M17 9l6 6" />,
  music: <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.500" cy="8.500" r="1.500" /><path d="M21 15l-5-5L5 21" /></>,
  fileic: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6" />,
  bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.700 21a2 2 0 0 1-3.400 0" />,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z" /></>,
  devices: <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>,
  bolt: <path d="M13 2L3 14h9l-1 8 10-12h-9z" />,
  sliders: <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />,
  link: <path d="M10 13a5 5 0 0 0 7.100 0l3-3a5 5 0 0 0-7.100-7.100l-1.700 1.700M14 11a5 5 0 0 0-7.100 0l-3 3A5 5 0 0 0 11 21.100l1.700-1.700" />,
});
Object.assign(ICONS, {
  plus: <path d="M12 5v14M5 12h14" />,
  sticker: <><path d="M15 3H6a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h6l9-9V6a3 3 0 0 0-3-3h-3z" /><path d="M21 12h-5a3 3 0 0 0-3 3v6M8.500 9h.01M13.500 9h.01M8 13c1.200 1.100 3.200 1.100 4.500 0" /></>,
  gif: <><rect x="2" y="6" width="20" height="12" rx="3" /><path d="M8.500 10.500H7a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1h1.500v-1.200H7.500M11.500 10.500v3M14.500 13.500v-3h2M14.500 12h1.500" /></>,
  checkc: <><circle cx="12" cy="12" r="9" /><path d="M8 12.500l3 3 5-6" /></>,
  block: <><circle cx="12" cy="12" r="9" /><path d="M5.600 5.600l12.800 12.800" /></>,
});
Object.assign(ICONS, {
  lock: <><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  pie: <><path d="M21 12A9 9 0 1 1 12 3v9z" /><path d="M15 3.500A9 9 0 0 1 20.500 9H15z" /></>,
  palette: <><circle cx="12" cy="12" r="9" /><circle cx="8" cy="10" r="1" /><circle cx="12" cy="7.500" r="1" /><circle cx="16" cy="10" r="1" /><path d="M12 21a2 2 0 0 1 0-4 2 2 0 0 0 2-2" /></>,
  star: <path d="M12 3l2.700 5.600 6.100.9-4.400 4.300 1 6.100L12 17l-5.400 2.900 1-6.100L3.200 9.500l6.100-.9z" />,
});
Object.assign(ICONS, {
  pin: <path d="M12 17v5M9 3h6l-1 6 4 4v2H6v-2l4-4z" />,
  pinoff: <><path d="M12 17v5M9 3h6l-1 6 4 4v2H6v-2l4-4z" /><path d="M3 3l18 18" /></>,
  forward: <path d="M15 4l6 6-6 6M21 10H9a5 5 0 0 0-5 5v5" />,
  heart: <path d="M20.800 4.600a5.500 5.500 0 0 0-7.800 0L12 5.700l-1-1.100a5.500 5.500 0 0 0-7.800 7.800l1 1.100L12 21l7.800-7.500 1-1.100a5.500 5.500 0 0 0 0-7.800z" />,
  eye: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></>,
  phone: <path d="M22 16.900v3a2 2 0 0 1-2.200 2 19.800 19.800 0 0 1-8.600-3.100 19.500 19.500 0 0 1-6-6A19.800 19.800 0 0 1 2.100 4.200 2 2 0 0 1 4.100 2h3a2 2 0 0 1 2 1.700c.1 1 .4 1.900.7 2.800a2 2 0 0 1-.5 2.100L8.100 9.900a16 16 0 0 0 6 6l1.300-1.300a2 2 0 0 1 2.100-.4c.9.3 1.800.6 2.800.7a2 2 0 0 1 1.700 2z" />,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
  cake: <path d="M4 21h16M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7M12 12V8M12 5h.01M8 12V9.500M16 12V9.500" />,
});
Object.assign(ICONS, {
  video: <><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="2" /></>,
  videooff: <><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.700 0H14a2 2 0 0 1 2 2v3.300l1 1L23 7v10" /><path d="M1 1l22 22" /></>,
  micoff: <><path d="M1 1l22 22M9 9v3a3 3 0 0 0 5.100 2.100M15 9.300V4a3 3 0 0 0-5.900-.7" /><path d="M17 16.900A7 7 0 0 1 5 12v-2M19 10v2a7 7 0 0 1-.1 1.200M12 19v4M8 23h8" /></>,
  screen: <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" /></>,
  endcall: <g transform="rotate(135 12 12)">{ICONS.phone}</g>,
  maximize: <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />,
  minimize: <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />,
});
