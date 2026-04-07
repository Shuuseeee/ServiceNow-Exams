import { state } from '../state/store.js';
import { ic } from '../icons/icons.js';
import { $, h } from '../lib/dom.js';
import { getQ, qText, typeBadge } from '../state/question-helpers.js';
import { registerView } from './router.js';
import { t } from '../i18n/t.js';

function renderWrong() {
  let allW = state.ST.wrongIds;
  let unmastered = allW.filter(function (id) { return !state.ST.masteredWrongIds.includes(id); });
  let mastered = allW.filter(function (id) { return state.ST.masteredWrongIds.includes(id); });

  let html = '<div class="fade-in">';
  html += '<h2 style="margin-bottom:12px;display:flex;align-items:center;gap:8px">' + ic('xCircle', 'icon-lg') + ' ' + t('wrong.title') + '</h2>';

  html += '<div class="wrong-filters">';
  html += '<div class="wrong-filter' + (state.wrongFilter === 'all' ? ' active' : '') + '" onclick="state.wrongFilter=\'all\';renderWrong()">' + t('wrong.all') + ' (' + allW.length + ')</div>';
  html += '<div class="wrong-filter' + (state.wrongFilter === 'unmastered' ? ' active' : '') + '" onclick="state.wrongFilter=\'unmastered\';renderWrong()">' + t('wrong.unmastered') + ' (' + unmastered.length + ')</div>';
  html += '<div class="wrong-filter' + (state.wrongFilter === 'mastered' ? ' active' : '') + '" onclick="state.wrongFilter=\'mastered\';renderWrong()">' + t('wrong.mastered') + ' (' + mastered.length + ')</div>';
  html += '</div>';

  let list = state.wrongFilter === 'mastered' ? mastered : state.wrongFilter === 'unmastered' ? unmastered : allW;

  if (!list.length) {
    html += '<div class="empty-state">' + ic('checkCircle', 'icon-xl');
    html += '<p>' + t('wrong.empty') + (state.wrongFilter !== 'all' ? t('wrong.emptyInFilter') : '') + '</p></div>';
  } else {
    if (unmastered.length) {
      html += '<button class="btn btn-pri btn-block" style="margin-bottom:12px" onclick="startPractice(\'wrong\')">' + ic('refresh', 'icon-sm') + ' ' + t('wrong.practice') + ' (' + unmastered.length + ')</button>';
    }
    list.forEach(function (id) {
      let q = getQ(id); if (!q) return;
      let a = state.ST.answers[id];
      let isMastered = state.ST.masteredWrongIds.includes(id);
      let review = state.ST.reviewSchedule[id];
      html += '<div class="wrong-card' + (isMastered ? ' mastered' : '') + '" onclick="practiceSingleQ(\'' + id + '\')">';
      html += '<div class="wc-id">' + h(q.id) + ' ' + typeBadge(q) + ' ' + (isMastered ? '<span class="tag tag-easy">' + t('wrong.masteredTag') + '</span>' : '') + '</div>';
      html += '<div class="wc-text">' + h(qText(q)) + '</div>';
      html += '<div class="wc-meta">';
      html += '<span>' + ic('xCircle', 'icon-sm') + ' ' + t('wrong.attempts', (a ? a.attempts : 0)) + '</span>';
      html += '<span>' + ic('checkCircle', 'icon-sm') + ' ' + t('wrong.streak') + ': ' + (a ? a.correctStreak || 0 : 0) + '</span>';
      if (review) html += '<span>' + ic('calendar', 'icon-sm') + ' ' + review.nextReview + '</span>';
      html += '</div></div>';
    });
  }
  html += '</div>';
  $('#v-wrong').innerHTML = html;
}

registerView('wrong', renderWrong);
window.renderWrong = renderWrong;
window.state = window.state || {};
// Expose state for onclick strings that mutate wrongFilter
Object.defineProperty(window, 'state', { get: () => state, configurable: true });
