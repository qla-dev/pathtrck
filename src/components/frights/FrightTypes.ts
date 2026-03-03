export type SortMode = 'cheapest' | 'fastest';

export type Offer = {
  id: string;
  carrier: string;
  badge: string;
  origin: string;
  destination: string;
  originPort: string;
  transitDays: number;
  freeDays: number;
  priceUsd: number;
};

export type ServiceFilterKey =
  | 'place_of_loading'
  | 'port_of_origin'
  | 'ocean_freight'
  | 'port_of_discharge'
  | 'place_of_discharge';

export type ServiceFilters = Record<ServiceFilterKey, boolean>;

export type ServiceItem = {
  key: ServiceFilterKey;
  label: string;
  disabled: boolean;
};
