import { Language, Package as PackageData } from '../types';
import { trPackageStatus } from '../i18n';

export const TRACKING_FLOW: PackageData['status'][] = ['Posted', 'Booked', 'Opened', 'Sent', 'In delivery', 'Received', 'Finished'];

export const apiLoadStatus = (status: PackageData['status']) => status.toLowerCase().replace(/\s+/g, '_');

export const mapLoadStatus = (value: unknown): PackageData['status'] => {
  const statuses: Record<string, PackageData['status']> = {
    posted: 'Posted', booked: 'Booked', opened: 'Opened', sent: 'Sent', in_delivery: 'In delivery',
    received: 'Received', finished: 'Finished', pending: 'Pending', cancelled: 'Cancelled',
  };

  return statuses[String(value || '').toLowerCase()] || 'Pending';
};

// Load timestamps arrive as raw ISO strings from the API; every surface that shows one to a
// person formats it the same way.
export const formatShortDate = (value: unknown): string => {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const detailValue = (value: unknown) => {
  const text = String(value ?? '').trim();
  return text && text !== 'null' ? text : '—';
};

const detailDate = (value: unknown) => {
  const text = String(value ?? '').trim();
  if (!text) return '—';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
};

export const mapLoadToPackage = (load: Record<string, unknown>, lang: Language): PackageData => {
  const stops = Array.isArray(load.stops) ? load.stops as Array<Record<string, unknown>> : [];
  const shipment = (load.shipment || {}) as Record<string, unknown>;
  const events = Array.isArray(shipment.events) ? shipment.events as Array<Record<string, unknown>> : [];
  const consignee = (load.consignee || {}) as Record<string, unknown>;
  const company = (load.company || {}) as Record<string, unknown>;
  const assignedDriver = (load.assigned_driver || load.assignedDriver || {}) as Record<string, unknown>;
  const assignedDriverProfile = (assignedDriver.driver || {}) as Record<string, unknown>;
  const vehicle = (load.vehicle || {}) as Record<string, unknown>;
  const workspace = (load.shipment_workspace || {}) as Record<string, unknown>;
  const mappedStatus = mapLoadStatus(load.status);
  const estimatedDeliveryAt = String(shipment.estimated_delivery_at || stops[stops.length - 1]?.window_ends_at || Date.now());
  const origin = String(stops[0]?.city || '—');
  const destination = String(stops[stops.length - 1]?.city || '—');
  const sourcePrice = String(load.price_insurance || '').trim();
  const hasCurrentLocation = shipment.current_latitude !== null && shipment.current_latitude !== undefined
    && shipment.current_longitude !== null && shipment.current_longitude !== undefined;

  return {
    recipient: String(consignee.company_name || consignee.name || '—'),
    id: String(load.id),
    assignedDriverUserId: load.assigned_driver_user_id ? Number(load.assigned_driver_user_id) : undefined,
    assignedDriverName: String(assignedDriver.name || assignedDriverProfile.name || '').trim() || undefined,
    vehicleName: String(
      vehicle.registration_number
      || vehicle.name
      || [vehicle.make, vehicle.model].filter(Boolean).join(' ')
      || ''
    ).trim() || undefined,
    vehicleId: vehicle.id ? Number(vehicle.id) : undefined,
    shipmentId: shipment.id ? String(shipment.id) : undefined,
    shipmentWorkspaceId: workspace.id ? Number(workspace.id) : undefined,
    operationalChecklist: Array.isArray(workspace.operational_checklist)
      ? workspace.operational_checklist as Array<{ key?: unknown; status?: unknown }>
      : undefined,
    workspaceCustomerUserId: workspace.customer_user_id ? Number(workspace.customer_user_id) : undefined,
    workspaceProviderUserId: workspace.provider_user_id ? Number(workspace.provider_user_id) : undefined,
    workspaceProviderCompanyId: workspace.provider_company_id ? Number(workspace.provider_company_id) : undefined,
    trackingNumber: String(shipment.tracking_number || ''),
    carrier: String(shipment.carrier || company.name || '—'),
    status: mappedStatus,
    totalAmount: sourcePrice || `${String(load.currency || 'EUR')} ${Number(load.budget || 0).toLocaleString()}`,
    transportType: String(load.transport_type || 'road').toLowerCase(),
    cargoType: String(load.cargo_type || ''),
    bookingReference: String(load.booking_reference || ''),
    statusChange: load.status_change && typeof load.status_change === 'object'
      ? Object.fromEntries(Object.entries(load.status_change as Record<string, unknown>).map(([status, changedAt]) => [status, String(changedAt)]))
      : {},
    origin, destination,
    originCountryCode: String(stops[0]?.country_code || '').toUpperCase(),
    destinationCountryCode: String(stops[stops.length - 1]?.country_code || '').toUpperCase(),
    addedDate: String(load.published_at || load.created_at || ''), transitDays: Math.max(0, Math.ceil((new Date(estimatedDeliveryAt).getTime() - Date.now()) / 86400000)),
    description: String(load.title || load.cargo_type || ''),
    currentLocation: hasCurrentLocation
      ? [Number(shipment.current_latitude), Number(shipment.current_longitude)]
      : [43.8563, 18.4131],
    hasCurrentLocation,
    trackingUpdatedAt: String(shipment.updated_at || events[0]?.occurred_at || events[0]?.created_at || ''),
    history: events.map((event) => ({ date: String(event.recorded_at || event.created_at || ''), status: String(event.status || event.event_type || ''), location: String(event.location_name || '') })),
    customsDocuments: Array.isArray(load.customs_documents)
      ? load.customs_documents as PackageData['customsDocuments']
      : [],
    consigneeRecord: consignee,
    stops,
    details: [
      { key: 'published_at', label: 'Date/Datum', value: detailDate(load.published_at || load.created_at), rawValue: String(load.published_at || '').slice(0, 10), input: 'date' },
      { key: 'status', label: 'Shipment Status', value: trPackageStatus(lang, mappedStatus), rawValue: String(load.status || ''), input: 'status' },
      { key: 'booking_reference', label: 'Booking reference', value: detailValue(load.booking_reference), rawValue: detailValue(load.booking_reference) === '—' ? '' : String(load.booking_reference), input: 'text' },
      { key: 'insurance', label: 'Insurance', value: detailValue(load.insurance), rawValue: String(load.insurance || ''), input: 'text' },
      { key: 'department', label: 'Department', value: detailValue(load.department), rawValue: String(load.department || ''), input: 'text' },
      { key: 'freight_mode', label: 'Freight mode', value: detailValue(load.freight_mode || load.transport_type), rawValue: String(load.freight_mode || load.transport_type || ''), input: 'text' },
      { key: 'assigned_driver_user_id', label: 'Driver', value: detailValue(assignedDriver.name || assignedDriverProfile.name), rawValue: String(load.assigned_driver_user_id || ''), input: 'driver' },
      { key: 'vehicle_id', label: 'Vehicle', value: detailValue(vehicle.registration_number || [vehicle.make, vehicle.model].filter(Boolean).join(' ')), rawValue: String(vehicle.id || ''), input: 'vehicle' },
      { key: 'consignee_customer_id', label: 'Consignee', value: detailValue(consignee.company_name || consignee.name), rawValue: String(consignee.id || ''), input: 'customer' },
      { key: 'subdepartment', label: 'Subdepartment', value: detailValue(load.subdepartment), rawValue: String(load.subdepartment || ''), input: 'text' },
      { key: 'weight_kg', label: 'KGS', value: load.weight_kg ? `${Number(load.weight_kg).toLocaleString()} kg` : '—', rawValue: String(load.weight_kg || ''), input: 'number' },
      { key: 'pallets', label: 'Pallets/Units', value: load.pallets ? Number(load.pallets).toLocaleString() : '—', rawValue: String(load.pallets || ''), input: 'number' },
      { key: 'quantity_measure', label: 'QTY/G.W./MEAs', value: detailValue(load.quantity_measure), rawValue: String(load.quantity_measure || ''), input: 'text' },
      { key: 'volume_m3', label: 'CBM', value: detailValue(load.volume_m3), rawValue: String(load.volume_m3 || ''), input: 'number' },
      { key: 'teu', label: 'TEU', value: detailValue(load.teu), rawValue: String(load.teu || ''), input: 'text' },
      { key: 'container_types', label: 'Container Types', value: detailValue(load.container_types), rawValue: String(load.container_types || ''), input: 'text' },
      { key: 'container_number', label: 'Container', value: detailValue(load.container_number), rawValue: String(load.container_number || ''), input: 'text' },
      { key: 'departure', label: 'Departure Port / Station', value: detailValue(origin), rawValue: origin === '—' ? '' : origin, input: 'text' },
      { key: 'arrival', label: 'Arrival Port / Station', value: detailValue(destination), rawValue: destination === '—' ? '' : destination, input: 'text' },
      { key: 'etd_at', label: 'ETD Date', value: detailDate(load.etd_at), rawValue: String(load.etd_at || '').slice(0, 10), input: 'date' },
      { key: 'eta_at', label: 'ETA Date', value: detailDate(stops[stops.length - 1]?.window_starts_at || shipment.estimated_delivery_at), rawValue: String(stops[stops.length - 1]?.window_starts_at || shipment.estimated_delivery_at || '').slice(0, 10), input: 'date' },
      { key: 'atd_at', label: 'ATD Date', value: detailDate(load.atd_at), rawValue: String(load.atd_at || '').slice(0, 10), input: 'date' },
      { key: 'shipper_name', label: 'Shipper Name', value: detailValue(load.shipper_name), rawValue: String(load.shipper_name || ''), input: 'text' },
      { key: 'mediator', label: 'Mediator', value: detailValue(load.mediator), rawValue: String(load.mediator || ''), input: 'text' },
      { key: 'incoterms', label: 'Incoterms', value: detailValue(load.incoterms), rawValue: String(load.incoterms || ''), input: 'select' },
      { key: 'price_insurance', label: 'Price + Insurance', value: detailValue(load.price_insurance), rawValue: String(load.price_insurance || ''), input: 'text' },
      { key: 'profit_loss', label: 'GP (Profit & Loss)', value: detailValue(load.profit_loss), rawValue: String(load.profit_loss || ''), input: 'text' },
    ],
  };
};
