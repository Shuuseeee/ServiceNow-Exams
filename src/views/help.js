import { ic } from '../icons/icons.js';
import { showModalRaw, hideModal } from './modal.js';
import { t } from '../i18n/t.js';

let _helpPrevFocus = null;

export function showHelpModal() {
  _helpPrevFocus = document.activeElement;
  let html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">';
  html += '<div style="font-weight:700;font-size:1rem;display:flex;align-items:center;gap:8px">' + ic('keyboard') + ' ' + t('help.title') + '</div>';
  html += '<button id="helpCloseBtn" class="btn btn-ghost btn-sm" aria-label="' + t('common.close') + '">✕</button>';
  html += '</div>';
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px">';
  let rows = [
    ['A–G', t('sc.select')],
    ['↑↓', t('sc.move')],
    ['Enter', t('sc.submit')],
    ['Space', t('sc.check')],
    ['←→', t('sc.nav')],
    ['F', t('sc.bookmark')],
    ['V', t('sc.expl')],
    ['Tab', t('sc.tab')],
    ['Shift+Alt+H', t('sc.openHelp')],
    ['Esc', t('sc.closeHelp')],
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
