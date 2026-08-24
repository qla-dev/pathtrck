export type Role = 'user' | 'driver' | 'company' | 'finance' | 'superadmin' | 'master' | null;
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
  shipmentId?: string;
  totalAmount?: string;
  transportType?: string;
  cargoType?: string;
  bookingReference?: string;
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
  currentLocation: [number, number];
  history: { date: string; status: string; location: string }[];
}

export type ShipmentDetailInput = 'text' | 'number' | 'date' | 'status' | 'customer' | 'select';

export type ShipmentDetail = {
  key: string;
  label: string;
  value: string;
  rawValue?: string;
  input?: ShipmentDetailInput;
};

export type LoadStatus = 'Posted' | 'Opened' | 'Sent' | 'In delivery' | 'Received' | 'Finished' | 'Pending' | 'Cancelled';

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
  date: string;
  author: string;
  status: LoadStatus;
  cargoType: string;
  goodsType: string;
  hsCodes?: Array<{ code: string; description: string; confidence?: number }>;
  paymentTerms: string;
  paymentDueDays?: number;
  eta: string;
  transportType?: 'road' | 'air' | 'sea';
  isNegotiable?: boolean;
  budget?: number;
  offers?: Array<Record<string, unknown>>;
  bookingReference?: string;
  incoterms?: string;
  insurance?: string;
  shipperName?: string;
  mediator?: string;
  publicId?: string;
  volume?: number;
  pallets?: number;
  truckType?: string;
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
  additionalCharges: AdditionalChargeRow[];
  hasExceptions: boolean;
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
