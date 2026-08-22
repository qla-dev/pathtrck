import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  CreditCard,
  DollarSign,
  Forklift,
  Gem,
  Layers,
  MapPin,
  PackageSearch,
  RotateCcw,
  Ruler,
  Search,
  ShieldAlert,
  Thermometer,
  Weight,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Language } from '../../types';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
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
  | 'transit';

export type FilterLoadsProps = {
  lang: Language;
  startLocation: string;
  endLocation: string;
  startSuggestions: string[];
  endSuggestions: string[];
  isCityApiReady?: boolean;
  hasCityApiKey?: boolean;
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
  paymentTermOptions?: ChipFilterOption[];
  adrClassOptions?: ChipFilterOption[];
  sensitivityOptions?: ChipFilterOption[];
  urgencyOptions?: ChipFilterOption[];
  loadingMethodOptions?: ChipFilterOption[];
  selectedGoodsTypeIds?: string[];
  selectedPaymentTermIds?: string[];
  selectedAdrClassIds?: string[];
  selectedSensitivityIds?: string[];
  selectedUrgencyIds?: string[];
  selectedLoadingMethodIds?: string[];
  onToggleGoodsType?: (id: string) => void;
  onTogglePaymentTerm?: (id: string) => void;
  onToggleAdrClass?: (id: string) => void;
  onToggleSensitivity?: (id: string) => void;
  onToggleUrgency?: (id: string) => void;
  onToggleLoadingMethod?: (id: string) => void;
};

const isRangeActive = (config?: RangeFilterConfig) =>
  Boolean(config) && (config!.selectedMin > config!.min || config!.selectedMax < config!.max);

const formatRangeSummary = (config: RangeFilterConfig) =>
  `${config.prefix || ''}${formatCompactValue(config.selectedMin)}${config.suffix || ''} – ${config.prefix || ''}${formatCompactValue(config.selectedMax)}${config.suffix || ''}`;

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
    startSuggestions,
    endSuggestions,
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
    paymentTermOptions = [],
    adrClassOptions = [],
    sensitivityOptions = [],
    urgencyOptions = [],
    loadingMethodOptions = [],
    selectedGoodsTypeIds = [],
    selectedPaymentTermIds = [],
    selectedAdrClassIds = [],
    selectedSensitivityIds = [],
    selectedUrgencyIds = [],
    selectedLoadingMethodIds = [],
    onToggleGoodsType,
    onTogglePaymentTerm,
    onToggleAdrClass,
    onToggleSensitivity,
    onToggleUrgency,
    onToggleLoadingMethod,
  } = props;

  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [openPanel, setOpenPanel] = useState<PillId | null>(null);

  const clearChipGroup = (selectedIds: string[], onToggle?: (id: string) => void) => {
    selectedIds.forEach((id) => onToggle?.(id));
  };

  const pills: PillDescriptor[] = [];

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

  const activePill = pills.find((pill) => pill.id === openPanel) || null;

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="block flex-1">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
            {u('feed.filterBar.pickup', 'Pickup')}
          </span>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 dark:border-slate-700 dark:bg-slate-950">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={startLocation}
              onChange={(event) => onStartLocationChange(event.target.value)}
              list="feed-start-cities"
              placeholder={u('feed.filterBar.searchCity', 'Search city...')}
              className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
            />
          </div>
        </label>

        <label className="block flex-1">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
            {u('feed.filterBar.delivery', 'Delivery')}
          </span>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 dark:border-slate-700 dark:bg-slate-950">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={endLocation}
              onChange={(event) => onEndLocationChange(event.target.value)}
              list="feed-end-cities"
              placeholder={u('feed.filterBar.searchCity', 'Search city...')}
              className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
            />
          </div>
        </label>

        <datalist id="feed-start-cities">
          {startSuggestions.map((city) => (
            <option key={`start-${city}`} value={city} />
          ))}
        </datalist>
        <datalist id="feed-end-cities">
          {endSuggestions.map((city) => (
            <option key={`end-${city}`} value={city} />
          ))}
        </datalist>

        <button
          type="button"
          onClick={(event) => event.currentTarget.blur()}
          className="h-11 shrink-0 cursor-pointer rounded-xl bg-slate-900 px-6 text-sm font-bold text-white transition-all hover:scale-[1.02] dark:bg-white dark:text-slate-900"
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

      <div className="mt-3 flex items-center gap-2 overflow-x-auto overflow-y-hidden pb-1 [scrollbar-width:thin] [scrollbar-color:rgb(148_163_184/0.72)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-400/70 dark:[scrollbar-color:rgb(71_85_105/0.8)_transparent] dark:[&::-webkit-scrollbar-thumb]:bg-slate-600/80">
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
