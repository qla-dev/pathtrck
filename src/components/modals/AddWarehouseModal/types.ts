export type StepId = 'general' | 'capacity' | 'operations' | 'documents' | 'review';

export type TemperatureZone = {
  id: string;
  name: string;
  rangeMin: string;
  rangeMax: string;
  areaSqm: string;
};

export type RequiredDocumentId =
  | 'business_registration'
  | 'ownership_lease'
  | 'tin_certificate'
  | 'fire_safety'
  | 'environmental'
  | 'insurance';

export type DocumentSlot = {
  file: File | null;
  fileName: string;
  fileSize: number;
  /** Set once the file is pushed to /documents/upload on submit. */
  documentId: number | null;
  expiresOn: string;
};

export type WarehouseDraft = {
  // Step 1 - general
  name: string;
  code: string;
  warehouseType: string;
  status: string;
  description: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  countryCode: string;
  contactName: string;
  contactPhoneDial: string;
  contactPhone: string;
  contactEmail: string;
  alternatePhoneDial: string;
  alternatePhone: string;
  department: string;
  preferredContactMethod: string;
  managerName: string;
  managerEmail: string;
  managerPhoneDial: string;
  managerPhone: string;

  // Step 2 - capacity & inventory
  totalCapacityPallets: string;
  totalCapacityCbm: string;
  storageAreaSqm: string;
  thresholdWarning: string;
  thresholdHigh: string;
  thresholdCritical: string;
  storageType: string;
  rackingSystem: string;
  maximumHeightM: string;
  temperatureZones: TemperatureZone[];
  defaultTemperatureZoneId: string;
  inventoryTracking: string;
  cycleCounting: string;
  replenishmentAlertPercent: string;
  pickingMethod: string;
  accuracyTargetPercent: string;
  overstockAlertPercent: string;
  defaultUom: string;
  allowNegativeInventory: boolean;

  // Equipment counts - shared by the Capacity and Operations steps
  forklifts: number;
  palletJacks: number;
  reachTrucks: number;
  dockLevellers: number;
  conveyors: number;
  handheldScanners: number;
  dockDoors: number;
  specialEquipmentNotes: string;

  // Step 3 - operations
  operatingHoursTemplate: string;
  timeZone: string;
  workingDays: string[];
  receivingCutoff: string;
  shippingCutoff: string;
  warehouseCalendar: string;
  capabilities: string[];
  handlingCapabilities: string[];
  wmsSystem: string;
  tmsIntegration: string;
  barcodeSystem: string;
  rfidCapability: string;
  operationalNotes: string;

  // Step 4 - documents & compliance
  documents: Record<RequiredDocumentId, DocumentSlot>;
  operatingLicenseType: string;
  operatingLicenseNumber: string;
  issuingAuthority: string;
  licenseIssuedDate: string;
  licenseExpiryDate: string;
  customsBonded: boolean;
  bondedCode: string;
  hazmatPermit: boolean;
  hazmatPermitNumber: string;
  foodGradeCertified: boolean;
  foodGradeCertNumber: string;
  standards: string[];
  otherStandard: string;
  documentsNotes: string;
};

export const WAREHOUSE_TYPE_OPTIONS = [
  'Distribution Center',
  'Fulfillment Center',
  'Cold Storage',
  'Bonded Warehouse',
  'Cross-dock Facility',
  'Bulk / Yard Storage',
  'Container Depot',
] as const;

export const WAREHOUSE_STATUS_OPTIONS = ['Active', 'Pending', 'Inactive', 'Under Maintenance'] as const;

export const DEPARTMENT_OPTIONS = ['Operations', 'Logistics', 'Customer Service', 'Sales', 'Finance', 'Management'] as const;

export const CONTACT_METHOD_OPTIONS = ['Email', 'Phone', 'SMS', 'WhatsApp'] as const;

export const STORAGE_TYPE_OPTIONS = ['Rack Storage', 'Block Stacking', 'Shelving', 'Bulk Storage', 'Automated Storage', 'Outdoor Yard'] as const;

export const RACKING_SYSTEM_OPTIONS = ['Selective Racking', 'Drive-In Racking', 'Push-Back Racking', 'Pallet Flow', 'Mobile Racking', 'Cantilever'] as const;

export const INVENTORY_TRACKING_OPTIONS = ['Serial & Batch Tracking', 'Batch / Lot Only', 'Serial Only', 'Quantity Only'] as const;

export const CYCLE_COUNTING_OPTIONS = ['Enabled', 'Disabled'] as const;

export const PICKING_METHOD_OPTIONS = ['FIFO (First In, First Out)', 'LIFO (Last In, First Out)', 'FEFO (First Expired, First Out)', 'Wave Picking', 'Batch Picking'] as const;

export const UOM_OPTIONS = ['Pallets', 'Cartons', 'Units', 'Kilograms', 'Cubic Meters'] as const;

export const OPERATING_HOURS_TEMPLATES = ['Custom Schedule', '24/7', 'Mon-Fri 08:00-17:00', 'Mon-Sat 07:00-19:00'] as const;

export const TIME_ZONE_OPTIONS = [
  '(UTC+01:00) Amsterdam, Berlin, Rome',
  '(UTC+00:00) London, Dublin, Lisbon',
  '(UTC+02:00) Athens, Helsinki, Kyiv',
  '(UTC+03:00) Istanbul, Moscow',
  '(UTC-05:00) New York, Toronto',
  '(UTC+04:00) Dubai',
] as const;

export const WORKING_DAY_OPTIONS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const WAREHOUSE_CALENDAR_OPTIONS = ['Select calendar', 'EU Holidays', 'US Holidays', 'BA Holidays', 'No Holidays'] as const;

export const WMS_OPTIONS = ['Manhattan WMS', 'SAP EWM', 'Blue Yonder', 'Korber', 'Custom / In-house', 'None'] as const;

export const TMS_OPTIONS = ['Select TMS (optional)', 'Freightbook TMS', 'Oracle OTM', 'Alpega', 'Custom / In-house'] as const;

export const BARCODE_OPTIONS = ['1D & 2D Barcode', '1D Barcode only', '2D / QR only', 'None'] as const;

export const LICENSE_TYPE_OPTIONS = ['License Number', 'Permit Number', 'Registration ID'] as const;

export const STANDARD_OPTIONS = ['ISO 9001', 'ISO 14001', 'OHSAS 18001', 'GDP Certified', 'AEO Certified'] as const;

// Operations step - the services the facility offers.
export const CAPABILITY_OPTIONS: Array<{ id: string; label: string; description: string }> = [
  { id: 'receiving', label: 'Receiving', description: 'Accept incoming shipments and goods' },
  { id: 'cross_docking', label: 'Cross Docking', description: 'Transfer goods directly between vehicles' },
  { id: 'storage', label: 'Storage', description: 'Store inventory and goods' },
  { id: 'value_added', label: 'Value Added Services', description: 'Kitting, labeling, assembly, etc.' },
  { id: 'picking', label: 'Picking', description: 'Pick and prepare orders' },
  { id: 'returns', label: 'Returns Processing', description: 'Process returns and reverse logistics' },
  { id: 'packing', label: 'Packing', description: 'Pack orders for shipping' },
  { id: 'temperature_controlled', label: 'Temperature Controlled', description: 'Temperature sensitive storage' },
];

// Capacity step - what the material handling team can physically do.
export const HANDLING_CAPABILITY_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'cross_docking', label: 'Cross Docking' },
  { id: 'value_added', label: 'Value Added Services' },
  { id: 'repacking', label: 'Repacking' },
  { id: 'labeling', label: 'Labeling' },
  { id: 'kitting', label: 'Kitting / Assembly' },
];

export const REQUIRED_DOCUMENTS: Array<{ id: RequiredDocumentId; label: string; hint: string; required: boolean }> = [
  { id: 'business_registration', label: 'Business Registration Certificate', hint: 'Required', required: true },
  { id: 'ownership_lease', label: 'Warehouse Ownership / Lease Agreement', hint: 'Required', required: true },
  { id: 'tin_certificate', label: 'Tax Identification Number (TIN) Certificate', hint: 'Required', required: true },
  { id: 'fire_safety', label: 'Fire Safety Certificate', hint: 'Required', required: true },
  { id: 'environmental', label: 'Environmental Compliance Certificate', hint: 'Required in some regions', required: false },
  { id: 'insurance', label: 'Insurance Certificate', hint: 'Optional', required: false },
];

const emptySlot = (): DocumentSlot => ({ file: null, fileName: '', fileSize: 0, documentId: null, expiresOn: '' });

export const createWarehouseDraft = (): WarehouseDraft => ({
  name: '',
  code: '',
  warehouseType: '',
  status: 'Active',
  description: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  stateProvince: '',
  postalCode: '',
  countryCode: '',
  contactName: '',
  contactPhoneDial: '+387',
  contactPhone: '',
  contactEmail: '',
  alternatePhoneDial: '+387',
  alternatePhone: '',
  department: '',
  preferredContactMethod: 'Email',
  managerName: '',
  managerEmail: '',
  managerPhoneDial: '+387',
  managerPhone: '',

  totalCapacityPallets: '',
  totalCapacityCbm: '',
  storageAreaSqm: '',
  thresholdWarning: '80',
  thresholdHigh: '90',
  thresholdCritical: '100',
  storageType: 'Rack Storage',
  rackingSystem: 'Selective Racking',
  maximumHeightM: '',
  temperatureZones: [],
  defaultTemperatureZoneId: '',
  inventoryTracking: 'Serial & Batch Tracking',
  cycleCounting: 'Enabled',
  replenishmentAlertPercent: '20',
  pickingMethod: 'FIFO (First In, First Out)',
  accuracyTargetPercent: '98',
  overstockAlertPercent: '110',
  defaultUom: 'Pallets',
  allowNegativeInventory: false,

  forklifts: 0,
  palletJacks: 0,
  reachTrucks: 0,
  dockLevellers: 0,
  conveyors: 0,
  handheldScanners: 0,
  dockDoors: 0,
  specialEquipmentNotes: '',

  operatingHoursTemplate: 'Custom Schedule',
  timeZone: '(UTC+01:00) Amsterdam, Berlin, Rome',
  workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  receivingCutoff: '17:00',
  shippingCutoff: '18:00',
  warehouseCalendar: 'Select calendar',
  capabilities: ['receiving', 'storage', 'picking', 'packing'],
  handlingCapabilities: [],
  wmsSystem: '',
  tmsIntegration: 'Select TMS (optional)',
  barcodeSystem: '1D & 2D Barcode',
  rfidCapability: 'No',
  operationalNotes: '',

  documents: {
    business_registration: emptySlot(),
    ownership_lease: emptySlot(),
    tin_certificate: emptySlot(),
    fire_safety: emptySlot(),
    environmental: emptySlot(),
    insurance: emptySlot(),
  },
  operatingLicenseType: 'License Number',
  operatingLicenseNumber: '',
  issuingAuthority: '',
  licenseIssuedDate: '',
  licenseExpiryDate: '',
  customsBonded: false,
  bondedCode: '',
  hazmatPermit: false,
  hazmatPermitNumber: '',
  foodGradeCertified: false,
  foodGradeCertNumber: '',
  standards: [],
  otherStandard: '',
  documentsNotes: '',
});
