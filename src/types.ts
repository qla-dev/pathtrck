export type Role = 'user' | 'driver' | 'company' | 'finance' | 'superadmin' | null;
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
}

export interface RouteLog {
  id: string;
  date: string;
  distance: string;
  duration: string;
  stops: number;
  path: [number, number][];
}
