import type { LucideIcon } from 'lucide-react';
import {
  CalendarClock,
  CalendarDays,
  Car,
  Coins,
  Flag,
  FileText,
  Hash,
  Layers,
  ListPlus,
  MapPin,
  Ruler,
  Scale,
  ShieldCheck,
  StickyNote,
  Tag,
  Thermometer,
  Truck,
  UsersRound,
} from 'lucide-react';
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
  icon: LucideIcon;
};

const toDisplayDate = (isoDate: string): string => {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : isoDate;
};

export const buildScanFieldRows = (result: LoadScanResult): ScanFieldRow[] => {
  const rows: ScanFieldRow[] = [];

  if (result.title) {
    rows.push({ key: 'title', label: 'Title', value: result.title, patch: { cargoTitle: result.title }, icon: Hash });
  }

  const goodsType = result.goodsType || result.cargoType;
  if (goodsType) {
    rows.push({ key: 'goodsType', label: 'Goods type', value: goodsType, patch: { goodsType }, icon: Tag });
  }

  if (result.weightKg) {
    rows.push({
      key: 'weight',
      label: 'Weight',
      value: `${result.weightKg} kg`,
      patch: { weightKg: String(result.weightKg / 1000) },
      icon: Scale,
    });
  }

  if (result.pallets) {
    rows.push({
      key: 'pallets',
      label: 'Pallets / units',
      value: String(result.pallets),
      patch: { pallets: String(result.pallets) },
      icon: Layers,
    });
  }

  if (result.bodyType) {
    rows.push({
      key: 'bodyType',
      label: 'Trailer / body type',
      value: result.bodyType,
      patch: { bodyTypes: [result.bodyType] },
      icon: Truck,
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
      icon: Ruler,
    });
  }

  if (result.vehicleType) rows.push({ key: 'vehicleType', label: 'Vehicle', value: result.vehicleType, patch: { vehicleType: result.vehicleType }, icon: Car });

  if (result.pickupCity || result.pickupCountryCode) {
    rows.push({
      key: 'pickup',
      label: 'Pickup',
      value: [result.pickupCity, result.pickupCountryCode].filter(Boolean).join(', '),
      patch: {
        ...(result.pickupCity ? { pickupCity: result.pickupCity } : {}),
        ...(result.pickupCountryCode ? { pickupCountry: result.pickupCountryCode } : {}),
      },
      icon: MapPin,
    });
  }

  if (result.pickupDate) {
    rows.push({
      key: 'pickupDate',
      label: 'Pickup date',
      value: toDisplayDate(result.pickupDate),
      patch: { pickupDate: toDisplayDate(result.pickupDate) },
      icon: CalendarDays,
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
      icon: Flag,
    });
  }

  if (result.deliveryDate) {
    rows.push({
      key: 'deliveryDate',
      label: 'Delivery date',
      value: toDisplayDate(result.deliveryDate),
      patch: { deliveryDate: toDisplayDate(result.deliveryDate) },
      icon: CalendarClock,
    });
  }

  if (result.budget) {
    rows.push({
      key: 'budget',
      label: 'Budget',
      value: `${result.budget} ${result.currency || 'EUR'}`,
      patch: { budget: String(result.budget), freightCurrency: result.currency || 'EUR' },
      icon: Coins,
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
      icon: FileText,
    });
  }

  if (result.temperatureMin !== null || result.temperatureMax !== null) {
    rows.push({
      key: 'temperature',
      label: 'Temperature',
      value: `${result.temperatureMin ?? '—'} °C to ${result.temperatureMax ?? '—'} °C`,
      patch: { temperatureControlled: true, temperatureMin: result.temperatureMin == null ? '' : String(result.temperatureMin), temperatureMax: result.temperatureMax == null ? '' : String(result.temperatureMax) },
      icon: Thermometer,
    });
  }

  const requirementLabels = [result.requiresAdr ? 'ADR' : '', result.requiresTailLift ? 'Tail lift' : '', result.isUrgent ? 'Urgent' : ''].filter(Boolean);
  if (requirementLabels.length > 0) rows.push({ key: 'requirements', label: 'Requirements', value: requirementLabels.join(' · '), patch: { requiresAdr: result.requiresAdr, requiresTailLift: result.requiresTailLift, urgent: result.isUrgent }, icon: ShieldCheck });

  if (result.contactName || result.contactPhone || result.contactEmail) {
    rows.push({
      key: 'contact',
      label: 'Contact',
      value: [result.contactName, result.contactPhone, result.contactEmail].filter(Boolean).join(' · '),
      patch: { contactName: result.contactName, contactPhone: result.contactPhone, contactEmail: result.contactEmail },
      icon: UsersRound,
    });
  }

  // Custom items the user explicitly asked to track as their own entry (rather than folded
  // into notes) get their own card, but their text still rides along inside the "notes" patch
  // below since the real posting form has no dedicated slot for arbitrary custom fields.
  const customFields = (result.customFields || []).filter((item) => item.label && item.value);
  const bookingNote = result.bookingReference ? `Booking ref: ${result.bookingReference}` : '';
  const combinedNotes = [result.notes, bookingNote, ...customFields.map((item) => `${item.label}: ${item.value}`)]
    .filter(Boolean)
    .join(' ')
    .trim();

  customFields.forEach((item, index) => {
    const isLastWithoutNotesRow = index === customFields.length - 1 && !result.notes && !bookingNote;
    rows.push({
      key: `custom-${index}`,
      label: item.label,
      value: item.value,
      patch: isLastWithoutNotesRow ? { notes: combinedNotes } : {},
      icon: ListPlus,
    });
  });

  const displayNotes = [result.notes, bookingNote].filter(Boolean).join(' ').trim();
  if (displayNotes) {
    rows.push({ key: 'notes', label: 'Notes', value: displayNotes, patch: { notes: combinedNotes }, icon: StickyNote });
  }

  return rows;
};
