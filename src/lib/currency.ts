export const SUPPORTED_CURRENCIES = [
  'BAM',
  'EUR',
  'GBP',
  'USD',
  'RSD',
  'CNY',
  'JPY',
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

const CURRENCY_SYMBOLS: Partial<Record<SupportedCurrency, string>> = {
  BAM: 'KM',
  EUR: '€',
  GBP: '£',
  USD: '$',
  CNY: '¥',
  JPY: '¥',
};

export const currencySymbol = (currency: string): string =>
  CURRENCY_SYMBOLS[currency as SupportedCurrency] || currency;
