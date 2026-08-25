import type { LucideIcon } from 'lucide-react';
import {
  Apple,
  Banknote,
  Barcode,
  Boxes,
  CalendarClock,
  CalendarDays,
  Camera,
  Car,
  ClipboardList,
  Coins,
  Cpu,
  Diamond,
  Droplet,
  FileCheck2,
  Flag,
  FileText,
  FlaskConical,
  Footprints,
  Forklift,
  Gem,
  Handshake,
  Hash,
  Layers,
  ListChecks,
  ListPlus,
  MapPin,
  Milestone,
  Package,
  Palette,
  PawPrint,
  Recycle,
  Route,
  Ruler,
  Scale,
  Scissors,
  ShieldCheck,
  Shirt,
  Sprout,
  StickyNote,
  Sword,
  Tag,
  Thermometer,
  TreePine,
  Truck,
  UsersRound,
  Wrench,
} from 'lucide-react';
import { api, HsCodeMatch, LoadScanResult } from '../../services/api';
import { customerOptionFromRecord, type CustomerOption } from '../customer/CustomerSelect';

export type ScanFieldPatch = Partial<{
  consignee: CustomerOption;
  bookingReference: string;
  loadTitle: string;
  transportType: 'road' | 'air' | 'sea';
  goodsType: string;
  hsCodes: LoadScanResult['hsCodes'];
  weightKg: string;
  pallets: string;
  bodyTypes: string[];
  lengthM: string;
  widthM: string;
  heightM: string;
  volumeM3: string;
  vehicleType: string;
  loadingEquipment: string[];
  characteristics: string[];
  specialRequirements: string[];
  transportMode: string;
  deliveryProof: string;
  mustBeTrackable: boolean;
  pickupCity: string;
  pickupPostalCode: string;
  pickupCountry: string;
  pickupAddress: string;
  pickupLatitude: string;
  pickupLongitude: string;
  pickupDate: string;
  pickupDateTo: string;
  pickupTimeFrom: string;
  pickupTimeTo: string;
  deliveryCity: string;
  deliveryPostalCode: string;
  deliveryCountry: string;
  deliveryAddress: string;
  deliveryLatitude: string;
  deliveryLongitude: string;
  deliveryDate: string;
  deliveryDateTo: string;
  deliveryTimeFrom: string;
  deliveryTimeTo: string;
  budget: string;
  freightCurrency: string;
  receivePriceProposals: boolean;
  declaredValue: string;
  shipmentValueCurrency: string;
  incoterm: string;
  paymentDeferred: boolean;
  paymentDueDays: string;
  temperatureControlled: boolean;
  temperatureMin: string;
  temperatureMax: string;
  requiresAdr: boolean;
  requiresTailLift: boolean;
  tollRoadsIncluded: boolean;
  ferryIncluded: boolean;
  cmrRequired: boolean;
  palletExchangeRequired: boolean;
  customsRequired: boolean;
  insuranceRequired: boolean;
  certificationRequired: boolean;
  inspectionServicesRequired: boolean;
  urgent: boolean;
  contactName: string;
  contactPhone: string;
  contactMobile: string;
  contactFax: string;
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

// hs_codes (each entry carrying its own catalog-sourced description/category) is the source of
// truth for what a load is carrying - goods_type (backend column, max 100 chars) only needs to
// hold the codes themselves, never the catalog's full category names (those can run well past 100
// chars combined and blow the column's validation, which is exactly the bug this replaced). Falls
// back to the given fallback (e.g. the AI's general category guess, or 'General') only while no HS
// code has been picked yet. Shared by the single-load and bulk-import payload builders.
export const deriveGoodsTypeCode = (hsCodes: HsCodeMatch[] | undefined, fallback: string): string => {
  if (!hsCodes || hsCodes.length === 0) return fallback;
  const codes = Array.from(new Set(hsCodes.map((item) => item.code).filter(Boolean)));
  return codes.join(', ').slice(0, 100);
};

// The human-readable counterpart to deriveGoodsTypeCode, for on-screen display only (e.g. the
// review step's "Cargo" summary row) - resolves each chosen code's catalog name on the frontend.
// Never write this back into goods_type; it's not length-bounded like the DB column is.
export const deriveGoodsTypeName = (hsCodes: HsCodeMatch[] | undefined, fallback: string): string => {
  if (!hsCodes || hsCodes.length === 0) return fallback;
  const categories = Array.from(new Set(
    hsCodes.map((item) => item.headingName || item.chapterName || item.description).filter(Boolean)
  ));
  return categories.join(', ');
};

// The standard 21 WCO HS sections, in chapter order, each mapped to a representative icon so an
// HS match's chapterCode ("01".."99") can be shown with a quick visual category cue.
const HS_SECTION_ICONS: Array<{ toChapter: number; icon: LucideIcon }> = [
  { toChapter: 5, icon: PawPrint }, // I: live animals, animal products
  { toChapter: 14, icon: Sprout }, // II: vegetable products
  { toChapter: 15, icon: Droplet }, // III: animal/vegetable fats and oils
  { toChapter: 24, icon: Apple }, // IV: foodstuffs, beverages, tobacco
  { toChapter: 27, icon: Gem }, // V: mineral products
  { toChapter: 38, icon: FlaskConical }, // VI: chemicals
  { toChapter: 40, icon: Recycle }, // VII: plastics and rubber
  { toChapter: 43, icon: Scissors }, // VIII: hides, skins, leather, furskins
  { toChapter: 46, icon: TreePine }, // IX: wood and articles of wood
  { toChapter: 49, icon: FileText }, // X: pulp, paper
  { toChapter: 63, icon: Shirt }, // XI: textiles
  { toChapter: 67, icon: Footprints }, // XII: footwear, headgear
  { toChapter: 70, icon: Layers }, // XIII: stone, plaster, ceramic, glass
  { toChapter: 71, icon: Diamond }, // XIV: pearls, precious stones, jewelry
  { toChapter: 83, icon: Wrench }, // XV: base metals
  { toChapter: 85, icon: Cpu }, // XVI: machinery, electrical equipment
  { toChapter: 89, icon: Truck }, // XVII: vehicles, aircraft, vessels
  { toChapter: 92, icon: Camera }, // XVIII: optical, medical, instruments
  { toChapter: 93, icon: Sword }, // XIX: arms and ammunition
  { toChapter: 96, icon: Boxes }, // XX: miscellaneous manufactured articles
  { toChapter: 99, icon: Palette }, // XXI: art, antiques
];

// Shared between the post-load form's editable HS chips and the LenaAI canvas's read-only preview
// chips, so a code shows the same category icon everywhere it's rendered.
export const hsSectionIcon = (chapterCode?: string): LucideIcon => {
  const chapter = Number(chapterCode);
  if (!Number.isFinite(chapter)) return Package;
  return HS_SECTION_ICONS.find((section) => chapter <= section.toChapter)?.icon ?? Package;
};

// Only the bare code needs to be persisted per HS entry - description/confidence/category names
// are all resolvable from the hs_code_catalog table (the "šifranik") on demand, so storing them
// too would just duplicate reference data across every load that shares a code.
export const stripHsCodesForPayload = (hsCodes: HsCodeMatch[]): Array<{ code: string }> =>
  hsCodes.map((item) => ({ code: item.code }));

// The read-side counterpart to stripHsCodesForPayload: re-resolves a set of bare (or already-full)
// HS code entries back to their full catalog details in one batched request, for entries missing a
// description - used when opening an existing load for editing, so the chip UI can show category
// names/icons without those ever having been stored on the load itself.
export const resolveHsCodes = async (hsCodes: HsCodeMatch[]): Promise<HsCodeMatch[]> => {
  const needsResolve = hsCodes.filter((item) => !item.description && item.code);
  if (needsResolve.length === 0) return hsCodes;

  const resolved = await api.hsCodes.bulk(needsResolve.map((item) => item.code));
  const byCode = new Map(resolved.data.map((item) => [item.code, item]));

  return hsCodes.map((item) => byCode.get(item.code) || item);
};

const TRANSPORT_TYPE_LABELS: Record<string, string> = { road: 'Road', air: 'Air', sea: 'Sea' };
const PRICE_TERMS_LABELS: Record<string, string> = { fixed: 'Fixed price', negotiable: 'Open to offers' };

export const buildScanFieldRows = (result: LoadScanResult): ScanFieldRow[] => {
  const rows: ScanFieldRow[] = [];

  if (result.consignee?.id) {
    const consignee = customerOptionFromRecord(result.consignee);
    rows.push({
      key: 'consignee',
      label: 'Consignee',
      value: consignee.text,
      patch: { consignee },
      icon: UsersRound,
    });
  }

  if (result.title) {
    rows.push({ key: 'title', label: 'Title', value: result.title, patch: { loadTitle: result.title }, icon: Hash });
  }

  if (result.transportType === 'road' || result.transportType === 'air' || result.transportType === 'sea') {
    rows.push({
      key: 'transportType',
      label: 'Transport type',
      value: TRANSPORT_TYPE_LABELS[result.transportType] || result.transportType,
      patch: { transportType: result.transportType },
      icon: Route,
    });
  }

  const goodsType = result.goodsType || result.cargoType;
  if (goodsType) {
    rows.push({ key: 'goodsType', label: 'Goods type', value: goodsType, patch: { goodsType }, icon: Tag });
  }

  if (result.hsCodes?.length) {
    rows.push({
      key: 'hsCodes',
      label: 'HS code',
      value: result.hsCodes.map((item) => `${item.code} - ${item.description}`).join('\n'),
      patch: { hsCodes: result.hsCodes },
      icon: Barcode,
    });
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

  if (result.loadingEquipment) {
    rows.push({
      key: 'loadingEquipment',
      label: 'Loading equipment',
      value: result.loadingEquipment,
      patch: { loadingEquipment: [result.loadingEquipment] },
      icon: Forklift,
    });
  }

  if (result.characteristics) {
    rows.push({ key: 'characteristics', label: 'Characteristics', value: result.characteristics, patch: { characteristics: [result.characteristics] }, icon: ClipboardList });
  }

  const specialRequirements = result.specialRequirements || [];
  if (specialRequirements.length > 0) {
    rows.push({
      key: 'specialRequirements',
      label: 'Special requirements',
      value: specialRequirements.join(' · '),
      patch: { specialRequirements },
      icon: ListChecks,
    });
  }

  if (result.transportMode) {
    rows.push({ key: 'transportMode', label: 'Transport mode', value: result.transportMode, patch: { transportMode: result.transportMode }, icon: Milestone });
  }

  if (result.deliveryProof) {
    rows.push({ key: 'deliveryProof', label: 'Delivery proof', value: result.deliveryProof, patch: { deliveryProof: result.deliveryProof }, icon: FileCheck2 });
  }

  if (result.pickupCity || result.pickupPostalCode || result.pickupCountryCode || result.pickupAddress) {
    rows.push({
      key: 'pickup',
      label: 'Pickup',
      value: [result.pickupAddress, result.pickupPostalCode, result.pickupCity, result.pickupCountryCode].filter(Boolean).join(', '),
      patch: {
        ...(result.pickupCity ? { pickupCity: result.pickupCity } : {}),
        ...(result.pickupPostalCode ? { pickupPostalCode: result.pickupPostalCode } : {}),
        ...(result.pickupCountryCode ? { pickupCountry: result.pickupCountryCode } : {}),
        ...(result.pickupAddress ? { pickupAddress: result.pickupAddress } : {}),
        ...(result.pickupLatitude != null ? { pickupLatitude: String(result.pickupLatitude) } : {}),
        ...(result.pickupLongitude != null ? { pickupLongitude: String(result.pickupLongitude) } : {}),
      },
      icon: MapPin,
    });
  }

  if (result.pickupDate || result.pickupTimeFrom) {
    const dateRange = [toDisplayDate(result.pickupDate), result.pickupDateTo ? toDisplayDate(result.pickupDateTo) : ''].filter(Boolean).join(' - ');
    const timeRange = [result.pickupTimeFrom, result.pickupTimeTo].filter(Boolean).join(' - ');
    rows.push({
      key: 'pickupDate',
      label: 'Pickup date',
      value: [dateRange, timeRange].filter(Boolean).join(', '),
      patch: {
        ...(result.pickupDate ? { pickupDate: toDisplayDate(result.pickupDate) } : {}),
        ...(result.pickupDateTo ? { pickupDateTo: toDisplayDate(result.pickupDateTo) } : {}),
        ...(result.pickupTimeFrom ? { pickupTimeFrom: result.pickupTimeFrom } : {}),
        ...(result.pickupTimeTo ? { pickupTimeTo: result.pickupTimeTo } : {}),
      },
      icon: CalendarDays,
    });
  }

  if (result.deliveryCity || result.deliveryPostalCode || result.deliveryCountryCode || result.deliveryAddress) {
    rows.push({
      key: 'delivery',
      label: 'Delivery',
      value: [result.deliveryAddress, result.deliveryPostalCode, result.deliveryCity, result.deliveryCountryCode].filter(Boolean).join(', '),
      patch: {
        ...(result.deliveryCity ? { deliveryCity: result.deliveryCity } : {}),
        ...(result.deliveryPostalCode ? { deliveryPostalCode: result.deliveryPostalCode } : {}),
        ...(result.deliveryCountryCode ? { deliveryCountry: result.deliveryCountryCode } : {}),
        ...(result.deliveryAddress ? { deliveryAddress: result.deliveryAddress } : {}),
        ...(result.deliveryLatitude != null ? { deliveryLatitude: String(result.deliveryLatitude) } : {}),
        ...(result.deliveryLongitude != null ? { deliveryLongitude: String(result.deliveryLongitude) } : {}),
      },
      icon: Flag,
    });
  }

  if (result.deliveryDate || result.deliveryTimeFrom) {
    const dateRange = [toDisplayDate(result.deliveryDate), result.deliveryDateTo ? toDisplayDate(result.deliveryDateTo) : ''].filter(Boolean).join(' - ');
    const timeRange = [result.deliveryTimeFrom, result.deliveryTimeTo].filter(Boolean).join(' - ');
    rows.push({
      key: 'deliveryDate',
      label: 'Delivery date',
      value: [dateRange, timeRange].filter(Boolean).join(', '),
      patch: {
        ...(result.deliveryDate ? { deliveryDate: toDisplayDate(result.deliveryDate) } : {}),
        ...(result.deliveryDateTo ? { deliveryDateTo: toDisplayDate(result.deliveryDateTo) } : {}),
        ...(result.deliveryTimeFrom ? { deliveryTimeFrom: result.deliveryTimeFrom } : {}),
        ...(result.deliveryTimeTo ? { deliveryTimeTo: result.deliveryTimeTo } : {}),
      },
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

  if (result.priceTerms) {
    rows.push({
      key: 'priceTerms',
      label: 'Pricing',
      value: PRICE_TERMS_LABELS[result.priceTerms] || result.priceTerms,
      patch: { receivePriceProposals: result.priceTerms !== 'fixed' },
      icon: Handshake,
    });
  }

  if (result.declaredValue) {
    rows.push({
      key: 'declaredValue',
      label: 'Cargo value',
      value: `${result.declaredValue} ${result.declaredValueCurrency || result.currency || 'EUR'}`,
      patch: { declaredValue: String(result.declaredValue), shipmentValueCurrency: result.declaredValueCurrency || result.currency || 'EUR' },
      icon: Banknote,
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

  const requirementLabels = [
    result.requiresAdr ? (result.transportType === 'air' ? 'DGR' : 'ADR') : '',
    result.requiresTailLift ? 'Tail lift' : '',
    result.tollRoadsIncluded ? 'Toll roads' : '',
    result.ferryIncluded ? 'Ferry' : '',
    result.cmrRequired ? 'CMR' : '',
    result.palletExchangeRequired ? 'Pallet exchange' : '',
    result.customsRequired ? 'Customs' : '',
    result.insuranceRequired ? 'Insurance' : '',
    result.certificationRequired ? 'Certification' : '',
    result.inspectionServicesRequired ? 'Inspection services' : '',
    result.isUrgent ? 'Urgent' : '',
    result.requiresTracking ? 'Trackable' : '',
  ].filter(Boolean);
  if (requirementLabels.length > 0) {
    rows.push({
      key: 'requirements',
      label: 'Requirements',
      value: requirementLabels.join(' · '),
      patch: {
        ...(result.requiresAdr ? { requiresAdr: true } : {}),
        ...(result.requiresTailLift ? { requiresTailLift: true } : {}),
        ...(result.tollRoadsIncluded ? { tollRoadsIncluded: true } : {}),
        ...(result.ferryIncluded ? { ferryIncluded: true } : {}),
        ...(result.cmrRequired ? { cmrRequired: true } : {}),
        ...(result.palletExchangeRequired ? { palletExchangeRequired: true } : {}),
        ...(result.customsRequired ? { customsRequired: true } : {}),
        ...(result.insuranceRequired ? { insuranceRequired: true } : {}),
        ...(result.certificationRequired ? { certificationRequired: true } : {}),
        ...(result.inspectionServicesRequired ? { inspectionServicesRequired: true } : {}),
        ...(result.isUrgent ? { urgent: true } : {}),
        ...(result.requiresTracking ? { mustBeTrackable: true } : {}),
      },
      icon: ShieldCheck,
    });
  }

  if (result.contactName || result.contactPhone || result.contactMobile || result.contactFax || result.contactEmail) {
    rows.push({
      key: 'contact',
      label: 'Contact',
      value: [result.contactName, result.contactPhone, result.contactMobile, result.contactEmail].filter(Boolean).join(' · '),
      patch: {
        ...(result.contactName ? { contactName: result.contactName } : {}),
        ...(result.contactPhone ? { contactPhone: result.contactPhone } : {}),
        ...(result.contactMobile ? { contactMobile: result.contactMobile } : {}),
        ...(result.contactFax ? { contactFax: result.contactFax } : {}),
        ...(result.contactEmail ? { contactEmail: result.contactEmail } : {}),
      },
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
    rows.push({
      key: 'notes',
      label: 'Notes',
      value: displayNotes,
      patch: {
        notes: combinedNotes,
        ...(result.bookingReference ? { bookingReference: result.bookingReference } : {}),
      },
      icon: StickyNote,
    });
  }

  return rows;
};
