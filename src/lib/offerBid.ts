import { AdditionalChargeRow, Offer } from '../types';

export type ChargeItem = { key: string; label: string; description: string };

export const STANDARD_CHARGE_ITEMS: ChargeItem[] = [
  { key: 'toll_roads', label: 'Road tolls', description: 'Tolls and motorway fees' },
  { key: 'ferry', label: 'Ferry', description: 'Ferry / RoRo fees' },
  { key: 'cmr', label: 'CMR', description: 'CMR document issuance' },
  { key: 'transit_documents', label: 'Transit documents', description: 'T1 / Carnet / other transit docs' },
  { key: 'loading_assistance', label: 'Loading assistance', description: "At shipper's site" },
  { key: 'unloading_assistance', label: 'Unloading assistance', description: "At consignee's site" },
  { key: 'customs_representation', label: 'Customs representation', description: 'Brokerage and customs clearance' },
  { key: 'waiting_time', label: 'Waiting time (2h free)', description: 'Extra waiting time costs' },
  { key: 'pallet_exchange', label: 'Pallet exchange', description: 'Pallet swap fees' },
  { key: 'tail_lift', label: 'Tail lift', description: 'Tail lift usage' },
  { key: 'insurance', label: 'Insurance', description: 'Cargo insurance' },
  { key: 'other', label: 'Other', description: 'Other included costs' },
];

export const PRICE_BASIS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'fixed_total', label: 'Fixed Total Price' },
  { value: 'best_bid', label: 'Best bid' },
  { value: 'per_km', label: 'Price per km' },
  { value: 'per_ton', label: 'Price per ton' },
  { value: 'per_pallet', label: 'Price per pallet' },
];

export const VAT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'excluded', label: 'Excluded' },
  { value: 'included', label: 'Included' },
];

export const PAYMENT_TERMS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'immediate', label: 'Immediate' },
  { value: '7_days', label: '7 days' },
  { value: '15_days', label: '15 days' },
  { value: '30_days', label: '30 days' },
  { value: '45_days', label: '45 days' },
  { value: '60_days', label: '60 days' },
];

export const EQUIPMENT_TYPE_OPTIONS = ['Curtainsider', 'Box Truck', 'Reefer', 'Mega Trailer', 'Tautliner', 'Flatbed', 'Other'];

export const CURRENCY_OPTIONS = ['EUR', 'BAM', 'USD'];

export const chargeLabel = (key: string): string => STANDARD_CHARGE_ITEMS.find((item) => item.key === key)?.label || key;

export const createEmptyAdditionalCharge = (type = ''): AdditionalChargeRow => ({ type, condition: '', rate: '', unit: '' });

export const seedAdditionalChargesFromExcluded = (
  current: AdditionalChargeRow[],
  excludedKeys: string[]
): AdditionalChargeRow[] => {
  const existingTypes = new Set(current.map((row) => row.type));
  const seeded = excludedKeys
    .map((key) => chargeLabel(key))
    .filter((label) => !existingTypes.has(label))
    .map((label) => createEmptyAdditionalCharge(label));

  return seeded.length ? [...current, ...seeded] : current;
};

export const createEmptyOfferDraft = (overrides: Partial<Offer> = {}): Offer => ({
  loadId: '',
  amount: '',
  currency: 'EUR',
  priceBasis: 'fixed_total',
  vat: 'excluded',
  paymentTerms: '30_days',
  validUntil: '',
  includedCharges: [],
  excludedCharges: [],
  equipmentType: '',
  vehicleAvailability: 'not_available',
  vehicleId: '',
  availableDate: '',
  exactLoadingDate: '',
  estimatedTransitDays: '',
  estimatedDeliveryDate: '',
  canPerformAsRequired: true,
  additionalCharges: [],
  hasExceptions: false,
  isCounter: false,
  message: '',
  confirmedAuthorized: false,
  confirmedDetailsMatch: false,
  confirmedTerms: false,
  ...overrides,
});

export const toFlatpickrDate = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
};

export const toFlatpickrDateTime = (value?: string | null): string => {
  const datePart = toFlatpickrDate(value);
  if (!datePart || !value) return '';
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${datePart} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const fromFlatpickrDate = (value: string): string | null => {
  const match = value.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

export const fromFlatpickrDateTime = (value: string): string | null => {
  const match = value.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const [, day, month, year, hour, minute] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${hour.padStart(2, '0')}:${minute}:00`;
};

export const offerDraftFromRecord = (record: Record<string, unknown> | null, base: Partial<Offer> = {}): Offer => {
  const empty = createEmptyOfferDraft(base);
  if (!record) return empty;

  const str = (value: unknown, fallback = ''): string => (value == null ? fallback : String(value));
  const strArray = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);
  const additionalCharges = (value: unknown): AdditionalChargeRow[] =>
    Array.isArray(value)
      ? value.map((row) => {
          const r = (row || {}) as Record<string, unknown>;
          return { type: str(r.type), condition: str(r.condition), rate: r.rate == null ? '' : String(r.rate), unit: str(r.unit) };
        })
      : [];

  return {
    ...empty,
    amount: record.amount == null ? empty.amount : String(record.amount),
    currency: str(record.currency, empty.currency),
    priceBasis: str(record.price_basis, empty.priceBasis),
    vat: str(record.vat, empty.vat),
    paymentTerms: str(record.payment_terms, empty.paymentTerms),
    validUntil: record.valid_until == null ? empty.validUntil : toFlatpickrDateTime(String(record.valid_until)),
    includedCharges: strArray(record.included_charges),
    excludedCharges: strArray(record.excluded_charges),
    equipmentType: str(record.equipment_type, empty.equipmentType),
    vehicleAvailability: str(record.vehicle_availability, empty.vehicleAvailability),
    vehicleId: record.vehicle_id == null ? empty.vehicleId : String(record.vehicle_id),
    availableDate: record.available_date == null ? empty.availableDate : toFlatpickrDate(String(record.available_date)),
    exactLoadingDate: record.exact_loading_date == null ? empty.exactLoadingDate : toFlatpickrDate(String(record.exact_loading_date)),
    estimatedTransitDays: record.estimated_transit_days == null ? empty.estimatedTransitDays : String(record.estimated_transit_days),
    estimatedDeliveryDate: record.estimated_delivery_date == null ? empty.estimatedDeliveryDate : toFlatpickrDate(String(record.estimated_delivery_date)),
    canPerformAsRequired: record.can_perform_as_required == null ? empty.canPerformAsRequired : Boolean(record.can_perform_as_required),
    additionalCharges: additionalCharges(record.additional_charges),
    hasExceptions: Boolean(record.has_exceptions),
    isCounter: Boolean(record.is_counter),
    message: str(record.message, empty.message),
    confirmedAuthorized: Boolean(record.confirmed_authorized),
    confirmedDetailsMatch: Boolean(record.confirmed_details_match),
    confirmedTerms: Boolean(record.confirmed_terms),
  };
};

export const offerDraftToPayload = (draft: Offer): Record<string, unknown> => ({
  amount: Number(draft.amount),
  currency: draft.currency,
  price_basis: draft.priceBasis,
  vat: draft.vat,
  payment_terms: draft.paymentTerms,
  valid_until: fromFlatpickrDateTime(draft.validUntil),
  included_charges: draft.includedCharges,
  excluded_charges: draft.excludedCharges,
  equipment_type: draft.equipmentType,
  vehicle_availability: draft.vehicleAvailability,
  vehicle_id: draft.vehicleId ? Number(draft.vehicleId) : null,
  available_date: fromFlatpickrDate(draft.availableDate),
  exact_loading_date: fromFlatpickrDate(draft.exactLoadingDate),
  estimated_transit_days: draft.estimatedTransitDays === '' ? null : Number(draft.estimatedTransitDays),
  estimated_delivery_date: draft.estimatedDeliveryDate ? fromFlatpickrDate(draft.estimatedDeliveryDate) : null,
  can_perform_as_required: draft.canPerformAsRequired,
  additional_charges: draft.additionalCharges
    .filter((row) => row.type.trim() || row.condition.trim() || row.rate.trim() || row.unit.trim())
    .map((row) => ({ ...row, rate: row.rate.trim() === '' ? null : Number(row.rate) })),
  has_exceptions: draft.hasExceptions,
  is_counter: draft.isCounter,
  message: draft.message.trim() || undefined,
  confirmed_authorized: draft.confirmedAuthorized,
  confirmed_details_match: draft.confirmedDetailsMatch,
  confirmed_terms: draft.confirmedTerms,
});

export const validateOfferDraft = (
  draft: Offer,
  u: (key: string, fallback: string) => string
): string | null => {
  if (!draft.priceBasis) return u('Select a price basis.', 'Select a price basis.');
  if (draft.priceBasis === 'best_bid' && draft.paymentTerms !== 'immediate') {
    return u('offer.bestBidImmediateOnly', 'Best bid requires immediate payment.');
  }
  if (!draft.vat) return u('Select whether VAT is included or excluded.', 'Select whether VAT is included or excluded.');
  if (!draft.paymentTerms) return u('Select payment terms.', 'Select payment terms.');
  if (!draft.validUntil) return u('Set how long your offer is valid.', 'Set how long your offer is valid.');
  if (!draft.equipmentType) return u('Select the equipment type you will use.', 'Select the equipment type you will use.');
  if (!draft.vehicleAvailability) return u('Select vehicle availability.', 'Select vehicle availability.');
  if (!draft.availableDate) return u('Set the vehicle available date.', 'Set the vehicle available date.');
  if (!draft.exactLoadingDate) return u('Set the exact loading date.', 'Set the exact loading date.');
  if (draft.estimatedTransitDays.trim() === '' || Number(draft.estimatedTransitDays) < 0) {
    return u('Set the estimated transit time.', 'Set the estimated transit time.');
  }
  if (!draft.confirmedAuthorized || !draft.confirmedDetailsMatch || !draft.confirmedTerms) {
    return u('Please confirm all three statements before submitting.', 'Please confirm all three statements before submitting.');
  }
  return null;
};

export type BidState = {
  myOffer: Record<string, unknown> | null;
  highestBidAmount: number | null;
  displayAmount: number | null;
};

export const getBidState = (
  offers: Array<Record<string, unknown>> | undefined,
  userId: number | undefined,
  fallbackAmount: number | undefined | null
): BidState => {
  const list = offers || [];
  const myOffer = list.find((offer) =>
    userId != null && (Number(offer.driver_user_id) === userId || Number(offer.created_by_user_id) === userId)) || null;
  const activeOffers = list.filter((offer) => String(offer.status || '').toLowerCase() !== 'rejected');
  const highestBidAmount = activeOffers.length
    ? Math.max(...activeOffers.map((offer) => Number(offer.amount) || 0))
    : null;
  const displayAmount = highestBidAmount != null
    ? highestBidAmount
    : (fallbackAmount && fallbackAmount > 0 ? fallbackAmount : null);

  return { myOffer, highestBidAmount, displayAmount };
};

export const getOfferLabel = (
  u: (key: string, fallback: string) => string,
  bidState: BidState,
  currency: string
) => {
  const base = bidState.myOffer
    ? u('legacy.loadDetails.changeOffer', 'Change offer')
    : u('legacy.loadDetails.negotiateTerms', 'Make offer');

  return bidState.displayAmount != null ? `${base} · ${currency} ${bidState.displayAmount.toLocaleString()}` : base;
};
