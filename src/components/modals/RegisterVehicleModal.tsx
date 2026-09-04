import { Fragment, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpFromLine, BadgeDollarSign, Boxes, Building2, Bus, CalendarClock, Caravan, CarFront, CheckCircle2, CircleEllipsis, CirclePause, ClipboardList, FileText, Fuel, Gauge, KeyRound, Landmark, Layers, Network, PackageOpen, Plane, Ship, Truck, Upload, Wrench, X } from 'lucide-react';
import { Language } from '../../types';
import { trFuelType, trVehicleStatus, ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { confirmAction, showError, showSuccess } from '../../lib/swal';
import { api, ApiError } from '../../services/api';
import { Button } from '../ui/Button';
import { IconSelect } from '../ui/IconSelect';
import { ChoiceCard } from './PostLoadModal/ChoiceCard';
import { FieldLabel } from './PostLoadModal/FieldLabel';
import { Input } from './PostLoadModal/FormFields';

type TransportType = 'truck' | 'van' | 'aircraft' | 'ship';
type VehicleOwnership = 'owned' | 'financed' | 'leasing' | 'rented' | 'other';

// Trucks and vans are both road vehicles, so they share the tail lift, the ATP rule and the whole
// road document set — only trailers stay truck-only.
const isRoadVehicle = (type: TransportType) => type === 'truck' || type === 'van';

type VehicleDocumentType =
  | 'VEHICLE_REGISTRATION'
  | 'TRAILER_REGISTRATION'
  | 'INSURANCE_POLICY'
  | 'COMMUNITY_LICENCE'
  | 'TECHNICAL_INSPECTION'
  | 'ATP_CERTIFICATE'
  | 'ADR_CERTIFICATE'
  | 'OWNERSHIP_CERTIFICATE'
  | 'FINANCING_AGREEMENT'
  | 'LEASING_AGREEMENT'
  | 'RENTAL_AGREEMENT'
  | 'OTHER_OWNERSHIP_DOCUMENT'
  | 'OTHER_PERMIT';

type PendingVehicleDocuments = Partial<Record<VehicleDocumentType, File[]>>;

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
  trailer2SystemName: string;
  trailer2Plate: string;
  trailer2BodyType: string;
  tailLift: string;
  nextService: string;
  ownershipType: VehicleOwnership;
};

const OWNERSHIP_DOCUMENT_TYPES: Record<VehicleOwnership, VehicleDocumentType> = {
  owned: 'OWNERSHIP_CERTIFICATE',
  financed: 'FINANCING_AGREEMENT',
  leasing: 'LEASING_AGREEMENT',
  rented: 'RENTAL_AGREEMENT',
  other: 'OTHER_OWNERSHIP_DOCUMENT',
};

const BRAND_LOGO_SLUGS: Record<string, string> = {
  Volvo: 'volvo',
  Scania: 'scania',
  MAN: 'man',
  DAF: 'daf',
  Iveco: 'iveco',
  Volkswagen: 'volkswagen',
  Ford: 'ford',
  Renault: 'renault',
  Fiat: 'fiat',
  Boeing: 'boeing',
  Airbus: 'airbus',
  Hyundai: 'hyundai',
  Samsung: 'samsung',
};

const BRAND_LOGO_OVERRIDES: Record<string, string> = {
  'Mercedes-Benz': 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Mercedes-Benz_free_logo.svg',
  Maersk: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/A.P.-M%C3%B8ller-M%C3%A6rsk-Logo.svg',
};

const brandLogoUrl = (brand: string): string | undefined => {
  if (BRAND_LOGO_OVERRIDES[brand]) return BRAND_LOGO_OVERRIDES[brand];
  const slug = BRAND_LOGO_SLUGS[brand];
  return slug ? `https://cdn.jsdelivr.net/npm/simple-icons@v16/icons/${slug}.svg` : undefined;
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
  van: {
    label: 'Van',
    icon: Bus,
    categories: ['Car-derived van (up to 1t)', 'Panel van (1 - 2t)', 'Luton / box van (2 - 3.5t)', 'Crew van'],
    bodyTypes: ['Panel van', 'Box van', 'Refrigerated van', 'Curtain-side van', 'Dropside van', 'Tipper van'],
    makes: {
      'Mercedes-Benz': ['Sprinter', 'Vito'],
      Volkswagen: ['Crafter', 'Transporter'],
      Ford: ['Transit', 'Transit Custom'],
      Renault: ['Master', 'Trafic'],
      Fiat: ['Ducato'],
      Iveco: ['Daily'],
    },
    specs: {
      capacity: '0.5 - 3.5 t',
      volume: '3 - 20 m3',
      configurations: ['L1H1', 'L2H2', 'L3H2', 'L4H3'],
      fuelTypes: ['Diesel', 'Petrol', 'Electric'],
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

// The four wizard steps, shaped like PostLoadModal's STEPS so the shared stepper markup below can
// stay identical between the two wizards.
const STEP_ITEMS = [
  { labelKey: 'fleet.stepDetails', label: 'Details', icon: ClipboardList },
  { labelKey: 'fleet.stepDocuments', label: 'Documents', icon: FileText },
] as const;

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
    trailer2SystemName: '',
    trailer2Plate: '',
    trailer2BodyType: 'Box trailer',
    tailLift: isRoadVehicle(transportType) ? 'No' : 'N/A',
    nextService: '',
    ownershipType: 'owned',
  };
};

const buildDraftFromVehicle = (vehicle: Record<string, unknown>): AddVehicleDraft => {
  const features = vehicle.features && typeof vehicle.features === 'object'
    ? vehicle.features as Record<string, unknown>
    : {};
  // Vans and trucks both save as transport_type 'road', so the exact class comes from features.
  const transportType: TransportType = vehicle.transport_type === 'air'
    ? 'aircraft'
    : vehicle.transport_type === 'sea'
      ? 'ship'
      : features.vehicle_class === 'van'
        ? 'van'
        : 'truck';
  const base = buildDraft(transportType);
  const registry = FLEET_REGISTRY[transportType];
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
    trailer2SystemName: String(features.trailer2_system_name || ''),
    trailer2Plate: String(features.trailer2_plate || ''),
    trailer2BodyType: String(features.trailer2_body_type || base.trailer2BodyType),
    tailLift: features.tail_lift ? 'Yes' : 'No',
    nextService: String(features.next_service || ''),
    ownershipType: (['owned', 'financed', 'leasing', 'rented', 'other'].includes(String(vehicle.ownership_type))
      ? String(vehicle.ownership_type)
      : 'owned') as VehicleOwnership,
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
  const [saving, setSaving] = useState(false);
  const [pendingDocuments, setPendingDocuments] = useState<PendingVehicleDocuments>({});
  const [existingDocumentTypes, setExistingDocumentTypes] = useState<Set<string>>(new Set());
  const [adrApplicable, setAdrApplicable] = useState(false);
  const isEditing = Boolean(initialVehicle?.id);

  useEffect(() => {
    if (!open) return undefined;
    setDraft(initialVehicle ? buildDraftFromVehicle(initialVehicle) : buildDraft('truck'));
    setStep(0);
    setPendingDocuments({});
    setExistingDocumentTypes(new Set());
    setAdrApplicable(Boolean((initialVehicle?.features as Record<string, unknown> | undefined)?.adr_applicable));
    if (initialVehicle?.id) {
      void api.documents.list({ vehicle_id: Number(initialVehicle.id) }).then((response) => {
        setExistingDocumentTypes(new Set(response.data.map((document) => String(document.type || ''))));
      }).catch(() => setExistingDocumentTypes(new Set()));
    }
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

  const ownershipOptions = [
    { value: 'owned', label: u('fleet.ownership.owned', 'Owned vehicle'), icon: KeyRound },
    { value: 'financed', label: u('fleet.ownership.financed', 'Financed / credit'), icon: BadgeDollarSign },
    { value: 'leasing', label: u('fleet.ownership.leasing', 'Leasing'), icon: Landmark },
    { value: 'rented', label: u('fleet.ownership.rented', 'Rent / hire'), icon: CalendarClock },
    { value: 'other', label: u('fleet.ownership.other', 'Other'), icon: CircleEllipsis },
  ];
  const ownershipDocumentType = OWNERSHIP_DOCUMENT_TYPES[draft.ownershipType];
  const ownershipDocumentLabel = {
    owned: u('fleet.document.ownershipCertificate', 'Proof of ownership'),
    financed: u('fleet.document.financingAgreement', 'Financing agreement'),
    leasing: u('fleet.document.leasingAgreement', 'Leasing agreement'),
    rented: u('fleet.document.rentalAgreement', 'Rental agreement'),
    other: u('fleet.document.otherOwnership', 'Other ownership document'),
  }[draft.ownershipType];

  const handleOwnershipChange = (value: string) => {
    const ownershipType = value as VehicleOwnership;
    setDraftField('ownershipType', ownershipType);
    setPendingDocuments((current) => {
      const next = { ...current };
      Object.values(OWNERSHIP_DOCUMENT_TYPES).forEach((type) => delete next[type]);
      return next;
    });
  };

  const handleTransportTypeChange = (transportType: TransportType) => {
    setDraft(buildDraft(transportType));
  };

  // Selecting 1 or 2 trailers adds that many field sets inline to the Operating details and
  // Classification cards, rather than moving the user into a second mini step.
  const trailerCount = draft.transportType !== 'truck' ? 0 : draft.trailer === 'Yes (2)' ? 2 : draft.trailer === 'Yes (1)' ? 1 : 0;
  const trailerSlots = ([
    { nameKey: 'trailerSystemName', plateKey: 'trailerPlate', bodyTypeKey: 'trailerBodyType' },
    { nameKey: 'trailer2SystemName', plateKey: 'trailer2Plate', bodyTypeKey: 'trailer2BodyType' },
  ] as const)
    .slice(0, trailerCount)
    // Labels only carry a number once there are two trailers to tell apart.
    .map((slot, index) => ({ ...slot, prefix: trailerCount > 1 ? `${index + 1}. ` : '' }));
  const hasTrailer = trailerCount > 0;
  const atpApplicable = isRoadVehicle(draft.transportType) && /refrigerated|reefer/i.test(`${draft.bodyType} ${trailerSlots.map((slot) => draft[slot.bodyTypeKey]).join(' ')}`);
  const hasDocument = (type: VehicleDocumentType) => Boolean(pendingDocuments[type]?.length || existingDocumentTypes.has(type));
  const requiredDocumentTypes: VehicleDocumentType[] = isRoadVehicle(draft.transportType)
    ? [
        'VEHICLE_REGISTRATION',
        ...(hasTrailer ? ['TRAILER_REGISTRATION' as VehicleDocumentType] : []),
        // A Community Licence covers hire-and-reward haulage above 3.5t, so vans are not asked for one.
        ...(draft.transportType === 'truck' ? ['COMMUNITY_LICENCE' as VehicleDocumentType] : []),
        'TECHNICAL_INSPECTION',
        ...(atpApplicable ? ['ATP_CERTIFICATE' as VehicleDocumentType] : []),
        ...(adrApplicable ? ['ADR_CERTIFICATE' as VehicleDocumentType] : []),
      ]
    : [];

  // Both former spec/naming screens now live on one "Details" step, so its gate is the union of
  // what those screens each used to require.
  const canContinue =
    (step === 0 &&
      Boolean(draft.transportType && draft.category && draft.bodyType) &&
      Boolean(draft.make && (draft.model || draft.customModel) && draft.capacity && draft.fuelType) &&
      Boolean(draft.systemName && draft.plate) &&
      trailerSlots.every((slot) => draft[slot.nameKey] && draft[slot.plateKey] && draft[slot.bodyTypeKey])) ||
    (step === 1 && requiredDocumentTypes.every(hasDocument));

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
    const trailerLabel = draft.transportType !== 'truck'
      ? 'N/A'
      : trailerCount === 0
        ? 'No'
        : `${draft.trailer} • ${draft.trailerBodyType} • ${draft.trailerPlate}`;

    setSaving(true);
    try {
      const payload = {
        registration_number: draft.plate,
        transport_type: draft.transportType === 'aircraft' ? 'air' : draft.transportType === 'ship' ? 'sea' : 'road',
        vehicle_type: draft.category, make: draft.make, model: displayModel, status: draft.status.toLowerCase(),
        capacity_kg: Number.parseFloat(draft.capacity.replace(/[^0-9.]/g, '')) * 1000 || null,
        capacity_m3: Number.parseFloat(draft.volume.replace(/[^0-9.]/g, '')) || null,
        ownership_type: draft.ownershipType,
        features: { vehicle_class: draft.transportType, system_name: draft.systemName, body_type: draft.bodyType, configuration: draft.configuration, fuel_type: draft.fuelType, trailer: trailerLabel, trailer_system_name: draft.trailerSystemName || null, trailer2_system_name: trailerCount > 1 ? draft.trailer2SystemName : null, trailer2_plate: trailerCount > 1 ? draft.trailer2Plate : null, trailer2_body_type: trailerCount > 1 ? draft.trailer2BodyType : null, tail_lift: draft.tailLift === 'Yes', next_service: draft.nextService || null, adr_applicable: adrApplicable },
        owner_user_id: ownerUserId,
        assigned_driver_user_id: assignedDriverUserId,
        company_id: companyId,
      };
      const response = isEditing
        ? await api.vehicles.update(String(initialVehicle?.id), payload)
        : await api.vehicles.create(payload);
      const vehicleId = Number(response.data.id);
      await Promise.all(Object.entries(pendingDocuments).flatMap(([type, files]) => files.map((file) => api.documents.upload({
          file,
          vehicleId,
          type,
          name: file.name,
        }))));
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
          className="fixed inset-0 z-[220] flex items-stretch justify-center overflow-hidden bg-slate-950/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5 md:px-6">
              <div className="min-w-0">
                <h2 className="truncate text-base font-black dark:text-white">
                  {isEditing ? u('fleet.editVehicleTitle', 'Edit vehicle') : u('fleet.registryTitle', 'Register a new vehicle')}
                </h2>
                <p className="hidden truncate text-[11px] text-slate-500 sm:block">
                  {u('fleet.registrySubtitle', 'Add vehicle details and required operating documents.')}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              {/* Same connector-line stepper as the Post a load modal, so both wizards read as one
                  component: equal-width columns with a single line behind them, masked by each
                  opaque circle. */}
              <div className="shrink-0 overflow-x-auto border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60 sm:px-6">
                <div className="relative flex w-full items-start">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute top-3.5 z-0 h-px bg-slate-200 dark:bg-slate-700"
                    style={{ left: `${50 / STEP_ITEMS.length}%`, right: `${50 / STEP_ITEMS.length}%` }}
                  />
                  {STEP_ITEMS.map((item, index) => {
                    const Icon = item.icon;
                    const isActive = step === index;
                    const isDone = index < step;
                    return (
                      <button
                        key={item.labelKey}
                        type="button"
                        onClick={() => { if (index <= step) setStep(index); }}
                        disabled={index > step}
                        className={cn(
                          'relative z-10 flex min-w-[6.5rem] flex-1 basis-0 flex-col items-center gap-1.5 px-1',
                          index <= step ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                        )}
                      >
                        <span
                          className={cn(
                            'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                            isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'
                          )}
                        >
                          {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                        </span>
                        <span className={cn('whitespace-nowrap text-[11px] font-bold', isActive ? 'text-primary' : isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400')}>
                          {u(item.labelKey, item.label)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="w-full space-y-3 p-3 pb-6 sm:p-4 sm:pb-6">
                {step === 0 && (
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="flex flex-col gap-3">
                      <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                        <div className="flex items-center gap-2 text-primary">
                          <Truck className="h-4 w-4" />
                          <p className="text-xs font-black uppercase tracking-wider">{u('fleet.vehicleTypeBlock', 'Vehicle type')}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {(Object.keys(FLEET_REGISTRY) as TransportType[]).map((type) => {
                            const item = FLEET_REGISTRY[type];
                            return (
                              <ChoiceCard
                                key={type}
                                compact
                                truncate
                                active={draft.transportType === type}
                                title={item.label}
                                description={`${item.categories.length} ${u('fleet.registryCategories', 'registry categories')}`}
                                icon={item.icon}
                                onClick={() => handleTransportTypeChange(type)}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {draft.transportType === 'truck' && (
                        <div className="flex flex-1 flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                          <div className="flex min-w-0 items-center gap-2 text-emerald-500">
                            <Caravan className="h-4 w-4 shrink-0" />
                            <p className="truncate text-xs font-black uppercase tracking-wider">
                              {u('fleet.trailerWizardLabel', 'Trailer registration')}
                            </p>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                            {[
                              { value: 'No', label: u('fleet.noTrailer', 'No trailer') },
                              { value: 'Yes (1)', label: u('fleet.oneTrailer', '1 trailer') },
                              { value: 'Yes (2)', label: u('fleet.twoTrailers', '2 trailers') },
                            ].map((option) => (
                              <ChoiceCard
                                key={option.value}
                                compact
                                truncate
                                active={draft.trailer === option.value}
                                title={option.label}
                                description={option.value === 'No'
                                  ? u('fleet.noTrailerHelp', 'Register only the powered vehicle.')
                                  : u('fleet.trailerInlineHelp', 'Trailer fields are added to the cards beside this one.')}
                                icon={Caravan}
                                onClick={() => {
                                  setDraft((prev) => ({
                                    ...prev,
                                    trailer: option.value,
                                    trailerSystemName: option.value === 'No' ? '' : prev.trailerSystemName,
                                    trailerPlate: option.value === 'No' ? '' : prev.trailerPlate,
                                    trailer2SystemName: option.value === 'Yes (2)' ? prev.trailer2SystemName : '',
                                    trailer2Plate: option.value === 'Yes (2)' ? prev.trailer2Plate : '',
                                  }));
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                        <div className="flex items-center gap-2 text-primary">
                          <Boxes className="h-4 w-4" />
                          <p className="text-xs font-black uppercase tracking-wider">{u('fleet.modelBlock', 'Make & model')}</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <FieldLabel>{u('fleet.make', 'Brand / make')}</FieldLabel>
                            <IconSelect
                              value={draft.make}
                              onChange={(nextMake) => {
                                const nextModels = registry.makes[nextMake as keyof typeof registry.makes];
                                setDraft((prev) => ({ ...prev, make: nextMake, model: nextModels[0], customModel: '' }));
                              }}
                              options={[
                                ...(!makeOptions.includes(draft.make) ? [{ value: draft.make, label: draft.make, icon: Building2, logoUrl: brandLogoUrl(draft.make) }] : []),
                                ...makeOptions.map((option) => ({ value: option, label: option, icon: Building2, logoUrl: brandLogoUrl(option) })),
                              ]}
                              placeholder={u('fleet.make', 'Brand / make')}
                              ariaLabel={u('fleet.make', 'Brand / make')}
                              icon={Building2}
                              searchable
                              searchPlaceholder={u('fleet.searchBrands', 'Search brands...')}
                              noResults={u('fleet.noBrands', 'No brands found.')}
                              className="w-full [&_button]:h-10 [&_button]:rounded-xl [&_button]:text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <FieldLabel>{u('fleet.model', 'Model')}</FieldLabel>
                            <IconSelect
                              value={draft.model}
                              onChange={(value) => setDraftField('model', value)}
                              options={[
                                ...modelOptions.map((option) => ({ value: option, label: option, icon: CarFront, logoUrl: brandLogoUrl(draft.make) })),
                                { value: 'Other', label: u('fleet.other', 'Other'), icon: CircleEllipsis },
                              ]}
                              placeholder={u('fleet.model', 'Model')}
                              ariaLabel={u('fleet.model', 'Model')}
                              icon={CarFront}
                              className="w-full [&_button]:h-10 [&_button]:rounded-xl [&_button]:text-sm"
                            />
                          </div>
                        </div>
                        {draft.model === 'Other' && (
                          <div className="space-y-1">
                            <FieldLabel>{u('fleet.customModel', 'Custom model')}</FieldLabel>
                            <Input
                              value={draft.customModel}
                              onChange={(e) => setDraftField('customModel', e.target.value)}
                              placeholder={u('fleet.customModelPlaceholder', 'Enter custom model')}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                        <div className="flex items-center gap-2 text-emerald-500">
                          <Gauge className="h-4 w-4" />
                          <p className="text-xs font-black uppercase tracking-wider">{u('fleet.specsBlock', 'Specifications')}</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <FieldLabel>{u('fleet.capacity', 'Capacity')}</FieldLabel>
                            <Input value={draft.capacity} onChange={(e) => setDraftField('capacity', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <FieldLabel>{u('fleet.volume', 'Volume')}</FieldLabel>
                            <Input value={draft.volume} onChange={(e) => setDraftField('volume', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <FieldLabel>{u('fleet.configuration', 'Configuration')}</FieldLabel>
                            <IconSelect
                              value={draft.configuration}
                              onChange={(value) => setDraftField('configuration', value)}
                              options={[
                                ...(!(registry.specs.configurations as readonly string[]).includes(draft.configuration) ? [{ value: draft.configuration, label: draft.configuration, icon: Network }] : []),
                                ...registry.specs.configurations.map((option) => ({ value: option, label: option, icon: Network })),
                              ]}
                              placeholder={u('fleet.configuration', 'Configuration')}
                              ariaLabel={u('fleet.configuration', 'Configuration')}
                              icon={Network}
                              className="w-full [&_button]:h-10 [&_button]:rounded-xl [&_button]:text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <FieldLabel>{u('fleet.fuelType', 'Fuel type')}</FieldLabel>
                            <IconSelect
                              value={draft.fuelType}
                              onChange={(value) => setDraftField('fuelType', value)}
                              options={[
                                ...(!(registry.specs.fuelTypes as readonly string[]).includes(draft.fuelType) ? [{ value: draft.fuelType, label: trFuelType(lang, draft.fuelType), icon: Fuel }] : []),
                                ...registry.specs.fuelTypes.map((option) => ({ value: option, label: trFuelType(lang, option), icon: Fuel })),
                              ]}
                              placeholder={u('fleet.fuelType', 'Fuel type')}
                              ariaLabel={u('fleet.fuelType', 'Fuel type')}
                              icon={Fuel}
                              className="w-full [&_button]:h-10 [&_button]:rounded-xl [&_button]:text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                        <div className="flex items-center gap-2 text-primary">
                          <ClipboardList className="h-4 w-4" />
                          <p className="text-xs font-black uppercase tracking-wider">{u('fleet.operatingBlock', 'Operating details')}</p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <FieldLabel>{u('fleet.systemName', 'Vehicle name in system')}</FieldLabel>
                            <Input
                              value={draft.systemName}
                              onChange={(e) => setDraftField('systemName', e.target.value)}
                              placeholder={u('fleet.systemNamePlaceholder', 'Example: Frozen Line 01')}
                            />
                          </div>
                          <div className="space-y-1">
                            <FieldLabel>{u('fleet.plate', 'Registration / code')}</FieldLabel>
                            <Input
                              value={draft.plate}
                              onChange={(e) => setDraftField('plate', e.target.value)}
                              placeholder={u('fleet.platePlaceholder', 'BA-123-XY / IMO-001 / AIR-77F')}
                            />
                          </div>
                          <div className="space-y-1">
                            <FieldLabel>{u('fleet.status', 'Status')}</FieldLabel>
                            <IconSelect
                              value={draft.status}
                              onChange={(value) => setDraftField('status', value as AddVehicleDraft['status'])}
                              options={[
                                { value: 'Active', label: trVehicleStatus(lang, 'Active'), icon: CheckCircle2, toneClass: 'text-emerald-500' },
                                { value: 'Maintenance', label: trVehicleStatus(lang, 'Maintenance'), icon: Wrench, toneClass: 'text-amber-500' },
                                { value: 'Idle', label: trVehicleStatus(lang, 'Idle'), icon: CirclePause, toneClass: 'text-slate-400' },
                              ]}
                              placeholder={u('fleet.status', 'Status')}
                              ariaLabel={u('fleet.status', 'Status')}
                              icon={CheckCircle2}
                              className="w-full [&_button]:h-10 [&_button]:rounded-xl [&_button]:text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <FieldLabel>{u('fleet.nextService', 'Next service')}</FieldLabel>
                            <Input
                              value={draft.nextService}
                              onChange={(e) => setDraftField('nextService', e.target.value)}
                              placeholder={u('fleet.nextServicePlaceholder', '12 May / Tomorrow / Dock inspection')}
                            />
                          </div>
                          <div className="space-y-1 sm:col-span-2">
                            <FieldLabel>{u('fleet.ownership.label', 'Ownership')}</FieldLabel>
                            <IconSelect
                              value={draft.ownershipType}
                              onChange={handleOwnershipChange}
                              options={ownershipOptions}
                              placeholder={u('fleet.ownership.placeholder', 'Select ownership')}
                              ariaLabel={u('fleet.ownership.label', 'Ownership')}
                              icon={KeyRound}
                              className="w-full [&_button]:h-10 [&_button]:rounded-xl [&_button]:text-sm"
                            />
                          </div>
                          {trailerSlots.map((slot) => (
                            <Fragment key={slot.nameKey}>
                              <div className="space-y-1">
                                <FieldLabel>{`${slot.prefix}${u('fleet.trailerSystemName', 'Trailer name in system')}`}</FieldLabel>
                                <Input
                                  value={draft[slot.nameKey]}
                                  onChange={(e) => setDraftField(slot.nameKey, e.target.value)}
                                  placeholder={u('fleet.trailerSystemNamePlaceholder', 'Example: Reefer Trailer 01')}
                                />
                              </div>
                              <div className="space-y-1">
                                <FieldLabel>{`${slot.prefix}${u('fleet.trailerPlate', 'Trailer registration')}`}</FieldLabel>
                                <Input
                                  value={draft[slot.plateKey]}
                                  onChange={(e) => setDraftField(slot.plateKey, e.target.value)}
                                  placeholder={u('fleet.trailerPlatePlaceholder', 'TR-908-KL')}
                                />
                              </div>
                            </Fragment>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-1 flex-col gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                        <div className="flex items-center gap-2 text-emerald-500">
                          <Layers className="h-4 w-4" />
                          <p className="text-xs font-black uppercase tracking-wider">{u('fleet.classificationBlock', 'Classification')}</p>
                        </div>
                        <div className={cn('grid gap-3 sm:grid-cols-2', isRoadVehicle(draft.transportType) && 'sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.65fr)]')}>
                          <div className="space-y-1">
                            <FieldLabel>{u('fleet.category', 'Category')}</FieldLabel>
                            <IconSelect
                              value={draft.category}
                              onChange={(value) => setDraftField('category', value)}
                              options={[
                                ...(!(registry.categories as readonly string[]).includes(draft.category) ? [{ value: draft.category, label: draft.category, icon: Truck }] : []),
                                ...registry.categories.map((option) => ({ value: option, label: option, icon: registry.icon })),
                              ]}
                              placeholder={u('fleet.category', 'Category')}
                              ariaLabel={u('fleet.category', 'Category')}
                              icon={Truck}
                              className="w-full [&_button]:h-10 [&_button]:rounded-xl [&_button]:text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <FieldLabel>{u('fleet.bodyType', 'Body type')}</FieldLabel>
                            <IconSelect
                              value={draft.bodyType}
                              onChange={(value) => setDraftField('bodyType', value)}
                              options={[
                                ...(!(registry.bodyTypes as readonly string[]).includes(draft.bodyType) ? [{ value: draft.bodyType, label: draft.bodyType, icon: PackageOpen }] : []),
                                ...registry.bodyTypes.map((option) => ({ value: option, label: option, icon: PackageOpen })),
                              ]}
                              placeholder={u('fleet.bodyType', 'Body type')}
                              ariaLabel={u('fleet.bodyType', 'Body type')}
                              icon={PackageOpen}
                              className="w-full [&_button]:h-10 [&_button]:rounded-xl [&_button]:text-sm"
                            />
                          </div>
                          {isRoadVehicle(draft.transportType) && (
                            <div className="space-y-1">
                              <FieldLabel>{u('fleet.tailLift', 'Tail lift')}</FieldLabel>
                              <IconSelect
                                value={draft.tailLift}
                                onChange={(value) => setDraftField('tailLift', value)}
                                options={[
                                  { value: 'No', label: u('common.no', 'No'), icon: CirclePause },
                                  { value: 'Yes', label: u('common.yes', 'Yes'), icon: ArrowUpFromLine },
                                ]}
                                placeholder={u('fleet.tailLift', 'Tail lift')}
                                ariaLabel={u('fleet.tailLift', 'Tail lift')}
                                icon={ArrowUpFromLine}
                                className="w-full [&_button]:h-10 [&_button]:rounded-xl [&_button]:text-sm"
                              />
                            </div>
                          )}
                          {trailerSlots.map((slot) => (
                            <div key={slot.bodyTypeKey} className="space-y-1">
                              <FieldLabel>{`${slot.prefix}${u('fleet.trailerBodyType', 'Trailer body type')}`}</FieldLabel>
                              <IconSelect
                                value={draft[slot.bodyTypeKey]}
                                onChange={(value) => setDraftField(slot.bodyTypeKey, value)}
                                options={['Box trailer', 'Curtain trailer', 'Reefer trailer', 'Flatbed trailer', 'Container chassis'].map((option) => ({ value: option, label: option, icon: Caravan }))}
                                placeholder={u('fleet.trailerBodyType', 'Trailer body type')}
                                ariaLabel={`${slot.prefix}${u('fleet.trailerBodyType', 'Trailer body type')}`}
                                icon={Caravan}
                                className="w-full [&_button]:h-10 [&_button]:rounded-xl [&_button]:text-sm"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2 text-primary">
                        <FileText className="h-4 w-4 shrink-0" />
                        <p className="truncate text-xs font-black uppercase tracking-wider">{u('fleet.vehicleDocuments', 'Vehicle documents')}</p>
                      </div>
                      {isRoadVehicle(draft.transportType) && (
                        <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold dark:border-slate-800 dark:bg-slate-950">
                          <input type="checkbox" checked={adrApplicable} onChange={(event) => setAdrApplicable(event.target.checked)} className="h-3.5 w-3.5 accent-primary" />
                          {u('fleet.adrApplicable', 'ADR applies to this vehicle')}
                        </label>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">{u('fleet.vehicleDocumentsHelp', 'Upload the documents required for this vehicle. PDF and image files are supported.')}</p>

                    {isRoadVehicle(draft.transportType) ? (
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {([
                          { type: 'VEHICLE_REGISTRATION', label: u('fleet.document.vehicleRegistration', 'Vehicle registration certificate'), required: true, visible: true },
                          { type: 'TRAILER_REGISTRATION', label: u('fleet.document.trailerRegistration', 'Trailer/semi-trailer registration certificate'), required: true, visible: hasTrailer },
                          { type: 'INSURANCE_POLICY', label: u('fleet.document.insurancePolicy', 'Insurance policy'), required: false, visible: true },
                          { type: 'COMMUNITY_LICENCE', label: u('fleet.document.communityLicence', 'Community Licence copy'), required: true, visible: draft.transportType === 'truck' },
                          { type: 'TECHNICAL_INSPECTION', label: u('fleet.document.technicalInspection', 'Technical inspection certificate'), required: true, visible: true },
                          { type: 'ATP_CERTIFICATE', label: u('fleet.document.atpCertificate', 'ATP certificate'), required: true, visible: atpApplicable },
                          { type: 'ADR_CERTIFICATE', label: u('fleet.document.adrCertificate', 'Vehicle ADR certificate'), required: true, visible: adrApplicable },
                          { type: 'OTHER_PERMIT', label: u('fleet.document.otherPermit', 'Other permits'), required: false, visible: true },
                          { type: ownershipDocumentType, label: ownershipDocumentLabel, required: false, visible: true },
                        ] as { type: VehicleDocumentType; label: string; required: boolean; visible: boolean }[]).filter((item) => item.visible).map((item) => {
                          const files = pendingDocuments[item.type] || [];
                          const alreadyUploaded = existingDocumentTypes.has(item.type);
                          return (
                            <label key={item.type} className={cn('group flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed px-3 py-2.5 transition-colors hover:border-primary hover:bg-primary/5', hasDocument(item.type) ? 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/10' : 'border-slate-300 dark:border-slate-700')}>
                              <input type="file" multiple={item.type === 'OTHER_PERMIT'} accept=".pdf,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={(event) => {
                                const selected = Array.from(event.target.files || []);
                                if (selected.length) setPendingDocuments((current) => ({ ...current, [item.type]: selected }));
                                event.target.value = '';
                              }} />
                              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', hasDocument(item.type) ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-primary/10 text-primary')}>
                                {hasDocument(item.type) ? <CheckCircle2 className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-xs font-bold text-slate-800 dark:text-white" title={item.label}>{item.label}{item.required ? ' *' : ''}</span>
                                <span className="mt-0.5 block truncate text-[11px] leading-tight text-slate-500">{files.map((file) => file.name).join(', ') || (alreadyUploaded ? u('fleet.documentAlreadyUploaded', 'Already uploaded — choose a file to replace') : u('fleet.chooseDocument', 'Choose PDF or image'))}</span>
                              </span>
                              <FileText className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-primary" />
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
                        {u('fleet.roadDocumentsOnly', 'These road-vehicle documents do not apply to aircraft or ships.')}
                      </div>
                    )}
                    {!isRoadVehicle(draft.transportType) && <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      <label className={cn('group flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed px-3 py-2.5 transition-colors hover:border-primary hover:bg-primary/5', hasDocument(ownershipDocumentType) ? 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/10' : 'border-slate-300 dark:border-slate-700')}>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={(event) => {
                          const selected = Array.from(event.target.files || []);
                          if (selected.length) setPendingDocuments((current) => ({ ...current, [ownershipDocumentType]: selected }));
                          event.target.value = '';
                        }} />
                        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', hasDocument(ownershipDocumentType) ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-primary/10 text-primary')}>
                          {hasDocument(ownershipDocumentType) ? <CheckCircle2 className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold text-slate-800 dark:text-white" title={ownershipDocumentLabel}>{ownershipDocumentLabel}</span>
                          <span className="mt-0.5 block truncate text-[11px] leading-tight text-slate-500">{pendingDocuments[ownershipDocumentType]?.map((file) => file.name).join(', ') || (existingDocumentTypes.has(ownershipDocumentType) ? u('fleet.documentAlreadyUploaded', 'Already uploaded — choose a file to replace') : u('fleet.optionalDocument', 'Optional — choose PDF or image'))}</span>
                        </span>
                        <FileText className="h-3.5 w-3.5 shrink-0 text-slate-300 group-hover:text-primary" />
                      </label>
                    </div>}
                    {requiredDocumentTypes.some((type) => !hasDocument(type)) && (
                      <p className="text-[11px] font-bold text-amber-600">{u('fleet.requiredDocumentsHelp', 'Upload every document marked with * to save the vehicle.')}</p>
                    )}
                  </div>
                )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/40 sm:px-5 md:px-6">
              <Button variant="outline" className="h-10" disabled={saving} onClick={step === 0 ? onClose : () => setStep((prev) => prev - 1)}>
                {step === 0 ? u('common.cancel', 'Cancel') : u('common.back', 'Back')}
              </Button>
              <div className="flex items-center gap-3">
                <div className="hidden text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 sm:block">
                  {u('fleet.step', 'Step')} {step + 1}/2
                </div>
                {step === 1 ? (
                  <Button className="h-10" onClick={() => void submitVehicle()} disabled={!canContinue || saving}>
                    {saving
                      ? isEditing ? u('fleet.saving', 'Saving…') : u('fleet.adding', 'Adding…')
                      : isEditing ? u('fleet.saveChanges', 'Save changes') : u('fleet.saveVehicle', 'Save vehicle')}
                  </Button>
                ) : (
                  <Button className="h-10" onClick={() => setStep((prev) => prev + 1)} disabled={!canContinue}>
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
