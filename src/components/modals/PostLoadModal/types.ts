import { Language } from '../../../types';
import { CustomerOption } from '../../customer/CustomerSelect';
import { CustomsDocument, HsCodeMatch, LoadScanResult } from '../../../services/api';
import { ScanFieldPatch } from '../scanFieldRows';

export type PostLoadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  editLoadId?: number | string | null;
  onSaved?: (load: Record<string, unknown>) => void;
  initialPrefill?: ScanFieldPatch | null;
  onOpenLenaAI?: () => void;
  // The conversation this draft came from (if opened via the LenaAI canvas's "Spasi kao draft i
  // nastavi sa objavom" button) and its already-persisted load_drafts row id, if any.
  sourceConversationId?: string | number | null;
  initialDraftId?: string | number | null;
  // Fired the first time a manually-started draft (no sourceConversationId) is saved and a fresh
  // LenaAI conversation gets created for it, so the app behind the modal can jump to Messages.
  onDraftConversationCreated?: (conversationId: string) => void;
};


export type StepId = 'cargo' | 'route' | 'contact' | 'review';
export type TransportType = 'road' | 'air' | 'sea' | 'rail' | 'warehouse';

/**
 * Rail is modelled on the sea flow: the same leg types (terminal-to-terminal, door-to-terminal),
 * the same container picker, the same characteristics and payment terms. Everything the two share
 * branches on this instead of naming 'sea', so the differences that remain - terminals instead of
 * ports, a CIM/SMGS consignment note instead of a Bill of Lading - are the only places the two
 * modes are told apart.
 */
export const isContainerTransport = (transportType: TransportType): boolean =>
  transportType === 'sea' || transportType === 'rail';

/**
 * One stop of a road route beyond the first pickup and the first delivery.
 *
 * A road load is often multi-drop: collect at two or three addresses, unload at two or three more.
 * Stop 1 of each side stays in the flat pickup / delivery fields, because every other transport
 * type - and everything that reads a load's origin and destination - only ever needs those two;
 * the additional ones are appended here, in the order they are driven.
 */
export type RouteStopDraft = {
  placeType: string;
  city: string;
  postalCode: string;
  country: string;
  address: string;
  port: string;
  airport: string;
  latitude: string;
  longitude: string;
  date: string;
  dateTo: string;
  timeFrom: string;
  timeTo: string;
};

/** A blank extra stop, starting in the country of the stop it was added under. */
export const emptyRouteStop = (country: string): RouteStopDraft => ({
  placeType: 'Warehouse',
  city: '',
  postalCode: '',
  country: country || 'BA',
  address: '',
  port: '',
  airport: '',
  latitude: '',
  longitude: '',
  date: '',
  dateTo: '',
  timeFrom: '',
  timeTo: '',
});

export type ScannedDocument = { id: string; imageDataUrl: string | null; result: LoadScanResult };
// Sea and rail - one row of the "Container types" picker (type + how many of that type).
export type ContainerSelection = { type: string; quantity: string };

export type LoadDraft = {
  consignee: CustomerOption | null;
  bookingReference: string;
  transportType: TransportType;
  pickupPlaceType: string;
  pickupCity: string;
  pickupPostalCode: string;
  pickupCountry: string;
  pickupAddress: string;
  // Sea only - the selected port of loading (POL), kept separate from pickupAddress so a sea
  // shipment can carry both the port AND a door pickup address (Door to Port) at once.
  pickupPort: string;
  // Air only - the selected airport of loading (AOL), same reasoning as pickupPort above.
  pickupAirport: string;
  pickupLatitude: string;
  pickupLongitude: string;
  pickupDate: string;
  pickupDateTo: string;
  pickupTimeFrom: string;
  pickupTimeTo: string;
  pickupWindow: string;
  // Road only - pickups 2..n, driven after the pickup above and before any delivery.
  extraPickups: RouteStopDraft[];
  deliveryPlaceType: string;
  deliveryCity: string;
  deliveryPostalCode: string;
  deliveryCountry: string;
  deliveryAddress: string;
  // Sea only - the selected port of discharge (POD), kept separate from deliveryAddress so a sea
  // shipment can carry both the port AND a door delivery address (Port to Door) at once.
  deliveryPort: string;
  // Air only - the selected airport of delivery (AOD), same reasoning as deliveryPort above.
  deliveryAirport: string;
  deliveryLatitude: string;
  deliveryLongitude: string;
  // Warehouse only - with deliveryPlaceType 'Area' the customer picks a region to store in
  // rather than one warehouse, so the delivery coordinates are the centre of a circle this wide.
  deliveryRadiusKm: string;
  deliveryDate: string;
  deliveryDateTo: string;
  deliveryTimeFrom: string;
  deliveryTimeTo: string;
  deliveryWindow: string;
  // Road only - deliveries 2..n, driven after the delivery above.
  extraDeliveries: RouteStopDraft[];
  // Sea only - expected transit time between the port of loading (POL) and port of discharge
  // (POD), shown instead of a road-style driving distance.
  transitDays: string;
  loadTitle: string;
  cargoType: string;
  goodsType: string;
  hsCodes: HsCodeMatch[];
  customsDocuments: CustomsDocument[];
  weightKg: string;
  pallets: string;
  quantityMeasure: string;
  lengthM: string;
  widthM: string;
  heightM: string;
  volumeM3: string;
  declaredValue: string;
  additionalInfo: string;
  loadingEquipment: string[];
  vehicleType: string;
  bodyTypes: string[];
  // Sea only - replaces bodyTypes for the "Equipment & requirements" card.
  containerSelections: ContainerSelection[];
  characteristics: string[];
  specialRequirements: string[];
  deliveryProof: string;
  // Sea only - the detail fields opened by the "DG / IMO" characteristics chip.
  dgUnNumber: string;
  dgImoClass: string;
  dgPackingGroup: string;
  dgProperShippingName: string;
  // Sea only - the detail fields opened by the "OOG" characteristics chip. Only out_of_gauge
  // needs the excess dimensions below - in_gauge cargo fits within the container envelope.
  oogInGauge: string;
  oogLengthM: string;
  oogWidthM: string;
  oogHeightM: string;
  oogWeightKg: string;
  // Sea only - Bill of Lading type, replaces the road-only CMR toggle.
  blType: string;
  // Warehouse only - storage-service request fields (pallet/CBM/duration, not route-shaped).
  warehouseEquipment: string[];
  warehouseStorageType: string;
  warehouseStartDate: string;
  warehouseEndDate: string;
  warehouseIsOngoing: boolean;
  warehouseTemperatureMin: string;
  warehouseTemperatureMax: string;
  warehouseRequiresCustomsBonded: boolean;
  warehouseRequiresRacking: boolean;
  warehouseRequiresInsurance: boolean;
  warehouseRequiresSecurity: boolean;
  warehouseRateUnit: string;
  // Warehouse only - the two special requirements a storage request states that have no
  // equivalent among the transport flags: food-grade/pharma conditions and careful handling.
  warehouseFoodPharma: boolean;
  warehouseFragile: boolean;
  mustBeTrackable: boolean;
  paymentDeferred: boolean;
  // Sea only - replaces paymentDeferred (Prepaid / Collect / Other instead of a due-date window).
  seaPaymentTerms: string;
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
  insuranceRequired: boolean;
  certificationRequired: boolean;
  inspectionServicesRequired: boolean;
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


export const INITIAL_DRAFT: LoadDraft = {
  consignee: null,
  bookingReference: '',
  transportType: 'road',
  pickupPlaceType: 'Warehouse',
  pickupCity: '',
  pickupPostalCode: '',
  pickupCountry: 'BA',
  pickupAddress: '',
  pickupPort: '',
  pickupAirport: '',
  pickupLatitude: '',
  pickupLongitude: '',
  pickupDate: '',
  pickupDateTo: '',
  pickupTimeFrom: '',
  pickupTimeTo: '',
  pickupWindow: '',
  extraPickups: [],
  deliveryPlaceType: 'Warehouse',
  deliveryCity: '',
  deliveryPostalCode: '',
  deliveryCountry: 'BA',
  deliveryAddress: '',
  deliveryPort: '',
  deliveryAirport: '',
  deliveryLatitude: '',
  deliveryLongitude: '',
  deliveryRadiusKm: '25',
  deliveryDate: '',
  deliveryDateTo: '',
  deliveryTimeFrom: '',
  deliveryTimeTo: '',
  deliveryWindow: '',
  extraDeliveries: [],
  transitDays: '',
  loadTitle: '',
  cargoType: 'FTL',
  goodsType: 'General',
  hsCodes: [],
  customsDocuments: [],
  weightKg: '',
  pallets: '',
  quantityMeasure: '',
  lengthM: '',
  widthM: '',
  heightM: '',
  volumeM3: '',
  declaredValue: '',
  additionalInfo: '',
  loadingEquipment: [],
  vehicleType: 'Box Truck',
  bodyTypes: ['Curtain'],
  containerSelections: [],
  characteristics: [],
  specialRequirements: [],
  deliveryProof: '',
  dgUnNumber: '',
  dgImoClass: '',
  dgPackingGroup: '',
  dgProperShippingName: '',
  oogInGauge: '',
  oogLengthM: '',
  oogWidthM: '',
  oogHeightM: '',
  oogWeightKg: '',
  blType: '',
  warehouseEquipment: [],
  warehouseStorageType: 'Ambient',
  warehouseStartDate: '',
  warehouseEndDate: '',
  warehouseIsOngoing: false,
  warehouseTemperatureMin: '',
  warehouseTemperatureMax: '',
  warehouseRequiresCustomsBonded: false,
  warehouseRequiresRacking: false,
  warehouseRequiresInsurance: false,
  warehouseRequiresSecurity: false,
  warehouseRateUnit: 'per_pallet_month',
  warehouseFoodPharma: false,
  warehouseFragile: false,
  mustBeTrackable: false,
  paymentDeferred: false,
  seaPaymentTerms: '',
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
  insuranceRequired: false,
  certificationRequired: false,
  inspectionServicesRequired: false,
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


// A requirement toggle is only worth showing when the loading-equipment / required-services picker
// in the middle column does not already state the same thing for this transport type. Keeping the
// overlaps in one map means the two lists cannot drift apart as options are added to either side:
// the toggle disappears exactly when an equivalent option exists, and payload.ts reads the same map
// to keep the boolean column filled from whichever control the user actually saw.
export const EQUIPMENT_COVERED_REQUIREMENTS = {
  requiresTailLift: ['Vehicle with ramp', 'Tail Lift Required', 'Loading', 'Unloading'],
  customsRequired: ['Customs handling'],
  inspectionServicesRequired: ['Goods inspection'],
} as const satisfies Record<string, readonly string[]>;

export type EquipmentCoveredRequirement = keyof typeof EQUIPMENT_COVERED_REQUIREMENTS;
