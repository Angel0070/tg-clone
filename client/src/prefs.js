const get = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } };
export const prefs = { theme: get('theme', 'auto'), fx: get('fx', true), fs: get('fs', 15), sound: get('sound', true), notify: get('notify', false), muted: get('muted', []), mutedUntil: get('mutedUntil', {}) };
export function applyPrefs() {
  const r = document.documentElement;
  if (prefs.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', prefs.theme);
  r.classList.toggle('no-fx', !prefs.fx);
  r.style.setProperty('--fs', prefs.fs + 'px');
}
export function savePref(k, v) {
  prefs[k] = v;
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
  applyPrefs();
}
export function beep() {
  try {
    const c = new AudioContext(); const o = c.createOscillator(); const g = c.createGain();
    o.connect(g); g.connect(c.destination); o.frequency.value = 880;
    g.gain.setValueAtTime(0.08, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.25);
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
