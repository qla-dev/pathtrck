import * as XLSX from 'xlsx';
import { api, BulkLoadRow, LoadScanResult } from '../services/api';
import { ScanFieldPatch } from '../components/modals/scanFieldRows';

export const LENA_LOAD_FILE_ACCEPT = 'image/*,.heic,.heif,application/pdf,.pdf,.xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export type LenaCanvasMode = 'new_load' | 'bulk';

export type LenaAttachment = {
  name: string;
  type: string;
  size: number;
  loadScan?: LoadScanResult;
  bulkRows?: BulkLoadRow[];
  // Where the original file actually lives in server storage (see MessageAttachmentController),
  // used to build the click-to-open/download link. Undefined while the upload is still in flight.
  path?: string;
};

const spreadsheetExtensions = ['.xlsx', '.xls', '.csv'];

export const isLenaSpreadsheet = (file: File) =>
  spreadsheetExtensions.some((extension) => file.name.toLowerCase().endsWith(extension))
  || file.type === 'text/csv'
  || file.type === 'application/vnd.ms-excel'
  || file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Extension fallback matters because some browsers/OSes (notably iPhone HEIC photos on Windows)
// report an empty or unrecognized File.type, which would otherwise fail the MIME-only check below.
const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif', '.tif', '.tiff', '.svg'];
// Subset a browser can actually decode and render inline (e.g. in a new tab) - HEIC/HEIF/TIFF
// mostly still can't, even though they're images, so those are treated as downloads instead.
const inlineViewableImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];

export const isLenaImageName = (name: string, type = '') => {
  const lowerName = name.toLowerCase();
  return type.startsWith('image/') || imageExtensions.some((extension) => lowerName.endsWith(extension));
};

export const isInlineViewableLenaAttachment = (name: string, type = '') => {
  if (type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) return true;
  const lowerName = name.toLowerCase();
  const looksLikeImage = type.startsWith('image/') || imageExtensions.some((extension) => lowerName.endsWith(extension));
  if (!looksLikeImage) return false;
  return inlineViewableImageExtensions.some((extension) => lowerName.endsWith(extension))
    || (type.startsWith('image/') && !type.includes('heic') && !type.includes('heif') && !type.includes('tiff'));
};

export const isSupportedLenaFile = (file: File) =>
  isLenaImageName(file.name, file.type) || file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf') || isLenaSpreadsheet(file);

export const readAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error || new Error('Could not read the file.'));
  reader.readAsDataURL(file);
});

const readAsArrayBuffer = (file: File): Promise<ArrayBuffer> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result as ArrayBuffer);
  reader.onerror = () => reject(reader.error || new Error('Could not read the file.'));
  reader.readAsArrayBuffer(file);
});

const spreadsheetToText = async (file: File): Promise<string> => {
  const workbook = XLSX.read(await readAsArrayBuffer(file), { type: 'array' });
  return workbook.SheetNames.map((name) => {
    const text = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
    return workbook.SheetNames.length > 1 ? `# ${name}\n${text}` : text;
  }).join('\n\n').trim();
};

export const analyzeLenaAttachment = async (file: File, mode: LenaCanvasMode, conversationId: number, current?: LoadScanResult): Promise<LenaAttachment> => {
  if (!isSupportedLenaFile(file)) {
    throw new Error('Use an Excel, CSV, image, or PDF file.');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('The file is larger than 15 MB. Please use a smaller file.');
  }

  // Persist the actual file to server storage in parallel with the (much slower) AI extraction,
  // so the click-to-open/download link is ready close to when the message itself finishes sending.
  const uploadPromise = api.messageAttachments.upload(conversationId, file);
  const withUpload = (extra: Partial<LenaAttachment>) => uploadPromise.then(({ data: uploaded }) => ({
    name: uploaded.name, type: uploaded.type, size: uploaded.size, path: uploaded.path, ...extra,
  }));

  if (isLenaSpreadsheet(file)) {
    const text = await spreadsheetToText(file);
    if (text.length < 8) throw new Error('This spreadsheet appears to be empty.');
    const response = await api.loads.scanBulkText(text);
    return withUpload({ bulkRows: response.data.rows });
  }

  const dataUrl = await readAsDataUrl(file);
  const encoded = { base64: dataUrl.split(',')[1] || '', mimeType: file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : undefined), filename: file.name };
  if (mode === 'bulk') {
    const response = await api.loads.scanBulk([encoded]);
    return withUpload({ bulkRows: response.data.rows });
  }

  const response = await api.loads.scan([encoded], current);
  return withUpload({ loadScan: response.data });
};

// The backend now returns the full accumulated draft on every scan (not just the fields the
// latest message/file mentioned), so the most recent scanned attachment is always the
// authoritative current state of the load-post canvas.
export const latestLoadScan = (attachments: LenaAttachment[]): LoadScanResult | undefined => {
  for (let index = attachments.length - 1; index >= 0; index -= 1) {
    if (attachments[index].loadScan) return attachments[index].loadScan;
  }
  return undefined;
};

export const formatAttachmentSize = (size: number) => size >= 1024 * 1024
  ? `${(size / (1024 * 1024)).toFixed(1)} MB`
  : `${Math.max(1, Math.round(size / 1024))} KB`;

const toApiDate = (date?: string) => {
  const match = date?.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : undefined;
};

// ScanFieldPatch already holds the full accumulated draft (see latestLoadScan above), so this maps
// it wholesale onto the load_drafts column names for the canvas's "Spasi kao draft i nastavi sa
// objavom" save, rather than a true field-by-field diff.
export const scanPatchToDraftPayload = (patch: ScanFieldPatch): Record<string, unknown> => {
  const payload: Record<string, unknown> = {};
  if (patch.cargoTitle !== undefined) payload.title = patch.cargoTitle;
  if (patch.transportType !== undefined) payload.transport_type = patch.transportType;
  if (patch.goodsType !== undefined) payload.goods_type = patch.goodsType;
  if (patch.hsCodes !== undefined) payload.hs_codes = patch.hsCodes;
  if (patch.weightKg !== undefined) payload.weight_kg = Number(patch.weightKg) * 1000;
  if (patch.pallets !== undefined) payload.pallets = Number(patch.pallets);
  if (patch.bodyTypes !== undefined) payload.body_types = patch.bodyTypes;
  if (patch.lengthM !== undefined) payload.length_m = Number(patch.lengthM);
  if (patch.widthM !== undefined) payload.width_m = Number(patch.widthM);
  if (patch.heightM !== undefined) payload.height_m = Number(patch.heightM);
  if (patch.volumeM3 !== undefined) payload.volume_m3 = Number(patch.volumeM3);
  if (patch.vehicleType !== undefined) payload.vehicle_type = patch.vehicleType;
  if (patch.loadingEquipment !== undefined) payload.loading_methods = patch.loadingEquipment;
  if (patch.characteristics !== undefined) payload.characteristics = patch.characteristics;
  if (patch.specialRequirements !== undefined) payload.special_requirements = patch.specialRequirements;
  if (patch.transportMode !== undefined) payload.transport_mode = patch.transportMode;
  if (patch.deliveryProof !== undefined) payload.delivery_proof = patch.deliveryProof;
  if (patch.mustBeTrackable !== undefined) payload.must_be_trackable = patch.mustBeTrackable;
  if (patch.pickupCity !== undefined) payload.pickup_city = patch.pickupCity;
  if (patch.pickupCountry !== undefined) payload.pickup_country_code = patch.pickupCountry;
  if (patch.pickupAddress !== undefined) payload.pickup_address = patch.pickupAddress;
  if (patch.pickupLatitude !== undefined) payload.pickup_latitude = Number(patch.pickupLatitude);
  if (patch.pickupLongitude !== undefined) payload.pickup_longitude = Number(patch.pickupLongitude);
  if (patch.pickupDate !== undefined) payload.pickup_date = toApiDate(patch.pickupDate);
  if (patch.pickupDateTo !== undefined) payload.pickup_date_to = toApiDate(patch.pickupDateTo);
  if (patch.pickupTimeFrom !== undefined) payload.pickup_time_from = patch.pickupTimeFrom;
  if (patch.pickupTimeTo !== undefined) payload.pickup_time_to = patch.pickupTimeTo;
  if (patch.deliveryCity !== undefined) payload.delivery_city = patch.deliveryCity;
  if (patch.deliveryCountry !== undefined) payload.delivery_country_code = patch.deliveryCountry;
  if (patch.deliveryAddress !== undefined) payload.delivery_address = patch.deliveryAddress;
  if (patch.deliveryLatitude !== undefined) payload.delivery_latitude = Number(patch.deliveryLatitude);
  if (patch.deliveryLongitude !== undefined) payload.delivery_longitude = Number(patch.deliveryLongitude);
  if (patch.deliveryDate !== undefined) payload.delivery_date = toApiDate(patch.deliveryDate);
  if (patch.deliveryDateTo !== undefined) payload.delivery_date_to = toApiDate(patch.deliveryDateTo);
  if (patch.deliveryTimeFrom !== undefined) payload.delivery_time_from = patch.deliveryTimeFrom;
  if (patch.deliveryTimeTo !== undefined) payload.delivery_time_to = patch.deliveryTimeTo;
  if (patch.budget !== undefined) payload.budget = Number(patch.budget);
  if (patch.freightCurrency !== undefined) payload.currency = patch.freightCurrency;
  if (patch.receivePriceProposals !== undefined) payload.is_negotiable = patch.receivePriceProposals;
  if (patch.declaredValue !== undefined) payload.declared_value = Number(patch.declaredValue);
  if (patch.shipmentValueCurrency !== undefined) payload.shipment_value_currency = patch.shipmentValueCurrency;
  if (patch.incoterm !== undefined) payload.incoterms = patch.incoterm;
  if (patch.paymentDeferred !== undefined) payload.payment_terms = patch.paymentDeferred ? 'deferred' : 'on_delivery';
  if (patch.paymentDueDays !== undefined) payload.payment_due_days = Number(patch.paymentDueDays);
  if (patch.temperatureMin !== undefined) payload.temperature_min = patch.temperatureMin === '' ? null : Number(patch.temperatureMin);
  if (patch.temperatureMax !== undefined) payload.temperature_max = patch.temperatureMax === '' ? null : Number(patch.temperatureMax);
  if (patch.requiresAdr !== undefined) payload.requires_adr = patch.requiresAdr;
  if (patch.requiresTailLift !== undefined) payload.requires_tail_lift = patch.requiresTailLift;
  if (patch.urgent !== undefined) payload.is_urgent = patch.urgent;
  if (patch.notes !== undefined) payload.notes = patch.notes;
  if (
    patch.contactName !== undefined || patch.contactPhone !== undefined || patch.contactMobile !== undefined
    || patch.contactFax !== undefined || patch.contactEmail !== undefined
  ) {
    payload.contact = {
      name: patch.contactName, phone: patch.contactPhone, mobile: patch.contactMobile, fax: patch.contactFax, email: patch.contactEmail,
    };
  }

  return payload;
};
