import { ic } from '../icons/icons.js';
import { showModalRaw, hideModal } from './modal.js';

let _helpPrevFocus = null;

export function showHelpModal() {
  _helpPrevFocus = document.activeElement;
  let html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">';
  html += '<div style="font-weight:700;font-size:1rem;display:flex;align-items:center;gap:8px">' + ic('keyboard') + ' 键盘快捷键</div>';
  html += '<button id="helpCloseBtn" class="btn btn-ghost btn-sm" aria-label="关闭">✕</button>';
  html += '</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px">';
  let rows = [
    ['A–G', '选择选项'],
    ['↑↓', '移动选项焦点'],
    ['Enter', '选中 / 提交'],
    ['Space', '选中焦点选项'],
    ['←→', '上 / 下一题'],
    ['F', '切换收藏 ★'],
    ['V', '查看解析（答题后）'],
    ['Tab', '顺序导航'],
    ['Shift+Alt+H', '打开本帮助'],
    ['Esc', '关闭帮助'],
  ];
  rows.forEach(function (r) {
    html += '<div class="shortcut-item"><span class="shortcut-key">' + r[0] + '</span> ' + r[1] + '</div>';
  });
  html += '</div>';
  showModalRaw(html);
  let closeBtn = document.getElementById('helpCloseBtn');
  if (closeBtn) { closeBtn.onclick = closeHelpModal; closeBtn.focus(); }
  document.getElementById('modal').addEventListener('keydown', _helpTrap);
}

export function closeHelpModal() {
  document.getElementById('modal').removeEventListener('keydown', _helpTrap);
  hideModal();
  if (_helpPrevFocus) { try { _helpPrevFocus.focus(); } catch (e) {} }
  _helpPrevFocus = null;
}

function _helpTrap(e) {
  if (e.key === 'Escape') { closeHelpModal(); e.preventDefault(); return; }
  if (e.key !== 'Tab') return;
  let inner = document.getElementById('modalInner');
  let focusable = [...inner.querySelectorAll('button,input,select,textarea,[tabindex]:not([tabindex="-1"])')];
  if (!focusable.length) return;
  let first = focusable[0], last = focusable[focusable.length - 1];
  if (e.shiftKey) { if (document.activeElement === first) { last.focus(); e.preventDefault(); } }
  else { if (document.activeElement === last) { first.focus(); e.preventDefault(); } }
}

window.showHelpModal = showHelpModal;
window.closeHelpModal = closeHelpModal;
