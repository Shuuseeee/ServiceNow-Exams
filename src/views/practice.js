import { state, saveState, examName } from '../state/store.js';
import { ic } from '../icons/icons.js';
import { $, h, flashEl } from '../lib/dom.js';
import { isoNow, shuffle, vibrate, arrEq } from '../lib/utils.js';
import { getQ, getLang, qText, oText, diffTag, typeBadge } from '../state/question-helpers.js';
import { getTodayReviewIds, getTodayReviewCount, updateReviewSchedule } from '../state/statistics.js';
import { showModalRaw, hideModal } from './modal.js';
import { registerView, switchTab } from './router.js';
import { t } from '../i18n/t.js';

function resetQState() {
  state.practiceSubmitted = false;
  state.practiceSelected = [];
  state.practiceConfidence = 'none';
  state.practiceShowExpl = false;
  state.practiceShowNotes = false;
}

export function startPractice(mode) {
  state.practiceMode = mode;
  state.practiceIdx = 0;
  resetQState();

  if (mode === 'seq') {
    state.practiceQs = state.Q.map(function (q) { return q.id; });
    for (let i = 0; i < state.practiceQs.length; i++) {
      if (!state.ST.answers[state.practiceQs[i]]) { state.practiceIdx = i; break; }
    }
  } else if (mode === 'random') {
    state.practiceQs = shuffle(state.Q.map(function (q) { return q.id; }));
  } else if (mode === 'wrong') {
    state.practiceQs = state.ST.wrongIds.filter(function (id) { return !state.ST.masteredWrongIds.includes(id); });
    if (!state.practiceQs.length) { alert(t('practice.noWrong')); state.practiceMode = null; renderPractice(); return; }
  } else if (mode === 'unanswered') {
    state.practiceQs = state.Q.filter(function (q) { return !state.ST.answers[q.id]; }).map(function (q) { return q.id; });
    if (!state.practiceQs.length) { alert(t('practice.allAnswered')); state.practiceMode = null; renderPractice(); return; }
  } else if (mode === 'bookmark') {
    state.practiceQs = [...state.ST.bookmarkIds];
    if (!state.practiceQs.length) { alert(t('practice.noBookmarks')); state.practiceMode = null; renderPractice(); return; }
  } else if (mode === 'review') {
    state.practiceQs = getTodayReviewIds();
    if (!state.practiceQs.length) { alert(t('practice.noReview')); state.practiceMode = null; renderPractice(); return; }
  }

  state.practiceTimeStart = Date.now();
  if (state.curTab !== 'practice') switchTab('practice');
  else renderPracticeQuestion();
}

export function startReview() { startPractice('review'); }

export function practiceSingleQ(id) {
  state.practiceMode = 'single';
  state.practiceQs = [id];
  state.practiceIdx = 0;
  resetQState();
  state.practiceTimeStart = Date.now();
  switchTab('practice');
}

function exitPractice() {
  state.practiceMode = null;
  state.practiceQs = [];
  $('#practiceBar').style.display = 'none';
  renderPractice();
  window.scrollTo(0, 0);
}

function renderPractice() {
  if (state.practiceMode) { renderPracticeQuestion(); return; }
  let wrongCount = state.ST.wrongIds.filter(function (id) { return !state.ST.masteredWrongIds.includes(id); }).length;
  let unanswered = state.Q.filter(function (q) { return !state.ST.answers[q.id]; }).length;
  let bmCount = state.ST.bookmarkIds.length;
  let rc = getTodayReviewCount();

  let html = '<div class="fade-in">';
  html += '<h2 style="margin-bottom:12px;display:flex;align-items:center;gap:8px">' + ic('book', 'icon-lg') + ' ' + t('practice.title') + '</h2>';
  html += '<div class="mode-grid">';
  html += '<div class="mode-card" tabindex="0" onclick="startPractice(\'seq\')">' + ic('book') + '<div class="mc-label">' + t('practice.seq') + '</div><div class="mc-count">' + t('common.qCount', state.Q.length) + '</div></div>';
  html += '<div class="mode-card" tabindex="0" onclick="startPractice(\'random\')">' + ic('dice') + '<div class="mc-label">' + t('practice.random') + '</div><div class="mc-count">' + t('common.qCount', state.Q.length) + '</div></div>';
  html += '<div class="mode-card" tabindex="0" onclick="startPractice(\'wrong\')">' + ic('xCircle') + '<div class="mc-label">' + t('practice.wrong') + '</div><div class="mc-count">' + t('common.qCount', wrongCount) + '</div></div>';
  html += '<div class="mode-card" tabindex="0" onclick="startPractice(\'unanswered\')">' + ic('helpCircle') + '<div class="mc-label">' + t('practice.unanswered') + '</div><div class="mc-count">' + t('common.qCount', unanswered) + '</div></div>';
  html += '<div class="mode-card" tabindex="0" onclick="startPractice(\'bookmark\')">' + ic('star') + '<div class="mc-label">' + t('practice.bookmark') + '</div><div class="mc-count">' + t('common.qCount', bmCount) + '</div></div>';
  html += '<div class="mode-card" tabindex="0" onclick="startPractice(\'review\')">' + ic('calendar') + '<div class="mc-label">' + t('practice.review') + '</div><div class="mc-count">' + t('common.qCount', rc) + '</div></div>';
  html += '</div></div>';
  $('#v-practice').innerHTML = html;
}

export function renderPracticeQuestion(autoFocus) {
  if (!state.practiceQs.length) {
    $('#v-practice').innerHTML = '<div class="empty-state">' + ic('helpCircle', 'icon-xl') + '<p>' + t('practice.noQuestions') + '</p><button class="btn btn-pri" onclick="exitPractice()">' + t('common.back') + '</button></div>';
    return;
  }
  if (state.practiceIdx < 0) state.practiceIdx = 0;
  if (state.practiceIdx >= state.practiceQs.length) state.practiceIdx = state.practiceQs.length - 1;
  let qId = state.practiceQs[state.practiceIdx];
  let q = getQ(qId);
  if (!q) { exitPractice(); return; }
  let qlang = (state.ST.settings.questionLang) || 'en';
  let isBm = state.ST.bookmarkIds.includes(qId);

  let html = '<div class="fade-in">';

  html += '<button class="side-nav-btn side-nav-prev" onclick="prevQ()"' + (state.practiceIdx <= 0 ? ' disabled' : '') + '>' + ic('chevronL') + '</button>';
  html += '<button class="side-nav-btn side-nav-next" onclick="nextQ()"' + (state.practiceIdx >= state.practiceQs.length - 1 ? ' disabled' : '') + '>' + ic('chevronR') + '</button>';

  html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">';
  html += '<button class="btn btn-ghost btn-sm" onclick="exitPractice()">' + ic('chevronL') + ' ' + t('common.back') + '</button>';
  html += '<button class="btn btn-ghost btn-sm" onclick="jumpToQuestion()" style="font-variant-numeric:tabular-nums">' + (state.practiceIdx + 1) + ' / ' + state.practiceQs.length + ' ' + ic('list', 'icon-sm') + '</button>';
  html += '</div>';

  html += '<div class="prog-bar">';
  for (let i = 0; i < Math.min(state.practiceQs.length, 200); i++) {
    let cls = 'unanswered';
    if (i === state.practiceIdx) cls = 'current';
    else { let a = state.ST.answers[state.practiceQs[i]]; if (a) cls = a.correct ? 'correct' : 'wrong'; }
    html += '<div class="seg ' + cls + '" style="flex:1" onclick="jumpPractice(' + i + ')"></div>';
  }
  html += '</div>';

  html += '<div class="q-head">';
  html += '<span class="q-num">' + h(q.id) + '</span>';
  html += typeBadge(q);
  html += diffTag(q);
  html += '<div class="lang-toggle">';
  html += '<button class="' + (qlang === 'en' ? 'active' : '') + '" onclick="setQuestionLang(\'en\')">EN</button>';
  html += '<button class="' + (qlang === 'ja' ? 'active' : '') + '" onclick="setQuestionLang(\'ja\')">JA</button>';
  html += '</div>';
  html += '<button class="bm-head-btn" onclick="toggleBookmark(\'' + qId + '\')" style="color:' + (isBm ? 'var(--warn)' : '') + '">' + ic(isBm ? 'starFill' : 'star', 'icon-lg') + '</button>';
  html += '</div>';

  html += '<div style="font-size:1rem;line-height:1.7;margin:8px 0">' + h(qText(q)) + '</div>';

  html += '<div class="options-list">';
  let opts = q.options.slice();
  if (state.ST.settings.shuffleOptions) opts = shuffle(opts);
  opts.forEach(function (o) {
    let sel = state.practiceSelected.includes(o.key);
    let multi = q.isMultiple;
    let cls = 'opt-item' + (multi ? ' multi' : '') + (sel ? ' selected' : '');
    if (state.practiceSubmitted) {
      let isCorrectKey = q.answer.includes(o.key);
      if (isCorrectKey) cls += ' correct-answer';
      else if (sel && !isCorrectKey) cls += ' wrong-answer';
    }
    html += '<div class="' + cls + '" data-key="' + o.key + '" tabindex="0" onclick="toggleOption(\'' + o.key + '\')">';
    html += '<div class="opt-check"><div class="opt-check-inner"></div></div>';
    html += '<span class="opt-key">' + o.key + '.</span>';
    html += '<span class="opt-text">' + h(oText(o)) + '</span>';
    html += '</div>';
  });
  html += '</div>';

  if (!state.practiceSubmitted) {
    html += '<div class="confidence-row">';
    html += '<button class="conf-btn' + (state.practiceConfidence === 'sure' ? ' active-sure' : '') + '" onclick="setConfidence(\'sure\')">' + ic('checkCircle', 'icon-sm') + ' ' + t('practice.confSure') + '</button>';
    html += '<button class="conf-btn' + (state.practiceConfidence === 'guess' ? ' active-guess' : '') + '" onclick="setConfidence(\'guess\')">' + ic('helpCircle', 'icon-sm') + ' ' + t('practice.confGuess') + '</button>';
    html += '<button class="conf-btn' + (state.practiceConfidence === 'unsure' ? ' active-unsure' : '') + '" onclick="setConfidence(\'unsure\')">' + ic('target', 'icon-sm') + ' ' + t('practice.confUnsure') + '</button>';
    html += '</div>';
    html += '<button class="btn btn-pri btn-block submit-btn" onclick="submitAnswer()"' + (state.practiceSelected.length ? '' : ' disabled') + '>' + t('practice.submit') + '</button>';
  }

  if (state.practiceSubmitted) {
    let isCorrect = arrEq(state.practiceSelected, q.answer);
    html += '<div class="feedback ' + (isCorrect ? 'correct' : 'wrong') + '">';
    html += ic(isCorrect ? 'checkCircle' : 'xCircle');
    html += ' ' + (isCorrect ? t('practice.correct') : t('practice.wrongAns', q.answer.join(', ')));
    html += '</div>';

    html += '<div class="expl-toggle" tabindex="0" onclick="toggleExpl()">' + ic(state.practiceShowExpl ? 'chevronL' : 'chevronR', 'icon-sm') + ' ' + t(state.practiceShowExpl ? 'practice.hideExpl' : 'practice.showExpl') + '</div>';
    if (state.practiceShowExpl && q.explanation) {
      html += '<div class="explanation">' + h(q.explanation) + '</div>';
    }
  }

  html += '<div class="notes-section">';
  html += '<div class="notes-toggle" tabindex="0" onclick="toggleNotes()">' + ic('edit', 'icon-sm') + ' ' + t(state.practiceShowNotes ? 'practice.hideNotes' : 'practice.showNotes') + '</div>';
  if (state.practiceShowNotes) {
    let noteVal = state.ST.notes[qId] || '';
    html += '<textarea class="notes-area" id="noteArea" placeholder="' + t('practice.notePlaceholder') + '" onblur="saveNote(\'' + qId + '\')">' + h(noteVal) + '</textarea>';
  }
  html += '</div>';

  html += '<div class="practice-bottom-spacer"></div></div>';
  $('#v-practice').innerHTML = html;

  if (autoFocus) {
    if (state.practiceSubmitted) {
      let fb = $('#v-practice .feedback');
      if (fb) { fb.tabIndex = -1; fb.focus(); }
    } else {
      let first = $('#v-practice .opt-item');
      if (first) first.focus();
    }
  }

  let bar = '<button class="btn btn-ghost" onclick="prevQ()"' + (state.practiceIdx <= 0 ? ' disabled' : '') + '>' + ic('chevronL') + ' ' + t('common.prevQ') + '</button>';
  bar += '<button class="btn btn-ghost bm-bar-btn" onclick="toggleBookmark(\'' + qId + '\')" style="color:' + (isBm ? 'var(--warn)' : 'var(--tx3)') + '">' + ic(isBm ? 'starFill' : 'star', 'icon-lg') + '</button>';
  bar += '<button class="btn btn-ghost" onclick="nextQ()"' + (state.practiceIdx >= state.practiceQs.length - 1 ? ' disabled' : '') + '>' + t('common.nextQ') + ' ' + ic('chevronR') + '</button>';
  $('#practiceBar').innerHTML = bar;
  $('#practiceBar').style.display = 'flex';
}

function toggleOption(key) {
  if (state.practiceSubmitted) return;
  let q = getQ(state.practiceQs[state.practiceIdx]);
  if (!q) return;
  if (q.isMultiple) {
    let i = state.practiceSelected.indexOf(key);
    if (i >= 0) state.practiceSelected.splice(i, 1); else state.practiceSelected.push(key);
  } else {
    state.practiceSelected = [key];
  }
  let container = $('#v-practice');
  if (!container) return;
  container.querySelectorAll('.opt-item').forEach(function (el) {
    let k = el.dataset.key;
    el.classList.toggle('selected', state.practiceSelected.includes(k));
  });
  let submitBtn = container.querySelector('.submit-btn');
  if (submitBtn) submitBtn.disabled = !state.practiceSelected.length;
}

function setConfidence(c) { state.practiceConfidence = c; renderPracticeQuestion(); }

function setQuestionLang(l) {
  state.ST.settings.questionLang = l; saveState();
  if (state.practiceMode) renderPracticeQuestion();
  else if (state.examActive && typeof window.renderExamActive === 'function') window.renderExamActive();
}

function submitAnswer() {
  if (!state.practiceSelected.length) return;
  let qId = state.practiceQs[state.practiceIdx];
  let q = getQ(qId);
  if (!q) return;
  let isCorrect = arrEq(state.practiceSelected, q.answer);
  let timeSpent = Math.round((Date.now() - state.practiceTimeStart) / 1000);
  state.practiceSubmitted = true;

  let prev = state.ST.answers[qId];
  let attempts = (prev ? prev.attempts : 0) + 1;
  let correctStreak = isCorrect ? (prev ? (prev.correctStreak || 0) + 1 : 1) : 0;

  state.ST.answers[qId] = {
    selected: [...state.practiceSelected], correct: isCorrect, time: isoNow(),
    timeSpent: timeSpent, attempts: attempts, correctStreak: correctStreak,
    confidence: state.practiceConfidence,
  };

  if (!isCorrect) {
    if (!state.ST.wrongIds.includes(qId)) state.ST.wrongIds.push(qId);
    let mi = state.ST.masteredWrongIds.indexOf(qId);
    if (mi >= 0) state.ST.masteredWrongIds.splice(mi, 1);
  } else {
    let thresh = state.ST.settings.wrongMasteryThreshold || 2;
    if (thresh > 0 && correctStreak >= thresh && state.ST.wrongIds.includes(qId)) {
      if (!state.ST.masteredWrongIds.includes(qId)) state.ST.masteredWrongIds.push(qId);
    }
  }

  updateReviewSchedule(qId, isCorrect);
  saveState();
  vibrate(isCorrect ? [50] : [100, 50, 100]);
  state.practiceShowExpl = true;
  renderPracticeQuestion(true);
}

function prevQ() {
  if (state.practiceIdx > 0) { state.practiceIdx--; resetQState(); state.practiceTimeStart = Date.now(); renderPracticeQuestion(true); }
}
function nextQ() {
  if (state.practiceIdx < state.practiceQs.length - 1) { state.practiceIdx++; resetQState(); state.practiceTimeStart = Date.now(); renderPracticeQuestion(true); }
}
function jumpPractice(i) {
  state.practiceIdx = i; resetQState(); state.practiceTimeStart = Date.now(); renderPracticeQuestion();
}

function jumpToQuestion() {
  let total = state.practiceQs.length;
  let correct = 0, wrong = 0, unanswered = 0;
  let grid = '';
  for (let i = 0; i < total; i++) {
    let a = state.ST.answers[state.practiceQs[i]];
    let cls = '';
    if (i === state.practiceIdx) cls = 'current';
    else if (a && a.correct) { cls = 'answered'; correct++; }
    else if (a && !a.correct) { cls = 'wrong-mark'; wrong++; }
    else unanswered++;
    grid += '<div class="exam-nav-cell ' + cls + '" onclick="jumpPractice(' + i + ');hideModal()">' + (i + 1) + '</div>';
  }
  let html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">';
  html += '<div style="font-weight:700;font-size:1rem">' + t('practice.jumpNav') + '</div>';
  html += '<button class="btn btn-ghost btn-sm" onclick="hideModal()">' + ic('xCircle', 'icon-sm') + '</button></div>';
  html += '<div style="display:flex;gap:12px;margin-bottom:12px;font-size:.75rem;color:var(--tx2);flex-wrap:wrap">';
  html += '<span>' + ic('checkCircle', 'icon-sm') + ' ' + t('common.correct') + ' ' + correct + '</span>';
  html += '<span>' + ic('xCircle', 'icon-sm') + ' ' + t('common.wrong') + ' ' + wrong + '</span>';
  html += '<span style="color:var(--tx3)">' + t('common.unanswered') + ' ' + unanswered + '</span></div>';
  html += '<div class="exam-nav-grid" style="max-height:50vh;overflow-y:auto">' + grid + '</div>';
  showModalRaw(html);
}

function toggleExpl() {
  state.practiceShowExpl = !state.practiceShowExpl;
  let container = $('#v-practice'); if (!container) return;
  let toggle = container.querySelector('.expl-toggle');
  if (toggle) {
    toggle.innerHTML = ic(state.practiceShowExpl ? 'chevronL' : 'chevronR', 'icon-sm') + ' ' + t(state.practiceShowExpl ? 'practice.hideExpl' : 'practice.showExpl');
    let existing = container.querySelector('.explanation');
    if (state.practiceShowExpl && !existing) {
      let q = getQ(state.practiceQs[state.practiceIdx]);
      if (q && q.explanation) {
        let div = document.createElement('div');
        div.className = 'explanation';
        div.style.animation = 'fadeIn .3s cubic-bezier(.4,0,.2,1)';
        div.textContent = q.explanation;
        toggle.after(div);
      }
    } else if (!state.practiceShowExpl && existing) {
      existing.remove();
    }
  }
}

function toggleNotes() {
  state.practiceShowNotes = !state.practiceShowNotes;
  let container = $('#v-practice'); if (!container) return;
  let toggle = container.querySelector('.notes-toggle');
  if (toggle) {
    toggle.innerHTML = ic('edit', 'icon-sm') + ' ' + t(state.practiceShowNotes ? 'practice.hideNotes' : 'practice.showNotes');
    let existing = container.querySelector('.notes-area');
    if (state.practiceShowNotes && !existing) {
      let qId = state.practiceQs[state.practiceIdx];
      let ta = document.createElement('textarea');
      ta.className = 'notes-area'; ta.id = 'noteArea';
      ta.placeholder = t('practice.notePlaceholder');
      ta.value = state.ST.notes[qId] || '';
      ta.onblur = function () { saveNote(qId); };
      toggle.after(ta);
      ta.focus();
    } else if (!state.practiceShowNotes && existing) {
      existing.remove();
    }
  }
}

function saveNote(id) {
  let el = document.getElementById('noteArea');
  if (el) { state.ST.notes[id] = el.value; saveState(); }
}

function toggleBookmark(id) {
  let i = state.ST.bookmarkIds.indexOf(id);
  if (i >= 0) state.ST.bookmarkIds.splice(i, 1); else state.ST.bookmarkIds.push(id);
  saveState();
  let isBm = state.ST.bookmarkIds.includes(id);
  if (state.practiceMode) {
    let headBtn = document.querySelector('.bm-head-btn');
    if (headBtn) { headBtn.innerHTML = ic(isBm ? 'starFill' : 'star', 'icon-lg'); headBtn.style.color = isBm ? 'var(--warn)' : ''; }
    let barBm = document.querySelector('.bm-bar-btn');
    if (barBm) { barBm.innerHTML = ic(isBm ? 'starFill' : 'star', 'icon-lg'); barBm.style.color = isBm ? 'var(--warn)' : 'var(--tx3)'; }
    flashEl(headBtn || barBm);
  }
}

registerView('practice', renderPractice);

// Expose globally
window.startPractice = startPractice;
window.startReview = startReview;
window.practiceSingleQ = practiceSingleQ;
window.exitPractice = exitPractice;
window.renderPracticeQuestion = renderPracticeQuestion;
window.toggleOption = toggleOption;
window.setConfidence = setConfidence;
window.setQuestionLang = setQuestionLang;
window.submitAnswer = submitAnswer;
window.prevQ = prevQ;
window.nextQ = nextQ;
window.jumpPractice = jumpPractice;
window.jumpToQuestion = jumpToQuestion;
window.toggleExpl = toggleExpl;
window.toggleNotes = toggleNotes;
window.saveNote = saveNote;
window.toggleBookmark = toggleBookmark;
