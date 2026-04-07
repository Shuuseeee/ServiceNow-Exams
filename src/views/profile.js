import { state, saveState, defaultState, examName, applyDarkMode } from '../state/store.js';
import { ic } from '../icons/icons.js';
import { $, h } from '../lib/dom.js';
import { today, pct } from '../lib/utils.js';
import { getStats } from '../state/statistics.js';
import { getQ, qText, typeBadge, getDifficulty } from '../state/question-helpers.js';
import { showModal, hideModal } from './modal.js';
import { drawExamChart } from './exam.js';
import { registerView, switchTab, setUILang } from './router.js';
import { t } from '../i18n/t.js';

function renderProfile() {
  let s = getStats();
  let qlang = state.ST.settings.questionLang || 'en';
  let html = '<div class="fade-in">';
  html += '<h2 style="margin-bottom:12px;display:flex;align-items:center;gap:8px">' + ic('user', 'icon-lg') + ' ' + t('profile.title') + '</h2>';

  // Auth section (injected by auth module if available)
  if (typeof window.renderAuthSection === 'function') {
    html += window.renderAuthSection();
  }

  // Bookmarks
  html += '<div class="profile-section"><div class="profile-section-title">' + ic('star', 'icon-sm') + ' ' + t('profile.bookmarks') + ' (' + state.ST.bookmarkIds.length + ')</div>';
  if (state.ST.bookmarkIds.length) {
    html += '<button class="btn btn-out btn-sm" style="margin-bottom:8px" onclick="startPractice(\'bookmark\')">' + t('profile.practiceBookmarks') + '</button>';
    state.ST.bookmarkIds.slice(0, 5).forEach(function (id) {
      let q = getQ(id); if (!q) return;
      let stem = qText(q);
      html += '<div class="bm-card" onclick="practiceSingleQ(\'' + id + '\')">';
      html += '<div style="font-size:.75rem;color:var(--tx3)">' + h(q.id) + '</div>';
      html += '<div style="font-size:.9rem">' + h(stem.length > 80 ? stem.slice(0, 80) + '...' : stem) + '</div></div>';
    });
    if (state.ST.bookmarkIds.length > 5) html += '<div style="font-size:.8rem;color:var(--tx3);text-align:center;padding:8px">' + t('profile.moreBookmarks', state.ST.bookmarkIds.length - 5) + '</div>';
  } else {
    html += '<div class="empty-state" style="padding:16px">' + ic('star') + '<p>' + t('profile.noBookmarks') + '</p></div>';
  }
  html += '</div>';

  // Statistics
  html += '<div class="profile-section"><div class="profile-section-title">' + ic('barChart', 'icon-sm') + ' ' + t('profile.stats') + '</div>';
  html += '<div class="stat-grid-2">';
  html += '<div class="stat-card"><div class="stat-val">' + s.answered + '/' + state.Q.length + '</div><div class="stat-label">' + t('profile.answered') + '</div></div>';
  html += '<div class="stat-card"><div class="stat-val suc">' + s.accuracy + '%</div><div class="stat-label">' + t('profile.accuracy') + '</div></div>';
  html += '<div class="stat-card"><div class="stat-val">' + (s.answered ? Math.round(s.totalTime / s.answered) + 's' : '--') + '</div><div class="stat-label">' + t('profile.avgTime') + '</div></div>';
  html += '<div class="stat-card"><div class="stat-val err">' + s.wrong + '</div><div class="stat-label">' + t('profile.wrongCount') + '</div></div>';
  html += '</div>';

  let confStats = { sure: { c: 0, t: 0 }, guess: { c: 0, t: 0 }, unsure: { c: 0, t: 0 }, none: { c: 0, t: 0 } };
  for (let id in state.ST.answers) { let a = state.ST.answers[id]; let k = a.confidence || 'none'; confStats[k].t++; if (a.correct) confStats[k].c++; }
  html += '<div class="card"><div class="card-title">' + ic('target', 'icon-sm') + ' ' + t('profile.confidence') + '</div>';
  html += '<div style="font-size:.85rem;line-height:2">';
  html += '<div>' + ic('checkCircle', 'icon-sm') + ' ' + t('profile.confSure') + ' ' + pct(confStats.sure.c, confStats.sure.t) + '% (' + t('common.qCount', confStats.sure.t) + ')</div>';
  html += '<div>' + ic('helpCircle', 'icon-sm') + ' ' + t('profile.confGuess') + ' ' + pct(confStats.guess.c, confStats.guess.t) + '% (' + t('common.qCount', confStats.guess.t) + ')</div>';
  html += '<div>' + ic('target', 'icon-sm') + ' ' + t('profile.confUnsure') + ' ' + pct(confStats.unsure.c, confStats.unsure.t) + '% (' + t('common.qCount', confStats.unsure.t) + ')</div>';
  html += '</div></div>';

  let diffStats = { easy: { c: 0, t: 0 }, medium: { c: 0, t: 0 }, hard: { c: 0, t: 0 } };
  for (let id in state.ST.answers) { let q = getQ(id); if (!q) continue; let d = getDifficulty(q); let a = state.ST.answers[id]; diffStats[d].t++; if (a.correct) diffStats[d].c++; }
  html += '<div class="card"><div class="card-title">' + ic('barChart', 'icon-sm') + ' ' + t('profile.difficulty') + '</div>';
  html += '<div style="font-size:.85rem;line-height:2">';
  html += '<div>' + ic('dotG', 'icon-sm') + ' ' + t('profile.easy') + ' ' + pct(diffStats.easy.c, diffStats.easy.t) + '% (' + t('common.qCount', diffStats.easy.t) + ')</div>';
  html += '<div>' + ic('dotY', 'icon-sm') + ' ' + t('profile.medium') + ' ' + pct(diffStats.medium.c, diffStats.medium.t) + '% (' + t('common.qCount', diffStats.medium.t) + ')</div>';
  html += '<div>' + ic('dotR', 'icon-sm') + ' ' + t('profile.hard') + ' ' + pct(diffStats.hard.c, diffStats.hard.t) + '% (' + t('common.qCount', diffStats.hard.t) + ')</div>';
  html += '</div></div>';

  let answeredArr = [];
  for (let id in state.ST.answers) answeredArr.push({ id: id, time: state.ST.answers[id].timeSpent || 0 });
  answeredArr.sort(function (a, b) { return b.time - a.time; });
  answeredArr = answeredArr.slice(0, 10);
  if (answeredArr.length) {
    html += '<div class="card"><div class="card-title">' + ic('clock', 'icon-sm') + ' ' + t('profile.slowest') + '</div>';
    answeredArr.forEach(function (item, i) {
      html += '<div style="font-size:.8rem;padding:4px 0;border-bottom:1px solid var(--brd);display:flex;justify-content:space-between">';
      html += '<span>' + (i + 1) + '. ' + h(item.id) + '</span><span>' + item.time + 's</span></div>';
    });
    html += '</div>';
  }
  html += '</div>';

  // Exam history
  if (state.ST.examHistory.length) {
    html += '<div class="profile-section"><div class="profile-section-title">' + ic('trendUp', 'icon-sm') + ' ' + t('profile.examHistory') + '</div>';
    html += '<div class="card"><div class="chart-wrap"><canvas id="profileChart"></canvas></div>';
    state.ST.examHistory.slice(-10).reverse().forEach(function (e, ri) {
      let idx = state.ST.examHistory.length - 1 - ri;
      let pass = e.score / e.total * 100 >= state.EXAM_CFG.passRate;
      html += '<div class="eh-card" style="cursor:pointer" onclick="reviewExamHistory(' + idx + ')">';
      html += '<div class="eh-row"><div>';
      html += '<span class="eh-score" style="color:' + (pass ? 'var(--suc)' : 'var(--err)') + '">' + pct(e.score, e.total) + '%</span> ';
      html += '<span class="eh-detail">' + e.score + '/' + e.total + ' (' + t(e.mode === 'official' ? 'exam.modeOfficial' : 'exam.modeCustom') + ')</span></div>';
      html += '<div style="display:flex;align-items:center;gap:8px"><div class="eh-date">' + new Date(e.date).toLocaleDateString() + '</div>' + ic('chevronR', 'icon-sm') + '</div></div></div>';
    });
    html += '</div></div>';
  }

  // Settings
  html += '<div class="profile-section"><div class="profile-section-title">' + ic('gear', 'icon-sm') + ' ' + t('profile.settings') + '</div>';
  html += '<div class="card">';
  html += '<div class="setting-item"><div class="setting-label">' + t('profile.darkMode') + '</div>';
  html += '<div class="toggle' + (state.ST.settings.darkMode ? ' on' : '') + '" onclick="toggleDark()"></div></div>';
  html += '<div class="setting-item"><div class="setting-label">' + t('profile.uiLang') + '</div>';
  html += '<select style="padding:6px 10px;border:1px solid var(--brd2);border-radius:var(--r2);background:var(--bg3)" onchange="setUILang(this.value)">';
  html += '<option value="zh"' + (state.ST.settings.lang === 'zh' ? ' selected' : '') + '>中文</option>';
  html += '<option value="en"' + (state.ST.settings.lang === 'en' ? ' selected' : '') + '>English</option>';
  html += '<option value="ja"' + (state.ST.settings.lang === 'ja' ? ' selected' : '') + '>日本語</option>';
  html += '</select></div>';
  html += '<div class="setting-item"><div class="setting-label">' + t('profile.questionLang') + '</div>';
  html += '<select style="padding:6px 10px;border:1px solid var(--brd2);border-radius:var(--r2);background:var(--bg3)" onchange="setQuestionLang(this.value)">';
  html += '<option value="en"' + (qlang === 'en' ? ' selected' : '') + '>English</option>';
  html += '<option value="ja"' + (qlang === 'ja' ? ' selected' : '') + '>日本語</option>';
  html += '</select></div>';
  html += '<div class="setting-item"><div class="setting-label">' + t('profile.masteryThreshold') + '</div>';
  html += '<input type="number" class="num-input" value="' + state.ST.settings.wrongMasteryThreshold + '" min="0" max="10" onchange="state.ST.settings.wrongMasteryThreshold=parseInt(this.value)||0;saveState()">';
  html += '</div>';
  html += '<div class="setting-item"><div class="setting-label">' + t('profile.shuffleOptions') + '</div>';
  html += '<div class="toggle' + (state.ST.settings.shuffleOptions ? ' on' : '') + '" onclick="state.ST.settings.shuffleOptions=!state.ST.settings.shuffleOptions;saveState();renderProfile()"></div></div>';
  html += '<div class="setting-item"><div class="setting-label">' + ic('upload', 'icon-sm') + ' ' + t('profile.export') + '</div>';
  html += '<button class="btn btn-out btn-sm" onclick="exportData()">' + t('profile.exportBtn') + '</button></div>';
  html += '<div class="setting-item"><div class="setting-label">' + ic('download', 'icon-sm') + ' ' + t('profile.import') + '</div>';
  html += '<button class="btn btn-out btn-sm" onclick="importData()">' + t('profile.importBtn') + '</button>';
  html += '<input type="file" id="importFile" accept=".json" style="display:none" onchange="doImport(event)"></div>';
  html += '<div class="setting-item"><div class="setting-label">' + ic('trash', 'icon-sm') + ' ' + t('profile.reset') + '</div>';
  html += '<button class="btn btn-err btn-sm" onclick="resetData()">' + t('profile.resetBtn') + '</button></div>';
  html += '<div class="setting-item" style="border-bottom:none"><div class="setting-label">' + ic('book', 'icon-sm') + ' ' + t('profile.switchLib') + '</div>';
  html += '<button class="btn btn-pri btn-sm" onclick="switchLibrary()">' + t('profile.switchLibBtn') + '</button></div>';
  html += '</div></div>';

  // Keyboard shortcuts
  html += '<div class="profile-section"><div class="profile-section-title">' + ic('keyboard', 'icon-sm') + ' ' + t('profile.shortcuts') + '</div>';
  html += '<div class="card"><div class="shortcut-grid">';
  [
    ['A–G', t('sc.select')],
    ['↑↓', t('sc.move')],
    ['Enter', t('sc.submit')],
    ['Space', t('sc.check')],
    ['←→', t('sc.nav')],
    ['F', t('sc.bookmark')],
    ['V', t('sc.expl')],
    ['Tab', t('sc.tab')],
    ['Shift+Alt+H', t('sc.openHelp')],
  ].forEach(function (r) {
    html += '<div class="shortcut-item"><span class="shortcut-key">' + r[0] + '</span> ' + r[1] + '</div>';
  });
  html += '</div></div></div>';
  html += '<div style="height:20px"></div></div>';
  $('#v-profile').innerHTML = html;
  if (state.ST.examHistory.length) setTimeout(function () { drawExamChart('profileChart'); }, 60);
}

function toggleDark() {
  state.ST.settings.darkMode = !state.ST.settings.darkMode;
  applyDarkMode(); saveState(); renderProfile();
}

function exportData() {
  let blob = new Blob([JSON.stringify(state.ST, null, 2)], { type: 'application/json' });
  let a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = examName().toLowerCase().replace(/[^a-z0-9]/g, '_') + '_backup_' + today() + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importData() { document.getElementById('importFile').click(); }

function doImport(e) {
  let file = e.target.files[0]; if (!file) return;
  let reader = new FileReader();
  reader.onload = function (ev) {
    try {
      let data = JSON.parse(ev.target.result);
      if (data.version) {
        state.ST = data; saveState(); applyDarkMode();
        alert(t('profile.importSuccess'));
        renderProfile();
      } else { alert(t('profile.invalidFormat')); }
    } catch (err) { alert(t('profile.importFailed') + ' ' + err.message); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function resetData() {
  showModal(t('profile.resetTitle'),
    '<div style="margin-bottom:8px">' + ic('alertTri', 'icon-sm') + ' ' + t('profile.resetWarning') + '</div><input type="text" id="resetInput" style="width:100%;padding:8px;border:1px solid var(--brd2);border-radius:var(--r2);background:var(--bg3)" placeholder="' + t('profile.resetPlaceholder') + '">',
    [
      { text: t('common.cancel'), cls: 'btn-out', action: hideModal },
      { text: t('profile.confirmReset'), cls: 'btn-err', action: function () {
        let inp = document.getElementById('resetInput');
        if (inp && inp.value === 'RESET') {
          state.ST = defaultState(); saveState(); applyDarkMode(); hideModal(); switchTab('dash');
        } else { alert(t('profile.resetConfirmAlert')); }
      }},
    ]
  );
}

registerView('profile', renderProfile);

window.renderProfile = renderProfile;
window.toggleDark = toggleDark;
window.exportData = exportData;
window.importData = importData;
window.doImport = doImport;
window.resetData = resetData;
window.saveState = saveState;
window.setUILang = setUILang;
// Expose state for inline onchange handlers
if (!window.state) Object.defineProperty(window, 'state', { get: () => state, configurable: true });
