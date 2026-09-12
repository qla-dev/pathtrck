// Container equipment registry for the Sea and Rail transport types' "Container types" picker.
// The codes, their equipment category and their labels all come from the LenaAI catalog
// (backend/resources/lena/schema.json + lang/*/lena.php), so the chat and the form offer exactly
// the same containers. Standard dry containers are recommended first; the rest are grouped by
// special-equipment category the way ocean carriers (CMA CGM, Maersk) present their equipment.
import { getLenaCatalog, lenaFieldChoices } from '../lib/lenaCatalog';
import { CONTAINER_TYPE_OPTIONS } from '../components/modals/loadFormOptions';

export type SeaContainerCategory = 'Standard' | 'Open Top' | 'Reefer' | 'Flat Rack' | 'Platform';

export type SeaContainerType = {
  code: string;
  category: SeaContainerCategory;
};

export const SEA_CONTAINER_TYPES: SeaContainerType[] = CONTAINER_TYPE_OPTIONS.map((code) => ({
  code,
  category: getLenaCatalog().container_categories[code] as SeaContainerCategory,
}));

export const SEA_CONTAINER_CATEGORIES: SeaContainerCategory[] = [
  ...new Set(SEA_CONTAINER_TYPES.map((container) => container.category)),
];

export const containerLabel = (code: string, lang?: string | null): string =>
  lenaFieldChoices(lang, 'containerSelections', 'sea').find((choice) => choice.value === code)?.label || code;
