import { applyDarkMode } from './state/store.js';
import { renderLibPicker, loadLibFromFile, bootApp } from './library/loader.js';
import { initKeyboard } from './input/keyboard.js';
import { initTouch } from './input/touch.js';
import { $ } from './lib/dom.js';

// Import all view modules to trigger registerView calls
import './views/modal.js';
import './views/help.js';
import './views/router.js';
import './views/dashboard.js';
import './views/practice.js';
import './views/exam.js';
import './views/wrong.js';
import './views/profile.js';

// Import auth modules (gracefully handle if not configured)
import './auth/supabase.js';
import './auth/auth.js';
import './auth/sync.js';

export function init() {
  applyDarkMode();

  // Set up drop zone
  let dz = $('#dropZone');
  let fi = $('#libFileInput');
  dz.addEventListener('click', function () { fi.click(); });
  fi.addEventListener('change', function () { if (fi.files.length) loadLibFromFile(fi.files[0]); fi.value = ''; });
  dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', function () { dz.classList.remove('dragover'); });
  dz.addEventListener('drop', function (e) {
    e.preventDefault(); dz.classList.remove('dragover');
    let f = e.dataTransfer.files;
    if (f.length && f[0].name.endsWith('.json')) loadLibFromFile(f[0]);
    else alert('请拖入 .json 格式的题库文件');
  });

  // Auto-load questions.json
  fetch('./questions.json').then(function (r) {
    if (!r.ok) throw new Error(); return r.json();
  }).then(function (data) {
    if (data.questions && data.questions.length) {
      bootApp(data, 'questions.json');
    }
  }).catch(function () {
    // No default file
  });

  renderLibPicker();
  $('#bottomtabs').style.display = 'none';

  // System dark mode change
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change', function () {
      applyDarkMode();
    });
  }

  initKeyboard();
  initTouch();

  // Show sign-in button in lib picker if Supabase not configured
  let signInBtn = document.getElementById('libSignInBtn');
  if (signInBtn) signInBtn.style.display = 'inline-flex';
}

// Expose getQ globally for keyboard.js
import { getQ } from './state/question-helpers.js';
window.getQ = getQ;
