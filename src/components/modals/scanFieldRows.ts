import { LoadScanResult } from '../../services/api';

export type ScanFieldPatch = Partial<{
  cargoTitle: string;
  goodsType: string;
  weightKg: string;
  pallets: string;
  bodyTypes: string[];
  pickupCity: string;
  pickupCountry: string;
  pickupDate: string;
  deliveryCity: string;
  deliveryCountry: string;
  deliveryDate: string;
  budget: string;
  freightCurrency: string;
  notes: string;
}>;

export type ScanFieldRow = {
  key: string;
  label: string;
  value: string;
  patch: ScanFieldPatch;
};

const toDisplayDate = (isoDate: string): string => {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : isoDate;
};

export const buildScanFieldRows = (result: LoadScanResult): ScanFieldRow[] => {
  const rows: ScanFieldRow[] = [];

  if (result.title) {
    rows.push({ key: 'title', label: 'Title', value: result.title, patch: { cargoTitle: result.title } });
  }

  const goodsType = result.goodsType || result.cargoType;
  if (goodsType) {
    rows.push({ key: 'goodsType', label: 'Goods type', value: goodsType, patch: { goodsType } });
  }

  if (result.weightKg) {
    rows.push({
      key: 'weight',
      label: 'Weight',
      value: `${result.weightKg} kg`,
      patch: { weightKg: String(result.weightKg / 1000) },
    });
  }

  if (result.pallets) {
    rows.push({
      key: 'pallets',
      label: 'Pallets / units',
      value: String(result.pallets),
      patch: { pallets: String(result.pallets) },
    });
  }

  if (result.bodyType) {
    rows.push({
      key: 'bodyType',
      label: 'Trailer / body type',
      value: result.bodyType,
      patch: { bodyTypes: [result.bodyType] },
    });
  }

  if (result.pickupCity || result.pickupCountryCode) {
    rows.push({
      key: 'pickup',
      label: 'Pickup',
      value: [result.pickupCity, result.pickupCountryCode].filter(Boolean).join(', '),
      patch: {
        ...(result.pickupCity ? { pickupCity: result.pickupCity } : {}),
        ...(result.pickupCountryCode ? { pickupCountry: result.pickupCountryCode } : {}),
      },
    });
  }

  if (result.pickupDate) {
    rows.push({
      key: 'pickupDate',
      label: 'Pickup date',
      value: toDisplayDate(result.pickupDate),
      patch: { pickupDate: toDisplayDate(result.pickupDate) },
    });
  }

  if (result.deliveryCity || result.deliveryCountryCode) {
    rows.push({
      key: 'delivery',
      label: 'Delivery',
      value: [result.deliveryCity, result.deliveryCountryCode].filter(Boolean).join(', '),
      patch: {
        ...(result.deliveryCity ? { deliveryCity: result.deliveryCity } : {}),
        ...(result.deliveryCountryCode ? { deliveryCountry: result.deliveryCountryCode } : {}),
      },
    });
  }

  if (result.deliveryDate) {
    rows.push({
      key: 'deliveryDate',
      label: 'Delivery date',
      value: toDisplayDate(result.deliveryDate),
      patch: { deliveryDate: toDisplayDate(result.deliveryDate) },
    });
  }

  if (result.budget) {
    rows.push({
      key: 'budget',
      label: 'Budget',
      value: `${result.budget} ${result.currency || 'EUR'}`,
      patch: { budget: String(result.budget), freightCurrency: result.currency || 'EUR' },
    });
  }

  const notes = [result.notes, result.bookingReference ? `Booking ref: ${result.bookingReference}` : '']
    .filter(Boolean)
    .join(' ')
    .trim();
  if (notes) {
    rows.push({ key: 'notes', label: 'Notes', value: notes, patch: { notes } });
  }

  return rows;
};
