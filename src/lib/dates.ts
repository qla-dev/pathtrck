import type { Language } from '../types';

// ICU's Bosnian locale renders medium dates as "2026 M09 3", which reads like a serial number rather
// than a date. Bosnian is therefore formatted by hand in the day.month.year. form people there write.
const pad = (value: number) => String(value).padStart(2, '0');

export const formatDate = (value: unknown, lang: Language, withTime = false) => {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) return '—';

  if (lang === 'bs') {
    const day = `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}.`;
    return withTime ? `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}` : day;
  }

  return new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-GB', withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date);
};

/** The date shape the pickers show and expect people to type, per language. */
export const datePlaceholder = (lang: Language) => lang === 'bs'
  ? 'dd.mm.gggg.'
  : lang === 'de' ? 'TT.MM.JJJJ' : 'dd Mon yyyy';
