import { Language } from '../../../types';
import { CustomerOption } from '../../customer/CustomerSelect';
import { HsCodeMatch, LoadScanResult } from '../../../services/api';
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


export type StepId = 'cargo' | 'route' | 'terms' | 'contact' | 'review';
export type TransportType = 'road' | 'air' | 'sea' | 'warehouse';
export type ScannedDocument = { id: string; imageDataUrl: string | null; result: LoadScanResult };
// Sea only - one row of the "Container types" picker (type + how many of that type).
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
  deliveryDate: string;
  deliveryDateTo: string;
  deliveryTimeFrom: string;
  deliveryTimeTo: string;
  deliveryWindow: string;
  // Sea only - expected transit time between the port of loading (POL) and port of discharge
  // (POD), shown instead of a road-style driving distance.
  transitDays: string;
  loadTitle: string;
  cargoType: string;
  goodsType: string;
  hsCodes: HsCodeMatch[];
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
  deliveryPlaceType: 'Warehouse',
  deliveryCity: '',
  deliveryPostalCode: '',
  deliveryCountry: 'BA',
  deliveryAddress: '',
  deliveryPort: '',
  deliveryAirport: '',
  deliveryLatitude: '',
  deliveryLongitude: '',
  deliveryDate: '',
  deliveryDateTo: '',
  deliveryTimeFrom: '',
  deliveryTimeTo: '',
  deliveryWindow: '',
  transitDays: '',
  loadTitle: '',
  cargoType: 'FTL',
  goodsType: 'General',
  hsCodes: [],
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

