import { LoadDraft } from './types';
import { deriveGoodsTypeCode, stripHsCodesForPayload } from '../scanFieldRows';

// Air transport mode is no longer a manual choice - it's fully determined by whether the pickup
// is an airport (AOL) or a door/facility, and whether the delivery is an airport (AOD) or a
// door/facility, so the user only answers it once (via the place-type pickers on the Route step)
// instead of being asked to keep it in sync by hand.
export const deriveAirTransportMode = (pickupPlaceType: string, deliveryPlaceType: string): string => {
  const pickupIsAirport = pickupPlaceType === 'AOL / Airport of loading';
  const deliveryIsAirport = deliveryPlaceType === 'AOD / Airport of delivery';
  if (pickupIsAirport && deliveryIsAirport) return 'Airport to Airport';
  if (!pickupIsAirport && deliveryIsAirport) return 'Address to Airport';
  if (pickupIsAirport && !deliveryIsAirport) return 'Airport to Address';
  return 'Air Freight + Last-Mile Delivery';
};

export const toApiDateTime = (date: string, time = '00:00') => {
  const match = date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}T${time || '00:00'}:00` : null;
};

export const toApiDate = (date: string) => {
  const match = date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
};

export const fromApiDateTime = (value: unknown) => {
  if (!value) return { date: '', time: '' };
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return { date: '', time: '' };
  return { date: `${String(parsed.getDate()).padStart(2, '0')}.${String(parsed.getMonth() + 1).padStart(2, '0')}.${parsed.getFullYear()}`, time: `${String(parsed.getHours()).padStart(2, '0')}:${String(parsed.getMinutes()).padStart(2, '0')}` };
};

export const fromApiWeightKg = (value: unknown) => {
  const weightKg = Number(value);
  if (!Number.isFinite(weightKg) || weightKg <= 0) return '';
  return String(weightKg / 1000);
};

export const toApiWeightKg = (weightTonnes: string) => Number(weightTonnes) * 1000;

// Shared by the real /loads payload (submit) and the /load-drafts payload (save draft) — every
// field except the route, which the two resources store differently (loads uses a separate
// load_stops table, load_drafts flattens pickup_*/delivery_* columns onto itself).
export const buildLoadFieldsPayload = (draft: LoadDraft) => ({
  consignee_customer_id: draft.consignee?.id || null,
  booking_reference: draft.bookingReference || null,
  title: draft.loadTitle,
  transport_type: draft.transportType,
  cargo_type: draft.cargoType,
  goods_type: deriveGoodsTypeCode(draft.hsCodes, draft.goodsType),
  hs_codes: stripHsCodesForPayload(draft.hsCodes),
  weight_kg: toApiWeightKg(draft.weightKg),
  length_m: draft.lengthM ? Number(draft.lengthM) : null,
  width_m: draft.widthM ? Number(draft.widthM) : null,
  height_m: draft.heightM ? Number(draft.heightM) : null,
  volume_m3: draft.volumeM3 ? Number(draft.volumeM3) : null,
  pallets: draft.pallets ? Number(draft.pallets) : null,
  quantity_measure: draft.quantityMeasure || null,
  declared_value: draft.declaredValue ? Number(draft.declaredValue) : null,
  shipment_value_currency: draft.shipmentValueCurrency,
  budget: draft.budget ? Number(draft.budget) : null,
  is_negotiable: draft.receivePriceProposals,
  currency: draft.freightCurrency,
  payment_terms: draft.transportType === 'sea' ? (draft.seaPaymentTerms || null) : (draft.paymentDeferred ? 'deferred' : 'on_delivery'),
  incoterms: draft.incoterm || null,
  payment_due_days: draft.transportType !== 'sea' && draft.paymentDeferred && draft.paymentDueDays ? Number(draft.paymentDueDays) : null,
  temperature_min: draft.temperatureControlled && draft.temperatureMin ? Number(draft.temperatureMin) : null,
  temperature_max: draft.temperatureControlled && draft.temperatureMax ? Number(draft.temperatureMax) : null,
  loading_methods: draft.loadingEquipment,
  vehicle_type: draft.transportType === 'road' ? draft.vehicleType : null,
  transport_mode: draft.transportType === 'air' ? deriveAirTransportMode(draft.pickupPlaceType, draft.deliveryPlaceType) : null,
  special_requirements: draft.transportType === 'air' ? draft.specialRequirements : [],
  characteristics: draft.characteristics,
  delivery_proof: draft.transportType === 'air' ? draft.deliveryProof || null : null,
  transit_days: draft.transportType === 'sea' && draft.transitDays ? Number(draft.transitDays) : null,
  requires_adr: draft.requiresAdr,
  requires_tail_lift: draft.requiresTailLift,
  toll_roads_included: draft.tollRoadsIncluded,
  ferry_included: draft.ferryIncluded,
  cmr_required: draft.cmrRequired,
  pallet_exchange_required: draft.palletExchangeRequired,
  customs_required: draft.customsRequired,
  insurance_required: draft.insuranceRequired,
  certification_required: draft.certificationRequired,
  inspection_services_required: draft.inspectionServicesRequired,
  must_be_trackable: draft.mustBeTrackable,
  is_urgent: draft.urgent,
  body_types: draft.bodyTypes,
  container_selections: draft.transportType === 'sea'
    ? draft.containerSelections.filter((row) => row.type).map((row) => ({ type: row.type, quantity: row.quantity ? Number(row.quantity) : 1 }))
    : [],
  bl_type: draft.transportType === 'sea' ? draft.blType || null : null,
  dg_un_number: draft.transportType === 'sea' && draft.characteristics.includes('DG / IMO') ? draft.dgUnNumber || null : null,
  dg_imo_class: draft.transportType === 'sea' && draft.characteristics.includes('DG / IMO') ? draft.dgImoClass || null : null,
  dg_packing_group: draft.transportType === 'sea' && draft.characteristics.includes('DG / IMO') ? draft.dgPackingGroup || null : null,
  dg_proper_shipping_name: draft.transportType === 'sea' && draft.characteristics.includes('DG / IMO') ? draft.dgProperShippingName || null : null,
  oog_in_gauge: draft.transportType === 'sea' && draft.characteristics.includes('OOG') ? draft.oogInGauge || null : null,
  oog_length_m: draft.transportType === 'sea' && draft.oogInGauge === 'out_of_gauge' ? Number(draft.oogLengthM) || null : null,
  oog_width_m: draft.transportType === 'sea' && draft.oogInGauge === 'out_of_gauge' ? Number(draft.oogWidthM) || null : null,
  oog_height_m: draft.transportType === 'sea' && draft.oogInGauge === 'out_of_gauge' ? Number(draft.oogHeightM) || null : null,
  oog_weight_kg: draft.transportType === 'sea' && draft.oogInGauge === 'out_of_gauge' ? Number(draft.oogWeightKg) || null : null,
  contact: { name: draft.contactName, phone: draft.contactPhone, mobile: draft.contactMobile, email: draft.contactEmail, fax: draft.contactFax },
  notes: draft.notes || draft.additionalInfo || null,
  internal_comments: draft.internalComments || null,
  external_comments: draft.externalComments || null,
});

export const buildLoadStopsPayload = (draft: LoadDraft) => [
  { type: 'pickup', position: 1, place_type: draft.pickupPlaceType, city: draft.pickupCity, postal_code: draft.pickupPostalCode || null, country_code: draft.pickupCountry, address: draft.pickupAddress || null, port: (draft.transportType === 'sea' || draft.pickupPlaceType === 'Port') ? draft.pickupPort || null : null, airport: (draft.transportType === 'air' || draft.pickupPlaceType === 'Airport') ? draft.pickupAirport || null : null, latitude: draft.pickupLatitude ? Number(draft.pickupLatitude) : null, longitude: draft.pickupLongitude ? Number(draft.pickupLongitude) : null, window_starts_at: toApiDateTime(draft.pickupDate, draft.pickupTimeFrom), window_ends_at: toApiDateTime(draft.pickupDateTo || draft.pickupDate, draft.pickupTimeTo || draft.pickupTimeFrom) },
  { type: 'delivery', position: 2, place_type: draft.deliveryPlaceType, city: draft.deliveryCity, postal_code: draft.deliveryPostalCode || null, country_code: draft.deliveryCountry, address: draft.deliveryAddress || null, port: (draft.transportType === 'sea' || draft.deliveryPlaceType === 'Port') ? draft.deliveryPort || null : null, airport: (draft.transportType === 'air' || draft.deliveryPlaceType === 'Airport') ? draft.deliveryAirport || null : null, latitude: draft.deliveryLatitude ? Number(draft.deliveryLatitude) : null, longitude: draft.deliveryLongitude ? Number(draft.deliveryLongitude) : null, window_starts_at: toApiDateTime(draft.deliveryDate, draft.deliveryTimeFrom), window_ends_at: toApiDateTime(draft.deliveryDateTo || draft.deliveryDate, draft.deliveryTimeTo || draft.deliveryTimeFrom) },
];

export const buildLoadPayload = (draft: LoadDraft) => ({ ...buildLoadFieldsPayload(draft), stops: buildLoadStopsPayload(draft) });

export const buildDraftPayload = (draft: LoadDraft) => ({
  ...buildLoadFieldsPayload(draft),
  pickup_place_type: draft.pickupPlaceType || null,
  pickup_city: draft.pickupCity || null,
  pickup_postal_code: draft.pickupPostalCode || null,
  pickup_country_code: draft.pickupCountry || null,
  pickup_address: draft.pickupAddress || null,
  pickup_port: (draft.transportType === 'sea' || draft.pickupPlaceType === 'Port') ? draft.pickupPort || null : null,
  pickup_airport: (draft.transportType === 'air' || draft.pickupPlaceType === 'Airport') ? draft.pickupAirport || null : null,
  pickup_latitude: draft.pickupLatitude ? Number(draft.pickupLatitude) : null,
  pickup_longitude: draft.pickupLongitude ? Number(draft.pickupLongitude) : null,
  pickup_date: toApiDate(draft.pickupDate),
  pickup_date_to: toApiDate(draft.pickupDateTo || draft.pickupDate),
  pickup_time_from: draft.pickupTimeFrom || null,
  pickup_time_to: draft.pickupTimeTo || draft.pickupTimeFrom || null,
  delivery_place_type: draft.deliveryPlaceType || null,
  delivery_city: draft.deliveryCity || null,
  delivery_postal_code: draft.deliveryPostalCode || null,
  delivery_country_code: draft.deliveryCountry || null,
  delivery_address: draft.deliveryAddress || null,
  delivery_port: (draft.transportType === 'sea' || draft.deliveryPlaceType === 'Port') ? draft.deliveryPort || null : null,
  delivery_airport: (draft.transportType === 'air' || draft.deliveryPlaceType === 'Airport') ? draft.deliveryAirport || null : null,
  delivery_latitude: draft.deliveryLatitude ? Number(draft.deliveryLatitude) : null,
  delivery_longitude: draft.deliveryLongitude ? Number(draft.deliveryLongitude) : null,
  delivery_date: toApiDate(draft.deliveryDate),
  delivery_date_to: toApiDate(draft.deliveryDateTo || draft.deliveryDate),
  delivery_time_from: draft.deliveryTimeFrom || null,
  delivery_time_to: draft.deliveryTimeTo || draft.deliveryTimeFrom || null,
});

// Genuinely distinct from buildLoadFieldsPayload above - a warehouse request is a storage-service
// listing (pallets/CBM/storage duration/handling requirements), not a route+cargo load, so it has
// no stops array and shares almost no fields with /loads. Posted to /warehouse-requests instead.
export const buildWarehouseRequestPayload = (draft: LoadDraft) => ({
  title: draft.loadTitle || null,
  storage_type: draft.warehouseStorageType,
  pallets: draft.pallets ? Number(draft.pallets) : null,
  cbm: draft.volumeM3 ? Number(draft.volumeM3) : null,
  weight_kg: draft.weightKg ? toApiWeightKg(draft.weightKg) : null,
  city: draft.pickupCity,
  country_code: draft.pickupCountry,
  address: draft.pickupAddress || null,
  latitude: draft.pickupLatitude ? Number(draft.pickupLatitude) : null,
  longitude: draft.pickupLongitude ? Number(draft.pickupLongitude) : null,
  start_date: toApiDate(draft.warehouseStartDate),
  end_date: draft.warehouseIsOngoing ? null : toApiDate(draft.warehouseEndDate),
  is_ongoing: draft.warehouseIsOngoing,
  handling_requirements: draft.loadingEquipment,
  temperature_min: draft.warehouseTemperatureMin ? Number(draft.warehouseTemperatureMin) : null,
  temperature_max: draft.warehouseTemperatureMax ? Number(draft.warehouseTemperatureMax) : null,
  requires_customs_bonded: draft.warehouseRequiresCustomsBonded,
  requires_racking: draft.warehouseRequiresRacking,
  requires_insurance: draft.warehouseRequiresInsurance,
  requires_security: draft.warehouseRequiresSecurity,
  budget: draft.budget ? Number(draft.budget) : null,
  currency: draft.freightCurrency,
  rate_unit: draft.warehouseRateUnit || null,
  is_negotiable: draft.receivePriceProposals,
  notes: draft.notes || null,
  internal_comments: draft.internalComments || null,
  external_comments: draft.externalComments || null,
  contact: { name: draft.contactName, phone: draft.contactPhone, mobile: draft.contactMobile, email: draft.contactEmail, fax: draft.contactFax },
});

export const routePosition = (latitude: string, longitude: string): [number, number] | null => {
  // Number('') is 0, not NaN - without this guard a missing coordinate silently becomes a "valid"
  // (0, 0) position instead of no position, which showed up as a bogus "0 km" route distance.
  if (!latitude.trim() || !longitude.trim()) return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
};

export const estimatedDrivingDistanceKm = (from: [number, number], to: [number, number]) => {
  const radians = (value: number) => (value * Math.PI) / 180;
  const [fromLat, fromLng] = from;
  const [toLat, toLng] = to;
  const a = Math.sin(radians(toLat - fromLat) / 2) ** 2
    + Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(radians(toLng - fromLng) / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.18);
};


