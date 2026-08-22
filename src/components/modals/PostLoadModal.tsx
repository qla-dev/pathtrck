import { useEffect, useMemo, useRef, useState, type InputHTMLAttributes, type MouseEvent, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Flatpickr from 'react-flatpickr';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  FileText,
  Handshake,
  Loader2,
  Map as MapGlyphIcon,
  MapPin,
  Package,
  Plane,
  PlaneLanding,
  Plus,
  Route,
  ShieldCheck,
  Ship,
  Sparkles,
  Tag,
  ThermometerSnowflake,
  Truck,
  UserRound,
  Warehouse,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Language } from '../../types';
import { flatpickrI18n, ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { confirmAction, showSuccess } from '../../lib/swal';
import { useLocationAutocomplete } from '../../hooks/useLocationAutocomplete';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { LocationSearchResult } from '../../services/locationSearch';
import { Button } from '../ui/Button';
import { api, ApiError, LoadScanResult } from '../../services/api';
import { CustomerSelect, customerOptionFromRecord, type CustomerOption } from '../customer/CustomerSelect';
import { AddressMapModal } from '../maps/AddressMapModal';
import { CountrySelect } from '../location/CountrySelect';
import { DocumentDropzone } from './DocumentDropzone';
import { ScanResultModal } from './ScanResultModal';
import { ScanFieldPatch } from './scanFieldRows';

type PostLoadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  editLoadId?: number | string | null;
  onSaved?: (load: Record<string, unknown>) => void;
  initialPrefill?: ScanFieldPatch | null;
  onOpenLenaAI?: () => void;
};

type StepId = 'cargo' | 'route' | 'terms' | 'contact' | 'review';
type TransportType = 'road' | 'air' | 'sea';
type ScannedDocument = { id: string; imageDataUrl: string | null; result: LoadScanResult };

type LoadDraft = {
  consignee: CustomerOption | null;
  transportType: TransportType;
  pickupPlaces: string;
  pickupPlaceType: string;
  pickupCity: string;
  pickupCountry: string;
  pickupAddress: string;
  pickupLatitude: string;
  pickupLongitude: string;
  pickupDate: string;
  pickupDateTo: string;
  pickupTimeFrom: string;
  pickupTimeTo: string;
  pickupWindow: string;
  deliveryPlaces: string;
  deliveryPlaceType: string;
  deliveryCity: string;
  deliveryCountry: string;
  deliveryAddress: string;
  deliveryLatitude: string;
  deliveryLongitude: string;
  deliveryDate: string;
  deliveryDateTo: string;
  deliveryTimeFrom: string;
  deliveryTimeTo: string;
  deliveryWindow: string;
  cargoTitle: string;
  cargoType: string;
  goodsType: string;
  weightKg: string;
  pallets: string;
  lengthM: string;
  widthM: string;
  heightM: string;
  volumeM3: string;
  declaredValue: string;
  additionalInfo: string;
  loadingEquipment: string;
  vehicleType: string;
  bodyTypes: string[];
  characteristics: string;
  specialRequirements: string[];
  transportMode: string;
  deliveryProof: string;
  mustBeTrackable: boolean;
  paymentDeferred: boolean;
  incoterm: string;
  budget: string;
  freightCurrency: string;
  shipmentValueCurrency: string;
  paymentDueDays: string;
  receivePriceProposals: boolean;
  temperatureControlled: boolean;
  temperatureMin: string;
  temperatureMax: string;
  requiresAdr: boolean;
  requiresTailLift: boolean;
  tollRoadsIncluded: boolean;
  ferryIncluded: boolean;
  cmrRequired: boolean;
  palletExchangeRequired: boolean;
  customsRequired: boolean;
  urgent: boolean;
  notes: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  contactFax: string;
  contactMobile: string;
  showEmail: boolean;
  showPhone: boolean;
  showFax: boolean;
  showMobile: boolean;
  internalComments: string;
  externalComments: string;
  closedFreightExchange: string;
  closedFreightComments: string;
  publishToAllAfterMinutes: boolean;
  publishDelayMinutes: string;
};

const INITIAL_DRAFT: LoadDraft = {
  consignee: null,
  transportType: 'road',
  pickupPlaces: '1',
  pickupPlaceType: 'Loading place',
  pickupCity: '',
  pickupCountry: 'BA',
  pickupAddress: '',
  pickupLatitude: '',
  pickupLongitude: '',
  pickupDate: '',
  pickupDateTo: '',
  pickupTimeFrom: '',
  pickupTimeTo: '',
  pickupWindow: '',
  deliveryPlaces: '1',
  deliveryPlaceType: 'Unloading place',
  deliveryCity: '',
  deliveryCountry: 'BA',
  deliveryAddress: '',
  deliveryLatitude: '',
  deliveryLongitude: '',
  deliveryDate: '',
  deliveryDateTo: '',
  deliveryTimeFrom: '',
  deliveryTimeTo: '',
  deliveryWindow: '',
  cargoTitle: '',
  cargoType: 'FTL',
  goodsType: 'General',
  weightKg: '',
  pallets: '',
  lengthM: '',
  widthM: '',
  heightM: '',
  volumeM3: '',
  declaredValue: '',
  additionalInfo: '',
  loadingEquipment: 'Not specified',
  vehicleType: 'Box Truck',
  bodyTypes: ['Curtain'],
  characteristics: '',
  specialRequirements: [],
  transportMode: 'Airport to airport',
  deliveryProof: '',
  mustBeTrackable: false,
  paymentDeferred: false,
  incoterm: '',
  budget: '',
  freightCurrency: 'EUR',
  shipmentValueCurrency: 'EUR',
  paymentDueDays: '',
  receivePriceProposals: true,
  temperatureControlled: false,
  temperatureMin: '',
  temperatureMax: '',
  requiresAdr: false,
  requiresTailLift: false,
  tollRoadsIncluded: false,
  ferryIncluded: false,
  cmrRequired: true,
  palletExchangeRequired: false,
  customsRequired: false,
  urgent: false,
  notes: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  contactFax: '',
  contactMobile: '',
  showEmail: true,
  showPhone: true,
  showFax: false,
  showMobile: true,
  internalComments: '',
  externalComments: '',
  closedFreightExchange: '',
  closedFreightComments: '',
  publishToAllAfterMinutes: false,
  publishDelayMinutes: '5',
};

const toApiDateTime = (date: string, time = '00:00') => {
  const match = date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}T${time || '00:00'}:00` : null;
};

const fromApiDateTime = (value: unknown) => {
  if (!value) return { date: '', time: '' };
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return { date: '', time: '' };
  return { date: `${String(parsed.getDate()).padStart(2, '0')}.${String(parsed.getMonth() + 1).padStart(2, '0')}.${parsed.getFullYear()}`, time: `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}` };
};

const fromApiWeightKg = (value: unknown) => {
  const weightKg = Number(value);
  if (!Number.isFinite(weightKg) || weightKg <= 0) return '';
  return String(weightKg / 1000);
};

const toApiWeightKg = (weightTonnes: string) => Number(weightTonnes) * 1000;

const STEPS: Array<{ id: StepId; icon: typeof MapPin }> = [
  { id: 'cargo', icon: Package },
  { id: 'route', icon: MapPin },
  { id: 'terms', icon: ShieldCheck },
  { id: 'contact', icon: UserRound },
  { id: 'review', icon: CheckCircle2 },
];

const INCOTERM_OPTIONS = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'];
const VEHICLE_OPTIONS = ['Cargo Van', 'Box Truck', 'Curtainsider', 'Reefer', 'Trailer', 'Rigid Truck', 'Container truck'];
const BODY_TYPE_OPTIONS = ['Curtain', 'Box', 'Reefer', 'Mega', 'Tautliner', 'Flatbed'];
const ROAD_CHARACTERISTIC_OPTIONS = ['ADR', 'CMR', 'GDP', 'TIR', 'Lift', 'Express'];
const AIR_CHARACTERISTIC_OPTIONS = ['Non-DG', 'DG', 'TCG (temperature controlled goods)', 'MED (medicine)', 'VAL (money and other valuables)'];
const LOADING_EQUIPMENT_OPTIONS = ['Vehicle with ramp', 'Vehicle without ramp', 'Forklift: Yes', 'Forklift: No', 'Other loading/unloading equipment', 'Not specified'];
const AIR_SPECIAL_REQUIREMENT_OPTIONS = ['AWB required', 'Tail lift needed', 'Express onboard courier', 'Time-critical door to door'];
const CONTACT_OPTIONS = ['Current user', 'Operations desk', 'Dispatch team'];
const CLOSED_EXCHANGE_OPTIONS = ['', 'TIMOCOM', 'Private board'];

const FieldLabel = ({
  children,
  ai,
  title,
  onReprefill,
}: {
  children: string;
  ai?: boolean;
  title?: string;
  onReprefill?: () => void;
}) => (
  <label
    onClick={ai ? onReprefill : undefined}
    title={ai ? title : undefined}
    className={cn(
      'ml-1 text-[10px] font-bold uppercase tracking-wider',
      ai ? 'inline-flex cursor-pointer items-center gap-1 text-primary' : 'text-slate-500'
    )}
  >
    {children}
    {ai && <Sparkles className="h-2.5 w-2.5 shrink-0" />}
  </label>
);

const Input = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={cn(
      'w-full h-[54px] cursor-text px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm',
      props.type === 'date' &&
        'pr-3 text-[13px] leading-[54px] [color-scheme:light] dark:[color-scheme:dark] [&::-webkit-datetime-edit]:text-[12px] [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100',
      props.className
    )}
  />
);

const Textarea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={cn(
      'w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary resize-none text-sm',
      props.className
    )}
  />
);

const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={cn(
      'w-full h-[54px] cursor-pointer px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm appearance-none',
      props.className
    )}
  />
);

const AddressAutocompleteField = ({
  value,
  onChange,
  onSelectLocation,
  placeholder,
  onOpenMap,
  mapButtonLabel,
  mapButtonIcon: MapButtonIcon = MapPin,
  accentClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelectLocation: (location: LocationSearchResult) => void;
  placeholder: string;
  onOpenMap: () => void;
  mapButtonLabel: string;
  mapButtonIcon?: LucideIcon;
  accentClassName: string;
}) => {
  const { results, loading, isOpen, open, close, select } = useLocationAutocomplete(value);
  const containerRef = useRef<HTMLDivElement>(null);
  useOutsideClick(containerRef, close, isOpen);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={open}
        className="pr-12"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={onOpenMap}
        aria-label={mapButtonLabel}
        className={cn('absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg hover:bg-primary/10', accentClassName)}
      >
        <MapButtonIcon className="h-5 w-5" />
      </button>
      {loading && <Loader2 className="pointer-events-none absolute right-14 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {results.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => {
                select(result.label);
                onSelectLocation(result);
              }}
              className="flex w-full cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{result.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const TimeInput = ({
  value,
  onChange,
  placeholder,
  lang,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  lang: Language;
}) => (
  <div className="w-full">
    <Flatpickr
      value={value}
      options={{
        enableTime: true,
        noCalendar: true,
        dateFormat: 'H:i',
        time_24hr: true,
        minuteIncrement: 5,
        locale: flatpickrI18n(lang),
        onReady: (_dates, _dateStr, instance) => instance.calendarContainer.classList.add('smart-time-flatpickr'),
        onOpen: (_dates, _dateStr, instance) => instance.calendarContainer.classList.add('smart-time-flatpickr'),
      }}
      onChange={(_, dateStr) => onChange(dateStr)}
      render={(_, ref) => (
        <div className="relative">
          <input
            ref={ref}
            value={value}
            onChange={() => undefined}
            placeholder={placeholder}
            className="h-[54px] w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 pr-11 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
          <Clock3 className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        </div>
      )}
    />
  </div>
);

const DateInput = ({
  value,
  onChange,
  placeholder,
  lang,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  lang: Language;
}) => (
  <div className="w-full">
    <Flatpickr
      value={value}
      options={{
        dateFormat: 'd.m.Y',
        locale: flatpickrI18n(lang),
        allowInput: true,
      }}
      onChange={(_, dateStr) => onChange(dateStr)}
      render={(_, ref) => (
        <div className="relative">
          <input
            ref={ref}
            value={value}
            onChange={() => undefined}
            placeholder={placeholder}
            className="h-[54px] w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-4 pr-11 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
          <CalendarDays className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
        </div>
      )}
    />
  </div>
);

const ToggleCard = ({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'cursor-pointer rounded-2xl border px-4 py-3 text-left transition-all',
      active
        ? 'border-primary bg-primary/5 shadow-sm'
        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-primary/40'
    )}
  >
    <p className="text-sm font-bold dark:text-white">{title}</p>
    <p className="text-xs text-slate-500 mt-1">{description}</p>
  </button>
);

const ChoiceCard = ({
  active,
  title,
  description,
  icon: Icon,
  onClick,
  compact = false,
  className,
  nowrap = false,
}: {
  active: boolean;
  title: string;
  description?: string;
  icon: typeof MapPin;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  compact?: boolean;
  className?: string;
  nowrap?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'relative flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border text-left transition-all',
      compact ? 'p-3' : 'p-4',
      active
        ? 'border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
        : 'border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-primary/5 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200',
      className
    )}
  >
    <span className={cn('flex shrink-0 items-center justify-center rounded-xl', compact ? 'h-9 w-9' : 'h-10 w-10', active ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800')}>
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0"><span className={cn('block text-sm font-bold', nowrap && 'whitespace-nowrap')}>{title}</span>{description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}</span>
    {active && <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-primary" />}
  </button>
);

const SummaryRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
    <span className="text-sm font-medium text-right dark:text-white">{value || '—'}</span>
  </div>
);

export const PostLoadModal = ({ isOpen, onClose, lang, editLoadId = null, onSaved, initialPrefill = null, onOpenLenaAI }: PostLoadModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const transportOptions = [
    {
      id: 'road' as const,
      label: u('postLoadModal.transport.road', 'Road'),
      description: u('postLoadModal.transport.roadDesc', 'Truck and ground freight'),
      icon: Truck,
      iconTone: 'text-emerald-500',
      iconSurface: 'bg-emerald-500/10',
    },
    {
      id: 'air' as const,
      label: u('postLoadModal.transport.air', 'Air'),
      description: u('postLoadModal.transport.airDesc', 'Fast airport-to-airport cargo'),
      icon: Plane,
      iconTone: 'text-sky-500',
      iconSurface: 'bg-sky-500/10',
    },
    {
      id: 'sea' as const,
      label: u('postLoadModal.transport.sea', 'Sea'),
      description: u('postLoadModal.transport.seaDesc', 'Port and container shipping'),
      icon: Ship,
      iconTone: 'text-blue-500',
      iconSurface: 'bg-blue-500/10',
    },
  ];
  const [step, setStep] = useState<StepId>('cargo');
  const contentScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0 });
  }, [step]);
  const [draft, setDraft] = useState<LoadDraft>(INITIAL_DRAFT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [addressMap, setAddressMap] = useState<'pickup' | 'delivery' | null>(null);
  const [dropzoneOpen, setDropzoneOpen] = useState(false);
  const [scannedDocuments, setScannedDocuments] = useState<ScannedDocument[]>([]);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [aiFilledPatch, setAiFilledPatch] = useState<ScanFieldPatch>({});
  useEffect(() => {
    if (!isOpen) {
      setStep('cargo');
      setDraft(INITIAL_DRAFT);
      setSubmitError('');
      setScannedDocuments([]);
      setViewingDocId(null);
      setAiFilledPatch({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || editLoadId || !initialPrefill) return;
    setDraft((current) => ({ ...current, ...initialPrefill }));
    setAiFilledPatch((current) => ({ ...current, ...initialPrefill }));
  }, [editLoadId, initialPrefill, isOpen]);

  const applyScan = (result: LoadScanResult, imageDataUrl: string | null, patch: ScanFieldPatch) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setAiFilledPatch((prev) => ({ ...prev, ...patch }));
    setScannedDocuments((prev) => {
      const next = [...prev, { id: `scan-${Date.now()}`, imageDataUrl, result }];
      try {
        window.localStorage.setItem(`prefillJson${next.length}`, JSON.stringify(patch));
      } catch {
        // Local storage may be unavailable (private browsing, quota) - prefill still applied in-memory.
      }
      return next;
    });
    setDropzoneOpen(false);
  };

  const viewingDocument = scannedDocuments.find((doc) => doc.id === viewingDocId) || null;

  useEffect(() => {
    if (!isOpen || !editLoadId) return;
    setIsLoadingExisting(true);
    setSubmitError('');
    api.loads.get(editLoadId).then((response) => {
      const record = response.data;
      const stops = Array.isArray(record.stops) ? record.stops as Array<Record<string, unknown>> : [];
      const pickup = stops.find((item) => item.type === 'pickup') || {};
      const delivery = [...stops].reverse().find((item) => item.type === 'delivery') || {};
      const pickupStart = fromApiDateTime(pickup.window_starts_at);
      const pickupEnd = fromApiDateTime(pickup.window_ends_at);
      const deliveryStart = fromApiDateTime(delivery.window_starts_at);
      const deliveryEnd = fromApiDateTime(delivery.window_ends_at);
      const contact = (record.contact || {}) as Record<string, unknown>;
      const consignee = record.consignee && typeof record.consignee === 'object'
        ? customerOptionFromRecord(record.consignee as Record<string, unknown>)
        : null;
      const terms = String(record.payment_terms || '');
      setDraft({ ...INITIAL_DRAFT,
        consignee,
        transportType: (record.transport_type as TransportType) || 'road',
        pickupPlaceType: String(pickup.place_type || INITIAL_DRAFT.pickupPlaceType), pickupCity: String(pickup.city || ''), pickupCountry: String(pickup.country_code || 'BA'), pickupAddress: String(pickup.address || ''), pickupLatitude: String(pickup.latitude || ''), pickupLongitude: String(pickup.longitude || ''), pickupDate: pickupStart.date, pickupDateTo: pickupEnd.date, pickupTimeFrom: pickupStart.time, pickupTimeTo: pickupEnd.time,
        deliveryPlaceType: String(delivery.place_type || INITIAL_DRAFT.deliveryPlaceType), deliveryCity: String(delivery.city || ''), deliveryCountry: String(delivery.country_code || 'BA'), deliveryAddress: String(delivery.address || ''), deliveryLatitude: String(delivery.latitude || ''), deliveryLongitude: String(delivery.longitude || ''), deliveryDate: deliveryStart.date, deliveryDateTo: deliveryEnd.date, deliveryTimeFrom: deliveryStart.time, deliveryTimeTo: deliveryEnd.time,
        cargoTitle: String(record.title || ''), cargoType: String(record.cargo_type || 'FTL'), goodsType: String(record.goods_type || 'General'), weightKg: fromApiWeightKg(record.weight_kg), pallets: String(record.pallets || ''), lengthM: String(record.length_m || ''), widthM: String(record.width_m || ''), heightM: String(record.height_m || ''), volumeM3: String(record.volume_m3 || ''), declaredValue: String(record.declared_value || ''), budget: String(record.budget || ''), freightCurrency: String(record.currency || 'EUR'), shipmentValueCurrency: String(record.shipment_value_currency || record.currency || 'EUR'), paymentDueDays: String(record.payment_due_days || ''), paymentDeferred: terms === 'deferred', incoterm: String(record.incoterms || ''),
        loadingEquipment: Array.isArray(record.loading_methods) ? String(record.loading_methods[0] || 'Not specified') : 'Not specified', vehicleType: String(record.vehicle_type || INITIAL_DRAFT.vehicleType), characteristics: String(record.characteristics || ''), specialRequirements: Array.isArray(record.special_requirements) ? record.special_requirements.map(String) : [], transportMode: String(record.transport_mode || INITIAL_DRAFT.transportMode), deliveryProof: String(record.delivery_proof || ''), temperatureControlled: record.temperature_min != null || record.temperature_max != null, temperatureMin: String(record.temperature_min ?? ''), temperatureMax: String(record.temperature_max ?? ''),
        requiresAdr: Boolean(record.requires_adr), requiresTailLift: Boolean(record.requires_tail_lift), tollRoadsIncluded: Boolean(record.toll_roads_included), ferryIncluded: Boolean(record.ferry_included), cmrRequired: record.cmr_required == null ? true : Boolean(record.cmr_required), palletExchangeRequired: Boolean(record.pallet_exchange_required), customsRequired: Boolean(record.customs_required), mustBeTrackable: Boolean(record.must_be_trackable), urgent: Boolean(record.is_urgent), receivePriceProposals: record.is_negotiable == null ? true : Boolean(record.is_negotiable), bodyTypes: Array.isArray(record.body_types) ? record.body_types.map(String) : [], notes: String(record.notes || ''), internalComments: String(record.internal_comments || ''), externalComments: String(record.external_comments || ''), contactName: String(contact.name || ''), contactPhone: String(contact.phone || ''), contactMobile: String(contact.mobile || ''), contactEmail: String(contact.email || ''), contactFax: String(contact.fax || ''),
      });
    }).catch((error) => setSubmitError(error instanceof Error ? error.message : 'The load could not be loaded.')).finally(() => setIsLoadingExisting(false));
  }, [editLoadId, isOpen]);

  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const stepCompletion = useMemo<Record<StepId, boolean>>(
    () => ({
      route: Boolean(
        draft.pickupCity &&
          draft.pickupDate &&
          draft.deliveryCity &&
          draft.deliveryDate
      ),
      cargo: Boolean(
        draft.consignee &&
          draft.transportType &&
          draft.cargoTitle.trim() &&
          Number(draft.weightKg) > 0 &&
          Number(draft.lengthM) > 0
      ),
      terms: Boolean(draft.vehicleType),
      contact: Boolean(
        draft.contactName &&
          (draft.contactPhone || draft.contactMobile || draft.contactEmail)
      ),
      review: true,
    }),
    [draft]
  );

  const setField = <K extends keyof LoadDraft>(key: K, value: LoadDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const aiFieldCount = Object.keys(aiFilledPatch).length;

  const isAiField = (key: keyof ScanFieldPatch) => aiFilledPatch[key] !== undefined;

  const reprefillField = async <K extends keyof ScanFieldPatch & keyof LoadDraft>(key: K) => {
    const aiValue = aiFilledPatch[key];
    if (aiValue === undefined) return;
    const confirmed = await confirmAction({
      title: 'Refill this field with AI data?',
      text: 'Your current value will be overwritten with the value LenaAI detected.',
      confirmText: 'Refill',
    });
    if (!confirmed) return;
    setField(key, aiValue as LoadDraft[K]);
  };

  const fieldLabel = (key: keyof ScanFieldPatch & keyof LoadDraft, labelKey: string, fallback: string) => (
    <FieldLabel
      ai={isAiField(key)}
      title={u('postLoadModal.aiRefillHint', 'Filled by LenaAI — click to refill from AI data')}
      onReprefill={() => void reprefillField(key)}
    >
      {u(labelKey, fallback)}
    </FieldLabel>
  );

  const toggleBodyType = (value: string) => {
    setDraft((prev) => ({
      ...prev,
      bodyTypes: prev.bodyTypes.includes(value)
        ? prev.bodyTypes.filter((item) => item !== value)
        : [...prev.bodyTypes, value],
    }));
  };

  const toggleSpecialRequirement = (value: string) => {
    setDraft((prev) => ({
      ...prev,
      specialRequirements: prev.specialRequirements.includes(value)
        ? prev.specialRequirements.filter((item) => item !== value)
        : [...prev.specialRequirements, value],
    }));
  };

  const goBack = () => {
    const previous = STEPS[stepIndex - 1];
    if (previous) setStep(previous.id);
  };

  // Sidebar navigation is intentionally unrestricted - AI-fill can populate
  // fields across steps out of order, so gating on completion just gets in the way.
  const canNavigateToStep = (_targetIndex: number) => true;

  const submit = async () => {
    if (isSubmitting) return;
    const confirmed = await confirmAction({
      title: editLoadId ? 'Save load changes?' : 'Publish this load?',
      text: editLoadId
        ? 'The updated load details will be visible in the freight exchange.'
        : 'This load will be published and visible in the freight exchange.',
      confirmText: editLoadId ? 'Save changes' : 'Publish load',
    });
    if (!confirmed) return;

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        consignee_customer_id: draft.consignee?.id || null,
        title: draft.cargoTitle,
        transport_type: draft.transportType,
        cargo_type: draft.cargoType,
        goods_type: draft.goodsType,
        weight_kg: toApiWeightKg(draft.weightKg),
        length_m: draft.lengthM ? Number(draft.lengthM) : null,
        width_m: draft.widthM ? Number(draft.widthM) : null,
        height_m: draft.heightM ? Number(draft.heightM) : null,
        volume_m3: draft.volumeM3 ? Number(draft.volumeM3) : null,
        pallets: draft.pallets ? Number(draft.pallets) : null,
        declared_value: draft.declaredValue ? Number(draft.declaredValue) : null,
        shipment_value_currency: draft.shipmentValueCurrency,
        budget: draft.budget ? Number(draft.budget) : null,
        is_negotiable: draft.receivePriceProposals,
        currency: draft.freightCurrency,
        payment_terms: draft.paymentDeferred ? 'deferred' : 'on_delivery',
        incoterms: draft.incoterm || null,
        payment_due_days: draft.paymentDeferred && draft.paymentDueDays ? Number(draft.paymentDueDays) : null,
        temperature_min: draft.temperatureControlled && draft.temperatureMin ? Number(draft.temperatureMin) : null,
        temperature_max: draft.temperatureControlled && draft.temperatureMax ? Number(draft.temperatureMax) : null,
        loading_methods: [draft.loadingEquipment],
        vehicle_type: draft.transportType === 'road' ? draft.vehicleType : null,
        transport_mode: draft.transportType === 'air' ? draft.transportMode : null,
        special_requirements: draft.transportType === 'air' ? draft.specialRequirements : [],
        characteristics: draft.characteristics || null,
        delivery_proof: draft.transportType === 'air' ? draft.deliveryProof || null : null,
        requires_adr: draft.requiresAdr,
        requires_tail_lift: draft.requiresTailLift,
        toll_roads_included: draft.tollRoadsIncluded,
        ferry_included: draft.ferryIncluded,
        cmr_required: draft.cmrRequired,
        pallet_exchange_required: draft.palletExchangeRequired,
        customs_required: draft.customsRequired,
        must_be_trackable: draft.mustBeTrackable,
        is_urgent: draft.urgent,
        body_types: draft.bodyTypes,
        contact: { name: draft.contactName, phone: draft.contactPhone, mobile: draft.contactMobile, email: draft.contactEmail, fax: draft.contactFax },
        notes: draft.notes || draft.additionalInfo || null,
        internal_comments: draft.internalComments || null,
        external_comments: draft.externalComments || null,
        stops: [
          { type: 'pickup', position: 1, place_type: draft.pickupPlaceType, city: draft.pickupCity, country_code: draft.pickupCountry, address: draft.pickupAddress || null, latitude: draft.pickupLatitude ? Number(draft.pickupLatitude) : null, longitude: draft.pickupLongitude ? Number(draft.pickupLongitude) : null, window_starts_at: toApiDateTime(draft.pickupDate, draft.pickupTimeFrom), window_ends_at: toApiDateTime(draft.pickupDateTo || draft.pickupDate, draft.pickupTimeTo || draft.pickupTimeFrom) },
          { type: 'delivery', position: 2, place_type: draft.deliveryPlaceType, city: draft.deliveryCity, country_code: draft.deliveryCountry, address: draft.deliveryAddress || null, latitude: draft.deliveryLatitude ? Number(draft.deliveryLatitude) : null, longitude: draft.deliveryLongitude ? Number(draft.deliveryLongitude) : null, window_starts_at: toApiDateTime(draft.deliveryDate, draft.deliveryTimeFrom), window_ends_at: toApiDateTime(draft.deliveryDateTo || draft.deliveryDate, draft.deliveryTimeTo || draft.deliveryTimeFrom) },
        ],
      };
      const response = editLoadId
        ? await api.loads.update(editLoadId, payload)
        : await api.loads.create({ ...payload, status: 'posted', published_at: new Date().toISOString() });
      onSaved?.(response.data);
      onClose();
      void showSuccess(
        editLoadId ? 'Load updated' : 'Load published',
        editLoadId ? 'Your changes are now live.' : 'The load is now available in the freight exchange.',
      );
    } catch (error) {
      if (error instanceof ApiError) {
        const validationMessage = Object.values(error.errors).flat().find(Boolean);
        setSubmitError(validationMessage || error.message);
      } else {
        setSubmitError(u('postLoadModal.apiError', 'The load could not be published.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;
  if (isLoadingExisting) return <motion.div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, ease: 'easeOut' }}><motion.div className="rounded-2xl bg-white px-6 py-5 font-bold text-slate-700 shadow-2xl dark:bg-slate-900 dark:text-white" initial={{ opacity: 0, y: 24, scale: 0.992 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>Loading load...</motion.div></motion.div>;

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-stretch justify-center overflow-hidden bg-slate-950/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <AddressMapModal
        open={addressMap !== null}
        lang={lang}
        title={addressMap === 'delivery'
          ? u('postLoadModal.deliveryAddress', 'Delivery address')
          : u('postLoadModal.pickupAddress', 'Pickup address')}
        initialQuery={addressMap === 'delivery'
          ? draft.deliveryAddress || draft.deliveryCity
          : draft.pickupAddress || draft.pickupCity}
        initialPosition={addressMap === 'delivery'
          ? draft.deliveryLatitude && draft.deliveryLongitude
            ? [Number(draft.deliveryLatitude), Number(draft.deliveryLongitude)]
            : null
          : draft.pickupLatitude && draft.pickupLongitude
            ? [Number(draft.pickupLatitude), Number(draft.pickupLongitude)]
            : null}
        onClose={() => setAddressMap(null)}
        onSelect={(location) => {
          setDraft((current) => addressMap === 'delivery'
            ? {
                ...current,
                deliveryAddress: location.label,
                deliveryCity: location.city || current.deliveryCity,
                deliveryCountry: location.countryCode || current.deliveryCountry,
                deliveryLatitude: String(location.latitude),
                deliveryLongitude: String(location.longitude),
              }
            : {
                ...current,
                pickupAddress: location.label,
                pickupCity: location.city || current.pickupCity,
                pickupCountry: location.countryCode || current.pickupCountry,
                pickupLatitude: String(location.latitude),
                pickupLongitude: String(location.longitude),
              });
          setAddressMap(null);
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.992 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col bg-white dark:bg-slate-900 shadow-2xl w-full h-[100dvh] overflow-hidden border-0 rounded-none"
      >
        <div className="sticky top-0 z-20 border-b border-slate-100 dark:border-slate-800 bg-white/96 dark:bg-slate-900/96 backdrop-blur-sm">
          <div className="p-4 sm:p-5 md:p-6 flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-1 items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                <Plus className="text-primary w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight dark:text-white">
                  {editLoadId ? u('postLoadModal.editTitle', 'Edit Load') : u('postLoadModal.title', 'Post New Load')}
                </h3>
                <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-2xl pr-2">
                  {u(
                    'postLoadModal.subtitle',
                    'Create a structured freight request drivers can evaluate and accept quickly'
                  )}
                </p>
              </div>
            </div>
            <div className="hidden xl:flex shrink-0 items-center gap-4 text-slate-500">
              <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-bold">
                {step === 'route' && <MapPin className="w-4 h-4 text-primary" />}
                {step === 'cargo' && <Package className="w-4 h-4 text-primary" />}
                {step === 'terms' && <ShieldCheck className="w-4 h-4 text-primary" />}
                {step === 'contact' && <UserRound className="w-4 h-4 text-primary" />}
                {step === 'review' && <FileText className="w-4 h-4 text-primary" />}
                <span>
                  {u('postLoadModal.stepLabel', 'Step')} {stepIndex + 1} / {STEPS.length}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                <CalendarDays className="w-4 h-4" />
                <span>{draft.pickupDate || u('postLoadModal.noPickupDate', 'Pickup date pending')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                <Clock3 className="w-4 h-4" />
                <span>{draft.deliveryDate || u('postLoadModal.noDeliveryDate', 'Delivery date pending')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                <ThermometerSnowflake className="w-4 h-4" />
                <span>{draft.temperatureControlled ? `${draft.temperatureMin || '—'}°C to ${draft.temperatureMax || '—'}°C` : u('postLoadModal.ambient', 'Ambient')}</span>
              </div>
              {aiFieldCount > 0 && (
                <div className="flex items-center gap-2 text-xs whitespace-nowrap text-primary">
                  <Sparkles className="w-4 h-4" />
                  <span>{aiFieldCount} {u('postLoadModal.aiFilledCount', 'fields from AI')}</span>
                </div>
              )}
              {scannedDocuments.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {scannedDocuments.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setViewingDocId(doc.id)}
                      title={u('postLoadModal.scannedDocument', 'Scanned document — click to view extracted data')}
                      className="relative h-10 w-10 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 border-primary/40 hover:border-primary transition-colors"
                    >
                      {doc.imageDataUrl ? (
                        <img src={doc.imageDataUrl} alt="Scanned document" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-tl-md bg-primary">
                        <Sparkles className="h-2.5 w-2.5 text-white" />
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={onOpenLenaAI ?? (() => setDropzoneOpen(true))}
                    title={u('postLoadModal.addScannedDocument', 'Scan another document')}
                    className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-primary hover:text-primary transition-colors dark:border-slate-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 h-11 w-11 cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
              aria-label={u('common.cancel', 'Cancel')}
              title={u('common.cancel', 'Cancel')}
            >
              <X className="w-6 h-6 text-slate-500" />
            </button>
          </div>

          <div className="px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6 xl:hidden">
            <div className="flex flex-wrap items-center gap-3 text-slate-500">
              <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-bold">
                {step === 'route' && <MapPin className="w-4 h-4 text-primary" />}
                {step === 'cargo' && <Package className="w-4 h-4 text-primary" />}
                {step === 'terms' && <ShieldCheck className="w-4 h-4 text-primary" />}
                {step === 'contact' && <UserRound className="w-4 h-4 text-primary" />}
                {step === 'review' && <FileText className="w-4 h-4 text-primary" />}
                <span>
                  {u('postLoadModal.stepLabel', 'Step')} {stepIndex + 1} / {STEPS.length}
                </span>
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs">
                <CalendarDays className="w-4 h-4" />
                <span>{draft.pickupDate || u('postLoadModal.noPickupDate', 'Pickup date pending')}</span>
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs">
                <Clock3 className="w-4 h-4" />
                <span>{draft.deliveryDate || u('postLoadModal.noDeliveryDate', 'Delivery date pending')}</span>
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs">
                <ThermometerSnowflake className="w-4 h-4" />
                <span>{draft.temperatureControlled ? `${draft.temperatureMin || '—'}°C to ${draft.temperatureMax || '—'}°C` : u('postLoadModal.ambient', 'Ambient')}</span>
              </div>
              {aiFieldCount > 0 && (
                <div className="hidden md:flex items-center gap-2 text-xs text-primary">
                  <Sparkles className="w-4 h-4" />
                  <span>{aiFieldCount} {u('postLoadModal.aiFilledCount', 'fields from AI')}</span>
                </div>
              )}
              {scannedDocuments.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {scannedDocuments.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setViewingDocId(doc.id)}
                      title={u('postLoadModal.scannedDocument', 'Scanned document — click to view extracted data')}
                      className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 border-primary/40 hover:border-primary transition-colors"
                    >
                      {doc.imageDataUrl ? (
                        <img src={doc.imageDataUrl} alt="Scanned document" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-primary/10">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5 items-center justify-center rounded-tl-md bg-primary">
                        <Sparkles className="h-2 w-2 text-white" />
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={onOpenLenaAI ?? (() => setDropzoneOpen(true))}
                    title={u('postLoadModal.addScannedDocument', 'Scan another document')}
                    className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 hover:border-primary hover:text-primary transition-colors dark:border-slate-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid flex-1 min-h-0 xl:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="hidden xl:block border-r border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-5 overflow-y-auto">
            <div className="space-y-3">
              {STEPS.map((item, index) => {
                const Icon = item.icon;
                const isActive = item.id === step;
                const isDone = stepCompletion[item.id];
                const isClickable = canNavigateToStep(index);
                const title =
                  item.id === 'route'
                    ? u('postLoadModal.step.route', 'Route & Timing')
                    : item.id === 'cargo'
                      ? u('postLoadModal.step.cargo', 'Cargo Details')
                      : item.id === 'terms'
                        ? u('postLoadModal.step.terms', 'Terms')
                        : item.id === 'contact'
                          ? u('postLoadModal.step.contact', 'Contact')
                          : u('postLoadModal.step.review', 'Review');
                const subtitle =
                  item.id === 'route'
                    ? u('postLoadModal.step.routeDesc', 'Where and when the load moves')
                    : item.id === 'cargo'
                      ? u('postLoadModal.step.cargoDesc', 'Customer, transport type and cargo')
                      : item.id === 'terms'
                        ? u('postLoadModal.step.termsDesc', 'Budget and equipment requirements')
                        : item.id === 'contact'
                          ? u('postLoadModal.step.contactDesc', 'Who to coordinate with and publication limits')
                          : u('postLoadModal.step.reviewDesc', 'Final check before posting');

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (!isClickable) return;
                      setStep(item.id);
                    }}
                    disabled={!isClickable}
                    className={cn(
                      'w-full min-h-[92px] rounded-2xl border p-4 text-left transition-all',
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
                      isDone && !isActive && 'border-emerald-500/30 bg-emerald-500/5',
                      isClickable
                        ? 'cursor-pointer hover:border-primary/30'
                        : 'cursor-not-allowed opacity-60'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                          isDone
                            ? 'bg-emerald-500 text-white'
                            : isActive
                              ? 'bg-primary text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        )}
                      >
                        {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold dark:text-white">{title}</p>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{subtitle}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

          </aside>

          <div className="flex min-h-0 min-w-0 flex-col">
            <div ref={contentScrollRef} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">
              <AnimatePresence mode="wait">
              {step === 'route' && (
                <motion.div key="route" className="space-y-6 sm:space-y-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>

                  <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
                    <div className="space-y-4 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 md:p-5">
                      <div className="flex items-center gap-2 text-emerald-500">
                        <MapPin className="w-4 h-4" />
                        <p className="text-xs font-black uppercase tracking-wider">
                          {u('postLoadModal.pickupBlock', 'Pickup')}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.pickupPlaces', 'Loading place')}</FieldLabel>
                        <Select value={draft.pickupPlaces} onChange={(e) => setField('pickupPlaces', e.target.value)}>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.pickupPlaceType', 'Place type')}</FieldLabel>
                        <div className="grid grid-cols-3 gap-2">
                          {(draft.transportType === 'air'
                            ? [
                                { value: 'Loading place', label: u('postLoadModal.loadingPlace', 'Loading place'), icon: Package },
                                { value: 'Warehouse', label: u('postLoadModal.warehouse', 'Warehouse'), icon: Warehouse },
                                { value: 'Terminal', label: u('postLoadModal.terminal', 'Terminal'), icon: Building2 },
                                { value: 'AOL / Airport of loading', label: 'AOL / Airport of loading', icon: PlaneLanding },
                                { value: 'Address', label: u('postLoadModal.address', 'Address'), icon: MapPin },
                              ]
                            : [
                                { value: 'Loading place', label: u('postLoadModal.loadingPlace', 'Loading place'), icon: Package },
                                { value: 'Warehouse', label: u('postLoadModal.warehouse', 'Warehouse'), icon: Warehouse },
                                { value: 'Terminal', label: u('postLoadModal.terminal', 'Terminal'), icon: Building2 },
                              ]
                          ).map((option) => (
                            <ChoiceCard
                              key={option.value}
                              compact
                              active={draft.pickupPlaceType === option.value}
                              title={option.label}
                              icon={option.icon}
                              onClick={() => setField('pickupPlaceType', option.value)}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.pickupAddress', 'Pickup address')}</FieldLabel>
                        <AddressAutocompleteField
                          value={draft.pickupAddress}
                          onChange={(value) => setField('pickupAddress', value)}
                          onSelectLocation={(location) => setDraft((current) => ({
                            ...current,
                            pickupAddress: location.label,
                            pickupCity: location.city || current.pickupCity,
                            pickupCountry: location.countryCode || current.pickupCountry,
                            pickupLatitude: String(location.latitude),
                            pickupLongitude: String(location.longitude),
                          }))}
                          placeholder={u('postLoadModal.pickupAddressPlaceholder', 'Start typing or click the map to select')}
                          onOpenMap={() => setAddressMap('pickup')}
                          mapButtonLabel={u('map.choosePickup', 'Choose pickup address on map')}
                          mapButtonIcon={MapGlyphIcon}
                          accentClassName="text-emerald-500"
                        />
                      </div>
                      <div className="grid sm:grid-cols-[240px_minmax(0,1fr)] gap-4">
                        <div className="space-y-1.5">
                          {fieldLabel('pickupCountry', 'postLoadModal.pickupCountryShort', 'Country')}
                          <CountrySelect value={draft.pickupCountry} onChange={(value) => setField('pickupCountry', value)} placeholder={u('postLoadModal.selectCountry', 'Select country')} />
                        </div>
                        <div className="space-y-1.5">
                          {fieldLabel('pickupCity', 'postLoadModal.pickupCity', 'Post code, place')}
                          <Input value={draft.pickupCity} onChange={(event) => setField('pickupCity', event.target.value)} placeholder={u('postLoadModal.cityCountry', 'City or postcode')} />
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex h-full flex-col justify-between space-y-1.5">
                            {fieldLabel('pickupDate', 'postLoadModal.pickupDate', 'Date from')}
                            <DateInput
                              value={draft.pickupDate}
                              onChange={(value) => setField('pickupDate', value)}
                              placeholder="dd.mm.yyyy"
                              lang={lang}
                            />
                          </div>
                          <div className="flex h-full flex-col justify-between space-y-1.5">
                            <FieldLabel>{u('postLoadModal.pickupDateTo', 'Date to')}</FieldLabel>
                            <DateInput
                              value={draft.pickupDateTo}
                              onChange={(value) => setField('pickupDateTo', value)}
                              placeholder="dd.mm.yyyy"
                              lang={lang}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex h-full flex-col justify-between space-y-1.5">
                            <FieldLabel>{u('postLoadModal.pickupTimeFrom', 'Time from')}</FieldLabel>
                            <TimeInput
                              value={draft.pickupTimeFrom}
                              onChange={(value) => setField('pickupTimeFrom', value)}
                              placeholder="hh:mm"
                              lang={lang}
                            />
                          </div>
                          <div className="flex h-full flex-col justify-between space-y-1.5">
                            <FieldLabel>{u('postLoadModal.pickupTimeTo', 'Time to')}</FieldLabel>
                            <TimeInput
                              value={draft.pickupTimeTo}
                              onChange={(value) => setField('pickupTimeTo', value)}
                              placeholder="hh:mm"
                              lang={lang}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 md:p-5">
                      <div className="flex items-center gap-2 text-blue-500">
                        <Truck className="w-4 h-4" />
                        <p className="text-xs font-black uppercase tracking-wider">
                          {u('postLoadModal.deliveryBlock', 'Delivery')}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.deliveryPlaces', 'Unloading place')}</FieldLabel>
                        <Select value={draft.deliveryPlaces} onChange={(e) => setField('deliveryPlaces', e.target.value)}>
                          <option value="1">1</option>
                          <option value="2">2</option>
                          <option value="3">3</option>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.deliveryPlaceType', 'Place type')}</FieldLabel>
                        <div className="grid grid-cols-3 gap-2">
                          {(draft.transportType === 'air'
                            ? [
                                { value: 'Unloading place', label: u('postLoadModal.unloadingPlace', 'Unloading place'), icon: Package },
                                { value: 'Warehouse', label: u('postLoadModal.warehouse', 'Warehouse'), icon: Warehouse },
                                { value: 'Terminal', label: u('postLoadModal.terminal', 'Terminal'), icon: Building2 },
                                { value: 'Address', label: u('postLoadModal.address', 'Address'), icon: MapPin },
                              ]
                            : [
                                { value: 'Unloading place', label: u('postLoadModal.unloadingPlace', 'Unloading place'), icon: Package },
                                { value: 'Warehouse', label: u('postLoadModal.warehouse', 'Warehouse'), icon: Warehouse },
                                { value: 'Terminal', label: u('postLoadModal.terminal', 'Terminal'), icon: Building2 },
                              ]
                          ).map((option) => (
                            <ChoiceCard
                              key={option.value}
                              compact
                              active={draft.deliveryPlaceType === option.value}
                              title={option.label}
                              icon={option.icon}
                              onClick={() => setField('deliveryPlaceType', option.value)}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.deliveryAddress', 'Delivery address')}</FieldLabel>
                        <AddressAutocompleteField
                          value={draft.deliveryAddress}
                          onChange={(value) => setField('deliveryAddress', value)}
                          onSelectLocation={(location) => setDraft((current) => ({
                            ...current,
                            deliveryAddress: location.label,
                            deliveryCity: location.city || current.deliveryCity,
                            deliveryCountry: location.countryCode || current.deliveryCountry,
                            deliveryLatitude: String(location.latitude),
                            deliveryLongitude: String(location.longitude),
                          }))}
                          placeholder={u('postLoadModal.deliveryAddressPlaceholder', 'Start typing or click the map to select')}
                          onOpenMap={() => setAddressMap('delivery')}
                          mapButtonLabel={u('map.chooseDelivery', 'Choose delivery address on map')}
                          mapButtonIcon={MapGlyphIcon}
                          accentClassName="text-blue-500"
                        />
                      </div>
                      <div className="grid sm:grid-cols-[240px_minmax(0,1fr)] gap-4">
                        <div className="space-y-1.5">
                          {fieldLabel('deliveryCountry', 'postLoadModal.deliveryCountryShort', 'Country')}
                          <CountrySelect value={draft.deliveryCountry} onChange={(value) => setField('deliveryCountry', value)} placeholder={u('postLoadModal.selectCountry', 'Select country')} />
                        </div>
                        <div className="space-y-1.5">
                          {fieldLabel('deliveryCity', 'postLoadModal.deliveryCity', 'Post code, place')}
                          <Input value={draft.deliveryCity} onChange={(event) => setField('deliveryCity', event.target.value)} placeholder={u('postLoadModal.cityCountry', 'City or postcode')} />
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex h-full flex-col justify-between space-y-1.5">
                            {fieldLabel('deliveryDate', 'postLoadModal.deliveryDate', 'Date from')}
                            <DateInput
                              value={draft.deliveryDate}
                              onChange={(value) => setField('deliveryDate', value)}
                              placeholder="dd.mm.yyyy"
                              lang={lang}
                            />
                          </div>
                          <div className="flex h-full flex-col justify-between space-y-1.5">
                            <FieldLabel>{u('postLoadModal.deliveryDateTo', 'Date to')}</FieldLabel>
                            <DateInput
                              value={draft.deliveryDateTo}
                              onChange={(value) => setField('deliveryDateTo', value)}
                              placeholder="dd.mm.yyyy"
                              lang={lang}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex h-full flex-col justify-between space-y-1.5">
                            <FieldLabel>{u('postLoadModal.deliveryTimeFrom', 'Time from')}</FieldLabel>
                            <TimeInput
                              value={draft.deliveryTimeFrom}
                              onChange={(value) => setField('deliveryTimeFrom', value)}
                              placeholder="hh:mm"
                              lang={lang}
                            />
                          </div>
                          <div className="flex h-full flex-col justify-between space-y-1.5">
                            <FieldLabel>{u('postLoadModal.deliveryTimeTo', 'Time to')}</FieldLabel>
                            <TimeInput
                              value={draft.deliveryTimeTo}
                              onChange={(value) => setField('deliveryTimeTo', value)}
                              placeholder="hh:mm"
                              lang={lang}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 'cargo' && (
                <motion.div key="cargo" className="space-y-6 sm:space-y-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>

                  <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
                    <div className="space-y-4 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 md:p-5">
                      <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                          <UserRound className="h-4 w-4" />
                          <span>{u('postLoadModal.consignee', 'Consignee (customer)')}</span>
                        </div>
                        <CustomerSelect
                          required
                          value={draft.consignee}
                          onChange={(option) => setField('consignee', option)}
                          placeholder={u('postLoadModal.consigneePlaceholder', 'Select a consignee from the global customer database')}
                        />
                        <p className="text-xs text-slate-500">
                          {u('postLoadModal.consigneeHelp', 'Search by company name, tax number, city or country. More results load as you scroll.')}
                        </p>
                      </div>

                      <fieldset>
                        <legend className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                          <Route className="h-4 w-4" />
                          {u('postLoadModal.transportType', 'Transport type')}
                        </legend>
                        <div className="mt-4 grid sm:grid-cols-3 gap-3">
                          {transportOptions.map((option) => {
                            const Icon = option.icon;
                            return (
                              <label
                                key={option.id}
                                className="relative flex cursor-pointer flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 pr-11 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60"
                              >
                                <input
                                  type="radio"
                                  name="transportType"
                                  value={option.id}
                                  checked={draft.transportType === option.id}
                                  onChange={() => setDraft((prev) => ({
                                    ...prev,
                                    transportType: option.id,
                                    cargoType: option.id === 'air' ? 'Standard' : prev.cargoType === 'Standard' ? 'FTL' : prev.cargoType,
                                  }))}
                                  className="peer sr-only"
                                />
                                <span aria-hidden="true" className="absolute right-4 top-4 flex h-4 w-4 items-center justify-center rounded-full border-2 border-slate-300 bg-white peer-checked:border-primary dark:border-slate-600 dark:bg-slate-900">
                                  <span className={cn('h-2 w-2 rounded-full bg-primary transition-opacity', draft.transportType === option.id ? 'opacity-100' : 'opacity-0')} />
                                </span>
                                <div className="flex items-center gap-3">
                                  <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', option.iconSurface)}>
                                    <Icon className={cn('h-5 w-5', option.iconTone)} />
                                  </div>
                                  <p className="text-sm font-bold text-slate-900 dark:text-white">{option.label}</p>
                                </div>
                                <p className="text-xs text-slate-500">{option.description}</p>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>

                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.loadingEquipment', 'Loading equipment')}</FieldLabel>
                        <div className="grid grid-cols-2 gap-2">
                          {LOADING_EQUIPMENT_OPTIONS.map((option) => <ChoiceCard key={option} compact active={draft.loadingEquipment === option} title={option} icon={option.includes('Forklift') ? Package : option.includes('ramp') ? Truck : option.includes('Other') ? ShieldCheck : X} onClick={() => setField('loadingEquipment', option)} />)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 md:p-5">
                      <div className="space-y-1.5">
                        {fieldLabel('cargoTitle', 'postLoadModal.cargoName', 'Type of goods')}
                        <Input
                          value={draft.cargoTitle}
                          onChange={(e) => setField('cargoTitle', e.target.value)}
                          placeholder={u('postLoadModal.cargoNamePlaceholder', 'Electronics pallets / FMCG / temperature goods')}
                        />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          {fieldLabel('lengthM', 'postLoadModal.length', 'Length (m)')}
                          <Input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={draft.lengthM}
                            onChange={(e) => setField('lengthM', e.target.value)}
                            placeholder="13.6"
                          />
                        </div>
                        <div className="space-y-1.5">
                          {fieldLabel('weightKg', 'postLoadModal.weight', 'Weight (t)')}
                          <Input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={draft.weightKg}
                            onChange={(e) => setField('weightKg', e.target.value)}
                            placeholder="24.0"
                          />
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          {fieldLabel('widthM', 'postLoadModal.width', 'Width (m)')}
                          <Input
                            type="number"
                            step="0.05"
                            min="0"
                            value={draft.widthM}
                            onChange={(e) => setField('widthM', e.target.value)}
                            placeholder="2.45"
                          />
                        </div>
                        <div className="space-y-1.5">
                          {fieldLabel('heightM', 'postLoadModal.height', 'Height (m)')}
                          <Input
                            type="number"
                            step="0.05"
                            min="0"
                            value={draft.heightM}
                            onChange={(e) => setField('heightM', e.target.value)}
                            placeholder="2.70"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.declaredValue', 'Value of shipment')}</FieldLabel>
                          <div className="grid grid-cols-[minmax(0,1fr)_90px] gap-2">
                            <Input type="number" step="100" min="0" value={draft.declaredValue} onChange={(e) => setField('declaredValue', e.target.value)} placeholder="50000" />
                            <Select value={draft.shipmentValueCurrency} onChange={(e) => setField('shipmentValueCurrency', e.target.value)}>
                              <option value="EUR">EUR</option><option value="BAM">BAM</option><option value="USD">USD</option>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.cargoModel', 'Shipment type')}</FieldLabel>
                        <div className="-mx-1 overflow-x-auto px-1 pb-2 [scrollbar-width:thin] snap-x snap-mandatory">
                          <div className="flex w-max gap-2">
                          {(draft.transportType === 'air' ? ['Standard', 'Express', 'Priority', 'Economy', 'Charter'] : ['FTL', 'LTL', 'Express', 'Dedicated']).map((option) => (
                            <ChoiceCard key={option} compact nowrap className="w-auto snap-start shrink-0 justify-start pl-3 pr-7 text-left" active={draft.cargoType === option} title={option} icon={option === 'Charter' ? Plane : option === 'Express' || option === 'Priority' ? Clock3 : Package} onClick={(event) => { setField('cargoType', option); event.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' }); }} />
                          ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.additionalInfo', 'Additional information')}</FieldLabel>
                        <div className="grid grid-cols-3 gap-2">
                          {[{ value: 'Stackable', icon: Package }, { value: 'Top load only', icon: ShieldCheck }, { value: 'Non-stackable', icon: X }].map(({ value, icon }) => <ChoiceCard key={value} compact active={draft.additionalInfo === value} title={value} icon={icon} onClick={() => setField('additionalInfo', value)} />)}
                        </div>
                      </div>
                    </div>

                  </div>
                </motion.div>
              )}

              {step === 'terms' && (
                <motion.div key="terms" className="space-y-6 sm:space-y-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>

                  <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
                  <div className="order-2 flex flex-col space-y-4 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 md:p-5">
                    <div className="grid sm:grid-cols-[minmax(0,1fr)_120px] gap-4">
                      <div className="space-y-1.5">
                        {fieldLabel('budget', 'postLoadModal.targetPrice', 'Your expected target price')}
                        <Input
                          value={draft.budget}
                          onChange={(e) => setField('budget', e.target.value)}
                          placeholder="1450"
                        />
                      </div>
                      <div className="space-y-1.5">
                        {fieldLabel('freightCurrency', 'postLoadModal.currency', 'Currency')}
                        <Select value={draft.freightCurrency} onChange={(e) => setField('freightCurrency', e.target.value)}>
                          <option value="EUR">EUR</option>
                          <option value="BAM">BAM</option>
                          <option value="USD">USD</option>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {fieldLabel('paymentDeferred', 'postLoadModal.deferredPayment', 'Deferred payment')}
                      <div className="grid grid-cols-2 gap-2">
                        <ChoiceCard compact active={!draft.paymentDeferred} title={u('common.no', 'No')} description="Pay on delivery" icon={Coins} onClick={() => setField('paymentDeferred', false)} />
                        <ChoiceCard compact active={draft.paymentDeferred} title={u('common.yes', 'Yes')} description="Set payment window" icon={Clock3} onClick={() => setField('paymentDeferred', true)} />
                      </div>
                      {draft.paymentDeferred && <Input type="number" min="1" value={draft.paymentDueDays} onChange={(e) => setField('paymentDueDays', e.target.value)} placeholder={u('postLoadModal.paymentDueDays', 'Number of days')} />}
                    </div>
                    <div className="space-y-1.5">
                      {fieldLabel('incoterm', 'postLoadModal.incoterm', 'Incoterm')}
                      <Select value={draft.incoterm} onChange={(event) => setField('incoterm', event.target.value)}>
                        <option value="">{u('postLoadModal.pleaseSelect', 'Please select')}</option>
                        {INCOTERM_OPTIONS.map((incoterm) => (
                          <option key={incoterm} value={incoterm}>{incoterm}</option>
                        ))}
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <FieldLabel>{u('postLoadModal.priceTerms', 'Terms')}</FieldLabel>
                      <div className="grid grid-cols-2 gap-3">
                        <ChoiceCard
                          active={draft.receivePriceProposals}
                          title={u('postLoadModal.termsNegotiable', 'Negotiable')}
                          description={u('postLoadModal.termsNegotiableDesc', 'Carriers can send alternative prices')}
                          icon={Handshake}
                          onClick={() => setField('receivePriceProposals', true)}
                        />
                        <ChoiceCard
                          active={!draft.receivePriceProposals}
                          title={u('postLoadModal.termsFixed', 'Fixed price')}
                          description={u('postLoadModal.termsFixedDesc', 'Carriers book instantly at your price')}
                          icon={Tag}
                          onClick={() => setField('receivePriceProposals', false)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <FieldLabel>{u('postLoadModal.externalComments', 'External comments')}</FieldLabel>
                      <Input
                        value={draft.externalComments}
                        onChange={(e) => setField('externalComments', e.target.value)}
                        placeholder={u('postLoadModal.externalCommentsPlaceholder', 'Visible to carriers reviewing the offer')}
                      />
                    </div>

                    <div className="flex flex-1 flex-col space-y-1.5">
                      {fieldLabel('notes', 'postLoadModal.notes', 'Handling notes')}
                      <Textarea
                        value={draft.notes}
                        onChange={(e) => setField('notes', e.target.value)}
                        placeholder={u(
                          'postLoadModal.notesPlaceholder',
                          'Packaging details, loading constraints, dock rules, documents, return pallets, special care...'
                        )}
                        className="h-full min-h-24 flex-1"
                      />
                    </div>
                  </div>

                    <div className="order-1 space-y-5 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 md:p-5">
                      <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                        <Truck className="h-4 w-4" />
                        <span>{u('postLoadModal.equipmentTitle', 'Equipment & requirements')}</span>
                      </div>
                      {draft.transportType === 'air' ? (
                        <div className="space-y-4">
                          <div className="space-y-1.5"><FieldLabel>{u('postLoadModal.transportMode', 'Transport mode')}</FieldLabel><div className="grid sm:grid-cols-2 gap-3"><ChoiceCard active={draft.transportMode === 'Airport to airport'} title="Airport to airport" description="Terminal-to-terminal air cargo" icon={Plane} onClick={() => setField('transportMode', 'Airport to airport')} /><ChoiceCard active={draft.transportMode === 'Air freight + last-mile delivery'} title="Air freight + last-mile delivery" description="Air transport plus final delivery" icon={Truck} onClick={() => setField('transportMode', 'Air freight + last-mile delivery')} /></div></div>
                          <div className="space-y-1.5"><FieldLabel>{u('postLoadModal.specialRequirements', 'Special requirements')}</FieldLabel><div className="min-h-[54px] rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950"><div className="flex flex-wrap gap-2">{AIR_SPECIAL_REQUIREMENT_OPTIONS.map((option) => <button key={option} type="button" onClick={() => toggleSpecialRequirement(option)} className={cn('cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-colors', draft.specialRequirements.includes(option) ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200')}>{option}</button>)}</div></div></div>
                        </div>
                      ) : (
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">{fieldLabel('vehicleType', 'postLoadModal.vehicleType', 'Required vehicle')}<Select value={draft.vehicleType} onChange={(e) => setField('vehicleType', e.target.value)}>{VEHICLE_OPTIONS.map((option) => <option key={option} value={option}>{u(`postLoadModal.vehicle.${option}`, option)}</option>)}</Select></div>
                          <div className="space-y-1.5">{fieldLabel('bodyTypes', 'postLoadModal.bodyTypes', 'Body types')}<div className="min-h-[54px] rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950"><div className="flex flex-wrap gap-2">{BODY_TYPE_OPTIONS.map((option) => <button key={option} type="button" onClick={() => toggleBodyType(option)} className={cn('cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-colors', draft.bodyTypes.includes(option) ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200')}>{option}</button>)}</div></div></div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.characteristics', 'Characteristics & certificates')}</FieldLabel>
                          <div className="-mx-1 overflow-x-auto px-1 pb-2 [scrollbar-width:thin] snap-x snap-mandatory">
                            <div className="flex w-max gap-2">
                              {(draft.transportType === 'air' ? AIR_CHARACTERISTIC_OPTIONS : ROAD_CHARACTERISTIC_OPTIONS).map((option) => <ChoiceCard key={option} compact nowrap className="w-auto snap-start shrink-0 justify-start pl-3 pr-7 text-left" active={draft.characteristics === option} title={option} icon={option.startsWith('DG') || option === 'ADR' ? ShieldCheck : option.startsWith('TCG') ? ThermometerSnowflake : option.startsWith('MED') ? FileText : Package} onClick={(event) => { setField('characteristics', option); event.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' }); }} />)}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {fieldLabel('temperatureControlled', 'postLoadModal.temperature', 'Temperature controlled')}
                          <div className="grid grid-cols-2 gap-2">
                            <ChoiceCard compact active={!draft.temperatureControlled} title={u('common.no', 'No')} description="Ambient conditions" icon={Package} onClick={() => setField('temperatureControlled', false)} />
                            <ChoiceCard compact active={draft.temperatureControlled} title={u('common.yes', 'Yes')} description="Set a temperature range" icon={ThermometerSnowflake} onClick={() => setField('temperatureControlled', true)} />
                          </div>
                          <Input
                            value={draft.temperatureMin}
                            onChange={(e) => setField('temperatureMin', e.target.value)}
                            className={cn(!draft.temperatureControlled && 'hidden')}
                            placeholder={u('postLoadModal.temperaturePlaceholder', '2°C to 8°C / Ambient')}
                          />
                        </div>
                      </div>

                      {draft.temperatureControlled && <div className="space-y-1.5"><FieldLabel>{u('postLoadModal.temperatureMax', 'To (°C)')}</FieldLabel><Input type="number" value={draft.temperatureMax} onChange={(e) => setField('temperatureMax', e.target.value)} placeholder="8" /></div>}

                      {draft.transportType === 'air' && <div className="space-y-1.5"><FieldLabel>{u('postLoadModal.deliveryProof', 'Delivery proof')}</FieldLabel><div className="grid grid-cols-2 gap-3"><ChoiceCard compact active={draft.deliveryProof === 'POD'} title="POD" description="Proof of Delivery" icon={FileText} onClick={() => setField('deliveryProof', 'POD')} /><ChoiceCard compact active={draft.deliveryProof === 'AOD'} title="AOD" description="Arrival on Delivery" icon={CheckCircle2} onClick={() => setField('deliveryProof', 'AOD')} /></div></div>}

                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                        <input
                          type="checkbox"
                          checked={draft.mustBeTrackable}
                          onChange={(e) => setField('mustBeTrackable', e.target.checked)}
                        />
                        <span>{u('postLoadModal.mustBeTrackable', 'Must be trackable via the Smart Logistics System')}</span>
                      </label>

                      <div className="grid md:grid-cols-3 gap-3">
                        <ToggleCard
                          active={draft.requiresAdr}
                          onClick={() => setField('requiresAdr', !draft.requiresAdr)}
                          title={u('postLoadModal.adr', 'ADR / certified')}
                          description={u('postLoadModal.adrDesc', 'Hazardous goods compliance required')}
                        />
                        <ToggleCard
                          active={draft.requiresTailLift}
                          onClick={() => setField('requiresTailLift', !draft.requiresTailLift)}
                          title={u('postLoadModal.tailLift', 'Tail lift')}
                          description={u('postLoadModal.tailLiftDesc', 'Required for pickup or delivery')}
                        />
                        <ToggleCard
                          active={draft.urgent}
                          onClick={() => setField('urgent', !draft.urgent)}
                          title={u('postLoadModal.urgent', 'Priority load')}
                          description={u('postLoadModal.urgentDesc', 'Higher urgency and faster acceptance')}
                        />
                      </div>

                      <div className="grid md:grid-cols-3 gap-3">
                        <ToggleCard
                          active={draft.tollRoadsIncluded}
                          onClick={() => setField('tollRoadsIncluded', !draft.tollRoadsIncluded)}
                          title={u('postLoadModal.tollRoads', 'Toll roads')}
                          description={u('postLoadModal.tollRoadsDesc', 'Route includes toll roads or motorways')}
                        />
                        <ToggleCard
                          active={draft.ferryIncluded}
                          onClick={() => setField('ferryIncluded', !draft.ferryIncluded)}
                          title={u('postLoadModal.ferry', 'Ferry')}
                          description={u('postLoadModal.ferryDesc', 'Route includes a ferry / RoRo crossing')}
                        />
                        <ToggleCard
                          active={draft.cmrRequired}
                          onClick={() => setField('cmrRequired', !draft.cmrRequired)}
                          title={u('postLoadModal.cmr', 'CMR')}
                          description={u('postLoadModal.cmrDesc', 'CMR consignment note required')}
                        />
                        <ToggleCard
                          active={draft.palletExchangeRequired}
                          onClick={() => setField('palletExchangeRequired', !draft.palletExchangeRequired)}
                          title={u('postLoadModal.palletExchange', 'Pallet exchange')}
                          description={u('postLoadModal.palletExchangeDesc', 'Pallets must be swapped on delivery')}
                        />
                        <ToggleCard
                          active={draft.customsRequired}
                          onClick={() => setField('customsRequired', !draft.customsRequired)}
                          title={u('postLoadModal.customs', 'Customs')}
                          description={u('postLoadModal.customsDesc', 'Customs clearance required')}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 'contact' && (
                <motion.div key="contact" className="space-y-6 sm:space-y-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>

                    <div className="space-y-5 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 md:p-5">
                      <div className="space-y-1.5">
                        {fieldLabel('contactName', 'postLoadModal.contactName', 'Contact in your company')}
                        <Select
                          value={draft.contactName}
                          onChange={(e) => setField('contactName', e.target.value)}
                        >
                          <option value="">{u('postLoadModal.pleaseSelect', 'Please select')}</option>
                          {CONTACT_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          {fieldLabel('contactEmail', 'postLoadModal.contactEmail', 'E-mail address')}
                          <Input
                            value={draft.contactEmail}
                            onChange={(e) => setField('contactEmail', e.target.value)}
                            placeholder="john@company.com"
                          />
                        </div>
                        <div className="space-y-1.5">
                          {fieldLabel('contactPhone', 'postLoadModal.contactPhone', 'Phone number')}
                          <Input
                            value={draft.contactPhone}
                            onChange={(e) => setField('contactPhone', e.target.value)}
                            placeholder="+387 33 123 456"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.contactFax', 'Fax number')}</FieldLabel>
                          <Input
                            value={draft.contactFax}
                            onChange={(e) => setField('contactFax', e.target.value)}
                            placeholder="+387 33 555 111"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.contactMobile', 'Mobile number')}</FieldLabel>
                          <Input
                            value={draft.contactMobile}
                            onChange={(e) => setField('contactMobile', e.target.value)}
                            placeholder="+387 61 123 456"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel>{u('postLoadModal.showInOffer', 'Show in offer')}</FieldLabel>
                        <div className="grid sm:grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                          <label className="flex items-center gap-2 text-sm dark:text-white">
                            <input type="checkbox" checked={draft.showEmail} onChange={(e) => setField('showEmail', e.target.checked)} />
                            <span>{u('postLoadModal.contactEmail', 'E-mail address')}</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm dark:text-white">
                            <input type="checkbox" checked={draft.showFax} onChange={(e) => setField('showFax', e.target.checked)} />
                            <span>{u('postLoadModal.contactFax', 'Fax number')}</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm dark:text-white">
                            <input type="checkbox" checked={draft.showPhone} onChange={(e) => setField('showPhone', e.target.checked)} />
                            <span>{u('postLoadModal.contactPhone', 'Phone number')}</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm dark:text-white">
                            <input type="checkbox" checked={draft.showMobile} onChange={(e) => setField('showMobile', e.target.checked)} />
                            <span>{u('postLoadModal.contactMobile', 'Mobile number')}</span>
                          </label>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.internalComments', 'Internal comments')}</FieldLabel>
                        <Input
                          value={draft.internalComments}
                          onChange={(e) => setField('internalComments', e.target.value)}
                          placeholder={u('postLoadModal.internalCommentsPlaceholder', 'Only visible within your company')}
                        />
                      </div>
                      <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                        <p className="text-xs font-black uppercase tracking-wider text-primary">
                          {u('postLoadModal.limitPublication', 'Limit publication')}
                        </p>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <FieldLabel>{u('postLoadModal.closedFreightExchange', 'Publish in closed freight exchange')}</FieldLabel>
                            <Select
                              value={draft.closedFreightExchange}
                              onChange={(e) => setField('closedFreightExchange', e.target.value)}
                            >
                              {CLOSED_EXCHANGE_OPTIONS.map((option) => (
                                <option key={option || 'none'} value={option}>
                                  {option || u('postLoadModal.none', 'None')}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <FieldLabel>{u('postLoadModal.closedFreightComments', 'Comments for closed freight exchange')}</FieldLabel>
                            <Input
                              value={draft.closedFreightComments}
                              onChange={(e) => setField('closedFreightComments', e.target.value)}
                              placeholder={u('postLoadModal.closedFreightCommentsPlaceholder', 'Only visible to members of the closed freight exchange')}
                            />
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm dark:text-white">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={draft.publishToAllAfterMinutes}
                              onChange={(e) => setField('publishToAllAfterMinutes', e.target.checked)}
                            />
                            <span>{u('postLoadModal.publishToAllAfter', 'After')}</span>
                          </label>
                          <Input
                            type="number"
                            value={draft.publishDelayMinutes}
                            onChange={(e) => setField('publishDelayMinutes', e.target.value)}
                            className="h-11 w-24"
                          />
                          <span>{u('postLoadModal.publishToAllAfterSuffix', 'minutes publish to all')}</span>
                        </div>
                      </div>
                    </div>
                </motion.div>
              )}

              {step === 'review' && (
                <motion.div key="review" className="space-y-6 sm:space-y-8" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
                  <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-5">
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-4 md:p-5">
                      <SummaryRow label={u('postLoadModal.consignee', 'Consignee (customer)')} value={draft.consignee?.text || '—'} />
                      <SummaryRow label={u('postLoadModal.routeSummary', 'Route')} value={`${draft.pickupCity} → ${draft.deliveryCity}`} />
                      <SummaryRow
                        label={u('postLoadModal.transportType', 'Transport type')}
                        value={transportOptions.find((option) => option.id === draft.transportType)?.label || draft.transportType}
                      />
                      <SummaryRow
                        label={u('postLoadModal.pickupSummary', 'Pickup')}
                        value={`${draft.pickupCountry} · ${draft.pickupDate || '—'}${draft.pickupDateTo ? ` - ${draft.pickupDateTo}` : ''}${draft.pickupTimeFrom ? ` · ${draft.pickupTimeFrom}` : ''}${draft.pickupTimeTo ? ` - ${draft.pickupTimeTo}` : ''}`}
                      />
                      <SummaryRow
                        label={u('postLoadModal.deliverySummary', 'Delivery')}
                        value={`${draft.deliveryCountry} · ${draft.deliveryDate || '—'}${draft.deliveryDateTo ? ` - ${draft.deliveryDateTo}` : ''}${draft.deliveryTimeFrom ? ` · ${draft.deliveryTimeFrom}` : ''}${draft.deliveryTimeTo ? ` - ${draft.deliveryTimeTo}` : ''}`}
                      />
                      <SummaryRow label={u('postLoadModal.cargoSummary', 'Cargo')} value={draft.cargoTitle} />
                      <SummaryRow label={u('postLoadModal.specsSummary', 'Specs')} value={`${draft.lengthM || '—'} × ${draft.widthM || '—'} × ${draft.heightM || '—'} m · ${draft.weightKg || '—'} t · ${draft.additionalInfo || u('postLoadModal.none', 'None')}`} />
                      <SummaryRow label={u('postLoadModal.vehicleSummary', 'Vehicle')} value={`${draft.vehicleType} · ${draft.bodyTypes.join(', ') || u('postLoadModal.none', 'None')}`} />
                      <SummaryRow label={u('postLoadModal.paymentSummary', 'Payout')} value={`${draft.budget || '—'} ${draft.freightCurrency} · ${draft.paymentDueDays || '—'} ${u('postLoadModal.days', 'days')}`} />
                      <SummaryRow label={u('postLoadModal.incoterm', 'Incoterm')} value={draft.incoterm || '—'} />
                      <SummaryRow label={u('postLoadModal.contactSummary', 'Contact')} value={`${draft.contactName} · ${draft.contactPhone || draft.contactMobile || draft.contactEmail || '—'}`} />
                      <SummaryRow
                        label={u('postLoadModal.flagsSummary', 'Special requirements')}
                        value={[
                          draft.requiresAdr ? u('postLoadModal.adr', 'ADR / certified') : null,
                          draft.requiresTailLift ? u('postLoadModal.tailLift', 'Tail lift') : null,
                          draft.urgent ? u('postLoadModal.urgent', 'Priority load') : null,
                          draft.mustBeTrackable ? u('postLoadModal.mustBeTrackableShort', 'Trackable') : null,
                        ].filter(Boolean).join(', ') || u('postLoadModal.none', 'None')}
                      />
                      <SummaryRow label={u('postLoadModal.publicationSummary', 'Publication')} value={draft.closedFreightExchange || u('postLoadModal.openPublication', 'Open publication')} />
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-3xl bg-primary text-white p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                          {u('postLoadModal.marketReadiness', 'Posting readiness')}
                        </p>
                        <p className="text-4xl font-black mt-2">
                          {Math.min(
                            100,
                            [
                              draft.pickupCity,
                              draft.deliveryCity,
                              draft.pickupDate,
                              draft.deliveryDate,
                              draft.cargoTitle,
                              draft.weightKg,
                              draft.budget,
                              draft.contactName,
                              draft.contactPhone,
                            ].filter(Boolean).length * 11
                          )}
                          %
                        </p>
                        <p className="text-sm text-white/80 mt-3">
                          {u(
                            'postLoadModal.marketReadinessDesc',
                            'More complete loads typically get faster driver responses and fewer clarification calls.'
                          )}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                        <div className="flex items-center gap-2 text-primary">
                          <Coins className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-wider">
                            {u('postLoadModal.quickCheck', 'Quick check')}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                          <p>{u('postLoadModal.quickCheck1', 'Is the offered payout realistic for this route and urgency?')}</p>
                          <p>{u('postLoadModal.quickCheck2', 'Did you include all handling or access constraints?')}</p>
                          <p>{u('postLoadModal.quickCheck3', 'Can a driver call the listed contact immediately if needed?')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>

            <div className="p-4 sm:p-5 md:p-6 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
              {submitError && <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">{submitError}</div>}
              <div className="grid w-full gap-3 sm:grid-cols-3">
                <Button variant="outline" className="w-full min-h-[56px] sm:min-h-[60px]" onClick={step === 'cargo' ? onClose : goBack}>
                  {step === 'cargo' ? u('common.cancel', 'Cancel') : u('common.back', 'Back')}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full min-h-[56px] sm:min-h-[60px] gap-2 border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/15 dark:hover:bg-primary/20"
                  onClick={onOpenLenaAI ?? (() => setDropzoneOpen(true))}
                  disabled={isSubmitting}
                >
                  <Sparkles className="w-4 h-4" />
                  {u('postLoadModal.fillWithLenaAI', 'Fill with LenaAI')}
                </Button>
                <Button className="w-full min-h-[56px] sm:min-h-[60px]" onClick={submit} disabled={isSubmitting}>
                  {isSubmitting ? u('postLoadModal.publishing', 'Saving...') : editLoadId ? u('common.save', 'Save changes') : u('common.postLoad', 'Publish')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      <DocumentDropzone open={dropzoneOpen} onClose={() => setDropzoneOpen(false)} onApply={applyScan} />
      <ScanResultModal
        open={viewingDocId !== null}
        onClose={() => setViewingDocId(null)}
        imageDataUrl={viewingDocument?.imageDataUrl ?? null}
        result={viewingDocument?.result ?? null}
      />
    </motion.div>
  );
};
