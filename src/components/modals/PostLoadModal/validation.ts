import { LoadDraft, StepId } from './types';

/**
 * Turns API validation errors into something the person filling in the form can act on.
 *
 * The API answers in payload terms ("The stops.0.window_starts_at field must be a valid date"),
 * which names neither a field on screen nor the step it lives on. Every payload key the post-load
 * form can trip is mapped here to the label above the input and to the draft fields that feed it,
 * so the same table both rewrites the message and tells the form which inputs to outline in red.
 */

type FieldEntry = {
  labelKey: string;
  label: string;
  fields: Array<keyof LoadDraft>;
};

// Applied to the wrapper around a field, so one class covers every control shape the form uses -
// plain inputs, selects, the flatpickr date input and the autocomplete fields that wrap an input.
export const INVALID_FIELD_CLASS = 'rounded-xl [&>div>button]:border-rose-500 [&_input]:border-rose-500 [&_input]:bg-rose-50/70 dark:[&_input]:border-rose-500 dark:[&_input]:bg-rose-950/20 [&_select]:border-rose-500 [&_select]:bg-rose-50/70 dark:[&_select]:border-rose-500 dark:[&_select]:bg-rose-950/20 [&_textarea]:border-rose-500';

const TOP_LEVEL_FIELDS: Record<string, FieldEntry> = {
  title: { labelKey: 'postLoadModal.loadTitleLabel', label: 'Load title', fields: ['loadTitle'] },
  cargo_type: { labelKey: 'postLoadModal.cargoModel', label: 'Shipment type', fields: ['cargoType'] },
  goods_type: { labelKey: 'postLoadModal.cargoName', label: 'Type of goods', fields: ['goodsType'] },
  weight_kg: { labelKey: 'postLoadModal.weight', label: 'Weight (t)', fields: ['weightKg'] },
  pallets: { labelKey: 'postLoadModal.unitCount', label: 'Number of pieces / units', fields: ['pallets'] },
  volume_m3: { labelKey: 'postLoadModal.volume', label: 'CBM (m³)', fields: ['volumeM3'] },
  length_m: { labelKey: 'postLoadModal.length', label: 'Length (m)', fields: ['lengthM'] },
  width_m: { labelKey: 'postLoadModal.width', label: 'Width (m)', fields: ['widthM'] },
  height_m: { labelKey: 'postLoadModal.height', label: 'Height (m)', fields: ['heightM'] },
  declared_value: { labelKey: 'postLoadModal.declaredValue', label: 'Value of shipment', fields: ['declaredValue'] },
  transit_days: { labelKey: 'postLoadModal.transitTime', label: 'Transit time', fields: ['transitDays'] },
  budget: { labelKey: 'postLoadModal.targetPrice', label: 'Target price', fields: ['budget'] },
  currency: { labelKey: 'postLoadModal.currency', label: 'Currency', fields: ['freightCurrency'] },
  payment_due_days: { labelKey: 'postLoadModal.paymentDueDays', label: 'Payment due days', fields: ['paymentDueDays'] },
  temperature_min: { labelKey: 'postLoadModal.temperatureMin', label: 'Min. temperature', fields: ['temperatureMin'] },
  temperature_max: { labelKey: 'postLoadModal.temperatureMax', label: 'Max. temperature', fields: ['temperatureMax'] },
  storage_type: { labelKey: 'postLoadModal.warehouseStorageType', label: 'Storage type', fields: ['warehouseStorageType'] },
  storage_start_date: { labelKey: 'postLoadModal.warehouseStartDate', label: 'Storage start date', fields: ['deliveryDate'] },
  storage_end_date: { labelKey: 'postLoadModal.warehouseEndDate', label: 'Storage end date', fields: ['deliveryDateTo'] },
  warehouse_city: { labelKey: 'postLoadModal.deliveryCity', label: 'Warehouse city', fields: ['deliveryCity'] },
  warehouse_country_code: { labelKey: 'postLoadModal.country', label: 'Warehouse country', fields: ['deliveryCountry'] },
  warehouse_address: { labelKey: 'postLoadModal.warehousePreferredArea', label: 'Preferred area', fields: ['deliveryAddress'] },
  warehouse_radius_km: { labelKey: 'postLoadModal.areaRadius', label: 'Radius', fields: ['deliveryRadiusKm'] },
  rate_unit: { labelKey: 'postLoadModal.warehouseRateUnit', label: 'Rate unit', fields: ['warehouseRateUnit'] },
};

// The same stop keys mean pickup or delivery depending on the index, so each one carries both.
const STOP_FIELDS: Record<string, { labelKey: string; label: string; pickup: Array<keyof LoadDraft>; delivery: Array<keyof LoadDraft> }> = {
  city: { labelKey: 'postLoadModal.pickupCity', label: 'City', pickup: ['pickupCity'], delivery: ['deliveryCity'] },
  country_code: { labelKey: 'postLoadModal.country', label: 'Country', pickup: ['pickupCountry'], delivery: ['deliveryCountry'] },
  postal_code: { labelKey: 'postLoadModal.pickupPostalCode', label: 'Postal code', pickup: ['pickupPostalCode'], delivery: ['deliveryPostalCode'] },
  address: { labelKey: 'postLoadModal.address', label: 'Address', pickup: ['pickupAddress'], delivery: ['deliveryAddress'] },
  port: { labelKey: 'postLoadModal.portToPort', label: 'Port', pickup: ['pickupPort'], delivery: ['deliveryPort'] },
  airport: { labelKey: 'postLoadModal.airportPlaceType', label: 'Airport', pickup: ['pickupAirport'], delivery: ['deliveryAirport'] },
  place_type: { labelKey: 'postLoadModal.pickupPlaceType', label: 'Place type', pickup: ['pickupPlaceType'], delivery: ['deliveryPlaceType'] },
  latitude: { labelKey: 'postLoadModal.address', label: 'Address', pickup: ['pickupAddress'], delivery: ['deliveryAddress'] },
  longitude: { labelKey: 'postLoadModal.address', label: 'Address', pickup: ['pickupAddress'], delivery: ['deliveryAddress'] },
  window_starts_at: { labelKey: 'postLoadModal.dateTimeFrom', label: 'Date and time from', pickup: ['pickupDate', 'pickupTimeFrom'], delivery: ['deliveryDate', 'deliveryTimeFrom'] },
  window_ends_at: { labelKey: 'postLoadModal.dateTimeTo', label: 'Date and time to', pickup: ['pickupDateTo', 'pickupTimeTo'], delivery: ['deliveryDateTo', 'deliveryTimeTo'] },
};

type Translate = (key: string, fallback: string) => string;

const stopBlockLabel = (u: Translate, index: number) =>
  index === 0 ? u('postLoadModal.pickupBlock', 'Pickup') : u('postLoadModal.deliveryBlock', 'Delivery');

const resolveKey = (u: Translate, key: string): { label: string; fields: Array<keyof LoadDraft> } | null => {
  const stopMatch = /^stops\.(\d+)\.(.+)$/.exec(key);
  if (stopMatch) {
    const entry = STOP_FIELDS[stopMatch[2]];
    if (!entry) return null;
    const index = Number(stopMatch[1]);
    return {
      label: `${u(entry.labelKey, entry.label)} (${stopBlockLabel(u, index)})`,
      fields: index === 0 ? entry.pickup : entry.delivery,
    };
  }

  // Array payloads (hs_codes.0.code, contact.email, ...) are named by their root, which is the
  // part that matches something on screen anyway.
  const entry = TOP_LEVEL_FIELDS[key] || TOP_LEVEL_FIELDS[key.split('.')[0]];
  return entry ? { label: u(entry.labelKey, entry.label), fields: entry.fields } : null;
};

// Which step a field lives on, so a failed submit can open the step holding the first problem
// instead of leaving the message pointing at a field the user cannot see.
const FIELD_STEPS: Partial<Record<keyof LoadDraft, StepId>> = {
  pickupPlaceType: 'route', pickupCountry: 'route', pickupCity: 'route', pickupPostalCode: 'route', pickupAddress: 'route',
  pickupPort: 'route', pickupAirport: 'route', pickupDate: 'route', pickupDateTo: 'route', pickupTimeFrom: 'route', pickupTimeTo: 'route',
  deliveryPlaceType: 'route', deliveryCountry: 'route', deliveryCity: 'route', deliveryPostalCode: 'route', deliveryAddress: 'route',
  deliveryPort: 'route', deliveryAirport: 'route', deliveryDate: 'route', deliveryDateTo: 'route', deliveryTimeFrom: 'route', deliveryTimeTo: 'route',
  deliveryRadiusKm: 'route', transitDays: 'route',
  loadTitle: 'cargo', cargoType: 'cargo', goodsType: 'cargo', weightKg: 'cargo', pallets: 'cargo', volumeM3: 'cargo',
  lengthM: 'cargo', widthM: 'cargo', heightM: 'cargo', declaredValue: 'cargo', temperatureMin: 'cargo', temperatureMax: 'cargo',
  // Equipment and the storage type picker now sit in the third column of the Details & Terms step.
  warehouseStorageType: 'cargo', warehouseTemperatureMin: 'cargo', warehouseTemperatureMax: 'cargo',
  vehicleType: 'cargo', bodyTypes: 'cargo',
  // Everything about price moved onto the Payment & Contact step.
  budget: 'contact', freightCurrency: 'contact', paymentDueDays: 'contact', warehouseRateUnit: 'contact',
  incoterm: 'contact',
  contactName: 'contact', contactEmail: 'contact', contactPhone: 'contact',
};

export const stepForField = (field: keyof LoadDraft): StepId | null => FIELD_STEPS[field] || null;

// API messages arrive in English whatever the interface language is, so the handful of rules the
// form can realistically break are matched back to a translated sentence. Anything unrecognised
// falls through to the API's own wording with the field path swapped for its label.
const REASONS: Array<{ test: RegExp; key: string; fallback: string }> = [
  { test: /must be a valid date/i, key: 'postLoadModal.invalidDate', fallback: 'Enter a date as dd.mm.yyyy.' },
  { test: /is required|must be present/i, key: 'postLoadModal.requiredField', fallback: 'This field is required.' },
  { test: /must be a number|must be an integer/i, key: 'postLoadModal.invalidNumber', fallback: 'Enter a number.' },
  { test: /(not|may not) be greater than/i, key: 'postLoadModal.valueTooLarge', fallback: 'The value is too large.' },
  { test: /must be at least|(not|may not) be less than/i, key: 'postLoadModal.valueTooSmall', fallback: 'The value is too small.' },
  { test: /must be between/i, key: 'postLoadModal.valueOutOfRange', fallback: 'The value is out of range.' },
];

export type ValidationIssues = { message: string; fields: Array<keyof LoadDraft> };

/**
 * Rewrites the API's first validation message with real field names and collects every draft
 * field the API complained about, so they can all be outlined at once.
 */
export const describeApiErrors = (u: Translate, errors: Record<string, string[]>): ValidationIssues => {
  const fields: Array<keyof LoadDraft> = [];
  let message = '';

  for (const [key, messages] of Object.entries(errors)) {
    const resolved = resolveKey(u, key);
    if (resolved) fields.push(...resolved.fields);
    if (message) continue;
    const first = messages.find(Boolean);
    if (!first) continue;
    const reason = REASONS.find((candidate) => candidate.test.test(first));
    if (resolved && reason) {
      message = `${resolved.label}: ${u(reason.key, reason.fallback)}`;
    } else if (resolved) {
      // Laravel names the attribute by its raw path, both dotted and space-separated depending on
      // the rule, so both spellings are swapped for the on-screen label.
      message = first.split(key).join(resolved.label).split(key.replace(/[._]/g, ' ')).join(resolved.label);
    } else {
      message = first;
    }
  }

  return { message, fields: [...new Set(fields)] };
};

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const parseFormDate = (value: string): Date | null => {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, day, month, year] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.getDate() === Number(day) && date.getMonth() === Number(month) - 1 ? date : null;
};

/**
 * Catches what the form itself can tell is wrong before the request goes out - the API only ever
 * sees the combined "2026-08-26 33:33" timestamp and answers with a generic "must be a valid
 * date", which cannot point at the time field that actually holds the impossible value.
 */
export const validateDraft = (u: Translate, draft: LoadDraft, mode: 'publish' | 'draft' = 'publish'): ValidationIssues | null => {
  const isWarehouse = draft.transportType === 'warehouse';
  const fields: Array<keyof LoadDraft> = [];
  let message = '';

  const fail = (nextMessage: string, ...invalid: Array<keyof LoadDraft>) => {
    fields.push(...invalid);
    if (!message) message = nextMessage;
  };

  const timeFields: Array<[keyof LoadDraft, string, string]> = [
    ['pickupTimeFrom', 'postLoadModal.pickupTimeFrom', 'Time from'],
    ['pickupTimeTo', 'postLoadModal.pickupTimeTo', 'Time to'],
    ['deliveryTimeFrom', 'postLoadModal.deliveryTimeFrom', 'Time from'],
    ['deliveryTimeTo', 'postLoadModal.deliveryTimeTo', 'Time to'],
  ];
  for (const [field, labelKey, labelFallback] of timeFields) {
    const value = String(draft[field] || '').trim();
    if (value && !TIME_PATTERN.test(value)) {
      fail(`${u(labelKey, labelFallback)}: ${u('postLoadModal.invalidTime', 'Enter a time between 00:00 and 23:59.')}`, field);
    }
  }

  const dateFields: Array<[keyof LoadDraft, string, string]> = [
    ['pickupDate', 'postLoadModal.pickupDate', 'Date from'],
    ['pickupDateTo', 'postLoadModal.pickupDateTo', 'Date to'],
    ['deliveryDate', 'postLoadModal.deliveryDate', 'Date from'],
    ['deliveryDateTo', 'postLoadModal.deliveryDateTo', 'Date to'],
  ];
  for (const [field, labelKey, labelFallback] of dateFields) {
    const value = String(draft[field] || '').trim();
    if (value && !parseFormDate(value)) {
      fail(`${u(labelKey, labelFallback)}: ${u('postLoadModal.invalidDate', 'Enter a date as dd.mm.yyyy.')}`, field);
    }
  }

  const ranges: Array<[keyof LoadDraft, keyof LoadDraft, string]> = [
    ['pickupDate', 'pickupDateTo', u('postLoadModal.pickupBlock', 'Pickup')],
    ['deliveryDate', 'deliveryDateTo', isWarehouse ? u('postLoadModal.warehousePreferredLocation', 'Preferred warehouse location') : u('postLoadModal.deliveryBlock', 'Delivery')],
  ];
  for (const [fromField, toField, block] of ranges) {
    const from = parseFormDate(String(draft[fromField] || ''));
    const to = parseFormDate(String(draft[toField] || ''));
    if (from && to && to < from) {
      fail(`${block}: ${u('postLoadModal.dateRangeReversed', 'The end date cannot be before the start date.')}`, fromField, toField);
    }
  }

  // A draft is allowed to be half-finished - only what is actually malformed blocks saving it.
  if (mode === 'draft') return message ? { message, fields: [...new Set(fields)] } : null;

  if (!String(draft.loadTitle || '').trim()) {
    fail(`${u('postLoadModal.loadTitleLabel', 'Load title')}: ${u('postLoadModal.requiredField', 'This field is required.')}`, 'loadTitle');
  }
  if (!String(draft.pickupCity || '').trim()) {
    fail(`${u('postLoadModal.pickupCity', 'City')} (${u('postLoadModal.pickupBlock', 'Pickup')}): ${u('postLoadModal.requiredField', 'This field is required.')}`, 'pickupCity');
  }
  if (!String(draft.deliveryCity || '').trim()) {
    fail(`${u('postLoadModal.deliveryCity', 'City')} (${isWarehouse ? u('postLoadModal.warehousePreferredLocation', 'Preferred warehouse location') : u('postLoadModal.deliveryBlock', 'Delivery')}): ${u('postLoadModal.requiredField', 'This field is required.')}`, 'deliveryCity');
  }
  if (!isWarehouse && !String(draft.weightKg || '').trim()) {
    fail(`${u('postLoadModal.weight', 'Weight')}: ${u('postLoadModal.requiredField', 'This field is required.')}`, 'weightKg');
  }
  if (isWarehouse && !String(draft.deliveryDate || '').trim()) {
    fail(`${u('postLoadModal.warehouseStartDate', 'Storage start date')}: ${u('postLoadModal.requiredField', 'This field is required.')}`, 'deliveryDate');
  }

  return message ? { message, fields: [...new Set(fields)] } : null;
};
