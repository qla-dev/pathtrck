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
  status: 'Pending' | 'In Transit' | 'Out for Delivery' | 'Delivered' | 'Exception';
  origin: string;
  destination: string;
  addedDate: string;
  transitDays: number;
  description?: string;
  currentLocation: [number, number];
  history: { date: string; status: string; location: string }[];
}

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
  status: 'Available' | 'Assigned' | 'In Transit' | 'Completed';
  cargoType: string;
  goodsType: string;
  paymentTerms: 'In Advance' | 'Negotiable' | 'On Delivery';
  eta: string;
}

export interface RouteLog {
  id: string;
  date: string;
  distance: string;
  duration: string;
  stops: number;
  path: [number, number][];
}
