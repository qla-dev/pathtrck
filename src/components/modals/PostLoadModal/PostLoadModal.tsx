import { lenaText, lenaField, lenaFieldChoices, lenaOptionDescription, lenaOptionIcon } from '../../../lib/lenaCatalog';
import { lenaIcon } from '../../../lib/lenaIcons';
import { calculateVolume } from './volume';
import { AddWarehouseModal } from '../AddWarehouseModal/AddWarehouseModal';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Apple,
  Blinds,
  Box,
  Boxes,
  Container,
  CalendarDays,
  Camera,
  CheckCircle2,
  CircleDot,
  Clock3,
  Coins,
  Cpu,
  Diamond,
  DoorOpen,
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
  Ruler,
  ArrowDownToLine,
  Barcode,
  BadgeCheck,
  Landmark,
  Radar,
  Save,
  Scissors,
  ScanEye,
  ScanLine,
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
import { IconSelect } from '../../ui/IconSelect';
import { AI_DISPATCH_SUBJECT_PREFIX, api, ApiError, ApiUser, HsCodeMatch, LoadScanResult } from '../../../services/api';
import { CustomerSelect, customerOptionFromRecord, type CustomerOption } from '../../customer/CustomerSelect';
import { HsCodeChip } from '../../hs/HsCodeChip';
import { INVALID_FIELD_CLASS, describeApiErrors, stepForField, validateDraft, type ValidationIssues } from './validation';
import { AddressMapModal } from '../../maps/AddressMapModal';
import { AreaMapModal } from '../../maps/AreaMapModal';
import { RouteMapModal } from '../../maps/RouteMapModal';
import { RoutePreviewMap, type RoutePreviewStop } from '../../maps/RoutePreviewMap';
import { useRouteGeometry } from '../../maps/useRouteGeometry';
import { CountrySelect } from '../../location/CountrySelect';
import { SEA_PORTS, SeaPort } from '../../../data/seaPorts';
import { SEA_CONTAINER_TYPES, SEA_CONTAINER_CATEGORIES, containerLabel } from '../../../data/seaContainers';
import { DocumentDropzone } from '../DocumentDropzone';
import { ScanResultModal } from '../ScanResultModal';
import { ScanFieldPatch, deriveGoodsTypeCode, deriveGoodsTypeName, stripHsCodesForPayload, resolveHsCodes, hsSectionIcon } from '../scanFieldRows';
import {
  AIR_SPECIAL_REQUIREMENT_OPTIONS,
  AIR_TAIL_LIFT_REQUIREMENT,
  BODY_TYPE_OPTIONS,
  CLOSED_EXCHANGE_OPTIONS,
  CONTACT_OPTIONS,
  INCOTERM_OPTIONS,
  SEA_PAYMENT_TERMS_OPTIONS,
  WAREHOUSE_EQUIPMENT_OPTIONS,
} from '../loadFormOptions';
import type { PostLoadModalProps, StepId, TransportType, ScannedDocument, LoadDraft, ContainerSelection, RouteStopDraft } from './types';
import { EQUIPMENT_COVERED_REQUIREMENTS, INITIAL_DRAFT, emptyRouteStop, isContainerTransport } from './types';
import {
  PRIMARY_STOP_FIELDS,
  routeStopsOf,
  stopPosition,
  stopsOfSide,
  withMovedStop,
  withStopPatch,
  withStopsOfSide,
  type StopSide,
} from './routeStops';
import { RouteStopsColumn } from './RouteStopsColumn';
import { RouteStopTimeline } from './RouteStopTimeline';
import { placeTypeIcon } from './placeTypeIcon';
import type { EquipmentCoveredRequirement } from './types';
import {
  toApiDateTime,
  toApiDate,
  fromApiDateTime,
  fromApiWeightKg,
  toApiWeightKg,
  toApiLengthM,
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
import { WarehouseLocationFields, WarehouseStorageTypeField, type OwnedWarehouse } from './WarehouseFormFields';
import { CustomsDocumentsPanel } from './CustomsDocumentsPanel';
import { DocumentTypeToggleCard } from './DocumentTypeToggleCard';

// One load_stops row as an editable stop. Only the added stops go through this - stop 1 of each
// side is spread across the draft's flat pickup*/delivery* fields instead.
const routeStopFromRecord = (record: Record<string, unknown>): RouteStopDraft => {
  const from = fromApiDateTime(record.window_starts_at);
  const to = fromApiDateTime(record.window_ends_at);
  return {
    placeType: String(record.place_type || 'Warehouse'),
    city: String(record.city || ''),
    postalCode: String(record.postal_code || ''),
    country: String(record.country_code || 'BA'),
    address: String(record.address || ''),
    port: String(record.port || ''),
    airport: String(record.airport || ''),
    latitude: String(record.latitude ?? ''),
    longitude: String(record.longitude ?? ''),
    date: from.date,
    dateTo: to.date,
    timeFrom: from.time,
    timeTo: to.time,
  };
};

const STEPS: Array<{ id: StepId; icon: typeof MapPin }> = [
  { id: 'cargo', icon: Package },
  { id: 'route', icon: MapPin },
  { id: 'contact', icon: UserRound },
  { id: 'review', icon: CheckCircle2 },
];


// Which AI-refillable fields (the ones wrapped in fieldLabel(...) below) live under each step, so
// the sidebar can show a per-step count instead of only the one global aiFieldCount badge.
const STEP_AI_FIELDS: Record<StepId, Array<keyof ScanFieldPatch & keyof LoadDraft>> = {
  route: ['pickupCountry', 'pickupCity', 'pickupPostalCode', 'pickupDate', 'deliveryCountry', 'deliveryCity', 'deliveryPostalCode', 'deliveryDate'],
  cargo: ['consignee', 'bookingReference', 'loadTitle', 'lengthM', 'weightKg', 'pallets', 'volumeM3', 'widthM', 'heightM', 'temperatureControlled', 'vehicleType', 'bodyTypes'],
  contact: ['contactName', 'contactEmail', 'contactPhone', 'budget', 'freightCurrency', 'paymentDeferred', 'incoterm', 'notes'],
  review: [],
};


export const PostLoadModal = ({ isOpen, onClose, lang, editLoadId = null, onSaved, initialPrefill = null, lockedTransportType = null, onOpenLenaAI, sourceConversationId = null, initialDraftId = null, onDraftConversationCreated }: PostLoadModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const transportOptions = [
    {
      id: 'road' as const,
      label: u('postLoadModal.transport.road', ''),
      description: u('postLoadModal.transport.roadDesc', ''),
      icon: Truck,
      iconTone: 'text-emerald-500',
      iconSurface: 'bg-emerald-500/10',
    },
    {
      id: 'air' as const,
      label: u('postLoadModal.transport.air', ''),
      description: u('postLoadModal.transport.airDesc', ''),
      icon: Plane,
      iconTone: 'text-sky-500',
      iconSurface: 'bg-sky-500/10',
    },
    {
      id: 'sea' as const,
      label: u('postLoadModal.transport.sea', ''),
      description: u('postLoadModal.transport.seaDesc', ''),
      icon: Ship,
      iconTone: 'text-blue-500',
      iconSurface: 'bg-blue-500/10',
    },
    {
      id: 'rail' as const,
      label: u('postLoadModal.transport.rail', ''),
      description: u('postLoadModal.transport.railDesc', ''),
      icon: TrainFront,
      iconTone: 'text-violet-500',
      iconSurface: 'bg-violet-500/10',
    },
    {
      id: 'warehouse' as const,
      label: u('postLoadModal.transport.warehouse', ''),
      description: u('postLoadModal.transport.warehouseDesc', ''),
      icon: Warehouse,
      iconTone: 'text-orange-500',
      iconSurface: 'bg-orange-500/10',
    },
  ];
  // What each transport type can be booked as, and how it can be loaded: both lists live in the
  // LenaAI catalog, which is also what the guided chat offers for these two steps.
  const shipmentTypeOptions = (transport: TransportType) =>
    transport === 'warehouse' ? [] : lenaFieldChoices(lang, 'cargoType', transport).map((choice) => choice.value);
  const loadingEquipmentOptions = (transport: TransportType) =>
    lenaFieldChoices(lang, 'loadingEquipment', transport).map((choice) => choice.value);
  // True when the picker above already offers an option that says the same thing, in which case the
  // requirement toggle is a duplicate and is not rendered.
  const equipmentCovers = (requirement: EquipmentCoveredRequirement) =>
    EQUIPMENT_COVERED_REQUIREMENTS[requirement].some((option) =>
      loadingEquipmentOptions(draft.transportType).includes(option));
  const [step, setStep] = useState<StepId>('cargo');
  const contentScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0 });
  }, [step]);
  const [draft, setDraft] = useState<LoadDraft>(INITIAL_DRAFT);
  const activeTransportOption = transportOptions.find((option) => option.id === draft.transportType);
  // The packaging registry is the catalog's, so the guided chat offers the very same list.
  const selectedPackageType = lenaFieldChoices(lang, 'quantityMeasure', draft.transportType)
    .find((choice) => choice.value === draft.quantityMeasure);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  // Which stop the full-screen address picker is currently choosing a point for - the side plus
  // its position on that side, since either column can hold several stops.
  const [addressMap, setAddressMap] = useState<{ side: StopSide; index: number } | null>(null);
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
  const [addWarehouseOpen, setAddWarehouseOpen] = useState(false);
  const [ownedWarehouses, setOwnedWarehouses] = useState<OwnedWarehouse[]>([]);
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void api.auth.me().then((user) => { if (!cancelled) setCurrentUser(user); }).catch(() => {});
    return () => { cancelled = true; };
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen || draft.transportType !== 'warehouse') return undefined;
    let cancelled = false;
    void api.warehouse.overview().then((response) => {
      if (cancelled) return;
      const rows = Array.isArray(response.data.warehouses) ? response.data.warehouses : [];
      setOwnedWarehouses(rows.map((row) => ({
        id: Number(row.id),
        name: String(row.name || `#${row.id}`),
        city: String(row.city || ''),
        countryCode: String(row.country_code || ''),
        address: String(row.address || ''),
        latitude: String(row.latitude ?? ''),
        longitude: String(row.longitude ?? ''),
      })).filter((row) => row.id > 0));
    }).catch(() => setOwnedWarehouses([]));
    return () => { cancelled = true; };
  }, [draft.transportType, isOpen]);
  const hsSearchRef = useRef<HTMLDivElement>(null);
  useOutsideClick(hsSearchRef, () => setHsSuggestions([]), hsSuggestions.length > 0);

  const selectOwnedWarehouse = (warehouse: OwnedWarehouse) => {
    setDraft((current) => ({
      ...current,
      storageTarget: 'own',
      warehouseId: String(warehouse.id),
      warehouseName: warehouse.name,
      deliveryPlaceType: 'Warehouse',
      deliveryCity: warehouse.city,
      deliveryCountry: warehouse.countryCode,
      deliveryAddress: warehouse.address,
      deliveryLatitude: warehouse.latitude,
      deliveryLongitude: warehouse.longitude,
    }));
  };

  const resetDraftState = () => {
    setStep('cargo');
    // A locked mode is what the form opens as, so it survives the reset the way the blank draft does.
    setDraft(lockedTransportType ? { ...INITIAL_DRAFT, transportType: lockedTransportType } : INITIAL_DRAFT);
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
      if (lockedTransportType) setDraft((current) => ({ ...current, transportType: lockedTransportType }));
    }
  }, [isOpen, lockedTransportType]);

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
      // A road load can carry several of each; stop 1 of a side fills the flat fields the whole
      // app reads as origin and destination, and the rest come back as the added stops they were.
      const pickupStopRecords = stops.filter((item) => item.type === 'pickup');
      const deliveryStopRecords = stops.filter((item) => item.type === 'delivery');
      const pickup = pickupStopRecords[0] || {};
      const delivery = deliveryStopRecords[0] || {};
      const pickupStart = fromApiDateTime(pickup.window_starts_at);
      const pickupEnd = fromApiDateTime(pickup.window_ends_at);
      const deliveryStart = fromApiDateTime(delivery.window_starts_at);
      const deliveryEnd = fromApiDateTime(delivery.window_ends_at);
      const contact = (record.contact || {}) as Record<string, unknown>;
      const supplier = (contact.supplier || {}) as Record<string, unknown>;
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
        extraPickups: pickupStopRecords.slice(1).map(routeStopFromRecord),
        extraDeliveries: deliveryStopRecords.slice(1).map(routeStopFromRecord),
        consignee,
        bookingReference: String(record.booking_reference || ''),
        transportType: (record.transport_type as TransportType) || 'road',
        pickupPlaceType: String(pickup.place_type || INITIAL_DRAFT.pickupPlaceType), pickupCity: String(pickup.city || ''), pickupPostalCode: String(pickup.postal_code || ''), pickupCountry: String(pickup.country_code || 'BA'), pickupAddress: String(pickup.address || ''), pickupPort: String(pickup.port || ''), pickupAirport: String(pickup.airport || ''), pickupLatitude: String(pickup.latitude || ''), pickupLongitude: String(pickup.longitude || ''), pickupDate: pickupStart.date, pickupDateTo: pickupEnd.date, pickupTimeFrom: pickupStart.time, pickupTimeTo: pickupEnd.time,
        deliveryPlaceType: String(delivery.place_type || INITIAL_DRAFT.deliveryPlaceType), deliveryCity: String(delivery.city || record.warehouse_city || ''), deliveryPostalCode: String(delivery.postal_code || ''), deliveryCountry: String(delivery.country_code || record.warehouse_country_code || 'BA'), deliveryAddress: String(delivery.address || record.warehouse_address || ''), deliveryPort: String(delivery.port || ''), deliveryAirport: String(delivery.airport || ''), deliveryLatitude: String(delivery.latitude || record.warehouse_latitude || ''), deliveryLongitude: String(delivery.longitude || record.warehouse_longitude || ''), deliveryRadiusKm: String(record.warehouse_radius_km || delivery.radius_km || INITIAL_DRAFT.deliveryRadiusKm), deliveryDate: deliveryStart.date || String(record.storage_start_date || '').slice(0, 10), deliveryDateTo: deliveryEnd.date || String(record.storage_end_date || '').slice(0, 10), deliveryTimeFrom: deliveryStart.time, deliveryTimeTo: deliveryEnd.time,
        transitDays: String(record.transit_days || ''),
        dimensionScope: record.dimension_scope === 'per_unit' ? 'per_unit' : 'overall', loadTitle: String(record.title || ''), cargoType: String(record.cargo_type || 'FTL'), goodsType: String(record.goods_type || 'General'), hsCodes, customsDocuments: Array.isArray(record.customs_documents) ? record.customs_documents as LoadDraft['customsDocuments'] : [], weightKg: fromApiWeightKg(record.weight_kg), pallets: String(record.pallets || ''), quantityMeasure: String(record.quantity_measure || ''), lengthM: String(record.length_m || ''), widthM: String(record.width_m || ''), heightM: String(record.height_m || ''), volumeM3: String(record.volume_m3 || ''), declaredValue: String(record.declared_value || ''), budget: String(record.budget || ''), freightCurrency: String(record.currency || 'EUR'), shipmentValueCurrency: String(record.shipment_value_currency || record.currency || 'EUR'), paymentDueDays: String(record.payment_due_days || ''), paymentDeferred: terms === 'deferred', seaPaymentTerms: SEA_PAYMENT_TERMS_OPTIONS.includes(terms) ? terms : '', incoterm: String(record.incoterms || ''),
        loadingEquipment: Array.isArray(record.handling_requirements) ? record.handling_requirements.map(String) : Array.isArray(record.loading_methods) ? record.loading_methods.map(String) : [], vehicleType: String(record.vehicle_type || INITIAL_DRAFT.vehicleType), characteristics: Array.isArray(record.characteristics) ? record.characteristics.map(String) : [], specialRequirements: Array.isArray(record.special_requirements) ? record.special_requirements.map(String) : [], deliveryProof: String(record.delivery_proof || ''), temperatureControlled: record.temperature_min != null || record.temperature_max != null, temperatureMin: String(record.temperature_min ?? ''), temperatureMax: String(record.temperature_max ?? ''),
        containerSelections: Array.isArray(record.container_selections) ? (record.container_selections as Array<Record<string, unknown>>).map((row) => ({ type: String(row.type || ''), quantity: String(row.quantity ?? '1') })) : [],
        blType: String(record.bl_type || ''), dgUnNumber: String(record.dg_un_number || ''), dgImoClass: String(record.dg_imo_class || ''), dgPackingGroup: String(record.dg_packing_group || ''), dgProperShippingName: String(record.dg_proper_shipping_name || ''),
        warehouseStorageType: String(record.storage_type || INITIAL_DRAFT.warehouseStorageType), warehouseStartDate: String(record.storage_start_date || '').slice(0, 10), warehouseEndDate: String(record.storage_end_date || '').slice(0, 10), warehouseIsOngoing: Boolean(record.is_storage_ongoing), warehouseTemperatureMin: String(record.temperature_min ?? ''), warehouseTemperatureMax: String(record.temperature_max ?? ''), warehouseRequiresCustomsBonded: Boolean(record.requires_customs_bonded), warehouseRequiresRacking: Boolean(record.requires_racking), warehouseRequiresInsurance: Boolean(record.insurance_required), warehouseRequiresSecurity: Boolean(record.requires_security), warehouseRateUnit: String(record.rate_unit || INITIAL_DRAFT.warehouseRateUnit), warehouseFoodPharma: Boolean(record.requires_food_grade), warehouseFragile: Boolean(record.is_fragile),
        oogInGauge: String(record.oog_in_gauge || ''), oogLengthM: String(record.oog_length_m ?? ''), oogWidthM: String(record.oog_width_m ?? ''), oogHeightM: String(record.oog_height_m ?? ''), oogWeightKg: String(record.oog_weight_kg ?? ''),
        requiresAdr: Boolean(record.requires_adr), requiresTailLift: Boolean(record.requires_tail_lift), tollRoadsIncluded: Boolean(record.toll_roads_included), ferryIncluded: Boolean(record.ferry_included), cmrRequired: record.cmr_required == null ? true : Boolean(record.cmr_required), palletExchangeRequired: Boolean(record.pallet_exchange_required), customsRequired: Boolean(record.customs_required), insuranceRequired: Boolean(record.insurance_required), certificationRequired: Boolean(record.certification_required), inspectionServicesRequired: Boolean(record.inspection_services_required), mustBeTrackable: Boolean(record.must_be_trackable), urgent: Boolean(record.is_urgent), receivePriceProposals: record.is_negotiable == null ? true : Boolean(record.is_negotiable), bodyTypes: Array.isArray(record.body_types) ? record.body_types.map(String) : [], notes: String(record.notes || ''), internalComments: String(record.internal_comments || ''), externalComments: String(record.external_comments || ''), supplierName: String(supplier.name || ''), supplierEmail: String(supplier.email || ''), supplierPhone: String(supplier.phone || ''), supplierMobile: String(supplier.mobile || ''), supplierFax: String(supplier.fax || ''), contactName: String(contact.name || ''), contactPhone: String(contact.phone || ''), contactMobile: String(contact.mobile || ''), contactEmail: String(contact.email || ''), contactFax: String(contact.fax || ''),
      });
    }).catch((error) => setSubmitError(error instanceof Error ? error.message : u('postLoadModal.loadFetchError', ''))).finally(() => setIsLoadingExisting(false));
  }, [editLoadId, isOpen]);

  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const pickupRoutePosition = routePosition(draft.pickupLatitude, draft.pickupLongitude);
  const deliveryRoutePosition = routePosition(draft.deliveryLatitude, draft.deliveryLongitude);
  // Every stop of the route in driving order. A road load can collect and drop at several
  // addresses, so what used to be one pickup and one delivery is now whatever the two columns hold.
  const routeStops = routeStopsOf(draft);
  const pickupStops = stopsOfSide(draft, 'pickup');
  const deliveryStops = stopsOfSide(draft, 'delivery');
  // How a stop is named wherever the route is summarised: a single pickup is still the origin and a
  // single delivery the destination, while a multi-stop side numbers its stops the way its cards do.
  const routeStopName = (side: StopSide, index: number) => {
    const total = side === 'pickup' ? pickupStops.length : deliveryStops.length;
    if (side === 'pickup') {
      return total > 1 ? `${u('postLoadModal.pickupBlock', '')} ${index + 1}` : u('postLoadModal.origin', '');
    }
    return total > 1 ? `${u('postLoadModal.deliveryBlock', '')} ${index + 1}` : u('postLoadModal.destination', '');
  };
  // Only stops that have been geocoded can be drawn or measured; the rest are still being typed.
  const routeMapStops: Array<RoutePreviewStop & { side: StopSide }> = routeStops.flatMap(({ stop, side, index }) => {
    const position = stopPosition(stop);
    if (!position) return [];
    return [{
      label: stop.address || stop.city || stop.port || stop.airport || routeStopName(side, index),
      position,
      kind: side,
      // Marked by what kind of place it is, the same icon its card and the route timeline show.
      icon: placeTypeIcon(stop.placeType, side === 'pickup' ? MapPin : Truck),
      side,
    }];
  });
  // Whichever stop the full-screen address picker was opened from, so it can start on that point.
  const addressMapStop = addressMap ? stopsOfSide(draft, addressMap.side)[addressMap.index] ?? null : null;
  // Set while a stop named only by city is being geocoded, which the distance stripe waits out.
  const [recalculatingRoute, setRecalculatingRoute] = useState(false);
  // The whole trip as the crow flies, leg by leg, with a detour factor on top. It is arithmetic
  // over coordinates, so it is instant and always available - but it is not a road.
  const straightLineDistanceKm = pickupRoutePosition && deliveryRoutePosition && routeMapStops.length >= 2
    ? routeMapStops.slice(1).reduce((total, entry, index) => total + estimatedDrivingDistanceKm(routeMapStops[index].position, entry.position), 0)
    : null;
  // Anything that travels by road should be measured on one. The preview map already asks the
  // router for the line it draws, and the same answer carries the distance actually driven - which
  // is the figure the full-screen map has always shown, and the one the estimate above disagreed
  // with. Air keeps the straight line, because that is what an aircraft flies, and a storage
  // request has no leg of its own - it names a warehouse, not a trip to one.
  const drivesOnRoads = draft.transportType === 'road';
  const drivenRoute = useRouteGeometry(
    routeMapStops.map((entry) => entry.position),
    step === 'route' && drivesOnRoads && routeMapStops.length >= 2
  );
  // The router is a best-effort public service: when it cannot answer, the estimate still does.
  const routeDistanceKm = drivesOnRoads && drivenRoute.distanceKm !== null ? drivenRoute.distanceKm : straightLineDistanceKm;
  // Nothing is shown while the real distance is on its way, rather than a number that then jumps.
  const measuringRoute = recalculatingRoute || (drivesOnRoads && drivenRoute.loading);

  // AI prefill often only gives city/address text, not coordinates, so the distance stripe has
  // nothing to compute from. Geocode the missing side(s) once when the Route step is opened -
  // never when a real coordinate is already present, and not on every keystroke while editing.
  useEffect(() => {
    if (step !== 'route') return;
    // Every stop named by city but not yet placed - added stops included, so a multi-drop route is
    // measured and drawn end to end rather than skipping over the ones typed by hand.
    const pending = routeStopsOf(draft).filter(({ stop }) => !stopPosition(stop) && stop.city.trim() !== '');
    if (pending.length === 0) return;

    let cancelled = false;
    setRecalculatingRoute(true);
    (async () => {
      try {
        for (const { stop, side, index } of pending) {
          if (cancelled) break;
          const query = [stop.address, stop.city, stop.country].filter(Boolean).join(', ');
          const [result] = await searchLocations(query).catch(() => []);
          if (result && !cancelled) {
            setDraft((current) => withStopPatch(current, side, index, { latitude: String(result.latitude), longitude: String(result.longitude) }));
          }
        }
      } finally {
        if (!cancelled) setRecalculatingRoute(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Only re-run when the step is (re-)opened, not on every keystroke in a stop's fields.
  }, [step]);
  const stepCompletion = useMemo<Record<StepId, boolean>>(
    () => ({
      // A storage request has no pickup to fill in, and picking one of your own warehouses is what
      // makes its destination complete.
      route: draft.transportType === 'warehouse'
        ? Boolean(draft.deliveryCity && draft.deliveryDate && (draft.storageTarget !== 'own' || draft.warehouseId))
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
        draft.supplierName?.trim() && draft.supplierEmail?.trim() && draft.supplierPhone?.trim() && draft.contactName &&
          (draft.contactPhone || draft.contactMobile || draft.contactEmail) &&
          (draft.receivePriceProposals || draft.budget) &&
          draft.incoterm
      ),
      review: true,
    }),
    [draft]
  );

  const setField = <K extends keyof LoadDraft>(key: K, value: LoadDraft[K]) => {
    setDraft((prev) => {
      const next = { ...prev, [key]: value };
      if (['lengthM', 'widthM', 'heightM', 'dimensionScope'].includes(key)
        || (key === 'pallets' && next.dimensionScope === 'overall')) {
        next.volumeM3 = calculateVolume(next) ?? '';
      }
      return next;
    });
  };

  const conciseNumber = (value: number) => String(Number(value.toFixed(6)));
  const changeWeightUnit = (nextUnit: LoadDraft['weightUnit']) => {
    setDraft((current) => ({
      ...current,
      weightKg: current.weightKg
        ? conciseNumber(toApiWeightKg(current.weightKg, current.weightUnit) / (nextUnit === 't' ? 1000 : 1))
        : '',
      weightUnit: nextUnit,
    }));
  };
  const changeDimensionUnit = (nextUnit: LoadDraft['lengthUnit']) => {
    setDraft((current) => {
      const multiplier = ({ m: 1, cm: 100, mm: 1000 } as const)[nextUnit];
      const convert = (value: string, unit: LoadDraft['lengthUnit']) =>
        value ? conciseNumber(toApiLengthM(value, unit) * multiplier) : '';
      return {
        ...current,
        lengthM: convert(current.lengthM, current.lengthUnit),
        widthM: convert(current.widthM, current.widthUnit),
        heightM: convert(current.heightM, current.heightUnit),
        lengthUnit: nextUnit,
        widthUnit: nextUnit,
        heightUnit: nextUnit,
      };
    });
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
    // The API names a stop by its index in the payload, which only says which card it is once it
    // is known how many pickups came before the deliveries.
    // A storage request travels as its single warehouse stop, with no pickup ahead of it.
    const described = describeApiErrors(u, error.errors, draft.transportType === 'warehouse'
      ? { pickupCount: 0, deliveryCount: 1 }
      : {
        pickupCount: draft.extraPickups.length + 1,
        deliveryCount: draft.extraDeliveries.length + 1,
      });
    rejectSubmit({ message: described.message || error.message, fields: described.fields });
  };

  const aiFieldCount = Object.keys(aiFilledPatch).length;

  const isAiField = (key: keyof ScanFieldPatch) => aiFilledPatch[key] !== undefined;

  // A storage request's Route step shows no pickup, so an AI-filled pickup field must not be
  // counted there - the badge would promise fields the step has nowhere to show.
  const countsAsAiField = (key: keyof ScanFieldPatch) =>
    isAiField(key) && !(draft.transportType === 'warehouse' && String(key).startsWith('pickup'));

  const aiFieldCountByStep = useMemo(() => Object.fromEntries(
    (Object.keys(STEP_AI_FIELDS) as StepId[]).map((id) => [
      id,
      STEP_AI_FIELDS[id].filter((key) => countsAsAiField(key)).length,
    ])
  ) as Record<StepId, number>, [aiFilledPatch, draft.transportType]);

  const reprefillField = async <K extends keyof ScanFieldPatch & keyof LoadDraft>(key: K) => {
    const aiValue = aiFilledPatch[key];
    if (aiValue === undefined) return;
    const confirmed = await confirmAction({
      title: u('postLoadModal.confirmRefillTitle', ''),
      text: u('postLoadModal.confirmRefillText', ''),
      confirmText: u('postLoadModal.confirmRefillButton', ''),
    });
    if (!confirmed) return;
    setField(key, aiValue as LoadDraft[K]);
  };

  // Label, tooltip question and placeholder all come from the LenaAI catalog's definition of the
  // field (backend/resources/lena/schema.json), so the form and the guided chat never hold two
  // copies of the same wording.
  const fieldLabel = (key: keyof ScanFieldPatch & keyof LoadDraft, labelKey?: string) => (
    <FieldLabel
      ai={isAiField(key)}
      question={lenaField(lang, key)?.question}
      title={u('postLoadModal.aiRefillHint', '')}
      onReprefill={() => void reprefillField(key)}
    >
      {labelKey ? u(labelKey, '') : lenaField(lang, key)?.label ?? ''}
    </FieldLabel>
  );
  /** What a filled-in answer for this field looks like - the form shows it as the placeholder. */
  const fieldExample = (field: string) => lenaField(lang, field)?.example ?? '';
  const fieldTitle = (field: string) => lenaField(lang, field)?.label ?? '';
  const optionDescription = (option: string) => lenaOptionDescription(lang, option);
  // Which glyph an option is drawn with is the catalog's call, so a card here and a LenaAI chat
  // pill show the same thing.
  const optionIcon = (option: string, fallback: LucideIcon = CircleDot) => lenaIcon(lenaOptionIcon(option), fallback);
  /** The values a field's own picker offers for the transport type this draft is on. */
  const fieldChoices = (field: string) => lenaFieldChoices(lang, field, draft.transportType);
  const fieldOptions = (field: string, icon: LucideIcon) =>
    fieldChoices(field).map((choice) => ({ value: choice.value, label: choice.label, icon }));
  // The icon a stop is marked with is presentation, so it stays here; a rail leg is drawn as a
  // train where sea draws a ship, even though both save the same leg value.
  const placeTypeChoices = (field: 'pickupPlaceType' | 'deliveryPlaceType') =>
    fieldChoices(field).map((choice) => ({
      ...choice,
      icon: draft.transportType === 'rail' && choice.value === 'Port to Port'
        ? TrainFront
        : placeTypeIcon(choice.value, choice.value.includes('Door') ? Truck : MapPin),
    }));

  // A stop card asks for its labels by the stop's own field name. Stop 1 of a side maps back onto
  // a draft field LenaAI may have filled, so it keeps the AI-refill marker; added stops have no
  // draft field behind them and get a plain label.
  const stopFieldLabel = (side: StopSide, index: number, field: keyof RouteStopDraft) =>
    index === 0
      ? fieldLabel(PRIMARY_STOP_FIELDS[side][field] as keyof ScanFieldPatch & keyof LoadDraft)
      : <FieldLabel>{fieldTitle(PRIMARY_STOP_FIELDS[side][field])}</FieldLabel>;

  // Likewise for the red outlines a rejected submit leaves behind - they name draft fields, which
  // only stop 1 of each side has.
  const stopInvalidClass = (side: StopSide, index: number, field: keyof RouteStopDraft) =>
    index === 0 ? invalidClass(PRIMARY_STOP_FIELDS[side][field]) : '';

  const addStop = (side: StopSide) => setDraft((current) => withStopsOfSide(
    current,
    side,
    [...stopsOfSide(current, side), emptyRouteStop(current[PRIMARY_STOP_FIELDS[side].country] as string)]
  ));

  const removeStop = (side: StopSide, index: number) => setDraft((current) => withStopsOfSide(
    current,
    side,
    stopsOfSide(current, side).filter((_, position) => position !== index)
  ));

  const toggleWarehouseEquipment = (value: string) => {
    setDraft((prev) => ({
      ...prev,
      warehouseEquipment: prev.warehouseEquipment.includes(value)
        ? prev.warehouseEquipment.filter((item) => item !== value)
        : [...prev.warehouseEquipment, value],
    }));
  };

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


  // DG / IMO and OOG are the only options that need more than a yes: their extra fields open in a
  // popover on the option itself instead of unfolding under the whole grid.
  const characteristicDetail = (option: string) => {
    if (option === 'DG / IMO') {
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <FieldLabel>{u('postLoadModal.dgUnNumber', '')}</FieldLabel>
            <Input value={draft.dgUnNumber} onChange={(e) => setField('dgUnNumber', e.target.value)} placeholder={fieldExample('dgUnNumber')} />
          </div>
          <div className="space-y-1">
            <FieldLabel>{u('postLoadModal.dgImoClass', '')}</FieldLabel>
            <Input value={draft.dgImoClass} onChange={(e) => setField('dgImoClass', e.target.value)} placeholder={fieldExample('dgImoClass')} />
          </div>
          <div className="space-y-1">
            <FieldLabel>{fieldTitle('dgPackingGroup')}</FieldLabel>
            {/* A packing group is one of three fixed values, so it is picked rather than typed -
                the same three the guided chat offers. */}
            <Select value={draft.dgPackingGroup} onChange={(e) => setField('dgPackingGroup', e.target.value)}>
              <option value="">{u('postLoadModal.pleaseSelect', '')}</option>
              {fieldChoices('dgPackingGroup').map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <FieldLabel>{u('postLoadModal.dgProperShippingName', '')}</FieldLabel>
            <Input value={draft.dgProperShippingName} onChange={(e) => setField('dgProperShippingName', e.target.value)} />
          </div>
        </div>
      );
    }
    if (option === 'OOG') {
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <FieldLabel>{u('postLoadModal.oogGauge', '')}</FieldLabel>
            <div className="grid grid-cols-2 gap-2">
              <ChoiceCard compact active={draft.oogInGauge === 'in_gauge'} title={u('postLoadModal.inGauge', '')} icon={Package} onClick={() => setField('oogInGauge', 'in_gauge')} />
              <ChoiceCard compact active={draft.oogInGauge === 'out_of_gauge'} title={u('postLoadModal.outOfGauge', '')} icon={Layers} onClick={() => setField('oogInGauge', 'out_of_gauge')} />
            </div>
          </div>
          {draft.oogInGauge === 'out_of_gauge' && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <FieldLabel>{u('postLoadModal.oogLength', '')}</FieldLabel>
                <Input type="number" min="0" value={draft.oogLengthM} onChange={(e) => setField('oogLengthM', e.target.value)} />
              </div>
              <div className="space-y-1">
                <FieldLabel>{u('postLoadModal.oogWidth', '')}</FieldLabel>
                <Input type="number" min="0" value={draft.oogWidthM} onChange={(e) => setField('oogWidthM', e.target.value)} />
              </div>
              <div className="space-y-1">
                <FieldLabel>{u('postLoadModal.oogHeight', '')}</FieldLabel>
                <Input type="number" min="0" value={draft.oogHeightM} onChange={(e) => setField('oogHeightM', e.target.value)} />
              </div>
              <div className="space-y-1">
                <FieldLabel>{u('postLoadModal.oogWeight', '')}</FieldLabel>
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
      if (draft.oogInGauge === 'in_gauge') return u('postLoadModal.inGauge', '');
      if (draft.oogInGauge !== 'out_of_gauge') return '';
      const dimensions = [draft.oogLengthM, draft.oogWidthM, draft.oogHeightM].filter(Boolean).join('×');
      return dimensions ? `${dimensions} m` : u('postLoadModal.outOfGauge', '');
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

  // Sidebar navigation is intentionally unrestricted - AI-fill can populate
  // fields across steps out of order, so gating on completion just gets in the way.
  const canNavigateToStep = (_targetIndex: number) => true;

  const startOver = async () => {
    const confirmed = await confirmAction({
      title: u('postLoadModal.restartTitle', ''),
      text: u('postLoadModal.restartText', ''),
      confirmText: u('postLoadModal.restartConfirm', ''),
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
              subject: `${AI_DISPATCH_SUBJECT_PREFIX}${draft.loadTitle || u('postLoadModal.draftFallbackTitle', '')}`,
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
      void showSuccess(u('postLoadModal.draftSavedTitle', ''), u('postLoadModal.draftSavedText', ''));
    } catch (error) {
      rejectFromApi(error, u('postLoadModal.draftSaveError', ''));
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
      setSubmitError(error instanceof Error ? error.message : u('HS catalog search failed', ''));
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
        editLoadId ? u('postLoadModal.updatedTitle', '') : u('postLoadModal.publishedTitle', ''),
        editLoadId ? u('postLoadModal.updatedText', '') : u('postLoadModal.publishedText', ''),
      );
      return true;
    } catch (error) {
      rejectFromApi(error, u('postLoadModal.apiError', ''));
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
        u('postLoadModal.warehousePublishedTitle', ''),
        u('postLoadModal.warehousePublishedText', ''),
      );
      return true;
    } catch (error) {
      rejectFromApi(error, u('postLoadModal.apiError', ''));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const publishOwnWarehouseReceipt = async (): Promise<boolean> => {
    const issues = validateDraft(u, draft);
    if (issues) {
      rejectSubmit(issues);
      return false;
    }
    if (!draft.warehouseId) return false;
    setIsSubmitting(true);
    setSubmitError('');
    setRejected(null);
    try {
      // This is an internal receipt record, not a marketplace listing. Publishing it creates the
      // scheduled inbound movement that appears under My docks.
      const response = await api.loads.create({
        ...buildWarehouseLoadPayload(draft),
        status: 'pending',
        published_at: null,
      });
      await api.warehouseMovements.create({
        warehouse_id: Number(draft.warehouseId),
        load_id: Number(response.data.id),
        direction: 'inbound',
        status: 'scheduled',
        scheduled_at: toApiDateTime(draft.deliveryDate || draft.warehouseStartDate, draft.deliveryTimeFrom) || new Date().toISOString(),
        customer_name: currentUser?.name || null,
        storage_type: draft.warehouseStorageType || null,
        pallets: draft.pallets ? Number(draft.pallets) : null,
        cbm: draft.volumeM3 ? Number(draft.volumeM3) : null,
        weight_kg: draft.weightKg ? toApiWeightKg(draft.weightKg, draft.weightUnit) : null,
        rate: draft.budget ? Number(draft.budget) : null,
        currency: draft.freightCurrency,
        description: draft.loadTitle || null,
      });
      if (sourceConversationId) {
        try {
          await api.conversations.update(sourceConversationId, { load_id: response.data.id, canvas: false });
        } catch {
          // The receipt and dock movement already exist; linking chat history is secondary.
        }
      }
      onSaved?.(response.data);
      onClose();
      void showSuccess(
        u('postLoadModal.receiptScheduledTitle', ''),
        u('postLoadModal.receiptScheduledText', ''),
      );
      return true;
    } catch (error) {
      rejectFromApi(error, u('postLoadModal.apiError', ''));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const submit = async () => {
    if (isSubmitting) return;
    if (draft.transportType === 'warehouse') {
      if (draft.storageTarget === 'own') {
        const confirmed = await confirmAction({
          title: u('postLoadModal.scheduleReceiptTitle', ''),
          text: u('postLoadModal.scheduleReceiptText', ''),
          confirmText: u('postLoadModal.scheduleReceiptConfirm', ''),
        });
        if (!confirmed) return;
        await publishOwnWarehouseReceipt();
        return;
      }
      const confirmed = await confirmAction({
        title: u('postLoadModal.publishWarehouseTitle', ''),
        text: editLoadId
          ? u('postLoadModal.publishWarehouseText', '')
          : u('postLoadModal.publishWarehouseWithTransportText', ''),
        confirmText: u('postLoadModal.publishConfirm', ''),
      });
      if (!confirmed) return;
      const published = await publishWarehouseLoad();
      // Only a freshly posted request needs the transport leg - re-saving an existing one would
      // hand the user a second, duplicate road draft for a route they already have.
      if (published && !editLoadId) await startWarehouseTransportDraft();
      return;
    }
    const confirmed = await confirmAction({
      title: editLoadId ? u('postLoadModal.saveChangesTitle', '') : u('postLoadModal.publishTitle', ''),
      text: editLoadId
        ? u('postLoadModal.saveChangesText', '')
        : u('postLoadModal.publishText', ''),
      confirmText: editLoadId ? u('common.save', '') : u('postLoadModal.publishConfirm', ''),
    });
    if (!confirmed) return;
    await publishLoad();
  };

  // Publishing a storage request only covers the storing - the goods still have to reach that
  // warehouse. Same machinery as the last-mile flow below: a pre-filled road draft plus a LenaAI
  // conversation to finish it, so the warehouse end of the trip is never re-typed. Where the goods
  // are collected from is the one thing the storage request never asked, so the chat asks for it.
  const startWarehouseTransportDraft = async () => {
    if (!currentUser) return;
    try {
      const transportDraft: LoadDraft = {
        ...INITIAL_DRAFT,
        transportType: 'road',
        loadTitle: `${draft.loadTitle || u('postLoadModal.draftFallbackTitle', '')} - ${u('postLoadModal.warehouseTransportSuffix', '')}`,
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
        subject: `${AI_DISPATCH_SUBJECT_PREFIX}${u('postLoadModal.warehouseTransportSuffix', '')} - ${draft.loadTitle || u('postLoadModal.draftFallbackTitle', '')}`,
        canvas: true,
        load_draft_id: newDraftId,
        last_message_at: new Date().toISOString(),
        participant_ids: [currentUser.id],
        greeting: 'warehouse_transport',
        lang,
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
      title: u('postLoadModal.publishLastMileTitle', ''),
      text: u('postLoadModal.publishLastMileText', ''),
      confirmText: u('postLoadModal.publishLastMileConfirm', ''),
    });
    if (!confirmed) return;

    const published = await publishLoad();
    if (!published || !currentUser) return;

    try {
      const lastMileDraft: LoadDraft = {
        ...INITIAL_DRAFT,
        transportType: 'road',
        loadTitle: `${draft.loadTitle || u('postLoadModal.draftFallbackTitle', '')} - Last Mile Delivery`,
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
      const conversationResponse = await api.conversations.create({
        company_id: Number.isFinite(companyId) ? companyId : undefined,
        created_by_user_id: currentUser.id,
        channel: 'inapp',
        subject: `${AI_DISPATCH_SUBJECT_PREFIX}${u('postLoadModal.lastMileSubjectPrefix', '')} - ${draft.loadTitle || u('postLoadModal.draftFallbackTitle', '')}`,
        canvas: true,
        load_draft_id: newDraftId,
        last_message_at: new Date().toISOString(),
        participant_ids: [currentUser.id],
        greeting: 'last_mile',
        lang,
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
        title={u('postLoadModal.warehousePreferredArea', '')}
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
        title={addressMap?.side === 'delivery'
          ? u('postLoadModal.deliveryAddress', '')
          : u('postLoadModal.pickupAddress', '')}
        initialQuery={addressMapStop ? addressMapStop.address || addressMapStop.city : ''}
        initialPosition={addressMapStop ? stopPosition(addressMapStop) : null}
        onClose={() => setAddressMap(null)}
        onSelect={(location) => {
          if (!addressMap) return;
          setDraft((current) => {
            // A picked point can come back without a city or country name, so whatever the stop
            // already carried is kept rather than blanked.
            const target = stopsOfSide(current, addressMap.side)[addressMap.index];
            return withStopPatch(current, addressMap.side, addressMap.index, {
              address: location.label,
              city: location.city || target?.city || '',
              country: location.countryCode || target?.country || '',
              latitude: String(location.latitude),
              longitude: String(location.longitude),
            });
          });
          setAddressMap(null);
        }}
      />
      {routeMapStops.length >= 2 && (
        <RouteMapModal
          open={routeMapOpen}
          lang={lang}
          pickup={routeMapStops[0]}
          delivery={routeMapStops[routeMapStops.length - 1]}
          waypoints={routeMapStops.slice(1, -1)}
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
                  placeholder={editLoadId ? u('postLoadModal.editTitle', '') : u('postLoadModal.titlePlaceholder', '')}
                  className={cn(
                    'w-full max-w-md bg-transparent text-base md:text-lg font-black tracking-tight dark:text-white leading-tight truncate outline-none cursor-text rounded-md focus:ring-2 focus:ring-primary/40 -mx-1 px-1',
                    invalidFields.has('loadTitle') && 'ring-2 ring-rose-500/60 bg-rose-50/70 dark:bg-rose-950/20'
                  )}
                />
                <p className="hidden sm:block text-xs text-slate-500 mt-0.5 max-w-2xl truncate">
                  {u(
                    'postLoadModal.subtitle',
                    ''
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
                  {u('postLoadModal.stepLabel', '')} {stepIndex + 1} / {STEPS.length}
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
                <span>{draft.pickupDate || u('postLoadModal.noPickupDate', '')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                <Clock3 className="w-4 h-4" />
                <span>{draft.deliveryDate || u('postLoadModal.noDeliveryDate', '')}</span>
              </div>
              <div className="flex items-center gap-2 text-xs whitespace-nowrap">
                <ThermometerSnowflake className="w-4 h-4" />
                <span>{draft.temperatureControlled ? `${draft.temperatureMin || '—'}°C to ${draft.temperatureMax || '—'}°C` : u('postLoadModal.ambient', '')}</span>
              </div>
              {aiFieldCount > 0 && (
                <div className="flex items-center gap-2 text-xs whitespace-nowrap text-primary">
                  <Sparkles className="w-4 h-4" />
                  <span>{aiFieldCount} {u('postLoadModal.aiFilledCount', '')}</span>
                </div>
              )}
              {scannedDocuments.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {scannedDocuments.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setViewingDocId(doc.id)}
                      title={u('postLoadModal.scannedDocument', '')}
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
                    title={u('postLoadModal.addScannedDocument', '')}
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
              aria-label={u('common.cancel', '')}
              title={u('common.cancel', '')}
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
                  {u('postLoadModal.stepLabel', '')} {stepIndex + 1} / {STEPS.length}
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
                <span>{draft.pickupDate || u('postLoadModal.noPickupDate', '')}</span>
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs">
                <Clock3 className="w-4 h-4" />
                <span>{draft.deliveryDate || u('postLoadModal.noDeliveryDate', '')}</span>
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs">
                <ThermometerSnowflake className="w-4 h-4" />
                <span>{draft.temperatureControlled ? `${draft.temperatureMin || '—'}°C to ${draft.temperatureMax || '—'}°C` : u('postLoadModal.ambient', '')}</span>
              </div>
              {aiFieldCount > 0 && (
                <div className="hidden md:flex items-center gap-2 text-xs text-primary">
                  <Sparkles className="w-4 h-4" />
                  <span>{aiFieldCount} {u('postLoadModal.aiFilledCount', '')}</span>
                </div>
              )}
              {scannedDocuments.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {scannedDocuments.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setViewingDocId(doc.id)}
                      title={u('postLoadModal.scannedDocument', '')}
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
                    title={u('postLoadModal.addScannedDocument', '')}
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
                    ? u('postLoadModal.step.route', '')
                    : item.id === 'cargo'
                      ? u('postLoadModal.step.cargo', '')
                      : item.id === 'contact'
                        ? u('postLoadModal.step.contact', '')
                        : u('postLoadModal.step.review', '');

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
                          title={u('postLoadModal.aiFilledCount', '')}
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
                    <WarehouseLocationFields
                      draft={draft}
                      setField={setField}
                      setDraft={setDraft}
                      u={u}
                      lang={lang}
                      invalidClass={invalidClass}
                      ownedWarehouses={ownedWarehouses}
                      onAddWarehouse={() => setAddWarehouseOpen(true)}
                      onSelectOwnedWarehouse={selectOwnedWarehouse}
                      onOpenWarehouseArea={() => setAreaMapOpen(true)}
                    />
                  ) : (
                  <>
                  <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,5fr)_minmax(0,2fr)] gap-3">
                    {/* Road is the only mode that can collect and drop at more than one address, so it
                        gets the stop lists; every other mode keeps its single origin/destination pair,
                        where the port and airport pickers below belong. */}
                    {draft.transportType === 'road' ? (
                      <>
                        <RouteStopsColumn
                          side="pickup"
                          stops={pickupStops}
                          lang={lang}
                          u={u}
                          onChangeStop={(index, patch) => setDraft((current) => withStopPatch(current, 'pickup', index, patch))}
                          onAddStop={() => addStop('pickup')}
                          onOpenMap={(index) => setAddressMap({ side: 'pickup', index })}
                          invalidClass={(index, field) => stopInvalidClass('pickup', index, field)}
                          renderLabel={(index, field) => stopFieldLabel('pickup', index, field)}
                        />
                        <RouteStopsColumn
                          side="delivery"
                          stops={deliveryStops}
                          lang={lang}
                          u={u}
                          onChangeStop={(index, patch) => setDraft((current) => withStopPatch(current, 'delivery', index, patch))}
                          onAddStop={() => addStop('delivery')}
                          onOpenMap={(index) => setAddressMap({ side: 'delivery', index })}
                          invalidClass={(index, field) => stopInvalidClass('delivery', index, field)}
                          renderLabel={(index, field) => stopFieldLabel('delivery', index, field)}
                        />
                      </>
                    ) : (
                      <>
                    <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="flex items-center gap-2 text-emerald-500">
                        <MapPin className="w-4 h-4" />
                        <p className="text-xs font-black uppercase tracking-wider">
                          {isContainerTransport(draft.transportType) ? u('postLoadModal.originBlock', '') : u('postLoadModal.pickupBlock', '')}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <FieldLabel>{isContainerTransport(draft.transportType) ? u('postLoadModal.seaOriginType', '') : u('postLoadModal.pickupPlaceType', '')}</FieldLabel>
                        <div className="grid grid-cols-2 gap-3">
                          {/* Rail keeps sea's leg-type values so the door/terminal logic below is
                              shared; the catalog supplies the label a rail leg is named with. */}
                          {placeTypeChoices('pickupPlaceType').map((option) => (
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
                          (draft.transportType === 'air' && draft.pickupPlaceType !== 'AOL / Airport of loading')) &&
                        'grid gap-3 sm:grid-cols-2'
                      )}>
                        {isContainerTransport(draft.transportType) && (
                          <div className={cn('space-y-1', invalidClass('pickupPort'))}>
                            <FieldLabel>
                              {draft.transportType === 'rail'
                                ? u('postLoadModal.railTerminalOfLoading', '')
                                : u('postLoadModal.pol', '')}
                            </FieldLabel>
                            {/* There is no terminal directory behind this the way SEA_PORTS backs the
                                port picker, so rail takes the name as typed. */}
                            {draft.transportType === 'rail' ? (
                              <Input
                                value={draft.pickupPort}
                                onChange={(event) => setField('pickupPort', event.target.value)}
                                placeholder={u('postLoadModal.railTerminalPlaceholder', '')}
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
                                placeholder={u('postLoadModal.portSearchPlaceholder', '')}
                              />
                            )}
                          </div>
                        )}
                        {draft.transportType === 'air' && (
                          <div className={cn('space-y-1', invalidClass('pickupAirport'))}>
                            <FieldLabel>{u('postLoadModal.aol', '')}</FieldLabel>
                            <AirportAutocompleteField
                              value={draft.pickupAirport}
                              onChange={(value) => setField('pickupAirport', value)}
                              onSelectAirport={(airport) => setDraft((current) => ({
                                ...current,
                                pickupAirport: `${airport.name} (${airport.iata}) — ${airport.city}, ${airport.country}`,
                                pickupCity: airport.city,
                                pickupCountry: airport.countryCode,
                              }))}
                              placeholder={u('postLoadModal.airportSearchPlaceholder', '')}
                            />
                          </div>
                        )}
                        {(
                          (!isContainerTransport(draft.transportType) || draft.pickupPlaceType !== 'Port to Port') &&
                          (draft.transportType !== 'air' || draft.pickupPlaceType !== 'AOL / Airport of loading')
                        ) && (
                          <div className={cn('space-y-1', invalidClass('pickupAddress'))}>
                            <FieldLabel>
                              {isContainerTransport(draft.transportType) ? u('postLoadModal.doorAddress', '') : u('postLoadModal.pickupAddress', '')}
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
                              placeholder={u('postLoadModal.pickupAddressPlaceholder', '')}
                              onOpenMap={() => setAddressMap({ side: 'pickup', index: 0 })}
                              mapButtonLabel={u('map.choosePickup', '')}
                              mapButtonIcon={MapGlyphIcon}
                              accentClassName="text-emerald-500"
                            />
                          </div>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-[200px_140px_minmax(0,1fr)] gap-3">
                        <div className={cn('space-y-1', invalidClass('pickupCountry'))}>
                          {fieldLabel('pickupCountry')}
                          <CountrySelect value={draft.pickupCountry} onChange={(value) => setField('pickupCountry', value)} placeholder={u('postLoadModal.selectCountry', '')} />
                        </div>
                        <div className={cn('space-y-1', invalidClass('pickupPostalCode'))}>
                          {fieldLabel('pickupPostalCode')}
                          <Input value={draft.pickupPostalCode} onChange={(event) => setField('pickupPostalCode', event.target.value)} placeholder={u('postLoadModal.postalCodePlaceholder', '')} />
                        </div>
                        <div className={cn('space-y-1', invalidClass('pickupCity'))}>
                          {fieldLabel('pickupCity')}
                          <Input value={draft.pickupCity} onChange={(event) => setField('pickupCity', event.target.value)} placeholder={u('postLoadModal.cityCountry', '')} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="flex items-center gap-2 text-blue-500">
                        <Truck className="w-4 h-4" />
                        <p className="text-xs font-black uppercase tracking-wider">
                          {isContainerTransport(draft.transportType) ? u('postLoadModal.destinationBlock', '') : u('postLoadModal.deliveryBlock', '')}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <FieldLabel>{isContainerTransport(draft.transportType) ? u('postLoadModal.seaDestinationType', '') : u('postLoadModal.deliveryPlaceType', '')}</FieldLabel>
                        <div className="grid grid-cols-2 gap-3">
                          {placeTypeChoices('deliveryPlaceType').map((option) => (
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
                          (draft.transportType === 'air' && draft.deliveryPlaceType !== 'AOD / Airport of delivery')) &&
                        'grid gap-3 sm:grid-cols-2'
                      )}>
                        {isContainerTransport(draft.transportType) && (
                          <div className={cn('space-y-1', invalidClass('deliveryPort'))}>
                            <FieldLabel>
                              {draft.transportType === 'rail'
                                ? u('postLoadModal.railTerminalOfDelivery', '')
                                : u('postLoadModal.pod', '')}
                            </FieldLabel>
                            {draft.transportType === 'rail' ? (
                              <Input
                                value={draft.deliveryPort}
                                onChange={(event) => setField('deliveryPort', event.target.value)}
                                placeholder={u('postLoadModal.railTerminalPlaceholder', '')}
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
                                placeholder={u('postLoadModal.portSearchPlaceholder', '')}
                              />
                            )}
                          </div>
                        )}
                        {draft.transportType === 'air' && (
                          <div className={cn('space-y-1', invalidClass('deliveryAirport'))}>
                            <FieldLabel>{u('postLoadModal.aod', '')}</FieldLabel>
                            <AirportAutocompleteField
                              value={draft.deliveryAirport}
                              onChange={(value) => setField('deliveryAirport', value)}
                              onSelectAirport={(airport) => setDraft((current) => ({
                                ...current,
                                deliveryAirport: `${airport.name} (${airport.iata}) — ${airport.city}, ${airport.country}`,
                                deliveryCity: airport.city,
                                deliveryCountry: airport.countryCode,
                              }))}
                              placeholder={u('postLoadModal.airportSearchPlaceholder', '')}
                            />
                          </div>
                        )}
                        {(
                          (!isContainerTransport(draft.transportType) || draft.deliveryPlaceType !== 'Port to Port') &&
                          (draft.transportType !== 'air' || draft.deliveryPlaceType !== 'AOD / Airport of delivery')
                        ) && (
                          <div className={cn('space-y-1', invalidClass('deliveryAddress'))}>
                            <FieldLabel>
                              {isContainerTransport(draft.transportType) ? u('postLoadModal.doorAddress', '') : u('postLoadModal.deliveryAddress', '')}
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
                              placeholder={u('postLoadModal.deliveryAddressPlaceholder', '')}
                              onOpenMap={() => setAddressMap({ side: 'delivery', index: 0 })}
                              mapButtonLabel={u('map.chooseDelivery', '')}
                              mapButtonIcon={MapGlyphIcon}
                              accentClassName="text-blue-500"
                            />
                          </div>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-[200px_140px_minmax(0,1fr)] gap-3">
                        <div className={cn('space-y-1', invalidClass('deliveryCountry'))}>
                          {fieldLabel('deliveryCountry')}
                          <CountrySelect value={draft.deliveryCountry} onChange={(value) => setField('deliveryCountry', value)} placeholder={u('postLoadModal.selectCountry', '')} />
                        </div>
                        <div className={cn('space-y-1', invalidClass('deliveryPostalCode'))}>
                          {fieldLabel('deliveryPostalCode')}
                          <Input value={draft.deliveryPostalCode} onChange={(event) => setField('deliveryPostalCode', event.target.value)} placeholder={u('postLoadModal.postalCodePlaceholder', '')} />
                        </div>
                        <div className={cn('space-y-1', invalidClass('deliveryCity'))}>
                          {fieldLabel('deliveryCity')}
                          <Input value={draft.deliveryCity} onChange={(event) => setField('deliveryCity', event.target.value)} placeholder={u('postLoadModal.cityCountry', '')} />
                        </div>
                      </div>
                    </div>
                      </>
                    )}

                    <div className="flex h-full min-w-0 flex-col space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex items-center gap-2 text-primary">
                        <Route className="w-4 h-4" />
                        <p className="text-xs font-black uppercase tracking-wider">{u('postLoadModal.routeSummaryTitle', '')}</p>
                      </div>
                      {isContainerTransport(draft.transportType) ? (
                        <div className="flex min-w-0 flex-1 flex-col">
                          {draft.pickupPlaceType !== 'Port to Port' && (
                            <VerticalRoutePoint icon={MapPin} iconClassName="bg-emerald-500 shadow-emerald-500/20" label={u('postLoadModal.origin', '')} value={draft.pickupAddress || draft.pickupCity || '—'} />
                          )}
                          <VerticalRoutePoint icon={Ship} iconClassName="bg-primary shadow-sky-500/20" label="POL" value={draft.pickupPort || '—'} />
                          <VerticalRoutePoint icon={Ship} iconClassName="bg-primary shadow-sky-500/20" label="POD" value={draft.deliveryPort || '—'} last={draft.deliveryPlaceType === 'Port to Port'} />
                          {draft.deliveryPlaceType !== 'Port to Port' && (
                            <VerticalRoutePoint icon={MapPin} iconClassName="bg-blue-500 shadow-blue-500/20" label={u('postLoadModal.destination', '')} value={draft.deliveryAddress || draft.deliveryCity || '—'} last />
                          )}
                        </div>
                      ) : (
                        /* Every stop of the route, in the order it is driven - the pickups first,
                           then the deliveries, each keeping the number its card carries, and each
                           carrying the controls that change that order. */
                        <RouteStopTimeline
                          stops={routeStops}
                          editable={draft.transportType === 'road'}
                          nameOf={routeStopName}
                          countOf={(side) => (side === 'pickup' ? pickupStops.length : deliveryStops.length)}
                          onMoveStop={(from, target, placeAfter) => setDraft((current) => withMovedStop(current, from, target, placeAfter))}
                          onRemove={removeStop}
                          u={u}
                        />
                      )}

                      {isContainerTransport(draft.transportType) ? (
                        <div className="flex items-center justify-between rounded-2xl border border-sky-200 bg-sky-50/50 px-3 py-2 dark:border-sky-800 dark:bg-slate-900">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{u('postLoadModal.transitTime', '')}</p>
                          <p className="flex items-center gap-1 text-sm font-black text-slate-900 dark:text-white">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={draft.transitDays}
                              onChange={(event) => setField('transitDays', event.target.value.replace(/\D/g, '').slice(0, 3))}
                              placeholder={fieldExample('transitDays')}
                              className="w-6 border-0 bg-transparent p-0 text-center text-sm font-black text-slate-900 outline-none dark:text-white"
                            />
                            {u('postLoadModal.transitDays', '')}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50/50 px-3 py-2 dark:border-sky-800 dark:bg-slate-900">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{u('landing.distance', '')}</p>
                          <p className="flex items-center gap-1 text-sm font-black text-slate-900 dark:text-white">
                            {measuringRoute
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                              : routeDistanceKm === null ? '—' : `${routeDistanceKm.toLocaleString()} km`}
                          </p>
                        </div>
                      )}

                      {!isContainerTransport(draft.transportType) && (
                        <>
                          {/* The route drawn small, so the order of the stops can be checked without
                              leaving the form for the full-screen map. */}
                          {routeMapStops.length >= 2 && <RoutePreviewMap stops={routeMapStops} legs={drivenRoute.legs} />}
                          <Button type="button" disabled={!routeDistanceKm} onClick={() => setRouteMapOpen(true)} className="w-full gap-2 disabled:cursor-not-allowed disabled:bg-sky-300 disabled:text-white disabled:opacity-100 disabled:shadow-none dark:disabled:bg-sky-800"><MapGlyphIcon className="h-4 w-4" />{u('postLoadModal.showRouteMap', '')}</Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Warehouse never reaches this branch, so only road has to be ruled out here. */}
                  {draft.transportType !== 'road' && (
                    <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1">
                          <FieldLabel>{u('postLoadModal.cargoReady', '')}</FieldLabel>
                          <DateInput
                            value={draft.pickupDate}
                            onChange={(value) => setField('pickupDate', value)}
                            placeholder="dd.mm.yyyy"
                            lang={lang}
                          />
                        </div>
                        <div className="space-y-1">
                          <FieldLabel>{u('postLoadModal.pickupWindow', '')}</FieldLabel>
                          <div className="relative">
                            <Input
                              value={draft.pickupWindow}
                              onChange={(event) => setField('pickupWindow', formatTimeRangeMask(event.target.value))}
                              inputMode="numeric"
                              placeholder={u('postLoadModal.windowPlaceholder', '')}
                              className="pr-10"
                            />
                            <Clock3 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <FieldLabel>{u('postLoadModal.deliveryWindow', '')}</FieldLabel>
                          <div className="relative">
                            <Input
                              value={draft.deliveryWindow}
                              onChange={(event) => setField('deliveryWindow', formatTimeRangeMask(event.target.value))}
                              inputMode="numeric"
                              placeholder={u('postLoadModal.windowPlaceholder', '')}
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
                      {/* Hidden when the caller already decided the mode - a warehouse receiving
                          goods has no other kind of request to make. */}
                      <fieldset className={cn(lockedTransportType && 'hidden')}>
                        <legend className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                          <Route className="h-4 w-4" />
                          {u('postLoadModal.transportType', '')}
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
                                const validCargoTypes = shipmentTypeOptions(option.id);
                                const validLoadingEquipment = loadingEquipmentOptions(option.id);
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
                                  // Only road collects and drops at more than one address; leaving it
                                  // would otherwise submit stops no other mode's form can show or edit.
                                  extraPickups: option.id === 'road' ? prev.extraPickups : [],
                                  extraDeliveries: option.id === 'road' ? prev.extraDeliveries : [],
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
                            <span>{u('postLoadModal.consignee', '')}</span>
                          </div>
                          <CustomerSelect
                            required
                            value={draft.consignee}
                            onChange={(option) => setField('consignee', option)}
                            placeholder={u('postLoadModal.consigneePlaceholder', '')}
                          />
                          <p className="text-xs text-slate-500">
                            {u('postLoadModal.consigneeHelp', '')}
                          </p>
                        </div>
                      )}

                      {draft.transportType === 'warehouse' ? (
                        <WarehouseStorageTypeField draft={draft} setField={setField} u={u} />
                      ) : (
                        <div className="space-y-1">
                          <FieldLabel>{u('postLoadModal.cargoModel', '')}</FieldLabel>
                          <ScrollableRow className="pb-2">
                            <div className="flex w-max gap-2 px-1">
                            {shipmentTypeOptions(draft.transportType).map((option) => (
                              <ChoiceCard key={option} compact nowrap className="w-auto snap-start shrink-0 justify-start pl-3 pr-7 text-left" active={draft.cargoType === option} title={option} icon={option === 'Charter' ? Plane : option === 'Express' || option === 'Priority' ? Clock3 : Package} onClick={(event) => { setField('cargoType', option); event.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' }); }} />
                            ))}
                            </div>
                          </ScrollableRow>
                        </div>
                      )}

                      <div className="space-y-1">
                        <FieldLabel>{draft.transportType === 'warehouse' ? u('postLoadModal.warehouseServices', '') : isContainerTransport(draft.transportType) ? u('postLoadModal.handlingRequirements', '') : u('postLoadModal.loadingEquipment', '')}</FieldLabel>
                        <div className="grid md:grid-cols-3 gap-3">
                          {loadingEquipmentOptions(draft.transportType).map((option) => <ToggleCard key={option} active={draft.loadingEquipment.includes(option)} title={option} description={optionDescription(option)} icon={optionIcon(option, X)} onClick={() => toggleLoadingEquipment(option)} />)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">

                      <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                        <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                          {draft.transportType === 'warehouse' ? <Warehouse className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                          <span>{u('postLoadModal.equipmentTitle', '')}</span>
                        </div>
                        {draft.transportType === 'warehouse' ? (
                          <div className="space-y-1">
                            <FieldLabel>{u('postLoadModal.warehouseEquipment', '')}</FieldLabel>
                            <div className="flex min-h-10 items-center rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
                              <div className="flex flex-wrap gap-2">
                                {WAREHOUSE_EQUIPMENT_OPTIONS.map((option) => {
                                  const EquipmentIcon = optionIcon(option);
                                  return (
                                    <button
                                      key={option}
                                      type="button"
                                      onClick={() => toggleWarehouseEquipment(option)}
                                      className={cn('inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold leading-none transition-colors', draft.warehouseEquipment.includes(option) ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200')}
                                    >
                                      <EquipmentIcon className="h-3.5 w-3.5 shrink-0" />
                                      <span className="leading-none">{u(`postLoadModal.warehouseEquipment.${option}`, option)}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : draft.transportType === 'air' ? (
                          <div className="space-y-4">
                            <div className="space-y-1"><FieldLabel>{u('postLoadModal.specialRequirements', '')}</FieldLabel><div className="flex min-h-10 items-center rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950"><div className="flex flex-wrap gap-2">{(draft.pickupPlaceType === 'Address' || draft.deliveryPlaceType === 'Address + Last Mile Delivery' ? [...AIR_SPECIAL_REQUIREMENT_OPTIONS, AIR_TAIL_LIFT_REQUIREMENT] : AIR_SPECIAL_REQUIREMENT_OPTIONS).map((option) => { const RequirementIcon = optionIcon(option); return <button key={option} type="button" onClick={() => toggleSpecialRequirement(option)} className={cn('inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold leading-none transition-colors', draft.specialRequirements.includes(option) ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200')}><RequirementIcon className="h-3.5 w-3.5 shrink-0" /><span className="leading-none">{u(option, option)}</span></button>; })}</div></div></div>
                          </div>
                        ) : isContainerTransport(draft.transportType) ? (
                          <div className="space-y-1">
                            <FieldLabel>{u('postLoadModal.containerTypes', '')}</FieldLabel>
                            <div className="space-y-2">
                              {draft.containerSelections.map((row, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <Select value={row.type} onChange={(e) => updateContainerSelection(index, { type: e.target.value })} className="flex-1">
                                    {SEA_CONTAINER_CATEGORIES.map((category) => (
                                      <optgroup key={category} label={category}>
                                        {SEA_CONTAINER_TYPES.filter((c) => c.category === category).map((c) => (
                                          <option key={c.code} value={c.code}>{containerLabel(c.code, lang)}</option>
                                        ))}
                                      </optgroup>
                                    ))}
                                  </Select>
                                  <Input type="number" min="1" value={row.quantity} onChange={(e) => updateContainerSelection(index, { quantity: e.target.value })} className="w-20 shrink-0" placeholder={u('postLoadModal.qty', '')} />
                                  <button type="button" onClick={() => removeContainerSelection(index)} className="shrink-0 rounded-lg p-2.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800">
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                              <Button type="button" variant="outline" size="sm" onClick={addContainerSelection} className="gap-1.5">
                                <Plus className="h-3.5 w-3.5" />
                                {u('postLoadModal.addContainerType', '')}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className={cn('space-y-1', invalidClass('bodyTypes'))}>{fieldLabel('bodyTypes')}<div className="flex min-h-10 items-center rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950"><div className="flex flex-wrap gap-2">{BODY_TYPE_OPTIONS.map((option) => { const BodyTypeIcon = optionIcon(option); return <button key={option} type="button" onClick={() => toggleBodyType(option)} className={cn('inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold leading-none transition-colors', draft.bodyTypes.includes(option) ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200')}><BodyTypeIcon className="h-3.5 w-3.5 shrink-0" /><span className="leading-none">{u(`postLoadModal.bodyType.${option}`, option)}</span></button>; })}</div></div></div>
                        )}

                        {draft.transportType === 'air' && <div className="space-y-1"><FieldLabel>{u('postLoadModal.deliveryProof', '')}</FieldLabel><div className="grid grid-cols-2 gap-3"><ChoiceCard compact active={draft.deliveryProof === 'POD'} title="POD" description="Proof of Delivery" icon={FileText} onClick={() => setField('deliveryProof', 'POD')} /><ChoiceCard compact active={draft.deliveryProof === 'AOD'} title="AOD" description="Arrival on Delivery" icon={CheckCircle2} onClick={() => setField('deliveryProof', 'AOD')} /></div></div>}

                        {/* Both modes name the transport document they move under, so they share the
                            field - a Bill of Lading at sea, a CIM/SMGS consignment note on rail. */}
                        {isContainerTransport(draft.transportType) && (
                          <div className="space-y-1">
                            <FieldLabel>
                              {draft.transportType === 'rail'
                                ? u('postLoadModal.railDocumentType', '')
                                : u('postLoadModal.blType', '')}
                            </FieldLabel>
                            <div className={cn('grid gap-2', draft.transportType === 'rail' ? 'grid-cols-4' : 'grid-cols-3')}>
                              {fieldChoices('blType').map(({ value: option, label }) => (
                                <ChoiceCard key={option} compact active={draft.blType === option} title={label} icon={FileText} onClick={() => setField('blType', option)} />
                              ))}
                            </div>
                          </div>
                        )}

                      </div>

                    <div className="flex-1 space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                        <ShieldCheck className="h-4 w-4" />
                        <span>{u('postLoadModal.characteristicsAndRequirements', '')}</span>
                      </div>
                      {!isContainerTransport(draft.transportType) && (
                        <div className={cn('space-y-1', invalidClass('temperatureControlled'))}>
                          {fieldLabel('temperatureControlled')}
                          <div className="grid grid-cols-2 gap-2">
                            <ChoiceCard compact active={!draft.temperatureControlled} title={u('common.no', '')} description="Ambient conditions" icon={Package} onClick={() => setField('temperatureControlled', false)} />
                            <ChoiceCard compact active={draft.temperatureControlled} title={u('common.yes', '')} description="Set a temperature range" icon={ThermometerSnowflake} onClick={() => setField('temperatureControlled', true)} />
                          </div>
                        </div>
                      )}
                      {draft.temperatureControlled && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <FieldLabel>{u('postLoadModal.temperatureMin', '')}</FieldLabel>
                            <Input type="number" value={draft.temperatureMin} onChange={(e) => setField('temperatureMin', e.target.value)} placeholder={fieldExample('temperatureMin')} />
                          </div>
                          <div className="space-y-1">
                            <FieldLabel>{u('postLoadModal.temperatureMax', '')}</FieldLabel>
                            <Input type="number" value={draft.temperatureMax} onChange={(e) => setField('temperatureMax', e.target.value)} placeholder={fieldExample('temperatureMax')} />
                          </div>
                        </div>
                      )}
                      <div className="grid md:grid-cols-3 gap-3">
                        {draft.transportType === 'road' && (
                          <DocumentTypeToggleCard
                            type="CMR"
                            active={draft.cmrRequired}
                            onToggle={() => setField('cmrRequired', !draft.cmrRequired)}
                            icon={FileText}
                            title={u('postLoadModal.cmr', '')}
                            description={u('postLoadModal.cmrDesc', '')}
                            loadId={editLoadId}
                            draftId={draftId}
                            u={u}
                          />
                        )}
                        {fieldChoices('characteristics').map(({ value: option }) => (
                          characteristicDetail(option) ? (
                            <DetailToggleCard
                              key={option}
                              active={draft.characteristics.includes(option)}
                              onToggle={() => {
                                if (draft.characteristics.includes(option)) clearCharacteristicDetail(option);
                                toggleCharacteristic(option);
                              }}
                              onClear={() => clearCharacteristicDetail(option)}
                              icon={optionIcon(option, Package)}
                              title={option}
                              description={optionDescription(option)}
                              summary={characteristicSummary(option)}
                              emptyHint={u('postLoadModal.addDetails', '')}
                              clearLabel={u('tracking.clearAll', '')}
                            >
                              {characteristicDetail(option)}
                            </DetailToggleCard>
                          ) : (
                            <ToggleCard
                              key={option}
                              active={draft.characteristics.includes(option)}
                              onClick={() => toggleCharacteristic(option)}
                              icon={optionIcon(option, Package)}
                              title={option}
                              description={optionDescription(option)}
                            />
                          )
                        ))}
                        {!isContainerTransport(draft.transportType) && (
                          <ToggleCard
                            active={draft.requiresAdr}
                            onClick={() => setField('requiresAdr', !draft.requiresAdr)}
                            icon={ShieldAlert}
                            title={draft.transportType === 'air' ? u('postLoadModal.dgr', '') : u('postLoadModal.adr', '')}
                            description={u('postLoadModal.adrDesc', '')}
                          />
                        )}
                        {!isContainerTransport(draft.transportType) && !equipmentCovers('requiresTailLift') && (
                          <ToggleCard
                            active={draft.requiresTailLift}
                            onClick={() => setField('requiresTailLift', !draft.requiresTailLift)}
                            icon={ArrowDownToLine}
                            title={u('postLoadModal.tailLift', '')}
                            description={u('postLoadModal.tailLiftDesc', '')}
                          />
                        )}
                        <ToggleCard
                          active={draft.urgent}
                          onClick={() => setField('urgent', !draft.urgent)}
                          icon={Zap}
                          title={u('postLoadModal.urgent', '')}
                          description={u('postLoadModal.urgentDesc', '')}
                        />
                        {draft.transportType === 'road' && (
                          <>
                            <ToggleCard
                              active={draft.tollRoadsIncluded}
                              onClick={() => setField('tollRoadsIncluded', !draft.tollRoadsIncluded)}
                              icon={Route}
                              title={u('postLoadModal.tollRoads', '')}
                              description={u('postLoadModal.tollRoadsDesc', '')}
                            />
                            <ToggleCard
                              active={draft.ferryIncluded}
                              onClick={() => setField('ferryIncluded', !draft.ferryIncluded)}
                              icon={Ship}
                              title={u('postLoadModal.ferry', '')}
                              description={u('postLoadModal.ferryDesc', '')}
                            />
                            <ToggleCard
                              active={draft.palletExchangeRequired}
                              onClick={() => setField('palletExchangeRequired', !draft.palletExchangeRequired)}
                              icon={Package}
                              title={u('postLoadModal.palletExchange', '')}
                              description={u('postLoadModal.palletExchangeDesc', '')}
                            />
                          </>
                        )}
                        {!equipmentCovers('customsRequired') && (
                          <ToggleCard
                            active={draft.customsRequired}
                            onClick={() => setField('customsRequired', !draft.customsRequired)}
                            icon={Landmark}
                            title={u('postLoadModal.customs', '')}
                            description={u('postLoadModal.customsDesc', '')}
                          />
                        )}
                        <ToggleCard
                          active={draft.insuranceRequired}
                          onClick={() => setField('insuranceRequired', !draft.insuranceRequired)}
                          icon={ShieldCheck}
                          title={u('postLoadModal.insurance', '')}
                          description={u('postLoadModal.insuranceDesc', '')}
                        />
                        <ToggleCard
                          active={draft.certificationRequired}
                          onClick={() => setField('certificationRequired', !draft.certificationRequired)}
                          icon={BadgeCheck}
                          title={u('postLoadModal.certification', '')}
                          description={u('postLoadModal.certificationDesc', '')}
                        />
                        {!equipmentCovers('inspectionServicesRequired') && (
                          <ToggleCard
                            active={draft.inspectionServicesRequired}
                            onClick={() => setField('inspectionServicesRequired', !draft.inspectionServicesRequired)}
                            icon={ScanEye}
                            title={u('postLoadModal.inspectionServices', '')}
                            description={u('postLoadModal.inspectionServicesDesc', '')}
                          />
                        )}
                        <ToggleCard
                          active={draft.mustBeTrackable}
                          onClick={() => setField('mustBeTrackable', !draft.mustBeTrackable)}
                          icon={Radar}
                          title={u('postLoadModal.mustBeTrackable', '')}
                          description={u('postLoadModal.mustBeTrackableDesc', '')}
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
                              title={u('postLoadModal.foodPharma', '')}
                              description={u('postLoadModal.foodPharmaDesc', '')}
                            />
                            <ToggleCard
                              active={draft.warehouseFragile}
                              onClick={() => setField('warehouseFragile', !draft.warehouseFragile)}
                              icon={Wine}
                              title={u('postLoadModal.fragileGoods', '')}
                              description={u('postLoadModal.fragileGoodsDesc', '')}
                            />
                          </>
                        )}
                        </div>

                    </div>

                    </div>

                    <div className="flex flex-col gap-3">
                      <div className={cn('space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4', draft.transportType === 'warehouse' && 'flex-1')}>
                        <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                          <Package className="h-4 w-4" />
                          <span>{u('postLoadModal.goodsSpecifications', '')}</span>
                        </div>
                        <div className="space-y-1">
                          <FieldLabel>{u('postLoadModal.declaredValue', '')}</FieldLabel>
                          <div className={cn('grid w-full grid-cols-[minmax(0,1fr)_110px] gap-2', invalidClass('declaredValue'))}>
                            <Input type="number" step="100" min="0" value={draft.declaredValue} onChange={(e) => setField('declaredValue', e.target.value)} placeholder={fieldExample('declaredValue')} />
                            <Select value={draft.shipmentValueCurrency} onChange={(e) => setField('shipmentValueCurrency', e.target.value)}>
                              {fieldChoices('freightCurrency').map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
                            </Select>
                          </div>
                        </div>
                        <div className={cn('space-y-1', invalidClass('goodsType'))}>
                          {fieldLabel('goodsType')}
                          <div ref={hsSearchRef} className="relative">
                            {/* min-h rather than h so the box still grows once HS chips wrap, but an
                                empty field lines up with the standard Input height. */}
                            <div className="flex min-h-10 w-full flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 focus-within:ring-2 focus-within:ring-primary dark:border-slate-800 dark:bg-slate-950">
                              {draft.hsCodes.map((item) => (
                                <HsCodeChip
                                  key={item.code}
                                  item={item}
                                  lang={lang}
                                  onRemove={() => removeHsCode(item.code)}
                                  removeTitle={u('Remove HS code', '')}
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
                                placeholder={draft.hsCodes.length > 0 ? '' : u('postLoadModal.cargoNamePlaceholder', '')}
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
                                        'flex w-full items-baseline gap-2 rounded-lg py-2 pr-3 text-left',
                                        selectable
                                          ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800'
                                          : 'cursor-not-allowed bg-slate-50/70 text-slate-400 dark:bg-slate-800/30 dark:text-slate-500',
                                      )}
                                    >
                                      {selectable
                                        ? <SectionIcon className="h-3.5 w-3.5 shrink-0 self-center text-primary" />
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
                          <div className={cn('space-y-1', invalidClass('pallets'))}>
                            {fieldLabel('pallets')}
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              value={draft.pallets}
                              onChange={(event) => setField('pallets', event.target.value)}
                              placeholder={fieldExample('pallets')}
                            />
                          </div>
                          <div className="space-y-1">
                            <FieldLabel>{u('postLoadModal.packagingMethod', '')}</FieldLabel>
                            <IconSelect
                              value={draft.quantityMeasure}
                              onChange={(next) => setField('quantityMeasure', next)}
                              placeholder={u('postLoadModal.selectPackagingMethod', '')}
                              ariaLabel={u('postLoadModal.packagingMethod', '')}
                              icon={Package}
                              searchable
                              searchPlaceholder={u('postLoadModal.searchPackagingMethod', '')}
                              noResults={u('postLoadModal.noPackagingMethods', '')}
                              options={[
                                ...(draft.quantityMeasure && !selectedPackageType ? [{ value: draft.quantityMeasure, label: draft.quantityMeasure, icon: Package }] : []),
                                ...fieldOptions('quantityMeasure', Package),
                              ]}
                            />
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_5rem_minmax(0,1.4fr)] sm:items-end">
                          <div className={cn('space-y-1', invalidClass('lengthM'))}>
                            {fieldLabel('lengthM')}
                            <Input type="number" step="0.1" min="0.1" value={draft.lengthM} onChange={(e) => setField('lengthM', e.target.value)} placeholder={fieldExample('lengthM')} />
                          </div>
                          <div className={cn('space-y-1', invalidClass('widthM'))}>
                            {fieldLabel('widthM')}
                            <Input type="number" step="0.05" min="0" value={draft.widthM} onChange={(e) => setField('widthM', e.target.value)} placeholder={fieldExample('widthM')} />
                          </div>
                          <div className={cn('space-y-1', invalidClass('heightM'))}>
                            {fieldLabel('heightM')}
                            <Input type="number" step="0.05" min="0" value={draft.heightM} onChange={(e) => setField('heightM', e.target.value)} placeholder={fieldExample('heightM')} />
                          </div>
                          <div className="space-y-1">
                            <FieldLabel>{u('postLoadModal.dimensionUnit', '')}</FieldLabel>
                            <IconSelect value={draft.lengthUnit} onChange={(value) => changeDimensionUnit(value as LoadDraft['lengthUnit'])} placeholder="m" ariaLabel={u('postLoadModal.dimensionUnit', '')} icon={Ruler} options={fieldOptions('lengthUnit', Ruler)} />
                          </div>
                          <div className="space-y-1">
                            {fieldLabel('dimensionScope')}
                            <IconSelect value={draft.dimensionScope} onChange={(value) => setField('dimensionScope', value as LoadDraft['dimensionScope'])} placeholder="" ariaLabel={fieldTitle('dimensionScope')} icon={Boxes} options={fieldOptions('dimensionScope', Boxes)} />
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className={cn('space-y-1', invalidClass('weightKg'))}>
                            {fieldLabel('weightKg')}
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={draft.weightKg}
                                onChange={(e) => setField('weightKg', e.target.value)}
                                placeholder={draft.weightUnit === 't' ? '24.0' : fieldExample('weightKg')}
                              />
                              <IconSelect
                                value={draft.weightUnit}
                                onChange={(value) => changeWeightUnit(value as LoadDraft['weightUnit'])}
                                placeholder="t"
                                ariaLabel={u('postLoadModal.weightUnit', '')}
                                icon={Weight}
                                className="w-24 shrink-0"
                                options={fieldOptions('weightUnit', Weight)}
                              />
                            </div>
                          </div>
                          <div className={cn('space-y-1', invalidClass('volumeM3'))}>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              {fieldLabel('volumeM3')}
                              <button type="button" disabled={calculateVolume(draft) === null} onClick={() => setField('volumeM3', calculateVolume(draft) ?? draft.volumeM3)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-40">
                                <RotateCcw className="h-3 w-3" />
                                {u('postLoadModal.recalculateVolume', '')}
                              </button>
                            </div>
                            <Input type="number" step="any" min="0" value={draft.volumeM3} onChange={(e) => setField('volumeM3', e.target.value)} placeholder={fieldExample('volumeM3')} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <FieldLabel>{u('postLoadModal.additionalInfo', '')}</FieldLabel>
                          <div className="grid grid-cols-3 gap-2">
                            {[{ value: 'Stackable', icon: Package }, { value: 'Top load only', icon: ShieldCheck }, { value: 'Non-stackable', icon: X }].map(({ value, icon }) => <ChoiceCard key={value} compact active={draft.additionalInfo === value} title={value} icon={icon} onClick={() => setField('additionalInfo', value)} />)}
                          </div>
                        </div>
                      </div>

                      <CustomsDocumentsPanel
                        hsCodes={draft.hsCodes.map((item) => item.code)}
                        documents={draft.customsDocuments}
                        onChange={(documents) => setField('customsDocuments', documents)}
                        lang={lang}
                      />
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
                        <span>{u('postLoadModal.paymentTitle', '')}</span>
                      </div>
                      {isContainerTransport(draft.transportType) ? (
                        <div className="space-y-2">
                          <FieldLabel>{u('postLoadModal.seaPaymentTerms', '')}</FieldLabel>
                          <div className="grid grid-cols-3 gap-2">
                            <ChoiceCard compact active={draft.seaPaymentTerms === 'Prepaid'} title={u('postLoadModal.seaPaymentTerms.Prepaid', '')} description={u('postLoadModal.seaPaymentTerms.PrepaidDesc', '')} icon={Coins} onClick={() => setField('seaPaymentTerms', 'Prepaid')} />
                            <ChoiceCard compact active={draft.seaPaymentTerms === 'Collect'} title={u('postLoadModal.seaPaymentTerms.Collect', '')} description={draft.transportType === 'rail' ? u('postLoadModal.railPaymentTerms.CollectDesc', '') : u('postLoadModal.seaPaymentTerms.CollectDesc', '')} icon={draft.transportType === 'rail' ? TrainFront : Ship} onClick={() => setField('seaPaymentTerms', 'Collect')} />
                            <ChoiceCard compact active={draft.seaPaymentTerms === 'Other'} title={u('postLoadModal.seaPaymentTerms.Other', '')} description={u('postLoadModal.seaPaymentTerms.OtherDesc', '')} icon={FileText} onClick={() => setField('seaPaymentTerms', 'Other')} />
                          </div>
                        </div>
                      ) : (
                        <div className={cn('space-y-2', invalidClass('paymentDeferred'))}>
                          {fieldLabel('paymentDeferred')}
                          <div className={cn('grid grid-cols-2 gap-2', invalidClass('paymentDueDays'))}>
                            <ChoiceCard compact active={!draft.paymentDeferred} title={u('common.no', '')} description="Pay on delivery" icon={Coins} onClick={() => setField('paymentDeferred', false)} />
                            <ChoiceCard compact active={draft.paymentDeferred} title={u('common.yes', '')} description="Set payment window" icon={Clock3} onClick={() => setField('paymentDeferred', true)} />
                          </div>
                          {draft.paymentDeferred && <Input type="number" min="1" value={draft.paymentDueDays} onChange={(e) => setField('paymentDueDays', e.target.value)} placeholder={u('postLoadModal.paymentDueDays', '')} />}
                        </div>
                      )}
                      <div className={cn('space-y-1', invalidClass('incoterm'))}>
                        {fieldLabel('incoterm')}
                        <Select value={draft.incoterm} onChange={(event) => setField('incoterm', event.target.value)}>
                          <option value="">{u('postLoadModal.pleaseSelect', '')}</option>
                          {INCOTERM_OPTIONS.map((incoterm) => (
                            <option key={incoterm} value={incoterm}>{incoterm}</option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <FieldLabel>{u('postLoadModal.priceTerms', '')}</FieldLabel>
                        <div className="grid grid-cols-2 gap-3">
                          <ChoiceCard
                            compact
                            active={draft.receivePriceProposals}
                            title={u('postLoadModal.termsNegotiable', '')}
                            description={u('postLoadModal.termsNegotiableDesc', '')}
                            icon={Handshake}
                            onClick={() => setField('receivePriceProposals', true)}
                          />
                          <ChoiceCard
                            compact
                            active={!draft.receivePriceProposals}
                            title={u('postLoadModal.termsFixed', '')}
                            description={u('postLoadModal.termsFixedDesc', '')}
                            icon={Tag}
                            onClick={() => setField('receivePriceProposals', false)}
                          />
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-[minmax(0,1fr)_120px] gap-3">
                        <div className={cn('space-y-1', invalidClass('budget'))}>
                          {/* An open load asks for an expected price; a fixed one states it. */}
                          {fieldLabel('budget', draft.receivePriceProposals ? undefined : 'postLoadModal.termsFixed')}
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={draft.budget}
                            onChange={(e) => setField('budget', e.target.value)}
                            placeholder={fieldExample('budget')}
                          />
                        </div>
                        <div className={cn('space-y-1', invalidClass('freightCurrency'))}>
                          {fieldLabel('freightCurrency')}
                          <Select value={draft.freightCurrency} onChange={(e) => setField('freightCurrency', e.target.value)}>
                            {fieldChoices('freightCurrency').map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <FieldLabel>{u('postLoadModal.externalComments', '')}</FieldLabel>
                        <Input
                          value={draft.externalComments}
                          onChange={(e) => setField('externalComments', e.target.value)}
                          placeholder={u('postLoadModal.externalCommentsPlaceholder', '')}
                        />
                      </div>

                      <div className={cn('flex flex-1 flex-col space-y-1', invalidClass('notes'))}>
                        {fieldLabel('notes')}
                        <Textarea
                          value={draft.notes}
                          onChange={(e) => setField('notes', e.target.value)}
                          placeholder={u(
                            'postLoadModal.notesPlaceholder',
                            ''
                          )}
                          className="h-full min-h-24 flex-1"
                        />
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                      <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                        <UserRound className="h-4 w-4" />
                        <span>{u('postLoadModal.contactTitle', '')}</span>
                      </div>
                      <div className={cn('space-y-1', invalidClass('contactName'))}>
                        {fieldLabel('contactName')}
                        <Select
                          value={draft.contactName}
                          onChange={(e) => setField('contactName', e.target.value)}
                        >
                          <option value="">{u('postLoadModal.pleaseSelect', '')}</option>
                          {CONTACT_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className={cn('space-y-1', invalidClass('contactEmail'))}>
                          {fieldLabel('contactEmail')}
                          <Input
                            value={draft.contactEmail}
                            onChange={(e) => setField('contactEmail', e.target.value)}
                            placeholder={fieldExample('contactEmail')}
                          />
                        </div>
                        <div className={cn('space-y-1', invalidClass('contactPhone'))}>
                          {fieldLabel('contactPhone')}
                          <Input
                            value={draft.contactPhone}
                            onChange={(e) => setField('contactPhone', e.target.value)}
                            placeholder={fieldExample('contactPhone')}
                          />
                        </div>
                        <div className="space-y-1">
                          <FieldLabel>{u('postLoadModal.contactFax', '')}</FieldLabel>
                          <Input
                            value={draft.contactFax}
                            onChange={(e) => setField('contactFax', e.target.value)}
                            placeholder={fieldExample('contactFax')}
                          />
                        </div>
                        <div className="space-y-1">
                          <FieldLabel>{u('postLoadModal.contactMobile', '')}</FieldLabel>
                          <Input
                            value={draft.contactMobile}
                            onChange={(e) => setField('contactMobile', e.target.value)}
                            placeholder={fieldExample('contactMobile')}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <FieldLabel>{u('postLoadModal.showInOffer', '')}</FieldLabel>
                        <div className="grid sm:grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                          <label className="flex items-center gap-2 text-sm dark:text-white">
                            <input type="checkbox" checked={draft.showEmail} onChange={(e) => setField('showEmail', e.target.checked)} />
                            <span>{u('postLoadModal.contactEmail', '')}</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm dark:text-white">
                            <input type="checkbox" checked={draft.showFax} onChange={(e) => setField('showFax', e.target.checked)} />
                            <span>{u('postLoadModal.contactFax', '')}</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm dark:text-white">
                            <input type="checkbox" checked={draft.showPhone} onChange={(e) => setField('showPhone', e.target.checked)} />
                            <span>{u('postLoadModal.contactPhone', '')}</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm dark:text-white">
                            <input type="checkbox" checked={draft.showMobile} onChange={(e) => setField('showMobile', e.target.checked)} />
                            <span>{u('postLoadModal.contactMobile', '')}</span>
                          </label>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <FieldLabel>{u('postLoadModal.internalComments', '')}</FieldLabel>
                        <Input
                          value={draft.internalComments}
                          onChange={(e) => setField('internalComments', e.target.value)}
                          placeholder={u('postLoadModal.internalCommentsPlaceholder', '')}
                        />
                      </div>
                    </div>

                    <div className="flex min-w-0 flex-col gap-3">
                      <div className="space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                        <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                          <UserRound className="h-4 w-4" />
                          <span>{u('postLoadModal.supplierContact', '')}</span>
                          <span className="text-rose-500">*</span>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          {([
                            ['supplierName', fieldTitle('supplierName'), 'text', true],
                            ['supplierEmail', u('postLoadModal.contactEmail', ''), 'email', true],
                            ['supplierPhone', u('postLoadModal.contactPhone', ''), 'tel', true],
                            ['supplierMobile', u('postLoadModal.contactMobile', ''), 'tel', false],
                            ['supplierFax', u('postLoadModal.contactFax', ''), 'tel', false],
                          ] as const).map(([field, label, type, required]) => (
                            <label key={field} className={cn('space-y-1', field === 'supplierName' && 'sm:col-span-2', invalidClass(field))}>
                              <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}{required && <span className="ml-1 text-rose-500">*</span>}</span>
                              <Input type={type} required={required} maxLength={field === 'supplierName' || field === 'supplierEmail' ? 255 : 50} value={draft[field] || ''} onChange={(event) => setField(field, event.target.value)} />
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex-1 space-y-3 rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
                        <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                          <ShieldCheck className="h-4 w-4" />
                          <span>{u('postLoadModal.limitPublication', '')}</span>
                        </div>
                        <div className="space-y-1">
                          <FieldLabel>{u('postLoadModal.closedFreightExchange', '')}</FieldLabel>
                          <Select
                            value={draft.closedFreightExchange}
                            onChange={(e) => setField('closedFreightExchange', e.target.value)}
                          >
                            {CLOSED_EXCHANGE_OPTIONS.map((option) => (
                              <option key={option || 'none'} value={option}>
                                {option || u('postLoadModal.none', '')}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <FieldLabel>{u('postLoadModal.closedFreightComments', '')}</FieldLabel>
                          <Input
                            value={draft.closedFreightComments}
                            onChange={(e) => setField('closedFreightComments', e.target.value)}
                            placeholder={u('postLoadModal.closedFreightCommentsPlaceholder', '')}
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={draft.publishToAllAfterMinutes}
                              onChange={(e) => setField('publishToAllAfterMinutes', e.target.checked)}
                            />
                            <span>{u('postLoadModal.publishToAllAfter', '')}</span>
                          </label>
                          <Input
                            type="number"
                            value={draft.publishDelayMinutes}
                            onChange={(e) => setField('publishDelayMinutes', e.target.value)}
                            className="h-11 w-24"
                          />
                          <span>{u('postLoadModal.publishToAllAfterSuffix', '')}</span>
                        </div>
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
                      <SummaryRow label={u('postLoadModal.titleSummary', '')} value={draft.loadTitle || '—'} />
                      <SummaryRow
                        label={u('postLoadModal.storageTarget', '')}
                        value={draft.storageTarget === 'own'
                          ? draft.warehouseName || u('postLoadModal.storageTargetOwn', '')
                          : u('postLoadModal.storageTargetExchange', '')}
                      />
                      <SummaryRow label={u('postLoadModal.warehouseStorageType', '')} value={u(`postLoadModal.storageType.${draft.warehouseStorageType}`, draft.warehouseStorageType)} />
                      <SummaryRow label={u('postLoadModal.warehousePreferredLocation', '')} value={`${draft.deliveryCity || '—'}, ${draft.deliveryCountry || '—'}`} />
                      <SummaryRow label={u('postLoadModal.specsSummary', '')} value={`${draft.pallets || '—'} pal. · ${draft.volumeM3 || '—'} CBM · ${draft.weightKg || '—'} ${draft.weightUnit}`} />
                      <SummaryRow
                        label={u('postLoadModal.warehouseDuration', '')}
                        value={draft.warehouseIsOngoing
                          ? `${draft.warehouseStartDate || '—'} · ${u('postLoadModal.warehouseOngoing', '')}`
                          : `${draft.warehouseStartDate || '—'}${draft.warehouseEndDate ? ` - ${draft.warehouseEndDate}` : ''}`}
                      />
                      <SummaryRow label={u('postLoadModal.warehouseServices', '')} value={draft.loadingEquipment.join(', ') || u('postLoadModal.none', '')} />
                      <SummaryRow
                        label={u('postLoadModal.paymentSummary', '')}
                        value={`${draft.budget || '—'} ${draft.freightCurrency} / ${u(`postLoadModal.rateUnit.${draft.warehouseRateUnit}`, draft.warehouseRateUnit)}`}
                      />
                      <SummaryRow label={u('postLoadModal.contactSummary', '')} value={`${draft.contactName} · ${draft.contactPhone || draft.contactMobile || draft.contactEmail || '—'}`} />
                      <SummaryRow label={u('postLoadModal.supplierContact', '')} value={[draft.supplierName, draft.supplierEmail, draft.supplierPhone, draft.supplierMobile, draft.supplierFax].filter(Boolean).join(' · ')} />
                      <SummaryRow
                        label={u('postLoadModal.requirements', '')}
                        value={[
                          draft.requiresAdr ? u('postLoadModal.adr', '') : null,
                          draft.warehouseFoodPharma ? u('postLoadModal.foodPharma', '') : null,
                          draft.warehouseFragile ? u('postLoadModal.fragileGoods', '') : null,
                          draft.warehouseRequiresCustomsBonded ? u('postLoadModal.warehouseCustomsBonded', '') : null,
                          draft.warehouseRequiresRacking ? u('postLoadModal.warehouseRacking', '') : null,
                          draft.warehouseRequiresInsurance ? u('postLoadModal.warehouseInsurance', '') : null,
                          draft.warehouseRequiresSecurity ? u('postLoadModal.warehouseSecurity', '') : null,
                        ].filter(Boolean).join(', ') || u('postLoadModal.none', '')}
                      />
                    </div>
                    ) : (
                    <div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-4">
                      <SummaryRow label={u('postLoadModal.consignee', '')} value={draft.consignee?.text || '—'} />
                      {/* Every stop, so a multi-drop road route is reviewed as the trip it is. */}
                      <SummaryRow label={u('postLoadModal.routeSummary', '')} value={routeStops.map(({ stop }) => stop.city || stop.address || '—').join(' → ')} />
                      <SummaryRow
                        label={u('postLoadModal.transportType', '')}
                        value={transportOptions.find((option) => option.id === draft.transportType)?.label || draft.transportType}
                      />
                      {draft.transportType === 'air' && (
                        <SummaryRow
                          label={u('postLoadModal.transportMode', '')}
                          value={{
                            'Airport to Airport': u('postLoadModal.transportModeAirportToAirport', ''),
                            'Address to Airport': u('postLoadModal.transportModeAddressToAirport', ''),
                            'Airport to Address': u('postLoadModal.transportModeAirportToAddress', ''),
                            'Air Freight + Last-Mile Delivery': u('postLoadModal.transportModeAirFreightLastMile', ''),
                          }[deriveAirTransportMode(draft.pickupPlaceType, draft.deliveryPlaceType)]}
                        />
                      )}
                      {draft.transportType === 'air' && (
                        <SummaryRow label={u('postLoadModal.aol', '')} value={draft.pickupAirport || '—'} />
                      )}
                      {draft.transportType === 'air' && (
                        <SummaryRow label={u('postLoadModal.aod', '')} value={draft.deliveryAirport || '—'} />
                      )}
                      {isContainerTransport(draft.transportType) && (
                        <SummaryRow
                          label={draft.transportType === 'rail' ? u('postLoadModal.railTerminalOfLoading', '') : u('postLoadModal.pol', '')}
                          value={draft.pickupPort || '—'}
                        />
                      )}
                      {isContainerTransport(draft.transportType) && (
                        <SummaryRow
                          label={draft.transportType === 'rail' ? u('postLoadModal.railTerminalOfDelivery', '') : u('postLoadModal.pod', '')}
                          value={draft.deliveryPort || '—'}
                        />
                      )}
                      {isContainerTransport(draft.transportType) && (
                        <SummaryRow
                          label={draft.transportType === 'rail' ? u('postLoadModal.railTransitTime', '') : u('postLoadModal.transitTime', '')}
                          value={draft.transitDays ? `${draft.transitDays} ${u('postLoadModal.transitDays', '')}` : '—'}
                        />
                      )}
                      <SummaryRow
                        label={u('postLoadModal.pickupSummary', '')}
                        value={`${draft.pickupCountry} · ${draft.pickupDate || '—'}${draft.pickupDateTo ? ` - ${draft.pickupDateTo}` : ''}${draft.pickupTimeFrom ? ` · ${draft.pickupTimeFrom}` : ''}${draft.pickupTimeTo ? ` - ${draft.pickupTimeTo}` : ''}`}
                      />
                      <SummaryRow
                        label={u('postLoadModal.deliverySummary', '')}
                        value={`${draft.deliveryCountry} · ${draft.deliveryDate || '—'}${draft.deliveryDateTo ? ` - ${draft.deliveryDateTo}` : ''}${draft.deliveryTimeFrom ? ` · ${draft.deliveryTimeFrom}` : ''}${draft.deliveryTimeTo ? ` - ${draft.deliveryTimeTo}` : ''}`}
                      />
                      <SummaryRow label={u('postLoadModal.titleSummary', '')} value={draft.loadTitle || '—'} />
                      <SummaryRow label={u('postLoadModal.cargoSummary', '')} value={deriveGoodsTypeName(draft.hsCodes, draft.goodsType) || '—'} />
                      <SummaryRow
                        label={u('postLoadModal.specsSummary', '')}
                        value={`${draft.lengthM || '—'} ${draft.lengthUnit} × ${draft.widthM || '—'} ${draft.widthUnit} × ${draft.heightM || '—'} ${draft.heightUnit} · ${draft.weightKg || '—'} ${draft.weightUnit} · ${draft.volumeM3 || '—'} CBM · ${draft.additionalInfo || u('postLoadModal.none', '')}`}
                      />
                      <SummaryRow label={u('postLoadModal.packagingMethod', '')} value={`${selectedPackageType?.label || draft.quantityMeasure || '—'} · ${draft.pallets || '—'} ${u('postLoadModal.unitsShort', '')}`} />
                      {isContainerTransport(draft.transportType) ? (
                        <SummaryRow label={u('postLoadModal.containerTypesSummary', '')} value={draft.containerSelections.length ? draft.containerSelections.map((row) => `${row.quantity}x ${containerLabel(row.type, lang)}`).join(', ') : u('postLoadModal.none', '')} />
                      ) : (
                        <SummaryRow label={u('postLoadModal.vehicleSummary', '')} value={`${draft.vehicleType} · ${draft.bodyTypes.join(', ') || u('postLoadModal.none', '')}`} />
                      )}
                      <SummaryRow
                        label={u('postLoadModal.paymentSummary', '')}
                        value={isContainerTransport(draft.transportType)
                          ? `${draft.budget || '—'} ${draft.freightCurrency} · ${draft.seaPaymentTerms || '—'}`
                          : `${draft.budget || '—'} ${draft.freightCurrency} · ${draft.paymentDueDays || '—'} ${u('postLoadModal.days', '')}`}
                      />
                      <SummaryRow label={u('postLoadModal.incoterm', '')} value={draft.incoterm || '—'} />
                      <SummaryRow label={u('postLoadModal.contactSummary', '')} value={`${draft.contactName} · ${draft.contactPhone || draft.contactMobile || draft.contactEmail || '—'}`} />
                      <SummaryRow label={u('postLoadModal.supplierContact', '')} value={[draft.supplierName, draft.supplierEmail, draft.supplierPhone, draft.supplierMobile, draft.supplierFax].filter(Boolean).join(' · ')} />
                      <SummaryRow
                        label={u('postLoadModal.flagsSummary', '')}
                        value={[
                          draft.requiresAdr ? (draft.transportType === 'air' ? u('postLoadModal.dgr', '') : u('postLoadModal.adr', '')) : null,
                          draft.requiresTailLift ? u('postLoadModal.tailLift', '') : null,
                          draft.urgent ? u('postLoadModal.urgent', '') : null,
                          draft.mustBeTrackable ? u('postLoadModal.mustBeTrackableShort', '') : null,
                        ].filter(Boolean).join(', ') || u('postLoadModal.none', '')}
                      />
                      <SummaryRow label={u('postLoadModal.publicationSummary', '')} value={draft.closedFreightExchange || u('postLoadModal.openPublication', '')} />
                    </div>
                    )}

                    <div className="space-y-4">
                      <div className="rounded-3xl bg-primary text-white p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/80">
                          {u('postLoadModal.marketReadiness', '')}
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
                            ''
                          )}
                        </p>
                      </div>

                      {/* The reference the load is known by on the other side - the shipper's own
                          order or booking number, read off the document by LenaAI. It has a column
                          of its own, so it is corrected here rather than buried in the notes. */}
                      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-2">
                        <div className="flex items-center gap-2 text-primary">
                          <Barcode className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-wider">
                            {u('postLoadModal.bookingReference', '')}
                          </span>
                        </div>
                        <Input
                          value={draft.bookingReference}
                          onChange={(event) => setField('bookingReference', event.target.value)}
                          placeholder={u('postLoadModal.bookingReferencePlaceholder', '')}
                        />
                        <p className="text-[11px] text-slate-500">
                          {u('postLoadModal.bookingReferenceHint', '')}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
                        <div className="flex items-center gap-2 text-primary">
                          <Coins className="w-4 h-4" />
                          <span className="text-xs font-black uppercase tracking-wider">
                            {u('postLoadModal.quickCheck', '')}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                          <p>{u('postLoadModal.quickCheck1', '')}</p>
                          <p>{u('postLoadModal.quickCheck2', '')}</p>
                          <p>{u('postLoadModal.quickCheck3', '')}</p>
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
                <p className="mt-1 text-xs font-medium text-rose-500/90">{u('postLoadModal.checkHighlightedFields', '')}</p>
              )}
            </div>
          )}
          <div className="grid gap-3 px-5 md:px-7 py-3 sm:grid-cols-4">
              <Button variant="outline" className="w-full h-11 gap-2" onClick={() => void startOver()} disabled={isSubmitting}>
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span className="truncate">{u('postLoadModal.startOver', '')}</span>
              </Button>
              <Button
                variant="secondary"
                className="w-full h-11 gap-2 border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/15 dark:hover:bg-primary/20"
                onClick={onOpenLenaAI ?? (() => setDropzoneOpen(true))}
                disabled={isSubmitting}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span className="truncate">{u('postLoadModal.fillWithLenaAI', '')}</span>
              </Button>
              <Button
                variant="secondary"
                className="w-full h-11 gap-2 border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/15 dark:hover:bg-primary/20"
                onClick={() => void saveDraft()}
                disabled={isSubmitting || savingDraft}
              >
                <Save className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  {savingDraft
                    ? u('postLoadModal.savingDraft', '')
                    : draftSavedAt
                      ? `${u('postLoadModal.saveDraft', '')} · ${draftSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : u('postLoadModal.saveDraft', '')}
                </span>
              </Button>
              {isLastMileEligible && !editLoadId ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button className="w-full h-11 gap-2" onClick={() => void submit()} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <Send className="w-4 h-4 shrink-0" />}
                    <span className="truncate">{isSubmitting ? u('postLoadModal.publishing', '') : u('common.postLoad', '')}</span>
                  </Button>
                  <Button className="w-full h-11 gap-2" onClick={() => void submitWithLastMile()} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <Truck className="w-4 h-4 shrink-0" />}
                    <span className="truncate">{isSubmitting ? u('postLoadModal.publishing', '') : u('postLoadModal.publishLastMileButton', '')}</span>
                  </Button>
                </div>
              ) : (
                <Button className="w-full h-11 gap-2" onClick={submit} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 shrink-0 animate-spin" /> : <Send className="w-4 h-4 shrink-0" />}
                  <span className="truncate">
                    {isSubmitting
                      ? u('postLoadModal.publishing', '')
                      : editLoadId
                        ? u('common.save', '')
                        : draft.transportType === 'warehouse'
                          ? draft.storageTarget === 'own'
                            ? u('postLoadModal.scheduleReceiptConfirm', '')
                            : u('common.postWarehouse', '')
                          : u('common.postLoad', '')}
                  </span>
                </Button>
              )}
            </div>
        </div>
      </motion.div>
      <AddWarehouseModal
        open={addWarehouseOpen}
        lang={lang}
        onClose={() => setAddWarehouseOpen(false)}
        onCreated={(record) => {
          const warehouse: OwnedWarehouse = {
            id: Number(record.id), name: String(record.name || ''), city: String(record.city || ''),
            countryCode: String(record.country_code || ''), address: String(record.address || ''),
            latitude: String(record.latitude ?? ''), longitude: String(record.longitude ?? ''),
          };
          setOwnedWarehouses((current) => [warehouse, ...current.filter((item) => item.id !== warehouse.id)]);
          selectOwnedWarehouse(warehouse);
          setAddWarehouseOpen(false);
        }}
      />
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
