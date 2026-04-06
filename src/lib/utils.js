export function today() { return new Date().toISOString().slice(0, 10); }
export function isoNow() { return new Date().toISOString(); }
export function shuffle(a) {
  let c = [...a];
  for (let i = c.length - 1; i > 0; i--) {
    let j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}
export function vibrate(ms) {
  try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
}
export function fmtTime(s) {
  let m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return m + 'm ' + sec + 's';
}
export function fmtTimer(ms) {
  let tot = Math.max(0, Math.ceil(ms / 1000));
  let m = Math.floor(tot / 60), s = tot % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
export function pct(n, d) { return d ? Math.round(n / d * 100) : 0; }
export function arrEq(a, b) {
  if (a.length !== b.length) return false;
  let sa = [...a].sort(), sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}
