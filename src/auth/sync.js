import { supabase, isConfigured } from './supabase.js';
import { getUser } from './auth.js';
import { state, saveState, lsKey, defaultState } from '../state/store.js';
import { examName } from '../state/store.js';

if (!isConfigured) {
  // No Supabase — expose no-op stubs and exit
  window.debouncedSync = function () {};
  window.syncState = function () {};
  window.syncOnLogin = async function () {};
} else {

  let _syncTimer = null;

  // Debounced push: waits 3s after last saveState() call
  function debouncedSync() {
    if (!getUser()) return;
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(pushState, 3000);
  }

  // Push current state to Supabase
  async function pushState() {
    let user = getUser();
    if (!user || !state.ST) return;
    try {
      let examKey = lsKey();
      await supabase.from('user_states').upsert(
        { user_id: user.id, exam_key: examKey, state: state.ST, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,exam_key' }
      );
      updateSyncStatus('已同步 ' + new Date().toLocaleTimeString());
    } catch (e) {
      console.warn('Sync push failed:', e.message);
    }
  }

  // Pull state from Supabase
  async function pullState() {
    let user = getUser();
    if (!user) return null;
    try {
      let examKey = lsKey();
      let { data, error } = await supabase
        .from('user_states')
        .select('state')
        .eq('user_id', user.id)
        .eq('exam_key', examKey)
        .single();
      if (error || !data) return null;
      return data.state;
    } catch (e) {
      return null;
    }
  }

  // Smart merge: local + cloud → best combined state
  function mergeState(local, cloud) {
    if (!cloud) return local;
    if (!local) return cloud;

    let merged = Object.assign({}, defaultState(), local);

    // answers: keep whichever has more attempts per question
    merged.answers = Object.assign({}, cloud.answers || {}, local.answers || {});
    let allIds = new Set([...Object.keys(cloud.answers || {}), ...Object.keys(local.answers || {})]);
    allIds.forEach(function (id) {
      let l = (local.answers || {})[id];
      let c = (cloud.answers || {})[id];
      if (!l) { merged.answers[id] = c; return; }
      if (!c) { merged.answers[id] = l; return; }
      merged.answers[id] = (l.attempts || 0) >= (c.attempts || 0) ? l : c;
    });

    // arrays: union
    merged.wrongIds = Array.from(new Set([...(local.wrongIds || []), ...(cloud.wrongIds || [])]));
    merged.masteredWrongIds = Array.from(new Set([...(local.masteredWrongIds || []), ...(cloud.masteredWrongIds || [])]));
    merged.bookmarkIds = Array.from(new Set([...(local.bookmarkIds || []), ...(cloud.bookmarkIds || [])]));

    // notes: merge, local wins on conflict
    merged.notes = Object.assign({}, cloud.notes || {}, local.notes || {});

    // examHistory: deduplicate by date+score
    let allHistory = [...(cloud.examHistory || []), ...(local.examHistory || [])];
    let seen = new Set();
    merged.examHistory = allHistory.filter(function (e) {
      let key = e.date + '_' + e.score + '_' + e.total;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });

    // reviewSchedule: keep higher level
    merged.reviewSchedule = Object.assign({}, cloud.reviewSchedule || {});
    let localSched = local.reviewSchedule || {};
    Object.keys(localSched).forEach(function (id) {
      let l = localSched[id], c = (cloud.reviewSchedule || {})[id];
      if (!c || (l.level || 0) >= (c.level || 0)) merged.reviewSchedule[id] = l;
    });

    // settings: whichever side was changed more recently wins
    let localSettingsTime = new Date((local.settings || {})._updatedAt || 0).getTime();
    let cloudSettingsTime = new Date((cloud.settings || {})._updatedAt || 0).getTime();
    merged.settings = localSettingsTime >= cloudSettingsTime
      ? Object.assign({}, cloud.settings || {}, local.settings || {})
      : Object.assign({}, local.settings || {}, cloud.settings || {});

    // pausedExam: local wins (active session)
    if (local.pausedExam) merged.pausedExam = local.pausedExam;
    else if (cloud.pausedExam) merged.pausedExam = cloud.pausedExam;

    return merged;
  }

  // Full sync on login: merge local + cloud
  async function syncOnLogin() {
    if (!state.ST) return;
    let cloudST = await pullState();
    if (cloudST) {
      state.ST = mergeState(state.ST, cloudST);
      try { localStorage.setItem(state.LS_KEY, JSON.stringify(state.ST)); } catch (e) {}
    } else {
      // No cloud data yet — push local state
      await pushState();
    }
  }

  // General sync: pull + merge + push
  async function syncState() {
    if (!getUser() || !state.ST) return;
    let cloudST = await pullState();
    if (cloudST) {
      state.ST = mergeState(state.ST, cloudST);
      try { localStorage.setItem(state.LS_KEY, JSON.stringify(state.ST)); } catch (e) {}
    }
    await pushState();
  }

  function updateSyncStatus(text) {
    let el = document.getElementById('syncStatus');
    if (el) el.textContent = text;
  }

  // Sync on page becoming visible again
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && getUser()) syncState();
  });

  window.debouncedSync = debouncedSync;
  window.syncState = syncState;
  window.syncOnLogin = syncOnLogin;
}
