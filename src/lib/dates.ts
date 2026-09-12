import type { Language } from '../types';

// ICU's Bosnian locale renders medium dates as "2026 M09 3", which reads like a serial number rather
// than a date. Bosnian is therefore formatted by hand in the day.month.year. form people there write.
const pad = (value: number) => String(value).padStart(2, '0');

export const formatDate = (value: unknown, lang: Language, withTime = false) => {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) return '—';

  if (lang === 'bs' || lang === 'hr' || lang === 'sr') {
    const day = `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}.`;
    return withTime ? `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}` : day;
  }

  const locale = lang === 'de' ? 'de-DE' : 'en-GB';
  return new Intl.DateTimeFormat(locale, withTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(date);
};

/**
 * The HH:mm of a server timestamp, in the timezone of whoever is reading it.
 *
 * The API serializes datetimes as UTC ISO-8601, so slicing the characters out of that string shows
 * UTC - two hours behind for a reader in Sarajevo through the summer. Parsing keeps the instant and
 * renders it where the reader actually is, which is also what an optimistic chat bubble shows
 * (toLocaleTimeString), so a message no longer changes its time once it is saved.
 */
export const formatClockTime = (value: unknown): string => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const parsed = new Date(text);
  // A value the browser cannot parse still reads better as its own characters than as nothing.
  if (Number.isNaN(parsed.getTime())) return text.slice(11, 16);
  return `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};

/**
 * "Now" in the shape the API's own datetime columns hold: local wall clock, no timezone marker.
 *
 * Sending new Date().toISOString() lands two hours behind every column written beside it, because
 * Eloquent's datetime cast stores whatever timezone a parsed string carries instead of
 * re-localizing it to the API's configured timezone (Europe/Sarajevo) - which is what those columns
 * are in. The API overrides client-sent timestamps with its own clock, so this matters only until
 * that reaches production, but a value that is right either way costs nothing.
 */
export const localTimestampForApi = (date = new Date()): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
  + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

/** The date shape the pickers show and expect people to type, per language. */
export const datePlaceholder = (lang: Language) => lang === 'bs' || lang === 'hr' || lang === 'sr'
  ? 'dd.mm.gggg.'
  : lang === 'de' ? 'TT.MM.JJJJ' : 'dd Mon yyyy';
