import { isoNow } from '../lib/utils.js';
import { DEFAULT_EXAM_CFG } from './constants.js';

export const state = {
  Q: [],
  meta: {},
  ST: null,
  LS_KEY: 'quiz_state',
  EXAM_CFG: { ...DEFAULT_EXAM_CFG },

  curTab: 'dash',
  practiceMode: null,
  practiceQs: [],
  practiceIdx: 0,
  practiceSubmitted: false,
  practiceSelected: [],
  practiceConfidence: 'none',
  practiceShowExpl: false,
  practiceShowNotes: false,
  practiceTimeStart: 0,

  examActive: false,
  examState: null,
  examTimerInterval: null,
  examShowNav: false,
  examReview: null,
  examReviewBackTo: null,

  wrongFilter: 'all',

  touchStartX: 0,
  touchStartY: 0,
};

export function examName() {
  return state.meta.exam || state.EXAM_CFG.name || 'Quiz';
}

export function lsKey() {
  return (state.meta.exam || 'quiz').toLowerCase().replace(/[^a-z0-9]/g, '_') + '_state';
}

export function defaultState() {
  return {
    version: 1,
    answers: {},
    wrongIds: [],
    masteredWrongIds: [],
    bookmarkIds: [],
    notes: {},
    examHistory: [],
    pausedExam: null,
    settings: {
      lang: 'zh',
      questionLang: 'en',
      showExplanation: true,
      darkMode: false,
      wrongMasteryThreshold: 2,
      shuffleOptions: false,
    },
    reviewSchedule: {},
  };
}

export function loadState() {
  try {
    let raw = localStorage.getItem(state.LS_KEY);
    if (raw) {
      state.ST = JSON.parse(raw);
      if (!state.ST.version) state.ST = defaultState();
    } else {
      state.ST = defaultState();
    }
  } catch (e) {
    state.ST = defaultState();
  }
  if (!state.ST.reviewSchedule) state.ST.reviewSchedule = {};
  if (!state.ST.notes) state.ST.notes = {};
  if (!state.ST.settings) state.ST.settings = { lang: 'zh', questionLang: 'en', showExplanation: true, darkMode: false, wrongMasteryThreshold: 2, shuffleOptions: false };
  if (state.ST.settings.shuffleOptions === undefined) state.ST.settings.shuffleOptions = false;
  // Migrate: old lang (en/ja) was question-content language, not UI language
  if (state.ST.settings.questionLang === undefined) {
    let oldLang = state.ST.settings.lang;
    state.ST.settings.questionLang = (oldLang === 'ja') ? 'ja' : 'en';
    state.ST.settings.lang = 'zh';
  }
  applyDarkMode();
}

let _prevSettingsHash = '';
export function saveState() {
  // Auto-stamp settings when they change, so sync can pick the newer side
  let settingsHash = JSON.stringify(state.ST.settings);
  if (settingsHash !== _prevSettingsHash) {
    state.ST.settings._updatedAt = isoNow();
    _prevSettingsHash = settingsHash;
  }
  state.ST._localUpdatedAt = isoNow();
  try { localStorage.setItem(state.LS_KEY, JSON.stringify(state.ST)); } catch (e) {}
  // Trigger cloud sync if available
  if (typeof window.debouncedSync === 'function') window.debouncedSync();
}

export function applyDarkMode() {
  let dark = false;
  if (state.ST && state.ST.settings && state.ST.settings.darkMode === true) dark = true;
  else if (state.ST && state.ST.settings && state.ST.settings.darkMode === false) dark = false;
  else if (window.matchMedia) dark = window.matchMedia('(prefers-color-scheme:dark)').matches;
  document.documentElement.classList.toggle('dark', dark);
}
