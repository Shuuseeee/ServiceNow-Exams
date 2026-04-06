import { state, saveState, defaultState, examName, applyDarkMode } from '../state/store.js';
import { ic } from '../icons/icons.js';
import { $, h } from '../lib/dom.js';
import { today, pct } from '../lib/utils.js';
import { getStats } from '../state/statistics.js';
import { getQ, qText, typeBadge, getDifficulty } from '../state/question-helpers.js';
import { showModal, hideModal } from './modal.js';
import { drawExamChart } from './exam.js';
import { registerView, switchTab } from './router.js';

function renderProfile() {
  let s = getStats();
  let html = '<div class="fade-in">';
  html += '<h2 style="margin-bottom:12px;display:flex;align-items:center;gap:8px">' + ic('user', 'icon-lg') + ' 我的</h2>';

  // Auth section (injected by auth module if available)
  if (typeof window.renderAuthSection === 'function') {
    html += window.renderAuthSection();
  }

  // Bookmarks
  html += '<div class="profile-section"><div class="profile-section-title">' + ic('star', 'icon-sm') + ' 收藏 (' + state.ST.bookmarkIds.length + ')</div>';
  if (state.ST.bookmarkIds.length) {
    html += '<button class="btn btn-out btn-sm" style="margin-bottom:8px" onclick="startPractice(\'bookmark\')">练习收藏题</button>';
    state.ST.bookmarkIds.slice(0, 5).forEach(function (id) {
      let q = getQ(id); if (!q) return;
      let stem = qText(q);
      html += '<div class="bm-card" onclick="practiceSingleQ(\'' + id + '\')">';
      html += '<div style="font-size:.75rem;color:var(--tx3)">' + h(q.id) + '</div>';
      html += '<div style="font-size:.9rem">' + h(stem.length > 80 ? stem.slice(0, 80) + '...' : stem) + '</div></div>';
    });
    if (state.ST.bookmarkIds.length > 5) html += '<div style="font-size:.8rem;color:var(--tx3);text-align:center;padding:8px">...及其他 ' + (state.ST.bookmarkIds.length - 5) + ' 题</div>';
  } else {
    html += '<div class="empty-state" style="padding:16px">' + ic('star') + '<p>暂无收藏</p></div>';
  }
  html += '</div>';

  // Statistics
  html += '<div class="profile-section"><div class="profile-section-title">' + ic('barChart', 'icon-sm') + ' 统计</div>';
  html += '<div class="stat-grid-2">';
  html += '<div class="stat-card"><div class="stat-val">' + s.answered + '/' + state.Q.length + '</div><div class="stat-label">已答题数</div></div>';
  html += '<div class="stat-card"><div class="stat-val suc">' + s.accuracy + '%</div><div class="stat-label">正确率</div></div>';
  html += '<div class="stat-card"><div class="stat-val">' + (s.answered ? Math.round(s.totalTime / s.answered) + 's' : '--') + '</div><div class="stat-label">平均用时</div></div>';
  html += '<div class="stat-card"><div class="stat-val err">' + s.wrong + '</div><div class="stat-label">错题数</div></div>';
  html += '</div>';

  let confStats = { sure: { c: 0, t: 0 }, guess: { c: 0, t: 0 }, unsure: { c: 0, t: 0 }, none: { c: 0, t: 0 } };
  for (let id in state.ST.answers) { let a = state.ST.answers[id]; let k = a.confidence || 'none'; confStats[k].t++; if (a.correct) confStats[k].c++; }
  html += '<div class="card"><div class="card-title">' + ic('target', 'icon-sm') + ' 信心 vs 准确率</div>';
  html += '<div style="font-size:.85rem;line-height:2">';
  html += '<div>' + ic('checkCircle', 'icon-sm') + ' 确定: ' + pct(confStats.sure.c, confStats.sure.t) + '% (' + confStats.sure.t + '题)</div>';
  html += '<div>' + ic('helpCircle', 'icon-sm') + ' 猜测: ' + pct(confStats.guess.c, confStats.guess.t) + '% (' + confStats.guess.t + '题)</div>';
  html += '<div>' + ic('target', 'icon-sm') + ' 不确定: ' + pct(confStats.unsure.c, confStats.unsure.t) + '% (' + confStats.unsure.t + '题)</div>';
  html += '</div></div>';

  let diffStats = { easy: { c: 0, t: 0 }, medium: { c: 0, t: 0 }, hard: { c: 0, t: 0 } };
  for (let id in state.ST.answers) { let q = getQ(id); if (!q) continue; let d = getDifficulty(q); let a = state.ST.answers[id]; diffStats[d].t++; if (a.correct) diffStats[d].c++; }
  html += '<div class="card"><div class="card-title">' + ic('barChart', 'icon-sm') + ' 难度分布</div>';
  html += '<div style="font-size:.85rem;line-height:2">';
  html += '<div>' + ic('dotG', 'icon-sm') + ' 简单: ' + pct(diffStats.easy.c, diffStats.easy.t) + '% (' + diffStats.easy.t + '题)</div>';
  html += '<div>' + ic('dotY', 'icon-sm') + ' 中等: ' + pct(diffStats.medium.c, diffStats.medium.t) + '% (' + diffStats.medium.t + '题)</div>';
  html += '<div>' + ic('dotR', 'icon-sm') + ' 困难: ' + pct(diffStats.hard.c, diffStats.hard.t) + '% (' + diffStats.hard.t + '题)</div>';
  html += '</div></div>';

  let answeredArr = [];
  for (let id in state.ST.answers) answeredArr.push({ id: id, time: state.ST.answers[id].timeSpent || 0 });
  answeredArr.sort(function (a, b) { return b.time - a.time; });
  answeredArr = answeredArr.slice(0, 10);
  if (answeredArr.length) {
    html += '<div class="card"><div class="card-title">' + ic('clock', 'icon-sm') + ' 最慢 TOP 10</div>';
    answeredArr.forEach(function (item, i) {
      html += '<div style="font-size:.8rem;padding:4px 0;border-bottom:1px solid var(--brd);display:flex;justify-content:space-between">';
      html += '<span>' + (i + 1) + '. ' + h(item.id) + '</span><span>' + item.time + 's</span></div>';
    });
    html += '</div>';
  }
  html += '</div>';

  // Exam history
  if (state.ST.examHistory.length) {
    html += '<div class="profile-section"><div class="profile-section-title">' + ic('trendUp', 'icon-sm') + ' 考试历史</div>';
    html += '<div class="card"><div class="chart-wrap"><canvas id="profileChart"></canvas></div>';
    state.ST.examHistory.slice(-10).reverse().forEach(function (e, ri) {
      let idx = state.ST.examHistory.length - 1 - ri;
      let pass = e.score / e.total * 100 >= state.EXAM_CFG.passRate;
      html += '<div class="eh-card" style="cursor:pointer" onclick="reviewExamHistory(' + idx + ')">';
      html += '<div class="eh-row"><div>';
      html += '<span class="eh-score" style="color:' + (pass ? 'var(--suc)' : 'var(--err)') + '">' + pct(e.score, e.total) + '%</span> ';
      html += '<span class="eh-detail">' + e.score + '/' + e.total + ' (' + (e.mode === 'official' ? '官方' : '自定义') + ')</span></div>';
      html += '<div style="display:flex;align-items:center;gap:8px"><div class="eh-date">' + new Date(e.date).toLocaleDateString() + '</div>' + ic('chevronR', 'icon-sm') + '</div></div></div>';
    });
    html += '</div></div>';
  }

  // Settings
  html += '<div class="profile-section"><div class="profile-section-title">' + ic('gear', 'icon-sm') + ' 设置</div>';
  html += '<div class="card">';
  html += '<div class="setting-item"><div class="setting-label">深色模式</div>';
  html += '<div class="toggle' + (state.ST.settings.darkMode ? ' on' : '') + '" onclick="toggleDark()"></div></div>';
  html += '<div class="setting-item"><div class="setting-label">默认语言</div>';
  html += '<select style="padding:6px 10px;border:1px solid var(--brd2);border-radius:var(--r2);background:var(--bg3)" onchange="state.ST.settings.lang=this.value;saveState()">';
  html += '<option value="en"' + (state.ST.settings.lang === 'en' ? ' selected' : '') + '>English</option>';
  html += '<option value="ja"' + (state.ST.settings.lang === 'ja' ? ' selected' : '') + '>日本語</option>';
  html += '</select></div>';
  html += '<div class="setting-item"><div class="setting-label">错题掌握阈值</div>';
  html += '<input type="number" class="num-input" value="' + state.ST.settings.wrongMasteryThreshold + '" min="0" max="10" onchange="state.ST.settings.wrongMasteryThreshold=parseInt(this.value)||0;saveState()">';
  html += '</div>';
  html += '<div class="setting-item"><div class="setting-label">选项乱序</div>';
  html += '<div class="toggle' + (state.ST.settings.shuffleOptions ? ' on' : '') + '" onclick="state.ST.settings.shuffleOptions=!state.ST.settings.shuffleOptions;saveState();renderProfile()"></div></div>';
  html += '<div class="setting-item"><div class="setting-label">' + ic('upload', 'icon-sm') + ' 导出数据</div>';
  html += '<button class="btn btn-out btn-sm" onclick="exportData()">导出 JSON</button></div>';
  html += '<div class="setting-item"><div class="setting-label">' + ic('download', 'icon-sm') + ' 导入数据</div>';
  html += '<button class="btn btn-out btn-sm" onclick="importData()">导入 JSON</button>';
  html += '<input type="file" id="importFile" accept=".json" style="display:none" onchange="doImport(event)"></div>';
  html += '<div class="setting-item"><div class="setting-label">' + ic('trash', 'icon-sm') + ' 重置数据</div>';
  html += '<button class="btn btn-err btn-sm" onclick="resetData()">重置</button></div>';
  html += '<div class="setting-item" style="border-bottom:none"><div class="setting-label">' + ic('book', 'icon-sm') + ' 切换题库</div>';
  html += '<button class="btn btn-pri btn-sm" onclick="switchLibrary()">选择其他题库</button></div>';
  html += '</div></div>';

  // Keyboard shortcuts
  html += '<div class="profile-section"><div class="profile-section-title">' + ic('keyboard', 'icon-sm') + ' 键盘快捷键</div>';
  html += '<div class="card"><div class="shortcut-grid">';
  [['A–G','选择选项'],['↑↓','移动选项焦点'],['Enter','选中 / 提交'],['Space','选中焦点选项'],['←→','上 / 下一题'],['F','切换收藏 ★'],['V','查看解析'],['Tab','顺序导航'],['Shift+Alt+H','键盘帮助']].forEach(function(r){
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
        alert('导入成功!');
        renderProfile();
      } else { alert('无效的文件格式'); }
    } catch (err) { alert('导入失败: ' + err.message); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function resetData() {
  showModal('重置所有数据',
    '<div style="margin-bottom:8px">' + ic('alertTri', 'icon-sm') + ' 警告: 此操作将删除所有进度数据。请输入 RESET 确认。</div><input type="text" id="resetInput" style="width:100%;padding:8px;border:1px solid var(--brd2);border-radius:var(--r2);background:var(--bg3)" placeholder="请输入 RESET">',
    [
      { text: '取消', cls: 'btn-out', action: hideModal },
      { text: '确认重置', cls: 'btn-err', action: function () {
        let inp = document.getElementById('resetInput');
        if (inp && inp.value === 'RESET') {
          state.ST = defaultState(); saveState(); applyDarkMode(); hideModal(); switchTab('dash');
        } else { alert('请输入 RESET 确认'); }
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
// Expose state for inline onchange handlers
if (!window.state) Object.defineProperty(window, 'state', { get: () => state, configurable: true });
