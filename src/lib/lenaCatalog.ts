export type LenaCatalogLocale = 'en' | 'de' | 'bs';
export type LenaCatalogChoice = { label: string; value: string; skip?: boolean };
export type LenaCatalogStep = { label: string; question: string; choices: LenaCatalogChoice[]; choices_by_transport: Record<string, LenaCatalogChoice[]>; multiple: boolean; mask: string | null; unit: string; label_key: string | null };
export type LenaCatalogText = {
  ui: Record<string, string>;
  actions: Record<string, string>;
  welcome: { general: string; load: string };
  draft_created: string;
  labels: Record<string, string>;
  location: Record<string, string>;
  steps: Record<string, LenaCatalogStep>;
  form_fields: Record<string, { label: string; question: string | null }>;
};
export type LenaCatalogData = { version: number; revision: string; welcome_actions: string[]; option_groups: Record<string, string[] | string>; locales: Record<LenaCatalogLocale, LenaCatalogText> };
let catalog: LenaCatalogData | null = null;

export function installLenaCatalog(data: LenaCatalogData) {
  if (data.version !== 1 || !Array.isArray(data.welcome_actions) || !data.option_groups || !['en', 'de', 'bs'].every((locale) => {
    const text = data.locales?.[locale as LenaCatalogLocale];
    return text?.welcome?.general && text.welcome.load && text.ui && text.steps && text.form_fields && text.location && text.draft_created;
  })) {
    throw new Error('Unsupported Lena catalog');
  }
  catalog = data;
}

export function getLenaCatalog(): LenaCatalogData {
  if (!catalog) throw new Error('Lena catalog has not loaded');
  return catalog;
}

export function lenaText(locale: string | null | undefined): LenaCatalogText {
  return getLenaCatalog().locales[locale === 'de' || locale === 'bs' ? locale : 'en'];
}

export function lenaTranslation(locale: string | null | undefined, key: string, fallback: string): string | undefined {
  if (!catalog) return undefined;
  const text = lenaText(locale);
  return text.ui[key] ?? text.ui[fallback];
}

export function lenaOptions(group: string): string[] {
  const value = getLenaCatalog().option_groups[group];
  if (!Array.isArray(value)) throw new Error(`Unknown Lena option group: ${group}`);
  return value;
}
