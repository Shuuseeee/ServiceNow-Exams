export const REVIEW_INTERVALS = [1, 3, 7, 15, 30];

export const TABS = [
  { id: 'dash', labelKey: 'tab.dash', icon: 'home' },
  { id: 'practice', labelKey: 'tab.practice', icon: 'book' },
  { id: 'exam', labelKey: 'tab.exam', icon: 'trophy' },
  { id: 'wrong', labelKey: 'tab.wrong', icon: 'xCircle' },
  { id: 'profile', labelKey: 'tab.profile', icon: 'user' },
];

export const DEFAULT_EXAM_CFG = {
  name: 'Quiz',
  officialCount: 60,
  officialTime: 105,
  passRate: 70,
};
