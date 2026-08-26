import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Flatpickr from 'react-flatpickr';
import {
  AlertTriangle,
  Boxes,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Forklift,
  Gem,
  Handshake,
  Layers,
  Loader2,
  MapPin,
  PackageSearch,
  RotateCcw,
  Ruler,
  Search,
  ShieldAlert,
  ShieldCheck,
  Thermometer,
  Weight,
  Warehouse,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Language } from '../../types';
import { flatpickrI18n, ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { useLocationAutocomplete } from '../../hooks/useLocationAutocomplete';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import {
  ChipFilterOption,
  DimensionRangeConfig,
  DualRangeControl,
  RangeFilterConfig,
  WeightRangeControl,
  formatCompactValue,
} from './RangeControls';
import { FilterItem } from './FilterItem';

type ModeTab = {
  id: string;
  label: string;
};

type PillId =
  | 'mode'
  | 'goodsType'
  | 'priceTerms'
  | 'paymentTerms'
  | 'weight'
  | 'dimensions'
  | 'temperature'
  | 'cargoValue'
  | 'adrClass'
  | 'sensitivity'
  | 'urgency'
  | 'loadingMethod'
  | 'price'
  | 'transit'
  | 'storageType'
  | 'pallets'
  | 'volume'
  | 'requirements';

export type FilterLoadsProps = {
  lang: Language;
  startLocation: string;
  endLocation: string;
  onStartLocationChange: (value: string) => void;
  onEndLocationChange: (value: string) => void;
  onClear: () => void;
  modeTabs?: ModeTab[];
  activeModeTabId?: string;
  onModeTabChange?: (id: string) => void;
  priceRange?: RangeFilterConfig;
  weightRange?: RangeFilterConfig;
  dimensionRanges?: DimensionRangeConfig;
  temperatureRange?: RangeFilterConfig;
  cargoValueRange?: RangeFilterConfig;
  transitRange?: RangeFilterConfig;
  goodsTypeOptions?: ChipFilterOption[];
  priceTermOptions?: ChipFilterOption[];
  paymentTermOptions?: ChipFilterOption[];
  adrClassOptions?: ChipFilterOption[];
  sensitivityOptions?: ChipFilterOption[];
  urgencyOptions?: ChipFilterOption[];
  loadingMethodOptions?: ChipFilterOption[];
  selectedGoodsTypeIds?: string[];
  selectedPriceTermIds?: string[];
  selectedPaymentTermIds?: string[];
  selectedAdrClassIds?: string[];
  selectedSensitivityIds?: string[];
  selectedUrgencyIds?: string[];
  selectedLoadingMethodIds?: string[];
  onToggleGoodsType?: (id: string) => void;
  onTogglePriceTerm?: (id: string) => void;
  onTogglePaymentTerm?: (id: string) => void;
  onToggleAdrClass?: (id: string) => void;
  onToggleSensitivity?: (id: string) => void;
  onToggleUrgency?: (id: string) => void;
  onToggleLoadingMethod?: (id: string) => void;
  variant?: 'transport' | 'storage';
  palletRange?: RangeFilterConfig;
  volumeRange?: RangeFilterConfig;
  storageTypeOptions?: ChipFilterOption[];
  selectedStorageTypeIds?: string[];
  onToggleStorageType?: (id: string) => void;
  requirementOptions?: ChipFilterOption[];
  selectedRequirementIds?: string[];
  onToggleRequirement?: (id: string) => void;
  storageStartFrom?: string;
  storageStartTo?: string;
  onStorageStartFromChange?: (value: string) => void;
  onStorageStartToChange?: (value: string) => void;
};

const isRangeActive = (config?: RangeFilterConfig) =>
  Boolean(config) && (config!.selectedMin > config!.min || config!.selectedMax < config!.max);

const formatRangeSummary = (config: RangeFilterConfig) =>
  `${config.prefix || ''}${formatCompactValue(config.selectedMin)}${config.suffix || ''} – ${config.prefix || ''}${formatCompactValue(config.selectedMax)}${config.suffix || ''}`;

const StorageDatePicker = ({
  value,
  onChange,
  lang,
  minDate,
  maxDate,
}: {
  value: string;
  onChange?: (value: string) => void;
  lang: Language;
  minDate?: string;
  maxDate?: string;
}) => (
  <span className="relative block">
    <CalendarDays className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
    <Flatpickr
      value={value}
      options={{
        dateFormat: 'Y-m-d',
        altInput: true,
        altInputClass: 'h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white',
        altFormat: 'd.m.Y',
        allowInput: true,
        locale: flatpickrI18n(lang),
        minDate,
        maxDate,
      }}
      onChange={(_, dateStr) => onChange?.(dateStr)}
      placeholder="dd.mm.yyyy"
      className="h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
    />
  </span>
);

const ChipGroup = ({
  options,
  selectedIds,
  onToggle,
}: {
  options: ChipFilterOption[];
  selectedIds: string[];
  onToggle?: (id: string) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {options.map((option) => {
      const isSelected = selectedIds.includes(option.id);
      return (
        <button
          key={option.id}
          type="button"
          aria-pressed={isSelected}
          onClick={() => onToggle?.(option.id)}
          className={cn(
            'cursor-pointer rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all',
            isSelected
              ? option.toneClass
              : 'border-transparent bg-slate-100 text-slate-500 hover:border-slate-300 dark:bg-slate-800 dark:hover:border-slate-600'
          )}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);

type PillDescriptor = {
  id: PillId;
  label: string;
  title: string;
  icon: LucideIcon;
  isActive: boolean;
  content: ReactNode;
  onClear?: () => void;
};

export const FilterLoads = (props: FilterLoadsProps) => {
  const {
    lang,
    startLocation,
    endLocation,
    onStartLocationChange,
    onEndLocationChange,
    onClear,
    modeTabs = [],
    activeModeTabId,
    onModeTabChange,
    priceRange,
    weightRange,
    dimensionRanges,
    temperatureRange,
    cargoValueRange,
    transitRange,
    goodsTypeOptions = [],
    priceTermOptions = [],
    paymentTermOptions = [],
    adrClassOptions = [],
    sensitivityOptions = [],
    urgencyOptions = [],
    loadingMethodOptions = [],
    selectedGoodsTypeIds = [],
    selectedPriceTermIds = [],
    selectedPaymentTermIds = [],
    selectedAdrClassIds = [],
    selectedSensitivityIds = [],
    selectedUrgencyIds = [],
    selectedLoadingMethodIds = [],
    onToggleGoodsType,
    onTogglePriceTerm,
    onTogglePaymentTerm,
    onToggleAdrClass,
    onToggleSensitivity,
    onToggleUrgency,
    onToggleLoadingMethod,
    variant = 'transport',
    palletRange,
    volumeRange,
    storageTypeOptions = [],
    selectedStorageTypeIds = [],
    onToggleStorageType,
    requirementOptions = [],
    selectedRequirementIds = [],
    onToggleRequirement,
    storageStartFrom = '',
    storageStartTo = '',
    onStorageStartFromChange,
    onStorageStartToChange,
  } = props;

  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [openPanel, setOpenPanel] = useState<PillId | null>(null);
  const startSearch = useLocationAutocomplete(startLocation);
  const endSearch = useLocationAutocomplete(endLocation);
  const startFieldRef = useRef<HTMLLabelElement>(null);
  const endFieldRef = useRef<HTMLLabelElement>(null);
  useOutsideClick(startFieldRef, startSearch.close, startSearch.isOpen);
  useOutsideClick(endFieldRef, endSearch.close, endSearch.isOpen);

  const pillsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollPillsLeft, setCanScrollPillsLeft] = useState(false);
  const [canScrollPillsRight, setCanScrollPillsRight] = useState(false);

  const updatePillsScrollState = () => {
    const el = pillsScrollRef.current;
    if (!el) return;
    setCanScrollPillsLeft(el.scrollLeft > 1);
    setCanScrollPillsRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    const el = pillsScrollRef.current;
    if (!el) return undefined;
    updatePillsScrollState();
    const observer = new ResizeObserver(updatePillsScrollState);
    observer.observe(el);
    window.addEventListener('resize', updatePillsScrollState);
    return () => {
      window.removeEventListener('resize', updatePillsScrollState);
      observer.disconnect();
    };
  }, []);

  const scrollPillsBy = (amount: number) => {
    pillsScrollRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const clearChipGroup = (selectedIds: string[], onToggle?: (id: string) => void) => {
    selectedIds.forEach((id) => onToggle?.(id));
  };

  const pills: PillDescriptor[] = [];

  if (variant === 'storage' && storageTypeOptions.length > 0) {
    pills.push({ id: 'storageType', label: `${u('feed.storage.type', 'Storage type')}${selectedStorageTypeIds.length ? ` (${selectedStorageTypeIds.length})` : ''}`, title: u('feed.storage.type', 'Storage type'), icon: Warehouse, isActive: selectedStorageTypeIds.length > 0, content: <ChipGroup options={storageTypeOptions} selectedIds={selectedStorageTypeIds} onToggle={onToggleStorageType} />, onClear: () => clearChipGroup(selectedStorageTypeIds, onToggleStorageType) });
  }
  if (variant === 'storage' && palletRange) {
    pills.push({ id: 'pallets', label: isRangeActive(palletRange) ? formatRangeSummary(palletRange) : u('feed.storage.pallets', 'Pallets'), title: u('feed.storage.pallets', 'Pallets'), icon: Boxes, isActive: isRangeActive(palletRange), content: <DualRangeControl config={palletRange} />, onClear: () => palletRange.onChange(palletRange.min, palletRange.max) });
  }
  if (variant === 'storage' && volumeRange) {
    pills.push({ id: 'volume', label: isRangeActive(volumeRange) ? formatRangeSummary(volumeRange) : u('feed.storage.volume', 'Volume'), title: u('feed.storage.volume', 'Volume'), icon: Ruler, isActive: isRangeActive(volumeRange), content: <DualRangeControl config={volumeRange} />, onClear: () => volumeRange.onChange(volumeRange.min, volumeRange.max) });
  }
  if (variant === 'storage' && requirementOptions.length > 0) {
    pills.push({ id: 'requirements', label: `${u('feed.storage.requirements', 'Requirements')}${selectedRequirementIds.length ? ` (${selectedRequirementIds.length})` : ''}`, title: u('feed.storage.requirements', 'Requirements'), icon: ShieldCheck, isActive: selectedRequirementIds.length > 0, content: <ChipGroup options={requirementOptions} selectedIds={selectedRequirementIds} onToggle={onToggleRequirement} />, onClear: () => clearChipGroup(selectedRequirementIds, onToggleRequirement) });
  }

  if (modeTabs.length > 0 && activeModeTabId && onModeTabChange) {
    const activeTab = modeTabs.find((tab) => tab.id === activeModeTabId);
    pills.push({
      id: 'mode',
      label: `${u('feed.filterBar.source', 'Source')}: ${activeTab?.label ?? ''}`,
      title: u('feed.filterBar.source', 'Source'),
      icon: Layers,
      isActive: activeModeTabId !== modeTabs[0]?.id,
      content: (
        <div className="space-y-2">
          {modeTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onModeTabChange(tab.id)}
              className={cn(
                'w-full cursor-pointer rounded-xl border px-4 py-3 text-left text-sm font-bold transition-all',
                activeModeTabId === tab.id
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ),
    });
  }

  if (goodsTypeOptions.length > 0) {
    pills.push({
      id: 'goodsType',
      label: `${u('legacy.sidebarFilter.goodsType', 'Goods type')}${selectedGoodsTypeIds.length ? ` (${selectedGoodsTypeIds.length})` : ''}`,
      title: u('legacy.sidebarFilter.goodsType', 'Goods type'),
      icon: PackageSearch,
      isActive: selectedGoodsTypeIds.length > 0,
      content: <ChipGroup options={goodsTypeOptions} selectedIds={selectedGoodsTypeIds} onToggle={onToggleGoodsType} />,
      onClear: () => clearChipGroup(selectedGoodsTypeIds, onToggleGoodsType),
    });
  }

  if (priceTermOptions.length > 0) {
    pills.push({
      id: 'priceTerms',
      label: `${u('legacy.sidebarFilter.priceTerms', 'Uslovi cijene')}${selectedPriceTermIds.length ? ` (${selectedPriceTermIds.length})` : ''}`,
      title: u('legacy.sidebarFilter.priceTerms', 'Uslovi cijene'),
      icon: Handshake,
      isActive: selectedPriceTermIds.length > 0,
      content: <ChipGroup options={priceTermOptions} selectedIds={selectedPriceTermIds} onToggle={onTogglePriceTerm} />,
      onClear: () => clearChipGroup(selectedPriceTermIds, onTogglePriceTerm),
    });
  }

  if (paymentTermOptions.length > 0) {
    pills.push({
      id: 'paymentTerms',
      label: `${u('legacy.sidebarFilter.paymentTerms', 'Payment terms')}${selectedPaymentTermIds.length ? ` (${selectedPaymentTermIds.length})` : ''}`,
      title: u('legacy.sidebarFilter.paymentTerms', 'Payment terms'),
      icon: CreditCard,
      isActive: selectedPaymentTermIds.length > 0,
      content: (
        <ChipGroup options={paymentTermOptions} selectedIds={selectedPaymentTermIds} onToggle={onTogglePaymentTerm} />
      ),
      onClear: () => clearChipGroup(selectedPaymentTermIds, onTogglePaymentTerm),
    });
  }

  if (weightRange) {
    pills.push({
      id: 'weight',
      label: isRangeActive(weightRange)
        ? formatRangeSummary(weightRange)
        : u('legacy.sidebarFilter.loadWeight', 'Load weight'),
      title: u('legacy.sidebarFilter.loadWeight', 'Load weight'),
      icon: Weight,
      isActive: isRangeActive(weightRange),
      content: <WeightRangeControl config={weightRange} u={u} />,
      onClear: () => weightRange.onChange(weightRange.min, weightRange.max),
    });
  }

  if (dimensionRanges) {
    const dimensionsActive =
      isRangeActive(dimensionRanges.length) || isRangeActive(dimensionRanges.width) || isRangeActive(dimensionRanges.height);
    pills.push({
      id: 'dimensions',
      label: u('feed.filters.dimensions', 'Dimensions'),
      title: u('feed.filters.dimensions', 'Dimensions'),
      icon: Ruler,
      isActive: dimensionsActive,
      content: (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold text-slate-500">{u('feed.filters.length', 'Length')}</p>
            <DualRangeControl config={dimensionRanges.length} />
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold text-slate-500">{u('feed.filters.width', 'Width')}</p>
            <DualRangeControl config={dimensionRanges.width} />
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold text-slate-500">{u('feed.filters.height', 'Height')}</p>
            <DualRangeControl config={dimensionRanges.height} />
          </div>
        </div>
      ),
      onClear: () => {
        dimensionRanges.length.onChange(dimensionRanges.length.min, dimensionRanges.length.max);
        dimensionRanges.width.onChange(dimensionRanges.width.min, dimensionRanges.width.max);
        dimensionRanges.height.onChange(dimensionRanges.height.min, dimensionRanges.height.max);
      },
    });
  }

  if (temperatureRange) {
    pills.push({
      id: 'temperature',
      label: isRangeActive(temperatureRange)
        ? formatRangeSummary(temperatureRange)
        : u('feed.filters.temperature', 'Temperature regime'),
      title: u('feed.filters.temperature', 'Temperature regime'),
      icon: Thermometer,
      isActive: isRangeActive(temperatureRange),
      content: <DualRangeControl config={temperatureRange} />,
      onClear: () => temperatureRange.onChange(temperatureRange.min, temperatureRange.max),
    });
  }

  if (cargoValueRange) {
    pills.push({
      id: 'cargoValue',
      label: isRangeActive(cargoValueRange)
        ? formatRangeSummary(cargoValueRange)
        : u('feed.filters.cargoValue', 'Cargo value'),
      title: u('feed.filters.cargoValue', 'Cargo value'),
      icon: Gem,
      isActive: isRangeActive(cargoValueRange),
      content: <DualRangeControl config={cargoValueRange} />,
      onClear: () => cargoValueRange.onChange(cargoValueRange.min, cargoValueRange.max),
    });
  }

  if (adrClassOptions.length > 0) {
    pills.push({
      id: 'adrClass',
      label: `${u('feed.filters.adrClass', 'ADR class')}${selectedAdrClassIds.length ? ` (${selectedAdrClassIds.length})` : ''}`,
      title: u('feed.filters.adrClass', 'ADR class'),
      icon: ShieldAlert,
      isActive: selectedAdrClassIds.length > 0,
      content: <ChipGroup options={adrClassOptions} selectedIds={selectedAdrClassIds} onToggle={onToggleAdrClass} />,
      onClear: () => clearChipGroup(selectedAdrClassIds, onToggleAdrClass),
    });
  }

  if (sensitivityOptions.length > 0) {
    pills.push({
      id: 'sensitivity',
      label: `${u('feed.filters.sensitivity', 'Sensitivity')}${selectedSensitivityIds.length ? ` (${selectedSensitivityIds.length})` : ''}`,
      title: u('feed.filters.sensitivity', 'Sensitivity'),
      icon: AlertTriangle,
      isActive: selectedSensitivityIds.length > 0,
      content: (
        <ChipGroup options={sensitivityOptions} selectedIds={selectedSensitivityIds} onToggle={onToggleSensitivity} />
      ),
      onClear: () => clearChipGroup(selectedSensitivityIds, onToggleSensitivity),
    });
  }

  if (urgencyOptions.length > 0) {
    pills.push({
      id: 'urgency',
      label: `${u('feed.filters.urgency', 'Urgency')}${selectedUrgencyIds.length ? ` (${selectedUrgencyIds.length})` : ''}`,
      title: u('feed.filters.urgency', 'Urgency'),
      icon: Zap,
      isActive: selectedUrgencyIds.length > 0,
      content: <ChipGroup options={urgencyOptions} selectedIds={selectedUrgencyIds} onToggle={onToggleUrgency} />,
      onClear: () => clearChipGroup(selectedUrgencyIds, onToggleUrgency),
    });
  }

  if (loadingMethodOptions.length > 0) {
    pills.push({
      id: 'loadingMethod',
      label: `${u('feed.filters.loadingMethod', 'Loading method')}${selectedLoadingMethodIds.length ? ` (${selectedLoadingMethodIds.length})` : ''}`,
      title: u('feed.filters.loadingMethod', 'Loading method'),
      icon: Forklift,
      isActive: selectedLoadingMethodIds.length > 0,
      content: (
        <ChipGroup
          options={loadingMethodOptions}
          selectedIds={selectedLoadingMethodIds}
          onToggle={onToggleLoadingMethod}
        />
      ),
      onClear: () => clearChipGroup(selectedLoadingMethodIds, onToggleLoadingMethod),
    });
  }

  if (priceRange) {
    pills.push({
      id: 'price',
      label: isRangeActive(priceRange) ? formatRangeSummary(priceRange) : u('legacy.sidebarFilter.price', 'Price'),
      title: u('legacy.sidebarFilter.price', 'Price'),
      icon: DollarSign,
      isActive: isRangeActive(priceRange),
      content: <DualRangeControl config={priceRange} />,
      onClear: () => priceRange.onChange(priceRange.min, priceRange.max),
    });
  }

  if (transitRange) {
    pills.push({
      id: 'transit',
      label: isRangeActive(transitRange)
        ? formatRangeSummary(transitRange)
        : u('legacy.sidebarFilter.transitTime', 'Transit time'),
      title: u('legacy.sidebarFilter.transitTime', 'Transit time'),
      icon: Clock,
      isActive: isRangeActive(transitRange),
      content: <DualRangeControl config={transitRange} />,
      onClear: () => transitRange.onChange(transitRange.min, transitRange.max),
    });
  }

  useEffect(() => {
    updatePillsScrollState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pills.length]);

  const activePill = pills.find((pill) => pill.id === openPanel) || null;

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label ref={startFieldRef} className="relative block flex-1">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
            {variant === 'storage' ? u('feed.storage.location', 'Warehouse location') : u('feed.filterBar.pickup', 'Pickup')}
          </span>
          <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 dark:border-slate-700 dark:bg-slate-950">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={startLocation}
              onChange={(event) => onStartLocationChange(event.target.value)}
              onFocus={startSearch.open}
              placeholder={variant === 'storage' ? u('feed.storage.searchLocation', 'Search warehouse location...') : u('feed.filterBar.searchCity', 'Search city...')}
              className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
            />
            {startSearch.loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />}
          </div>
          {startSearch.isOpen && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              {startSearch.results.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => {
                    const nextValue = result.city || result.label;
                    startSearch.select(nextValue);
                    onStartLocationChange(nextValue);
                  }}
                  className="flex w-full cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{result.label}</span>
                </button>
              ))}
            </div>
          )}
        </label>

        {variant === 'transport' && <label ref={endFieldRef} className="relative block flex-1">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
            {u('feed.filterBar.delivery', 'Delivery')}
          </span>
          <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 dark:border-slate-700 dark:bg-slate-950">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={endLocation}
              onChange={(event) => onEndLocationChange(event.target.value)}
              onFocus={endSearch.open}
              placeholder={u('feed.filterBar.searchCity', 'Search city...')}
              className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
            />
            {endSearch.loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />}
          </div>
          {endSearch.isOpen && (
            <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              {endSearch.results.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => {
                    const nextValue = result.city || result.label;
                    endSearch.select(nextValue);
                    onEndLocationChange(nextValue);
                  }}
                  className="flex w-full cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{result.label}</span>
                </button>
              ))}
            </div>
          )}
        </label>}

        {variant === 'storage' && (
          <div className="grid flex-[1.2] grid-cols-2 gap-3">
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">{u('feed.storage.availableFrom', 'Available from')}</span>
              <StorageDatePicker value={storageStartFrom} onChange={onStorageStartFromChange} lang={lang} maxDate={storageStartTo || undefined} />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">{u('feed.storage.availableTo', 'Available to')}</span>
              <StorageDatePicker value={storageStartTo} onChange={onStorageStartToChange} lang={lang} minDate={storageStartFrom || undefined} />
            </label>
          </div>
        )}

        <button
          type="button"
          onClick={(event) => event.currentTarget.blur()}
          className="h-11 shrink-0 cursor-pointer rounded-xl bg-primary px-6 text-sm font-bold text-white transition-all hover:scale-[1.02]"
        >
          {u('feed.filterBar.search', 'Search')}
        </button>

        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition-all hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:text-slate-200"
        >
          <RotateCcw className="h-4 w-4" />
          {u('legacy.sidebarFilter.resetFilters', 'Reset filters')}
        </button>
      </div>

      <div className="relative mt-3">
        <div
          ref={pillsScrollRef}
          onScroll={updatePillsScrollState}
          className="flex items-center gap-2 overflow-x-auto py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {pills.map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setOpenPanel(pill.id)}
              className={cn(
                'inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-xs font-bold transition-all',
                pill.isActive
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600'
              )}
            >
              <pill.icon className="h-3.5 w-3.5" />
              {pill.label}
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          ))}
        </div>

        {canScrollPillsLeft && (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 flex w-12 items-center bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-950">
            <button
              type="button"
              onClick={() => scrollPillsBy(-240)}
              aria-label="Scroll filters left"
              className="pointer-events-auto flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:text-primary dark:border-slate-700 dark:bg-slate-900"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}

        {canScrollPillsRight && (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 flex w-12 items-center justify-end bg-gradient-to-l from-slate-50 to-transparent dark:from-slate-950">
            <button
              type="button"
              onClick={() => scrollPillsBy(240)}
              aria-label="Scroll filters right"
              className="pointer-events-auto flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-all hover:text-primary dark:border-slate-700 dark:bg-slate-900"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <FilterItem
        open={Boolean(activePill)}
        lang={lang}
        title={activePill?.label || ''}
        icon={activePill?.icon || Layers}
        onClose={() => setOpenPanel(null)}
        onClear={activePill?.onClear}
      >
        {activePill?.content}
      </FilterItem>
    </>
  );
};
