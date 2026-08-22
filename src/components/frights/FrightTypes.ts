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
