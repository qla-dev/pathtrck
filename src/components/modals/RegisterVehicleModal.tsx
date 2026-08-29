import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Truck, Plane, Ship, X } from 'lucide-react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { confirmAction, showError, showSuccess } from '../../lib/swal';
import { api, ApiError } from '../../services/api';
import { Button } from '../ui/Button';

type TransportType = 'truck' | 'aircraft' | 'ship';

type AddVehicleDraft = {
  transportType: TransportType;
  category: string;
  bodyType: string;
  make: string;
  model: string;
  customModel: string;
  capacity: string;
  volume: string;
  configuration: string;
  fuelType: string;
  systemName: string;
  plate: string;
  status: 'Active' | 'Maintenance' | 'Idle';
  trailer: string;
  trailerSystemName: string;
  trailerPlate: string;
  trailerBodyType: string;
  tailLift: string;
  nextService: string;
};

const FLEET_REGISTRY = {
  truck: {
    label: 'Truck',
    icon: Truck,
    categories: ['Light trucks (up to 3.5t)', 'Medium trucks (3.5-12t)', 'Heavy trucks (12t+)', 'Special trucks'],
    bodyTypes: ['Box truck', 'Curtain sider', 'Refrigerated truck', 'Tanker', 'Flatbed', 'Container truck', 'Dump truck', 'Car carrier'],
    makes: {
      'Mercedes-Benz': ['Actros'],
      Volvo: ['FH', 'FH16'],
      Scania: ['R', 'S'],
      MAN: ['TGX', 'TGS'],
      DAF: ['XF', 'CF'],
      Iveco: ['S-Way'],
    },
    specs: {
      capacity: '3 - 40 t',
      volume: '20 - 100 m3',
      configurations: ['4x2', '6x2', '6x4'],
      fuelTypes: ['Diesel', 'Electric'],
    },
  },
  aircraft: {
    label: 'Cargo aircraft',
    icon: Plane,
    categories: ['Narrow-body cargo', 'Wide-body cargo', 'Freighter (dedicated)', 'Passenger to Freighter (P2F)'],
    bodyTypes: ['ULD cargo deck', 'Main deck freighter', 'Temperature-controlled hold', 'Oversize cargo hold'],
    makes: {
      Boeing: ['747-8F', '777F', '767F'],
      Airbus: ['A330-200F'],
      Antonov: ['AN-124', 'AN-225'],
    },
    specs: {
      capacity: '20 - 150 t',
      volume: '100 - 800 m3',
      configurations: ['3,000 - 8,000 km', '800 - 900 km/h'],
      fuelTypes: ['Jet Fuel', 'Hybrid'],
    },
  },
  ship: {
    label: 'Cargo ship',
    icon: Ship,
    categories: ['Container ship', 'Bulk carrier', 'Tanker (oil, LNG)', 'Ro-Ro (vehicles)', 'General cargo ship'],
    bodyTypes: ['Container deck', 'Bulk hold', 'Liquid tank', 'Ro-Ro ramp', 'Mixed cargo deck'],
    makes: {
      Hyundai: ['Container class'],
      Maersk: ['Ro-Ro class'],
      Damen: ['General cargo class'],
      Samsung: ['Tanker class'],
    },
    specs: {
      capacity: 'TEU / tonnage',
      volume: '100 - 400 m length',
      configurations: ['15 - 25 knots', 'Ocean-going', 'Short sea'],
      fuelTypes: ['Marine Diesel', 'LNG', 'Hybrid'],
    },
  },
} as const;

const buildDraft = (transportType: TransportType): AddVehicleDraft => {
  const registry = FLEET_REGISTRY[transportType];
  const make = Object.keys(registry.makes)[0];
  const model = registry.makes[make as keyof typeof registry.makes][0];
  return {
    transportType,
    category: registry.categories[0],
    bodyType: registry.bodyTypes[0],
    make,
    model,
    customModel: '',
    capacity: registry.specs.capacity,
    volume: registry.specs.volume,
    configuration: registry.specs.configurations[0],
    fuelType: registry.specs.fuelTypes[0],
    systemName: '',
    plate: '',
    status: 'Active',
    trailer: transportType === 'truck' ? 'No' : 'N/A',
    trailerSystemName: '',
    trailerPlate: '',
    trailerBodyType: 'Box trailer',
    tailLift: transportType === 'truck' ? 'No' : 'N/A',
    nextService: '',
  };
};

const buildDraftFromVehicle = (vehicle: Record<string, unknown>): AddVehicleDraft => {
  const transportType: TransportType = vehicle.transport_type === 'air'
    ? 'aircraft'
    : vehicle.transport_type === 'sea'
      ? 'ship'
      : 'truck';
  const base = buildDraft(transportType);
  const registry = FLEET_REGISTRY[transportType];
  const features = vehicle.features && typeof vehicle.features === 'object'
    ? vehicle.features as Record<string, unknown>
    : {};
  const make = String(vehicle.make || base.make);
  const rawModel = String(vehicle.model || base.model);
  const modelWithoutMake = rawModel.toLowerCase().startsWith(`${make.toLowerCase()} `)
    ? rawModel.slice(make.length + 1)
    : rawModel;
  const knownModels = (registry.makes as Record<string, readonly string[]>)[make] || [];
  const model = knownModels.includes(modelWithoutMake) ? modelWithoutMake : 'Other';
  const trailerDetails = String(features.trailer || base.trailer).split(/\s*•\s*/);
  const trailer = trailerDetails[0] === 'Yes (2)'
    ? 'Yes (2)'
    : trailerDetails[0] === 'Yes (1)'
      ? 'Yes (1)'
      : base.trailer;
  const status = String(vehicle.status || 'active').toLowerCase();

  return {
    ...base,
    category: String(vehicle.vehicle_type || base.category),
    bodyType: String(features.body_type || base.bodyType),
    make,
    model,
    customModel: model === 'Other' ? rawModel : '',
    capacity: vehicle.capacity_kg ? `${Number(vehicle.capacity_kg) / 1000} t` : base.capacity,
    volume: vehicle.capacity_m3 ? `${vehicle.capacity_m3} m3` : base.volume,
    configuration: String(features.configuration || base.configuration),
    fuelType: String(features.fuel_type || base.fuelType),
    systemName: String(features.system_name || vehicle.registration_number || ''),
    plate: String(vehicle.registration_number || ''),
    status: status === 'maintenance' ? 'Maintenance' : status === 'idle' ? 'Idle' : 'Active',
    trailer,
    trailerSystemName: String(features.trailer_system_name || (trailer.startsWith('Yes') ? 'Trailer' : '')),
    trailerBodyType: trailerDetails[1] || base.trailerBodyType,
    trailerPlate: trailerDetails[2] || '',
    tailLift: features.tail_lift ? 'Yes' : 'No',
    nextService: String(features.next_service || ''),
  };
};

type RegisterVehicleModalProps = {
  open: boolean;
  lang: Language;
  onClose: () => void;
  onCreated: (vehicle: Record<string, unknown>) => void;
  ownerUserId?: number;
  assignedDriverUserId?: number;
  companyId?: number;
  initialVehicle?: Record<string, unknown> | null;
};

export const RegisterVehicleModal = ({ open, lang, onClose, onCreated, ownerUserId, assignedDriverUserId, companyId, initialVehicle }: RegisterVehicleModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<AddVehicleDraft>(() => buildDraft('truck'));
  const [trailerStep, setTrailerStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(initialVehicle?.id);

  useEffect(() => {
    if (!open) return undefined;
    setDraft(initialVehicle ? buildDraftFromVehicle(initialVehicle) : buildDraft('truck'));
    setStep(0);
    setTrailerStep(initialVehicle && String((initialVehicle.features as Record<string, unknown> | undefined)?.trailer || '').startsWith('Yes') ? 1 : 0);
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialVehicle]);

  if (!open) return null;

  const registry = FLEET_REGISTRY[draft.transportType];
  const makeOptions = Object.keys(registry.makes);
  const modelOptions = (registry.makes as Record<string, readonly string[]>)[draft.make] || [];

  const setDraftField = <K extends keyof AddVehicleDraft>(key: K, value: AddVehicleDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleTransportTypeChange = (transportType: TransportType) => {
    setDraft(buildDraft(transportType));
    setTrailerStep(0);
  };

  const hasTrailer = draft.transportType === 'truck' && draft.trailer !== 'No';

  const canContinue =
    (step === 0 && Boolean(draft.transportType && draft.category && draft.bodyType)) ||
    (step === 1 && Boolean(draft.make && (draft.model || draft.customModel) && draft.capacity && draft.fuelType)) ||
    (step === 2 &&
      Boolean(draft.systemName && draft.plate) &&
      (draft.transportType !== 'truck' ||
        draft.trailer === 'No' ||
        (trailerStep === 1 && draft.trailerSystemName && draft.trailerPlate && draft.trailerBodyType)));

  const submitVehicle = async () => {
    if (saving) return;
    const displayModel = draft.model === 'Other' ? draft.customModel : `${draft.make} ${draft.model}`.trim();
    const confirmed = await confirmAction({
      title: isEditing ? u('fleet.confirmEditTitle', 'Save vehicle changes?') : u('fleet.confirmAddTitle', 'Add this vehicle?'),
      text: isEditing
        ? `${displayModel || draft.category} (${draft.plate})`
        : `${displayModel || draft.category} (${draft.plate}) ${u('fleet.confirmAddText', 'will be added to your fleet.')}`,
      confirmText: isEditing ? u('fleet.saveChanges', 'Save changes') : u('fleet.addVehicle', 'Add vehicle'),
    });
    if (!confirmed) return;
    const trailerLabel =
      draft.transportType !== 'truck' || draft.trailer === 'No'
        ? draft.transportType === 'truck'
          ? 'No'
          : 'N/A'
        : `${draft.trailer} • ${draft.trailerBodyType} • ${draft.trailerPlate}`;

    setSaving(true);
    try {
      const payload = {
        registration_number: draft.plate,
        transport_type: draft.transportType === 'aircraft' ? 'air' : draft.transportType === 'ship' ? 'sea' : 'road',
        vehicle_type: draft.category, make: draft.make, model: displayModel, status: draft.status.toLowerCase(),
        capacity_kg: Number.parseFloat(draft.capacity.replace(/[^0-9.]/g, '')) * 1000 || null,
        capacity_m3: Number.parseFloat(draft.volume.replace(/[^0-9.]/g, '')) || null,
        features: { system_name: draft.systemName, body_type: draft.bodyType, configuration: draft.configuration, fuel_type: draft.fuelType, trailer: trailerLabel, trailer_system_name: draft.trailerSystemName || null, tail_lift: draft.tailLift === 'Yes', next_service: draft.nextService || null },
        owner_user_id: ownerUserId,
        assigned_driver_user_id: assignedDriverUserId,
        company_id: companyId,
      };
      const response = isEditing
        ? await api.vehicles.update(String(initialVehicle?.id), payload)
        : await api.vehicles.create(payload);
      void showSuccess(
        isEditing ? u('fleet.vehicleUpdatedTitle', 'Vehicle updated') : u('fleet.vehicleAddedTitle', 'Vehicle added'),
        isEditing ? u('fleet.vehicleUpdatedText', 'The vehicle changes have been saved.') : u('fleet.vehicleAddedText', 'The vehicle is now available in your fleet.'),
      );
      onCreated(response.data);
    } catch (error) {
      void showError(
        isEditing ? u('fleet.vehicleUpdateFailedTitle', 'Could not update vehicle') : u('fleet.vehicleAddFailedTitle', 'Could not add vehicle'),
        error instanceof ApiError ? error.message : undefined
      );
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-4xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                  {u('fleet.registryLabel', 'Local transport registry')}
                </p>
                <h2 className="mt-2 text-2xl font-black dark:text-white">
                  {isEditing ? u('fleet.editVehicleTitle', 'Edit vehicle') : u('fleet.registryTitle', 'Register a new vehicle')}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {u('fleet.registrySubtitle', 'Each level is separated into its own registration step for a clean fleet onboarding flow.')}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="grid lg:grid-cols-[250px_minmax(0,1fr)]">
              <aside className="space-y-3 border-r border-slate-100 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
                {[
                  u('fleet.stepRegistry', 'Base transport list'),
                  u('fleet.stepSpecs', 'Brand, model and specifications'),
                  u('fleet.stepNaming', 'System name and operating details'),
                ].map((label, index) => (
                  <div
                    key={label}
                    className={cn(
                      'rounded-2xl border p-4',
                      step === index
                        ? 'border-primary bg-primary/5'
                        : index < step
                          ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10'
                          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                    )}
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      {u('fleet.step', 'Step')} {index + 1}
                    </p>
                    <p className="mt-1 text-sm font-bold dark:text-white">{label}</p>
                  </div>
                ))}
              </aside>

              <div className="space-y-6 p-6">
                {step === 0 && (
                  <div className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {(Object.keys(FLEET_REGISTRY) as TransportType[]).map((type) => {
                        const item = FLEET_REGISTRY[type];
                        const Icon = item.icon;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleTransportTypeChange(type)}
                            className={cn(
                              'cursor-pointer rounded-2xl border p-4 text-left transition-all hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-800/60',
                              draft.transportType === type
                                ? 'border-primary bg-primary/5'
                                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                            )}
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                              <Icon className="h-5 w-5" />
                            </div>
                            <p className="mt-3 text-sm font-bold dark:text-white">{item.label}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.categories.length} {u('fleet.registryCategories', 'registry categories')}</p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          {u('fleet.category', 'Category')}
                        </label>
                        <select
                          value={draft.category}
                          onChange={(e) => setDraftField('category', e.target.value)}
                          className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-3 text-sm transition-colors hover:border-primary/40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
                        >
                          {!(registry.categories as readonly string[]).includes(draft.category) && <option value={draft.category}>{draft.category}</option>}
                          {registry.categories.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          {u('fleet.bodyType', 'Body type')}
                        </label>
                        <select
                          value={draft.bodyType}
                          onChange={(e) => setDraftField('bodyType', e.target.value)}
                          className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-3 text-sm transition-colors hover:border-primary/40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
                        >
                          {!(registry.bodyTypes as readonly string[]).includes(draft.bodyType) && <option value={draft.bodyType}>{draft.bodyType}</option>}
                          {registry.bodyTypes.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          {u('fleet.make', 'Brand / make')}
                        </label>
                        <select
                          value={draft.make}
                          onChange={(e) => {
                            const nextMake = e.target.value;
                            const nextModels = registry.makes[nextMake as keyof typeof registry.makes];
                            setDraft((prev) => ({ ...prev, make: nextMake, model: nextModels[0], customModel: '' }));
                          }}
                          className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-3 text-sm transition-colors hover:border-primary/40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
                        >
                          {!makeOptions.includes(draft.make) && <option value={draft.make}>{draft.make}</option>}
                          {makeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          {u('fleet.model', 'Model')}
                        </label>
                        <select
                          value={draft.model}
                          onChange={(e) => setDraftField('model', e.target.value)}
                          className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-3 text-sm transition-colors hover:border-primary/40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
                        >
                          {modelOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                          <option value="Other">{u('fleet.other', 'Other')}</option>
                        </select>
                      </div>
                    </div>

                    {draft.model === 'Other' && (
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          {u('fleet.customModel', 'Custom model')}
                        </label>
                        <input
                          value={draft.customModel}
                          onChange={(e) => setDraftField('customModel', e.target.value)}
                          placeholder={u('fleet.customModelPlaceholder', 'Enter custom model')}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm transition-colors hover:border-primary/40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
                        />
                      </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          {u('fleet.capacity', 'Capacity')}
                        </label>
                        <input
                          value={draft.capacity}
                          onChange={(e) => setDraftField('capacity', e.target.value)}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm transition-colors hover:border-primary/40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          {u('fleet.volume', 'Volume')}
                        </label>
                        <input
                          value={draft.volume}
                          onChange={(e) => setDraftField('volume', e.target.value)}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          {u('fleet.configuration', 'Configuration')}
                        </label>
                        <select
                          value={draft.configuration}
                          onChange={(e) => setDraftField('configuration', e.target.value)}
                          className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-3 text-sm transition-colors hover:border-primary/40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
                        >
                          {!(registry.specs.configurations as readonly string[]).includes(draft.configuration) && <option value={draft.configuration}>{draft.configuration}</option>}
                          {registry.specs.configurations.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          {u('fleet.fuelType', 'Fuel type')}
                        </label>
                        <select
                          value={draft.fuelType}
                          onChange={(e) => setDraftField('fuelType', e.target.value)}
                          className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-3 text-sm transition-colors hover:border-primary/40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
                        >
                          {!(registry.specs.fuelTypes as readonly string[]).includes(draft.fuelType) && <option value={draft.fuelType}>{draft.fuelType}</option>}
                          {registry.specs.fuelTypes.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          {u('fleet.systemName', 'Vehicle name in system')}
                        </label>
                        <input
                          value={draft.systemName}
                          onChange={(e) => setDraftField('systemName', e.target.value)}
                          placeholder={u('fleet.systemNamePlaceholder', 'Example: Frozen Line 01')}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm transition-colors hover:border-primary/40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          {u('fleet.plate', 'Registration / code')}
                        </label>
                        <input
                          value={draft.plate}
                          onChange={(e) => setDraftField('plate', e.target.value)}
                          placeholder={u('fleet.platePlaceholder', 'BA-123-XY / IMO-001 / AIR-77F')}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm transition-colors hover:border-primary/40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          {u('fleet.status', 'Status')}
                        </label>
                        <select
                          value={draft.status}
                          onChange={(e) => setDraftField('status', e.target.value as AddVehicleDraft['status'])}
                          className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-3 text-sm transition-colors hover:border-primary/40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
                        >
                          <option value="Active">Active</option>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Idle">Idle</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                          {u('fleet.nextService', 'Next service')}
                        </label>
                        <input
                          value={draft.nextService}
                          onChange={(e) => setDraftField('nextService', e.target.value)}
                          placeholder={u('fleet.nextServicePlaceholder', '12 May / Tomorrow / Dock inspection')}
                          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm transition-colors hover:border-primary/40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
                        />
                      </div>
                    </div>

                    {draft.transportType === 'truck' && (
                      <div className="space-y-4">
                        <div>
                          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                            {u('fleet.tailLift', 'Tail lift')}
                          </label>
                          <select
                            value={draft.tailLift}
                            onChange={(e) => setDraftField('tailLift', e.target.value)}
                            className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-3 text-sm transition-colors hover:border-primary/40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </div>

                        <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                                {u('fleet.trailerWizardLabel', 'Trailer registration')}
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                {u('fleet.trailerWizardHelp', 'Use a separate mini stepper to register the trailer together with the truck.')}
                              </p>
                            </div>
                            <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
                              {[u('fleet.step', 'Step') + ' 1', u('fleet.step', 'Step') + ' 2'].map((item, index) => (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => { if (index === 0 || hasTrailer) setTrailerStep(index); }}
                                  className={cn(
                                    'cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-bold transition-all',
                                    trailerStep === index ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  )}
                                >
                                  {item}
                                </button>
                              ))}
                            </div>
                          </div>

                          {trailerStep === 0 && (
                            <div className="space-y-4">
                              <div className="grid gap-3 sm:grid-cols-3">
                                {[
                                  { value: 'No', label: u('fleet.noTrailer', 'No trailer') },
                                  { value: 'Yes (1)', label: u('fleet.oneTrailer', '1 trailer') },
                                  { value: 'Yes (2)', label: u('fleet.twoTrailers', '2 trailers') },
                                ].map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      setDraft((prev) => ({
                                        ...prev,
                                        trailer: option.value,
                                        trailerSystemName: option.value === 'No' ? '' : prev.trailerSystemName,
                                        trailerPlate: option.value === 'No' ? '' : prev.trailerPlate,
                                      }));
                                      setTrailerStep(option.value === 'No' ? 0 : 1);
                                    }}
                                    className={cn(
                                      'cursor-pointer rounded-2xl border bg-white p-4 text-left transition-all hover:border-primary/40 hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/60',
                                      draft.trailer === option.value ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-slate-800'
                                    )}
                                  >
                                    <p className="text-sm font-bold dark:text-white">{option.label}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {option.value === 'No'
                                        ? u('fleet.noTrailerHelp', 'Register only the powered vehicle.')
                                        : u('fleet.trailerNextHelp', 'Continue to trailer details in the next mini step.')}
                                    </p>
                                  </button>
                                ))}
                              </div>

                              {hasTrailer && (
                                <div className="flex justify-end">
                                  <Button type="button" variant="outline" onClick={() => setTrailerStep(1)}>
                                    {u('fleet.continueTrailer', 'Continue trailer setup')}
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}

                          {trailerStep === 1 && hasTrailer && (
                            <div className="space-y-4">
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                                    {u('fleet.trailerSystemName', 'Trailer name in system')}
                                  </label>
                                  <input
                                    value={draft.trailerSystemName}
                                    onChange={(e) => setDraftField('trailerSystemName', e.target.value)}
                                    placeholder={u('fleet.trailerSystemNamePlaceholder', 'Example: Reefer Trailer 01')}
                                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm transition-colors hover:border-primary/40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
                                  />
                                </div>
                                <div>
                                  <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                                    {u('fleet.trailerPlate', 'Trailer registration')}
                                  </label>
                                  <input
                                    value={draft.trailerPlate}
                                    onChange={(e) => setDraftField('trailerPlate', e.target.value)}
                                    placeholder={u('fleet.trailerPlatePlaceholder', 'TR-908-KL')}
                                    className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm transition-colors hover:border-primary/40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                                  {u('fleet.trailerBodyType', 'Trailer body type')}
                                </label>
                                <select
                                  value={draft.trailerBodyType}
                                  onChange={(e) => setDraftField('trailerBodyType', e.target.value)}
                                  className="h-12 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-3 text-sm transition-colors hover:border-primary/40 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:hover:bg-slate-900"
                                >
                                  {['Box trailer', 'Curtain trailer', 'Reefer trailer', 'Flatbed trailer', 'Container chassis'].map((option) => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex items-center justify-between gap-3">
                                <Button type="button" variant="outline" onClick={() => setTrailerStep(0)}>
                                  {u('common.back', 'Back')}
                                </Button>
                                <div className="text-xs text-slate-500">
                                  {draft.trailerSystemName && draft.trailerPlate
                                    ? u('fleet.trailerReady', 'Trailer mini registration is ready.')
                                    : u('fleet.trailerPending', 'Complete trailer details to finish this mini step.')}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-950/40">
              <Button variant="outline" disabled={saving} onClick={step === 0 ? onClose : () => setStep((prev) => prev - 1)}>
                {step === 0 ? u('common.cancel', 'Cancel') : u('common.back', 'Back')}
              </Button>
              <div className="flex items-center gap-3">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  {u('fleet.step', 'Step')} {step + 1}/3
                </div>
                {step === 2 ? (
                  <Button onClick={() => void submitVehicle()} disabled={!canContinue || saving}>
                    {saving
                      ? isEditing ? u('fleet.saving', 'Saving…') : u('fleet.adding', 'Adding…')
                      : isEditing ? u('fleet.saveChanges', 'Save changes') : u('fleet.saveVehicle', 'Save vehicle')}
                  </Button>
                ) : (
                  <Button onClick={() => setStep((prev) => prev + 1)} disabled={!canContinue}>
                    {u('common.continue', 'Continue')}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
