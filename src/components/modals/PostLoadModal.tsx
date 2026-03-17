import { useEffect, useMemo, useState, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { motion } from 'motion/react';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  FileText,
  MapPin,
  Package,
  Plus,
  ShieldCheck,
  ThermometerSnowflake,
  Truck,
  UserRound,
  X,
} from 'lucide-react';
import { Language } from '../../types';
import { trGoodsType, trPaymentTerms, ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';

type PostLoadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
};

type StepId = 'route' | 'cargo' | 'terms' | 'review';

type LoadDraft = {
  pickupCity: string;
  pickupAddress: string;
  pickupDate: string;
  pickupWindow: string;
  deliveryCity: string;
  deliveryAddress: string;
  deliveryDate: string;
  deliveryWindow: string;
  cargoTitle: string;
  cargoType: string;
  goodsType: string;
  weightKg: string;
  pallets: string;
  lengthM: string;
  volumeM3: string;
  declaredValue: string;
  vehicleType: string;
  paymentTerms: 'Negotiable' | 'In Advance' | 'On Delivery';
  budget: string;
  temperature: string;
  requiresAdr: boolean;
  requiresTailLift: boolean;
  urgent: boolean;
  notes: string;
  contactName: string;
  contactPhone: string;
};

const INITIAL_DRAFT: LoadDraft = {
  pickupCity: '',
  pickupAddress: '',
  pickupDate: '',
  pickupWindow: '',
  deliveryCity: '',
  deliveryAddress: '',
  deliveryDate: '',
  deliveryWindow: '',
  cargoTitle: '',
  cargoType: 'FTL',
  goodsType: 'General',
  weightKg: '',
  pallets: '',
  lengthM: '',
  volumeM3: '',
  declaredValue: '',
  vehicleType: 'Box Truck',
  paymentTerms: 'Negotiable',
  budget: '',
  temperature: '',
  requiresAdr: false,
  requiresTailLift: false,
  urgent: false,
  notes: '',
  contactName: '',
  contactPhone: '',
};

const STEPS: Array<{ id: StepId; icon: typeof MapPin }> = [
  { id: 'route', icon: MapPin },
  { id: 'cargo', icon: Package },
  { id: 'terms', icon: ShieldCheck },
  { id: 'review', icon: CheckCircle2 },
];

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

export const PostLoadModal = ({ isOpen, onClose, lang }: PostLoadModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [step, setStep] = useState<StepId>('route');
  const [draft, setDraft] = useState<LoadDraft>(INITIAL_DRAFT);

  useEffect(() => {
    if (!isOpen) {
      setStep('route');
      setDraft(INITIAL_DRAFT);
    }
  }, [isOpen]);

  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const canProceed = useMemo(() => {
    if (step === 'route') {
      return Boolean(
        draft.pickupCity &&
          draft.pickupDate &&
          draft.deliveryCity &&
          draft.deliveryDate
      );
    }

    if (step === 'cargo') {
      return Boolean(draft.cargoTitle && draft.weightKg && draft.goodsType);
    }

    if (step === 'terms') {
      return Boolean(draft.budget && draft.contactName && draft.contactPhone);
    }

    return true;
  }, [draft, step]);

  const setField = <K extends keyof LoadDraft>(key: K, value: LoadDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
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

  const submit = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-stretch justify-center overflow-hidden bg-slate-950/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="flex flex-col bg-white dark:bg-slate-900 shadow-2xl w-full h-[100dvh] overflow-hidden border-0 rounded-none"
      >
        <div className="sticky top-0 z-20 p-4 sm:p-5 md:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 sm:gap-4 bg-white/96 dark:bg-slate-900/96 backdrop-blur-sm">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
              <Plus className="text-primary w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight dark:text-white">
                {u('postLoadModal.title', 'Post New Load')}
              </h3>
              <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-2xl pr-2">
                {u(
                  'postLoadModal.subtitle',
                  'Create a structured freight request drivers can evaluate and accept quickly'
                )}
              </p>
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

        <div className="grid flex-1 min-h-0 xl:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="hidden xl:block border-r border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 p-5 overflow-y-auto">
            <div className="space-y-3">
              {STEPS.map((item, index) => {
                const Icon = item.icon;
                const isActive = item.id === step;
                const isDone = index < stepIndex;
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
                    onClick={() => setStep(item.id)}
                    className={cn(
                      'w-full rounded-2xl border p-4 text-left transition-all',
                      isActive
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary/30',
                      isDone && !isActive && 'border-emerald-500/30 bg-emerald-500/5'
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

                  <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
                    <div className="space-y-4 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 md:p-5">
                      <div className="flex items-center gap-2 text-primary">
                        <MapPin className="w-4 h-4" />
                        <p className="text-xs font-black uppercase tracking-wider">
                          {u('postLoadModal.pickupBlock', 'Pickup')}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.pickupCity', 'Pickup city / country')}</FieldLabel>
                        <Input
                          value={draft.pickupCity}
                          onChange={(e) => setField('pickupCity', e.target.value)}
                          placeholder={u('postLoadModal.cityCountry', 'City, Country')}
                        />
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
                        <div className="flex h-full flex-col justify-between space-y-1.5">
                          <FieldLabel>{u('postLoadModal.pickupDate', 'Pickup date')}</FieldLabel>
                          <Input
                            type="date"
                            value={draft.pickupDate}
                            onChange={(e) => setField('pickupDate', e.target.value)}
                          />
                        </div>
                        <div className="flex h-full flex-col justify-between space-y-1.5">
                          <FieldLabel>{u('postLoadModal.pickupWindow', 'Pickup time window')}</FieldLabel>
                          <Input
                            value={draft.pickupWindow}
                            onChange={(e) => setField('pickupWindow', e.target.value)}
                            placeholder={u('postLoadModal.windowPlaceholder', '08:00 - 12:00')}
                          />
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
                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.deliveryCity', 'Delivery city / country')}</FieldLabel>
                        <Input
                          value={draft.deliveryCity}
                          onChange={(e) => setField('deliveryCity', e.target.value)}
                          placeholder={u('postLoadModal.cityCountry', 'City, Country')}
                        />
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
                        <div className="flex h-full flex-col justify-between space-y-1.5">
                          <FieldLabel>{u('postLoadModal.deliveryDate', 'Delivery deadline')}</FieldLabel>
                          <Input
                            type="date"
                            value={draft.deliveryDate}
                            onChange={(e) => setField('deliveryDate', e.target.value)}
                          />
                        </div>
                        <div className="flex h-full flex-col justify-between space-y-1.5">
                          <FieldLabel>{u('postLoadModal.deliveryWindow', 'Delivery time window')}</FieldLabel>
                          <Input
                            value={draft.deliveryWindow}
                            onChange={(e) => setField('deliveryWindow', e.target.value)}
                            placeholder={u('postLoadModal.windowPlaceholder', '14:00 - 18:00')}
                          />
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
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.cargoName', 'Load title')}</FieldLabel>
                        <Input
                          value={draft.cargoTitle}
                          onChange={(e) => setField('cargoTitle', e.target.value)}
                          placeholder={u('postLoadModal.cargoNamePlaceholder', 'Electronics pallets / FMCG / temperature goods')}
                        />
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
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
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.goodsType', 'Goods profile')}</FieldLabel>
                          <Select
                            value={draft.goodsType}
                            onChange={(e) => setField('goodsType', e.target.value)}
                          >
                            <option value="General">{trGoodsType(lang, 'General')}</option>
                            <option value="Fragile">{trGoodsType(lang, 'Fragile')}</option>
                            <option value="High Value">{trGoodsType(lang, 'High Value')}</option>
                            <option value="Perishable">{trGoodsType(lang, 'Perishable')}</option>
                            <option value="Heavy">{trGoodsType(lang, 'Heavy')}</option>
                            <option value="Flammable">{trGoodsType(lang, 'Flammable')}</option>
                          </Select>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.weight', 'Cargo weight (kg)')}</FieldLabel>
                          <Input
                            type="number"
                            value={draft.weightKg}
                            onChange={(e) => setField('weightKg', e.target.value)}
                            placeholder="12000"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.pallets', 'Pallets / pieces')}</FieldLabel>
                          <Input
                            type="number"
                            value={draft.pallets}
                            onChange={(e) => setField('pallets', e.target.value)}
                            placeholder="12"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.length', 'Length (m)')}</FieldLabel>
                          <Input
                            type="number"
                            step="0.1"
                            value={draft.lengthM}
                            onChange={(e) => setField('lengthM', e.target.value)}
                            placeholder="7.2"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.volume', 'Volume (m3)')}</FieldLabel>
                          <Input
                            type="number"
                            step="0.1"
                            value={draft.volumeM3}
                            onChange={(e) => setField('volumeM3', e.target.value)}
                            placeholder="31"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.value', 'Declared value')}</FieldLabel>
                          <Input
                            value={draft.declaredValue}
                            onChange={(e) => setField('declaredValue', e.target.value)}
                            placeholder="€38,000"
                          />
                        </div>
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
                          className="h-40"
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
                          <Select
                            value={draft.vehicleType}
                            onChange={(e) => setField('vehicleType', e.target.value)}
                          >
                            <option value="Cargo Van">{u('postLoadModal.van', 'Cargo Van')}</option>
                            <option value="Box Truck">{u('postLoadModal.boxTruck', 'Box Truck')}</option>
                            <option value="Curtainsider">{u('postLoadModal.curtainsider', 'Curtainsider')}</option>
                            <option value="Reefer">{u('postLoadModal.reefer', 'Reefer')}</option>
                            <option value="Trailer">{u('postLoadModal.trailer', 'Trailer')}</option>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.payment', 'Offered payout')}</FieldLabel>
                          <Input
                            value={draft.budget}
                            onChange={(e) => setField('budget', e.target.value)}
                            placeholder="€1,450"
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <FieldLabel>{u('postLoadModal.paymentTerms', 'Payment terms')}</FieldLabel>
                          <Select
                            value={draft.paymentTerms}
                            onChange={(e) =>
                              setField('paymentTerms', e.target.value as LoadDraft['paymentTerms'])
                            }
                          >
                            <option value="Negotiable">{trPaymentTerms(lang, 'Negotiable')}</option>
                            <option value="In Advance">{trPaymentTerms(lang, 'In Advance')}</option>
                            <option value="On Delivery">{trPaymentTerms(lang, 'On Delivery')}</option>
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
                    </div>

                    <div className="space-y-5 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 md:p-5">
                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.contactName', 'Contact person')}</FieldLabel>
                        <Input
                          value={draft.contactName}
                          onChange={(e) => setField('contactName', e.target.value)}
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <FieldLabel>{u('postLoadModal.contactPhone', 'Contact phone')}</FieldLabel>
                        <Input
                          value={draft.contactPhone}
                          onChange={(e) => setField('contactPhone', e.target.value)}
                          placeholder="+387 61 123 456"
                        />
                      </div>
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                        <p className="text-xs font-black uppercase tracking-wider text-primary">
                          {u('postLoadModal.driverHint', 'What drivers care about')}
                        </p>
                        <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                          <li>{u('postLoadModal.driverHintRoute', 'Clear route with realistic pickup and delivery windows')}</li>
                          <li>{u('postLoadModal.driverHintSpecs', 'Exact weight, dimensions, handling and vehicle requirements')}</li>
                          <li>{u('postLoadModal.driverHintMoney', 'Visible payout and payment terms before they commit')}</li>
                        </ul>
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
                      <SummaryRow label={u('postLoadModal.pickupSummary', 'Pickup')} value={`${draft.pickupDate || '—'} ${draft.pickupWindow || ''}`.trim()} />
                      <SummaryRow label={u('postLoadModal.deliverySummary', 'Delivery')} value={`${draft.deliveryDate || '—'} ${draft.deliveryWindow || ''}`.trim()} />
                      <SummaryRow label={u('postLoadModal.cargoSummary', 'Cargo')} value={draft.cargoTitle} />
                      <SummaryRow label={u('postLoadModal.specsSummary', 'Specs')} value={`${draft.weightKg || '—'} kg · ${draft.pallets || '—'} pallets · ${trGoodsType(lang, draft.goodsType)}`} />
                      <SummaryRow label={u('postLoadModal.vehicleSummary', 'Vehicle')} value={draft.vehicleType} />
                      <SummaryRow label={u('postLoadModal.paymentSummary', 'Payout')} value={`${draft.budget || '—'} · ${trPaymentTerms(lang, draft.paymentTerms)}`} />
                      <SummaryRow label={u('postLoadModal.contactSummary', 'Contact')} value={`${draft.contactName} · ${draft.contactPhone}`} />
                      <SummaryRow
                        label={u('postLoadModal.flagsSummary', 'Special requirements')}
                        value={[
                          draft.requiresAdr ? u('postLoadModal.adr', 'ADR / certified') : null,
                          draft.requiresTailLift ? u('postLoadModal.tailLift', 'Tail lift') : null,
                          draft.urgent ? u('postLoadModal.urgent', 'Priority load') : null,
                        ].filter(Boolean).join(', ') || u('postLoadModal.none', 'None')}
                      />
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

            <div className="p-4 sm:p-5 md:p-6 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-col justify-between gap-4 sm:gap-5">
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

              <div className="grid w-full sm:grid-cols-2 gap-3">
                <Button variant="outline" className="w-full min-h-[56px] sm:min-h-[60px]" onClick={step === 'route' ? onClose : goBack}>
                  {step === 'route' ? u('common.cancel', 'Cancel') : u('common.back', 'Back')}
                </Button>
                {step === 'review' ? (
                  <Button className="w-full min-h-[56px] sm:min-h-[60px]" onClick={submit}>
                    {u('common.postLoad', 'Post Load')}
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
