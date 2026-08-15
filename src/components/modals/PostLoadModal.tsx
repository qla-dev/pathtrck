import { useEffect, useMemo, useState, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { motion } from 'motion/react';
import Flatpickr from 'react-flatpickr';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  FileText,
  MapPin,
  Package,
  Plane,
  Plus,
  Route,
  ShieldCheck,
  Ship,
  ThermometerSnowflake,
  Truck,
  UserRound,
  X,
} from 'lucide-react';
import { Language } from '../../types';
import { flatpickrI18n, ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { MOCK_LOADS } from '../../mockData';
import { Button } from '../ui/Button';
import { useCitySuggestions } from '../frights/useCitySuggestions';
import { api, ApiError } from '../../services/api';

type PostLoadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  editLoadId?: number | string | null;
  onSaved?: () => void;
};

type StepId = 'route' | 'cargo' | 'terms' | 'review';
type TransportType = 'road' | 'air' | 'sea';

type LoadDraft = {
  transportType: TransportType;
  pickupPlaces: string;
  pickupPlaceType: string;
  pickupCity: string;
  pickupCountry: string;
  pickupAddress: string;
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
  volumeM3: string;
  declaredValue: string;
  additionalInfo: string;
  loadingEquipmentExchange: 'No' | 'Yes' | 'Not specified';
  vehicleType: string;
  bodyTypes: string[];
  characteristics: string;
  mustBeTrackable: boolean;
  paymentTerms: 'Negotiable' | 'In Advance' | 'On Delivery';
  budget: string;
  freightCurrency: string;
  paymentDueDays: string;
  receivePriceProposals: boolean;
  temperature: string;
  requiresAdr: boolean;
  requiresTailLift: boolean;
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
  transportType: 'road',
  pickupPlaces: '1',
  pickupPlaceType: 'Loading place',
  pickupCity: '',
  pickupCountry: 'BA',
  pickupAddress: '',
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
  volumeM3: '',
  declaredValue: '',
  additionalInfo: '',
  loadingEquipmentExchange: 'Not specified',
  vehicleType: 'Box Truck',
  bodyTypes: ['Curtain'],
  characteristics: '',
  mustBeTrackable: false,
  paymentTerms: 'Negotiable',
  budget: '',
  freightCurrency: 'EUR',
  paymentDueDays: '',
  receivePriceProposals: true,
  temperature: '',
  requiresAdr: false,
  requiresTailLift: false,
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

const STEPS: Array<{ id: StepId; icon: typeof MapPin }> = [
  { id: 'route', icon: MapPin },
  { id: 'cargo', icon: Package },
  { id: 'terms', icon: ShieldCheck },
  { id: 'review', icon: CheckCircle2 },
];

const COUNTRY_OPTIONS = ['BA', 'HR', 'RS', 'SI', 'DE', 'AT', 'IT', 'GB'];
const VEHICLE_OPTIONS = ['Cargo Van', 'Box Truck', 'Curtainsider', 'Reefer', 'Trailer', 'Rigid Truck'];
const BODY_TYPE_OPTIONS = ['Curtain', 'Box', 'Reefer', 'Mega', 'Tautliner', 'Flatbed'];
const CHARACTERISTIC_OPTIONS = ['ADR', 'CMR', 'GDP', 'TIR', 'Lift', 'Express'];
const CONTACT_OPTIONS = ['Current user', 'Operations desk', 'Dispatch team'];
const CLOSED_EXCHANGE_OPTIONS = ['', 'TIMOCOM', 'Private board'];

const SectionTitle = ({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) => (
  <div>
    <p className="text-sm font-black dark:text-white">{title}</p>
    <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
  </div>
);

const FieldLabel = ({ children }: { children: string }) => (
  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 ml-1">{children}</label>
);

const Input = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={cn(
      'w-full h-[54px] px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm',
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
      'w-full h-[54px] px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm appearance-none',
      props.className
    )}
  />
);

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
        locale: flatpickrI18n(lang),
      }}
      onChange={(_, dateStr) => onChange(dateStr)}
      render={(_, ref) => (
        <input
          ref={ref}
          value={value}
          onChange={() => undefined}
          placeholder={placeholder}
          className="w-full h-[54px] px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm"
        />
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
        <input
          ref={ref}
          value={value}
          onChange={() => undefined}
          placeholder={placeholder}
          className="w-full h-[54px] px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-white outline-none focus:ring-2 focus:ring-primary text-sm"
        />
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
      'rounded-2xl border px-4 py-3 text-left transition-all',
      active
        ? 'border-primary bg-primary/5 shadow-sm'
        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-primary/40'
    )}
  >
    <p className="text-sm font-bold dark:text-white">{title}</p>
    <p className="text-xs text-slate-500 mt-1">{description}</p>
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

export const PostLoadModal = ({ isOpen, onClose, lang, editLoadId = null, onSaved }: PostLoadModalProps) => {
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
  const [step, setStep] = useState<StepId>('route');
  const [draft, setDraft] = useState<LoadDraft>(INITIAL_DRAFT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const citySeed = useMemo(
    () =>
      Array.from(
        new Set(
          MOCK_LOADS.flatMap((load) => [load.pickup, load.delivery]).concat([
            'Sarajevo, BA',
            'Banja Luka, BA',
            'Belgrade, RS',
            'Zagreb, HR',
            'Ljubljana, SI',
            'Vienna, AT',
            'Munich, DE',
            'Berlin, DE',
            'Milan, IT',
            'Paris, FR',
            'Amsterdam, NL',
            'London, GB',
            'Madrid, ES',
          ])
        )
      ),
    []
  );
  const {
    startSuggestions,
    endSuggestions,
    setStartLocation,
    setEndLocation,
  } = useCitySuggestions({ seedCities: citySeed });

  useEffect(() => {
    if (!isOpen) {
      setStep('route');
      setDraft(INITIAL_DRAFT);
      setSubmitError('');
    }
  }, [isOpen]);

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
      const terms = String(record.payment_terms || 'negotiable');
      setDraft({ ...INITIAL_DRAFT,
        transportType: (record.transport_type as TransportType) || 'road',
        pickupPlaceType: String(pickup.place_type || INITIAL_DRAFT.pickupPlaceType), pickupCity: String(pickup.city || ''), pickupCountry: String(pickup.country_code || 'BA'), pickupAddress: String(pickup.address || ''), pickupDate: pickupStart.date, pickupDateTo: pickupEnd.date, pickupTimeFrom: pickupStart.time, pickupTimeTo: pickupEnd.time,
        deliveryPlaceType: String(delivery.place_type || INITIAL_DRAFT.deliveryPlaceType), deliveryCity: String(delivery.city || ''), deliveryCountry: String(delivery.country_code || 'BA'), deliveryAddress: String(delivery.address || ''), deliveryDate: deliveryStart.date, deliveryDateTo: deliveryEnd.date, deliveryTimeFrom: deliveryStart.time, deliveryTimeTo: deliveryEnd.time,
        cargoTitle: String(record.title || ''), cargoType: String(record.cargo_type || 'FTL'), goodsType: String(record.goods_type || 'General'), weightKg: String(record.weight_kg || ''), pallets: String(record.pallets || ''), lengthM: String(record.length_m || ''), volumeM3: String(record.volume_m3 || ''), declaredValue: String(record.declared_value || ''), budget: String(record.budget || ''), freightCurrency: String(record.currency || 'EUR'), paymentDueDays: String(record.payment_due_days || ''), paymentTerms: terms === 'in_advance' ? 'In Advance' : terms === 'on_delivery' ? 'On Delivery' : 'Negotiable',
        requiresAdr: Boolean(record.requires_adr), requiresTailLift: Boolean(record.requires_tail_lift), mustBeTrackable: Boolean(record.must_be_trackable), urgent: Boolean(record.is_urgent), bodyTypes: Array.isArray(record.body_types) ? record.body_types.map(String) : [], notes: String(record.notes || ''), internalComments: String(record.internal_comments || ''), externalComments: String(record.external_comments || ''), contactName: String(contact.name || ''), contactPhone: String(contact.phone || ''), contactMobile: String(contact.mobile || ''), contactEmail: String(contact.email || ''), contactFax: String(contact.fax || ''),
      });
    }).catch((error) => setSubmitError(error instanceof Error ? error.message : 'The load could not be loaded.')).finally(() => setIsLoadingExisting(false));
  }, [editLoadId, isOpen]);

  useEffect(() => {
    setStartLocation(draft.pickupCity);
  }, [draft.pickupCity, setStartLocation]);

  useEffect(() => {
    setEndLocation(draft.deliveryCity);
  }, [draft.deliveryCity, setEndLocation]);

  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const stepCompletion = useMemo<Record<StepId, boolean>>(
    () => ({
      route: Boolean(
        draft.pickupCity &&
          draft.pickupDate &&
          draft.deliveryCity &&
          draft.deliveryDate
      ),
      cargo: Boolean(draft.cargoTitle && draft.weightKg && draft.lengthM),
      terms: Boolean(
        draft.vehicleType &&
          draft.contactName &&
          (draft.contactPhone || draft.contactMobile || draft.contactEmail)
      ),
      review: true,
    }),
    [draft]
  );

  const canProceed = stepCompletion[step];

  const maxReachableStepIndex = useMemo(() => {
    let reachableIndex = 0;

    for (let index = 0; index < STEPS.length - 1; index += 1) {
      const currentStepId = STEPS[index].id;
      if (!stepCompletion[currentStepId]) break;
      reachableIndex = index + 1;
    }

    return reachableIndex;
  }, [stepCompletion]);

  const setField = <K extends keyof LoadDraft>(key: K, value: LoadDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const toggleBodyType = (value: string) => {
    setDraft((prev) => ({
      ...prev,
      bodyTypes: prev.bodyTypes.includes(value)
        ? prev.bodyTypes.filter((item) => item !== value)
        : [...prev.bodyTypes, value],
    }));
  };

  const goNext = () => {
    if (!canProceed) return;
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next.id);
  };

  const goBack = () => {
    const previous = STEPS[stepIndex - 1];
    if (previous) setStep(previous.id);
  };

  const canNavigateToStep = (targetIndex: number) =>
    targetIndex <= stepIndex || targetIndex <= maxReachableStepIndex;

  const submit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        title: draft.cargoTitle,
        transport_type: draft.transportType,
        cargo_type: draft.cargoType,
        goods_type: draft.goodsType,
        weight_kg: Number(draft.weightKg),
        length_m: draft.lengthM ? Number(draft.lengthM) : null,
        volume_m3: draft.volumeM3 ? Number(draft.volumeM3) : null,
        pallets: draft.pallets ? Number(draft.pallets) : null,
        declared_value: draft.declaredValue ? Number(draft.declaredValue) : null,
        budget: draft.budget ? Number(draft.budget) : null,
        currency: draft.freightCurrency,
        payment_terms: draft.paymentTerms.toLowerCase().replaceAll(' ', '_'),
        payment_due_days: draft.paymentDueDays ? Number(draft.paymentDueDays) : null,
        requires_adr: draft.requiresAdr,
        requires_tail_lift: draft.requiresTailLift,
        must_be_trackable: draft.mustBeTrackable,
        is_urgent: draft.urgent,
        body_types: draft.bodyTypes,
        contact: { name: draft.contactName, phone: draft.contactPhone, mobile: draft.contactMobile, email: draft.contactEmail, fax: draft.contactFax },
        notes: draft.notes || draft.additionalInfo || null,
        internal_comments: draft.internalComments || null,
        external_comments: draft.externalComments || null,
        stops: [
          { type: 'pickup', position: 1, place_type: draft.pickupPlaceType, city: draft.pickupCity, country_code: draft.pickupCountry, address: draft.pickupAddress || null, window_starts_at: toApiDateTime(draft.pickupDate, draft.pickupTimeFrom), window_ends_at: toApiDateTime(draft.pickupDateTo || draft.pickupDate, draft.pickupTimeTo || draft.pickupTimeFrom) },
          { type: 'delivery', position: 2, place_type: draft.deliveryPlaceType, city: draft.deliveryCity, country_code: draft.deliveryCountry, address: draft.deliveryAddress || null, window_starts_at: toApiDateTime(draft.deliveryDate, draft.deliveryTimeFrom), window_ends_at: toApiDateTime(draft.deliveryDateTo || draft.deliveryDate, draft.deliveryTimeTo || draft.deliveryTimeFrom) },
        ],
      };
      if (editLoadId) await api.loads.update(editLoadId, payload);
      else await api.loads.create({ ...payload, status: 'available', published_at: new Date().toISOString() });
      onSaved?.();
      onClose();
    } catch (error) {
      setSubmitError(error instanceof ApiError ? error.message : u('postLoadModal.apiError', 'The load could not be published.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;
  if (isLoadingExisting) return <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70"><div className="rounded-2xl bg-white px-6 py-5 font-bold text-slate-700 shadow-2xl dark:bg-slate-900 dark:text-white">Loading load...</div></div>;

  return (
    <div className="fixed inset-0 z-[200] flex items-stretch justify-center overflow-hidden bg-slate-950/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
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
                {step === 'terms' && <UserRound className="w-4 h-4 text-primary" />}
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
                <span>{draft.temperature || u('postLoadModal.ambient', 'Ambient')}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 h-11 w-11 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
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
                {step === 'terms' && <UserRound className="w-4 h-4 text-primary" />}
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
                <span>{draft.temperature || u('postLoadModal.ambient', 'Ambient')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid flex-1 min-h-0 xl:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="hidden xl:block border-r border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-5 overflow-y-auto">
            <div className="space-y-3">
              {STEPS.map((item, index) => {
                const Icon = item.icon;
                const isActive = item.id === step;
                const isDone = index < stepIndex;
                const isClickable = canNavigateToStep(index);
                const title =
                  item.id === 'route'
                    ? u('postLoadModal.step.route', 'Route & Timing')
                    : item.id === 'cargo'
                      ? u('postLoadModal.step.cargo', 'Cargo Details')
                      : item.id === 'terms'
                        ? u('postLoadModal.step.terms', 'Terms & Contact')
                        : u('postLoadModal.step.review', 'Review');
                const subtitle =
                  item.id === 'route'
                    ? u('postLoadModal.step.routeDesc', 'Where and when the load moves')
                    : item.id === 'cargo'
                      ? u('postLoadModal.step.cargoDesc', 'What is being transported')
                      : item.id === 'terms'
                        ? u('postLoadModal.step.termsDesc', 'Budget, equipment and contact')
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
                      'w-full rounded-2xl border p-4 text-left transition-all',
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
                      isDone && !isActive && 'border-emerald-500/30 bg-emerald-500/5',
                      isClickable
                        ? 'cursor-pointer hover:border-primary/30'
                        : 'cursor-not-allowed opacity-60'
                    )}
                  >
                    <div className="flex items-start gap-3">
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
                      <div>
                        <p className="text-sm font-bold dark:text-white">{title}</p>
                        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <p className="text-xs font-black uppercase tracking-wider text-primary">
                {u('postLoadModal.snapshot', 'Driver Snapshot')}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">
                {u(
                  'postLoadModal.snapshotDesc',
                  'Drivers need route clarity, load specs, pickup timing, payout and any handling constraints before they commit.'
                )}
              </p>
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 md:p-6">
              {step === 'route' && (
                <div className="space-y-6 sm:space-y-8">
                  <SectionTitle
                    title={u('postLoadModal.routeTitle', 'Route & timing')}
                    subtitle={u(
                      'postLoadModal.routeSubtitle',
                      'Define exact pickup and delivery details so drivers can evaluate whether the route fits their lane.'
                    )}
                  />

                  <fieldset>
                    <legend className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                      <Route className="h-4 w-4" />
                      {u('postLoadModal.transportType', 'Transport type')}
                    </legend>
                    <p className="mt-1 text-sm text-slate-500">
                        {u('postLoadModal.transportTypeDesc', 'Choose how this load will move between pickup and delivery.')}
                    </p>
                    <div className="mt-4 grid sm:grid-cols-3 gap-3">
                      {transportOptions.map((option) => {
                        const Icon = option.icon;

                        return (
                          <label
                            key={option.id}
                            className="relative flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 pr-11 transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60"
                          >
                            <input
                              type="radio"
                              name="transportType"
                              value={option.id}
                              checked={draft.transportType === option.id}
                              onChange={() => setField('transportType', option.id)}
                              className="absolute right-4 top-4 h-4 w-4 accent-primary"
                            />
                            <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', option.iconSurface)}>
                              <Icon className={cn('h-5 w-5', option.iconTone)} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-900 dark:text-white">{option.label}</p>
                              <p className="mt-0.5 text-xs text-slate-500">{option.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
                    <div className="space-y-4 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 md:p-5">
                      <div className="flex items-center gap-2 text-primary">
                        <MapPin className="w-4 h-4" />
                        <p className="text-xs font-black uppercase tracking-wider">
                          {u('postLoadModal.pickupBlock', 'Pickup')}
                        </p>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
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
                          <Select value={draft.pickupPlaceType} onChange={(e) => setField('pickupPlaceType', e.target.value)}>
                            <option value="Loading place">{u('postLoadModal.loadingPlace', 'Loading place')}</option>
                            <option value="Warehouse">{u('postLoadModal.warehouse', 'Warehouse')}</option>
                            <option value="Terminal">{u('postLoadModal.terminal', 'Terminal')}</option>
                          </Select>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-[120px_minmax(0,1fr)] gap-4">
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.pickupCountryShort', 'Country')}</FieldLabel>
                          <Select value={draft.pickupCountry} onChange={(e) => setField('pickupCountry', e.target.value)}>
                            {COUNTRY_OPTIONS.map((country) => (
                              <option key={country} value={country}>
                                {country}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.pickupCity', 'Post code, place')}</FieldLabel>
                          <Input
                            list="post-load-pickup-cities"
                            value={draft.pickupCity}
                            onChange={(e) => setField('pickupCity', e.target.value)}
                            placeholder={u('postLoadModal.cityCountry', 'Start typing city or postcode')}
                          />
                          <datalist id="post-load-pickup-cities">
                            {startSuggestions.map((city) => (
                              <option key={city} value={city} />
                            ))}
                          </datalist>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.pickupAddress', 'Pickup address')}</FieldLabel>
                        <Input
                          value={draft.pickupAddress}
                          onChange={(e) => setField('pickupAddress', e.target.value)}
                          placeholder={u('postLoadModal.pickupAddressPlaceholder', 'Warehouse, street, reference point')}
                        />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex h-full flex-col justify-between space-y-1.5">
                            <FieldLabel>{u('postLoadModal.pickupDate', 'Date from')}</FieldLabel>
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
                      <div className="flex items-center gap-2 text-primary">
                        <Truck className="w-4 h-4" />
                        <p className="text-xs font-black uppercase tracking-wider">
                          {u('postLoadModal.deliveryBlock', 'Delivery')}
                        </p>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
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
                          <Select value={draft.deliveryPlaceType} onChange={(e) => setField('deliveryPlaceType', e.target.value)}>
                            <option value="Unloading place">{u('postLoadModal.unloadingPlace', 'Unloading place')}</option>
                            <option value="Warehouse">{u('postLoadModal.warehouse', 'Warehouse')}</option>
                            <option value="Terminal">{u('postLoadModal.terminal', 'Terminal')}</option>
                          </Select>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-[120px_minmax(0,1fr)] gap-4">
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.deliveryCountryShort', 'Country')}</FieldLabel>
                          <Select value={draft.deliveryCountry} onChange={(e) => setField('deliveryCountry', e.target.value)}>
                            {COUNTRY_OPTIONS.map((country) => (
                              <option key={country} value={country}>
                                {country}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.deliveryCity', 'Post code, place')}</FieldLabel>
                          <Input
                            list="post-load-delivery-cities"
                            value={draft.deliveryCity}
                            onChange={(e) => setField('deliveryCity', e.target.value)}
                            placeholder={u('postLoadModal.cityCountry', 'Start typing city or postcode')}
                          />
                          <datalist id="post-load-delivery-cities">
                            {endSuggestions.map((city) => (
                              <option key={city} value={city} />
                            ))}
                          </datalist>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.deliveryAddress', 'Delivery address')}</FieldLabel>
                        <Input
                          value={draft.deliveryAddress}
                          onChange={(e) => setField('deliveryAddress', e.target.value)}
                          placeholder={u('postLoadModal.deliveryAddressPlaceholder', 'Receiver location, dock or terminal')}
                        />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex h-full flex-col justify-between space-y-1.5">
                            <FieldLabel>{u('postLoadModal.deliveryDate', 'Date from')}</FieldLabel>
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
                </div>
              )}

              {step === 'cargo' && (
                <div className="space-y-6 sm:space-y-8">
                  <SectionTitle
                    title={u('postLoadModal.cargoTitle', 'Cargo details')}
                    subtitle={u(
                      'postLoadModal.cargoSubtitle',
                      'Describe the shipment precisely so the driver knows what vehicle, handling and space are required.'
                    )}
                  />

                  <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
                    <div className="space-y-4 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 md:p-5">
                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.cargoName', 'Type of goods')}</FieldLabel>
                        <Input
                          value={draft.cargoTitle}
                          onChange={(e) => setField('cargoTitle', e.target.value)}
                          placeholder={u('postLoadModal.cargoNamePlaceholder', 'Electronics pallets / FMCG / temperature goods')}
                        />
                      </div>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.length', 'Length (m)')}</FieldLabel>
                          <Input
                            type="number"
                            step="0.1"
                            value={draft.lengthM}
                            onChange={(e) => setField('lengthM', e.target.value)}
                            placeholder="13.6"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.weight', 'Weight (t)')}</FieldLabel>
                          <Input
                            type="number"
                            step="0.1"
                            value={draft.weightKg}
                            onChange={(e) => setField('weightKg', e.target.value)}
                            placeholder="24.0"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.cargoModel', 'Shipment type')}</FieldLabel>
                          <Select
                            value={draft.cargoType}
                            onChange={(e) => setField('cargoType', e.target.value)}
                          >
                            <option value="FTL">FTL</option>
                            <option value="LTL">LTL</option>
                            <option value="Express">{u('postLoadModal.express', 'Express')}</option>
                            <option value="Dedicated">{u('postLoadModal.dedicated', 'Dedicated')}</option>
                          </Select>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.additionalInfo', 'Additional information')}</FieldLabel>
                          <Select value={draft.additionalInfo} onChange={(e) => setField('additionalInfo', e.target.value)}>
                            <option value="">{u('postLoadModal.pleaseSelect', 'Please select')}</option>
                            <option value="Stackable">{u('postLoadModal.stackable', 'Stackable')}</option>
                            <option value="Top load only">{u('postLoadModal.topLoadOnly', 'Top load only')}</option>
                            <option value="Do not double stack">{u('postLoadModal.noDoubleStack', 'Do not double stack')}</option>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.loadingEquipmentExchange', 'Loading equipment exchange')}</FieldLabel>
                          <div className="flex h-[54px] items-center gap-5 rounded-xl border border-slate-200 bg-slate-50 px-4 dark:border-slate-800 dark:bg-slate-950">
                            {(['No', 'Yes', 'Not specified'] as const).map((option) => (
                              <label key={option} className="flex items-center gap-2 text-sm dark:text-white">
                                <input
                                  type="radio"
                                  name="loadingEquipmentExchange"
                                  checked={draft.loadingEquipmentExchange === option}
                                  onChange={() => setField('loadingEquipmentExchange', option)}
                                />
                                <span>{u(`postLoadModal.loadingEquipment.${option}`, option)}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 md:p-5">
                      <div className="grid sm:grid-cols-[minmax(0,1fr)_120px_120px] gap-4">
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.payment', 'Freight charge')}</FieldLabel>
                          <Input
                            value={draft.budget}
                            onChange={(e) => setField('budget', e.target.value)}
                            placeholder="1450"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.currency', 'Currency')}</FieldLabel>
                          <Select value={draft.freightCurrency} onChange={(e) => setField('freightCurrency', e.target.value)}>
                            <option value="EUR">EUR</option>
                            <option value="BAM">BAM</option>
                            <option value="USD">USD</option>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.paymentDueDays', 'Payment due')}</FieldLabel>
                          <Input
                            type="number"
                            value={draft.paymentDueDays}
                            onChange={(e) => setField('paymentDueDays', e.target.value)}
                            placeholder="30"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950">
                        <div>
                          <p className="text-sm font-bold dark:text-white">
                            {u('postLoadModal.receivePriceProposals', 'Receive price proposals')}
                          </p>
                          <p className="text-xs text-slate-500">
                            {u('postLoadModal.receivePriceProposalsDesc', 'Allow carriers to send alternative prices')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setField('receivePriceProposals', !draft.receivePriceProposals)}
                          className={cn(
                            'relative h-8 w-14 rounded-full transition-colors',
                            draft.receivePriceProposals ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-1 h-6 w-6 rounded-full bg-white transition-all',
                              draft.receivePriceProposals ? 'left-7' : 'left-1'
                            )}
                          />
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.notes', 'Handling notes')}</FieldLabel>
                        <Textarea
                          value={draft.notes}
                          onChange={(e) => setField('notes', e.target.value)}
                          placeholder={u(
                            'postLoadModal.notesPlaceholder',
                            'Packaging details, loading constraints, dock rules, documents, return pallets, special care...'
                          )}
                          className="h-32"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 'terms' && (
                <div className="space-y-6 sm:space-y-8">
                  <SectionTitle
                    title={u('postLoadModal.termsTitle', 'Terms, equipment and contact')}
                    subtitle={u(
                      'postLoadModal.termsSubtitle',
                      'Clarify payout, vehicle constraints and who the driver should coordinate with.'
                    )}
                  />

                  <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
                    <div className="space-y-5 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 md:p-5">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.vehicleType', 'Required vehicle')}</FieldLabel>
                          <Select value={draft.vehicleType} onChange={(e) => setField('vehicleType', e.target.value)}>
                            {VEHICLE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {u(`postLoadModal.vehicle.${option}`, option)}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.bodyTypes', 'Body types')}</FieldLabel>
                          <div className="min-h-[54px] rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
                            <div className="flex flex-wrap gap-2">
                              {BODY_TYPE_OPTIONS.map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => toggleBodyType(option)}
                                  className={cn(
                                    'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
                                    draft.bodyTypes.includes(option)
                                      ? 'border-primary bg-primary text-white'
                                      : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                                  )}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.characteristics', 'Characteristics & certificates')}</FieldLabel>
                          <Select value={draft.characteristics} onChange={(e) => setField('characteristics', e.target.value)}>
                            <option value="">{u('postLoadModal.pleaseSelect', 'Please select')}</option>
                            {CHARACTERISTIC_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.temperature', 'Temperature / special range')}</FieldLabel>
                          <Input
                            value={draft.temperature}
                            onChange={(e) => setField('temperature', e.target.value)}
                            placeholder={u('postLoadModal.temperaturePlaceholder', '2°C to 8°C / Ambient')}
                          />
                        </div>
                      </div>

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

                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.externalComments', 'External comments')}</FieldLabel>
                        <Input
                          value={draft.externalComments}
                          onChange={(e) => setField('externalComments', e.target.value)}
                          placeholder={u('postLoadModal.externalCommentsPlaceholder', 'Visible to carriers reviewing the offer')}
                        />
                      </div>
                    </div>

                    <div className="space-y-5 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 md:p-5">
                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.contactName', 'Contact in your company')}</FieldLabel>
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
                          <FieldLabel>{u('postLoadModal.contactEmail', 'E-mail address')}</FieldLabel>
                          <Input
                            value={draft.contactEmail}
                            onChange={(e) => setField('contactEmail', e.target.value)}
                            placeholder="john@company.com"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.contactPhone', 'Phone number')}</FieldLabel>
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
                  </div>
                </div>
              )}

              {step === 'review' && (
                <div className="space-y-6 sm:space-y-8">
                  <SectionTitle
                    title={u('postLoadModal.reviewTitle', 'Review before posting')}
                    subtitle={u(
                      'postLoadModal.reviewSubtitle',
                      'This is the summary drivers will mentally evaluate in a few seconds before deciding to accept or skip.'
                    )}
                  />

                  <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-5">
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-4 md:p-5">
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
                      <SummaryRow label={u('postLoadModal.specsSummary', 'Specs')} value={`${draft.lengthM || '—'} m · ${draft.weightKg || '—'} t · ${draft.additionalInfo || u('postLoadModal.none', 'None')}`} />
                      <SummaryRow label={u('postLoadModal.vehicleSummary', 'Vehicle')} value={`${draft.vehicleType} · ${draft.bodyTypes.join(', ') || u('postLoadModal.none', 'None')}`} />
                      <SummaryRow label={u('postLoadModal.paymentSummary', 'Payout')} value={`${draft.budget || '—'} ${draft.freightCurrency} · ${draft.paymentDueDays || '—'} ${u('postLoadModal.days', 'days')}`} />
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
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 md:p-6 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
              {submitError && <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">{submitError}</div>}
              <div className="grid w-full gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <Button variant="outline" className="w-full min-h-[56px] sm:min-h-[60px]">
                  {u('postLoadModal.saveTemplate', 'Save as template')}
                </Button>
                <Button variant="outline" className="w-full min-h-[56px] sm:min-h-[60px]" onClick={step === 'route' ? onClose : goBack}>
                  {step === 'route' ? u('common.cancel', 'Cancel') : u('common.back', 'Back')}
                </Button>
                {step === 'review' ? (
                  <Button className="w-full min-h-[56px] sm:min-h-[60px]" onClick={submit} disabled={isSubmitting}>
                    {isSubmitting ? u('postLoadModal.publishing', 'Saving...') : editLoadId ? u('common.save', 'Save changes') : u('common.postLoad', 'Publish')}
                  </Button>
                ) : (
                  <Button className="w-full min-h-[56px] sm:min-h-[60px]" onClick={goNext} disabled={!canProceed}>
                    {u('common.continue', 'Continue')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
