import { state } from '../state/store.js';

export function initTouch() {
  document.addEventListener('touchstart', function (e) {
    state.touchStartX = e.changedTouches[0].screenX;
    state.touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    let dx = e.changedTouches[0].screenX - state.touchStartX;
    let dy = e.changedTouches[0].screenY - state.touchStartY;
    if (Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * 0.4) return;

    if (state.practiceMode && state.curTab === 'practice') {
      if (dx < 0 && typeof window.nextQ === 'function') window.nextQ();
      else if (typeof window.prevQ === 'function') window.prevQ();
    }
    if (state.examActive && state.curTab === 'exam') {
      if (dx < 0 && typeof window.examNext === 'function') window.examNext();
      else if (typeof window.examPrev === 'function') window.examPrev();
    }
  }, { passive: true });
}
