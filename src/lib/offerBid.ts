import { AdditionalChargeRow, Load, Offer, PriceBreakdownRow } from '../types';
import { SUPPORTED_CURRENCIES } from './currency';

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

export const CURRENCY_OPTIONS = [...SUPPORTED_CURRENCIES];

// --- Warehousing bids -------------------------------------------------------------------------
// Storage is sold per unit and per period, so a warehouse bid states a basis, a breakdown of what
// each service costs in that basis, and how much space it can actually take - none of which the
// transport constants above express.

export const WAREHOUSE_PRICE_BASIS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'per_pallet_day', label: 'Per pallet / day' },
  { value: 'per_pallet_month', label: 'Per pallet / month' },
  { value: 'per_m2_month', label: 'Per m² / month' },
  { value: 'per_m3_month', label: 'Per m³ / month' },
  { value: 'fixed_total', label: 'Fixed total price' },
  { value: 'custom', label: 'Custom pricing' },
];

export const WAREHOUSE_VAT_OPTIONS: Array<{ value: string; label: string }> = [
  ...VAT_OPTIONS,
  { value: 'not_applicable', label: 'Not applicable' },
];

export const CAPACITY_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'available', label: 'Yes, capacity available' },
  { value: 'partial', label: 'Partially available' },
  { value: 'propose_changes', label: 'No, but I can propose changes' },
];

export const CAPACITY_UNIT_OPTIONS = ['EUR pallets', 'Industrial pallets', 'm²', 'm³', 'Units'];

export const MINIMUM_STORAGE_PERIOD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'none', label: 'No minimum' },
  { value: '1_week', label: '1 week' },
  { value: '1_month', label: '1 month' },
  { value: '3_months', label: '3 months' },
  { value: '6_months', label: '6 months' },
  { value: 'custom', label: 'Custom' },
];

export type WarehouseServiceItem = { key: string; label: string; unit: string };

/**
 * Everything a warehouse can offer. `unit` is how the service is normally metered and seeds the
 * price breakdown row when the service is part of the offer, so a provider only types the number.
 */
export const WAREHOUSE_SERVICE_ITEMS: WarehouseServiceItem[] = [
  { key: 'storage', label: 'Storage', unit: 'per pallet / month' },
  { key: 'unloading', label: 'Unloading', unit: 'per pallet' },
  { key: 'loading', label: 'Loading', unit: 'per pallet' },
  { key: 'pick_pack', label: 'Pick & Pack', unit: 'per order' },
  { key: 'repacking', label: 'Repacking', unit: 'per unit' },
  { key: 'labeling', label: 'Labeling', unit: 'per unit' },
  { key: 'palletization', label: 'Palletization', unit: 'per pallet' },
  { key: 'kitting', label: 'Kitting', unit: 'per order' },
  { key: 'cross_docking', label: 'Cross-docking', unit: 'per pallet' },
  { key: 'goods_inspection', label: 'Goods inspection', unit: 'per pallet' },
  { key: 'customs_handling', label: 'Customs handling', unit: 'per shipment' },
  { key: 'distribution', label: 'Distribution', unit: 'per shipment' },
];

/** The handling labels a storage request is posted with, mapped onto the service catalogue. */
const REQUESTED_SERVICE_BY_HANDLING: Record<string, string> = {
  Storage: 'storage',
  Loading: 'loading',
  Unloading: 'unloading',
  'Cross-docking': 'cross_docking',
  'Pick & Pack': 'pick_pack',
  Labeling: 'labeling',
  Kitting: 'kitting',
  Palletizing: 'palletization',
  Repackaging: 'repacking',
  'Goods inspection': 'goods_inspection',
  'Customs handling': 'customs_handling',
  Distribution: 'distribution',
};

/** Charge types a warehouse commonly bills on top of the quoted rate. */
export const WAREHOUSE_CHARGE_TYPE_OPTIONS = [
  'Inbound handling', 'Outbound handling', 'Pallet handling', 'Picking fee', 'Packing fee',
  'Labeling', 'Forklift handling', 'Container unloading', 'Minimum monthly charge',
  'Administration fee', 'Customs handling', 'Waste disposal', 'After-hours handling', 'Other',
];

export const WAREHOUSE_OPTIONAL_CONDITION_ITEMS: Array<{ key: string; label: string }> = [
  { key: 'minimum_monthly_charge', label: 'Minimum monthly charge applies' },
  { key: 'billed_on_occupied', label: 'Prices subject to actual occupied capacity' },
  { key: 'handling_billed_separately', label: 'Additional handling charged separately' },
];

export const warehouseServiceLabel = (key: string): string =>
  WAREHOUSE_SERVICE_ITEMS.find((item) => item.key === key)?.label || key;

export const warehouseServiceUnit = (key: string): string =>
  WAREHOUSE_SERVICE_ITEMS.find((item) => item.key === key)?.unit || '';

/**
 * The services this request actually asks for - what the customer ticked when posting it. Storage
 * itself leads the list whether or not it was ticked: a storage request implies it.
 */
export const requestedWarehouseServices = (load: Pick<Load, 'storageServices'>): string[] => {
  const fromHandling = (load.storageServices || [])
    .map((label) => REQUESTED_SERVICE_BY_HANDLING[label])
    .filter((key): key is string => Boolean(key));

  return Array.from(new Set(['storage', ...fromHandling]));
};

/** The basis the customer priced their request in, so the bid opens on the same unit. */
export const warehousePriceBasisFromRateUnit = (rateUnit?: string): string => {
  if (rateUnit === 'per_pallet_month') return 'per_pallet_month';
  if (rateUnit === 'per_m3_month') return 'per_m3_month';
  if (rateUnit === 'per_month') return 'fixed_total';
  return 'per_pallet_month';
};

export const createEmptyPriceBreakdownRow = (service = '', unit = ''): PriceBreakdownRow => ({ service, unit, price: '' });

/** A breakdown row per requested service, keeping whatever the provider already priced. */
export const seedPriceBreakdownFromServices = (
  current: PriceBreakdownRow[],
  serviceKeys: string[]
): PriceBreakdownRow[] => {
  const existing = new Map(current.map((row) => [row.service, row]));

  return serviceKeys.map((key) => {
    const label = warehouseServiceLabel(key);
    return existing.get(label) || createEmptyPriceBreakdownRow(label, warehouseServiceUnit(key));
  });
};

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
  capacityStatus: 'available',
  availableFrom: '',
  availableCapacity: '',
  capacityUnit: 'EUR pallets',
  minimumStoragePeriod: 'none',
  priceBreakdown: [],
  servicesIncluded: [],
  optionalConditions: [],
  warehouseId: '',
  additionalCharges: [],
  hasExceptions: false,
  isCounter: false,
  parentOfferId: undefined,
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
  const priceBreakdown = (value: unknown): PriceBreakdownRow[] =>
    Array.isArray(value)
      ? value.map((row) => {
          const r = (row || {}) as Record<string, unknown>;
          return { service: str(r.service), unit: str(r.unit), price: r.price == null ? '' : String(r.price) };
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
    capacityStatus: str(record.capacity_status, empty.capacityStatus),
    availableFrom: record.available_from == null ? empty.availableFrom : toFlatpickrDate(String(record.available_from)),
    availableCapacity: record.available_capacity == null ? empty.availableCapacity : String(record.available_capacity),
    capacityUnit: str(record.capacity_unit, empty.capacityUnit),
    minimumStoragePeriod: str(record.minimum_storage_period, empty.minimumStoragePeriod),
    priceBreakdown: priceBreakdown(record.price_breakdown),
    servicesIncluded: strArray(record.services_included),
    optionalConditions: strArray(record.optional_conditions),
    warehouseId: record.warehouse_id == null ? empty.warehouseId : String(record.warehouse_id),
    additionalCharges: additionalCharges(record.additional_charges),
    hasExceptions: Boolean(record.has_exceptions),
    isCounter: Boolean(record.is_counter),
    parentOfferId: record.parent_offer_id == null ? undefined : String(record.parent_offer_id),
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

/**
 * A warehousing bid's payload. It deliberately omits the transport commitment fields rather than
 * sending them empty - a storage offer has no truck, loading date or transit time to speak of.
 */
export const warehouseOfferDraftToPayload = (draft: Offer): Record<string, unknown> => ({
  amount: Number(draft.amount),
  currency: draft.currency,
  price_basis: draft.priceBasis,
  vat: draft.vat,
  payment_terms: draft.paymentTerms,
  valid_until: fromFlatpickrDateTime(draft.validUntil),
  capacity_status: draft.capacityStatus,
  available_from: fromFlatpickrDate(draft.availableFrom),
  available_capacity: draft.availableCapacity.trim() === '' ? null : Number(draft.availableCapacity),
  capacity_unit: draft.capacityUnit || null,
  minimum_storage_period: draft.minimumStoragePeriod || null,
  price_breakdown: draft.priceBreakdown
    .filter((row) => row.service.trim() || row.unit.trim() || row.price.trim())
    .map((row) => ({ ...row, price: row.price.trim() === '' ? null : Number(row.price) })),
  services_included: draft.servicesIncluded,
  optional_conditions: draft.optionalConditions,
  warehouse_id: draft.warehouseId ? Number(draft.warehouseId) : null,
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

export const validateWarehouseOfferDraft = (
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
  if (!draft.capacityStatus) return u('State whether you can accept this request.', 'State whether you can accept this request.');
  if (!draft.availableFrom) return u('Set the date your capacity is available from.', 'Set the date your capacity is available from.');
  if (draft.availableCapacity.trim() === '' || Number(draft.availableCapacity) <= 0) {
    return u('Enter the capacity you can offer.', 'Enter the capacity you can offer.');
  }
  if (draft.servicesIncluded.length === 0) {
    return u('Select at least one service you are offering.', 'Select at least one service you are offering.');
  }
  if (!draft.confirmedTerms) {
    return u('Confirm the price and conditions before submitting.', 'Confirm the price and conditions before submitting.');
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

/**
 * Identifies who is bidding, regardless of which specific offer row we're looking at: a counter is
 * created under the poster's own user id, so `created_by_user_id` differs between a bidder's own offer
 * and the counter sent back to them. `driver_user_id`/`company_id` stay the same across both, since a
 * counter payload copies them from the offer being countered — that's what makes them the same
 * "bidding session" on this load, even if a row is missing a clean `parent_offer_id` link.
 */
const bidderIdentity = (offer: Record<string, unknown>): string => {
  if (offer.driver_user_id != null) return `driver:${offer.driver_user_id}`;
  if (offer.company_id != null) return `company:${offer.company_id}`;
  // A warehousing bid has neither a driver nor a company behind it, so the thread it belongs to is
  // what identifies it: a counter carries the id of the offer it answers, the original carries none.
  return `offer:${offer.parent_offer_id ?? offer.id}`;
};

const sameBiddingSession = (a: Record<string, unknown>, b: Record<string, unknown>): boolean =>
  String(a.load_id) === String(b.load_id) && bidderIdentity(a) === bidderIdentity(b);

/** Every offer from the same bidder on the same load — the original bid plus every counter, either direction, oldest first. */
export const getOfferThread = (
  offers: Array<Record<string, unknown>> | undefined,
  offerId: string
): Array<Record<string, unknown>> => {
  const list = offers || [];
  const anchor = list.find((offer) => String(offer.id) === offerId);
  if (!anchor) return [];
  return list
    .filter((offer) => sameBiddingSession(offer, anchor))
    .sort((a, b) => Number(a.id) - Number(b.id));
};

/** One row per bidding session (same load + same bidder) — the most recent offer in that session. */
export const getLatestOfferPerThread = (
  offers: Array<Record<string, unknown>> | undefined
): Array<Record<string, unknown>> => {
  const list = offers || [];
  const latestByKey = new Map<string, Record<string, unknown>>();
  for (const offer of list) {
    const key = `${String(offer.load_id)}::${bidderIdentity(offer)}`;
    const existing = latestByKey.get(key);
    if (!existing || Number(offer.id) > Number(existing.id)) {
      latestByKey.set(key, offer);
    }
  }
  return Array.from(latestByKey.values());
};

/** The newest offer in `offerId`'s bidding session sent by someone other than `excludeUserId` (the bidder) — i.e. the poster's counter. */
export const getLatestCounter = (
  offers: Array<Record<string, unknown>> | undefined,
  offerId: string,
  excludeUserId: number | undefined
): Record<string, unknown> | null => {
  const list = offers || [];
  const anchor = list.find((offer) => String(offer.id) === offerId);
  if (!anchor) return null;
  const replies = list
    .filter((offer) => sameBiddingSession(offer, anchor))
    .filter((offer) => Number(offer.id) !== Number(anchor.id))
    .filter((offer) => excludeUserId == null || Number(offer.created_by_user_id) !== excludeUserId)
    .sort((a, b) => Number(b.id) - Number(a.id));
  return replies[0] || null;
};

/** Full create payload for a counter-offer: identity fields copied from the offer being countered, edited terms from `draft`. */
export const buildCounterOfferPayload = (
  original: Record<string, unknown>,
  draft: Offer,
  createdByUserId: number | undefined,
  isStorage = false
): Record<string, unknown> => ({
  load_id: Number(original.load_id),
  company_id: original.company_id ?? undefined,
  driver_user_id: original.driver_user_id ?? undefined,
  created_by_user_id: createdByUserId,
  ...(isStorage ? warehouseOfferDraftToPayload(draft) : offerDraftToPayload(draft)),
  is_counter: true,
  parent_offer_id: Number(original.id),
});

type CompareField = { key: string; label: string; format?: (value: unknown) => string };

const COMPARE_FIELDS: CompareField[] = [
  { key: 'amount', label: 'Price', format: (v) => (v == null ? '—' : Number(v).toLocaleString()) },
  { key: 'price_basis', label: 'Price basis', format: (v) => optionLabel(PRICE_BASIS_OPTIONS, v) },
  { key: 'vat', label: 'VAT', format: (v) => (v == null ? '—' : String(v)) },
  { key: 'payment_terms', label: 'Payment terms', format: (v) => optionLabel(PAYMENT_TERMS_OPTIONS, v) },
  { key: 'valid_until', label: 'Valid until' },
  { key: 'equipment_type', label: 'Equipment type' },
  { key: 'estimated_transit_days', label: 'Transit days' },
  { key: 'estimated_delivery_date', label: 'Delivery ETA' },
];

const optionLabel = (options: Array<{ value: string; label: string }>, value: unknown): string =>
  options.find((option) => option.value === value)?.label || (value == null ? '—' : String(value));

export type OfferFieldDiff = { key: string; label: string; oldValue: string; newValue: string };

/** Fields whose value actually changed between two offer records, for a "here's what changed" comparison view. */
export const diffOfferRecords = (
  previous: Record<string, unknown>,
  next: Record<string, unknown>
): OfferFieldDiff[] =>
  COMPARE_FIELDS.filter((field) => String(previous[field.key] ?? '') !== String(next[field.key] ?? ''))
    .map((field) => ({
      key: field.key,
      label: field.label,
      oldValue: (field.format || String)(previous[field.key]),
      newValue: (field.format || String)(next[field.key]),
    }));
