import { REQUIRED_DOCUMENTS, WarehouseDraft } from './types';

const num = (value: string) => (value.trim() === '' ? 0 : Number(value.replace(/[^0-9.-]/g, '')) || 0);
const text = (value: string) => (value.trim() === '' ? null : value.trim());
const phone = (dial: string, value: string) => (value.trim() === '' ? null : `${dial} ${value.trim()}`.trim());

/**
 * Flattens the wizard draft into the warehouses payload. Scalars the backend indexes stay top
 * level; every configuration block goes into its own JSON column so the form can keep growing.
 */
export const buildWarehousePayload = (draft: WarehouseDraft): Record<string, unknown> => ({
  name: draft.name.trim(),
  code: text(draft.code),
  warehouse_type: text(draft.warehouseType),
  status: draft.status.toLowerCase(),
  description: text(draft.description),

  address: text(draft.addressLine1),
  address_line_2: text(draft.addressLine2),
  city: text(draft.city),
  state_province: text(draft.stateProvince),
  postal_code: text(draft.postalCode),
  country_code: draft.countryCode ? draft.countryCode.toUpperCase() : null,

  contact_name: text(draft.contactName),
  contact_email: text(draft.contactEmail),
  contact_phone: phone(draft.contactPhoneDial, draft.contactPhone),
  contact_alternate_phone: phone(draft.alternatePhoneDial, draft.alternatePhone),
  department: text(draft.department),
  preferred_contact_method: text(draft.preferredContactMethod),
  manager_name: text(draft.managerName),
  manager_email: text(draft.managerEmail),
  manager_phone: phone(draft.managerPhoneDial, draft.managerPhone),

  total_capacity_pallets: num(draft.totalCapacityPallets),
  total_capacity_cbm: num(draft.totalCapacityCbm),
  storage_area_sqm: num(draft.storageAreaSqm),
  dock_doors: draft.dockDoors,

  utilization_thresholds: {
    warning_percent: num(draft.thresholdWarning),
    high_percent: num(draft.thresholdHigh),
    critical_percent: num(draft.thresholdCritical),
  },
  storage_config: {
    storage_type: draft.storageType,
    racking_system: draft.rackingSystem,
    maximum_height_m: num(draft.maximumHeightM),
  },
  temperature_zones: draft.temperatureZones.map((zone) => ({
    name: zone.name,
    temperature_min: zone.rangeMin,
    temperature_max: zone.rangeMax,
    area_sqm: num(zone.areaSqm),
    is_default: zone.id === draft.defaultTemperatureZoneId,
  })),
  inventory_settings: {
    tracking: draft.inventoryTracking,
    cycle_counting: draft.cycleCounting,
    replenishment_alert_percent: num(draft.replenishmentAlertPercent),
    picking_method: draft.pickingMethod,
    accuracy_target_percent: num(draft.accuracyTargetPercent),
    overstock_alert_percent: num(draft.overstockAlertPercent),
    default_uom: draft.defaultUom,
    allow_negative_inventory: draft.allowNegativeInventory,
  },
  equipment: {
    forklifts: draft.forklifts,
    pallet_jacks: draft.palletJacks,
    reach_trucks: draft.reachTrucks,
    dock_levellers: draft.dockLevellers,
    conveyors: draft.conveyors,
    handheld_scanners: draft.handheldScanners,
    special_equipment_notes: text(draft.specialEquipmentNotes),
  },
  handling_capabilities: draft.handlingCapabilities,

  operations: {
    operating_hours_template: draft.operatingHoursTemplate,
    time_zone: draft.timeZone,
    working_days: draft.workingDays,
    receiving_cutoff: draft.receivingCutoff,
    shipping_cutoff: draft.shippingCutoff,
    calendar: draft.warehouseCalendar === 'Select calendar' ? null : draft.warehouseCalendar,
  },
  capabilities: draft.capabilities,
  technology: {
    wms_system: text(draft.wmsSystem),
    tms_integration: draft.tmsIntegration === 'Select TMS (optional)' ? null : draft.tmsIntegration,
    barcode_system: draft.barcodeSystem,
    rfid_capability: draft.rfidCapability,
  },
  operational_notes: text(draft.operationalNotes),

  compliance: {
    license_type: draft.operatingLicenseType,
    license_number: text(draft.operatingLicenseNumber),
    issuing_authority: text(draft.issuingAuthority),
    issued_date: text(draft.licenseIssuedDate),
    expiry_date: text(draft.licenseExpiryDate),
    customs_bonded: draft.customsBonded,
    bonded_code: text(draft.bondedCode),
    hazmat_permit: draft.hazmatPermit,
    hazmat_permit_number: text(draft.hazmatPermitNumber),
    food_grade_certified: draft.foodGradeCertified,
    food_grade_certificate_number: text(draft.foodGradeCertNumber),
  },
  standards: [...draft.standards, ...(draft.otherStandard.trim() ? [draft.otherStandard.trim()] : [])],
  certifications: [...draft.standards, ...(draft.otherStandard.trim() ? [draft.otherStandard.trim()] : [])],
  documents: REQUIRED_DOCUMENTS.filter((entry) => draft.documents[entry.id].fileName).map((entry) => ({
    slot: entry.id,
    label: entry.label,
    file_name: draft.documents[entry.id].fileName,
    file_size: draft.documents[entry.id].fileSize,
    document_id: draft.documents[entry.id].documentId,
    expires_on: draft.documents[entry.id].expiresOn || null,
  })),
  documents_notes: text(draft.documentsNotes),

  // Storage types stay a first-class column because the load exchange filters on them.
  storage_types: draft.temperatureZones.length > 0 ? draft.temperatureZones.map((zone) => zone.name) : null,
});
