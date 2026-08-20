import { LoadScanResult } from '../../services/api';

export type ScanFieldPatch = Partial<{
  cargoTitle: string;
  goodsType: string;
  weightKg: string;
  pallets: string;
  bodyTypes: string[];
  lengthM: string;
  widthM: string;
  heightM: string;
  volumeM3: string;
  vehicleType: string;
  pickupCity: string;
  pickupCountry: string;
  pickupDate: string;
  deliveryCity: string;
  deliveryCountry: string;
  deliveryDate: string;
  budget: string;
  freightCurrency: string;
  incoterm: string;
  paymentDeferred: boolean;
  paymentDueDays: string;
  temperatureControlled: boolean;
  temperatureMin: string;
  temperatureMax: string;
  requiresAdr: boolean;
  requiresTailLift: boolean;
  urgent: boolean;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
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

  if (result.lengthM || result.widthM || result.heightM || result.volumeM3) {
    rows.push({
      key: 'dimensions',
      label: 'Dimensions / volume',
      value: [result.lengthM && `L ${result.lengthM} m`, result.widthM && `W ${result.widthM} m`, result.heightM && `H ${result.heightM} m`, result.volumeM3 && `${result.volumeM3} m³`].filter(Boolean).join(' · '),
      patch: {
        ...(result.lengthM ? { lengthM: String(result.lengthM) } : {}),
        ...(result.widthM ? { widthM: String(result.widthM) } : {}),
        ...(result.heightM ? { heightM: String(result.heightM) } : {}),
        ...(result.volumeM3 ? { volumeM3: String(result.volumeM3) } : {}),
      },
    });
  }

  if (result.vehicleType) rows.push({ key: 'vehicleType', label: 'Vehicle', value: result.vehicleType, patch: { vehicleType: result.vehicleType } });

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

  if (result.incoterm || result.paymentDueDays) {
    rows.push({
      key: 'terms',
      label: 'Commercial terms',
      value: [result.incoterm, result.paymentDueDays ? `${result.paymentDueDays} days` : ''].filter(Boolean).join(' · '),
      patch: {
        ...(result.incoterm ? { incoterm: result.incoterm } : {}),
        ...(result.paymentDueDays ? { paymentDeferred: true, paymentDueDays: String(result.paymentDueDays) } : {}),
      },
    });
  }

  if (result.temperatureMin !== null || result.temperatureMax !== null) {
    rows.push({
      key: 'temperature',
      label: 'Temperature',
      value: `${result.temperatureMin ?? '—'} °C to ${result.temperatureMax ?? '—'} °C`,
      patch: { temperatureControlled: true, temperatureMin: result.temperatureMin == null ? '' : String(result.temperatureMin), temperatureMax: result.temperatureMax == null ? '' : String(result.temperatureMax) },
    });
  }

  const requirementLabels = [result.requiresAdr ? 'ADR' : '', result.requiresTailLift ? 'Tail lift' : '', result.isUrgent ? 'Urgent' : ''].filter(Boolean);
  if (requirementLabels.length > 0) rows.push({ key: 'requirements', label: 'Requirements', value: requirementLabels.join(' · '), patch: { requiresAdr: result.requiresAdr, requiresTailLift: result.requiresTailLift, urgent: result.isUrgent } });

  if (result.contactName || result.contactPhone || result.contactEmail) {
    rows.push({
      key: 'contact',
      label: 'Contact',
      value: [result.contactName, result.contactPhone, result.contactEmail].filter(Boolean).join(' · '),
      patch: { contactName: result.contactName, contactPhone: result.contactPhone, contactEmail: result.contactEmail },
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
