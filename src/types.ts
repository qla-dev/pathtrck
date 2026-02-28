export type Role = 'user' | 'driver' | null;
export type Language = 'en' | 'bs' | 'de' | null;

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
  pickup: string;
  delivery: string;
  date: string;
  author: string;
  status: 'Available' | 'Assigned' | 'In Transit' | 'Completed';
  cargoType: string;
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
