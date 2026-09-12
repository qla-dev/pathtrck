export type LenaCatalogLocale = 'en' | 'de' | 'bs';
export type LenaTransport = 'road' | 'air' | 'sea' | 'rail' | 'warehouse';
export type LenaCatalogChoice = { label: string; value: string; skip?: boolean; description?: string; category?: string };
export type LenaCatalogStep = {
  label: string;
  question: string;
  /** A filled-in answer for this step, shown in the chat question and as the form's placeholder. */
  example: string;
  choices: LenaCatalogChoice[];
  choices_by_transport: Record<string, LenaCatalogChoice[]>;
  fields_by_transport: Record<string, string[]>;
  transports: LenaTransport[];
  form_fields: string[];
  options: boolean;
  multiple: boolean;
  mask: string | null;
  unit: string;
  label_key: string | null;
};
export type LenaCatalogField = {
  label: string;
  question: string | null;
  example: string;
  step: string;
  label_key: string;
  choices: LenaCatalogChoice[];
  choices_by_transport: Record<string, LenaCatalogChoice[]>;
  multiple: boolean;
  mask: string | null;
  unit: string;
};
export type LenaCatalogText = {
  ui: Record<string, string>;
  actions: Record<string, string>;
  welcome: { general: string; load: string };
  draft_created: string;
  labels: Record<string, string>;
  option_descriptions: Record<string, string>;
  location: Record<string, string>;
  steps: Record<string, LenaCatalogStep>;
  form_fields: Record<string, LenaCatalogField>;
};
export type LenaCatalogData = {
  version: number;
  revision: string;
  welcome_actions: string[];
  option_groups: Record<string, string[] | string>;
  container_categories: Record<string, string>;
  locales: Record<LenaCatalogLocale, LenaCatalogText>;
};
let catalog: LenaCatalogData | null = null;

export function installLenaCatalog(data: LenaCatalogData) {
  if (data.version !== 1 || !Array.isArray(data.welcome_actions) || !data.option_groups || !['en', 'de', 'bs'].every((locale) => {
    const text = data.locales?.[locale as LenaCatalogLocale];
    return text?.welcome?.general && text.welcome.load && text.ui && text.steps && text.form_fields && text.location && text.draft_created && text.option_descriptions;
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

/** One Post a load field's label, question, example and picker, as the backend catalog defines it. */
export function lenaField(locale: string | null | undefined, field: string): LenaCatalogField | undefined {
  return catalog ? lenaText(locale).form_fields[field] : undefined;
}

/**
 * The values a field's picker offers for one transport type.
 *
 * Sea and rail pick ports and a Bill of Lading where road picks warehouses and a CMR, so a field
 * whose options differ per transport type carries one list per type; every other field has one.
 */
export function lenaFieldChoices(locale: string | null | undefined, field: string, transport: string): LenaCatalogChoice[] {
  const definition = lenaField(locale, field);
  return definition?.choices_by_transport[transport] ?? definition?.choices ?? [];
}

/** The one-line explanation of an option value (a characteristic, a handling requirement, ...). */
export function lenaOptionDescription(locale: string | null | undefined, value: string): string {
  return (catalog ? lenaText(locale).option_descriptions[value] : '') || '';
}
