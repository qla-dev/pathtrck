import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Apple,
  Blinds,
  Box,
  Boxes,
  Building2,
  Container,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock3,
  Coins,
  Cpu,
  Diamond,
  Droplet,
  FileText,
  FlaskConical,
  Footprints,
  Forklift,
  Gem,
  Handshake,
  Layers,
  Loader2,
  Map as MapGlyphIcon,
  MapPin,
  Maximize2,
  Package,
  Package2,
  PanelBottom,
  PawPrint,
  Palette,
  Pill,
  Plane,
  PlaneLanding,
  Plus,
  Recycle,
  RotateCcw,
  Route,
  ArrowDownToLine,
  BadgeCheck,
  Landmark,
  Radar,
  Save,
  Scissors,
  ScanEye,
  Send,
  Shirt,
  ShieldAlert,
  ShieldCheck,
  Ship,
  Sparkles,
  Sprout,
  Sword,
  Tag,
  ThermometerSnowflake,
  TreePine,
  Train as TrainFront,
  Truck,
  Umbrella,
  UserRound,
  UtensilsCrossed,
  Warehouse,
  Weight,
  Wine,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Language } from '../../../types';
import { ui } from '../../../i18n';
import { cn } from '../../../lib/cn';
import { confirmAction, showSuccess } from '../../../lib/swal';
import { useOutsideClick } from '../../../hooks/useOutsideClick';
import { searchLocations } from '../../../services/locationSearch';
import { Button } from '../../ui/Button';
import { AI_DISPATCH_SUBJECT_PREFIX, api, ApiError, ApiUser, HsCodeMatch, LoadScanResult } from '../../../services/api';
import { CustomerSelect, customerOptionFromRecord, type CustomerOption } from '../../customer/CustomerSelect';
import { HsCodeChip } from '../../hs/HsCodeChip';
import { INVALID_FIELD_CLASS, describeApiErrors, stepForField, validateDraft, type ValidationIssues } from './validation';
import { AddressMapModal } from '../../maps/AddressMapModal';
import { AreaMapModal } from '../../maps/AreaMapModal';
import { RouteMapModal } from '../../maps/RouteMapModal';
import { CountrySelect } from '../../location/CountrySelect';
import { PACKAGE_TYPES } from '../../../data/packageTypes';
import { SEA_PORTS, SeaPort } from '../../../data/seaPorts';
import { SEA_CONTAINER_TYPES, SeaContainerCategory, containerLabel } from '../../../data/seaContainers';
import { DocumentDropzone } from '../DocumentDropzone';
import { ScanResultModal } from '../ScanResultModal';
import { ScanFieldPatch, deriveGoodsTypeCode, deriveGoodsTypeName, stripHsCodesForPayload, resolveHsCodes, hsSectionIcon } from '../scanFieldRows';
import {
  AIR_CHARACTERISTIC_OPTIONS,
  AIR_LOADING_EQUIPMENT_OPTIONS,
  AIR_SPECIAL_REQUIREMENT_OPTIONS,
  AIR_TAIL_LIFT_REQUIREMENT,
  BODY_TYPE_OPTIONS,
  CLOSED_EXCHANGE_OPTIONS,
  CONTACT_OPTIONS,
  INCOTERM_OPTIONS,
  LOADING_EQUIPMENT_OPTIONS,
  ROAD_CHARACTERISTIC_OPTIONS,
  SEA_BL_TYPE_OPTIONS,
  SEA_CHARACTERISTIC_OPTIONS,
  SEA_LOADING_EQUIPMENT_OPTIONS,
  RAIL_LOADING_EQUIPMENT_OPTIONS,
  RAIL_DOCUMENT_TYPE_OPTIONS,
  SEA_PAYMENT_TERMS_OPTIONS,
  WAREHOUSE_STORAGE_TYPE_OPTIONS,
  WAREHOUSE_HANDLING_REQUIREMENT_OPTIONS,
  WAREHOUSE_RATE_UNIT_OPTIONS,
} from '../loadFormOptions';
import type { PostLoadModalProps, StepId, TransportType, ScannedDocument, LoadDraft, ContainerSelection } from './types';
import { EQUIPMENT_COVERED_REQUIREMENTS, INITIAL_DRAFT, isContainerTransport } from './types';
import type { EquipmentCoveredRequirement } from './types';
import {
  toApiDateTime,
  toApiDate,
  fromApiDateTime,
  fromApiWeightKg,
  toApiWeightKg,
  buildLoadFieldsPayload,
  buildLoadStopsPayload,
  buildLoadPayload,
  buildDraftPayload,
  buildWarehouseLoadPayload,
  routePosition,
  estimatedDrivingDistanceKm,
  deriveAirTransportMode,
} from './payload';
import { ScrollableRow } from './ScrollableRow';
import { DetailToggleCard } from './DetailToggleCard';
import { FieldLabel } from './FieldLabel';
import { Input, Textarea, Select } from './FormFields';
import { AddressAutocompleteField } from './AddressAutocompleteField';
import { PortAutocompleteField } from './PortAutocompleteField';
import { AirportAutocompleteField } from './AirportAutocompleteField';
import { VerticalRoutePoint } from './VerticalRoutePoint';
import { TimeInput } from './TimeInput';
import { DateInput } from './DateInput';
import { formatTimeRangeMask } from './timeMask';
import { ToggleCard } from './ToggleCard';
import { ChoiceCard } from './ChoiceCard';
import { SummaryRow } from './SummaryRow';
import { HANDLING_DESCRIPTIONS, HANDLING_ICONS, WarehouseLocationFields, WarehouseStorageTypeField } from './WarehouseFormFields';

const STEPS: Array<{ id: StepId; icon: typeof MapPin }> = [
  { id: 'cargo', icon: Package },
  { id: 'route', icon: MapPin },
  { id: 'contact', icon: UserRound },
  { id: 'review', icon: CheckCircle2 },
];

const BODY_TYPE_ICONS: Record<(typeof BODY_TYPE_OPTIONS)[number], LucideIcon> = {
  Curtain: Blinds,
  Box: Box,
  Reefer: ThermometerSnowflake,
  Mega: Maximize2,
  Tautliner: Container,
  Flatbed: PanelBottom,
};

const AIR_SPECIAL_REQUIREMENT_ICONS: Record<string, LucideIcon> = {
  'ULD Required': Package2,
  'Security Screening': ScanEye,
  'Priority / Time Critical': Zap,
  'AWB Required': FileText,
  'Airport Handling': PlaneLanding,
  'Customs Clearance': Landmark,
  'Insurance Required': Umbrella,
  'Special Handling': Wrench,
  'Track & Trace Required': Radar,
  'Tail Lift Required': ArrowDownToLine,
};

// Which AI-refillable fields (the ones wrapped in fieldLabel(...) below) live under each step, so
// the sidebar can show a per-step count instead of only the one global aiFieldCount badge.
// The characteristics grid shares the requirements' card shape, which carries a description line,
// so every option across road, air and sea needs one sentence explaining it.
const CHARACTERISTIC_DESCRIPTIONS: Record<string, string> = {
  GDP: 'Good Distribution Practice certified',
  TIR: 'TIR carnet transit',
  'MED (medicine)': 'Pharmaceutical shipment',
  'VAL (money and other valuables)': 'High value cargo',
  'Fragile Cargo': 'Careful handling required',
  'Oversized / Heavy Cargo': 'Exceeds standard ULD limits',
  'Lithium Batteries': 'UN 3480 / UN 3481 shipment',
  'Dry Ice': 'UN 1845 refrigerant on board',
  'DG / IMO': 'IMO classified dangerous goods',
  OOG: 'Out of gauge cargo',
  LIQUID: 'Liquid or flexitank cargo',
  BULK: 'Loose, non containerised cargo',
  FRAGILE: 'Careful handling required',
  HEAVY: 'Heavy lift cargo',
  VALUABLE: 'High value cargo',
  PHARMA: 'Temperature controlled pharma',
  'FOOD GRADE': 'Food grade certified',
};

const STEP_AI_FIELDS: Record<StepId, Array<keyof ScanFieldPatch & keyof LoadDraft>> = {
  route: ['pickupCountry', 'pickupCity', 'pickupPostalCode', 'pickupDate', 'deliveryCountry', 'deliveryCity', 'deliveryPostalCode', 'deliveryDate'],
  cargo: ['consignee', 'bookingReference', 'loadTitle', 'lengthM', 'weightKg', 'pallets', 'volumeM3', 'widthM', 'heightM', 'temperatureControlled', 'vehicleType', 'bodyTypes'],
  contact: ['contactName', 'contactEmail', 'contactPhone', 'budget', 'freightCurrency', 'paymentDeferred', 'incoterm', 'notes'],
  review: [],
};


export const PostLoadModal = ({ isOpen, onClose, lang, editLoadId = null, onSaved, initialPrefill = null, onOpenLenaAI, sourceConversationId = null, initialDraftId = null, onDraftConversationCreated }: PostLoadModalProps) => {
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
    {
      id: 'rail' as const,
      label: u('postLoadModal.transport.rail', 'Rail'),
      description: u('postLoadModal.transport.railDesc', 'Terminal and container rail freight'),
      icon: TrainFront,
      iconTone: 'text-violet-500',
      iconSurface: 'bg-violet-500/10',
    },
    {
      id: 'warehouse' as const,
      label: u('postLoadModal.transport.warehouse', 'Warehouse'),
      description: u('postLoadModal.transport.warehouseDesc', 'Pallet and bulk storage'),
      icon: Warehouse,
      iconTone: 'text-orange-500',
      iconSurface: 'bg-orange-500/10',
    },
  ];
  const shipmentTypeOptions: Record<TransportType, string[]> = {
    road: ['FTL', 'LTL', 'Express', 'Dedicated'],
    air: ['Standard', 'Express', 'Priority', 'Economy', 'Charter'],
    sea: ['FCL', 'LCL'],
    rail: ['FCL', 'LCL'],
    warehouse: [],
  };
  const loadingEquipmentOptions: Record<TransportType, readonly string[]> = {
    road: LOADING_EQUIPMENT_OPTIONS,
    air: AIR_LOADING_EQUIPMENT_OPTIONS,
    sea: SEA_LOADING_EQUIPMENT_OPTIONS,
    rail: RAIL_LOADING_EQUIPMENT_OPTIONS,
    warehouse: WAREHOUSE_HANDLING_REQUIREMENT_OPTIONS,
  };
  // True when the picker above already offers an option that says the same thing, in which case the
  // requirement toggle is a duplicate and is not rendered.
  const equipmentCovers = (requirement: EquipmentCoveredRequirement) =>
    EQUIPMENT_COVERED_REQUIREMENTS[requirement].some((option) =>
      loadingEquipmentOptions[draft.transportType].includes(option));
  const [step, setStep] = useState<StepId>('cargo');
  const contentScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0 });
  }, [step]);
  const [draft, setDraft] = useState<LoadDraft>(INITIAL_DRAFT);
  const activeTransportOption = transportOptions.find((option) => option.id === draft.transportType);
  const selectedPackageType = PACKAGE_TYPES.find((option) => option.value === draft.quantityMeasure);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [addressMap, setAddressMap] = useState<'pickup' | 'delivery' | null>(null);
  const [areaMapOpen, setAreaMapOpen] = useState(false);
  // The draft as it stood when a submit was rejected, kept alongside the fields that were
  // rejected: a field stops being outlined the moment its value changes, no matter which control
  // changed it (typing, the map picker, an AI refill), without any per-field bookkeeping.
  const [rejected, setRejected] = useState<{ fields: Array<keyof LoadDraft>; draft: LoadDraft } | null>(null);
  const [routeMapOpen, setRouteMapOpen] = useState(false);
  const [dropzoneOpen, setDropzoneOpen] = useState(false);
  const [scannedDocuments, setScannedDocuments] = useState<ScannedDocument[]>([]);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [aiFilledPatch, setAiFilledPatch] = useState<ScanFieldPatch>({});
  const [hsSearching, setHsSearching] = useState(false);
  const [hsSuggestions, setHsSuggestions] = useState<HsCodeMatch[]>([]);
  // Purely a live search query for the "Vrsta robe" HS-code box, cleared after every pick - it
  // never gets submitted or saved anywhere, so it has no business living in draft/ScanFieldPatch.
  const [hsQuery, setHsQuery] = useState('');
  const [draftId, setDraftId] = useState<string | number | null>(initialDraftId);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  useEffect(() => { void api.auth.me().then(setCurrentUser); }, []);
  const hsSearchRef = useRef<HTMLDivElement>(null);
  useOutsideClick(hsSearchRef, () => setHsSuggestions([]), hsSuggestions.length > 0);

  const resetDraftState = () => {
    setStep('cargo');
    setDraft(INITIAL_DRAFT);
    setSubmitError('');
    setScannedDocuments([]);
    setViewingDocId(null);
    setAiFilledPatch({});
    setHsSuggestions([]);
  };

  useEffect(() => {
    if (!isOpen) {
      resetDraftState();
      setDraftId(null);
      setDraftSavedAt(null);
    } else {
      setDraftId(initialDraftId);
    }
  }, [isOpen]);

  // Show when the draft was actually last saved as soon as the modal opens with an existing
  // draft, not just after the user manually saves in this session - mirrors LenaLoadCanvas.tsx.
  useEffect(() => {
    if (!draftId) return undefined;
    let cancelled = false;
    void api.loadDrafts.get(draftId).then((response) => {
      if (cancelled) return;
      const updatedAt = response.data.updated_at;
      if (typeof updatedAt === 'string') {
        const parsed = new Date(updatedAt);
        if (!Number.isNaN(parsed.getTime())) setDraftSavedAt(parsed);
      }
    }).catch(() => {
      // Non-critical - the button just won't show an initial timestamp.
    });
    return () => {
      cancelled = true;
    };
  }, [draftId]);

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
    api.loads.get(editLoadId).then(async (response) => {
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
      // Only the bare code is persisted per HS entry (see stripHsCodesForPayload) - re-resolve the
      // full catalog details here so the chip UI has category names/icons to show.
      const rawHsCodes = Array.isArray(record.hs_codes) ? record.hs_codes as HsCodeMatch[] : [];
      const hsCodes = await resolveHsCodes(rawHsCodes, lang);
      setHsQuery('');
      setDraft({ ...INITIAL_DRAFT,
        consignee,
        bookingReference: String(record.booking_reference || ''),
        transportType: (record.transport_type as TransportType) || 'road',
        pickupPlaceType: String(pickup.place_type || INITIAL_DRAFT.pickupPlaceType), pickupCity: String(pickup.city || ''), pickupPostalCode: String(pickup.postal_code || ''), pickupCountry: String(pickup.country_code || 'BA'), pickupAddress: String(pickup.address || ''), pickupPort: String(pickup.port || ''), pickupAirport: String(pickup.airport || ''), pickupLatitude: String(pickup.latitude || ''), pickupLongitude: String(pickup.longitude || ''), pickupDate: pickupStart.date, pickupDateTo: pickupEnd.date, pickupTimeFrom: pickupStart.time, pickupTimeTo: pickupEnd.time,
        deliveryPlaceType: String(delivery.place_type || INITIAL_DRAFT.deliveryPlaceType), deliveryCity: String(delivery.city || record.warehouse_city || ''), deliveryPostalCode: String(delivery.postal_code || ''), deliveryCountry: String(delivery.country_code || record.warehouse_country_code || 'BA'), deliveryAddress: String(delivery.address || record.warehouse_address || ''), deliveryPort: String(delivery.port || ''), deliveryAirport: String(delivery.airport || ''), deliveryLatitude: String(delivery.latitude || record.warehouse_latitude || ''), deliveryLongitude: String(delivery.longitude || record.warehouse_longitude || ''), deliveryRadiusKm: String(record.warehouse_radius_km || delivery.radius_km || INITIAL_DRAFT.deliveryRadiusKm), deliveryDate: deliveryStart.date || String(record.storage_start_date || '').slice(0, 10), deliveryDateTo: deliveryEnd.date || String(record.storage_end_date || '').slice(0, 10), deliveryTimeFrom: deliveryStart.time, deliveryTimeTo: deliveryEnd.time,
        transitDays: String(record.transit_days || ''),
        loadTitle: String(record.title || ''), cargoType: String(record.cargo_type || 'FTL'), goodsType: String(record.goods_type || 'General'), hsCodes, weightKg: fromApiWeightKg(record.weight_kg), pallets: String(record.pallets || ''), quantityMeasure: String(record.quantity_measure || ''), lengthM: String(record.length_m || ''), widthM: String(record.width_m || ''), heightM: String(record.height_m || ''), volumeM3: String(record.volume_m3 || ''), declaredValue: String(record.declared_value || ''), budget: String(record.budget || ''), freightCurrency: String(record.currency || 'EUR'), shipmentValueCurrency: String(record.shipment_value_currency || record.currency || 'EUR'), paymentDueDays: String(record.payment_due_days || ''), paymentDeferred: terms === 'deferred', seaPaymentTerms: ['Prepaid', 'Collect', 'Other'].includes(terms) ? terms : '', incoterm: String(record.incoterms || ''),
        loadingEquipment: Array.isArray(record.handling_requirements) ? record.handling_requirements.map(String) : Array.isArray(record.loading_methods) ? record.loading_methods.map(String) : [], vehicleType: String(record.vehicle_type || INITIAL_DRAFT.vehicleType), characteristics: Array.isArray(record.characteristics) ? record.characteristics.map(String) : [], specialRequirements: Array.isArray(record.special_requirements) ? record.special_requirements.map(String) : [], deliveryProof: String(record.delivery_proof || ''), temperatureControlled: record.temperature_min != null || record.temperature_max != null, temperatureMin: String(record.temperature_min ?? ''), temperatureMax: String(record.temperature_max ?? ''),
        containerSelections: Array.isArray(record.container_selections) ? (record.container_selections as Array<Record<string, unknown>>).map((row) => ({ type: String(row.type || ''), quantity: String(row.quantity ?? '1') })) : [],
        blType: String(record.bl_type || ''), dgUnNumber: String(record.dg_un_number || ''), dgImoClass: String(record.dg_imo_class || ''), dgPackingGroup: String(record.dg_packing_group || ''), dgProperShippingName: String(record.dg_proper_shipping_name || ''),
        warehouseStorageType: String(record.storage_type || INITIAL_DRAFT.warehouseStorageType), warehouseStartDate: String(record.storage_start_date || '').slice(0, 10), warehouseEndDate: String(record.storage_end_date || '').slice(0, 10), warehouseIsOngoing: Boolean(record.is_storage_ongoing), warehouseTemperatureMin: String(record.temperature_min ?? ''), warehouseTemperatureMax: String(record.temperature_max ?? ''), warehouseRequiresCustomsBonded: Boolean(record.requires_customs_bonded), warehouseRequiresRacking: Boolean(record.requires_racking), warehouseRequiresInsurance: Boolean(record.insurance_required), warehouseRequiresSecurity: Boolean(record.requires_security), warehouseRateUnit: String(record.rate_unit || INITIAL_DRAFT.warehouseRateUnit), warehouseFoodPharma: Boolean(record.requires_food_grade), warehouseFragile: Boolean(record.is_fragile),
        oogInGauge: String(record.oog_in_gauge || ''), oogLengthM: String(record.oog_length_m ?? ''), oogWidthM: String(record.oog_width_m ?? ''), oogHeightM: String(record.oog_height_m ?? ''), oogWeightKg: String(record.oog_weight_kg ?? ''),
        requiresAdr: Boolean(record.requires_adr), requiresTailLift: Boolean(record.requires_tail_lift), tollRoadsIncluded: Boolean(record.toll_roads_included), ferryIncluded: Boolean(record.ferry_included), cmrRequired: record.cmr_required == null ? true : Boolean(record.cmr_required), palletExchangeRequired: Boolean(record.pallet_exchange_required), customsRequired: Boolean(record.customs_required), insuranceRequired: Boolean(record.insurance_required), certificationRequired: Boolean(record.certification_required), inspectionServicesRequired: Boolean(record.inspection_services_required), mustBeTrackable: Boolean(record.must_be_trackable), urgent: Boolean(record.is_urgent), receivePriceProposals: record.is_negotiable == null ? true : Boolean(record.is_negotiable), bodyTypes: Array.isArray(record.body_types) ? record.body_types.map(String) : [], notes: String(record.notes || ''), internalComments: String(record.internal_comments || ''), externalComments: String(record.external_comments || ''), contactName: String(contact.name || ''), contactPhone: String(contact.phone || ''), contactMobile: String(contact.mobile || ''), contactEmail: String(contact.email || ''), contactFax: String(contact.fax || ''),
      });
    }).catch((error) => setSubmitError(error instanceof Error ? error.message : u('postLoadModal.loadFetchError', 'The load could not be loaded.'))).finally(() => setIsLoadingExisting(false));
  }, [editLoadId, isOpen]);

  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const pickupRoutePosition = routePosition(draft.pickupLatitude, draft.pickupLongitude);
  const deliveryRoutePosition = routePosition(draft.deliveryLatitude, draft.deliveryLongitude);
  const routeDistanceKm = pickupRoutePosition && deliveryRoutePosition
    ? estimatedDrivingDistanceKm(pickupRoutePosition, deliveryRoutePosition)
    : null;

  // AI prefill often only gives city/address text, not coordinates, so the distance stripe has
  // nothing to compute from. Geocode the missing side(s) once when the Route step is opened -
  // never when a real coordinate is already present, and not on every keystroke while editing.
  const [recalculatingRoute, setRecalculatingRoute] = useState(false);
  useEffect(() => {
    if (step !== 'route') return;
    const needsPickup = !pickupRoutePosition && draft.pickupCity.trim() !== '';
    const needsDelivery = !deliveryRoutePosition && draft.deliveryCity.trim() !== '';
    if (!needsPickup && !needsDelivery) return;

    let cancelled = false;
    setRecalculatingRoute(true);
    (async () => {
      try {
        if (needsPickup) {
          const query = [draft.pickupAddress, draft.pickupCity, draft.pickupCountry].filter(Boolean).join(', ');
          const [result] = await searchLocations(query).catch(() => []);
          if (result && !cancelled) {
            setDraft((current) => ({ ...current, pickupLatitude: String(result.latitude), pickupLongitude: String(result.longitude) }));
          }
        }
        if (needsDelivery && !cancelled) {
          const query = [draft.deliveryAddress, draft.deliveryCity, draft.deliveryCountry].filter(Boolean).join(', ');
          const [result] = await searchLocations(query).catch(() => []);
          if (result && !cancelled) {
            setDraft((current) => ({ ...current, deliveryLatitude: String(result.latitude), deliveryLongitude: String(result.longitude) }));
          }
        }
      } finally {
        if (!cancelled) setRecalculatingRoute(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Only re-run when the step is (re-)opened, not on every keystroke in pickup/delivery fields.
  }, [step]);
  const stepCompletion = useMemo<Record<StepId, boolean>>(
    () => ({
      route: draft.transportType === 'warehouse'
        ? Boolean(draft.pickupCity && draft.pickupDate && draft.deliveryCity && draft.deliveryDate)
        : Boolean(
          draft.pickupCity &&
            draft.pickupDate &&
            draft.deliveryCity &&
            draft.deliveryDate
        ),
      cargo: Boolean(
        (draft.transportType === 'warehouse' || draft.consignee) &&
          draft.transportType &&
          draft.loadTitle.trim() &&
          Number(draft.weightKg) > 0 &&
          Number(draft.lengthM) > 0
      ),
      // Payment moved onto the contact step, so a priced-and-incotermed load is what marks it done
      // alongside a reachable contact. vehicleType is deliberately not part of the cargo rule: it
      // defaults to 'Box Truck' in INITIAL_DRAFT, so it is truthy before the user touches anything.
      contact: Boolean(
        draft.contactName &&
          (draft.contactPhone || draft.contactMobile || draft.contactEmail) &&
          (draft.receivePriceProposals || draft.budget) &&
          draft.incoterm
      ),
      review: true,
    }),
    [draft]
  );

  const setField = <K extends keyof LoadDraft>(key: K, value: LoadDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const invalidFields = useMemo(
    () => new Set(rejected ? rejected.fields.filter((field) => draft[field] === rejected.draft[field]) : []),
    [draft, rejected]
  );
  // Outlines the control(s) inside a field wrapper in red. Passed the draft fields that feed the
  // control, since one message can cover two inputs (a date and its time, say).
  const invalidClass = (...fields: Array<keyof LoadDraft>) =>
    fields.some((field) => invalidFields.has(field)) ? INVALID_FIELD_CLASS : '';

  const rejectSubmit = (issues: ValidationIssues) => {
    setSubmitError(issues.message);
    setRejected({ fields: issues.fields, draft });
    const failingStep = issues.fields.map(stepForField).find(Boolean);
    if (failingStep) setStep(failingStep);
  };

  const rejectFromApi = (error: unknown, fallbackMessage: string) => {
    if (!(error instanceof ApiError)) {
      setSubmitError(fallbackMessage);
      return;
    }
    const described = describeApiErrors(u, error.errors);
    rejectSubmit({ message: described.message || error.message, fields: described.fields });
  };

  const aiFieldCount = Object.keys(aiFilledPatch).length;

  const isAiField = (key: keyof ScanFieldPatch) => aiFilledPatch[key] !== undefined;

  const aiFieldCountByStep = useMemo(() => Object.fromEntries(
    (Object.keys(STEP_AI_FIELDS) as StepId[]).map((id) => [
      id,
      STEP_AI_FIELDS[id].filter((key) => isAiField(key)).length,
    ])
  ) as Record<StepId, number>, [aiFilledPatch]);

  const reprefillField = async <K extends keyof ScanFieldPatch & keyof LoadDraft>(key: K) => {
    const aiValue = aiFilledPatch[key];
    if (aiValue === undefined) return;
    const confirmed = await confirmAction({
      title: u('postLoadModal.confirmRefillTitle', 'Refill this field with AI data?'),
      text: u('postLoadModal.confirmRefillText', 'Your current value will be overwritten with the value LenaAI detected.'),
      confirmText: u('postLoadModal.confirmRefillButton', 'Refill'),
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

  const addContainerSelection = () => {
    setDraft((prev) => ({
      ...prev,
      containerSelections: [...prev.containerSelections, { type: SEA_CONTAINER_TYPES[0].code, quantity: '1' }],
    }));
  };

  const updateContainerSelection = (index: number, patch: Partial<ContainerSelection>) => {
    setDraft((prev) => ({
      ...prev,
      containerSelections: prev.containerSelections.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  };

  const removeContainerSelection = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      containerSelections: prev.containerSelections.filter((_, i) => i !== index),
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

  const toggleCharacteristic = (value: string) => {
    setDraft((prev) => {
      const characteristics = prev.characteristics.includes(value)
        ? prev.characteristics.filter((item) => item !== value)
        : [...prev.characteristics, value];
      return { ...prev, characteristics };
    });
  };

  const toggleLoadingEquipment = (value: string) => {
    setDraft((prev) => ({
      ...prev,
      loadingEquipment: prev.loadingEquipment.includes(value)
        ? prev.loadingEquipment.filter((item) => item !== value)
        : [...prev.loadingEquipment, value],
    }));
  };

  const loadingEquipmentIcon = (option: string): LucideIcon => {
    // Warehouse reuses this row for handling requirements, which have their own glyphs.
    if (option in HANDLING_ICONS) return HANDLING_ICONS[option as keyof typeof HANDLING_ICONS];
    if (option.includes('Forklift')) return Forklift;
    if (option.includes('ramp')) return Truck;
    if (option.includes('Other')) return ShieldCheck;
    if (option.includes('Tail Lift')) return ArrowDownToLine;
    if (option.includes('Cargo Lift') || option.includes('High Loader') || option.includes('Heavy Lift')) return Layers;
    if (option.includes('Pallet Jack') || option.includes('Stuffing')) return Boxes;
    if (option.includes('Roller Bed') || option.includes('Unstuffing')) return RotateCcw;
    if (option.includes('Terminal Handling')) return TrainFront;
    if (option.includes('Crane') || option.includes('Port Handling')) return Ship;
    if (option.includes('Conveyor') || option.includes('Special Handling')) return Wrench;
    return X;
  };

  const LOADING_EQUIPMENT_DESCRIPTIONS: Record<string, string> = {
    'Vehicle with ramp': 'Trailer or truck fitted with a loading ramp',
    'Vehicle without ramp': 'Standard vehicle, no ramp fitted',
    'Forklift: Yes': 'Forklift available for loading and unloading',
    'Forklift: No': 'No forklift available',
    'Other loading/unloading equipment': 'Other equipment as specified in notes',
    'Not specified': 'No handling requirement specified',
    'Forklift Required': 'Forklift needed for loading or unloading',
    'Tail Lift Required': 'Tail lift needed for pickup or delivery',
    'Cargo Lift / High Loader Required': 'High loader needed for aircraft-side handling',
    'Pallet Jack Required': 'Pallet jack needed for ULD or pallet handling',
    'Roller Bed Required': 'Roller bed surface required for transfer',
    'Conveyor Required': 'Conveyor belt required for transfer',
    'No Special Equipment': 'Standard handling, nothing extra required',
    'Other Special Handling Equipment': 'Other equipment as specified in notes',
    'Crane / Heavy Lift': 'Crane or heavy-lift equipment required',
    'Port Handling': 'Port handling services required',
    'Terminal Handling': 'Terminal handling services required',
    'Stuffing Required': 'Container stuffing service required',
    'Unstuffing Required': 'Container unstuffing service required',
    'Special Handling': 'Non-standard handling required',
  };
  const loadingEquipmentDescription = (option: string): string =>
    option in HANDLING_DESCRIPTIONS
      ? u(`postLoadModal.handlingReqDesc.${option}`, HANDLING_DESCRIPTIONS[option as keyof typeof HANDLING_DESCRIPTIONS])
      : u(`postLoadModal.loadingEquipmentDesc.${option}`, LOADING_EQUIPMENT_DESCRIPTIONS[option] || option);

  const SEA_CHARACTERISTIC_ICONS: Record<string, LucideIcon> = {
    'DG / IMO': ShieldAlert,
    REEFER: ThermometerSnowflake,
    OOG: Layers,
    LIQUID: Droplet,
    BULK: Boxes,
    FRAGILE: AlertTriangle,
    HEAVY: Weight,
    VALUABLE: Gem,
    PHARMA: Pill,
    'FOOD GRADE': UtensilsCrossed,
  };

  // DG / IMO and OOG are the only options that need more than a yes: their extra fields open in a
  // popover on the option itself instead of unfolding under the whole grid.
  const characteristicDetail = (option: string) => {
    if (option === 'DG / IMO') {
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <FieldLabel>{u('postLoadModal.dgUnNumber', 'UN Number')}</FieldLabel>
            <Input value={draft.dgUnNumber} onChange={(e) => setField('dgUnNumber', e.target.value)} placeholder="UN 3481" />
          </div>
          <div className="space-y-1">
            <FieldLabel>{u('postLoadModal.dgImoClass', 'IMO Class')}</FieldLabel>
            <Input value={draft.dgImoClass} onChange={(e) => setField('dgImoClass', e.target.value)} placeholder="9" />
          </div>
          <div className="space-y-1">
            <FieldLabel>{u('postLoadModal.dgPackingGroup', 'Packing Group')}</FieldLabel>
            <Input value={draft.dgPackingGroup} onChange={(e) => setField('dgPackingGroup', e.target.value)} placeholder="II" />
          </div>
          <div className="col-span-2 space-y-1">
            <FieldLabel>{u('postLoadModal.dgProperShippingName', 'Proper Shipping Name')}</FieldLabel>
            <Input value={draft.dgProperShippingName} onChange={(e) => setField('dgProperShippingName', e.target.value)} />
          </div>
        </div>
      );
    }
    if (option === 'OOG') {
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <FieldLabel>{u('postLoadModal.oogGauge', 'In gauge / Out of gauge')}</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <ChoiceCard compact active={draft.oogInGauge === 'in_gauge'} title={u('postLoadModal.inGauge', 'In gauge')} icon={Package} onClick={() => setField('oogInGauge', 'in_gauge')} />
              <ChoiceCard compact active={draft.oogInGauge === 'out_of_gauge'} title={u('postLoadModal.outOfGauge', 'Out of gauge')} icon={Layers} onClick={() => setField('oogInGauge', 'out_of_gauge')} />
            </div>
          </div>
          {draft.oogInGauge === 'out_of_gauge' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <FieldLabel>{u('postLoadModal.oogLength', 'Length (m)')}</FieldLabel>
                <Input type="number" min="0" value={draft.oogLengthM} onChange={(e) => setField('oogLengthM', e.target.value)} />
              </div>
              <div className="space-y-1">
                <FieldLabel>{u('postLoadModal.oogWidth', 'Width (m)')}</FieldLabel>
                <Input type="number" min="0" value={draft.oogWidthM} onChange={(e) => setField('oogWidthM', e.target.value)} />
              </div>
              <div className="space-y-1">
                <FieldLabel>{u('postLoadModal.oogHeight', 'Height (m)')}</FieldLabel>
                <Input type="number" min="0" value={draft.oogHeightM} onChange={(e) => setField('oogHeightM', e.target.value)} />
              </div>
              <div className="space-y-1">
                <FieldLabel>{u('postLoadModal.oogWeight', 'Weight (kg)')}</FieldLabel>
                <Input type="number" min="0" value={draft.oogWeightKg} onChange={(e) => setField('oogWeightKg', e.target.value)} />
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  // The corner label: what the popover holds, short enough to read at 10px.
  const characteristicSummary = (option: string): string => {
    if (option === 'DG / IMO') {
      return [draft.dgUnNumber, draft.dgImoClass, draft.dgPackingGroup].filter(Boolean).join(' · ');
    }
    if (option === 'OOG') {
      if (draft.oogInGauge === 'in_gauge') return u('postLoadModal.inGauge', 'In gauge');
      if (draft.oogInGauge !== 'out_of_gauge') return '';
      const dimensions = [draft.oogLengthM, draft.oogWidthM, draft.oogHeightM].filter(Boolean).join('×');
      return dimensions ? `${dimensions} m` : u('postLoadModal.outOfGauge', 'Out of gauge');
    }
    return '';
  };

  const clearCharacteristicDetail = (option: string) => {
    if (option === 'DG / IMO') {
      setDraft((prev) => ({ ...prev, dgUnNumber: '', dgImoClass: '', dgPackingGroup: '', dgProperShippingName: '' }));
    }
    if (option === 'OOG') {
      setDraft((prev) => ({ ...prev, oogInGauge: '', oogLengthM: '', oogWidthM: '', oogHeightM: '', oogWeightKg: '' }));
    }
  };

  // Characteristics render as one merged grid for every transport type now, so the icon lookup has
  // to cover the road and air options too rather than only the sea map above.
  const characteristicIcon = (option: string): LucideIcon =>
    SEA_CHARACTERISTIC_ICONS[option]
      || (option.startsWith('MED') ? FileText
        : option === 'GDP' ? BadgeCheck
        : option === 'TIR' ? Landmark
        : option.startsWith('VAL') ? Gem
        : option.startsWith('Fragile') ? ShieldAlert
        : option.startsWith('Oversized') ? Layers
        : option.startsWith('Lithium') ? Zap
        : option.startsWith('Dry Ice') ? ThermometerSnowflake
        : Package);

  // Sidebar navigation is intentionally unrestricted - AI-fill can populate
  // fields across steps out of order, so gating on completion just gets in the way.
  const canNavigateToStep = (_targetIndex: number) => true;

  const startOver = async () => {
    const confirmed = await confirmAction({
      title: u('postLoadModal.restartTitle', 'Start over?'),
      text: u('postLoadModal.restartText', 'This discards your current progress and any saved draft.'),
      confirmText: u('postLoadModal.restartConfirm', 'Započni ponovo'),
    });
    if (!confirmed) return;
    if (draftId) {
      try {
        await api.loadDrafts.remove(draftId);
      } catch {
        // The draft may already be gone; starting over must not get stuck on this.
      }
    }
    setDraftId(null);
    setDraftSavedAt(null);
    resetDraftState();
  };

  const saveDraft = async () => {
    if (savingDraft) return;
    // A draft may be as empty as the user likes, but a malformed time or date would still be
    // rejected by the API with a message about a payload field nobody recognises.
    const issues = validateDraft(u, draft, 'draft');
    if (issues) {
      rejectSubmit(issues);
      return;
    }
    setSavingDraft(true);
    setSubmitError('');
    setRejected(null);
    try {
      const payload = buildDraftPayload(draft);
      if (draftId) {
        await api.loadDrafts.update(draftId, payload);
      } else {
        const response = await api.loadDrafts.create(payload);
        const newDraftId = response.data.id as string | number;
        setDraftId(newDraftId);
        // First manual save of a draft that was never opened from an existing LenaAI
        // conversation - give it one now so the user can keep chatting about it afterward.
        if (!sourceConversationId && currentUser) {
          try {
            const companyId = Number((currentUser.companies?.[0] as { id?: number } | undefined)?.id);
            const created = await api.conversations.create({
              company_id: Number.isFinite(companyId) ? companyId : undefined,
              created_by_user_id: currentUser.id,
              channel: 'inapp',
              subject: `${AI_DISPATCH_SUBJECT_PREFIX}${draft.loadTitle || u('postLoadModal.draftFallbackTitle', 'Draft')}`,
              canvas: true,
              load_draft_id: newDraftId,
              last_message_at: new Date().toISOString(),
              participant_ids: [currentUser.id],
            });
            onDraftConversationCreated?.(String(created.data.id));
          } catch {
            // Non-critical - the draft itself is already safely saved either way.
          }
        }
      }
      setDraftSavedAt(new Date());
      void showSuccess(u('postLoadModal.draftSavedTitle', 'Draft saved'), u('postLoadModal.draftSavedText', 'Your progress has been saved.'));
    } catch (error) {
      rejectFromApi(error, u('postLoadModal.draftSaveError', 'The draft could not be saved.'));
    } finally {
      setSavingDraft(false);
    }
  };

  const searchHsCatalog = async () => {
    const query = hsQuery.trim() || draft.goodsType.trim();
    if (query.length < 2 || hsSearching) return;
    setHsSearching(true);
    try {
      const response = await api.hsCodes.search(query, 25, lang);
      setHsSuggestions(response.data);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : u('HS catalog search failed', 'HS catalog search failed'));
    } finally {
      setHsSearching(false);
    }
  };

  // Debounce mirrors the timing used for location suggestions elsewhere in the app
  // (useLocationAutocomplete).
  useEffect(() => {
    if (hsQuery.trim().length < 2) return undefined;
    const timer = window.setTimeout(() => void searchHsCatalog(), 350);
    return () => window.clearTimeout(timer);
  }, [hsQuery]);

  const addHsCode = (item: HsCodeMatch) => {
    setDraft((current) => ({
      ...current,
      hsCodes: current.hsCodes.some((existing) => existing.code === item.code)
        ? current.hsCodes
        : [...current.hsCodes, item],
    }));
    setHsQuery('');
    setHsSuggestions([]);
  };

  const removeHsCode = (code: string) => {
    setDraft((current) => ({ ...current, hsCodes: current.hsCodes.filter((item) => item.code !== code) }));
  };

  // Shared by the plain "Objavi" button and the "Objavi + Last Mile Delivery" flow below - the
  // latter needs to know whether the publish actually succeeded before it goes on to create a
  // second draft/conversation, without showing its own duplicate confirm prompt.
  const publishLoad = async (): Promise<boolean> => {
    const issues = validateDraft(u, draft);
    if (issues) {
      rejectSubmit(issues);
      return false;
    }
    setIsSubmitting(true);
    setSubmitError('');
    setRejected(null);
    try {
      // Keep chapterCode/chapterName (and heading) alongside code/description/confidence so the
      // category icon shown on a pill stays correct after the load is saved and reloaded for
      // editing, instead of falling back to the generic icon once that context is stripped.
      const payload = buildLoadPayload(draft);
      const response = editLoadId
        ? await api.loads.update(editLoadId, payload)
        : await api.loads.create({ ...payload, status: 'posted', published_at: new Date().toISOString() });
      // Publishing a load built through the LenaAI canvas finally links the conversation that
      // built it to the real load record, and turns canvas mode off — the next message in that
      // conversation then automatically gets full load-scoped Q&A (DispatchChatController branches
      // its whole prompt on conversation.freightLoad), so the user can keep asking about the route.
      if (!editLoadId && sourceConversationId) {
        try {
          await api.conversations.update(sourceConversationId, { load_id: response.data.id, canvas: false });
        } catch {
          // The load is already published; a failed link-back must not surface as a publish error.
        }
      }
      onSaved?.(response.data);
      onClose();
      void showSuccess(
        editLoadId ? u('postLoadModal.updatedTitle', 'Load updated') : u('postLoadModal.publishedTitle', 'Load published'),
        editLoadId ? u('postLoadModal.updatedText', 'Your changes are now live.') : u('postLoadModal.publishedText', 'The load is now available in the freight exchange.'),
      );
      return true;
    } catch (error) {
      rejectFromApi(error, u('postLoadModal.apiError', 'The load could not be published.'));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const publishWarehouseLoad = async (): Promise<boolean> => {
    const issues = validateDraft(u, draft);
    if (issues) {
      rejectSubmit(issues);
      return false;
    }
    setIsSubmitting(true);
    setSubmitError('');
    setRejected(null);
    try {
      const payload = buildWarehouseLoadPayload(draft);
      const response = await api.loads.create(payload);
      onSaved?.(response.data);
      onClose();
      void showSuccess(
        u('postLoadModal.warehousePublishedTitle', 'Warehouse request published'),
        u('postLoadModal.warehousePublishedText', 'The storage request is now visible to warehouse companies.'),
      );
      return true;
    } catch (error) {
      rejectFromApi(error, u('postLoadModal.apiError', 'The load could not be published.'));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const submit = async () => {
    if (isSubmitting) return;
    if (draft.transportType === 'warehouse') {
      const confirmed = await confirmAction({
        title: u('postLoadModal.publishWarehouseTitle', 'Objava na berzu skladišta?'),
        text: editLoadId
          ? u('postLoadModal.publishWarehouseText', 'Are you sure you want to post this storage request to the warehouse exchange? It will become visible to warehouse companies.')
          : u('postLoadModal.publishWarehouseWithTransportText', 'The storage request will be posted to the warehouse exchange, and a road transport draft to that warehouse will be prepared for you to finish with LenaAI.'),
        confirmText: u('postLoadModal.publishConfirm', 'Objavi'),
      });
      if (!confirmed) return;
      const published = await publishWarehouseLoad();
      // Only a freshly posted request needs the transport leg - re-saving an existing one would
      // hand the user a second, duplicate road draft for a route they already have.
      if (published && !editLoadId) await startWarehouseTransportDraft();
      return;
    }
    const confirmed = await confirmAction({
      title: editLoadId ? u('postLoadModal.saveChangesTitle', 'Save load changes?') : u('postLoadModal.publishTitle', 'Objava na berzu tereta?'),
      text: editLoadId
        ? u('postLoadModal.saveChangesText', 'The updated load details will be visible in the freight exchange.')
        : u('postLoadModal.publishText', 'Are you sure you want to post this load to the freight exchange? It will become visible to carriers.'),
      confirmText: editLoadId ? u('common.save', 'Save changes') : u('postLoadModal.publishConfirm', 'Objavi'),
    });
    if (!confirmed) return;
    await publishLoad();
  };

  // Publishing a storage request only covers the storing - the goods still have to reach that
  // warehouse. Same machinery as the last-mile flow below: a pre-filled road draft plus a LenaAI
  // conversation to finish it, so the customer never re-types the route they just entered.
  const startWarehouseTransportDraft = async () => {
    if (!currentUser) return;
    try {
      const transportDraft: LoadDraft = {
        ...INITIAL_DRAFT,
        transportType: 'road',
        loadTitle: `${draft.loadTitle || u('postLoadModal.draftFallbackTitle', 'Draft')} - ${u('postLoadModal.warehouseTransportSuffix', 'Transport to warehouse')}`,
        pickupPlaceType: draft.pickupPlaceType,
        pickupAddress: draft.pickupAddress,
        pickupCity: draft.pickupCity,
        pickupPostalCode: draft.pickupPostalCode,
        pickupCountry: draft.pickupCountry,
        pickupLatitude: draft.pickupLatitude,
        pickupLongitude: draft.pickupLongitude,
        pickupDate: draft.pickupDate,
        pickupDateTo: draft.pickupDateTo,
        pickupTimeFrom: draft.pickupTimeFrom,
        pickupTimeTo: draft.pickupTimeTo,
        // Road only offers Warehouse/Terminal as delivery place types, and an area request has no
        // one address to deliver to - the picked area's label and centre are what the AI works from.
        deliveryPlaceType: 'Warehouse',
        deliveryAddress: draft.deliveryAddress,
        deliveryCity: draft.deliveryCity,
        deliveryPostalCode: draft.deliveryPostalCode,
        deliveryCountry: draft.deliveryCountry,
        deliveryLatitude: draft.deliveryLatitude,
        deliveryLongitude: draft.deliveryLongitude,
        deliveryDate: draft.deliveryDate,
        deliveryDateTo: draft.deliveryDateTo,
        deliveryTimeFrom: draft.deliveryTimeFrom,
        deliveryTimeTo: draft.deliveryTimeTo,
        // The cargo was just described on the storage request, so it carries over rather than
        // being asked for a second time in the chat.
        pallets: draft.pallets,
        volumeM3: draft.volumeM3,
        weightKg: draft.weightKg,
        goodsType: draft.goodsType,
        cargoType: draft.cargoType,
      };
      const draftResponse = await api.loadDrafts.create(buildDraftPayload(transportDraft));
      const newDraftId = draftResponse.data.id as string | number;

      const companyId = Number((currentUser.companies?.[0] as { id?: number } | undefined)?.id);
      const conversationResponse = await api.conversations.create({
        company_id: Number.isFinite(companyId) ? companyId : undefined,
        created_by_user_id: currentUser.id,
        channel: 'inapp',
        subject: `${AI_DISPATCH_SUBJECT_PREFIX}${u('postLoadModal.warehouseTransportSuffix', 'Transport to warehouse')} - ${draft.loadTitle || u('postLoadModal.draftFallbackTitle', 'Draft')}`,
        canvas: true,
        load_draft_id: newDraftId,
        last_message_at: new Date().toISOString(),
        participant_ids: [currentUser.id],
        initial_message: u(
          'postLoadModal.warehouseTransportWelcomeMessage',
          'Congratulations, you successfully posted your storage request! We can also make sure your cargo reaches the warehouse safely - let us prepare the road transport to it together.'
        ),
      });
      const newConversationId = String(conversationResponse.data.id);

      try {
        await api.messages.create({
          conversation_id: newConversationId,
          sender_user_id: currentUser.id,
          body: '[[LENA_ACTION:continue_add_yes]]',
          sent_at: new Date().toISOString(),
        });
        await api.dispatchChat.reply(Number(newConversationId), lang);
      } catch {
        // The draft and conversation already exist either way - the user can still tap "Yes"
        // themselves if the auto-advance turn failed.
      }

      onDraftConversationCreated?.(newConversationId);
    } catch {
      // The storage request itself is already published; a failed follow-up draft must not be
      // reported as if the whole publish had failed.
    }
  };

  // Air/Sea loads whose delivery is a straight door address can also spin up a pre-filled road
  // draft for the airport/port-to-door leg in the same click, instead of the user having to
  // publish, then separately start a whole new Post Load flow and re-type the same address.
  const isLastMileEligible = (draft.transportType === 'air' && draft.deliveryPlaceType === 'Address + Last Mile Delivery')
    || (isContainerTransport(draft.transportType) && draft.deliveryPlaceType === 'Port to Door');

  const submitWithLastMile = async () => {
    if (isSubmitting) return;
    const confirmed = await confirmAction({
      title: u('postLoadModal.publishLastMileTitle', 'Post load and start door delivery?'),
      text: u('postLoadModal.publishLastMileText', 'This will post the load to the freight exchange and create a new road draft for delivery from the terminal to your address.'),
      confirmText: u('postLoadModal.publishLastMileConfirm', 'Post + Last Mile'),
    });
    if (!confirmed) return;

    const published = await publishLoad();
    if (!published || !currentUser) return;

    try {
      const lastMileDraft: LoadDraft = {
        ...INITIAL_DRAFT,
        transportType: 'road',
        loadTitle: `${draft.loadTitle || u('postLoadModal.draftFallbackTitle', 'Draft')} - Last Mile Delivery`,
        pickupPlaceType: 'Terminal',
        pickupCity: draft.deliveryCity,
        pickupCountry: draft.deliveryCountry,
        // deliveryPlaceType stays at INITIAL_DRAFT's 'Warehouse' default - road only offers
        // Warehouse/Terminal as place types, and the address field itself is collected either way.
        deliveryAddress: draft.deliveryAddress,
        deliveryCity: draft.deliveryCity,
        deliveryPostalCode: draft.deliveryPostalCode,
        deliveryCountry: draft.deliveryCountry,
        deliveryLatitude: draft.deliveryLatitude,
        deliveryLongitude: draft.deliveryLongitude,
      };
      const draftResponse = await api.loadDrafts.create(buildDraftPayload(lastMileDraft));
      const newDraftId = draftResponse.data.id as string | number;

      const companyId = Number((currentUser.companies?.[0] as { id?: number } | undefined)?.id);
      const initialMessage = u(
        'postLoadModal.lastMileWelcomeMessage',
        'Congratulations, you successfully posted the load and chose the last-mile delivery option! I can now help you create additional road transport for the cargo to your home door.'
      );
      const conversationResponse = await api.conversations.create({
        company_id: Number.isFinite(companyId) ? companyId : undefined,
        created_by_user_id: currentUser.id,
        channel: 'inapp',
        subject: `${AI_DISPATCH_SUBJECT_PREFIX}${u('postLoadModal.lastMileSubjectPrefix', 'Last Mile Delivery')} - ${draft.loadTitle || u('postLoadModal.draftFallbackTitle', 'Draft')}`,
        canvas: true,
        load_draft_id: newDraftId,
        last_message_at: new Date().toISOString(),
        participant_ids: [currentUser.id],
        initial_message: initialMessage,
      });
      const newConversationId = String(conversationResponse.data.id);

      // Auto-advance the guide past the "continue?" prompt so the user lands directly on the
      // first real missing-field question instead of having to click "Yes" themselves - mirrors
      // what useLenaAiChat's sendQuickAction('continue_add_yes') does under the hood.
      try {
        await api.messages.create({
          conversation_id: newConversationId,
          sender_user_id: currentUser.id,
          body: '[[LENA_ACTION:continue_add_yes]]',
          sent_at: new Date().toISOString(),
        });
        await api.dispatchChat.reply(Number(newConversationId), lang);
      } catch {
        // The draft and conversation already exist either way - the user can still tap "Yes"
        // themselves if the auto-advance turn failed.
      }

      onDraftConversationCreated?.(newConversationId);
    } catch {
      // The load itself already published successfully; a failed last-mile draft/conversation
      // must not be reported as if the whole action failed.
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (isLoadingExisting ? (
        <motion.div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}><motion.div className="rounded-2xl bg-white px-6 py-5 font-bold text-slate-700 shadow-2xl dark:bg-slate-900 dark:text-white" initial={{ opacity: 0, y: 24, scale: 0.992 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.996 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>Loading load...</motion.div></motion.div>
      ) : (
    <motion.div
      className="fixed inset-0 z-[200] flex items-stretch justify-center overflow-hidden bg-slate-950/70 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <AreaMapModal
        open={areaMapOpen}
        lang={lang}
        title={u('postLoadModal.warehousePreferredArea', 'Preferred area')}
        initialQuery={draft.deliveryAddress || draft.deliveryCity}
        initialPosition={draft.deliveryLatitude && draft.deliveryLongitude
          ? [Number(draft.deliveryLatitude), Number(draft.deliveryLongitude)]
          : null}
        initialRadiusKm={Number(draft.deliveryRadiusKm) || 25}
        onClose={() => setAreaMapOpen(false)}
        onSelect={(location, radiusKm) => {
          setDraft((current) => ({
            ...current,
            deliveryPlaceType: 'Area',
            deliveryAddress: location.label,
            deliveryCity: location.city || current.deliveryCity,
            deliveryCountry: location.countryCode || current.deliveryCountry,
            deliveryLatitude: String(location.latitude),
            deliveryLongitude: String(location.longitude),
            deliveryRadiusKm: String(radiusKm),
          }));
          setAreaMapOpen(false);
        }}
      />
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
      {pickupRoutePosition && deliveryRoutePosition && (
        <RouteMapModal
          open={routeMapOpen}
          lang={lang}
          pickup={{ label: draft.pickupAddress || draft.pickupCity, position: pickupRoutePosition }}
          delivery={{ label: draft.deliveryAddress || draft.deliveryCity, position: deliveryRoutePosition }}
          onClose={() => setRouteMapOpen(false)}
        />
      )}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.992 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, y: 16, scale: 0.996 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden rounded-none border-0 bg-white shadow-2xl dark:bg-slate-900"
      >
        <div className="sticky top-0 z-20 border-b border-slate-100 dark:border-slate-800 bg-white/96 dark:bg-slate-900/96 backdrop-blur-sm">
          <div className="h-16 px-5 md:px-7 flex items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3 min-w-0">
              <div className="w-9 h-9 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                <Plus className="text-primary w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <input
                  value={draft.loadTitle}
                  onChange={(e) => setField('loadTitle', e.target.value)}
                  placeholder={editLoadId ? u('postLoadModal.editTitle', 'Edit Load') : u('postLoadModal.titlePlaceholder', 'Enter load title')}
                  className={cn(
                    'w-full max-w-md bg-transparent text-base md:text-lg font-black tracking-tight dark:text-white leading-tight truncate outline-none cursor-text rounded-md focus:ring-2 focus:ring-primary/40 -mx-1 px-1',
                    invalidFields.has('loadTitle') && 'ring-2 ring-rose-500/60 bg-rose-50/70 dark:bg-rose-950/20'
                  )}
                />
                <p className="hidden sm:block text-xs text-slate-500 mt-0.5 max-w-2xl truncate">
                  {u(
                    'postLoadModal.subtitle',
                    'Create a structured freight request drivers can evaluate and accept quickly'
                  )}
                </p>
              </div>
            </div>
            <div className="hidden xl:flex shrink-0 items-center gap-3 text-slate-500">
              <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-bold">
                {step === 'route' && <MapPin className="w-4 h-4 text-primary" />}
                {step === 'cargo' && <Package className="w-4 h-4 text-primary" />}
                {step === 'contact' && <UserRound className="w-4 h-4 text-primary" />}
                {step === 'review' && <FileText className="w-4 h-4 text-primary" />}
                <span>
                  {u('postLoadModal.stepLabel', 'Step')} {stepIndex + 1} / {STEPS.length}
                </span>
              </div>
              {activeTransportOption && (
                <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                  <activeTransportOption.icon className="w-4 h-4" />
                  <span>{activeTransportOption.label}</span>
                </div>
              )}
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
              className="shrink-0 h-10 w-10 cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
              aria-label={u('common.cancel', 'Cancel')}
              title={u('common.cancel', 'Cancel')}
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="px-4 sm:px-5 md:px-6 pb-4 sm:pb-5 md:pb-6 xl:hidden">
            <div className="flex flex-wrap items-center gap-3 text-slate-500">
              <div className="inline-flex items-center gap-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 text-xs font-bold">
                {step === 'route' && <MapPin className="w-4 h-4 text-primary" />}
                {step === 'cargo' && <Package className="w-4 h-4 text-primary" />}
                {step === 'contact' && <UserRound className="w-4 h-4 text-primary" />}
                {step === 'review' && <FileText className="w-4 h-4 text-primary" />}
                <span>
                  {u('postLoadModal.stepLabel', 'Step')} {stepIndex + 1} / {STEPS.length}
                </span>
              </div>
              {activeTransportOption && (
                <div className="hidden md:flex items-center gap-2 text-xs">
                  <activeTransportOption.icon className="w-4 h-4" />
                  <span>{activeTransportOption.label}</span>
                </div>
              )}
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

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 overflow-x-auto border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 px-4 py-3 sm:px-6">
            {/* Equal-width columns plus one continuous line behind them, so the distance between
                every pair of circles is identical no matter how wide the labels are or how many
                steps the current transport type has. */}
            <div className="relative flex w-full items-start">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-3.5 z-0 h-px bg-slate-200 dark:bg-slate-700"
                style={{ left: `${50 / STEPS.length}%`, right: `${50 / STEPS.length}%` }}
              />
              {STEPS.map((item, index) => {
                const Icon = item.icon;
                const isActive = item.id === step;
                const isDone = stepCompletion[item.id];
                const isClickable = canNavigateToStep(index);
                const title =
                  item.id === 'route'
                    ? u('postLoadModal.step.route', 'Route & Timing')
                    : item.id === 'cargo'
                      ? u('postLoadModal.step.cargo', 'Details & Terms')
                      : item.id === 'contact'
                        ? u('postLoadModal.step.contact', 'Payment & Contact')
                        : u('postLoadModal.step.review', 'Review');

                // Each step is its own natural-width column (icon centered over its label, however
                // wide that label is) and the connector between two steps is the only flex-1
                // element - so every gap gets an equal share of the leftover space and reads as the
                // same length, instead of stretching unevenly based on neighboring label widths.
                return [
                  <button
                    key={`${item.id}-step`}
                    type="button"
                    onClick={() => {
                      if (!isClickable) return;
                      setStep(item.id);
                    }}
                    disabled={!isClickable}
                    className={cn('relative z-10 flex min-w-[6.5rem] flex-1 basis-0 flex-col items-center gap-1.5 px-1', isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60')}
                  >
                    <span
                      className={cn(
                        // Opaque and above the connector, so the line that runs behind the column
                        // is masked exactly at the circle's edge instead of stopping short of it.
                        'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        isDone
                          ? 'bg-emerald-500 text-white'
                          : isActive
                            ? 'bg-primary text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      )}
                    >
                      {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className={cn('whitespace-nowrap text-[11px] font-bold', isActive ? 'text-primary' : isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400')}>
                        {title}
                      </span>
                      {aiFieldCountByStep[item.id] > 0 && (
                        <span
                          title={u('postLoadModal.aiFilledCount', 'fields from AI')}
                          className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-primary/10 px-1 py-0.5 text-[9px] font-bold text-primary"
                        >
                          <Sparkles className="h-2 w-2" />
                          {aiFieldCountByStep[item.id]}
                        </span>
                      )}
                    </span>
                  </button>,
                ];
              })}
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div ref={contentScrollRef} className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-3 pb-6 sm:p-4 sm:pb-6 md:p-4 md:pb-8">
              <AnimatePresence mode="wait">
              {step === 'route' && (
                <motion.div key="route" className="space-y-3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
                  {draft.transportType === 'warehouse' ? (
                    <WarehouseLocationFields draft={draft} setField={setField} setDraft={setDraft} u={u} lang={lang} invalidClass={invalidClass} onOpenPickupMap={() => setAddressMap('pickup')} onOpenWarehouseArea={() => setAreaMapOpen(true)} routeDistanceKm={routeDistanceKm} recalculatingRoute={recalculatingRoute} onShowRoute={() => setRouteMapOpen(true)} />
                  ) : (
                  <>
                  <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,5fr)_minmax(0,2fr)] gap-3">
                    <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="flex items-center gap-2 text-emerald-500">
                        <MapPin className="w-4 h-4" />
                        <p className="text-xs font-black uppercase tracking-wider">
                          {isContainerTransport(draft.transportType) ? u('postLoadModal.originBlock', 'Origin') : u('postLoadModal.pickupBlock', 'Pickup')}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <FieldLabel>{isContainerTransport(draft.transportType) ? u('postLoadModal.seaOriginType', 'Origin type') : u('postLoadModal.pickupPlaceType', 'Place type')}</FieldLabel>
                        <div className={cn('grid gap-3', draft.transportType === 'road' ? 'grid-cols-3' : 'grid-cols-2')}>
                          {(isContainerTransport(draft.transportType)
                            // Rail keeps sea's leg-type values so the door/terminal logic below is
                            // shared; only the label changes, because a rail leg starts at an
                            // intermodal terminal rather than a port.
                            ? [
                                { value: 'Port to Port', label: draft.transportType === 'rail' ? u('postLoadModal.terminal', 'Terminal') : u('postLoadModal.portToPort', 'Port'), icon: draft.transportType === 'rail' ? TrainFront : Ship },
                                { value: 'Door to Port', label: u('postLoadModal.doorToPort', 'Address'), icon: Truck },
                              ]
                            : draft.transportType === 'air'
                            ? [
                                { value: 'Warehouse', label: u('postLoadModal.warehouse', 'Warehouse'), icon: Warehouse },
                                { value: 'Terminal', label: u('postLoadModal.terminal', 'Terminal'), icon: Building2 },
                                { value: 'AOL / Airport of loading', label: 'AOL / Airport of loading', icon: PlaneLanding },
                                { value: 'Address', label: u('postLoadModal.address', 'Address'), icon: MapPin },
                              ]
                            : [
                                { value: 'Warehouse', label: u('postLoadModal.warehouse', 'Warehouse'), icon: Warehouse },
                                { value: 'Port', label: u('postLoadModal.portToPort', 'Port'), icon: Ship },
                                { value: 'Airport', label: u('postLoadModal.airportPlaceType', 'Airport'), icon: PlaneLanding },
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
                      <div className={cn(
                        ((isContainerTransport(draft.transportType) && draft.pickupPlaceType !== 'Port to Port') ||
                          (draft.transportType === 'air' && draft.pickupPlaceType !== 'AOL / Airport of loading') ||
                          (draft.transportType === 'road' && (draft.pickupPlaceType === 'Port' || draft.pickupPlaceType === 'Airport'))) &&
                        'grid gap-3 sm:grid-cols-2'
                      )}>
                        {(isContainerTransport(draft.transportType) || (draft.transportType === 'road' && draft.pickupPlaceType === 'Port')) && (
                          <div className={cn('space-y-1', invalidClass('pickupPort'))}>
                            <FieldLabel>
                              {draft.transportType === 'rail'
                                ? u('postLoadModal.railTerminalOfLoading', 'Loading terminal')
                                : isContainerTransport(draft.transportType) ? u('postLoadModal.pol', 'Loading Port (POL)') : u('postLoadModal.portToPort', 'Port')}
                            </FieldLabel>
                            {/* There is no terminal directory behind this the way SEA_PORTS backs the
                                port picker, so rail takes the name as typed. */}
                            {draft.transportType === 'rail' ? (
                              <Input
                                value={draft.pickupPort}
                                onChange={(event) => setField('pickupPort', event.target.value)}
                                placeholder={u('postLoadModal.railTerminalPlaceholder', 'Terminal name and city')}
                              />
                            ) : (
                              <PortAutocompleteField
                                value={draft.pickupPort}
                                onChange={(value) => setField('pickupPort', value)}
                                onSelectPort={(port) => setDraft((current) => ({
                                  ...current,
                                  pickupPort: `${port.port} - ${port.unlocode} - ${port.country}`,
                                  pickupCity: port.city,
                                  pickupCountry: port.countryCode,
                                }))}
                                placeholder={u('postLoadModal.portSearchPlaceholder', 'Search ports')}
                              />
                            )}
                          </div>
                        )}
                        {(draft.transportType === 'air' || (draft.transportType === 'road' && draft.pickupPlaceType === 'Airport')) && (
                          <div className={cn('space-y-1', invalidClass('pickupAirport'))}>
                            <FieldLabel>{draft.transportType === 'air' ? u('postLoadModal.aol', 'Loading Airport (AOL)') : u('postLoadModal.airportPlaceType', 'Airport')}</FieldLabel>
                            <AirportAutocompleteField
                              value={draft.pickupAirport}
                              onChange={(value) => setField('pickupAirport', value)}
                              onSelectAirport={(airport) => setDraft((current) => ({
                                ...current,
                                pickupAirport: `${airport.name} (${airport.iata}) — ${airport.city}, ${airport.country}`,
                                pickupCity: airport.city,
                                pickupCountry: airport.countryCode,
                              }))}
                              placeholder={u('postLoadModal.airportSearchPlaceholder', 'Search airport, city or IATA code')}
                            />
                          </div>
                        )}
                        {(
                          (!isContainerTransport(draft.transportType) || draft.pickupPlaceType !== 'Port to Port') &&
                          (draft.transportType !== 'air' || draft.pickupPlaceType !== 'AOL / Airport of loading')
                        ) && (
                          <div className={cn('space-y-1', invalidClass('pickupAddress'))}>
                            <FieldLabel>
                              {isContainerTransport(draft.transportType) ? u('postLoadModal.doorAddress', 'Pickup/Delivery Address (Door)') : u('postLoadModal.pickupAddress', 'Pickup address')}
                            </FieldLabel>
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
                              placeholder={u('postLoadModal.pickupAddressPlaceholder', 'Search places or click the map')}
                              onOpenMap={() => setAddressMap('pickup')}
                              mapButtonLabel={u('map.choosePickup', 'Choose pickup address on map')}
                              mapButtonIcon={MapGlyphIcon}
                              accentClassName="text-emerald-500"
                            />
                          </div>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-[200px_140px_minmax(0,1fr)] gap-3">
                        <div className={cn('space-y-1', invalidClass('pickupCountry'))}>
                          {fieldLabel('pickupCountry', 'postLoadModal.pickupCountryShort', 'Country')}
                          <CountrySelect value={draft.pickupCountry} onChange={(value) => setField('pickupCountry', value)} placeholder={u('postLoadModal.selectCountry', 'Select country')} />
                        </div>
                        <div className={cn('space-y-1', invalidClass('pickupPostalCode'))}>
                          {fieldLabel('pickupPostalCode', 'postLoadModal.pickupPostalCode', 'Postal code')}
                          <Input value={draft.pickupPostalCode} onChange={(event) => setField('pickupPostalCode', event.target.value)} placeholder={u('postLoadModal.postalCodePlaceholder', 'Postal code')} />
                        </div>
                        <div className={cn('space-y-1', invalidClass('pickupCity'))}>
                          {fieldLabel('pickupCity', 'postLoadModal.pickupCity', 'City')}
                          <Input value={draft.pickupCity} onChange={(event) => setField('pickupCity', event.target.value)} placeholder={u('postLoadModal.cityCountry', 'City')} />
                        </div>
                      </div>
                      {draft.transportType === 'road' && (
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className={cn('flex h-full flex-col justify-between space-y-1', invalidClass('pickupDate'))}>
                              {fieldLabel('pickupDate', 'postLoadModal.pickupDate', 'Date from')}
                              <DateInput
                                value={draft.pickupDate}
                                onChange={(value) => setField('pickupDate', value)}
                                placeholder="dd.mm.yyyy"
                                lang={lang}
                              />
                            </div>
                            <div className={cn('flex h-full flex-col justify-between space-y-1', invalidClass('pickupDateTo'))}>
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
                            <div className={cn('flex h-full flex-col justify-between space-y-1', invalidClass('pickupTimeFrom'))}>
                              <FieldLabel>{u('postLoadModal.pickupTimeFrom', 'Time from')}</FieldLabel>
                              <TimeInput
                                value={draft.pickupTimeFrom}
                                onChange={(value) => setField('pickupTimeFrom', value)}
                                placeholder="hh:mm"
                              />
                            </div>
                            <div className={cn('flex h-full flex-col justify-between space-y-1', invalidClass('pickupTimeTo'))}>
                              <FieldLabel>{u('postLoadModal.pickupTimeTo', 'Time to')}</FieldLabel>
                              <TimeInput
                                value={draft.pickupTimeTo}
                                onChange={(value) => setField('pickupTimeTo', value)}
                                placeholder="hh:mm"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="flex items-center gap-2 text-blue-500">
                        <Truck className="w-4 h-4" />
                        <p className="text-xs font-black uppercase tracking-wider">
                          {isContainerTransport(draft.transportType) ? u('postLoadModal.destinationBlock', 'Destination') : u('postLoadModal.deliveryBlock', 'Delivery')}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <FieldLabel>{isContainerTransport(draft.transportType) ? u('postLoadModal.seaDestinationType', 'Destination type') : u('postLoadModal.deliveryPlaceType', 'Place type')}</FieldLabel>
                        <div className={cn('grid gap-3', draft.transportType === 'road' ? 'grid-cols-3' : 'grid-cols-2')}>
                          {(isContainerTransport(draft.transportType)
                            ? [
                                { value: 'Port to Port', label: draft.transportType === 'rail' ? u('postLoadModal.terminal', 'Terminal') : u('postLoadModal.portToPort', 'Port'), icon: draft.transportType === 'rail' ? TrainFront : Ship },
                                { value: 'Port to Door', label: u('postLoadModal.portToDoor', 'Address'), icon: Truck },
                              ]
                            : draft.transportType === 'air'
                            ? [
                                { value: 'Warehouse', label: u('postLoadModal.warehouse', 'Warehouse'), icon: Warehouse },
                                { value: 'Terminal', label: u('postLoadModal.terminal', 'Terminal'), icon: Building2 },
                                { value: 'AOD / Airport of delivery', label: 'AOD / Airport of delivery', icon: PlaneLanding },
                                { value: 'Address + Last Mile Delivery', label: u('postLoadModal.addressLastMile', 'Address + Last Mile Delivery'), icon: MapPin },
                              ]
                            : [
                                { value: 'Warehouse', label: u('postLoadModal.warehouse', 'Warehouse'), icon: Warehouse },
                                { value: 'Port', label: u('postLoadModal.portToPort', 'Port'), icon: Ship },
                                { value: 'Airport', label: u('postLoadModal.airportPlaceType', 'Airport'), icon: PlaneLanding },
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
                      <div className={cn(
                        ((isContainerTransport(draft.transportType) && draft.deliveryPlaceType !== 'Port to Port') ||
                          (draft.transportType === 'air' && draft.deliveryPlaceType !== 'AOD / Airport of delivery') ||
                          (draft.transportType === 'road' && (draft.deliveryPlaceType === 'Port' || draft.deliveryPlaceType === 'Airport'))) &&
                        'grid gap-3 sm:grid-cols-2'
                      )}>
                        {(isContainerTransport(draft.transportType) || (draft.transportType === 'road' && draft.deliveryPlaceType === 'Port')) && (
                          <div className={cn('space-y-1', invalidClass('deliveryPort'))}>
                            <FieldLabel>
                              {draft.transportType === 'rail'
                                ? u('postLoadModal.railTerminalOfDelivery', 'Destination terminal')
                                : isContainerTransport(draft.transportType) ? u('postLoadModal.pod', 'Discharge Port (POD)') : u('postLoadModal.portToPort', 'Port')}
                            </FieldLabel>
                            {draft.transportType === 'rail' ? (
                              <Input
                                value={draft.deliveryPort}
                                onChange={(event) => setField('deliveryPort', event.target.value)}
                                placeholder={u('postLoadModal.railTerminalPlaceholder', 'Terminal name and city')}
                              />
                            ) : (
                              <PortAutocompleteField
                                value={draft.deliveryPort}
                                onChange={(value) => setField('deliveryPort', value)}
                                onSelectPort={(port) => setDraft((current) => ({
                                  ...current,
                                  deliveryPort: `${port.port} - ${port.unlocode} - ${port.country}`,
                                  deliveryCity: port.city,
                                  deliveryCountry: port.countryCode,
                                }))}
                                placeholder={u('postLoadModal.portSearchPlaceholder', 'Search ports')}
                              />
                            )}
                          </div>
                        )}
                        {(draft.transportType === 'air' || (draft.transportType === 'road' && draft.deliveryPlaceType === 'Airport')) && (
                          <div className={cn('space-y-1', invalidClass('deliveryAirport'))}>
                            <FieldLabel>{draft.transportType === 'air' ? u('postLoadModal.aod', 'Discharge Airport (AOD)') : u('postLoadModal.airportPlaceType', 'Airport')}</FieldLabel>
                            <AirportAutocompleteField
                              value={draft.deliveryAirport}
                              onChange={(value) => setField('deliveryAirport', value)}
                              onSelectAirport={(airport) => setDraft((current) => ({
                                ...current,
                                deliveryAirport: `${airport.name} (${airport.iata}) — ${airport.city}, ${airport.country}`,
                                deliveryCity: airport.city,
                                deliveryCountry: airport.countryCode,
                              }))}
                              placeholder={u('postLoadModal.airportSearchPlaceholder', 'Search airport, city or IATA code')}
                            />
                          </div>
                        )}
                        {(
                          (!isContainerTransport(draft.transportType) || draft.deliveryPlaceType !== 'Port to Port') &&
                          (draft.transportType !== 'air' || draft.deliveryPlaceType !== 'AOD / Airport of delivery')
                        ) && (
                          <div className={cn('space-y-1', invalidClass('deliveryAddress'))}>
                            <FieldLabel>
                              {isContainerTransport(draft.transportType) ? u('postLoadModal.doorAddress', 'Pickup/Delivery Address (Door)') : u('postLoadModal.deliveryAddress', 'Delivery address')}
                            </FieldLabel>
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
                              placeholder={u('postLoadModal.deliveryAddressPlaceholder', 'Search places or click the map')}
                              onOpenMap={() => setAddressMap('delivery')}
                              mapButtonLabel={u('map.chooseDelivery', 'Choose delivery address on map')}
                              mapButtonIcon={MapGlyphIcon}
                              accentClassName="text-blue-500"
                            />
                          </div>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-[200px_140px_minmax(0,1fr)] gap-3">
                        <div className={cn('space-y-1', invalidClass('deliveryCountry'))}>
                          {fieldLabel('deliveryCountry', 'postLoadModal.deliveryCountryShort', 'Country')}
                          <CountrySelect value={draft.deliveryCountry} onChange={(value) => setField('deliveryCountry', value)} placeholder={u('postLoadModal.selectCountry', 'Select country')} />
                        </div>
                        <div className={cn('space-y-1', invalidClass('deliveryPostalCode'))}>
                          {fieldLabel('deliveryPostalCode', 'postLoadModal.deliveryPostalCode', 'Postal code')}
                          <Input value={draft.deliveryPostalCode} onChange={(event) => setField('deliveryPostalCode', event.target.value)} placeholder={u('postLoadModal.postalCodePlaceholder', 'Postal code')} />
                        </div>
                        <div className={cn('space-y-1', invalidClass('deliveryCity'))}>
                          {fieldLabel('deliveryCity', 'postLoadModal.deliveryCity', 'City')}
                          <Input value={draft.deliveryCity} onChange={(event) => setField('deliveryCity', event.target.value)} placeholder={u('postLoadModal.cityCountry', 'City')} />
                        </div>
                      </div>
                      {draft.transportType === 'road' && (
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className={cn('flex h-full flex-col justify-between space-y-1', invalidClass('deliveryDate'))}>
                              {fieldLabel('deliveryDate', 'postLoadModal.deliveryDate', 'Date from')}
                              <DateInput
                                value={draft.deliveryDate}
                                onChange={(value) => setField('deliveryDate', value)}
                                placeholder="dd.mm.yyyy"
                                lang={lang}
                              />
                            </div>
                            <div className={cn('flex h-full flex-col justify-between space-y-1', invalidClass('deliveryDateTo'))}>
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
                            <div className={cn('flex h-full flex-col justify-between space-y-1', invalidClass('deliveryTimeFrom'))}>
                              <FieldLabel>{u('postLoadModal.deliveryTimeFrom', 'Time from')}</FieldLabel>
                              <TimeInput
                                value={draft.deliveryTimeFrom}
                                onChange={(value) => setField('deliveryTimeFrom', value)}
                                placeholder="hh:mm"
                              />
                            </div>
                            <div className={cn('flex h-full flex-col justify-between space-y-1', invalidClass('deliveryTimeTo'))}>
                              <FieldLabel>{u('postLoadModal.deliveryTimeTo', 'Time to')}</FieldLabel>
                              <TimeInput
                                value={draft.deliveryTimeTo}
                                onChange={(value) => setField('deliveryTimeTo', value)}
                                placeholder="hh:mm"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex h-full min-w-0 flex-col space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="flex items-center gap-2 text-primary">
                        <Route className="w-4 h-4" />
                        <p className="text-xs font-black uppercase tracking-wider">{u('postLoadModal.routeSummaryTitle', 'Route')}</p>
                      </div>
                      {isContainerTransport(draft.transportType) ? (
                        <div className="flex min-w-0 flex-1 flex-col">
                          {draft.pickupPlaceType !== 'Port to Port' && (
                            <VerticalRoutePoint icon={MapPin} iconClassName="bg-emerald-500 shadow-emerald-500/20" label={u('postLoadModal.origin', 'Origin')} value={draft.pickupAddress || draft.pickupCity || '—'} />
                          )}
                          <VerticalRoutePoint icon={Ship} iconClassName="bg-primary shadow-sky-500/20" label="POL" value={draft.pickupPort || '—'} />
                          <VerticalRoutePoint icon={Ship} iconClassName="bg-primary shadow-sky-500/20" label="POD" value={draft.deliveryPort || '—'} last={draft.deliveryPlaceType === 'Port to Port'} />
                          {draft.deliveryPlaceType !== 'Port to Port' && (
                            <VerticalRoutePoint icon={MapPin} iconClassName="bg-blue-500 shadow-blue-500/20" label={u('postLoadModal.destination', 'Destination')} value={draft.deliveryAddress || draft.deliveryCity || '—'} last />
                          )}
                        </div>
                      ) : (
                        <div className="flex min-w-0 flex-1 flex-col">
                          <VerticalRoutePoint icon={MapPin} iconClassName="bg-emerald-500 shadow-emerald-500/20" label={u('postLoadModal.origin', 'Origin')} value={draft.pickupCity || draft.pickupAddress || '—'} />
                          <VerticalRoutePoint icon={MapPin} iconClassName="bg-blue-500 shadow-blue-500/20" label={u('postLoadModal.destination', 'Destination')} value={draft.deliveryCity || draft.deliveryAddress || '—'} last />
                        </div>
                      )}

                      {isContainerTransport(draft.transportType) ? (
                        <div className="flex items-center justify-between rounded-2xl border border-sky-200 bg-sky-50/50 px-3 py-2 dark:border-sky-800 dark:bg-slate-900">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{u('postLoadModal.transitTime', 'ETA - transit time (POL-POD)')}</p>
                          <p className="flex items-center gap-1 text-sm font-black text-slate-900 dark:text-white">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={draft.transitDays}
                              onChange={(event) => setField('transitDays', event.target.value.replace(/\D/g, '').slice(0, 3))}
                              placeholder="0"
                              className="w-6 border-0 bg-transparent p-0 text-center text-sm font-black text-slate-900 outline-none dark:text-white"
                            />
                            {u('postLoadModal.transitDays', 'days')}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50/50 px-3 py-2 dark:border-sky-800 dark:bg-slate-900">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{u('landing.distance', 'Distance')}</p>
                          <p className="flex items-center gap-1 text-sm font-black text-slate-900 dark:text-white">
                            {recalculatingRoute
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                              : routeDistanceKm === null ? '—' : `${routeDistanceKm.toLocaleString()} km`}
                          </p>
                        </div>
                      )}

                      {!isContainerTransport(draft.transportType) && (
                        <Button type="button" disabled={!routeDistanceKm} onClick={() => setRouteMapOpen(true)} className="w-full gap-2 disabled:cursor-not-allowed disabled:bg-sky-300 disabled:text-white disabled:opacity-100 disabled:shadow-none dark:disabled:bg-sky-800"><MapGlyphIcon className="h-4 w-4" />{u('postLoadModal.showRouteMap', 'Show route')}</Button>
                      )}
                    </div>
                  </div>

                  {draft.transportType !== 'road' && draft.transportType !== 'warehouse' && (
                    <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <FieldLabel>{u('postLoadModal.cargoReady', 'Cargo ready')}</FieldLabel>
                          <DateInput
                            value={draft.pickupDate}
                            onChange={(value) => setField('pickupDate', value)}
                            placeholder="dd.mm.yyyy"
                            lang={lang}
                          />
                        </div>
                        <div className="space-y-1">
                          <FieldLabel>{u('postLoadModal.pickupWindow', 'Pickup window')}</FieldLabel>
                          <div className="relative">
                            <Input
                              value={draft.pickupWindow}
                              onChange={(event) => setField('pickupWindow', formatTimeRangeMask(event.target.value))}
                              inputMode="numeric"
                              placeholder={u('postLoadModal.windowPlaceholder', '08:00 - 12:00')}
                              className="pr-10"
                            />
                            <Clock3 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <FieldLabel>{u('postLoadModal.deliveryWindow', 'Delivery window')}</FieldLabel>
                          <div className="relative">
                            <Input
                              value={draft.deliveryWindow}
                              onChange={(event) => setField('deliveryWindow', formatTimeRangeMask(event.target.value))}
                              inputMode="numeric"
                              placeholder={u('postLoadModal.windowPlaceholder', '08:00 - 12:00')}
                              className="pr-10"
                            />
                            <Clock3 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  </>
                  )}
                </motion.div>
              )}

              {step === 'cargo' && (
                <motion.div key="cargo" className="space-y-3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
                  {(
                  <div className="grid lg:grid-cols-3 gap-3">
                    <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                      <fieldset>
                        <legend className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                          <Route className="h-4 w-4" />
                          {u('postLoadModal.transportType', 'Transport types and services')}
                        </legend>
                        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                          {transportOptions.map((option) => (
                            <ChoiceCard
                              key={option.id}
                              compact
                              truncate
                              active={draft.transportType === option.id}
                              title={option.label}
                              description={option.description}
                              icon={option.icon}
                              iconSurface={option.iconSurface}
                              iconTone={option.iconTone}
                              onClick={() => setDraft((prev) => {
                                const validCargoTypes = shipmentTypeOptions[option.id];
                                const validLoadingEquipment = loadingEquipmentOptions[option.id];
                                // Sea and rail share the leg-type vocabulary, so switching between
                                // those two keeps the choice; only crossing in or out of the pair
                                // resets it.
                                const enteringSea = isContainerTransport(option.id) && !isContainerTransport(prev.transportType);
                                const leavingSea = !isContainerTransport(option.id) && isContainerTransport(prev.transportType);
                                const enteringAir = option.id === 'air' && prev.transportType !== 'air';
                                return {
                                  ...prev,
                                  transportType: option.id,
                                  consignee: option.id === 'warehouse' ? null : prev.consignee,
                                  cargoType: validCargoTypes.length === 0 || validCargoTypes.includes(prev.cargoType) ? prev.cargoType : validCargoTypes[0],
                                  loadingEquipment: prev.loadingEquipment.filter((item) => validLoadingEquipment.includes(item)),
                                  // Sea repurposes the pickup/delivery "place type" row into a Port-to-Port /
                                  // Door-to-Port(-Door) leg-type choice - neither set of values makes sense
                                  // for the other transport types, so reset it on the way in and out of sea.
                                  pickupPlaceType: enteringSea ? 'Port to Port' : leavingSea ? INITIAL_DRAFT.pickupPlaceType : prev.pickupPlaceType,
                                  deliveryPlaceType: enteringSea ? 'Port to Port' : leavingSea ? INITIAL_DRAFT.deliveryPlaceType : prev.deliveryPlaceType,
                                  // Toll roads/ferry/CMR/pallet exchange are road-only concepts and hidden
                                  // from the requirements grid for air - clear them so a stale true carried
                                  // over from road doesn't silently submit on an air load.
                                  tollRoadsIncluded: enteringAir ? false : prev.tollRoadsIncluded,
                                  ferryIncluded: enteringAir ? false : prev.ferryIncluded,
                                  cmrRequired: enteringAir ? false : prev.cmrRequired,
                                  palletExchangeRequired: enteringAir ? false : prev.palletExchangeRequired,
                                };
                              })}
                            />
                          ))}
                        </div>
                      </fieldset>

                      {draft.transportType !== 'warehouse' && (
                        <div className="space-y-1">
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
                      )}

                      {draft.transportType === 'warehouse' ? (
                        <WarehouseStorageTypeField draft={draft} setField={setField} u={u} />
                      ) : (
                        <div className="space-y-1">
                          <FieldLabel>{u('postLoadModal.cargoModel', 'Shipment type')}</FieldLabel>
                          <ScrollableRow className="pb-2">
                            <div className="flex w-max gap-2 px-1">
                            {shipmentTypeOptions[draft.transportType].map((option) => (
                              <ChoiceCard key={option} compact nowrap className="w-auto snap-start shrink-0 justify-start pl-3 pr-7 text-left" active={draft.cargoType === option} title={option} icon={option === 'Charter' ? Plane : option === 'Express' || option === 'Priority' ? Clock3 : Package} onClick={(event) => { setField('cargoType', option); event.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' }); }} />
                            ))}
                            </div>
                          </ScrollableRow>
                        </div>
                      )}

                      <div className="space-y-1">
                        <FieldLabel>{draft.transportType === 'warehouse' ? u('postLoadModal.warehouseServices', 'Required services') : isContainerTransport(draft.transportType) ? u('postLoadModal.handlingRequirements', 'Handling Requirements') : u('postLoadModal.loadingEquipment', 'Loading equipment')}</FieldLabel>
                        <div className="grid md:grid-cols-3 gap-3">
                          {loadingEquipmentOptions[draft.transportType].map((option) => <ToggleCard key={option} active={draft.loadingEquipment.includes(option)} title={option} description={loadingEquipmentDescription(option)} icon={loadingEquipmentIcon(option)} onClick={() => toggleLoadingEquipment(option)} />)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className={cn('space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4', draft.transportType === 'warehouse' && 'flex-1')}>
                        <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                          <Package className="h-4 w-4" />
                          <span>{u('postLoadModal.goodsSpecifications', 'Goods specifications')}</span>
                        </div>
                        <div className="space-y-1">
                          <FieldLabel>{u('postLoadModal.declaredValue', 'Value of shipment')}</FieldLabel>
                          <div className={cn('grid w-full grid-cols-[minmax(0,1fr)_110px] gap-2', invalidClass('declaredValue'))}>
                            <Input type="number" step="100" min="0" value={draft.declaredValue} onChange={(e) => setField('declaredValue', e.target.value)} placeholder="50000" />
                            <Select value={draft.shipmentValueCurrency} onChange={(e) => setField('shipmentValueCurrency', e.target.value)}>
                              <option value="EUR">EUR</option><option value="BAM">BAM</option><option value="USD">USD</option>
                            </Select>
                          </div>
                        </div>
                        <div className={cn('space-y-1', invalidClass('goodsType'))}>
                          {fieldLabel('goodsType', 'postLoadModal.cargoName', 'Type of goods and HS codes')}
                          <div ref={hsSearchRef} className="relative">
                            {/* min-h rather than h so the box still grows once HS chips wrap, but an
                                empty field lines up with the standard Input height. */}
                            <div className="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 focus-within:ring-2 focus-within:ring-primary dark:border-slate-800 dark:bg-slate-950">
                              {draft.hsCodes.map((item) => (
                                <HsCodeChip
                                  key={item.code}
                                  item={item}
                                  onRemove={() => removeHsCode(item.code)}
                                  removeTitle={u('Remove HS code', 'Remove HS code')}
                                />
                              ))}
                              <input
                                value={hsQuery}
                                onChange={(e) => setHsQuery(e.target.value)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    void searchHsCatalog();
                                  } else if (event.key === 'Backspace' && hsQuery === '' && draft.hsCodes.length > 0) {
                                    removeHsCode(draft.hsCodes[draft.hsCodes.length - 1].code);
                                  }
                                }}
                                placeholder={draft.hsCodes.length > 0 ? '' : u('postLoadModal.cargoNamePlaceholder', 'Search by goods category, name or HS code')}
                                className="min-w-[140px] flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-white"
                              />
                              {hsSearching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />}
                            </div>
                            {hsSuggestions.length > 0 && (
                              <div className="absolute z-10 mt-1 max-h-44 w-full space-y-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                                {hsSuggestions.map((item, index) => {
                                  const SectionIcon = hsSectionIcon(item.chapterCode);
                                  const selectable = item.selectable ?? true;
                                  const depth = Math.min(8, Math.max(0, item.depth ?? 0));
                                  return (
                                    <button
                                      key={item.catalogId ?? `${item.code}-${index}`}
                                      type="button"
                                      disabled={!selectable}
                                      onClick={() => selectable && addHsCode(item)}
                                      style={{ paddingLeft: `${12 + depth * 12}px` }}
                                      className={cn(
                                        'flex w-full items-start gap-2 rounded-lg py-2 pr-3 text-left',
                                        selectable
                                          ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800'
                                          : 'cursor-not-allowed bg-slate-50/70 text-slate-400 dark:bg-slate-800/30 dark:text-slate-500',
                                      )}
                                    >
                                      {selectable
                                        ? <SectionIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                                        : <span className="w-3.5 shrink-0 text-center text-sm font-black">›</span>}
                                      {item.code && <span className={cn('shrink-0 font-mono text-xs font-black', selectable ? 'text-primary' : 'text-slate-400')}>{item.code}</span>}
                                      <span className="text-xs leading-5">{item.name || item.description}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className={cn('space-y-1', invalidClass('weightKg'))}>
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
                          <div className={cn('space-y-1', invalidClass('volumeM3'))}>
                            {fieldLabel('volumeM3', 'postLoadModal.volume', 'CBM (m³)')}
                            <Input type="number" step="0.1" min="0" value={draft.volumeM3} onChange={(e) => setField('volumeM3', e.target.value)} placeholder="33.2" />
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className={cn('space-y-1', invalidClass('pallets'))}>
                            {fieldLabel('pallets', 'postLoadModal.unitCount', 'Number of pieces / units')}
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              value={draft.pallets}
                              onChange={(event) => setField('pallets', event.target.value)}
                              placeholder="24"
                            />
                          </div>
                          <div className="space-y-1">
                            <FieldLabel>{u('postLoadModal.packagingMethod', 'Packaging method')}</FieldLabel>
                            <Select value={draft.quantityMeasure} onChange={(event) => setField('quantityMeasure', event.target.value)}>
                              <option value="">{u('postLoadModal.selectPackagingMethod', 'Select packaging method')}</option>
                              {draft.quantityMeasure && !selectedPackageType && <option value={draft.quantityMeasure}>{draft.quantityMeasure}</option>}
                              {PACKAGE_TYPES.map((option) => (
                                <option key={`${option.value}-${option.label}`} value={option.value}>{option.value} - {option.label}</option>
                              ))}
                            </Select>
                          </div>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-3">
                          <div className={cn('space-y-1', invalidClass('lengthM'))}>
                            {fieldLabel('lengthM', 'postLoadModal.length', 'Length (m)')}
                            <Input type="number" step="0.1" min="0.1" value={draft.lengthM} onChange={(e) => setField('lengthM', e.target.value)} placeholder="13.6" />
                          </div>
                          <div className={cn('space-y-1', invalidClass('widthM'))}>
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
                          <div className={cn('space-y-1', invalidClass('heightM'))}>
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
                        </div>
                        <div className="space-y-1">
                          <FieldLabel>{u('postLoadModal.additionalInfo', 'Additional information')}</FieldLabel>
                          <div className="grid grid-cols-3 gap-2">
                            {[{ value: 'Stackable', icon: Package }, { value: 'Top load only', icon: ShieldCheck }, { value: 'Non-stackable', icon: X }].map(({ value, icon }) => <ChoiceCard key={value} compact active={draft.additionalInfo === value} title={value} icon={icon} onClick={() => setField('additionalInfo', value)} />)}
                          </div>
                        </div>
                      </div>

                      {draft.transportType !== 'warehouse' && (
                      <div className="flex-1 space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                        <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                          <Truck className="h-4 w-4" />
                          <span>{u('postLoadModal.equipmentTitle', 'Equipment & requirements')}</span>
                        </div>
                        {draft.transportType === 'air' ? (
                          <div className="space-y-4">
                            <div className="space-y-1"><FieldLabel>{u('postLoadModal.specialRequirements', 'Special requirements')}</FieldLabel><div className="flex min-h-10 items-center rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950"><div className="flex flex-wrap gap-2">{(draft.pickupPlaceType === 'Address' || draft.deliveryPlaceType === 'Address + Last Mile Delivery' ? [...AIR_SPECIAL_REQUIREMENT_OPTIONS, AIR_TAIL_LIFT_REQUIREMENT] : AIR_SPECIAL_REQUIREMENT_OPTIONS).map((option) => { const RequirementIcon = AIR_SPECIAL_REQUIREMENT_ICONS[option]; return <button key={option} type="button" onClick={() => toggleSpecialRequirement(option)} className={cn('inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold leading-none transition-colors', draft.specialRequirements.includes(option) ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200')}><RequirementIcon className="h-3.5 w-3.5 shrink-0" /><span className="leading-none">{u(option, option)}</span></button>; })}</div></div></div>
                          </div>
                        ) : isContainerTransport(draft.transportType) ? (
                          <div className="space-y-1">
                            <FieldLabel>{u('postLoadModal.containerTypes', 'Container types')}</FieldLabel>
                            <div className="space-y-2">
                              {draft.containerSelections.map((row, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <Select value={row.type} onChange={(e) => updateContainerSelection(index, { type: e.target.value })} className="flex-1">
                                    {(['Standard', 'Open Top', 'Reefer', 'Flat Rack', 'Platform'] as SeaContainerCategory[]).map((category) => (
                                      <optgroup key={category} label={category}>
                                        {SEA_CONTAINER_TYPES.filter((c) => c.category === category).map((c) => (
                                          <option key={c.code} value={c.code}>{c.label}</option>
                                        ))}
                                      </optgroup>
                                    ))}
                                  </Select>
                                  <Input type="number" min="1" value={row.quantity} onChange={(e) => updateContainerSelection(index, { quantity: e.target.value })} className="w-20 shrink-0" placeholder={u('postLoadModal.qty', 'Qty')} />
                                  <button type="button" onClick={() => removeContainerSelection(index)} className="shrink-0 rounded-lg p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800">
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                              <Button type="button" variant="outline" size="sm" onClick={addContainerSelection} className="gap-1.5">
                                <Plus className="h-3.5 w-3.5" />
                                {u('postLoadModal.addContainerType', 'Add container')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className={cn('space-y-1', invalidClass('bodyTypes'))}>{fieldLabel('bodyTypes', 'postLoadModal.bodyTypes', 'Body types')}<div className="flex min-h-10 items-center rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950"><div className="flex flex-wrap gap-2">{BODY_TYPE_OPTIONS.map((option) => { const BodyTypeIcon = BODY_TYPE_ICONS[option]; return <button key={option} type="button" onClick={() => toggleBodyType(option)} className={cn('inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold leading-none transition-colors', draft.bodyTypes.includes(option) ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200')}><BodyTypeIcon className="h-3.5 w-3.5 shrink-0" /><span className="leading-none">{u(`postLoadModal.bodyType.${option}`, option)}</span></button>; })}</div></div></div>
                        )}

                        {draft.transportType === 'air' && <div className="space-y-1"><FieldLabel>{u('postLoadModal.deliveryProof', 'Delivery proof')}</FieldLabel><div className="grid grid-cols-2 gap-3"><ChoiceCard compact active={draft.deliveryProof === 'POD'} title="POD" description="Proof of Delivery" icon={FileText} onClick={() => setField('deliveryProof', 'POD')} /><ChoiceCard compact active={draft.deliveryProof === 'AOD'} title="AOD" description="Arrival on Delivery" icon={CheckCircle2} onClick={() => setField('deliveryProof', 'AOD')} /></div></div>}

                        {/* Both modes name the transport document they move under, so they share the
                            field - a Bill of Lading at sea, a CIM/SMGS consignment note on rail. */}
                        {isContainerTransport(draft.transportType) && (
                          <div className="space-y-1">
                            <FieldLabel>
                              {draft.transportType === 'rail'
                                ? u('postLoadModal.railDocumentType', 'Rail transport document type')
                                : u('postLoadModal.blType', 'B/L type')}
                            </FieldLabel>
                            <div className={cn('grid gap-2', draft.transportType === 'rail' ? 'grid-cols-4' : 'grid-cols-3')}>
                              {(draft.transportType === 'rail' ? RAIL_DOCUMENT_TYPE_OPTIONS : SEA_BL_TYPE_OPTIONS).map((option) => (
                                <ChoiceCard key={option} compact active={draft.blType === option} title={u(`postLoadModal.blType.${option}`, option)} icon={FileText} onClick={() => setField('blType', option)} />
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                      )}
                    </div>

                    <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                        <ShieldCheck className="h-4 w-4" />
                        <span>{u('postLoadModal.characteristicsAndRequirements', 'Characteristics, certificates & requirements')}</span>
                      </div>
                      <div className="grid md:grid-cols-3 gap-3">
                        {(isContainerTransport(draft.transportType) ? SEA_CHARACTERISTIC_OPTIONS : draft.transportType === 'air' ? AIR_CHARACTERISTIC_OPTIONS : ROAD_CHARACTERISTIC_OPTIONS).map((option) => (
                          characteristicDetail(option) ? (
                            <DetailToggleCard
                              key={option}
                              active={draft.characteristics.includes(option)}
                              onToggle={() => {
                                if (draft.characteristics.includes(option)) clearCharacteristicDetail(option);
                                toggleCharacteristic(option);
                              }}
                              onClear={() => clearCharacteristicDetail(option)}
                              icon={characteristicIcon(option)}
                              title={option}
                              description={u(`postLoadModal.characteristicDesc.${option}`, CHARACTERISTIC_DESCRIPTIONS[option] || '')}
                              summary={characteristicSummary(option)}
                              emptyHint={u('postLoadModal.addDetails', 'Add details')}
                              clearLabel={u('tracking.clearAll', 'Clear all')}
                            >
                              {characteristicDetail(option)}
                            </DetailToggleCard>
                          ) : (
                            <ToggleCard
                              key={option}
                              active={draft.characteristics.includes(option)}
                              onClick={() => toggleCharacteristic(option)}
                              icon={characteristicIcon(option)}
                              title={option}
                              description={u(`postLoadModal.characteristicDesc.${option}`, CHARACTERISTIC_DESCRIPTIONS[option] || '')}
                            />
                          )
                        ))}
                        {!isContainerTransport(draft.transportType) && (
                          <ToggleCard
                            active={draft.requiresAdr}
                            onClick={() => setField('requiresAdr', !draft.requiresAdr)}
                            icon={ShieldAlert}
                            title={draft.transportType === 'air' ? u('postLoadModal.dgr', 'DGR / certified') : u('postLoadModal.adr', 'ADR / certified')}
                            description={u('postLoadModal.adrDesc', 'Hazardous goods compliance required')}
                          />
                        )}
                        {!isContainerTransport(draft.transportType) && !equipmentCovers('requiresTailLift') && (
                          <ToggleCard
                            active={draft.requiresTailLift}
                            onClick={() => setField('requiresTailLift', !draft.requiresTailLift)}
                            icon={ArrowDownToLine}
                            title={u('postLoadModal.tailLift', 'Tail lift')}
                            description={u('postLoadModal.tailLiftDesc', 'Required for pickup or delivery')}
                          />
                        )}
                        <ToggleCard
                          active={draft.urgent}
                          onClick={() => setField('urgent', !draft.urgent)}
                          icon={Zap}
                          title={u('postLoadModal.urgent', 'Priority load')}
                          description={u('postLoadModal.urgentDesc', 'Higher urgency and faster acceptance')}
                        />
                        {draft.transportType === 'road' && (
                          <>
                            <ToggleCard
                              active={draft.tollRoadsIncluded}
                              onClick={() => setField('tollRoadsIncluded', !draft.tollRoadsIncluded)}
                              icon={Route}
                              title={u('postLoadModal.tollRoads', 'Toll roads')}
                              description={u('postLoadModal.tollRoadsDesc', 'Route includes toll roads or motorways')}
                            />
                            <ToggleCard
                              active={draft.ferryIncluded}
                              onClick={() => setField('ferryIncluded', !draft.ferryIncluded)}
                              icon={Ship}
                              title={u('postLoadModal.ferry', 'Ferry')}
                              description={u('postLoadModal.ferryDesc', 'Route includes a ferry / RoRo crossing')}
                            />
                            <ToggleCard
                              active={draft.cmrRequired}
                              onClick={() => setField('cmrRequired', !draft.cmrRequired)}
                              icon={FileText}
                              title={u('postLoadModal.cmr', 'CMR')}
                              description={u('postLoadModal.cmrDesc', 'CMR consignment note required')}
                            />
                            <ToggleCard
                              active={draft.palletExchangeRequired}
                              onClick={() => setField('palletExchangeRequired', !draft.palletExchangeRequired)}
                              icon={Package}
                              title={u('postLoadModal.palletExchange', 'Pallet exchange')}
                              description={u('postLoadModal.palletExchangeDesc', 'Pallets must be swapped on delivery')}
                            />
                          </>
                        )}
                        {!equipmentCovers('customsRequired') && (
                          <ToggleCard
                            active={draft.customsRequired}
                            onClick={() => setField('customsRequired', !draft.customsRequired)}
                            icon={Landmark}
                            title={u('postLoadModal.customs', 'Customs')}
                            description={u('postLoadModal.customsDesc', 'Customs clearance required')}
                          />
                        )}
                        <ToggleCard
                          active={draft.insuranceRequired}
                          onClick={() => setField('insuranceRequired', !draft.insuranceRequired)}
                          icon={ShieldCheck}
                          title={u('postLoadModal.insurance', 'Insurance')}
                          description={u('postLoadModal.insuranceDesc', 'Cargo insurance required')}
                        />
                        <ToggleCard
                          active={draft.certificationRequired}
                          onClick={() => setField('certificationRequired', !draft.certificationRequired)}
                          icon={BadgeCheck}
                          title={u('postLoadModal.certification', 'Certification')}
                          description={u('postLoadModal.certificationDesc', 'Certification documents required')}
                        />
                        {!equipmentCovers('inspectionServicesRequired') && (
                          <ToggleCard
                            active={draft.inspectionServicesRequired}
                            onClick={() => setField('inspectionServicesRequired', !draft.inspectionServicesRequired)}
                            icon={ScanEye}
                            title={u('postLoadModal.inspectionServices', 'Inspection services')}
                            description={u('postLoadModal.inspectionServicesDesc', 'Cargo inspection required')}
                          />
                        )}
                        <ToggleCard
                          active={draft.mustBeTrackable}
                          onClick={() => setField('mustBeTrackable', !draft.mustBeTrackable)}
                          icon={Radar}
                          title={u('postLoadModal.mustBeTrackable', 'Must be trackable')}
                          description={u('postLoadModal.mustBeTrackableDesc', 'Must be trackable via the Smart Logistics System')}
                        />
                        {/* Storage-only: a warehouse either holds a food-grade / pharma licence or
                            it does not, and fragile goods decide how the space is racked - neither
                            has an equivalent among the transport requirements above. */}
                        {draft.transportType === 'warehouse' && (
                          <>
                            <ToggleCard
                              active={draft.warehouseFoodPharma}
                              onClick={() => setField('warehouseFoodPharma', !draft.warehouseFoodPharma)}
                              icon={Pill}
                              title={u('postLoadModal.foodPharma', 'Food / Pharma')}
                              description={u('postLoadModal.foodPharmaDesc', 'Food or pharmaceutical goods')}
                            />
                            <ToggleCard
                              active={draft.warehouseFragile}
                              onClick={() => setField('warehouseFragile', !draft.warehouseFragile)}
                              icon={Wine}
                              title={u('postLoadModal.fragileGoods', 'Fragile / sensitive goods')}
                              description={u('postLoadModal.fragileGoodsDesc', 'Careful handling required')}
                            />
                          </>
                        )}
                        </div>

                      {!isContainerTransport(draft.transportType) && (
                        <div className={cn('space-y-1', invalidClass('temperatureControlled'))}>
                          {fieldLabel('temperatureControlled', 'postLoadModal.temperature', 'Temperature controlled')}
                          <div className="grid grid-cols-2 gap-2">
                            <ChoiceCard compact active={!draft.temperatureControlled} title={u('common.no', 'No')} description="Ambient conditions" icon={Package} onClick={() => setField('temperatureControlled', false)} />
                            <ChoiceCard compact active={draft.temperatureControlled} title={u('common.yes', 'Yes')} description="Set a temperature range" icon={ThermometerSnowflake} onClick={() => setField('temperatureControlled', true)} />
                          </div>
                        </div>
                      )}
                      {draft.temperatureControlled && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <FieldLabel>{u('postLoadModal.temperatureMin', 'From (°C)')}</FieldLabel>
                            <Input type="number" value={draft.temperatureMin} onChange={(e) => setField('temperatureMin', e.target.value)} placeholder="2" />
                          </div>
                          <div className="space-y-1">
                            <FieldLabel>{u('postLoadModal.temperatureMax', 'To (°C)')}</FieldLabel>
                            <Input type="number" value={draft.temperatureMax} onChange={(e) => setField('temperatureMax', e.target.value)} placeholder="8" />
                          </div>
                        </div>
                      )}

                    </div>

                  </div>
                  )}
                </motion.div>
              )}

              {step === 'contact' && (
                <motion.div key="contact" className="space-y-3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>

                  <div className="grid lg:grid-cols-3 gap-3">
                    <div className="flex flex-col space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                        <Coins className="h-4 w-4" />
                        <span>{u('postLoadModal.paymentTitle', 'Payment')}</span>
                      </div>
                      {isContainerTransport(draft.transportType) ? (
                        <div className="space-y-2">
                          <FieldLabel>{u('postLoadModal.seaPaymentTerms', 'Payment terms')}</FieldLabel>
                          <div className="grid grid-cols-3 gap-2">
                            <ChoiceCard compact active={draft.seaPaymentTerms === 'Prepaid'} title={u('postLoadModal.seaPaymentTerms.Prepaid', 'Prepaid')} description={u('postLoadModal.seaPaymentTerms.PrepaidDesc', 'Invoiced before transport starts')} icon={Coins} onClick={() => setField('seaPaymentTerms', 'Prepaid')} />
                            <ChoiceCard compact active={draft.seaPaymentTerms === 'Collect'} title={u('postLoadModal.seaPaymentTerms.Collect', 'Collect')} description={draft.transportType === 'rail' ? u('postLoadModal.railPaymentTerms.CollectDesc', 'Invoiced after arrival at the destination terminal') : u('postLoadModal.seaPaymentTerms.CollectDesc', 'Invoiced after arrival at POD')} icon={draft.transportType === 'rail' ? TrainFront : Ship} onClick={() => setField('seaPaymentTerms', 'Collect')} />
                            <ChoiceCard compact active={draft.seaPaymentTerms === 'Other'} title={u('postLoadModal.seaPaymentTerms.Other', 'Other')} description={u('postLoadModal.seaPaymentTerms.OtherDesc', 'As otherwise agreed')} icon={FileText} onClick={() => setField('seaPaymentTerms', 'Other')} />
                          </div>
                        </div>
                      ) : (
                        <div className={cn('space-y-2', invalidClass('paymentDeferred'))}>
                          {fieldLabel('paymentDeferred', 'postLoadModal.deferredPayment', 'Deferred payment')}
                          <div className={cn('grid grid-cols-2 gap-2', invalidClass('paymentDueDays'))}>
                            <ChoiceCard compact active={!draft.paymentDeferred} title={u('common.no', 'No')} description="Pay on delivery" icon={Coins} onClick={() => setField('paymentDeferred', false)} />
                            <ChoiceCard compact active={draft.paymentDeferred} title={u('common.yes', 'Yes')} description="Set payment window" icon={Clock3} onClick={() => setField('paymentDeferred', true)} />
                          </div>
                          {draft.paymentDeferred && <Input type="number" min="1" value={draft.paymentDueDays} onChange={(e) => setField('paymentDueDays', e.target.value)} placeholder={u('postLoadModal.paymentDueDays', 'Number of days')} />}
                        </div>
                      )}
                      <div className={cn('space-y-1', invalidClass('incoterm'))}>
                        {fieldLabel('incoterm', 'postLoadModal.incoterm', 'Incoterm')}
                        <Select value={draft.incoterm} onChange={(event) => setField('incoterm', event.target.value)}>
                          <option value="">{u('postLoadModal.pleaseSelect', 'Please select')}</option>
                          {INCOTERM_OPTIONS.map((incoterm) => (
                            <option key={incoterm} value={incoterm}>{incoterm}</option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <FieldLabel>{u('postLoadModal.priceTerms', 'Terms')}</FieldLabel>
                        <div className="grid grid-cols-2 gap-3">
                          <ChoiceCard
                            compact
                            active={draft.receivePriceProposals}
                            title={u('postLoadModal.termsNegotiable', 'Negotiable')}
                            description={u('postLoadModal.termsNegotiableDesc', 'Carriers can send alternative prices')}
                            icon={Handshake}
                            onClick={() => setField('receivePriceProposals', true)}
                          />
                          <ChoiceCard
                            compact
                            active={!draft.receivePriceProposals}
                            title={u('postLoadModal.termsFixed', 'Fixed price')}
                            description={u('postLoadModal.termsFixedDesc', 'Carriers book instantly at your price')}
                            icon={Tag}
                            onClick={() => setField('receivePriceProposals', false)}
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-[minmax(0,1fr)_120px] gap-3">
                        <div className={cn('space-y-1', invalidClass('budget'))}>
                          {fieldLabel(
                            'budget',
                            draft.receivePriceProposals ? 'postLoadModal.targetPrice' : 'postLoadModal.termsFixed',
                            draft.receivePriceProposals ? 'Expected price (optional)' : 'Fixed price'
                          )}
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={draft.budget}
                            onChange={(e) => setField('budget', e.target.value)}
                            placeholder="1450"
                          />
                        </div>
                        <div className={cn('space-y-1', invalidClass('freightCurrency'))}>
                          {fieldLabel('freightCurrency', 'postLoadModal.currency', 'Currency')}
                          <Select value={draft.freightCurrency} onChange={(e) => setField('freightCurrency', e.target.value)}>
                            <option value="EUR">EUR</option>
                            <option value="BAM">BAM</option>
                            <option value="USD">USD</option>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <FieldLabel>{u('postLoadModal.externalComments', 'External comments')}</FieldLabel>
                        <Input
                          value={draft.externalComments}
                          onChange={(e) => setField('externalComments', e.target.value)}
                          placeholder={u('postLoadModal.externalCommentsPlaceholder', 'Visible to carriers reviewing the offer')}
                        />
                      </div>

                      <div className={cn('flex flex-1 flex-col space-y-1', invalidClass('notes'))}>
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

                    <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                        <UserRound className="h-4 w-4" />
                        <span>{u('postLoadModal.contactTitle', 'Contact')}</span>
                      </div>
                      <div className={cn('space-y-1', invalidClass('contactName'))}>
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
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className={cn('space-y-1', invalidClass('contactEmail'))}>
                          {fieldLabel('contactEmail', 'postLoadModal.contactEmail', 'E-mail address')}
                          <Input
                            value={draft.contactEmail}
                            onChange={(e) => setField('contactEmail', e.target.value)}
                            placeholder="john@company.com"
                          />
                        </div>
                        <div className={cn('space-y-1', invalidClass('contactPhone'))}>
                          {fieldLabel('contactPhone', 'postLoadModal.contactPhone', 'Phone number')}
                          <Input
                            value={draft.contactPhone}
                            onChange={(e) => setField('contactPhone', e.target.value)}
                            placeholder="+387 33 123 456"
                          />
                        </div>
                        <div className="space-y-1">
                          <FieldLabel>{u('postLoadModal.contactFax', 'Fax number')}</FieldLabel>
                          <Input
                            value={draft.contactFax}
                            onChange={(e) => setField('contactFax', e.target.value)}
                            placeholder="+387 33 555 111"
                          />
                        </div>
                        <div className="space-y-1">
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
                      <div className="space-y-1">
                        <FieldLabel>{u('postLoadModal.internalComments', 'Internal comments')}</FieldLabel>
                        <Input
                          value={draft.internalComments}
                          onChange={(e) => setField('internalComments', e.target.value)}
                          placeholder={u('postLoadModal.internalCommentsPlaceholder', 'Only visible within your company')}
                        />
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                        <ShieldCheck className="h-4 w-4" />
                        <span>{u('postLoadModal.limitPublication', 'Limit publication')}</span>
                      </div>
                      <div className="space-y-1">
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
                      <div className="space-y-1">
                        <FieldLabel>{u('postLoadModal.closedFreightComments', 'Comments for closed freight exchange')}</FieldLabel>
                        <Input
                          value={draft.closedFreightComments}
                          onChange={(e) => setField('closedFreightComments', e.target.value)}
                          placeholder={u('postLoadModal.closedFreightCommentsPlaceholder', 'Only visible to members of the closed freight exchange')}
                        />
                      </div>
                      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white">
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
                <motion.div key="review" className="space-y-3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
                  <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-3">
                    {draft.transportType === 'warehouse' ? (
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-4">
                      <SummaryRow label={u('postLoadModal.titleSummary', 'Title')} value={draft.loadTitle || '—'} />
                      <SummaryRow label={u('postLoadModal.warehouseStorageType', 'Vrsta skladištenja')} value={u(`postLoadModal.storageType.${draft.warehouseStorageType}`, draft.warehouseStorageType)} />
                      <SummaryRow label={u('postLoadModal.pickupBlock', 'Pickup')} value={`${draft.pickupCity || '—'}, ${draft.pickupCountry || '—'}`} />
                      <SummaryRow label={u('postLoadModal.warehousePreferredLocation', 'Željena lokacija skladišta')} value={`${draft.deliveryCity || '—'}, ${draft.deliveryCountry || '—'}`} />
                      <SummaryRow label={u('postLoadModal.specsSummary', 'Specs')} value={`${draft.pallets || '—'} pal. · ${draft.volumeM3 || '—'} CBM · ${draft.weightKg || '—'} t`} />
                      <SummaryRow
                        label={u('postLoadModal.warehouseDuration', 'Trajanje')}
                        value={draft.warehouseIsOngoing
                          ? `${draft.warehouseStartDate || '—'} · ${u('postLoadModal.warehouseOngoing', 'Neograničeno')}`
                          : `${draft.warehouseStartDate || '—'}${draft.warehouseEndDate ? ` - ${draft.warehouseEndDate}` : ''}`}
                      />
                      <SummaryRow label={u('postLoadModal.warehouseServices', 'Required services')} value={draft.loadingEquipment.join(', ') || u('postLoadModal.none', 'None')} />
                      <SummaryRow
                        label={u('postLoadModal.paymentSummary', 'Payout')}
                        value={`${draft.budget || '—'} ${draft.freightCurrency} / ${u(`postLoadModal.rateUnit.${draft.warehouseRateUnit}`, draft.warehouseRateUnit)}`}
                      />
                      <SummaryRow label={u('postLoadModal.contactSummary', 'Contact')} value={`${draft.contactName} · ${draft.contactPhone || draft.contactMobile || draft.contactEmail || '—'}`} />
                      <SummaryRow
                        label={u('postLoadModal.requirements', 'Zahtjevi')}
                        value={[
                          draft.requiresAdr ? u('postLoadModal.adr', 'ADR / certified') : null,
                          draft.warehouseFoodPharma ? u('postLoadModal.foodPharma', 'Food / Pharma') : null,
                          draft.warehouseFragile ? u('postLoadModal.fragileGoods', 'Fragile / sensitive goods') : null,
                          draft.warehouseRequiresCustomsBonded ? u('postLoadModal.warehouseCustomsBonded', 'Carinsko skladište (bonded)') : null,
                          draft.warehouseRequiresRacking ? u('postLoadModal.warehouseRacking', 'Regalno skladištenje') : null,
                          draft.warehouseRequiresInsurance ? u('postLoadModal.warehouseInsurance', 'Osiguranje robe') : null,
                          draft.warehouseRequiresSecurity ? u('postLoadModal.warehouseSecurity', 'Obezbjeđenje / video nadzor') : null,
                        ].filter(Boolean).join(', ') || u('postLoadModal.none', 'None')}
                      />
                    </div>
                    ) : (
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-4">
                      <SummaryRow label={u('postLoadModal.consignee', 'Consignee (customer)')} value={draft.consignee?.text || '—'} />
                      <SummaryRow label={u('postLoadModal.routeSummary', 'Route')} value={`${draft.pickupCity} → ${draft.deliveryCity}`} />
                      <SummaryRow
                        label={u('postLoadModal.transportType', 'Transport types and services')}
                        value={transportOptions.find((option) => option.id === draft.transportType)?.label || draft.transportType}
                      />
                      {draft.transportType === 'air' && (
                        <SummaryRow
                          label={u('postLoadModal.transportMode', 'Transport mode')}
                          value={{
                            'Airport to Airport': u('postLoadModal.transportModeAirportToAirport', 'Airport to Airport'),
                            'Address to Airport': u('postLoadModal.transportModeAddressToAirport', 'Address to Airport'),
                            'Airport to Address': u('postLoadModal.transportModeAirportToAddress', 'Airport to Address'),
                            'Air Freight + Last-Mile Delivery': u('postLoadModal.transportModeAirFreightLastMile', 'Air Freight + Last-Mile Delivery'),
                          }[deriveAirTransportMode(draft.pickupPlaceType, draft.deliveryPlaceType)]}
                        />
                      )}
                      {draft.transportType === 'air' && (
                        <SummaryRow label={u('postLoadModal.aol', 'Loading Airport (AOL)')} value={draft.pickupAirport || '—'} />
                      )}
                      {draft.transportType === 'air' && (
                        <SummaryRow label={u('postLoadModal.aod', 'Discharge Airport (AOD)')} value={draft.deliveryAirport || '—'} />
                      )}
                      {isContainerTransport(draft.transportType) && (
                        <SummaryRow
                          label={draft.transportType === 'rail' ? u('postLoadModal.railTerminalOfLoading', 'Loading terminal') : u('postLoadModal.pol', 'Loading Port (POL)')}
                          value={draft.pickupPort || '—'}
                        />
                      )}
                      {isContainerTransport(draft.transportType) && (
                        <SummaryRow
                          label={draft.transportType === 'rail' ? u('postLoadModal.railTerminalOfDelivery', 'Destination terminal') : u('postLoadModal.pod', 'Discharge Port (POD)')}
                          value={draft.deliveryPort || '—'}
                        />
                      )}
                      {isContainerTransport(draft.transportType) && (
                        <SummaryRow
                          label={draft.transportType === 'rail' ? u('postLoadModal.railTransitTime', 'ETA - transit time (terminal to terminal)') : u('postLoadModal.transitTime', 'ETA - transit time (POL-POD)')}
                          value={draft.transitDays ? `${draft.transitDays} ${u('postLoadModal.transitDays', 'days')}` : '—'}
                        />
                      )}
                      <SummaryRow
                        label={u('postLoadModal.pickupSummary', 'Pickup')}
                        value={`${draft.pickupCountry} · ${draft.pickupDate || '—'}${draft.pickupDateTo ? ` - ${draft.pickupDateTo}` : ''}${draft.pickupTimeFrom ? ` · ${draft.pickupTimeFrom}` : ''}${draft.pickupTimeTo ? ` - ${draft.pickupTimeTo}` : ''}`}
                      />
                      <SummaryRow
                        label={u('postLoadModal.deliverySummary', 'Delivery')}
                        value={`${draft.deliveryCountry} · ${draft.deliveryDate || '—'}${draft.deliveryDateTo ? ` - ${draft.deliveryDateTo}` : ''}${draft.deliveryTimeFrom ? ` · ${draft.deliveryTimeFrom}` : ''}${draft.deliveryTimeTo ? ` - ${draft.deliveryTimeTo}` : ''}`}
                      />
                      <SummaryRow label={u('postLoadModal.titleSummary', 'Title')} value={draft.loadTitle || '—'} />
                      <SummaryRow label={u('postLoadModal.cargoSummary', 'Cargo')} value={deriveGoodsTypeName(draft.hsCodes, draft.goodsType) || '—'} />
                      <SummaryRow label={u('postLoadModal.specsSummary', 'Specs')} value={`${draft.lengthM || '—'} × ${draft.widthM || '—'} × ${draft.heightM || '—'} m · ${draft.weightKg || '—'} t · ${draft.volumeM3 || '—'} CBM · ${draft.additionalInfo || u('postLoadModal.none', 'None')}`} />
                      <SummaryRow label={u('postLoadModal.packagingMethod', 'Packaging method')} value={`${selectedPackageType ? `${selectedPackageType.value} - ${selectedPackageType.label}` : draft.quantityMeasure || '—'} · ${draft.pallets || '—'} ${u('postLoadModal.unitsShort', 'units')}`} />
                      {isContainerTransport(draft.transportType) ? (
                        <SummaryRow label={u('postLoadModal.containerTypesSummary', 'Container types')} value={draft.containerSelections.length ? draft.containerSelections.map((row) => `${row.quantity}x ${containerLabel(row.type)}`).join(', ') : u('postLoadModal.none', 'None')} />
                      ) : (
                        <SummaryRow label={u('postLoadModal.vehicleSummary', 'Vehicle')} value={`${draft.vehicleType} · ${draft.bodyTypes.join(', ') || u('postLoadModal.none', 'None')}`} />
                      )}
                      <SummaryRow
                        label={u('postLoadModal.paymentSummary', 'Payout')}
                        value={isContainerTransport(draft.transportType)
                          ? `${draft.budget || '—'} ${draft.freightCurrency} · ${draft.seaPaymentTerms || '—'}`
                          : `${draft.budget || '—'} ${draft.freightCurrency} · ${draft.paymentDueDays || '—'} ${u('postLoadModal.days', 'days')}`}
                      />
                      <SummaryRow label={u('postLoadModal.incoterm', 'Incoterm')} value={draft.incoterm || '—'} />
                      <SummaryRow label={u('postLoadModal.contactSummary', 'Contact')} value={`${draft.contactName} · ${draft.contactPhone || draft.contactMobile || draft.contactEmail || '—'}`} />
                      <SummaryRow
                        label={u('postLoadModal.flagsSummary', 'Special requirements')}
                        value={[
                          draft.requiresAdr ? (draft.transportType === 'air' ? u('postLoadModal.dgr', 'DGR / certified') : u('postLoadModal.adr', 'ADR / certified')) : null,
                          draft.requiresTailLift ? u('postLoadModal.tailLift', 'Tail lift') : null,
                          draft.urgent ? u('postLoadModal.urgent', 'Priority load') : null,
                          draft.mustBeTrackable ? u('postLoadModal.mustBeTrackableShort', 'Trackable') : null,
                        ].filter(Boolean).join(', ') || u('postLoadModal.none', 'None')}
                      />
                      <SummaryRow label={u('postLoadModal.publicationSummary', 'Publication')} value={draft.closedFreightExchange || u('postLoadModal.openPublication', 'Open publication')} />
                    </div>
                    )}

                    <div className="space-y-4">
                      <div className="rounded-3xl bg-primary text-white p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                          {u('postLoadModal.marketReadiness', 'Posting readiness')}
                        </p>
                        <p className="text-4xl font-black mt-2">
                          {Math.min(
                            100,
                            (draft.transportType === 'warehouse'
                              ? [
                                  draft.pickupCity,
                                  draft.warehouseStartDate,
                                  draft.loadTitle,
                                  draft.pallets || draft.volumeM3,
                                  draft.budget || (draft.receivePriceProposals ? 'negotiable' : ''),
                                  draft.contactName,
                                  draft.contactPhone,
                                ]
                              : [
                                  draft.pickupCity,
                                  draft.deliveryCity,
                                  draft.pickupDate,
                                  draft.deliveryDate,
                                  draft.loadTitle,
                                  draft.weightKg,
                                  draft.budget || (draft.receivePriceProposals ? 'negotiable' : ''),
                                  draft.contactName,
                                  draft.contactPhone,
                                ]
                            ).filter(Boolean).length * (draft.transportType === 'warehouse' ? 14 : 11)
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
          </div>
        </div>

        <div className="relative z-20 shrink-0 border-t border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800">
          {submitError && (
            <div className="mx-5 mt-3 md:mx-7 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
              <p>{submitError}</p>
              {invalidFields.size > 0 && (
                <p className="mt-1 text-xs font-medium text-rose-500/90">{u('postLoadModal.checkHighlightedFields', 'Check the highlighted fields.')}</p>
              )}
            </div>
          )}
          <div className="grid gap-3 px-5 md:px-7 py-3 sm:grid-cols-4">
              <Button variant="outline" className="w-full h-11 gap-2" onClick={() => void startOver()} disabled={isSubmitting}>
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span className="truncate">{u('postLoadModal.startOver', 'Započni ponovo')}</span>
              </Button>
              <Button
                variant="secondary"
                className="w-full h-11 gap-2 border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/15 dark:hover:bg-primary/20"
                onClick={onOpenLenaAI ?? (() => setDropzoneOpen(true))}
                disabled={isSubmitting || draft.transportType === 'warehouse'}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span className="truncate">{u('postLoadModal.fillWithLenaAI', 'Popuni pomoću LenaAI')}</span>
              </Button>
              <Button
                variant="secondary"
                className="w-full h-11 gap-2 border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/15 dark:hover:bg-primary/20"
                onClick={() => void saveDraft()}
                disabled={isSubmitting || savingDraft || draft.transportType === 'warehouse'}
              >
                <Save className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {savingDraft
                    ? u('postLoadModal.savingDraft', 'Spašavanje...')
                    : draftSavedAt
                      ? `${u('postLoadModal.saveDraft', 'Spasi draft')} · ${draftSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : u('postLoadModal.saveDraft', 'Spasi draft')}
                </span>
              </Button>
              {isLastMileEligible && !editLoadId ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button className="w-full h-11 gap-2" onClick={() => void submit()} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <Send className="w-4 h-4 shrink-0" />}
                    <span className="truncate">{isSubmitting ? u('postLoadModal.publishing', 'Saving...') : u('common.postLoad', 'Objava na berzu tereta')}</span>
                  </Button>
                  <Button className="w-full h-11 gap-2" onClick={() => void submitWithLastMile()} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <Truck className="w-4 h-4 shrink-0" />}
                    <span className="truncate">{isSubmitting ? u('postLoadModal.publishing', 'Saving...') : u('postLoadModal.publishLastMileButton', 'Post + Last Mile')}</span>
                  </Button>
                </div>
              ) : (
                <Button className="w-full h-11 gap-2" onClick={submit} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <Send className="w-4 h-4 shrink-0" />}
                  <span className="truncate">
                    {isSubmitting
                      ? u('postLoadModal.publishing', 'Saving...')
                      : editLoadId
                        ? u('common.save', 'Save changes')
                        : draft.transportType === 'warehouse'
                          ? u('common.postWarehouse', 'Objavi na berzu skladišta')
                          : u('common.postLoad', 'Objava na berzu tereta')}
                  </span>
                </Button>
              )}
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
      ))}
    </AnimatePresence>
  );
};
