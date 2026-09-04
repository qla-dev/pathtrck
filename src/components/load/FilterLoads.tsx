import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Flatpickr from 'react-flatpickr';
import {
  AlertTriangle,
  Banknote,
  Box,
  Boxes,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Container,
  CreditCard,
  DollarSign,
  FileText,
  Forklift,
  Fuel,
  Gem,
  Handshake,
  Hash,
  Layers,
  Loader2,
  MapPin,
  Navigation,
  Package,
  PackageOpen,
  PackageSearch,
  PawPrint,
  Pill,
  Plane,
  RectangleHorizontal,
  RotateCcw,
  Ruler,
  Search,
  Ship,
  ShieldAlert,
  ShieldCheck,
  Snowflake,
  Stamp,
  Thermometer,
  Truck,
  User,
  UserCheck,
  UserX,
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

type ModeTab = {
  id: string;
  label: string;
};

// Freight-exchange filter vocabulary. Ids are the exact values the API expects.
export const TRANSPORT_MODE_IDS = ['road', 'air', 'sea', 'rail', 'multimodal'] as const;
export const CARGO_FLAG_IDS = [
  'general', 'adr', 'temperature_controlled', 'refrigerated', 'fragile',
  'high_value', 'oversized', 'perishable', 'pharmaceutical', 'live_animals',
] as const;
export const EQUIPMENT_IDS = ['FTL', 'LTL', 'FCL', 'LCL', 'Reefer', 'Mega', 'Box', 'Flatbed', 'Tanker', 'Container'] as const;
export const SPECIAL_REQUIREMENT_IDS = ['cmr', 'adr', 'customs', 'tail_lift', 'forklift', 'insurance', 'temperature_control', 'tracking'] as const;
export const ASSIGNMENT_IDS = ['unassigned', 'assigned_to_me', 'assigned_driver', 'available_capacity', 'full_truck', 'partial_load'] as const;

export type ExchangeRouteField = 'pickupCountry' | 'pickupCity' | 'deliveryCountry' | 'deliveryCity';
export type ExchangeDateField = 'pickupDateFrom' | 'pickupDateTo' | 'deliveryDateFrom' | 'deliveryDateTo';

export type ExchangeFilters = {
  transportModes: string[];
  onToggleTransportMode: (id: string) => void;
  route: Record<ExchangeRouteField, string>;
  onRouteChange: (field: ExchangeRouteField, value: string) => void;
  cargoFlags: string[];
  onToggleCargoFlag: (id: string) => void;
  equipmentTypes: string[];
  onToggleEquipmentType: (id: string) => void;
  dates: Record<ExchangeDateField, string>;
  onDateChange: (field: ExchangeDateField, value: string) => void;
  currency: string;
  currencyOptions: string[];
  onCurrencyChange: (value: string) => void;
  specialRequirements: string[];
  onToggleSpecialRequirement: (id: string) => void;
  assignment: string[];
  onToggleAssignment: (id: string) => void;
};

type PillId =
  | 'all'
  | 'transport'
  | 'route'
  | 'cargo'
  | 'equipment'
  | 'date'
  | 'specialRequirements'
  | 'assignment'
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
  trackingSearch: string;
  startLocation: string;
  endLocation: string;
  onTrackingSearchChange: (value: string) => void;
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
  exchange?: ExchangeFilters;
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
  icon,
}: {
  options: ChipFilterOption[];
  selectedIds: string[];
  onToggle?: (id: string) => void;
  icon?: LucideIcon;
}) => (
  <OptionList
    options={options.map((option) => ({ id: option.id, label: option.label, icon: option.icon }))}
    selectedIds={selectedIds}
    onToggle={(id) => onToggle?.(id)}
    fallbackIcon={icon}
  />
);

// Per-option glyphs so every dropdown row reads as an icon + label, matching the select fields.
const OPTION_ICONS: Record<string, LucideIcon> = {
  road: Truck, air: Plane, sea: Ship, multimodal: Layers,
  general: Package, adr: ShieldAlert, temperature_controlled: Thermometer, refrigerated: Snowflake,
  fragile: AlertTriangle, high_value: Gem, oversized: Ruler, perishable: Clock,
  pharmaceutical: Pill, live_animals: PawPrint,
  FTL: Truck, LTL: Boxes, FCL: Container, LCL: Boxes, Reefer: Snowflake, Mega: Truck,
  Box: Box, Flatbed: RectangleHorizontal, Tanker: Fuel, Container: Container,
  cmr: FileText, customs: Stamp, tail_lift: Forklift, forklift: Forklift,
  insurance: ShieldCheck, temperature_control: Thermometer, tracking: Navigation,
  unassigned: UserX, assigned_to_me: UserCheck, assigned_driver: User,
  available_capacity: PackageOpen, full_truck: Truck, partial_load: Boxes,
  EUR: Banknote, BAM: Banknote, GBP: Banknote, USD: Banknote,
  RSD: Banknote, CNY: Banknote, JPY: Banknote,
};

/** Vertical option list used inside every filter dropdown. */
const OptionList = ({
  options,
  selectedIds,
  onToggle,
  fallbackIcon: FallbackIcon = Layers,
}: {
  options: { id: string; label: string; icon?: LucideIcon }[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  fallbackIcon?: LucideIcon;
}) => (
  <div role="listbox" aria-multiselectable className="max-h-64 space-y-0.5 overflow-y-auto">
    {options.map((option) => {
      const isSelected = selectedIds.includes(option.id);
      const Icon = option.icon || OPTION_ICONS[option.id] || FallbackIcon;
      return (
        <button
          key={option.id}
          type="button"
          role="option"
          aria-selected={isSelected}
          onClick={() => onToggle(option.id)}
          className={cn(
            'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold transition-colors',
            isSelected ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
          )}
        >
          <Icon className={cn('h-3.5 w-3.5 shrink-0', isSelected ? 'text-primary' : 'text-slate-400')} />
          <span className="min-w-0 flex-1 truncate">{option.label}</span>
          {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
        </button>
      );
    })}
  </div>
);

const FilterTextInput = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) => (
  <label className="min-w-0 block">
    <span className="mb-1 block text-[11px] font-semibold text-slate-500">{label}</span>
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition-colors focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
    />
  </label>
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
    trackingSearch,
    startLocation,
    endLocation,
    onTrackingSearchChange,
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
    exchange,
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
  const panelBoundsRef = useRef<HTMLDivElement>(null);
  const [anchorLeft, setAnchorLeft] = useState(0);
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
  // On the freight exchange the named groups own the main row, so every other filter is collected
  // here and rendered as a section inside the More filters panel instead of getting its own pill.
  const isExchange = variant === 'transport' && Boolean(exchange);
  const secondary: PillDescriptor[] = [];
  const primary = isExchange ? secondary : pills;

  if (variant === 'storage' && storageTypeOptions.length > 0) {
    pills.push({ id: 'storageType', label: u('feed.storage.type', 'Storage type'), title: u('feed.storage.type', 'Storage type'), icon: Warehouse, isActive: selectedStorageTypeIds.length > 0, content: <ChipGroup options={storageTypeOptions} selectedIds={selectedStorageTypeIds} onToggle={onToggleStorageType} />, onClear: () => clearChipGroup(selectedStorageTypeIds, onToggleStorageType) });
  }
  if (variant === 'storage' && palletRange) {
    pills.push({ id: 'pallets', label: u('feed.storage.pallets', 'Pallets'), title: u('feed.storage.pallets', 'Pallets'), icon: Boxes, isActive: isRangeActive(palletRange), content: <DualRangeControl config={palletRange} />, onClear: () => palletRange.onChange(palletRange.min, palletRange.max) });
  }
  if (variant === 'storage' && volumeRange) {
    pills.push({ id: 'volume', label: u('feed.storage.volume', 'Volume'), title: u('feed.storage.volume', 'Volume'), icon: Ruler, isActive: isRangeActive(volumeRange), content: <DualRangeControl config={volumeRange} />, onClear: () => volumeRange.onChange(volumeRange.min, volumeRange.max) });
  }
  if (variant === 'storage' && requirementOptions.length > 0) {
    pills.push({ id: 'requirements', label: u('feed.storage.requirements', 'Requirements'), title: u('feed.storage.requirements', 'Requirements'), icon: ShieldCheck, isActive: selectedRequirementIds.length > 0, content: <ChipGroup options={requirementOptions} selectedIds={selectedRequirementIds} onToggle={onToggleRequirement} />, onClear: () => clearChipGroup(selectedRequirementIds, onToggleRequirement) });
  }

  if (modeTabs.length > 0 && activeModeTabId && onModeTabChange) {
    const activeTab = modeTabs.find((tab) => tab.id === activeModeTabId);
    primary.push({
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
    primary.push({
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
    primary.push({
      id: 'priceTerms',
      label: variant === 'storage'
        ? u('legacy.sidebarFilter.priceTerms', 'Uslovi cijene')
        : `${u('legacy.sidebarFilter.priceTerms', 'Uslovi cijene')}${selectedPriceTermIds.length ? ` (${selectedPriceTermIds.length})` : ''}`,
      title: u('legacy.sidebarFilter.priceTerms', 'Uslovi cijene'),
      icon: Handshake,
      isActive: selectedPriceTermIds.length > 0,
      content: <ChipGroup options={priceTermOptions} selectedIds={selectedPriceTermIds} onToggle={onTogglePriceTerm} />,
      onClear: () => clearChipGroup(selectedPriceTermIds, onTogglePriceTerm),
    });
  }

  if (paymentTermOptions.length > 0) {
    primary.push({
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
    primary.push({
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
    primary.push({
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
    primary.push({
      id: 'temperature',
      label: variant !== 'storage' && isRangeActive(temperatureRange)
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
    primary.push({
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
    primary.push({
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
    primary.push({
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
    primary.push({
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
    primary.push({
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
    primary.push({
      id: 'price',
      label: variant !== 'storage' && isRangeActive(priceRange) ? formatRangeSummary(priceRange) : u('legacy.sidebarFilter.price', 'Price'),
      title: u('legacy.sidebarFilter.price', 'Price'),
      icon: DollarSign,
      isActive: isRangeActive(priceRange),
      content: <DualRangeControl config={priceRange} />,
      onClear: () => priceRange.onChange(priceRange.min, priceRange.max),
    });
  }

  if (transitRange) {
    primary.push({
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

  if (isExchange && exchange) {
    const label = (id: string, fallback: string) => u(`feed.exchangeFilters.${id}`, fallback);
    const withCount = (base: string, count: number) => (count ? `${base} (${count})` : base);
    const toOptions = (ids: readonly string[], fallbacks: Record<string, string>) =>
      ids.map((id) => ({ id, label: label(id, fallbacks[id] ?? id) }));

    const transportOptions = toOptions(TRANSPORT_MODE_IDS, { road: 'Road', air: 'Air', sea: 'Sea', rail: 'Rail', multimodal: 'Multimodal' });
    const cargoOptions = toOptions(CARGO_FLAG_IDS, {
      general: 'General Cargo', adr: 'ADR / Dangerous Goods', temperature_controlled: 'Temperature Controlled',
      refrigerated: 'Refrigerated', fragile: 'Fragile', high_value: 'High Value', oversized: 'Oversized',
      perishable: 'Perishable', pharmaceutical: 'Pharmaceutical', live_animals: 'Live Animals',
    });
    const equipmentOptions = toOptions(EQUIPMENT_IDS, { Container: 'Container Type' });
    const requirementChips = toOptions(SPECIAL_REQUIREMENT_IDS, {
      cmr: 'CMR', adr: 'ADR', customs: 'Customs', tail_lift: 'Tail Lift', forklift: 'Forklift',
      insurance: 'Insurance', temperature_control: 'Temperature Control', tracking: 'Tracking Required',
    });
    const assignmentChips = toOptions(ASSIGNMENT_IDS, {
      unassigned: 'Unassigned', assigned_to_me: 'Assigned to me', assigned_driver: 'Assigned driver',
      available_capacity: 'Available capacity', full_truck: 'Full truck', partial_load: 'Partial load',
    });

    const routeCount = Object.values(exchange.route).filter(Boolean).length;
    const dateCount = Object.values(exchange.dates).filter(Boolean).length;
    const weightActive = isRangeActive(weightRange) || isRangeActive(volumeRange);
    const priceActive = isRangeActive(priceRange) || Boolean(exchange.currency);
    const secondaryActive = secondary.filter((pill) => pill.isActive).length;
    const anyActive = exchange.transportModes.length > 0 || routeCount > 0 || exchange.cargoFlags.length > 0
      || exchange.equipmentTypes.length > 0 || weightActive || dateCount > 0 || priceActive
      || exchange.specialRequirements.length > 0 || exchange.assignment.length > 0 || secondaryActive > 0;

    pills.push({
      id: 'all',
      label: u('feed.exchangeFilters.all', 'All'),
      title: u('feed.exchangeFilters.all', 'All'),
      icon: Layers,
      isActive: !anyActive,
      content: null,
    });

    pills.push({
      id: 'transport',
      label: withCount(u('feed.exchangeFilters.transport', 'Transport'), exchange.transportModes.length),
      title: u('feed.exchangeFilters.transportMode', 'Transport Mode'),
      icon: Layers,
      isActive: exchange.transportModes.length > 0,
      content: <OptionList options={transportOptions} selectedIds={exchange.transportModes} onToggle={exchange.onToggleTransportMode} />,
      onClear: () => exchange.transportModes.forEach(exchange.onToggleTransportMode),
    });

    const exchangePriceTerms = secondary.find((pill) => pill.id === 'priceTerms');
    if (exchangePriceTerms) {
      pills.push(exchangePriceTerms);
    }

    pills.push({
      id: 'route',
      label: withCount(u('feed.exchangeFilters.route', 'Route'), routeCount),
      title: u('feed.exchangeFilters.route', 'Route'),
      icon: MapPin,
      isActive: routeCount > 0,
      content: (
        <div className="grid grid-cols-2 gap-3">
          <FilterTextInput label={label('pickupCountry', 'Pickup Country')} value={exchange.route.pickupCountry} onChange={(v) => exchange.onRouteChange('pickupCountry', v)} placeholder="BA" />
          <FilterTextInput label={label('pickupCity', 'Pickup City')} value={exchange.route.pickupCity} onChange={(v) => exchange.onRouteChange('pickupCity', v)} placeholder="Sarajevo" />
          <FilterTextInput label={label('deliveryCountry', 'Delivery Country')} value={exchange.route.deliveryCountry} onChange={(v) => exchange.onRouteChange('deliveryCountry', v)} placeholder="DE" />
          <FilterTextInput label={label('deliveryCity', 'Delivery City')} value={exchange.route.deliveryCity} onChange={(v) => exchange.onRouteChange('deliveryCity', v)} placeholder="Berlin" />
        </div>
      ),
      onClear: () => (Object.keys(exchange.route) as ExchangeRouteField[]).forEach((field) => exchange.onRouteChange(field, '')),
    });

    pills.push({
      id: 'cargo',
      label: withCount(u('feed.exchangeFilters.cargo', 'Cargo'), exchange.cargoFlags.length),
      title: u('feed.exchangeFilters.cargo', 'Cargo'),
      icon: PackageSearch,
      isActive: exchange.cargoFlags.length > 0,
      content: <OptionList options={cargoOptions} selectedIds={exchange.cargoFlags} onToggle={exchange.onToggleCargoFlag} />,
      onClear: () => exchange.cargoFlags.forEach(exchange.onToggleCargoFlag),
    });

    pills.push({
      id: 'equipment',
      label: withCount(u('feed.exchangeFilters.equipment', 'Equipment'), exchange.equipmentTypes.length),
      title: u('feed.exchangeFilters.equipment', 'Equipment'),
      icon: Boxes,
      isActive: exchange.equipmentTypes.length > 0,
      content: <OptionList options={equipmentOptions} selectedIds={exchange.equipmentTypes} onToggle={exchange.onToggleEquipmentType} />,
      onClear: () => exchange.equipmentTypes.forEach(exchange.onToggleEquipmentType),
    });

    if (weightRange) {
      pills.push({
        id: 'weight',
        label: isRangeActive(weightRange) ? formatRangeSummary(weightRange) : u('feed.exchangeFilters.weight', 'Weight'),
        title: u('feed.exchangeFilters.weightCapacity', 'Weight / Capacity'),
        icon: Weight,
        isActive: weightActive,
        content: (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[11px] font-semibold text-slate-500">{u('legacy.sidebarFilter.loadWeight', 'Load weight')}</p>
              <WeightRangeControl config={weightRange} u={u} />
            </div>
            {volumeRange && (
              <div>
                <p className="mb-2 text-[11px] font-semibold text-slate-500">{u('feed.storage.volume', 'Volume')}</p>
                <DualRangeControl config={volumeRange} />
              </div>
            )}
          </div>
        ),
        onClear: () => {
          weightRange.onChange(weightRange.min, weightRange.max);
          volumeRange?.onChange(volumeRange.min, volumeRange.max);
        },
      });
    }

    pills.push({
      id: 'date',
      label: withCount(u('feed.exchangeFilters.date', 'Date'), dateCount),
      title: u('feed.exchangeFilters.date', 'Date'),
      icon: CalendarDays,
      isActive: dateCount > 0,
      content: (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold text-slate-500">{label('pickupDate', 'Pickup date')}</p>
            <div className="grid grid-cols-2 gap-3">
              <StorageDatePicker value={exchange.dates.pickupDateFrom} onChange={(v) => exchange.onDateChange('pickupDateFrom', v)} lang={lang} maxDate={exchange.dates.pickupDateTo || undefined} />
              <StorageDatePicker value={exchange.dates.pickupDateTo} onChange={(v) => exchange.onDateChange('pickupDateTo', v)} lang={lang} minDate={exchange.dates.pickupDateFrom || undefined} />
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-semibold text-slate-500">{label('deliveryDate', 'Delivery date')}</p>
            <div className="grid grid-cols-2 gap-3">
              <StorageDatePicker value={exchange.dates.deliveryDateFrom} onChange={(v) => exchange.onDateChange('deliveryDateFrom', v)} lang={lang} maxDate={exchange.dates.deliveryDateTo || undefined} />
              <StorageDatePicker value={exchange.dates.deliveryDateTo} onChange={(v) => exchange.onDateChange('deliveryDateTo', v)} lang={lang} minDate={exchange.dates.deliveryDateFrom || undefined} />
            </div>
          </div>
        </div>
      ),
      onClear: () => (Object.keys(exchange.dates) as ExchangeDateField[]).forEach((field) => exchange.onDateChange(field, '')),
    });

    if (priceRange) {
      pills.push({
        id: 'price',
        label: isRangeActive(priceRange) ? formatRangeSummary(priceRange) : u('legacy.sidebarFilter.price', 'Price'),
        title: u('legacy.sidebarFilter.price', 'Price'),
        icon: DollarSign,
        isActive: priceActive,
        content: (
          <div className="space-y-4">
            <DualRangeControl config={priceRange} />
            <div>
              <p className="mb-2 text-[11px] font-semibold text-slate-500">{u('feed.exchangeFilters.currency', 'Currency')}</p>
              <OptionList
                options={exchange.currencyOptions.map((code) => ({ id: code, label: code }))}
                selectedIds={exchange.currency ? [exchange.currency] : []}
                onToggle={(id) => exchange.onCurrencyChange(exchange.currency === id ? '' : id)}
              />
            </div>
          </div>
        ),
        onClear: () => {
          priceRange.onChange(priceRange.min, priceRange.max);
          exchange.onCurrencyChange('');
        },
      });
    }

    pills.push({
      id: 'specialRequirements',
      label: withCount(u('feed.exchangeFilters.specialRequirements', 'Special Requirements'), exchange.specialRequirements.length),
      title: u('feed.exchangeFilters.specialRequirements', 'Special Requirements'),
      icon: ShieldCheck,
      isActive: exchange.specialRequirements.length > 0,
      content: <OptionList options={requirementChips} selectedIds={exchange.specialRequirements} onToggle={exchange.onToggleSpecialRequirement} />,
      onClear: () => exchange.specialRequirements.forEach(exchange.onToggleSpecialRequirement),
    });

    const exchangeGoodsType = secondary.find((pill) => pill.id === 'goodsType');
    if (exchangeGoodsType) {
      pills.push(exchangeGoodsType);
    }

    pills.push({
      id: 'assignment',
      label: withCount(u('feed.exchangeFilters.assignment', 'Assignment'), exchange.assignment.length),
      title: u('feed.exchangeFilters.assignment', 'Assignment'),
      icon: Handshake,
      isActive: exchange.assignment.length > 0,
      content: <OptionList options={assignmentChips} selectedIds={exchange.assignment} onToggle={exchange.onToggleAssignment} />,
      onClear: () => exchange.assignment.forEach(exchange.onToggleAssignment),
    });

    // Everything that is not one of the named groups keeps its own pill in the same row. Weight
    // and price already have a richer exchange pill above, so their generic version is dropped
    // rather than rendered a second time under the same key.
    const namedIds = new Set(pills.map((pill) => pill.id));
    pills.push(...secondary.filter((pill) => !namedIds.has(pill.id)));
  }

  useEffect(() => {
    updatePillsScrollState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pills.length]);

  const activePill = pills.find((pill) => pill.id === openPanel) || null;

  return (
    // One wrapper, not a fragment: as siblings the search row and the pill row each picked up the
    // parent's space-y gap, which stacked with the row's own margin and made the pills sit further
    // from the search fields than from the results.
    <div className="w-full min-w-0 space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="block flex-1">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
            {u('feed.filterBar.trackingNumber', 'Tracking number')}
          </span>
          <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 transition-colors focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 dark:border-slate-700 dark:bg-slate-950">
            <Hash className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={trackingSearch}
              onChange={(event) => onTrackingSearchChange(event.target.value)}
              placeholder={u('feed.filterBar.searchTrackingNumber', 'Search FB tracking number...')}
              className="w-full border-0 bg-transparent font-mono text-sm text-slate-700 outline-none placeholder:font-sans placeholder:text-slate-400 dark:text-slate-200"
            />
          </div>
        </label>

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
            <div className="absolute left-0 right-0 top-full z-[80] mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
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
            <div className="absolute left-0 right-0 top-full z-[80] mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
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

      <div className="relative h-11 w-full min-w-0" ref={panelBoundsRef}>
        <div
          ref={pillsScrollRef}
          onScroll={updatePillsScrollState}
          // Sits above the dropdown's outside-click backdrop so switching straight from one open
          // filter to another is a single click instead of close-then-open.
          className="relative z-50 flex h-11 w-full min-w-0 items-center gap-2 overflow-x-scroll overflow-y-hidden py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {pills.map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={(event) => {
                if (pill.id === 'all') { onClear(); return; }
                // The row scrolls horizontally, so anchor the dropdown to the pill's position
                // within the row rather than nesting it (overflow-x would clip it).
                const row = pillsScrollRef.current;
                setAnchorLeft(event.currentTarget.offsetLeft - (row?.scrollLeft ?? 0));
                setOpenPanel((current) => (current === pill.id ? null : pill.id));
              }}
              className={cn(
                'inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-xs font-bold transition-colors',
                pill.isActive
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600'
              )}
            >
              <pill.icon className="h-3.5 w-3.5" />
              {pill.label}
              {pill.id !== 'all' && <ChevronDown className="h-3 w-3 opacity-60" />}
            </button>
          ))}
        </div>

        {canScrollPillsLeft && (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-[60] flex w-12 items-center bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-950">
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
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[60] flex w-12 items-center justify-end bg-gradient-to-l from-slate-50 to-transparent dark:from-slate-950">
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
        {activePill && activePill.id !== 'all' && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpenPanel(null)} />
            <div
              className="absolute top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
              style={{ left: Math.max(0, Math.min(anchorLeft, (panelBoundsRef.current?.clientWidth ?? 0) - 288)) }}
            >
              <div className="flex items-center justify-between gap-2 px-1.5 pb-2 pt-1">
                <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <activePill.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{activePill.title}</span>
                </span>
                {activePill.onClear && (
                  <button
                    type="button"
                    onClick={activePill.onClear}
                    className="shrink-0 cursor-pointer text-[10px] font-bold text-primary underline"
                  >
                    {u('tracking.clearAll', 'Clear all')}
                  </button>
                )}
              </div>
              {activePill.content}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
