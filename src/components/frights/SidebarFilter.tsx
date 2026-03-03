import { Check, Filter, MapPin } from 'lucide-react';

import { Language } from '../../types';
import { cn } from '../../lib/cn';
import { ServiceFilters, ServiceItem } from './FrightTypes';

const tr = (lang: Language, en: string, bs: string, de: string) => {
  if (lang === 'bs') return bs;
  if (lang === 'de') return de;
  return en;
};

type RangeFilterConfig = {
  min: number;
  max: number;
  selectedMin: number;
  selectedMax: number;
  onChange: (nextMin: number, nextMax: number) => void;
  prefix?: string;
  suffix?: string;
  allowManualInput?: boolean;
  step?: number;
};

type ChipFilterOption = {
  id: string;
  label: string;
  toneClass: string;
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
  priceRange?: RangeFilterConfig;
  weightRange?: RangeFilterConfig;
  transitRange?: RangeFilterConfig;
  goodsTypeOptions?: ChipFilterOption[];
  paymentTermOptions?: ChipFilterOption[];
  selectedGoodsTypeIds?: string[];
  selectedPaymentTermIds?: string[];
  onToggleGoodsType?: (id: string) => void;
  onTogglePaymentTerm?: (id: string) => void;
};

const formatRangeValue = (value: number, config: RangeFilterConfig) =>
  `${config.prefix || ''}${value}${config.suffix || ''}`;

const formatCompactValue = (value: number) => new Intl.NumberFormat('en-US').format(Math.round(value));

const DualRangeControl = ({ config }: { config: RangeFilterConfig }) => {
  const hasSpan = config.max > config.min;
  const span = Math.max(config.max - config.min, 1);
  const leftPct = hasSpan ? ((config.selectedMin - config.min) / span) * 100 : 0;
  const rightPct = hasSpan ? ((config.selectedMax - config.min) / span) * 100 : 100;
  const prefix = config.prefix?.trim();
  const suffix = config.suffix?.trim();
  const step = Math.max(1, config.step ?? 1);

  return (
    <>
      {config.allowManualInput ? (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <label className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-500 flex items-center gap-1 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition-colors">
            {prefix && <span className="text-slate-400">{prefix}</span>}
            <input
              type="number"
              min={config.min}
              max={config.selectedMax}
              step={step}
              value={config.selectedMin}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                if (!Number.isFinite(nextValue)) return;
                const nextMin = Math.max(config.min, Math.min(nextValue, config.selectedMax));
                config.onChange(nextMin, config.selectedMax);
              }}
              className="w-full bg-transparent border-0 outline-none text-xs text-slate-600 dark:text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            {suffix && <span className="text-slate-400">{suffix}</span>}
          </label>
          <label className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-500 flex items-center gap-1 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition-colors">
            {prefix && <span className="text-slate-400">{prefix}</span>}
            <input
              type="number"
              min={config.selectedMin}
              max={config.max}
              step={step}
              value={config.selectedMax}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                if (!Number.isFinite(nextValue)) return;
                const nextMax = Math.min(config.max, Math.max(nextValue, config.selectedMin));
                config.onChange(config.selectedMin, nextMax);
              }}
              className="w-full bg-transparent border-0 outline-none text-xs text-slate-600 dark:text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            {suffix && <span className="text-slate-400">{suffix}</span>}
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-500">
            {formatRangeValue(config.selectedMin, config)}
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-500">
            {formatRangeValue(config.selectedMax, config)}
          </div>
        </div>
      )}

      <div className="relative h-5">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 rounded-full" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />

        <input
          type="range"
          min={config.min}
          max={config.max}
          step={step}
          value={config.selectedMin}
          onChange={(event) => {
            const nextMin = Math.min(Number(event.target.value), config.selectedMax);
            config.onChange(nextMin, config.selectedMax);
          }}
          className="pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:appearance-none [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-900 dark:[&::-webkit-slider-thumb]:border-slate-100 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-slate-900 dark:[&::-moz-range-thumb]:border-slate-100 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer"
        />
        <input
          type="range"
          min={config.min}
          max={config.max}
          step={step}
          value={config.selectedMax}
          onChange={(event) => {
            const nextMax = Math.max(Number(event.target.value), config.selectedMin);
            config.onChange(config.selectedMin, nextMax);
          }}
          className="pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:appearance-none [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-900 dark:[&::-webkit-slider-thumb]:border-slate-100 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-slate-900 dark:[&::-moz-range-thumb]:border-slate-100 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer"
        />
      </div>
    </>
  );
};

const WeightRangeControl = ({ config, lang }: { config: RangeFilterConfig; lang: Language }) => {
  const span = Math.max(config.max - config.min, 1);
  const step = Math.max(1, config.step ?? 100);
  const selectedSpan = Math.max(config.selectedMax - config.selectedMin, 0);
  const segmentCount = 18;
  const snapToStep = (value: number) => Math.round(value / step) * step;
  const q1 = Math.max(config.min, Math.min(config.max, snapToStep(config.min + span * 0.25)));
  const q2 = Math.max(q1, Math.min(config.max, snapToStep(config.min + span * 0.5)));
  const q3 = Math.max(q2, Math.min(config.max, snapToStep(config.min + span * 0.75)));
  const quickRanges = [
    {
      id: 'all',
      label: tr(lang, 'All', 'Sve', 'Alle'),
      min: config.min,
      max: config.max,
    },
    {
      id: 'light',
      label: `${formatCompactValue(config.min)}-${formatCompactValue(q1)}`,
      min: config.min,
      max: q1,
    },
    {
      id: 'medium',
      label: `${formatCompactValue(q1)}-${formatCompactValue(q2)}`,
      min: q1,
      max: q2,
    },
    {
      id: 'heavy',
      label: `${formatCompactValue(q2)}-${formatCompactValue(q3)}`,
      min: q2,
      max: q3,
    },
    {
      id: 'xl',
      label: `${formatCompactValue(q3)}-${formatCompactValue(config.max)}`,
      min: q3,
      max: config.max,
    },
  ];

  const setMin = (rawValue: number) => {
    const rounded = snapToStep(rawValue);
    const nextMin = Math.max(config.min, Math.min(rounded, config.selectedMax));
    config.onChange(nextMin, config.selectedMax);
  };

  const setMax = (rawValue: number) => {
    const rounded = snapToStep(rawValue);
    const nextMax = Math.min(config.max, Math.max(rounded, config.selectedMin));
    config.onChange(config.selectedMin, nextMax);
  };

  const moveClosestBoundary = (rawValue: number) => {
    const rounded = snapToStep(rawValue);
    if (Math.abs(rounded - config.selectedMin) <= Math.abs(rounded - config.selectedMax)) {
      setMin(rounded);
      return;
    }
    setMax(rounded);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/80 dark:bg-slate-950/60 px-2 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {tr(lang, 'Min kg', 'Min kg', 'Min kg')}
          </p>
          <div className="mt-1 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMin(config.selectedMin - step)}
              className="h-7 w-7 rounded-md bg-slate-100 dark:bg-slate-900/70 text-slate-500 hover:text-primary transition-colors cursor-pointer"
              aria-label={tr(lang, 'Decrease minimum weight', 'Smanji minimalnu tezinu', 'Mindestgewicht verringern')}
            >
              -
            </button>
            <input
              type="number"
              min={config.min}
              max={config.selectedMax}
              step={step}
              value={config.selectedMin}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                if (!Number.isFinite(nextValue)) return;
                setMin(nextValue);
              }}
              className="w-full rounded-md bg-slate-50 dark:bg-slate-950 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 outline-none focus:ring-1 focus:ring-primary/30 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => setMin(config.selectedMin + step)}
              className="h-7 w-7 rounded-md bg-slate-100 dark:bg-slate-900/70 text-slate-500 hover:text-primary transition-colors cursor-pointer"
              aria-label={tr(lang, 'Increase minimum weight', 'Povecaj minimalnu tezinu', 'Mindestgewicht erhoehen')}
            >
              +
            </button>
          </div>
        </div>

        <div className="rounded-lg bg-white/80 dark:bg-slate-950/60 px-2 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {tr(lang, 'Max kg', 'Max kg', 'Max kg')}
          </p>
          <div className="mt-1 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMax(config.selectedMax - step)}
              className="h-7 w-7 rounded-md bg-slate-100 dark:bg-slate-900/70 text-slate-500 hover:text-primary transition-colors cursor-pointer"
              aria-label={tr(lang, 'Decrease maximum weight', 'Smanji maksimalnu tezinu', 'Hoechstgewicht verringern')}
            >
              -
            </button>
            <input
              type="number"
              min={config.selectedMin}
              max={config.max}
              step={step}
              value={config.selectedMax}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                if (!Number.isFinite(nextValue)) return;
                setMax(nextValue);
              }}
              className="w-full rounded-md bg-slate-50 dark:bg-slate-950 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 outline-none focus:ring-1 focus:ring-primary/30 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => setMax(config.selectedMax + step)}
              className="h-7 w-7 rounded-md bg-slate-100 dark:bg-slate-900/70 text-slate-500 hover:text-primary transition-colors cursor-pointer"
              aria-label={tr(lang, 'Increase maximum weight', 'Povecaj maksimalnu tezinu', 'Hoechstgewicht erhoehen')}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {quickRanges.map((range) => {
          const isSelected = config.selectedMin === range.min && config.selectedMax === range.max;
          return (
            <button
              key={range.id}
              type="button"
              onClick={() => config.onChange(range.min, range.max)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer',
                isSelected
                  ? 'bg-primary text-white'
                  : 'bg-slate-200/80 dark:bg-slate-800/90 text-slate-500 hover:text-primary'
              )}
            >
              {range.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg bg-slate-50 dark:bg-slate-950 px-2 py-2">
        <div className="h-12 flex items-end gap-1">
          {Array.from({ length: segmentCount }).map((_, index) => {
            const segmentStartValue = config.min + (index / segmentCount) * span;
            const segmentEndValue = config.min + ((index + 1) / segmentCount) * span;
            const midpoint = (segmentStartValue + segmentEndValue) / 2;
            const isActive = segmentEndValue >= config.selectedMin && segmentStartValue <= config.selectedMax;
            const height = 30 + Math.round(Math.sin(((index + 1) / segmentCount) * Math.PI) * 55);

            return (
              <button
                key={`weight-segment-${index}`}
                type="button"
                onClick={() => moveClosestBoundary(midpoint)}
                className={cn(
                  'flex-1 rounded-sm transition-all cursor-pointer',
                  isActive
                    ? 'bg-gradient-to-t from-primary to-cyan-300 dark:from-primary dark:to-cyan-400'
                    : 'bg-slate-300 dark:bg-slate-800 hover:bg-slate-400 dark:hover:bg-slate-700'
                )}
                style={{ height: `${height}%` }}
                aria-label={`${tr(lang, 'Weight segment', 'Segment tezine', 'Gewichtssegment')} ${index + 1}`}
              >
                <span className="sr-only">
                  {tr(lang, 'Weight segment', 'Segment tezine', 'Gewichtssegment')} {index + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        <span>{formatCompactValue(config.selectedMin)} kg</span>
        <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">
          {tr(lang, 'Span', 'Raspon', 'Spanne')}: {formatCompactValue(selectedSpan)} kg
        </span>
        <span>{formatCompactValue(config.selectedMax)} kg</span>
      </div>
    </div>
  );
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
  priceRange,
  weightRange,
  transitRange,
  goodsTypeOptions = [],
  paymentTermOptions = [],
  selectedGoodsTypeIds = [],
  selectedPaymentTermIds = [],
  onToggleGoodsType,
  onTogglePaymentTerm,
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
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 flex items-center gap-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition-colors">
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
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 flex items-center gap-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition-colors">
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

    {(goodsTypeOptions.length > 0 || paymentTermOptions.length > 0) && (
      <div>
        {goodsTypeOptions.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              {tr(lang, 'Goods type', 'Tip robe', 'Warenart')}
            </p>
            <div className="flex flex-wrap gap-2">
              {goodsTypeOptions.map((option) => {
                const isSelected = selectedGoodsTypeIds.includes(option.id);

                return (
                  <button
                    key={`goods-${option.id}`}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onToggleGoodsType?.(option.id)}
                    className={cn(
                      'px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer',
                      isSelected
                        ? option.toneClass
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {paymentTermOptions.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 pt-2">
              {tr(lang, 'Payment terms', 'Uslovi placanja', 'Zahlungsbedingungen')}
            </p>
            <div className="space-y-2">
              {paymentTermOptions.map((option) => {
                const isSelected = selectedPaymentTermIds.includes(option.id);

                return (
                  <button
                    key={`payment-${option.id}`}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onTogglePaymentTerm?.(option.id)}
                    className={cn(
                      'w-full rounded-xl border px-3 py-2 text-left transition-all cursor-pointer',
                      isSelected
                        ? cn(option.toneClass, 'shadow-sm')
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider">{option.label}</span>
                      <span
                        className={cn(
                          'h-5 w-5 rounded-md border flex items-center justify-center transition-all',
                          isSelected
                            ? 'border-current bg-current/15'
                            : 'border-slate-400/60 dark:border-slate-500/60'
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    )}

    {weightRange && (
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          {tr(lang, 'Load weight', 'Tezina tereta', 'Ladungsgewicht')}
        </p>
        <WeightRangeControl config={weightRange} lang={lang} />
      </div>
    )}

    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
        {tr(lang, 'Price', 'Cijena', 'Preis')}
      </p>
      {priceRange ? (
        <DualRangeControl config={priceRange} />
      ) : (
        <>
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
        </>
      )}
    </div>

    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
        {tr(lang, 'Transit time', 'Vrijeme transporta', 'Transitzeit')}
      </p>
      {transitRange ? (
        <DualRangeControl config={transitRange} />
      ) : (
        <>
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
        </>
      )}
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
  </aside>
);
