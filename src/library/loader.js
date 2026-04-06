import { state, saveState, loadState, examName, lsKey } from '../state/store.js';
import { $ } from '../lib/dom.js';
import { h } from '../lib/dom.js';
import { ic } from '../icons/icons.js';
import { renderTabs, switchTab } from '../views/router.js';

const LIB_HISTORY_KEY = 'quiz_libraries';

export function getLibHistory() {
  try { return JSON.parse(localStorage.getItem(LIB_HISTORY_KEY)) || []; } catch (e) { return []; }
}

export function saveLibHistory(list) {
  localStorage.setItem(LIB_HISTORY_KEY, JSON.stringify(list));
}

export function addLibToHistory(name, count, fileName) {
  let list = getLibHistory();
  list = list.filter(function (l) { return l.name !== name; });
  list.unshift({ name: name, count: count, fileName: fileName || '', lastUsed: new Date().toISOString() });
  if (list.length > 10) list = list.slice(0, 10);
  saveLibHistory(list);
}

export function removeLibFromHistory(name) {
  let list = getLibHistory().filter(function (l) { return l.name !== name; });
  saveLibHistory(list);
  let key = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_state';
  localStorage.removeItem(key);
  renderLibPicker();
}

export function renderLibPicker() {
  let list = getLibHistory();
  let el = $('#libHistory');
  if (!list.length) { el.innerHTML = ''; return; }
  let html = '<div class="lib-history-title">最近使用</div>';
  list.forEach(function (lib) {
    html += '<div class="lib-item" onclick="reloadLib(\'' + h(lib.fileName || lib.name) + '\')">';
    html += '<div><div class="lib-item-name">' + h(lib.name) + '</div>';
    html += '<div class="lib-item-info">' + lib.count + ' 题 · ' + new Date(lib.lastUsed).toLocaleDateString() + '</div></div>';
    html += '<div class="lib-item-right">';
    html += '<button class="lib-item-remove" onclick="event.stopPropagation();removeLibFromHistory(\'' + h(lib.name) + '\')">' + ic('trash', 'icon-sm') + '</button>';
    html += '</div></div>';
  });
  el.innerHTML = html;
}

export async function reloadLib(fileNameOrPath) {
  try {
    let resp = await fetch('./' + fileNameOrPath);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    let data = await resp.json();
    if (!data.questions || !data.questions.length) throw new Error('Invalid format');
    bootApp(data, fileNameOrPath);
  } catch (e) {
    alert('加载失败: ' + e.message + '\n请重新选择文件。');
  }
}

export function loadLibFromFile(file) {
  let reader = new FileReader();
  reader.onload = function () {
    try {
      let data = JSON.parse(reader.result);
      if (!data.questions || !data.questions.length) throw new Error('无效的题库格式: 缺少 questions 数组');
      bootApp(data, file.name);
    } catch (e) {
      alert('加载失败: ' + e.message);
    }
  };
  reader.readAsText(file);
}

export function bootApp(data, fileName) {
  state.Q = data.questions || [];
  state.meta = data.meta || {};

  state.LS_KEY = lsKey();
  state.EXAM_CFG.officialCount = state.meta.officialCount || Math.min(60, state.Q.length);
  state.EXAM_CFG.officialTime = state.meta.officialTime || 105;
  state.EXAM_CFG.passRate = state.meta.passRate || 70;
  state.EXAM_CFG.name = state.meta.exam || fileName.replace(/\.json$/i, '') || 'Quiz';

  addLibToHistory(examName(), state.Q.length, fileName);

  document.title = examName() + ' 题库练习';
  let bt = $('#brandTitle'); if (bt) bt.textContent = examName();

  state.practiceMode = null; state.practiceQs = []; state.practiceIdx = 0;
  state.examActive = false; state.examState = null;
  $('#practiceBar').style.display = 'none';
  $('#examBar').style.display = 'none';

  $('#libPicker').style.display = 'none';
  $('#app').style.display = '';
  $('#bottomtabs').style.display = '';

  loadState();
  renderTabs();

  // Trigger cloud sync after boot if logged in
  if (typeof window.syncState === 'function') {
    setTimeout(() => window.syncState(), 500);
  }

  switchTab('dash');
}

export function switchLibrary() {
  $('#app').style.display = 'none';
  $('#bottomtabs').style.display = 'none';
  $('#practiceBar').style.display = 'none';
  $('#examBar').style.display = 'none';
  $('#libPicker').style.display = '';
  if (state.examActive) { clearInterval(state.examTimerInterval); state.examActive = false; state.examState = null; }
  state.practiceMode = null;
  renderLibPicker();
  // Refresh sign-in button to reflect current login state
  if (typeof window.updateLibSignInBtn === 'function') window.updateLibSignInBtn();
}

// Expose globally
window.reloadLib = reloadLib;
window.removeLibFromHistory = removeLibFromHistory;
window.switchLibrary = switchLibrary;
window.bootApp = bootApp;
