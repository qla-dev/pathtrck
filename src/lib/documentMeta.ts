import { Language } from '../types';
import { ui } from '../i18n';

const BRAND = 'Freightbook.ai';

const setMeta = (selector: string, content: string) => {
  const tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (tag) tag.content = content;
};

/**
 * Keeps the page title and the social-preview tags in the visitor's language. index.html ships
 * English copies of the same tags so crawlers that never run the bundle still read something
 * sensible; this rewrites them in place rather than appending duplicates.
 */
export const setDocumentMeta = (lang: Language) => {
  if (typeof document === 'undefined') return;

  const tagline = ui(lang, 'landing.digitalStandard', 'Digital Logistics Standard');
  const title = `${BRAND} — ${tagline}`;
  const description = ui(
    lang,
    'landing.metaDescription',
    'Freightbook.ai — the digital logistics standard. Post loads, book capacity and track freight across road, air, sea, rail and warehousing.'
  );

  document.title = title;
  document.documentElement.lang = lang;

  setMeta('meta[name="description"]', description);
  setMeta('meta[property="og:title"]', title);
  setMeta('meta[property="og:description"]', description);
  setMeta('meta[property="og:locale"]', lang);
  setMeta('meta[name="twitter:title"]', title);
  setMeta('meta[name="twitter:description"]', description);
};
