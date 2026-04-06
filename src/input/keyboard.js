import { state } from '../state/store.js';
import { flashEl } from '../lib/dom.js';
import { showHelpModal, closeHelpModal } from '../views/help.js';

export function initKeyboard() {
  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    // Shift+Alt+H: 帮助
    if (e.shiftKey && e.altKey && (e.code === 'KeyH' || e.key.toUpperCase() === 'H')) {
      let modal = document.getElementById('modal');
      if (modal && modal.classList.contains('show')) { closeHelpModal(); }
      else { showHelpModal(); }
      e.preventDefault(); return;
    }

    // Esc
    if (e.key === 'Escape') {
      let modal = document.getElementById('modal');
      if (modal && modal.classList.contains('show')) { closeHelpModal(); e.preventDefault(); return; }
    }

    // Nav tab 键盘导航
    {
      let el = document.activeElement;
      if (el && (el.classList.contains('nav-tab') || el.classList.contains('btab'))) {
        let isDesktop = el.classList.contains('nav-tab');
        let selector = isDesktop ? '#desktopTabs .nav-tab' : '#bottomtabs .btab';
        let tabs = [...document.querySelectorAll(selector)];
        let idx = tabs.indexOf(el);
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { tabs[(idx + 1) % tabs.length].focus(); e.preventDefault(); return; }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { tabs[(idx - 1 + tabs.length) % tabs.length].focus(); e.preventDefault(); return; }
        if (e.key === 'Enter' || e.key === ' ') { el.click(); e.preventDefault(); return; }
      }
    }

    // Enter/Space 激活 button-like div 元素
    if (e.key === 'Enter' || e.key === ' ') {
      let el = document.activeElement;
      let btnDivClasses = ['quick-btn', 'mode-card', 'btab', 'setup-card', 'bm-card', 'expl-toggle', 'notes-toggle'];
      if (el && btnDivClasses.some(function (c) { return el.classList.contains(c); })) {
        el.click(); e.preventDefault(); return;
      }
    }

    let focusedOpt = document.activeElement && document.activeElement.classList.contains('opt-item') ? document.activeElement : null;

    // Practice mode
    if (state.practiceMode && state.curTab === 'practice') {
      let key = e.key.toUpperCase();

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        let opts = [...document.querySelectorAll('#v-practice .opt-item')];
        if (opts.length) {
          let cur = opts.indexOf(document.activeElement);
          let next = e.key === 'ArrowUp'
            ? (cur <= 0 ? opts.length - 1 : cur - 1)
            : (cur < 0 || cur >= opts.length - 1 ? 0 : cur + 1);
          opts[next].focus();
          opts[next].scrollIntoView({ block: 'nearest' });
          e.preventDefault();
        }
        return;
      }

      if ((e.key === 'Enter' || e.key === ' ') && focusedOpt && !state.practiceSubmitted) {
        window.toggleOption(focusedOpt.dataset.key);
        flashEl(focusedOpt);
        e.preventDefault(); return;
      }

      if ('ABCDEFG'.includes(key)) {
        let q = window.getQ ? window.getQ(state.practiceQs[state.practiceIdx]) : null;
        if (q && q.options.find(function (o) { return o.key === key; })) {
          window.toggleOption(key);
          let optEl = document.querySelector('#v-practice .opt-item[data-key="' + key + '"]');
          flashEl(optEl);
          e.preventDefault(); return;
        }
      }

      if (e.key === 'Enter') {
        if (!state.practiceSubmitted && state.practiceSelected.length) { window.submitAnswer(); e.preventDefault(); return; }
        if (state.practiceSubmitted) { window.nextQ(); e.preventDefault(); return; }
      }

      if (e.key === 'ArrowLeft') { window.prevQ(); e.preventDefault(); return; }
      if (e.key === 'ArrowRight') { window.nextQ(); e.preventDefault(); return; }

      if (key === 'F') { if (state.practiceQs[state.practiceIdx]) { window.toggleBookmark(state.practiceQs[state.practiceIdx]); e.preventDefault(); return; } }
      if (key === 'V') { if (state.practiceSubmitted) { window.toggleExpl(); e.preventDefault(); return; } }
    }

    // Exam mode
    if (state.examActive && state.curTab === 'exam') {
      if ((e.key === 'Enter' || e.key === ' ') && focusedOpt) {
        let optEl = focusedOpt;
        if (typeof window.examToggle === 'function') window.examToggle(optEl.dataset.key);
        flashEl(optEl);
        e.preventDefault(); return;
      }

      if ('ABCDEFG'.includes(e.key.toUpperCase()) && state.examState) {
        let qId = state.examState.questionIds[state.examState.currentIndex];
        let q = window.getQ ? window.getQ(qId) : null;
        if (q && q.options.find(function (o) { return o.key === e.key.toUpperCase(); })) {
          if (typeof window.examToggle === 'function') window.examToggle(e.key.toUpperCase());
          let optEl = document.querySelector('#v-exam .opt-item[data-key="' + e.key.toUpperCase() + '"]');
          flashEl(optEl);
          e.preventDefault(); return;
        }
      }

      if (e.key === 'ArrowLeft') { if (typeof window.examPrev === 'function') window.examPrev(); e.preventDefault(); return; }
      if (e.key === 'ArrowRight') { if (typeof window.examNext === 'function') window.examNext(); e.preventDefault(); }
    }
  });
}
