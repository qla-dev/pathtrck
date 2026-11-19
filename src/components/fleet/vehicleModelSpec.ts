export type VehicleModelData = {
  vehicle_type?: string; model?: string; transport_type?: string;
  length_m?: number; width_m?: number; height_m?: number;
  features?: Record<string, any>;
};
export type VehicleBody = 'box'|'curtain'|'reefer'|'tanker'|'flatbed'|'container'|'dump'|'carrier'|'van'|'car'|'bus'|'aircraft'|'ship';
const positive = (value: unknown) => { const n = Number(String(value ?? '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : null; };

/** Recorded dimensions take precedence. Class presets are schematic, never manufacturer specifications. */
export function vehicleModelSpec(vehicle: VehicleModelData) {
  const f = vehicle.features || {}, category = `${f.vehicle_class || ''} ${vehicle.vehicle_type || ''}`.toLowerCase();
  const bodyText = String(f.body_type || '').toLowerCase();
  const model = String(vehicle.model || '').toLowerCase();
  const light = /light|3\.5|3,5|laki/.test(category);
  const heavy = /heavy|12t|tešk|tesk/.test(category);
  let body: VehicleBody = 'box';
  if (vehicle.transport_type === 'air' || /aircraft|avion/.test(category)) body = 'aircraft';
  else if (vehicle.transport_type === 'sea' || /ship|vessel|brod/.test(category)) body = 'ship';
  else if (/tanker|cistern/.test(bodyText)) body = 'tanker';
  else if (/curtain|tautliner|cerad/.test(bodyText)) body = 'curtain';
  else if (/refrigerat|reefer|hladnja/.test(bodyText)) body = 'reefer';
  else if (/flatbed|platform/.test(bodyText)) body = 'flatbed';
  else if (/container|kontejner/.test(bodyText)) body = 'container';
  else if (/dump|tipper|kiper/.test(bodyText)) body = 'dump';
  else if (/car carrier|autotransport/.test(bodyText)) body = 'carrier';
  else if (/bus|autobus/.test(category)) body = 'bus';
  else if (/passenger|automobil/.test(category)) body = 'car';
  else if (/van|kombi/.test(category) && !/box|sand|chassis/.test(bodyText)) body = 'van';
  const van = body === 'van' || body === 'car' || body === 'bus';
  const longVan = /long|extra|l3|l4|xl|high roof/.test(`${category} ${model}`);
  const defaults = body === 'aircraft' ? [24, 25, 7] : body === 'ship' ? [60, 13, 18] : van ? [body === 'bus' ? 11 : body === 'car' ? 4.6 : longVan ? 6.8 : 5.5, 2, body === 'car' ? 1.6 : longVan ? 2.8 : 2.4] : light ? [6, 2.15, 3.15] : heavy ? [10.5, 2.55, 4] : [8, 2.45, 3.6];
  const dims = f.dimensions || f.model_dimensions || {};
  const values = [positive(f.length_m ?? dims.length_m ?? vehicle.length_m), positive(f.width_m ?? dims.width_m ?? vehicle.width_m), positive(f.height_m ?? dims.height_m ?? vehicle.height_m)];
  const [length, width, height] = values.map((n, i) => n ?? defaults[i]);
  const axles = Math.min(4, Math.max(2, Math.round(Number(String(f.configuration || '').match(/(\d+)\s*[x×]/i)?.[1] || (heavy ? 6 : 4)) / 2)));
  const trailerText = String(f.trailer || '');
  const trailers = /^yes|^da|^ja/i.test(trailerText) ? (/\(2\)/.test(trailerText) ? 2 : 1) : 0;
  return { body, length, width, height, axles, light, heavy, van, trailers, trailerBody: String(f.trailer_body_type || trailerText.split('•')[1] || 'Box trailer'), tailLift: !!f.tail_lift,
    recorded: values.every(Boolean), recordedDimensions: values, cabLength: light || van ? 1.65 : /sleeper|high|actros|fh|tgx|s-way/.test(model) || heavy ? 2.4 : 2.05 };
}
