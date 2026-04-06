import { state } from '../state/store.js';
import { ic } from '../icons/icons.js';
import { $, $$ } from '../lib/dom.js';
import { TABS } from '../state/constants.js';

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
  TABS.forEach(t => {
    let a = t.id === state.curTab ? ' active' : '';
    btm += '<div class="btab' + a + '" data-navtab="' + t.id + '" tabindex="0">' + ic(t.icon) + '<span>' + t.label + '</span></div>';
    top += '<button class="nav-tab' + a + '" data-navtab="' + t.id + '">' + ic(t.icon) + ' ' + t.label + '</button>';
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
    if (!confirm('离开将暂停考试，确定继续？')) return;
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

window.switchTab = switchTab;
