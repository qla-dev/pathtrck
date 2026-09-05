export type Role = 'user' | 'driver' | 'company' | 'manager' | 'dispatcher' | 'customs_officer' | 'finance' | 'warehouse' | 'superadmin' | 'master' | null;
export type Language =
  | 'en'
  | 'bs'
  | 'de'
  | 'pl'
  | 'ro'
  | 'nl'
  | 'fr'
  | 'it'
  | 'zh'
  | 'es'
  | 'sr'
  | 'sv'
  | 'ar'
  | 'pt'
  | null;

export interface Package {
  id: string;
  trackingNumber: string;
  carrier: string;
  status: LoadStatus;
  recipient?: string;
  assignedDriverUserId?: number;
  assignedDriverName?: string;
  vehicleName?: string;
  vehicleId?: number;
  shipmentId?: string;
  totalAmount?: string;
  transportType?: string;
  cargoType?: string;
  bookingReference?: string;
  shipmentWorkspaceId?: number;
  shipmentWorkspaceReference?: string;
  operationalChecklist?: Array<{ key?: unknown; status?: unknown }>;
  workspaceCustomerUserId?: number;
  workspaceProviderUserId?: number;
  workspaceProviderCompanyId?: number;
  statusChange?: Record<string, string>;
  details?: ShipmentDetail[];
  consigneeRecord?: Record<string, unknown>;
  stops?: Array<Record<string, unknown>>;
  origin: string;
  destination: string;
  originCountryCode?: string;
  destinationCountryCode?: string;
  addedDate: string;
  transitDays: number;
  description?: string;
  warehousePosition?: [number, number];
  currentLocation: [number, number];
  hasCurrentLocation?: boolean;
  trackingUpdatedAt?: string;
  history: { date: string; status: string; location: string }[];
  customsDocuments?: Array<{ code: string; label: string; downloadable: boolean; formType?: 'dis' | 'osi' | 'dv1' | 'znp' | null; source?: 'matched' | 'manual' }>;
}

export type ShipmentDetailInput = 'text' | 'number' | 'date' | 'status' | 'customer' | 'select' | 'driver' | 'vehicle';

export type ShipmentDetail = {
  key: string;
  label: string;
  value: string;
  rawValue?: string;
  input?: ShipmentDetailInput;
};

export type LoadStatus = 'Posted' | 'Booked' | 'Opened' | 'Sent' | 'In delivery' | 'Received' | 'Finished' | 'Pending' | 'Cancelled';

export interface Load {
  id: string;
  title: string;
  weight: string;
  price: string;
  length?: number;
  width?: number;
  height?: number;
  temperatureMin?: number;
  temperatureMax?: number;
  adrClass?: string;
  cargoValue?: number;
  isFragile?: boolean;
  urgency?: 'Standard' | 'Express';
  loadingMethods?: Array<'Forklift' | 'Crane' | 'Manual'>;
  transitDays?: number;
  pickup: string;
  delivery: string;
  // Stop coordinates, when the load carries them - what lets the details view draw the real
  // driving route instead of only naming the two cities.
  pickupPosition?: [number, number];
  deliveryPosition?: [number, number];
  // Start of the pickup window, as opposed to the posted date.
  pickupAt?: string;
  date: string;
  author: string;
  status: LoadStatus;
  cargoType: string;
  goodsType: string;
  hsCodes?: Array<{ code: string; description: string; confidence?: number; section?: string; chapterCode?: string }>;
  customsDocuments?: Array<{ code: string; label: string; downloadable: boolean; formType?: 'dis' | 'osi' | 'dv1' | 'znp' | null; source?: 'matched' | 'manual' }>;
  paymentTerms: string;
  paymentDueDays?: number;
  eta: string;
  transportType?: 'road' | 'air' | 'sea' | 'rail' | 'warehouse';
  forStorage?: boolean;
  // Storage requests posted for a region rather than one warehouse: how far around the stated
  // city the customer is willing to store, so warehouses can tell whether they are in range.
  storageRadiusKm?: number;
  storageType?: string;
  storageStartDate?: string;
  storageEndDate?: string;
  isStorageOngoing?: boolean;
  warehouseRequirements?: string[];
  // Handling the customer asked the warehouse to perform on top of plain storage (Pick & Pack,
  // Labeling, ...) - what the bid form marks as REQUESTED so a provider sees its obligations first.
  storageServices?: string[];
  // The unit the customer priced their request in, which seeds the price basis of a warehouse bid.
  storageRateUnit?: string;
  requiresFoodGrade?: boolean;
  isNegotiable?: boolean;
  budget?: number;
  offers?: Array<Record<string, unknown>>;
  customerUserId?: number;
  preDeliveryStatus?: 'published' | 'open_for_reservations' | 'reservation_selected' | 'booking_confirmed';
  bookingStatus?: 'confirmed' | 'in_execution' | 'completed' | 'cancelled';
  bookingReference?: string;
  incoterms?: string;
  insurance?: string;
  shipperName?: string;
  providerRating?: number;
  mediator?: string;
  publicId?: string;
  // The shipment's Freightbook tracking number.
  trackingNumber?: string;
  shipmentOperationsId?: number;
  shipmentReference?: string;
  volume?: number;
  pallets?: number;
  truckType?: string;
  bodyTypes?: string[];
  requiresAdr?: boolean;
  tollRoadsIncluded?: boolean;
  ferryIncluded?: boolean;
  cmrRequired?: boolean;
  palletExchangeRequired?: boolean;
  customsRequired?: boolean;
  pickupWindowStart?: string;
  pickupWindowEnd?: string;
  deliveryWindowStart?: string;
  deliveryWindowEnd?: string;
}

export type AdditionalChargeRow = {
  type: string;
  condition: string;
  rate: string;
  unit: string;
};

/** One line of a warehousing quote: what the service is, how it is metered, what it costs. */
export type PriceBreakdownRow = {
  service: string;
  unit: string;
  price: string;
};

export interface Offer {
  id?: string;
  loadId: string;
  companyId?: number;
  driverUserId?: number;
  createdByUserId?: number;
  amount: string;
  currency: string;
  status?: string;
  priceBasis: string;
  vat: string;
  paymentTerms: string;
  validUntil: string;
  includedCharges: string[];
  excludedCharges: string[];
  equipmentType: string;
  vehicleAvailability: string;
  vehicleId: string;
  availableDate: string;
  exactLoadingDate: string;
  estimatedTransitDays: string;
  estimatedDeliveryDate: string;
  canPerformAsRequired: boolean;
  // --- Warehousing bids only. A storage request is answered with capacity rather than with a
  // truck, so these carry the answer and the transport fields above stay empty.
  capacityStatus: string;
  availableFrom: string;
  availableCapacity: string;
  capacityUnit: string;
  minimumStoragePeriod: string;
  priceBreakdown: PriceBreakdownRow[];
  servicesIncluded: string[];
  optionalConditions: string[];
  warehouseId: string;
  additionalCharges: AdditionalChargeRow[];
  hasExceptions: boolean;
  isCounter: boolean;
  parentOfferId?: string;
  message: string;
  confirmedAuthorized: boolean;
  confirmedDetailsMatch: boolean;
  confirmedTerms: boolean;
}

export type SubscriptionFeature = {
  key: string;
  title: string;
  description?: string;
  icon?: string;
  roles: string[];
};

export interface SubscriptionPackage {
  id: number;
  name: string;
  slug: string;
  tagline?: string;
  price_monthly: string | number;
  currency: string;
  lena_ai_tokens: number;
  icon: string;
  color: string;
  features: SubscriptionFeature[];
  is_popular: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface UserSubscription {
  id: number;
  user_id: number;
  subscription_package_id: number;
  active: boolean;
  started_at?: string | null;
  expires_at?: string | null;
  remaining_tokens: number;
  subscription_package?: SubscriptionPackage;
}

export interface RouteLog {
  id: string;
  date: string;
  distance: string;
  duration: string;
  stops: number;
  path: [number, number][];
}
