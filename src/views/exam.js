import { state, saveState, examName } from '../state/store.js';
import { ic } from '../icons/icons.js';
import { $, h } from '../lib/dom.js';
import { shuffle, fmtTimer, fmtTime, pct, isoNow, arrEq } from '../lib/utils.js';
import { getQ, getLang, qText, oText, diffTag, typeBadge } from '../state/question-helpers.js';
import { updateReviewSchedule } from '../state/statistics.js';
import { showModal, hideModal } from './modal.js';
import { registerView, switchTab } from './router.js';
import { t } from '../i18n/t.js';

function renderExam() {
  if (state.examActive) { renderExamActive(); return; }
  if (state.examReview) { renderExamResult(); return; }
  renderExamSetup();
}

function renderExamSetup() {
  let hasPaused = !!state.ST.pausedExam;
  let html = '<div class="fade-in">';
  html += '<h2 style="margin-bottom:12px;display:flex;align-items:center;gap:8px">' + ic('trophy', 'icon-lg') + ' ' + t('exam.title') + '</h2>';

  if (hasPaused) {
    let p = state.ST.pausedExam;
    html += '<div class="setup-card highlight" onclick="resumeExam()">';
    html += '<h3>' + ic('pause') + ' ' + t('exam.resume') + '</h3>';
    html += '<p>' + t('exam.resumeDesc', p.answered || 0, p.total, fmtTimer(p.remainingMs)) + '</p>';
    html += '</div>';
  }

  html += '<div class="setup-card" onclick="startExam(\'official\')">';
  html += '<h3>' + ic('trophy') + ' ' + t('exam.official') + '</h3>';
  html += '<p>' + t('exam.officialDesc', state.EXAM_CFG.officialCount, state.EXAM_CFG.officialTime, state.EXAM_CFG.passRate) + '</p>';
  html += '</div>';

  html += '<div class="setup-card" id="customExamCard">';
  html += '<h3>' + ic('gear') + ' ' + t('exam.custom') + '</h3>';
  html += '<p>' + t('exam.customDesc') + '</p>';
  html += '<div style="margin-top:12px" onclick="event.stopPropagation()">';
  html += '<div class="slider-row"><label style="min-width:50px;font-size:.85rem">' + t('exam.qCountLabel') + '</label>';
  html += '<input type="range" id="examCount" min="10" max="' + state.Q.length + '" value="' + state.EXAM_CFG.officialCount + '" oninput="document.getElementById(\'examCountVal\').textContent=this.value">';
  html += '<span class="slider-val" id="examCountVal">' + state.EXAM_CFG.officialCount + '</span></div>';
  html += '<div class="slider-row"><label style="min-width:50px;font-size:.85rem">' + t('exam.minutesLabel') + '</label>';
  html += '<input type="range" id="examTime" min="10" max="300" value="' + state.EXAM_CFG.officialTime + '" oninput="document.getElementById(\'examTimeVal\').textContent=this.value">';
  html += '<span class="slider-val" id="examTimeVal">' + state.EXAM_CFG.officialTime + '</span></div>';
  html += '<button class="btn btn-pri btn-block" style="margin-top:8px" onclick="startExam(\'custom\')">' + t('exam.startCustom') + '</button>';
  html += '</div></div>';

  if (state.ST.examHistory.length) {
    html += '<div class="card" style="margin-top:12px"><div class="card-title">' + ic('trendUp') + ' ' + t('exam.history') + '</div>';
    html += '<div class="chart-wrap"><canvas id="examSetupChart"></canvas></div>';
    state.ST.examHistory.slice(-5).reverse().forEach(function (e, ri) {
      let idx = state.ST.examHistory.length - 1 - ri;
      let pass = e.score / e.total * 100 >= state.EXAM_CFG.passRate;
      html += '<div class="eh-card" style="cursor:pointer" onclick="reviewExamHistory(' + idx + ')">';
      html += '<div class="eh-row"><div>';
      html += '<span class="eh-score" style="color:' + (pass ? 'var(--suc)' : 'var(--err)') + '">' + pct(e.score, e.total) + '%</span> ';
      html += '<span class="eh-detail">' + e.score + '/' + e.total + '</span></div>';
      html += '<div style="display:flex;align-items:center;gap:8px"><div class="eh-date">' + new Date(e.date).toLocaleDateString() + '</div>' + ic('chevronR', 'icon-sm') + '</div></div></div>';
    });
    html += '</div>';
  }
  html += '</div>';
  $('#v-exam').innerHTML = html;
  if (state.ST.examHistory.length) setTimeout(function () { drawExamChart('examSetupChart'); }, 60);
}

function startExam(mode) {
  let count = state.EXAM_CFG.officialCount, time = state.EXAM_CFG.officialTime;
  if (mode === 'custom') {
    let ce = document.getElementById('examCount');
    let te = document.getElementById('examTime');
    if (ce) count = parseInt(ce.value) || state.EXAM_CFG.officialCount;
    if (te) time = parseInt(te.value) || state.EXAM_CFG.officialTime;
  }
  let ids = shuffle(state.Q.map(function (q) { return q.id; })).slice(0, count);
  state.examState = {
    mode: mode, questionIds: ids, currentIndex: 0,
    answers: {}, flagged: new Set(),
    remainingMs: time * 60 * 1000, total: count,
    startTime: Date.now(),
  };
  state.examActive = true;
  state.examShowNav = false;
  startExamTimer();
  renderExamActive();
}

function resumeExam() {
  if (!state.ST.pausedExam) return;
  let p = state.ST.pausedExam;
  state.examState = {
    mode: p.mode, questionIds: p.questionIds, currentIndex: p.currentIndex,
    answers: p.answers || {}, flagged: new Set(p.flagged || []),
    remainingMs: p.remainingMs, total: p.total,
    startTime: Date.now(),
  };
  state.ST.pausedExam = null; saveState();
  state.examActive = true; state.examShowNav = false;
  startExamTimer();
  renderExamActive();
}

function startExamTimer() {
  if (state.examTimerInterval) clearInterval(state.examTimerInterval);
  let lastTick = Date.now();
  state.examTimerInterval = setInterval(function () {
    let now = Date.now();
    state.examState.remainingMs -= (now - lastTick);
    lastTick = now;
    if (state.examState.remainingMs <= 0) {
      state.examState.remainingMs = 0;
      clearInterval(state.examTimerInterval);
      finishExam(); return;
    }
    let timerEl = document.getElementById('examTimer');
    if (timerEl) {
      timerEl.innerHTML = ic('clock', 'icon-sm') + ' ' + fmtTimer(state.examState.remainingMs);
      timerEl.className = 'timer' + (state.examState.remainingMs < 60000 ? ' danger' : state.examState.remainingMs < 300000 ? ' warning' : '');
    }
  }, 1000);
}

export function pauseExam() {
  if (!state.examActive) return;
  clearInterval(state.examTimerInterval);
  state.ST.pausedExam = {
    mode: state.examState.mode, questionIds: state.examState.questionIds,
    currentIndex: state.examState.currentIndex, answers: state.examState.answers,
    flagged: [...state.examState.flagged], remainingMs: state.examState.remainingMs,
    total: state.examState.total, answered: Object.keys(state.examState.answers).length,
  };
  saveState();
  state.examActive = false; state.examState = null;
  $('#examBar').style.display = 'none';
  renderExam();
}

function finishExam() {
  clearInterval(state.examTimerInterval);
  let score = 0;
  let now = isoNow();
  state.examState.questionIds.forEach(function (id) {
    let a = state.examState.answers[id] || [];
    let q = getQ(id); if (!q) return;
    let correct = arrEq(a, q.answer);
    if (correct) score++;
    let prev = state.ST.answers[id];
    let attempts = prev ? prev.attempts + 1 : 1;
    let streak = correct ? (prev ? prev.correctStreak + 1 : 1) : 0;
    state.ST.answers[id] = {
      selected: a, correct: correct, time: now,
      timeSpent: prev ? prev.timeSpent || 0 : 0,
      attempts: attempts, correctStreak: streak,
      confidence: prev ? prev.confidence || 'none' : 'none',
    };
    if (!correct) {
      if (!state.ST.wrongIds.includes(id)) state.ST.wrongIds.push(id);
      state.ST.masteredWrongIds = state.ST.masteredWrongIds.filter(function (x) { return x !== id; });
      updateReviewSchedule(id, false);
    } else {
      updateReviewSchedule(id, true);
      let threshold = state.ST.settings.wrongMasteryThreshold;
      if (threshold > 0 && streak >= threshold && state.ST.wrongIds.includes(id)) {
        if (!state.ST.masteredWrongIds.includes(id)) state.ST.masteredWrongIds.push(id);
      }
    }
  });
  let result = {
    date: now, mode: state.examState.mode, score: score, total: state.examState.total,
    timeUsed: Math.round((Date.now() - state.examState.startTime) / 1000),
    details: { answers: JSON.parse(JSON.stringify(state.examState.answers)), questionIds: [...state.examState.questionIds] },
  };
  state.ST.examHistory.push(result);
  state.ST.pausedExam = null;
  saveState();
  state.examReview = result;
  state.examActive = false; state.examState = null;
  $('#examBar').style.display = 'none';
  renderExamResult();
}

function renderExamActive() {
  if (!state.examState) return;
  let qId = state.examState.questionIds[state.examState.currentIndex];
  let q = getQ(qId); if (!q) return;
  let sel = state.examState.answers[qId] || [];
  let isFlagged = state.examState.flagged.has(qId);
  let answeredCount = Object.keys(state.examState.answers).length;
  let qlang = (state.ST.settings.questionLang) || 'en';

  let html = '';
  html += '<div class="exam-top">';
  html += '<div class="timer" id="examTimer">' + ic('clock', 'icon-sm') + ' ' + fmtTimer(state.examState.remainingMs) + '</div>';
  html += '<button class="btn btn-ghost btn-sm" onclick="pauseExam()">' + ic('pause', 'icon-sm') + ' ' + t('exam.pause') + '</button>';
  html += '<div class="exam-prog">' + answeredCount + '/' + state.examState.total + '</div>';
  html += '<button class="btn btn-ghost btn-sm" onclick="toggleExamNav()">' + ic('clipboard', 'icon-sm') + ' ' + t('exam.nav') + '</button>';
  html += '<div style="margin-left:auto"><button class="btn btn-err btn-sm" onclick="confirmFinish()">' + t('exam.submitExam') + '</button></div>';
  html += '</div>';

  html += '<div class="nav-panel' + (state.examShowNav ? ' show' : '') + '">';
  html += '<div class="exam-nav-grid">';
  state.examState.questionIds.forEach(function (id, i) {
    let cls = 'exam-nav-cell';
    if (i === state.examState.currentIndex) cls += ' current';
    else if (state.examState.flagged.has(id)) cls += ' flagged';
    else if (state.examState.answers[id]) cls += ' answered';
    html += '<div class="' + cls + '" onclick="jumpExam(' + i + ')">' + (i + 1) + '</div>';
  });
  html += '</div></div>';

  html += '<div class="q-head">';
  html += '<span class="q-num">' + (state.examState.currentIndex + 1) + '. ' + h(q.id) + '</span>';
  html += typeBadge(q);
  html += diffTag(q);
  html += '<div class="lang-toggle">';
  html += '<button class="' + (qlang === 'en' ? 'active' : '') + '" onclick="setQuestionLang(\'en\')">EN</button>';
  html += '<button class="' + (qlang === 'ja' ? 'active' : '') + '" onclick="setQuestionLang(\'ja\')">JA</button>';
  html += '</div></div>';

  html += '<div style="font-size:1rem;line-height:1.7;margin:8px 0">' + h(qText(q)) + '</div>';

  html += '<div class="options-list">';
  let exOpts = q.options.slice();
  if (state.ST.settings.shuffleOptions) exOpts = shuffle(exOpts);
  exOpts.forEach(function (o) {
    let s = sel.includes(o.key);
    let multi = q.isMultiple;
    html += '<div class="opt-item' + (multi ? ' multi' : '') + (s ? ' selected' : '') + '" data-key="' + o.key + '" tabindex="0" onclick="examToggle(\'' + o.key + '\')">';
    html += '<div class="opt-check"><div class="opt-check-inner"></div></div>';
    html += '<span class="opt-key">' + o.key + '.</span>';
    html += '<span class="opt-text">' + h(oText(o)) + '</span>';
    html += '</div>';
  });
  html += '</div>';
  html += '<div style="height:70px"></div>';

  $('#v-exam').innerHTML = html;

  let ebar = '<button class="btn btn-ghost" onclick="examPrev()"' + (state.examState.currentIndex <= 0 ? ' disabled' : '') + '>' + ic('chevronL') + ' ' + t('common.prevQ') + '</button>';
  ebar += '<button class="btn btn-ghost" onclick="examFlag()" style="color:' + (isFlagged ? 'var(--warn)' : 'var(--tx3)') + '">' + ic('flag') + ' ' + t(isFlagged ? 'exam.flagged' : 'exam.flag') + '</button>';
  ebar += '<button class="btn btn-ghost" onclick="examNext()"' + (state.examState.currentIndex >= state.examState.total - 1 ? ' disabled' : '') + '>' + t('common.nextQ') + ' ' + ic('chevronR') + '</button>';
  $('#examBar').innerHTML = ebar;
  $('#examBar').style.display = 'flex';
}

function examToggle(key) {
  if (!state.examState) return;
  let qId = state.examState.questionIds[state.examState.currentIndex];
  let q = getQ(qId); if (!q) return;
  let sel = state.examState.answers[qId] ? [...state.examState.answers[qId]] : [];
  if (q.isMultiple) {
    let i = sel.indexOf(key);
    if (i >= 0) sel.splice(i, 1); else sel.push(key);
  } else { sel = [key]; }
  state.examState.answers[qId] = sel;
  renderExamActive();
}

function examPrev() { if (state.examState && state.examState.currentIndex > 0) { state.examState.currentIndex--; renderExamActive(); } }
function examNext() { if (state.examState && state.examState.currentIndex < state.examState.total - 1) { state.examState.currentIndex++; renderExamActive(); } }
function jumpExam(i) { if (state.examState) { state.examState.currentIndex = i; state.examShowNav = false; renderExamActive(); } }
function examFlag() {
  if (!state.examState) return;
  let qId = state.examState.questionIds[state.examState.currentIndex];
  if (state.examState.flagged.has(qId)) state.examState.flagged.delete(qId);
  else state.examState.flagged.add(qId);
  renderExamActive();
}
function toggleExamNav() { state.examShowNav = !state.examShowNav; renderExamActive(); }

function confirmFinish() {
  let unanswered = state.examState.questionIds.filter(function (id) { return !state.examState.answers[id] || !state.examState.answers[id].length; }).length;
  let msg = t('exam.confirmSubmit');
  if (unanswered) msg += ' ' + t('exam.unansweredWarning', unanswered);
  showModal(t('exam.submitExam'), msg, [
    { text: t('common.cancel'), cls: 'btn-out', action: hideModal },
    { text: t('exam.confirmBtn'), cls: 'btn-err', action: function () { hideModal(); finishExam(); } },
  ]);
}

function reviewExamHistory(idx) {
  if (idx < 0 || idx >= state.ST.examHistory.length) return;
  state.examReview = state.ST.examHistory[idx];
  state.examReviewBackTo = state.curTab;
  if (state.curTab !== 'exam') switchTab('exam');
  renderExamResult();
}

function renderExamResult() {
  if (!state.examReview) return;
  let r = state.examReview;
  let scorePct = pct(r.score, r.total);
  let pass = scorePct >= state.EXAM_CFG.passRate;

  let html = '<div class="fade-in">';
  html += '<div class="card" style="text-align:center">';
  html += '<div style="margin-bottom:8px">' + ic(pass ? 'award' : 'frown', 'icon-xl') + '</div>';
  html += '<div class="result-score ' + (pass ? 'result-pass' : 'result-fail') + '">' + scorePct + '%</div>';
  html += '<div class="result-label" style="color:' + (pass ? 'var(--suc)' : 'var(--err)') + '">' + ic(pass ? 'award' : 'frown') + ' ' + t(pass ? 'exam.pass' : 'exam.fail') + '</div>';
  html += '</div>';

  html += '<div class="result-stats">';
  html += '<div class="result-stat"><div class="val">' + r.score + '/' + r.total + '</div><div class="lbl">' + t('exam.scoreLabel') + '</div></div>';
  html += '<div class="result-stat"><div class="val">' + fmtTime(r.timeUsed) + '</div><div class="lbl">' + t('exam.timeLabel') + '</div></div>';
  html += '<div class="result-stat"><div class="val">' + (r.total - r.score) + '</div><div class="lbl">' + t('exam.wrongQLabel') + '</div></div>';
  html += '<div class="result-stat"><div class="val">' + t(r.mode === 'official' ? 'exam.modeOfficial' : 'exam.modeCustom') + '</div><div class="lbl">' + t('exam.modeLabel') + '</div></div>';
  html += '</div>';

  if (state.ST.examHistory.length > 1) {
    html += '<div class="card"><div class="card-title">' + ic('trendUp') + ' ' + t('exam.trend') + '</div>';
    html += '<div class="chart-wrap"><canvas id="resultTrendChart"></canvas></div></div>';
  }

  let details = r.details || {};
  let dAnswers = details.answers || {};
  let dQids = details.questionIds || [];

  html += '<div class="card"><div class="card-title">' + ic('list') + ' ' + t('exam.review') + '</div>';
  dQids.forEach(function (id, i) {
    let q = getQ(id); if (!q) return;
    let userAns = dAnswers[id] || [];
    let isCorrect = arrEq(userAns, q.answer);
    html += '<div class="review-q">';
    html += '<div class="rq-head">' + ic(isCorrect ? 'checkCircle' : 'xCircle', 'icon-sm');
    html += ' <span style="font-weight:700;font-size:.85rem">' + (i + 1) + '. ' + h(q.id) + '</span> ' + typeBadge(q) + '</div>';
    let stem = qText(q);
    html += '<div class="rq-stem" style="color:' + (isCorrect ? 'var(--tx)' : 'var(--err)') + '">' + h(stem.length > 120 ? stem.slice(0, 120) + '...' : stem) + '</div>';
    html += '<div class="rq-ans">' + t('exam.answerCompare', (userAns.length ? userAns.join(', ') : '--'), q.answer.join(', ')) + '</div>';
    html += '</div>';
  });
  html += '</div>';

  let backLabel = state.examReviewBackTo === 'profile' ? t('exam.backProfile') : t('exam.backSetup');
  let backFn = state.examReviewBackTo === 'profile'
    ? 'state.examReview=null;switchTab("profile")'
    : 'state.examReview=null;renderExam()';
  html += '<button class="btn btn-pri btn-block" onclick="' + backFn + '">' + backLabel + '</button>';
  html += '<div style="height:20px"></div></div>';

  $('#v-exam').innerHTML = html;
  if (state.ST.examHistory.length > 1) setTimeout(function () { drawExamChart('resultTrendChart'); }, 60);
}

export function drawExamChart(canvasId) {
  let canvas = document.getElementById(canvasId);
  if (!canvas) return;
  let ctx = canvas.getContext('2d');
  let dpr = window.devicePixelRatio || 1;
  let rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.scale(dpr, dpr);

  let w = rect.width, ht = rect.height;
  let data = state.ST.examHistory.map(function (e) { return pct(e.score, e.total); });
  if (data.length < 1) return;

  let pad = { t: 24, r: 24, b: 32, l: 44 };
  let cw = w - pad.l - pad.r, ch = ht - pad.t - pad.b;
  let isDark = document.documentElement.classList.contains('dark');
  let txtColor = isDark ? '#9CA3AF' : '#6B7280';
  let gridColor = isDark ? '#2a2a27' : '#e8e6dc';

  ctx.clearRect(0, 0, w, ht);
  ctx.strokeStyle = gridColor; ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    let y = pad.t + ch * (1 - i / 4);
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    ctx.fillStyle = txtColor; ctx.font = '11px sans-serif'; ctx.textAlign = 'right';
    ctx.fillText((i * 25) + '%', pad.l - 6, y + 4);
  }

  let passY = pad.t + ch * (1 - state.EXAM_CFG.passRate / 100);
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(pad.l, passY); ctx.lineTo(w - pad.r, passY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#c0392b'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(state.EXAM_CFG.passRate + '%', w - pad.r + 2, passY + 3);

  if (data.length === 1) {
    let x = pad.l + cw / 2, y = pad.t + ch * (1 - data[0] / 100);
    ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = data[0] >= state.EXAM_CFG.passRate ? '#788c5d' : '#c0392b'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = txtColor; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(data[0] + '%', x, y - 10);
    ctx.fillText('#1', x, ht - pad.b + 16);
    return;
  }

  let stepX = cw / (data.length - 1);
  ctx.strokeStyle = '#d97757'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  data.forEach(function (v, i) {
    let x = pad.l + i * stepX, y = pad.t + ch * (1 - v / 100);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.beginPath();
  data.forEach(function (v, i) {
    let x = pad.l + i * stepX, y = pad.t + ch * (1 - v / 100);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.l + (data.length - 1) * stepX, pad.t + ch);
  ctx.lineTo(pad.l, pad.t + ch);
  ctx.closePath();
  let grd = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
  grd.addColorStop(0, 'rgba(79,70,229,0.15)');
  grd.addColorStop(1, 'rgba(79,70,229,0)');
  ctx.fillStyle = grd; ctx.fill();

  data.forEach(function (v, i) {
    let x = pad.l + i * stepX, y = pad.t + ch * (1 - v / 100);
    ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = v >= state.EXAM_CFG.passRate ? '#788c5d' : '#c0392b'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = txtColor; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(v + '%', x, y - 10);
    ctx.fillText('#' + (i + 1), x, ht - pad.b + 16);
  });
}

registerView('exam', renderExam);

window.startExam = startExam;
window.resumeExam = resumeExam;
window.pauseExam = pauseExam;
window.finishExam = finishExam;
window.renderExamActive = renderExamActive;
window.examToggle = examToggle;
window.examPrev = examPrev;
window.examNext = examNext;
window.jumpExam = jumpExam;
window.examFlag = examFlag;
window.toggleExamNav = toggleExamNav;
window.confirmFinish = confirmFinish;
window.reviewExamHistory = reviewExamHistory;
window.renderExam = renderExam;
window.drawExamChart = drawExamChart;
