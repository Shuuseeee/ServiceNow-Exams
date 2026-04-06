import { state, examName } from '../state/store.js';
import { ic } from '../icons/icons.js';
import { $ } from '../lib/dom.js';
import { h } from '../lib/dom.js';
import { pct } from '../lib/utils.js';
import { getStats, getTodayReviewCount } from '../state/statistics.js';
import { registerView } from './router.js';

function renderDash() {
  let s = getStats();
  let rc = getTodayReviewCount();
  let lastExam = state.ST.examHistory.length ? state.ST.examHistory[state.ST.examHistory.length - 1] : null;

  let html = '<div class="fade-in">';
  html += '<h2 style="margin-bottom:12px;display:flex;align-items:center;gap:8px">' + ic('home', 'icon-lg') + ' ' + h(examName()) + ' 仪表盘</h2>';

  html += '<div class="stats-row">';
  html += '<div class="stat-card"><div class="stat-val">' + s.answered + '</div><div class="stat-label">已做题数</div></div>';
  html += '<div class="stat-card"><div class="stat-val suc">' + s.accuracy + '%</div><div class="stat-label">正确率</div></div>';
  html += '<div class="stat-card"><div class="stat-val err">' + s.wrong + '</div><div class="stat-label">错题数</div></div>';
  html += '</div>';

  if (rc > 0) {
    html += '<div class="card" onclick="startReview()" style="cursor:pointer;border-left:3px solid var(--warn)">';
    html += '<div class="card-title">' + ic('calendar') + ' 今日复习</div>';
    html += '<p style="font-size:.9rem;color:var(--tx2)">' + rc + ' 道题待复习 (Ebbinghaus 记忆曲线)</p>';
    html += '</div>';
  }

  if (lastExam) {
    let pass = lastExam.score / lastExam.total * 100 >= state.EXAM_CFG.passRate;
    html += '<div class="card">';
    html += '<div class="card-title">' + ic('trophy') + ' 最近考试</div>';
    html += '<div style="display:flex;align-items:center;gap:12px">';
    html += '<div style="font-size:1.5rem;font-weight:800;color:' + (pass ? 'var(--suc)' : 'var(--err)') + '">' + pct(lastExam.score, lastExam.total) + '%</div>';
    html += '<div><div style="font-size:.85rem;font-weight:600">' + lastExam.score + '/' + lastExam.total + ' ' + (pass ? 'PASS' : 'FAIL') + '</div>';
    html += '<div style="font-size:.75rem;color:var(--tx3)">' + new Date(lastExam.date).toLocaleDateString() + '</div></div>';
    html += '</div></div>';
  }

  html += '<div style="margin-top:8px;margin-bottom:8px;font-weight:700;font-size:.9rem">快捷操作</div>';
  html += '<div class="quick-grid">';
  html += '<div class="quick-btn" tabindex="0" onclick="startPractice(\'seq\')">' + ic('book') + '<span>顺序练习</span></div>';
  html += '<div class="quick-btn" tabindex="0" onclick="startPractice(\'random\')">' + ic('dice') + '<span>随机练习</span></div>';
  html += '<div class="quick-btn" tabindex="0" onclick="switchTab(\'exam\')">' + ic('trophy') + '<span>模拟考试</span></div>';
  html += '<div class="quick-btn" tabindex="0" onclick="startPractice(\'wrong\')">' + ic('xCircle') + '<span>复习错题</span></div>';
  html += '</div>';

  html += '<div style="text-align:center;margin-top:16px;font-size:.75rem;color:var(--tx3)">共 ' + state.Q.length + ' 道题</div>';
  html += '</div>';
  $('#v-dash').innerHTML = html;
}

registerView('dash', renderDash);
window.renderDash = renderDash;
