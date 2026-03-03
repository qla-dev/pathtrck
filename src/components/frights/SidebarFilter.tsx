import { Check, Filter, MapPin } from 'lucide-react';

import { Language } from '../../types';
import { cn } from '../../lib/cn';
import { ServiceFilters, ServiceItem } from './FrightTypes';

const tr = (lang: Language, en: string, bs: string, de: string) => {
  if (lang === 'bs') return bs;
  if (lang === 'de') return de;
  return en;
};

type SidebarFilterProps = {
  lang: Language;
  serviceItems: ServiceItem[];
  serviceFilters: ServiceFilters;
  startLocation: string;
  endLocation: string;
  startSuggestions: string[];
  endSuggestions: string[];
  isGooglePlacesReady: boolean;
  hasGooglePlacesKey: boolean;
  onStartLocationChange: (value: string) => void;
  onEndLocationChange: (value: string) => void;
  onServiceFilterChange: (key: keyof ServiceFilters, value: boolean) => void;
  onClear: () => void;
  onClose?: () => void;
  embeddedInSidebar?: boolean;
};

export const SidebarFilter = ({
  lang,
  serviceItems,
  serviceFilters,
  startLocation,
  endLocation,
  startSuggestions,
  endSuggestions,
  isGooglePlacesReady,
  hasGooglePlacesKey,
  onStartLocationChange,
  onEndLocationChange,
  onServiceFilterChange,
  onClear,
  onClose,
  embeddedInSidebar = false,
}: SidebarFilterProps) => (
  <aside
    className={cn(
      'space-y-6',
      embeddedInSidebar
        ? 'h-full'
        : 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 h-fit'
    )}
  >
    <div className="flex items-center justify-between">
      <div className="inline-flex items-center gap-2 text-sm font-bold dark:text-white">
        <Filter className="w-4 h-4 text-primary" />
        {tr(lang, 'Filters', 'Filteri', 'Filter')}
      </div>
      <div className="inline-flex items-center gap-2">
        <button
          onClick={() => {
            if (onClose) {
              onClose();
              return;
            }
            onClear();
          }}
          className="text-xs font-semibold text-slate-400 hover:text-primary transition-colors cursor-pointer"
        >
          {tr(lang, 'Close', 'Zatvori', 'Schliessen')}
        </button>
        {onClose && (
          <button
            onClick={onClose}
            aria-label={tr(lang, 'Close filters', 'Zatvori filtere', 'Filter schliessen')}
            className="h-7 w-7 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-primary transition-colors flex items-center justify-center cursor-pointer"
          >
            X
          </button>
        )}
      </div>
    </div>

    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
        {tr(lang, 'Route', 'Ruta', 'Route')}
      </p>
      <div className="space-y-2">
        <label className="block">
          <span className="text-[11px] font-semibold text-slate-500 mb-1 block">
            {tr(lang, 'Start city', 'Grad polaska', 'Startstadt')}
          </span>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            <input
              value={startLocation}
              onChange={(event) => onStartLocationChange(event.target.value)}
              list="frights-start-cities"
              placeholder={tr(lang, 'e.g. Shanghai', 'npr. Shanghai', 'z. B. Shanghai')}
              className="w-full bg-transparent border-0 outline-none text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
            />
          </div>
        </label>
        <label className="block">
          <span className="text-[11px] font-semibold text-slate-500 mb-1 block">
            {tr(lang, 'End city', 'Grad dolaska', 'Zielstadt')}
          </span>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-400" />
            <input
              value={endLocation}
              onChange={(event) => onEndLocationChange(event.target.value)}
              list="frights-end-cities"
              placeholder={tr(lang, 'e.g. Odesa', 'npr. Odesa', 'z. B. Odesa')}
              className="w-full bg-transparent border-0 outline-none text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
            />
          </div>
        </label>
        <datalist id="frights-start-cities">
          {startSuggestions.map((city) => (
            <option key={`start-${city}`} value={city} />
          ))}
        </datalist>
        <datalist id="frights-end-cities">
          {endSuggestions.map((city) => (
            <option key={`end-${city}`} value={city} />
          ))}
        </datalist>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        {isGooglePlacesReady
          ? tr(
              lang,
              'Google Places city prefill is active.',
              'Google Places predfilter gradova je aktivan.',
              'Google-Places-Stadtvorschlaege sind aktiv.'
            )
          : hasGooglePlacesKey
            ? tr(
                lang,
                'Loading Google Places prefill...',
                'Ucitam Google Places predfilter...',
                'Google-Places-Vorschlaege werden geladen...'
              )
            : tr(
                lang,
                'Set VITE_GOOGLE_PLACES_API_KEY to enable Google city prefill.',
                'Postavite VITE_GOOGLE_PLACES_API_KEY za Google predfilter gradova.',
                'Setzen Sie VITE_GOOGLE_PLACES_API_KEY fuer Google-Stadtvorschlaege.'
              )}
      </p>
    </div>

    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
        {tr(lang, 'Included services', 'Ukljucene usluge', 'Enthaltene Services')}
      </p>
      <div className="space-y-2">
        {serviceItems.map((item) => (
          <label
            key={item.key}
            className={cn(
              'flex items-center gap-2 text-sm',
              item.disabled
                ? 'text-slate-300 dark:text-slate-700'
                : 'text-slate-600 dark:text-slate-300'
            )}
          >
            <span
              className={cn(
                'h-4 w-4 rounded border flex items-center justify-center',
                serviceFilters[item.key]
                  ? 'bg-slate-900 dark:bg-slate-100 border-slate-900 dark:border-slate-100'
                  : 'bg-transparent border-slate-300 dark:border-slate-700'
              )}
            >
              {serviceFilters[item.key] && <Check className="w-3 h-3 text-white dark:text-slate-900" />}
            </span>
            <input
              type="checkbox"
              checked={serviceFilters[item.key]}
              disabled={item.disabled}
              onChange={(event) => onServiceFilterChange(item.key, event.target.checked)}
              className="sr-only"
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </div>

    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
        {tr(lang, 'Price', 'Cijena', 'Preis')}
      </p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-500">
          900 USD
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-500">
          1320 USD
        </div>
      </div>
      <div className="relative h-5">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 rounded-full" />
        <div className="absolute top-1/2 -translate-y-1/2 left-[8%] right-[6%] h-1 bg-slate-900 dark:bg-slate-100 rounded-full" />
        <span className="absolute left-[8%] top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-slate-900 dark:border-slate-100" />
        <span className="absolute right-[6%] top-1/2 translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-slate-900 dark:border-slate-100" />
      </div>
    </div>

    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
        {tr(lang, 'Transit time', 'Vrijeme transporta', 'Transitzeit')}
      </p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-500">
          70 {tr(lang, 'days', 'dana', 'Tage')}
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-500">
          170 {tr(lang, 'days', 'dana', 'Tage')}
        </div>
      </div>
      <div className="relative h-5">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 rounded-full" />
        <div className="absolute top-1/2 -translate-y-1/2 left-[5%] right-[11%] h-1 bg-slate-900 dark:bg-slate-100 rounded-full" />
        <span className="absolute left-[5%] top-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-slate-900 dark:border-slate-100" />
        <span className="absolute right-[11%] top-1/2 translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-slate-900 dark:border-slate-100" />
      </div>
    </div>

    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
        {tr(lang, 'Rate status', 'Status cijene', 'Tarifstatus')}
      </p>
      <div className="flex flex-wrap gap-2">
        {['Expired', 'Indicative', 'Spot', 'Space guarantee'].map((status) => (
          <span
            key={status}
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500"
          >
            {status}
          </span>
        ))}
      </div>
    </div>
  </aside>
);
