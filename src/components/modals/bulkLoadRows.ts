import { BulkLoadRow } from '../../services/api';
import { deriveGoodsTypeCode, stripHsCodesForPayload } from './scanFieldRows';

export const bulkRowSummary = (row: BulkLoadRow) => {
  const route = [
    [row.pickupCity, row.pickupCountryCode].filter(Boolean).join(', ') || '—',
    [row.deliveryCity, row.deliveryCountryCode].filter(Boolean).join(', ') || '—',
  ].join(' → ');
  const weight = row.weightKg ? `${row.weightKg} kg` : null;
  const budget = row.budget ? `${row.budget} ${row.currency || 'EUR'}` : null;
  return { route, weight, budget };
};

export const bulkRowIsUsable = (row: BulkLoadRow) =>
  Boolean(row.pickupCity && row.deliveryCity && row.weightKg);

export const buildBulkLoadPayload = (row: BulkLoadRow): Record<string, unknown> => ({
  title: row.title || 'New load',
  cargo_type: row.cargoType || 'FTL',
  goods_type: deriveGoodsTypeCode(row.hsCodes, row.goodsType || 'General'),
  hs_codes: row.hsCodes ? stripHsCodesForPayload(row.hsCodes) : undefined,
  weight_kg: row.weightKg > 0 ? row.weightKg : 0.01,
  pallets: row.pallets || undefined,
  budget: row.budget || undefined,
  currency: row.currency || 'EUR',
  body_types: row.bodyType ? [row.bodyType] : [],
  booking_reference: row.bookingReference || undefined,
  notes: row.notes || undefined,
  status: 'pending',
  stops: [
    {
      type: 'pickup',
      position: 1,
      city: row.pickupCity || 'Unknown',
      country_code: (row.pickupCountryCode || 'XX').slice(0, 2).toUpperCase(),
      window_starts_at: row.pickupDate ? `${row.pickupDate}T00:00:00` : undefined,
    },
    {
      type: 'delivery',
      position: 2,
      city: row.deliveryCity || 'Unknown',
      country_code: (row.deliveryCountryCode || 'XX').slice(0, 2).toUpperCase(),
      window_starts_at: row.deliveryDate ? `${row.deliveryDate}T00:00:00` : undefined,
    },
  ],
});
