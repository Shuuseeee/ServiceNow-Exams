import { state } from './store.js';
import { ic } from '../icons/icons.js';

export function getQ(id) { return state.Q.find(q => q.id === id); }
export function getLang() { return state.ST.settings.lang || 'en'; }
export function qText(q) { return getLang() === 'ja' ? (q.questionJa || q.question) : q.question; }
export function oText(o) { return getLang() === 'ja' ? (o.textJa || o.text) : o.text; }

export function getDifficulty(q) {
  if (q.isMultiple && q.answer.length >= 3) return 'hard';
  if (q.isMultiple) return 'medium';
  if (q.options && q.options.length >= 5) return 'medium';
  return 'easy';
}

export function diffTag(q) {
  let d = getDifficulty(q);
  if (d === 'easy') return '<span class="tag tag-easy">' + ic('dotG', 'icon-sm') + ' Easy</span>';
  if (d === 'medium') return '<span class="tag tag-med">' + ic('dotY', 'icon-sm') + ' Med</span>';
  return '<span class="tag tag-hard">' + ic('dotR', 'icon-sm') + ' Hard</span>';
}

export function typeBadge(q) {
  return q.isMultiple
    ? '<span class="badge badge-multi">多选 (' + q.answer.length + ')</span>'
    : '<span class="badge badge-single">单选</span>';
}
