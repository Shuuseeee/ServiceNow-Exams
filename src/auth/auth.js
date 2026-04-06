import { supabase, isConfigured } from './supabase.js';
import { ic } from '../icons/icons.js';
import { showModalRaw, hideModal } from '../views/modal.js';

// Current user state
let currentUser = null;

export function getUser() { return currentUser; }

// Render auth section HTML (called by profile.js via window.renderAuthSection)
export function renderAuthSection() {
  if (!isConfigured) return '';

  let html = '<div class="profile-section"><div class="profile-section-title">' + ic('user', 'icon-sm') + ' 账号</div>';
  html += '<div class="card">';
  if (currentUser) {
    html += '<div class="setting-item">';
    html += '<div class="setting-label" style="font-size:.85rem;color:var(--tx2)">' + currentUser.email + '</div>';
    html += '<button class="btn btn-out btn-sm" onclick="authSignOut()">退出登录</button>';
    html += '</div>';
    let syncStatus = document.getElementById('syncStatus');
    if (syncStatus) syncStatus.textContent = '已登录';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:8px;padding:4px 0">';
    html += '<button class="btn btn-out btn-block" onclick="authSignInWithGoogle()" style="gap:8px">';
    html += '<svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>';
    html += 'Google 账号登录</button>';
    html += '<div style="display:flex;align-items:center;gap:8px;color:var(--tx3);font-size:.8rem"><hr style="flex:1;border:none;border-top:1px solid var(--brd)">或<hr style="flex:1;border:none;border-top:1px solid var(--brd)"></div>';
    html += '<div style="display:flex;gap:8px">';
    html += '<button class="btn btn-pri btn-sm" style="flex:1" onclick="showAuthModal(\'signin\')">邮箱登录</button>';
    html += '<button class="btn btn-out btn-sm" style="flex:1" onclick="showAuthModal(\'signup\')">注册</button>';
    html += '</div>';
    html += '</div>';
  }
  html += '</div></div>';
  return html;
}

// Show auth modal
export function showAuthModal(mode) {
  if (!isConfigured) return;
  mode = mode || 'signin';
  let isSignin = mode === 'signin';
  let html = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">';
  html += '<div style="font-weight:700;font-size:1rem">' + (isSignin ? '登录账号' : '注册账号') + '</div>';
  html += '<button class="btn btn-ghost btn-sm" onclick="hideModal()">✕</button>';
  html += '</div>';
  html += '<div id="authError" style="color:var(--err);font-size:.85rem;margin-bottom:8px;display:none"></div>';
  html += '<div style="display:flex;flex-direction:column;gap:12px">';
  html += '<input type="email" id="authEmail" placeholder="邮箱" style="padding:10px 12px;border:1px solid var(--brd2);border-radius:var(--r2);background:var(--bg3);width:100%">';
  html += '<input type="password" id="authPassword" placeholder="密码" style="padding:10px 12px;border:1px solid var(--brd2);border-radius:var(--r2);background:var(--bg3);width:100%">';
  if (!isSignin) {
    html += '<input type="password" id="authPassword2" placeholder="确认密码" style="padding:10px 12px;border:1px solid var(--brd2);border-radius:var(--r2);background:var(--bg3);width:100%">';
  }
  html += '<button class="btn btn-pri btn-block" id="authSubmitBtn" onclick="authSubmit(\'' + mode + '\')">' + (isSignin ? '登录' : '注册') + '</button>';
  html += '<div style="display:flex;align-items:center;gap:8px;color:var(--tx3);font-size:.8rem"><hr style="flex:1;border:none;border-top:1px solid var(--brd)">或<hr style="flex:1;border:none;border-top:1px solid var(--brd)"></div>';
  html += '<button class="btn btn-out btn-block" onclick="authSignInWithGoogle()" style="gap:8px">';
  html += '<svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>';
  html += 'Google 账号登录</button>';
  if (isSignin) {
    html += '<div style="text-align:center;font-size:.85rem;color:var(--tx2)">没有账号？ <button class="btn btn-ghost btn-sm" onclick="showAuthModal(\'signup\')" style="text-decoration:underline;padding:0">注册</button></div>';
  } else {
    html += '<div style="text-align:center;font-size:.85rem;color:var(--tx2)">已有账号？ <button class="btn btn-ghost btn-sm" onclick="showAuthModal(\'signin\')" style="text-decoration:underline;padding:0">登录</button></div>';
  }
  html += '</div>';
  showModalRaw(html);
  setTimeout(function () {
    let el = document.getElementById('authEmail');
    if (el) el.focus();
  }, 50);
}

export async function authSubmit(mode) {
  if (!supabase) return;
  let email = (document.getElementById('authEmail') || {}).value || '';
  let password = (document.getElementById('authPassword') || {}).value || '';
  let errEl = document.getElementById('authError');
  let submitBtn = document.getElementById('authSubmitBtn');

  if (!email || !password) {
    if (errEl) { errEl.textContent = '请填写邮箱和密码'; errEl.style.display = ''; }
    return;
  }
  if (mode === 'signup') {
    let p2 = (document.getElementById('authPassword2') || {}).value || '';
    if (password !== p2) {
      if (errEl) { errEl.textContent = '两次密码不一致'; errEl.style.display = ''; }
      return;
    }
  }

  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = '处理中...'; }

  try {
    let result;
    if (mode === 'signin') {
      result = await supabase.auth.signInWithPassword({ email, password });
    } else {
      result = await supabase.auth.signUp({ email, password });
    }

    if (result.error) throw result.error;

    hideModal();
    if (mode === 'signup') {
      alert('注册成功！请检查邮箱完成验证。');
    }
  } catch (err) {
    if (errEl) { errEl.textContent = err.message || '操作失败'; errEl.style.display = ''; }
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = mode === 'signin' ? '登录' : '注册'; }
  }
}

export async function authSignInWithGoogle() {
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
}

export async function authSignOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
  currentUser = null;
  updateSyncStatus('');
  if (typeof window.renderProfile === 'function') window.renderProfile();
}

function updateSyncStatus(text) {
  let el = document.getElementById('syncStatus');
  if (el) el.textContent = text;
}

// Update the lib-picker sign-in button to reflect current auth state
export function updateLibSignInBtn() {
  let btn = document.getElementById('libSignInBtn');
  if (!btn) return;
  if (currentUser) {
    btn.textContent = currentUser.email;
    btn.style.display = 'inline-flex';
    btn.onclick = null; // already logged in, clicking does nothing meaningful
  } else {
    btn.textContent = '登录同步';
    btn.style.display = 'inline-flex';
    btn.onclick = function () { window.showAuthModal && window.showAuthModal(); };
  }
}

// Initialize: listen for auth state changes
export function initAuth() {
  if (!supabase) {
    // Hide sign-in button if no Supabase configured
    let btn = document.getElementById('libSignInBtn');
    if (btn) btn.style.display = 'none';
    return;
  }

  supabase.auth.onAuthStateChange(async function (event, session) {
    currentUser = session ? session.user : null;
    updateSyncStatus(currentUser ? '已登录' : '');
    updateLibSignInBtn();

    if (event === 'SIGNED_IN') {
      if (typeof window.syncOnLogin === 'function') {
        await window.syncOnLogin();
      }
      if (typeof window.renderProfile === 'function') window.renderProfile();
    } else if (event === 'SIGNED_OUT') {
      if (typeof window.renderProfile === 'function') window.renderProfile();
    }
  });

  // Get current session
  supabase.auth.getSession().then(function ({ data: { session } }) {
    currentUser = session ? session.user : null;
    if (currentUser) {
      updateSyncStatus('已登录');
      updateLibSignInBtn();
    }
  });
}

// Expose globally
window.showAuthModal = showAuthModal;
window.authSubmit = authSubmit;
window.authSignOut = authSignOut;
window.authSignInWithGoogle = authSignInWithGoogle;
window.renderAuthSection = renderAuthSection;
window.updateLibSignInBtn = updateLibSignInBtn;

initAuth();
