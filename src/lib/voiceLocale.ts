import type { Language } from '../types';

const voiceLocaleByLanguage: Record<string, string> = {
  en: 'en-US', bs: 'bs-BA', hr: 'hr-HR', sr: 'sr-RS', de: 'de-DE',
  pl: 'pl-PL', ro: 'ro-RO', nl: 'nl-NL', fr: 'fr-FR', it: 'it-IT',
  zh: 'zh-CN', es: 'es-ES', sv: 'sv-SE', ar: 'ar-SA', pt: 'pt-PT',
};

export const voiceLocaleForLanguage = (language: Language): string =>
  voiceLocaleByLanguage[language || 'en'] || 'en-US';