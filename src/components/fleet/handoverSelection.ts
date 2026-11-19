import { isTrailer } from './vehicleRegistry';

type Row = Record<string, any>;
/** Handover is distinct from dispatch: workshop and blocked vehicles may still be returned. */
export function handoverCandidates(vehicles: Row[]) {
  return vehicles.filter(v => {
    const legacyTrailer = !v.features?.resource_type && [v.vehicle_type, v.features?.vehicle_class]
      .some(value => /^(semi[\s_-]?trailer|trailer|poluprikolica|prikolica)$/i.test(String(value || '').trim()));
    return !isTrailer(v) && !legacyTrailer && !['sold', 'returned', 'stolen'].includes(v.status);
  });
}
export function filterHandoverVehicles(vehicles: Row[], search: string, depot: string, type: string, status: string) {
  const term = search.trim().toLocaleLowerCase();
  return handoverCandidates(vehicles).filter(v =>
    (!term || [v.registration_number, v.vin, v.make, v.model].some(value => String(value || '').toLocaleLowerCase().includes(term))) &&
    (!depot || (depot === 'unassigned' ? !v.depot_id : String(v.depot_id) === depot)) &&
    (!type || (v.features?.resource_type || v.vehicle_type || '') === type) && (!status || v.status === status));
}
