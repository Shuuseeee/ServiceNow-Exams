export function $(s, p) { return (p || document).querySelector(s); }
export function $$(s, p) { return [...(p || document).querySelectorAll(s)]; }
export function h(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
export function flashEl(el) {
  if (!el) return;
  el.classList.remove('kb-flash');
  void el.offsetWidth;
  el.classList.add('kb-flash');
  el.addEventListener('animationend', () => el.classList.remove('kb-flash'), { once: true });
}
