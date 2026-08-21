import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import Flatpickr from 'react-flatpickr';
import {
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Gavel,
  Lock,
  MapPin,
  Plus,
  ShieldCheck,
  X,
} from 'lucide-react';

import { cn } from '../../lib/cn';
import {
  CURRENCY_OPTIONS,
  EQUIPMENT_TYPE_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
  PRICE_BASIS_OPTIONS,
  STANDARD_CHARGE_ITEMS,
  VAT_OPTIONS,
  createEmptyAdditionalCharge,
  seedAdditionalChargesFromExcluded,
} from '../../lib/offerBid';
import { flatpickrI18n, ui } from '../../i18n';
import { AdditionalChargeRow, Language, Load, Offer, Role } from '../../types';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { RegisterVehicleModal } from '../modals/RegisterVehicleModal';

type LoadBidModalProps = {
  open: boolean;
  lang: Language;
  load: Load;
  draft: Offer;
  onDraftChange: (patch: Partial<Offer>) => void;
  editing: boolean;
  loading: boolean;
  readOnly?: boolean;
  role?: Role;
  userId?: number;
  companyIds?: number[];
  onClose: () => void;
  onSubmit: () => void;
};

const getCountryCode = (location: string) => {
  const countryCode = location.split(',').at(-1)?.trim().toUpperCase() || '';
  return /^[A-Z]{2}$/.test(countryCode) ? countryCode : '';
};

const countryFlagUrl = (countryCode: string) => `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

const vehicleLabel = (vehicle: Record<string, unknown>): string => {
  const plate = String(vehicle.registration_number || `#${vehicle.id}`);
  const makeModel = [vehicle.make, vehicle.model].filter(Boolean).join(' ');
  return makeModel ? `${plate} — ${makeModel}` : plate;
};

const formatShortDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const formatDateRange = (start?: string, end?: string) => {
  if (!start && !end) return 'Not specified';
  if (start && end) return `${formatShortDate(start)} – ${formatShortDate(end)}`;
  return formatShortDate(start || end);
};

const fieldInputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white disabled:cursor-default';

const FieldLabel = ({ children, required }: { children: string; required?: boolean }) => (
  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
    {children}
    {required && <span className="text-red-500"> *</span>}
  </span>
);

const DateField = ({ value, onChange, lang, placeholder }: { value: string; onChange: (value: string) => void; lang: Language; placeholder?: string }) => (
  <Flatpickr
    value={value}
    options={{ dateFormat: 'd.m.Y', locale: flatpickrI18n(lang), allowInput: true }}
    onChange={(_, dateStr) => onChange(dateStr)}
    render={(_, ref) => (
      <div className="relative">
        <input
          ref={ref}
          value={value}
          onChange={() => undefined}
          placeholder={placeholder}
          className={cn(fieldInputClass, 'cursor-pointer pr-9')}
        />
        <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
      </div>
    )}
  />
);

const DateTimeField = ({ value, onChange, lang, placeholder }: { value: string; onChange: (value: string) => void; lang: Language; placeholder?: string }) => (
  <Flatpickr
    value={value}
    options={{ enableTime: true, dateFormat: 'd.m.Y H:i', time_24hr: true, locale: flatpickrI18n(lang), allowInput: true }}
    onChange={(_, dateStr) => onChange(dateStr)}
    render={(_, ref) => (
      <div className="relative">
        <input
          ref={ref}
          value={value}
          onChange={() => undefined}
          placeholder={placeholder}
          className={cn(fieldInputClass, 'cursor-pointer pr-9')}
        />
        <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
      </div>
    )}
  />
);

type ChargesPickerModalProps = {
  mode: 'included' | 'excluded';
  selected: string[];
  onApply: (keys: string[]) => void;
  onClose: () => void;
};

const ChargesPickerModal = ({ mode, selected, onApply, onClose }: ChargesPickerModalProps) => {
  const [pending, setPending] = useState<string[]>(selected);
  const isIncluded = mode === 'included';

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  const toggle = (key: string) => {
    setPending((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  };

  return createPortal(
    <motion.div
      className="fixed inset-0 z-170 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-slate-950/25 dark:border-slate-700 dark:bg-slate-900"
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <p className="font-black text-slate-900 dark:text-white">{isIncluded ? 'Included Charges' : 'Excluded Charges'}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {isIncluded ? 'Select all charges that are included in your price.' : 'Select all charges that are NOT included in your price.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:text-primary dark:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {STANDARD_CHARGE_ITEMS.map((item) => {
            const checked = pending.includes(item.key);
            return (
              <label
                key={item.key}
                className="flex cursor-pointer items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(item.key)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{item.label}</span>
                  <span className="block text-xs text-slate-500">{item.description}</span>
                </span>
              </label>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-500">{pending.length} selected</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" className="rounded-xl" onClick={() => setPending([])}>Clear</Button>
            <Button size="sm" className="rounded-xl" onClick={() => { onApply(pending); onClose(); }}>Apply</Button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

export const LoadBidModal = ({
  open,
  lang,
  load,
  draft,
  onDraftChange,
  editing,
  loading,
  readOnly = false,
  role,
  userId,
  companyIds = [],
  onClose,
  onSubmit,
}: LoadBidModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [chargesPicker, setChargesPicker] = useState<'included' | 'excluded' | null>(null);
  const [vehicles, setVehicles] = useState<Array<Record<string, unknown>>>([]);
  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const pickupCountryCode = getCountryCode(load.pickup);
  const deliveryCountryCode = getCountryCode(load.delivery);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading && !chargesPicker && !addVehicleOpen) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [addVehicleOpen, chargesPicker, loading, onClose, open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      try {
        const response = await api.vehicles.list({ per_page: 100 });
        if (!active) return;
        if (role === 'superadmin') {
          setVehicles(response.data);
          return;
        }
        const scoped = response.data.filter((vehicle) => {
          const inMyCompany = companyIds.length > 0 && companyIds.includes(Number(vehicle.company_id));
          if (role === 'company') return inMyCompany;
          if (role === 'driver') {
            const isMine = Number(vehicle.assigned_driver_user_id) === userId || Number(vehicle.owner_user_id) === userId;
            return isMine || inMyCompany;
          }
          return false;
        });
        setVehicles(scoped);
      } catch {
        if (active) setVehicles([]);
      }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, role, userId, load.id]);

  const updateChargeRow = (index: number, patch: Partial<AdditionalChargeRow>) => {
    onDraftChange({
      additionalCharges: draft.additionalCharges.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  };

  const removeChargeRow = (index: number) => {
    onDraftChange({ additionalCharges: draft.additionalCharges.filter((_, i) => i !== index) });
  };

  const toggleIncludedCharge = (key: string) => {
    onDraftChange({
      includedCharges: draft.includedCharges.includes(key)
        ? draft.includedCharges.filter((item) => item !== key)
        : [...draft.includedCharges, key],
    });
  };

  const requirementRows: Array<{ label: string; active: boolean; activeText: string; inactiveText: string }> = [
    { label: 'Toll roads', active: Boolean(load.tollRoadsIncluded), activeText: 'Included', inactiveText: 'Not included' },
    { label: 'Ferry', active: Boolean(load.ferryIncluded), activeText: 'Included', inactiveText: 'Not included' },
    { label: 'CMR', active: load.cmrRequired !== false, activeText: 'Required', inactiveText: 'Not required' },
    { label: 'Pallet exchange', active: Boolean(load.palletExchangeRequired), activeText: 'Required', inactiveText: 'Not required' },
    { label: 'Customs', active: Boolean(load.customsRequired), activeText: 'Required', inactiveText: 'Not required' },
  ];

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
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 md:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                <Gavel className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-black text-slate-900 dark:text-white">
                  {readOnly ? u('Bid details', 'Bid details') : editing ? u('legacy.loadDetails.changeOffer', 'Change offer') : u('Bid on Load', 'Bid on Load')}
                </p>
                <p className="truncate text-xs font-semibold uppercase tracking-wider text-primary">
                  {load.publicId || `#${load.id}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:text-primary disabled:cursor-not-allowed dark:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 md:p-7 lg:overflow-hidden">
            <div className="grid gap-6 lg:h-full lg:grid-cols-[300px_1fr]">
              <div className="space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:h-full lg:min-h-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{u('Load summary', 'Load summary')}</p>
                    <p className="truncate text-base font-black text-slate-900 dark:text-white">{load.publicId || `#${load.id}`}</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {load.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{u('Posted', 'Posted')} {formatShortDate(load.date)}</p>

                <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    {pickupCountryCode && <img src={countryFlagUrl(pickupCountryCode)} alt="" className="h-3.5 w-5 rounded-sm object-cover" />}
                    <span className="truncate font-bold text-slate-800 dark:text-white">{load.pickup || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                    {deliveryCountryCode && <img src={countryFlagUrl(deliveryCountryCode)} alt="" className="h-3.5 w-5 rounded-sm object-cover" />}
                    <span className="truncate font-bold text-slate-800 dark:text-white">{load.delivery || '—'}</span>
                  </div>
                </div>

                <dl className="space-y-1.5 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2"><dt className="text-slate-500">{u('Load type', 'Load type')}</dt><dd className="font-bold text-slate-800 dark:text-white">{load.cargoType || '—'}</dd></div>
                  <div className="flex items-center justify-between gap-2"><dt className="text-slate-500">{u('Truck type', 'Truck type')}</dt><dd className="font-bold text-slate-800 dark:text-white">{load.truckType || '—'}</dd></div>
                  <div className="flex items-center justify-between gap-2"><dt className="text-slate-500">{u('Weight', 'Weight')}</dt><dd className="font-bold text-slate-800 dark:text-white">{load.weight ? `${load.weight} kg` : '—'}</dd></div>
                  <div className="flex items-center justify-between gap-2"><dt className="text-slate-500">{u('Volume', 'Volume')}</dt><dd className="font-bold text-slate-800 dark:text-white">{load.volume != null ? `${load.volume} m³` : '—'}</dd></div>
                  <div className="flex items-center justify-between gap-2"><dt className="text-slate-500">{u('Pallets', 'Pallets')}</dt><dd className="font-bold text-slate-800 dark:text-white">{load.pallets ?? '—'}</dd></div>
                  <div className="flex items-center justify-between gap-2"><dt className="text-slate-500">{u('Commodity', 'Commodity')}</dt><dd className="font-bold text-slate-800 dark:text-white">{load.goodsType || '—'}</dd></div>
                  <div className="flex items-center justify-between gap-2"><dt className="text-slate-500">{u('ADR', 'ADR')}</dt><dd className="font-bold text-slate-800 dark:text-white">{load.requiresAdr ? u('common.yes', 'Yes') : u('common.no', 'No')}</dd></div>
                  <div className="flex items-center justify-between gap-2"><dt className="text-slate-500">{u('Temperature', 'Temperature')}</dt><dd className="font-bold text-slate-800 dark:text-white">{load.temperatureMin != null || load.temperatureMax != null ? `${load.temperatureMin ?? '—'}° / ${load.temperatureMax ?? '—'}°C` : '—'}</dd></div>
                </dl>

                <div className="space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{u('Dates (requested)', 'Dates (requested)')}</p>
                  <div className="flex items-center justify-between gap-2 text-xs"><span className="text-slate-500">{u('Loading window', 'Loading window')}</span><span className="text-right font-bold text-slate-800 dark:text-white">{formatDateRange(load.pickupWindowStart, load.pickupWindowEnd)}</span></div>
                  <div className="flex items-center justify-between gap-2 text-xs"><span className="text-slate-500">{u('Delivery window', 'Delivery window')}</span><span className="text-right font-bold text-slate-800 dark:text-white">{formatDateRange(load.deliveryWindowStart, load.deliveryWindowEnd)}</span></div>
                </div>

                <div className="space-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{u('Requirements', 'Requirements')}</p>
                  {requirementRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        {row.active ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Ban className="h-3.5 w-3.5 text-slate-400" />}
                        {row.label}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-white">{row.active ? row.activeText : row.inactiveText}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full cursor-pointer rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-primary transition-colors hover:bg-primary/5 dark:border-slate-700"
                >
                  {u('View full load details', 'View full load details')}
                </button>
              </div>

              <fieldset disabled={readOnly} className="m-0 min-w-0 border-0 p-0 space-y-6 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:px-2 lg:-mx-2">
                <section className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-primary">1. {u('Your commercial offer', 'Your commercial offer')}</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="block"><FieldLabel required>{u('Total price', 'Total price')}</FieldLabel>
                      <input type="number" step="0.01" value={draft.amount} onChange={(e) => onDraftChange({ amount: e.target.value })} className={fieldInputClass} />
                    </label>
                    <label className="block"><FieldLabel required>{u('Currency', 'Currency')}</FieldLabel>
                      <select value={draft.currency} onChange={(e) => onDraftChange({ currency: e.target.value })} className={cn(fieldInputClass, 'cursor-pointer')}>
                        {CURRENCY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <label className="block"><FieldLabel required>{u('Price basis', 'Price basis')}</FieldLabel>
                      <select value={draft.priceBasis} onChange={(e) => onDraftChange({ priceBasis: e.target.value })} className={cn(fieldInputClass, 'cursor-pointer')}>
                        {PRICE_BASIS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="block"><FieldLabel required>{u('VAT', 'VAT')}</FieldLabel>
                      <select value={draft.vat} onChange={(e) => onDraftChange({ vat: e.target.value })} className={cn(fieldInputClass, 'cursor-pointer')}>
                        {VAT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="block"><FieldLabel required>{u('Payment terms', 'Payment terms')}</FieldLabel>
                      <select value={draft.paymentTerms} onChange={(e) => onDraftChange({ paymentTerms: e.target.value })} className={cn(fieldInputClass, 'cursor-pointer')}>
                        {PAYMENT_TERMS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="block"><FieldLabel required>{u('Offer valid until', 'Offer valid until')}</FieldLabel>
                      <DateTimeField value={draft.validUntil} onChange={(value) => onDraftChange({ validUntil: value })} lang={lang} />
                    </label>
                    <label className="block"><FieldLabel required>{u('Included charges', 'Included charges')}</FieldLabel>
                      <button type="button" onClick={() => setChargesPicker('included')} className={cn(fieldInputClass, 'flex cursor-pointer items-center justify-between text-left font-bold text-primary')}>
                        <span>{draft.includedCharges.length} {u('selected', 'selected')}</span>
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </label>
                    <label className="block"><FieldLabel required>{u('Excluded charges', 'Excluded charges')}</FieldLabel>
                      <button type="button" onClick={() => setChargesPicker('excluded')} className={cn(fieldInputClass, 'flex cursor-pointer items-center justify-between text-left font-bold text-primary')}>
                        <span>{draft.excludedCharges.length} {u('selected', 'selected')}</span>
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </label>
                  </div>
                </section>

                <section className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-primary">2. {u('Transport commitment', 'Transport commitment')}</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="block"><FieldLabel required>{u('Equipment type', 'Equipment type')}</FieldLabel>
                      <select value={draft.equipmentType} onChange={(e) => onDraftChange({ equipmentType: e.target.value })} className={cn(fieldInputClass, 'cursor-pointer')}>
                        <option value="" disabled>{u('Select…', 'Select…')}</option>
                        {EQUIPMENT_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <div className="relative block">
                      <FieldLabel required>{u('Vehicle availability', 'Vehicle availability')}</FieldLabel>
                      <button
                        type="button"
                        onClick={() => setAddVehicleOpen(true)}
                        aria-label={u('Add vehicle', 'Add vehicle')}
                        title={u('Add vehicle', 'Add vehicle')}
                        className="absolute right-0 top-0 flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border border-primary text-primary transition-colors hover:bg-primary/10 disabled:cursor-default"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                      <select
                        value={draft.vehicleId ? `v:${draft.vehicleId}` : 'none'}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === 'none') {
                            onDraftChange({ vehicleAvailability: 'not_available', vehicleId: '' });
                          } else {
                            onDraftChange({ vehicleAvailability: 'available', vehicleId: value.slice(2) });
                          }
                        }}
                        className={cn(fieldInputClass, 'cursor-pointer')}
                      >
                        <option value="none">{u("No, I don't have a vehicle", "No, I don't have a vehicle")}</option>
                        {vehicles.map((vehicle) => (
                          <option key={String(vehicle.id)} value={`v:${vehicle.id}`}>{vehicleLabel(vehicle)}</option>
                        ))}
                      </select>
                    </div>
                    <label className="block"><FieldLabel required>{u('Available date', 'Available date')}</FieldLabel>
                      <DateField value={draft.availableDate} onChange={(value) => onDraftChange({ availableDate: value })} lang={lang} />
                    </label>
                    <label className="block"><FieldLabel required>{u('Exact loading date', 'Exact loading date')}</FieldLabel>
                      <DateField value={draft.exactLoadingDate} onChange={(value) => onDraftChange({ exactLoadingDate: value })} lang={lang} />
                    </label>
                    <label className="block"><FieldLabel required>{u('Estimated transit time', 'Estimated transit time')}</FieldLabel>
                      <div className="relative">
                        <input type="number" min="0" value={draft.estimatedTransitDays} onChange={(e) => onDraftChange({ estimatedTransitDays: e.target.value })} className={cn(fieldInputClass, 'pr-14')} />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{u('days', 'days')}</span>
                      </div>
                    </label>
                    <label className="block"><FieldLabel>{u('Estimated delivery date', 'Estimated delivery date')}</FieldLabel>
                      <DateField value={draft.estimatedDeliveryDate} onChange={(value) => onDraftChange({ estimatedDeliveryDate: value })} lang={lang} />
                    </label>
                  </div>

                  <div className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{u('I confirm that I can perform the transport according to the load requirements.', 'I confirm that I can perform the transport according to the load requirements.')}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <label className="flex cursor-pointer items-center gap-1.5 has-[:disabled]:cursor-default">
                        <input type="radio" checked={draft.canPerformAsRequired} onChange={() => onDraftChange({ canPerformAsRequired: true })} className="h-4 w-4 accent-primary" />
                        {u('common.yes', 'Yes')}
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5 has-[:disabled]:cursor-default">
                        <input type="radio" checked={!draft.canPerformAsRequired} onChange={() => onDraftChange({ canPerformAsRequired: false })} className="h-4 w-4 accent-primary" />
                        {u('No, I need to propose changes', 'No, I need to propose changes')}
                      </label>
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-primary">3. {u('Included in your price', 'Included in your price')}</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3 sm:grid-flow-col sm:grid-rows-4">
                    {STANDARD_CHARGE_ITEMS.map((item) => (
                      <label key={item.key} className="flex cursor-pointer items-center gap-2 text-sm has-[:disabled]:cursor-default">
                        <input
                          type="checkbox"
                          checked={draft.includedCharges.includes(item.key)}
                          onChange={() => toggleIncludedCharge(item.key)}
                          className="h-4 w-4 shrink-0 accent-primary"
                        />
                        <span className="text-slate-700 dark:text-slate-200">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-primary">4. {u('Additional charges', 'Additional charges')} <span className="normal-case text-slate-400">({u('if applicable', 'if applicable')})</span></p>
                  <div className="space-y-2">
                    {draft.additionalCharges.map((row, index) => (
                      <div key={index} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_110px_90px_auto] sm:items-center">
                        <input placeholder={u('Charge type', 'Charge type')} value={row.type} onChange={(e) => updateChargeRow(index, { type: e.target.value })} className={fieldInputClass} />
                        <input placeholder={u('Condition', 'Condition')} value={row.condition} onChange={(e) => updateChargeRow(index, { condition: e.target.value })} className={fieldInputClass} />
                        <input type="number" step="0.01" placeholder={u('Rate', 'Rate')} value={row.rate} onChange={(e) => updateChargeRow(index, { rate: e.target.value })} className={fieldInputClass} />
                        <input placeholder={u('Unit', 'Unit')} value={row.unit} onChange={(e) => updateChargeRow(index, { unit: e.target.value })} className={fieldInputClass} />
                        <button type="button" onClick={() => removeChargeRow(index)} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center justify-self-end rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-500 disabled:cursor-default dark:hover:bg-slate-800 sm:justify-self-auto">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => onDraftChange({ additionalCharges: [...draft.additionalCharges, createEmptyAdditionalCharge()] })}
                      className="flex cursor-pointer items-center gap-1.5 text-sm font-bold text-primary disabled:cursor-default"
                    >
                      <Plus className="h-4 w-4" /> {u('Add another charge', 'Add another charge')}
                    </button>
                  </div>
                </section>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section className="flex flex-col space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-primary">5. {u('Exceptions / Comments', 'Exceptions / Comments')}</p>
                  <div className="flex flex-wrap items-center gap-5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <label className="flex cursor-pointer items-center gap-1.5 has-[:disabled]:cursor-default">
                      <input type="radio" checked={!draft.hasExceptions} onChange={() => onDraftChange({ hasExceptions: false })} className="h-4 w-4 accent-primary" />
                      {u('No exceptions', 'No exceptions')}
                    </label>
                    <label className="flex cursor-pointer items-center gap-1.5 has-[:disabled]:cursor-default">
                      <input type="radio" checked={draft.hasExceptions} onChange={() => onDraftChange({ hasExceptions: true })} className="h-4 w-4 accent-primary" />
                      {u('I am submitting this offer with exceptions', 'I am submitting this offer with exceptions')}
                    </label>
                  </div>
                  <label className="flex flex-1 flex-col">
                    <textarea
                      value={draft.message}
                      onChange={(e) => onDraftChange({ message: e.target.value })}
                      rows={3}
                      placeholder={u('Add your comments (optional)', 'Add your comments (optional)')}
                      className="w-full flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </label>
                </section>

                <section className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-wider text-primary">6. {u('Confirmation', 'Confirmation')}</p>
                  <div className="space-y-2">
                    {([
                      ['confirmedAuthorized', u('I confirm that I am authorized and adequately licensed to perform this transport.', 'I confirm that I am authorized and adequately licensed to perform this transport.')],
                      ['confirmedDetailsMatch', u('I confirm that my offer is based on the shipment details published in this Load.', 'I confirm that my offer is based on the shipment details published in this Load.')],
                      ['confirmedTerms', u('I confirm that the price and conditions above are those on which I am submitting the offer.', 'I confirm that the price and conditions above are those on which I am submitting the offer.')],
                    ] as const).map(([field, label]) => (
                      <label key={field} className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-sm has-[:disabled]:cursor-default dark:border-slate-800">
                        <input
                          type="checkbox"
                          checked={draft[field]}
                          onChange={(e) => onDraftChange({ [field]: e.target.checked })}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                        />
                        <span className="text-slate-700 dark:text-slate-200">{label}</span>
                      </label>
                    ))}
                  </div>
                </section>
                </div>
              </fieldset>
            </div>
          </div>

          <div className="flex shrink-0 flex-col-reverse items-stretch gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between md:px-7">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              {u('Your bid is secure and visible only to the load poster.', 'Your bid is secure and visible only to the load poster.')}
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
                  <Button className="h-11 rounded-xl px-6 text-sm shadow-lg shadow-primary/20" disabled={loading} onClick={onSubmit}>
                    {loading
                      ? (editing ? u('legacy.loadDetails.updatingOffer', 'Updating…') : u('legacy.loadDetails.sendingOffer', 'Sending…'))
                      : (editing ? u('legacy.loadDetails.updateOffer', 'Update offer') : u('Submit Bid', 'Submit Bid'))}
                  </Button>
                </>
              )}
            </div>
          </div>

          {chargesPicker && (
            <ChargesPickerModal
              mode={chargesPicker}
              selected={chargesPicker === 'included' ? draft.includedCharges : draft.excludedCharges}
              onClose={() => setChargesPicker(null)}
              onApply={(keys) => {
                if (chargesPicker === 'included') {
                  onDraftChange({ includedCharges: keys });
                } else {
                  onDraftChange({
                    excludedCharges: keys,
                    additionalCharges: seedAdditionalChargesFromExcluded(draft.additionalCharges, keys),
                  });
                }
              }}
            />
          )}

          <RegisterVehicleModal
            open={addVehicleOpen}
            lang={lang}
            ownerUserId={role === 'driver' ? userId : undefined}
            assignedDriverUserId={role === 'driver' ? userId : undefined}
            companyId={role === 'company' ? companyIds[0] : undefined}
            onClose={() => setAddVehicleOpen(false)}
            onCreated={(vehicle) => {
              setVehicles((current) => [vehicle, ...current]);
              onDraftChange({ vehicleAvailability: 'available', vehicleId: String(vehicle.id) });
              setAddVehicleOpen(false);
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
