import { state } from './store.js';
import { today } from '../lib/utils.js';
import { pct } from '../lib/utils.js';
import { REVIEW_INTERVALS } from './constants.js';

export function getStats() {
  let answered = 0, correct = 0, wrong = 0, totalTime = 0;
  for (let id in state.ST.answers) {
    let a = state.ST.answers[id]; answered++;
    if (a.correct) correct++; else wrong++;
    totalTime += (a.timeSpent || 0);
  }
  return { answered, correct, wrong, totalTime, accuracy: pct(correct, answered) };
}

export function getTodayReviewCount() {
  let t = today(), c = 0;
  for (let id in state.ST.reviewSchedule) {
    if (state.ST.reviewSchedule[id].nextReview && state.ST.reviewSchedule[id].nextReview <= t) c++;
  }
  return c;
}

export function getTodayReviewIds() {
  let t = today(), ids = [];
  for (let id in state.ST.reviewSchedule) {
    if (state.ST.reviewSchedule[id].nextReview && state.ST.reviewSchedule[id].nextReview <= t) ids.push(id);
  }
  return ids;
}

export function updateReviewSchedule(id, wasCorrect) {
  if (!state.ST.reviewSchedule[id]) state.ST.reviewSchedule[id] = { nextReview: null, interval: 1, level: 0 };
  let r = state.ST.reviewSchedule[id];
  if (wasCorrect) {
    r.level = Math.min(r.level + 1, REVIEW_INTERVALS.length - 1);
    let days = REVIEW_INTERVALS[r.level] || 30;
    let d = new Date(); d.setDate(d.getDate() + days);
    r.nextReview = d.toISOString().slice(0, 10);
    r.interval = days;
  } else {
    r.level = 0;
    let d = new Date(); d.setDate(d.getDate() + REVIEW_INTERVALS[0]);
    r.nextReview = d.toISOString().slice(0, 10);
    r.interval = REVIEW_INTERVALS[0];
  }
}
