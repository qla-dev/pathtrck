import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  Boxes,
  CheckCircle2,
  Clock3,
  Gavel,
  Lock,
  MapPin,
  Plus,
  ShieldCheck,
  Warehouse as WarehouseIcon,
  X,
  XCircle,
} from 'lucide-react';

import { cn } from '../../lib/cn';
import {
  CAPACITY_STATUS_OPTIONS,
  CAPACITY_UNIT_OPTIONS,
  CURRENCY_OPTIONS,
  MINIMUM_STORAGE_PERIOD_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
  WAREHOUSE_OPTIONAL_CONDITION_ITEMS,
  WAREHOUSE_PRICE_BASIS_OPTIONS,
  WAREHOUSE_SERVICE_ITEMS,
  WAREHOUSE_VAT_OPTIONS,
  createEmptyPriceBreakdownRow,
  requestedWarehouseServices,
  seedPriceBreakdownFromServices,
  warehouseServiceLabel,
  warehouseServiceUnit,
} from '../../lib/offerBid';
import { ui } from '../../i18n';
import { Language, Load, Offer, PriceBreakdownRow, Role } from '../../types';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { AddWarehouseModal } from '../modals/AddWarehouseModal/AddWarehouseModal';
import {
  Checkbox,
  DateField,
  DateTimeField,
  FieldLabel,
  RadioDot,
  currencySymbol,
  fieldInputClass,
  formatShortDate,
} from './bidFormFields';

type WarehouseBidModalProps = {
  open: boolean;
  lang: Language;
  load: Load;
  draft: Offer;
  onDraftChange: (patch: Partial<Offer>) => void;
  editing: boolean;
  loading: boolean;
  readOnly?: boolean;
  /** 'counter' prefills the form from an existing offer but submits as a brand-new counter-offer instead of updating it. */
  variant?: 'bid' | 'counter';
  role?: Role;
  userId?: number;
  onClose: () => void;
  onSubmit: () => void;
};

const getCountryCode = (location: string) => {
  const countryCode = location.split(',').at(-1)?.trim().toUpperCase() || '';
  return /^[A-Z]{2}$/.test(countryCode) ? countryCode : '';
};

const countryFlagUrl = (countryCode: string) => `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

/** "~3 months" / "~6 weeks" - how long the goods are meant to stay, from the requested window. */
const storagePeriodLabel = (start?: string, end?: string, ongoing?: boolean): string => {
  if (ongoing) return 'Ongoing';
  const from = start ? Date.parse(start) : NaN;
  const to = end ? Date.parse(end) : NaN;
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return '—';
  const days = Math.round((to - from) / 86400000);
  if (days < 14) return `~${days} days`;
  if (days < 60) return `~${Math.round(days / 7)} weeks`;
  return `~${Math.round(days / 30)} months`;
};

/** How long is left before the storage has to start - the window a provider is bidding into. */
const timeRemainingLabel = (target?: string): string => {
  const deadline = target ? Date.parse(target) : NaN;
  if (!Number.isFinite(deadline)) return '—';
  const ms = deadline - Date.now();
  if (ms <= 0) return 'Expired';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
};

const warehouseLabel = (warehouse: Record<string, unknown>): string =>
  String(warehouse.name || `Warehouse #${warehouse.id}`);

const normalizeCapability = (value: unknown): string =>
  String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

/** Maps facility-profile capabilities onto the services that can be quoted in a warehouse bid. */
const warehouseServiceKeys = (warehouse?: Record<string, unknown>): Set<string> => {
  if (!warehouse) return new Set();
  const profileCapabilities = [warehouse.capabilities, warehouse.handling_capabilities]
    .flatMap((value) => Array.isArray(value) ? value : [])
    .map(normalizeCapability);
  const capabilities = new Set(profileCapabilities);
  const services = new Set<string>();

  WAREHOUSE_SERVICE_ITEMS.forEach((item) => {
    if (capabilities.has(normalizeCapability(item.key)) || capabilities.has(normalizeCapability(item.label))) services.add(item.key);
  });
  if (capabilities.has('receiving')) {
    services.add('unloading');
    services.add('goods_inspection');
  }
  if (capabilities.has('packing')) {
    services.add('loading');
    services.add('palletization');
  }
  if (capabilities.has('picking') && capabilities.has('packing')) services.add('pick_pack');
  if (capabilities.has('value_added')) ['repacking', 'labeling', 'kitting'].forEach((key) => services.add(key));

  return services;
};

const serviceKeyFromLabel = (label: string): string =>
  WAREHOUSE_SERVICE_ITEMS.find((item) => item.label === label)?.key || '';

const WAREHOUSE_SERVICE_UNITS = Array.from(new Set(WAREHOUSE_SERVICE_ITEMS.map((item) => item.unit)));

/** Bordered card wrapping one numbered step of the form. */
const Section = ({
  index,
  title,
  hint,
  className,
  children,
}: {
  index: number;
  title: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <section className={cn('flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800', className)}>
    <p className="text-xs font-black uppercase tracking-wider text-primary">
      {index}. {title}
      {hint && <span className="normal-case text-slate-400"> ({hint})</span>}
    </p>
    {children}
  </section>
);

export const WarehouseBidModal = ({
  open,
  lang,
  load,
  draft,
  onDraftChange,
  editing,
  loading,
  readOnly = false,
  variant = 'bid',
  userId,
  onClose,
  onSubmit,
}: WarehouseBidModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [warehouses, setWarehouses] = useState<Array<Record<string, unknown>>>([]);
  const [addWarehouseOpen, setAddWarehouseOpen] = useState(false);
  const locationCountryCode = getCountryCode(load.delivery);
  const requestedServices = useMemo(() => requestedWarehouseServices(load), [load]);
  const selectedWarehouse = warehouses.find((warehouse) => String(warehouse.id) === draft.warehouseId);
  const supportedServiceKeys = useMemo(() => warehouseServiceKeys(selectedWarehouse), [selectedWarehouse]);
  const otherServices = useMemo(
    () => WAREHOUSE_SERVICE_ITEMS.filter((item) => supportedServiceKeys.has(item.key) && !requestedServices.includes(item.key)),
    [requestedServices, supportedServiceKeys]
  );

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !loading && !addWarehouseOpen) onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [addWarehouseOpen, loading, onClose, open]);

  // A bid may only name a facility owned by the logged-in bidder. Network-wide visibility in the
  // warehouse directory must never leak unrelated facilities into this selector.
  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      try {
        const response = await api.warehouses.list({ per_page: 100 });
        if (!active) return;
        setWarehouses(readOnly
          ? response.data
          : response.data.filter((warehouse) => Number(warehouse.user_id) === userId));
      } catch {
        if (active) setWarehouses([]);
      }
    })();
    return () => { active = false; };
  }, [open, readOnly, userId]);

  // Existing bids can open with a warehouse already selected. Once that profile arrives, normalize
  // the draft exactly as an explicit warehouse selection would, without mutating read-only views.
  useEffect(() => {
    if (!selectedWarehouse || readOnly) return;
    const supported = warehouseServiceKeys(selectedWarehouse);
    const servicesIncluded = draft.servicesIncluded.filter((key) => supported.has(key));
    const priceBreakdown = draft.priceBreakdown.map((row) => {
      const key = serviceKeyFromLabel(row.service);
      return key && !supported.has(key) ? createEmptyPriceBreakdownRow() : row;
    });
    const missesRequestedServices = requestedServices.some((key) => !supported.has(key));
    const changed = servicesIncluded.length !== draft.servicesIncluded.length
      || priceBreakdown.some((row, index) => row !== draft.priceBreakdown[index])
      || (missesRequestedServices && (draft.canPerformAsRequired || draft.capacityStatus !== 'propose_changes'));
    if (!changed) return;
    onDraftChange({
      servicesIncluded,
      priceBreakdown,
      ...(missesRequestedServices ? { canPerformAsRequired: false, capacityStatus: 'propose_changes' } : {}),
    });
  }, [readOnly, selectedWarehouse]);

  const updateBreakdownRow = (index: number, patch: Partial<PriceBreakdownRow>) => {
    onDraftChange({ priceBreakdown: draft.priceBreakdown.map((row, i) => (i === index ? { ...row, ...patch } : row)) });
  };

  /** A checked service owns one pricing row; empty rows are reused before the table grows. */
  const toggleService = (key: string) => {
    if (!supportedServiceKeys.has(key)) return;
    const isSelected = draft.servicesIncluded.includes(key);
    const servicesIncluded = isSelected
      ? draft.servicesIncluded.filter((item) => item !== key)
      : [...draft.servicesIncluded, key];
    const label = warehouseServiceLabel(key);
    const existingRow = draft.priceBreakdown.findIndex((row) => row.service === label);
    const firstEmptyRow = draft.priceBreakdown.findIndex((row) => row.service.trim() === '');

    onDraftChange({
      servicesIncluded,
      priceBreakdown: isSelected
        ? draft.priceBreakdown.map((row) => row.service === label ? createEmptyPriceBreakdownRow() : row)
          : existingRow >= 0
          ? draft.priceBreakdown
          : firstEmptyRow >= 0
            ? draft.priceBreakdown.map((row, index) => index === firstEmptyRow ? { ...row, service: label, unit: warehouseServiceUnit(key) } : row)
            : [...draft.priceBreakdown, createEmptyPriceBreakdownRow(label, warehouseServiceUnit(key))],
    });
  };

  const selectWarehouse = (warehouseId: string, createdWarehouse?: Record<string, unknown>) => {
    const warehouse = createdWarehouse || warehouses.find((item) => String(item.id) === warehouseId);
    const supported = warehouseServiceKeys(warehouse);
    const servicesIncluded = draft.servicesIncluded.filter((key) => supported.has(key));
    const missesRequestedServices = requestedServices.some((key) => !supported.has(key));
    const priceBreakdown = draft.priceBreakdown.map((row) => {
      const key = serviceKeyFromLabel(row.service);
      return key && !supported.has(key) ? createEmptyPriceBreakdownRow() : row;
    });

    onDraftChange({
      warehouseId,
      servicesIncluded,
      priceBreakdown,
      ...(missesRequestedServices ? { canPerformAsRequired: false, capacityStatus: 'propose_changes' } : {}),
    });
  };

  const updateBreakdownService = (index: number, key: string) => {
    const previousKey = serviceKeyFromLabel(draft.priceBreakdown[index]?.service || '');
    const nextItem = WAREHOUSE_SERVICE_ITEMS.find((item) => item.key === key);
    const priceBreakdown = draft.priceBreakdown.map((row, rowIndex) => rowIndex === index
      ? { ...row, service: nextItem?.label || '', unit: nextItem?.unit || '' }
      : row);
    let servicesIncluded = draft.servicesIncluded;

    if (previousKey && !priceBreakdown.some((row, rowIndex) => rowIndex !== index && serviceKeyFromLabel(row.service) === previousKey)) {
      servicesIncluded = servicesIncluded.filter((item) => item !== previousKey);
    }
    if (key && !servicesIncluded.includes(key)) servicesIncluded = [...servicesIncluded, key];
    onDraftChange({ priceBreakdown, servicesIncluded });
  };

  const toggleCondition = (key: string) => {
    onDraftChange({
      optionalConditions: draft.optionalConditions.includes(key)
        ? draft.optionalConditions.filter((item) => item !== key)
        : [...draft.optionalConditions, key],
    });
  };

  const requirementRows: Array<{ label: string; active: boolean }> = [
    { label: u('ADR / Dangerous goods', 'ADR / Dangerous goods'), active: Boolean(load.requiresAdr) },
    { label: u('Food / Pharma', 'Food / Pharma'), active: Boolean(load.requiresFoodGrade) },
    { label: u('Temperature controlled', 'Temperature controlled'), active: load.storageType === 'Chilled' || load.storageType === 'Frozen' },
    { label: u('Fragile goods', 'Fragile goods'), active: Boolean(load.isFragile) },
    { label: u('Customs bonded', 'Customs bonded'), active: (load.warehouseRequirements || []).includes('Customs bonded') },
    { label: u('Insurance', 'Insurance'), active: (load.warehouseRequirements || []).includes('Insurance') },
    { label: u('Security', 'Security'), active: (load.warehouseRequirements || []).includes('Security') },
  ];

  const quantityLabel = load.pallets != null
    ? `${load.pallets} ${u('EUR pallets', 'EUR pallets')}`
    : load.volume != null ? `${load.volume} m³` : '—';

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-160 flex flex-col bg-white dark:bg-slate-950"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 dark:border-slate-800 md:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                <Gavel className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-black text-slate-900 dark:text-white">
                  {variant === 'counter'
                    ? u('Counter offer', 'Counter offer')
                    : readOnly
                      ? u('Bid details', 'Bid details')
                      : editing
                        ? u('legacy.loadDetails.changeOffer', 'Change offer')
                        : load.isNegotiable === false ? u('reservation.submit', 'Submit reservation request') : u('Bid on Warehousing Request', 'Bid on Warehousing Request')}
                </p>
                <p className="truncate text-xs font-semibold uppercase tracking-wider text-primary">{load.trackingNumber || '—'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:text-primary disabled:cursor-not-allowed dark:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 md:p-7 lg:overflow-hidden lg:p-0">
            <div className="grid gap-6 lg:h-full lg:grid-cols-[300px_1fr]">
              <div className="lg:h-full lg:min-h-0 lg:py-7 lg:pl-7">
                <div className="space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:h-full lg:min-h-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{u('Request summary', 'Request summary')}</p>
                      <p className="truncate text-base font-black text-slate-900 dark:text-white">{load.publicId || `#${load.id}`}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      {load.status === 'Posted' ? u('Open for bids', 'Open for bids') : load.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{u('Posted', 'Posted')} {formatShortDate(load.date)}</p>

                  <div className="space-y-1 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {locationCountryCode && <img src={countryFlagUrl(locationCountryCode)} alt="" className="h-3.5 w-5 rounded-sm object-cover" />}
                      <span className="truncate font-bold text-slate-800 dark:text-white">{load.delivery || '—'}</span>
                    </div>
                    {load.storageRadiusKm != null && (
                      <p className="pl-5 text-xs text-slate-500">{u('Radius: up to', 'Radius: up to')} {load.storageRadiusKm} km</p>
                    )}
                  </div>

                  <div className="space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{u('Storage request', 'Storage request')}</p>
                    <dl className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between gap-2"><dt className="text-slate-500">{u('Warehouse type', 'Warehouse type')}</dt><dd className="font-bold text-slate-800 dark:text-white">{load.storageType || '—'}</dd></div>
                      <div className="flex items-center justify-between gap-2"><dt className="text-slate-500">{u('Quantity', 'Quantity')}</dt><dd className="font-bold text-slate-800 dark:text-white">{quantityLabel}</dd></div>
                      <div className="flex items-center justify-between gap-2"><dt className="text-slate-500">{u('Start date', 'Start date')}</dt><dd className="font-bold text-slate-800 dark:text-white">{formatShortDate(load.storageStartDate)}</dd></div>
                      <div className="flex items-center justify-between gap-2"><dt className="text-slate-500">{u('Storage period', 'Storage period')}</dt><dd className="font-bold text-slate-800 dark:text-white">{storagePeriodLabel(load.storageStartDate, load.storageEndDate, load.isStorageOngoing)}</dd></div>
                      <div className="flex items-center justify-between gap-2"><dt className="text-slate-500">{u('Temperature', 'Temperature')}</dt><dd className="font-bold text-slate-800 dark:text-white">{load.storageType === 'Chilled' || load.storageType === 'Frozen' ? `${load.temperatureMin ?? '—'}° / ${load.temperatureMax ?? '—'}°C` : u('Ambient', 'Ambient')}</dd></div>
                    </dl>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{u('Requested services', 'Requested services')}</p>
                    {requestedServices.map((key) => (
                      <div key={key} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        {u(warehouseServiceLabel(key), warehouseServiceLabel(key))}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{u('Special requirements', 'Special requirements')}</p>
                    {requirementRows.map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-slate-600 dark:text-slate-300">{row.label}</span>
                        <span className={cn('font-bold', row.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white')}>
                          {row.active ? u('common.yes', 'Yes') : u('common.no', 'No')}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                    <span className="flex items-center gap-1.5 text-slate-500"><Clock3 className="h-3.5 w-3.5" />{u('Time remaining', 'Time remaining')}</span>
                    <span className="font-black text-primary">{timeRemainingLabel(load.storageStartDate)}</span>
                  </div>
                </div>
              </div>

              <fieldset disabled={readOnly} className="m-0 flex min-w-0 flex-col gap-5 border-0 p-0 lg:h-full lg:min-h-0 lg:-mx-2 lg:mr-7 lg:overflow-y-auto lg:px-2 lg:py-7">
                <Section index={1} title={u('Your commercial offer', 'Your commercial offer')}>
                  <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="block"><FieldLabel required>{u('Total estimated price', 'Total estimated price')}</FieldLabel>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">{currencySymbol(draft.currency)}</span>
                          <input type="number" step="0.01" value={load.isNegotiable === false ? load.budget : draft.amount} disabled={load.isNegotiable === false} onChange={(e) => onDraftChange({ amount: e.target.value })} className={cn(fieldInputClass, 'pl-9')} />
                        </div>
                      </label>
                      <label className="block"><FieldLabel required>{u('Currency', 'Currency')}</FieldLabel>
                        <select disabled={load.isNegotiable === false} value={draft.currency} onChange={(e) => onDraftChange({ currency: e.target.value })} className={cn(fieldInputClass, 'cursor-pointer')}>
                          {CURRENCY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </label>
                      <label className="block"><FieldLabel required>{u('Payment terms', 'Payment terms')}</FieldLabel>
                        <select value={draft.paymentTerms} onChange={(e) => onDraftChange({ paymentTerms: e.target.value })} className={cn(fieldInputClass, 'cursor-pointer')}>
                          {PAYMENT_TERMS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{u(option.label, option.label)}</option>)}
                        </select>
                      </label>
                      <label className="block"><FieldLabel required>{u('Offer valid until', 'Offer valid until')}</FieldLabel>
                        <DateTimeField value={draft.validUntil} onChange={(value) => onDraftChange({ validUntil: value })} lang={lang} />
                      </label>

                      <div className="relative min-w-0 sm:col-span-2">
                        <FieldLabel required>{u('Warehouse', 'Warehouse')}</FieldLabel>
                        <button
                          type="button"
                          onClick={() => setAddWarehouseOpen(true)}
                          aria-label={u('warehouses.create', 'Add Warehouse')}
                          title={u('warehouses.create', 'Add Warehouse')}
                          className="absolute -top-1 right-0 z-10 flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-sm transition-colors hover:bg-primary/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-default disabled:opacity-50"
                        >
                          <Plus className="h-3 w-3" strokeWidth={3} />
                        </button>
                        <select value={draft.warehouseId} onChange={(e) => selectWarehouse(e.target.value)} className={cn(fieldInputClass, 'cursor-pointer')}>
                          <option value="">{warehouses.length ? u('Select a warehouse…', 'Select a warehouse…') : u('No warehouse profile yet', 'No warehouse profile yet')}</option>
                          {warehouses.map((warehouse) => (
                            <option key={String(warehouse.id)} value={String(warehouse.id)}>{warehouseLabel(warehouse)}</option>
                          ))}
                        </select>
                      </div>

                      <div className="min-w-0 sm:col-span-2">
                        {selectedWarehouse ? (
                          <div className="flex h-14 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-800 dark:bg-slate-900">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <WarehouseIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-800 dark:text-white">{[selectedWarehouse.city, selectedWarehouse.country_code].filter(Boolean).join(', ') || warehouseLabel(selectedWarehouse)}</p>
                              <p className="truncate text-xs text-slate-500">{[
                                Number(selectedWarehouse.total_capacity_pallets) > 0 ? `${Number(selectedWarehouse.total_capacity_pallets).toLocaleString()} ${u('pallets', 'pallets')}` : '',
                                ...(Array.isArray(selectedWarehouse.storage_types) ? selectedWarehouse.storage_types.map(String) : []),
                              ].filter(Boolean).join(' · ') || u('Details on the warehouse profile', 'Details on the warehouse profile')}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex h-14 items-center rounded-xl border border-dashed border-slate-200 px-3 text-xs text-slate-500 dark:border-slate-800">
                            {u('Select the facility where the goods will be stored.', 'Select the facility where the goods will be stored.')}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="block"><FieldLabel required>{u('Price basis', 'Price basis')}</FieldLabel>
                        <select value={draft.priceBasis} onChange={(e) => onDraftChange({ priceBasis: e.target.value })} className={cn(fieldInputClass, 'cursor-pointer')}>
                          {WAREHOUSE_PRICE_BASIS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{u(option.label, option.label)}</option>)}
                        </select>
                      </label>
                      <label className="block"><FieldLabel required>{u('VAT', 'VAT')}</FieldLabel>
                        <select value={draft.vat} onChange={(e) => onDraftChange({ vat: e.target.value })} className={cn(fieldInputClass, 'cursor-pointer')}>
                          {WAREHOUSE_VAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{u(option.label, option.label)}</option>)}
                        </select>
                      </label>

                      <div className="sm:col-span-2">
                      <FieldLabel>{u('Price breakdown', 'Price breakdown')}</FieldLabel>
                      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
                        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_90px_32px] items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900">
                          <span>{u('Service', 'Service')}</span>
                          <span>{u('Unit', 'Unit')}</span>
                          <span className="text-right">{u('Price', 'Price')} ({draft.currency})</span>
                          <span />
                        </div>
                        {draft.priceBreakdown.length === 0 && (
                          <p className="px-3 py-3 text-xs text-slate-500">
                            {u('Tick the services you offer below, or add a line here.', 'Tick the services you offer below, or add a line here.')}
                          </p>
                        )}
                        {draft.priceBreakdown.map((row, index) => (
                          <div key={index} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_90px_32px] items-center gap-2 border-b border-slate-100 px-3 py-1.5 last:border-b-0 dark:border-slate-800/60">
                            <select
                              value={serviceKeyFromLabel(row.service)}
                              onChange={(event) => updateBreakdownService(index, event.target.value)}
                              className="w-full min-w-0 cursor-pointer bg-transparent py-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                            >
                              <option value="">{u('Service', 'Service')}</option>
                              {WAREHOUSE_SERVICE_ITEMS.filter((item) => (selectedWarehouse && supportedServiceKeys.has(item.key)) || item.label === row.service).map((item) => (
                                <option
                                  key={item.key}
                                  value={item.key}
                                  disabled={draft.priceBreakdown.some((candidate, candidateIndex) => candidateIndex !== index && candidate.service === item.label)}
                                >
                                  {u(item.label, item.label)}
                                </option>
                              ))}
                            </select>
                            <select
                              value={row.unit}
                              onChange={(event) => updateBreakdownRow(index, { unit: event.target.value })}
                              className="w-full min-w-0 cursor-pointer bg-transparent py-1 text-xs text-slate-500 outline-none dark:text-slate-300"
                            >
                              <option value="">{u('Unit', 'Unit')}</option>
                              {WAREHOUSE_SERVICE_UNITS.map((unit) => <option key={unit} value={unit}>{u(unit, unit)}</option>)}
                            </select>
                            <input type="number" step="0.01" value={row.price} onChange={(e) => updateBreakdownRow(index, { price: e.target.value })} placeholder="0.00" className="w-full min-w-0 bg-transparent py-1 text-right text-sm font-bold text-slate-800 outline-none dark:text-white" />
                            <button type="button" onClick={() => onDraftChange({ priceBreakdown: draft.priceBreakdown.filter((_, i) => i !== index) })} className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-500 disabled:cursor-default dark:hover:bg-slate-800">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => onDraftChange({ priceBreakdown: [...draft.priceBreakdown, createEmptyPriceBreakdownRow()] })}
                        className="mt-2 flex cursor-pointer items-center gap-1.5 text-sm font-bold text-primary disabled:cursor-default"
                      >
                        <Plus className="h-4 w-4" /> {u('Add another charge', 'Add another charge')}
                      </button>
                    </div>
                    </div>
                  </div>
                </Section>

                <Section index={2} title={u('Warehouse availability', 'Warehouse availability')}>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)]">
                    <div className="min-w-0">
                      <FieldLabel required>{u('Can you accept this request?', 'Can you accept this request?')}</FieldLabel>
                      <div className="flex h-11 flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {CAPACITY_STATUS_OPTIONS.map((option) => (
                          <label key={option.value} className="flex cursor-pointer items-center gap-1.5 has-[:disabled]:cursor-default">
                            <RadioDot checked={draft.capacityStatus === option.value} onChange={() => onDraftChange({ capacityStatus: option.value })} />
                            <span className="whitespace-nowrap text-[13px]">{u(option.label, option.label)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <label className="block"><FieldLabel required>{u('Available from', 'Available from')}</FieldLabel>
                      <DateField value={draft.availableFrom} onChange={(value) => onDraftChange({ availableFrom: value })} lang={lang} />
                    </label>
                    <div className="min-w-0"><FieldLabel required>{u('Available capacity', 'Available capacity')}</FieldLabel>
                      <div className="flex gap-2">
                        <input type="number" min="0" value={draft.availableCapacity} onChange={(e) => onDraftChange({ availableCapacity: e.target.value })} className={cn(fieldInputClass, 'min-w-0')} />
                        <select value={draft.capacityUnit} onChange={(e) => onDraftChange({ capacityUnit: e.target.value })} className={cn(fieldInputClass, 'w-36 shrink-0 cursor-pointer')}>
                          {CAPACITY_UNIT_OPTIONS.map((option) => <option key={option} value={option}>{u(option, option)}</option>)}
                        </select>
                      </div>
                    </div>
                    <label className="block"><FieldLabel>{u('Minimum storage period', 'Minimum storage period')}</FieldLabel>
                      <select value={draft.minimumStoragePeriod} onChange={(e) => onDraftChange({ minimumStoragePeriod: e.target.value })} className={cn(fieldInputClass, 'cursor-pointer')}>
                        {MINIMUM_STORAGE_PERIOD_OPTIONS.map((option) => <option key={option.value} value={option.value}>{u(option.label, option.label)}</option>)}
                      </select>
                    </label>
                  </div>

                  <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{u('I confirm that I can provide the requested warehouse services according to the request requirements.', 'I confirm that I can provide the requested warehouse services according to the request requirements.')}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <label className="flex cursor-pointer items-center gap-1.5 has-[:disabled]:cursor-default">
                        <RadioDot checked={draft.canPerformAsRequired} onChange={() => onDraftChange({ canPerformAsRequired: true })} />
                        {u('common.yes', 'Yes')}
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5 has-[:disabled]:cursor-default">
                        <RadioDot checked={!draft.canPerformAsRequired} onChange={() => onDraftChange({ canPerformAsRequired: false })} />
                        {u('No, I need to propose changes', 'No, I need to propose changes')}
                      </label>
                    </div>
                  </div>
                </Section>

                <Section index={3} title={u('Services included in your offer', 'Services included in your offer')}>
                  {!selectedWarehouse ? (
                    <p className="rounded-xl border border-dashed border-slate-200 px-4 py-5 text-sm font-semibold text-slate-500 dark:border-slate-800">
                      {u('Choose a warehouse to see its available services.', 'Choose a warehouse to see its available services.')}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{u('Requested services', 'Requested services')}</p>
                        {requestedServices.map((key) => {
                          const supported = supportedServiceKeys.has(key);
                          return (
                            <label key={key} className={cn('flex items-center justify-between gap-2 text-sm', supported ? 'cursor-pointer' : 'cursor-not-allowed')}>
                              <span className="flex min-w-0 items-center gap-2">
                                {supported ? (
                                  <Checkbox checked={draft.servicesIncluded.includes(key)} onChange={() => toggleService(key)} />
                                ) : (
                                  <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                                )}
                                <span className={cn('truncate font-semibold', supported ? 'text-slate-700 dark:text-slate-200' : 'text-red-500 line-through')}>
                                  {u(warehouseServiceLabel(key), warehouseServiceLabel(key))}
                                </span>
                              </span>
                              <span className={cn(
                                'shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider',
                                supported ? 'border border-primary/30 bg-primary/5 text-primary' : 'border border-red-200 bg-red-50 text-red-500 dark:border-red-900/50 dark:bg-red-950/30'
                              )}>
                                {supported ? u('Requested', 'Requested') : u('Not available', 'Not available')}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{u('Other available services', 'Other available services')}</p>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {otherServices.map((item) => (
                            <label key={item.key} className="flex cursor-pointer items-center gap-2 text-sm has-[:disabled]:cursor-default">
                              <Checkbox checked={draft.servicesIncluded.includes(item.key)} onChange={() => toggleService(item.key)} />
                              <span className="text-slate-700 dark:text-slate-200">{u(item.label, item.label)}</span>
                            </label>
                          ))}
                          {otherServices.length === 0 && <p className="text-xs text-slate-400">{u('No other services available.', 'No other services available.')}</p>}
                        </div>
                      </div>
                    </div>
                  )}
                </Section>

                <div className="grid flex-1 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.2fr)]">
                  <Section index={4} title={u('Terms & notes', 'Terms & notes')} className="min-h-[190px]">
                    <label className="flex flex-1 flex-col">
                      <FieldLabel>{u('Additional notes', 'Additional notes')}</FieldLabel>
                      <div className="relative flex-1">
                        <textarea
                          value={draft.message}
                          maxLength={1000}
                          onChange={(e) => onDraftChange({ message: e.target.value })}
                          placeholder={u('Add any conditions, limitations or information for the customer…', 'Add any conditions, limitations or information for the customer…')}
                          className="h-full min-h-[104px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 pb-7 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                        <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] font-bold text-slate-400">{draft.message.length} / 1000</span>
                      </div>
                    </label>
                  </Section>

                  <section className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <p className="text-xs font-black uppercase tracking-wider text-primary">{u('Optional conditions', 'Optional conditions')}</p>
                    <div className="space-y-2">
                      {WAREHOUSE_OPTIONAL_CONDITION_ITEMS.map((item) => (
                        <label key={item.key} className="flex cursor-pointer items-center gap-2 text-sm has-[:disabled]:cursor-default">
                          <Checkbox checked={draft.optionalConditions.includes(item.key)} onChange={() => toggleCondition(item.key)} />
                          <span className="text-slate-700 dark:text-slate-200">{u(item.label, item.label)}</span>
                        </label>
                      ))}
                    </div>
                    <label className="mt-auto flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-sm has-[:disabled]:cursor-default dark:border-slate-800">
                      <Checkbox checked={draft.confirmedTerms} onChange={() => onDraftChange({ confirmedTerms: !draft.confirmedTerms })} className="mt-0.5" />
                      <span className="text-slate-700 dark:text-slate-200">
                        {u('I confirm that the price and conditions above are those on which I am submitting the offer.', 'I confirm that the price and conditions above are those on which I am submitting the offer.')}
                      </span>
                    </label>
                  </section>
                </div>
              </fieldset>
            </div>
          </div>

          <div className="flex shrink-0 flex-col-reverse items-stretch gap-3 border-t border-slate-100 px-5 py-3 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between md:px-7">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              {u('Your bid is secure and visible only to the request owner.', 'Your bid is secure and visible only to the request owner.')}
            </span>
            <div className="flex items-center gap-3">
              {readOnly ? (
                <Button className="h-11 rounded-xl px-6 text-sm shadow-lg shadow-primary/20" onClick={onClose}>
                  {u('common.close', 'Close')}
                </Button>
              ) : (
                <>
                  <Button variant="secondary" className="h-11 rounded-xl px-5 text-sm" disabled={loading} onClick={onClose}>
                    {u('common.cancel', 'Cancel')}
                  </Button>
                  <Button className="h-11 gap-2 rounded-xl px-6 text-sm shadow-lg shadow-primary/20" disabled={loading || !selectedWarehouse} onClick={() => { if (selectedWarehouse) onSubmit(); }}>
                    <Boxes className="h-4 w-4" />
                    {variant === 'counter'
                      ? (loading ? u('legacy.loadDetails.sendingOffer', 'Sending…') : u('Send counter bid', 'Send counter bid'))
                      : loading
                        ? (editing ? u('legacy.loadDetails.updatingOffer', 'Updating…') : u('legacy.loadDetails.sendingOffer', 'Sending…'))
                        : (editing ? u('legacy.loadDetails.updateOffer', 'Update offer') : load.isNegotiable === false ? u('reservation.submit', 'Submit reservation request') : u('Submit Warehouse Bid', 'Submit Warehouse Bid'))}
                  </Button>
                </>
              )}
            </div>
          </div>

          <AddWarehouseModal
            open={addWarehouseOpen}
            lang={lang}
            onClose={() => setAddWarehouseOpen(false)}
            onCreated={(warehouse) => {
              setWarehouses((current) => [warehouse, ...current.filter((item) => String(item.id) !== String(warehouse.id))]);
              selectWarehouse(String(warehouse.id), warehouse);
              setAddWarehouseOpen(false);
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

/** Seeds a fresh warehousing bid from the request it answers. */
export const seedWarehouseDraft = (load: Load, base: Offer): Offer => {
  const requested = requestedWarehouseServices(load);

  return {
    ...base,
    servicesIncluded: requested,
    priceBreakdown: seedPriceBreakdownFromServices(base.priceBreakdown, requested),
  };
};
