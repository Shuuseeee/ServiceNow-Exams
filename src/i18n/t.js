import { translations } from './translations.js';
import { state } from '../state/store.js';

export function t(key, ...args) {
  let lang = (state.ST && state.ST.settings && state.ST.settings.lang) || 'zh';
  let dict = translations[lang] || translations.zh;
  let str = dict[key] !== undefined ? dict[key] : (translations.zh[key] !== undefined ? translations.zh[key] : key);
  if (args.length) {
    args.forEach(function (val, i) {
      str = str.replace(new RegExp('\\{' + i + '\\}', 'g'), val);
    });
  }
  return str;
}
