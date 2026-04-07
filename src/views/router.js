import { state, saveState } from '../state/store.js';
import { ic } from '../icons/icons.js';
import { $, $$ } from '../lib/dom.js';
import { TABS } from '../state/constants.js';
import { t } from '../i18n/t.js';

const viewRenderers = {};

export function registerView(id, renderFn) {
  viewRenderers[id] = renderFn;
}

export function renderView(id) {
  if (viewRenderers[id]) viewRenderers[id]();
}

export function renderTabs() {
  let prevNavtab = document.activeElement && document.activeElement.dataset.navtab
    ? document.activeElement.dataset.navtab : null;
  let btm = '', top = '';
  TABS.forEach(tab => {
    let a = tab.id === state.curTab ? ' active' : '';
    let label = t(tab.labelKey);
    btm += '<div class="btab' + a + '" data-navtab="' + tab.id + '" tabindex="0">' + ic(tab.icon) + '<span>' + label + '</span></div>';
    top += '<button class="nav-tab' + a + '" data-navtab="' + tab.id + '">' + ic(tab.icon) + ' ' + label + '</button>';
  });
  $('#bottomtabs').innerHTML = btm;
  $('#desktopTabs').innerHTML = top;
  if (prevNavtab) {
    let el = document.querySelector('[data-navtab="' + prevNavtab + '"]');
    if (el) el.focus();
  }
}

// Event delegation - set up once
document.addEventListener('click', function (e) {
  let el = e.target.closest('[data-navtab]');
  if (el) {
    e.preventDefault();
    e.stopPropagation();
    switchTab(el.dataset.navtab);
  }
}, true);

export function switchTab(id) {
  if (state.examActive && id !== 'exam') {
    if (!confirm(t('exam.leaveConfirm'))) return;
    // pauseExam is registered globally
    if (typeof window.pauseExam === 'function') window.pauseExam();
  }
  state.curTab = id;
  $$('.view').forEach(function (v) { v.classList.remove('active'); });
  let v = $('#v-' + id); if (v) v.classList.add('active');
  $('#practiceBar').style.display = 'none';
  $('#examBar').style.display = 'none';
  renderTabs();
  renderView(id);
}

export function setUILang(lang) {
  state.ST.settings.lang = lang;
  saveState();
  renderTabs();
  renderView(state.curTab);
  // Update static strings in index.html drop zone
  let dropTitle = document.getElementById('dropZoneTitle');
  if (dropTitle) dropTitle.textContent = t('lib.dropTitle');
  let dropHint = document.getElementById('dropZoneHint');
  if (dropHint) dropHint.textContent = t('lib.dropHint');
  if (typeof window.updateLibSignInBtn === 'function') window.updateLibSignInBtn();
}

window.switchTab = switchTab;
window.setUILang = setUILang;
