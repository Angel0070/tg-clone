const get = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } };
const D = {
  theme: 'auto', fx: true, fs: 16, h12: false, sendMode: 'enter', autoText: true, titleChat: true,
  fxSend: true, fxDel: true, fxMenu: true, fxBlur: true, fxPanel: true, fxChat: true, fxMedia: true, autoGif: true,
  volume: 5, notify: false, stkSuggest: true,
  n_direct: true, n_group: true, n_channel: true, pv_direct: true, pv_group: true, pv_channel: true,
  ap_direct: true, ap_group: true, ap_channel: true, av_direct: true, av_group: true, av_channel: true,
  muted: [], mutedUntil: {}, tabsPos: 'top', lang: 'ru',
  wall: { type: 'default', value: '', blur: false, pat: 75 },
  folders: [{ id: 'f-direct', name: 'Личные', kind: 'direct' }, { id: 'f-group', name: 'Группы', kind: 'group' }, { id: 'f-channel', name: 'Каналы', kind: 'channel' }],
};
export const prefs = Object.fromEntries(Object.entries(D).map(([k, d]) => [k, get(k, d)]));
const FX = { fxSend: 'no-send', fxDel: 'no-del', fxMenu: 'no-menu', fxBlur: 'no-blur', fxPanel: 'no-panel', fxChat: 'no-chat', fxMedia: 'no-media' };
export function applyPrefs() {
  const r = document.documentElement;
  if (prefs.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', prefs.theme);
  r.classList.toggle('no-fx', !prefs.fx);
  for (const [k, c] of Object.entries(FX)) r.classList.toggle(c, !prefs[k]);
  r.style.setProperty('--fs', prefs.fs + 'px');
  const w = prefs.wall;
  r.style.setProperty('--wall', w.type === 'image' ? `url("${w.value}")` : w.type === 'default' ? 'none' : w.value);
  r.style.setProperty('--wblur', w.blur ? '10px' : '0px');
  r.style.setProperty('--patop', String((w.pat ?? 75) / 100));
}
export function savePref(k, v) {
  prefs[k] = v;
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
  applyPrefs();
}
export function beep(vol = 0.5) {
  try {
    const c = new AudioContext(); const o = c.createOscillator(); const g = c.createGain();
    o.connect(g); g.connect(c.destination); o.frequency.value = 880;
    g.gain.setValueAtTime(0.02 + 0.3 * vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.25);
    o.start(); o.stop(c.currentTime + 0.26); setTimeout(() => c.close(), 400);
  } catch {}
}
export const isMuted = (id) => prefs.muted.includes(id) || (prefs.mutedUntil[id] || 0) > Date.now();
export function setMute(id, ms) { // ms: 0 — включить звук, Infinity — навсегда
  const until = { ...prefs.mutedUntil }; delete until[id];
  const muted = prefs.muted.filter((x) => x !== id);
  if (ms === Infinity) muted.push(id); else if (ms > 0) until[id] = Date.now() + ms;
  savePref('muted', muted); savePref('mutedUntil', until);
}
