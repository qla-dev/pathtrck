import { Package, Load, RouteLog } from './types';

export const MOCK_PACKAGES: Package[] = [
  {
    id: '1',
    trackingNumber: 'ER217960271BA',
    carrier: 'Parcel Force',
    status: 'In Transit',
    origin: 'London, UK',
    destination: 'Sarajevo, BA',
    addedDate: '28 February',
    transitDays: 1,
    currentLocation: [43.8563, 18.4131],
    history: [
      { date: '28 Feb, 10:00', status: 'In Transit', location: 'Sarajevo Hub' },
      { date: '27 Feb, 14:00', status: 'Processed', location: 'London Gateway' },
      { date: '26 Feb, 09:00', status: 'Picked Up', location: 'Sender Warehouse' },
    ]
  },
  {
    id: '2',
    trackingNumber: 'SWIFT-9921-X',
    carrier: 'PathTracker.ai Express',
    status: 'Out for Delivery',
    origin: 'Berlin, DE',
    destination: 'Munich, DE',
    addedDate: '27 February',
    transitDays: 2,
    currentLocation: [48.1351, 11.5820],
    history: [
      { date: '28 Feb, 08:30', status: 'Out for Delivery', location: 'Munich Central' },
      { date: '27 Feb, 18:00', status: 'Arrived', location: 'Munich Hub' },
    ]
  }
];

export const MOCK_LOADS: Load[] = [
  {
    id: 'L1',
    title: 'Electronics Pallets',
    weight: '1200',
    price: '€450',
    pickup: 'Vienna, AT',
    delivery: 'Prague, CZ',
    date: 'March 2, 2026',
    author: 'TechLogistics GmbH',
    status: 'Available',
    cargoType: 'Electronics',
    eta: '2 March, 18:00'
  },
  {
    id: 'L2',
    title: 'Frozen Goods (Meat)',
    weight: '18000',
    price: '€2,100',
    pickup: 'Zagreb, HR',
    delivery: 'Berlin, DE',
    date: 'March 4, 2026',
    author: 'ColdChain Solutions',
    status: 'Assigned',
    cargoType: 'Perishable',
    eta: '4 March, 12:00'
  },
  {
    id: 'L3',
    title: 'Furniture Set',
    weight: '800',
    price: '€320',
    pickup: 'Sarajevo, BA',
    delivery: 'Banja Luka, BA',
    date: 'March 1, 2026',
    author: 'HomeStyle',
    status: 'Available',
    cargoType: 'Fragile',
    eta: '1 March, 16:00'
  }
];

export const MOCK_ROUTES: RouteLog[] = [
  {
    id: 'R1',
    date: 'Feb 27, 2026',
    distance: '420 km',
    duration: '5h 30m',
    stops: 12,
    path: [[43.8563, 18.4131], [44.1997, 17.9048], [44.7722, 17.1910]]
  },
  {
    id: 'R2',
    date: 'Feb 26, 2026',
    distance: '150 km',
    duration: '2h 15m',
    stops: 5,
    path: [[43.8563, 18.4131], [43.7345, 18.2345], [43.6123, 18.1234]]
  }
];
