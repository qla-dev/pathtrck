import { EQUIPMENT_COVERED_REQUIREMENTS, LoadDraft, isContainerTransport } from './types';
import type { RouteStopDraft } from './types';
import { StopSide, routeStopsOf } from './routeStops';
import type { EquipmentCoveredRequirement } from './types';
import { deriveGoodsTypeCode, stripHsCodesForPayload } from '../scanFieldRows';

// The exchange filters on requires_tail_lift / customs_required / inspection_services_required, so
// those columns still have to be filled when the duplicate toggle was hidden - the user stated the
// same thing by picking the matching loading-equipment / required-services option instead.
const requirementFlag = (draft: LoadDraft, requirement: EquipmentCoveredRequirement): boolean =>
  Boolean(draft[requirement])
  || EQUIPMENT_COVERED_REQUIREMENTS[requirement].some((option) => draft.loadingEquipment.includes(option));


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
  customs_documents: draft.customsDocuments,
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
  payment_terms: isContainerTransport(draft.transportType) ? (draft.seaPaymentTerms || null) : (draft.paymentDeferred ? 'deferred' : 'on_delivery'),
  incoterms: draft.incoterm || null,
  payment_due_days: !isContainerTransport(draft.transportType) && draft.paymentDeferred && draft.paymentDueDays ? Number(draft.paymentDueDays) : null,
  temperature_min: draft.temperatureControlled && draft.temperatureMin ? Number(draft.temperatureMin) : null,
  temperature_max: draft.temperatureControlled && draft.temperatureMax ? Number(draft.temperatureMax) : null,
  loading_methods: draft.loadingEquipment,
  vehicle_type: draft.transportType === 'road' ? draft.vehicleType : null,
  transport_mode: draft.transportType === 'air' ? deriveAirTransportMode(draft.pickupPlaceType, draft.deliveryPlaceType) : null,
  special_requirements: draft.transportType === 'air' ? draft.specialRequirements : [],
  characteristics: draft.characteristics,
  delivery_proof: draft.transportType === 'air' ? draft.deliveryProof || null : null,
  transit_days: isContainerTransport(draft.transportType) && draft.transitDays ? Number(draft.transitDays) : null,
  requires_adr: draft.requiresAdr,
  requires_tail_lift: requirementFlag(draft, 'requiresTailLift'),
  toll_roads_included: draft.tollRoadsIncluded,
  ferry_included: draft.ferryIncluded,
  cmr_required: draft.cmrRequired,
  pallet_exchange_required: draft.palletExchangeRequired,
  customs_required: requirementFlag(draft, 'customsRequired'),
  insurance_required: draft.insuranceRequired,
  certification_required: draft.certificationRequired,
  inspection_services_required: requirementFlag(draft, 'inspectionServicesRequired'),
  must_be_trackable: draft.mustBeTrackable,
  is_urgent: draft.urgent,
  body_types: draft.bodyTypes,
  container_selections: isContainerTransport(draft.transportType)
    ? draft.containerSelections.filter((row) => row.type).map((row) => ({ type: row.type, quantity: row.quantity ? Number(row.quantity) : 1 }))
    : [],
  bl_type: isContainerTransport(draft.transportType) ? draft.blType || null : null,
  dg_un_number: isContainerTransport(draft.transportType) && draft.characteristics.includes('DG / IMO') ? draft.dgUnNumber || null : null,
  dg_imo_class: isContainerTransport(draft.transportType) && draft.characteristics.includes('DG / IMO') ? draft.dgImoClass || null : null,
  dg_packing_group: isContainerTransport(draft.transportType) && draft.characteristics.includes('DG / IMO') ? draft.dgPackingGroup || null : null,
  dg_proper_shipping_name: isContainerTransport(draft.transportType) && draft.characteristics.includes('DG / IMO') ? draft.dgProperShippingName || null : null,
  oog_in_gauge: isContainerTransport(draft.transportType) && draft.characteristics.includes('OOG') ? draft.oogInGauge || null : null,
  oog_length_m: isContainerTransport(draft.transportType) && draft.oogInGauge === 'out_of_gauge' ? Number(draft.oogLengthM) || null : null,
  oog_width_m: isContainerTransport(draft.transportType) && draft.oogInGauge === 'out_of_gauge' ? Number(draft.oogWidthM) || null : null,
  oog_height_m: isContainerTransport(draft.transportType) && draft.oogInGauge === 'out_of_gauge' ? Number(draft.oogHeightM) || null : null,
  oog_weight_kg: isContainerTransport(draft.transportType) && draft.oogInGauge === 'out_of_gauge' ? Number(draft.oogWeightKg) || null : null,
  contact: { name: draft.contactName, phone: draft.contactPhone, mobile: draft.contactMobile, email: draft.contactEmail, fax: draft.contactFax },
  notes: draft.notes || draft.additionalInfo || null,
  internal_comments: draft.internalComments || null,
  external_comments: draft.externalComments || null,
});

// One stop as the API stores it. A port or an airport only travels with the stop that is one - a
// road load collecting at three warehouses has neither on any of them.
const stopPayload = (draft: LoadDraft, stop: RouteStopDraft, side: StopSide, position: number) => ({
  type: side,
  position,
  place_type: stop.placeType,
  city: stop.city,
  postal_code: stop.postalCode || null,
  country_code: stop.country,
  address: stop.address || null,
  port: (isContainerTransport(draft.transportType) || stop.placeType === 'Port') ? stop.port || null : null,
  airport: (draft.transportType === 'air' || stop.placeType === 'Airport') ? stop.airport || null : null,
  latitude: stop.latitude ? Number(stop.latitude) : null,
  longitude: stop.longitude ? Number(stop.longitude) : null,
  window_starts_at: toApiDateTime(stop.date, stop.timeFrom),
  window_ends_at: toApiDateTime(stop.dateTo || stop.date, stop.timeTo || stop.timeFrom),
});

// Every stop in driving order - the pickups, then the deliveries. Only road can add more than one
// of each, so for every other transport type this is still exactly the pickup/delivery pair.
export const buildLoadStopsPayload = (draft: LoadDraft) =>
  routeStopsOf(draft).map(({ stop, side }, index) => stopPayload(draft, stop, side, index + 1));

export const buildLoadPayload = (draft: LoadDraft) => ({ ...buildLoadFieldsPayload(draft), stops: buildLoadStopsPayload(draft) });

export const buildDraftPayload = (draft: LoadDraft) => ({
  ...buildLoadFieldsPayload(draft),
  pickup_place_type: draft.pickupPlaceType || null,
  pickup_city: draft.pickupCity || null,
  pickup_postal_code: draft.pickupPostalCode || null,
  pickup_country_code: draft.pickupCountry || null,
  pickup_address: draft.pickupAddress || null,
  pickup_port: (isContainerTransport(draft.transportType) || draft.pickupPlaceType === 'Port') ? draft.pickupPort || null : null,
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
  delivery_port: (isContainerTransport(draft.transportType) || draft.deliveryPlaceType === 'Port') ? draft.deliveryPort || null : null,
  delivery_airport: (draft.transportType === 'air' || draft.deliveryPlaceType === 'Airport') ? draft.deliveryAirport || null : null,
  delivery_latitude: draft.deliveryLatitude ? Number(draft.deliveryLatitude) : null,
  delivery_longitude: draft.deliveryLongitude ? Number(draft.deliveryLongitude) : null,
  delivery_radius_km: draft.deliveryPlaceType === 'Area' && draft.deliveryRadiusKm ? Number(draft.deliveryRadiusKm) : null,
  delivery_date: toApiDate(draft.deliveryDate),
  delivery_date_to: toApiDate(draft.deliveryDateTo || draft.deliveryDate),
  delivery_time_from: draft.deliveryTimeFrom || null,
  delivery_time_to: draft.deliveryTimeTo || draft.deliveryTimeFrom || null,
  // Stop 1 of each side has flat columns of its own above; a multi-drop road route's remaining
  // stops ride along as JSON, since a draft has no load_stops table behind it to spread them over.
  extra_stops: [
    ...draft.extraPickups.map((stop) => ({ ...stop, side: 'pickup' })),
    ...draft.extraDeliveries.map((stop) => ({ ...stop, side: 'delivery' })),
  ],
});

// Warehouse listings live in the same `loads` resource as transport loads and are distinguished by
// transport_type. Their two stops preserve pickup and preferred-storage locations, while the backend
// still omits shipment tracking for storage requests.
export const buildWarehouseLoadPayload = (draft: LoadDraft) => ({
  transport_type: 'warehouse',
  for_storage: true,
  status: 'posted',
  title: draft.loadTitle || null,
  customs_documents: draft.customsDocuments,
  storage_type: draft.warehouseStorageType,
  pallets: draft.pallets ? Number(draft.pallets) : null,
  volume_m3: draft.volumeM3 ? Number(draft.volumeM3) : null,
  weight_kg: draft.weightKg ? toApiWeightKg(draft.weightKg) : null,
  warehouse_city: draft.deliveryCity,
  warehouse_country_code: draft.deliveryCountry,
  warehouse_address: draft.deliveryAddress || null,
  warehouse_latitude: draft.deliveryLatitude ? Number(draft.deliveryLatitude) : null,
  warehouse_longitude: draft.deliveryLongitude ? Number(draft.deliveryLongitude) : null,
  // Only an area request carries a radius - picking one concrete warehouse means the exact point.
  warehouse_radius_km: draft.deliveryPlaceType === 'Area' && draft.deliveryRadiusKm ? Number(draft.deliveryRadiusKm) : null,
  stops: [
    { type: 'pickup', position: 1, place_type: draft.pickupPlaceType, city: draft.pickupCity, postal_code: draft.pickupPostalCode || null, country_code: draft.pickupCountry, address: draft.pickupAddress || null, latitude: draft.pickupLatitude ? Number(draft.pickupLatitude) : null, longitude: draft.pickupLongitude ? Number(draft.pickupLongitude) : null, window_starts_at: toApiDateTime(draft.pickupDate, draft.pickupTimeFrom), window_ends_at: toApiDateTime(draft.pickupDateTo || draft.pickupDate, draft.pickupTimeTo || draft.pickupTimeFrom) },
    { type: 'delivery', position: 2, place_type: draft.deliveryPlaceType, city: draft.deliveryCity, postal_code: draft.deliveryPostalCode || null, country_code: draft.deliveryCountry, address: draft.deliveryAddress || null, latitude: draft.deliveryLatitude ? Number(draft.deliveryLatitude) : null, longitude: draft.deliveryLongitude ? Number(draft.deliveryLongitude) : null, window_starts_at: toApiDateTime(draft.deliveryDate, draft.deliveryTimeFrom), window_ends_at: toApiDateTime(draft.deliveryDateTo || draft.deliveryDate, draft.deliveryTimeTo || draft.deliveryTimeFrom) },
  ],
  storage_start_date: toApiDate(draft.deliveryDate || draft.warehouseStartDate),
  storage_end_date: draft.warehouseIsOngoing ? null : toApiDate(draft.deliveryDateTo || draft.warehouseEndDate || draft.deliveryDate),
  is_storage_ongoing: draft.warehouseIsOngoing,
  handling_requirements: draft.loadingEquipment,
  handling_equipment: draft.warehouseEquipment,
  // The range comes from the Cargo step's "Temperature controlled" block, the same one every other
  // transport type uses - the warehouse-specific pair it read before is never filled in on a new
  // request, so a stated range was silently dropped.
  temperature_min: draft.temperatureControlled && draft.temperatureMin ? Number(draft.temperatureMin) : null,
  temperature_max: draft.temperatureControlled && draft.temperatureMax ? Number(draft.temperatureMax) : null,
  is_fragile: draft.warehouseFragile,
  requires_adr: draft.requiresAdr,
  requires_food_grade: draft.warehouseFoodPharma,
  requires_customs_bonded: draft.warehouseRequiresCustomsBonded,
  requires_racking: draft.warehouseRequiresRacking,
  insurance_required: draft.warehouseRequiresInsurance,
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
