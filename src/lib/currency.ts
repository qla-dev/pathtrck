// The currencies a load, an offer or a storage rate can be quoted in. The list is the LenaAI
// catalog's (backend/resources/lena/schema.json), the same one the guided questionnaire and the Post
// a load form read, so there is one answer to "which currencies do we support". The symbols below
// are presentation and stay here.
import { lenaOptions } from './lenaCatalog';

export const SUPPORTED_CURRENCIES: readonly string[] = lenaOptions('CURRENCY_OPTIONS');

const CURRENCY_SYMBOLS: Record<string, string> = {
  BAM: 'KM',
  EUR: '€',
  GBP: '£',
  USD: '$',
  CNY: '¥',
  JPY: '¥',
};

export const currencySymbol = (currency: string): string => CURRENCY_SYMBOLS[currency] || currency;
