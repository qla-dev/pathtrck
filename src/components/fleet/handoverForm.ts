export function validHandoverCondition(input: { mileage: string; minimum: number; fuel: number; damage: boolean; notes: string; confirmed: boolean }) {
  return /^\d+$/.test(input.mileage.trim()) && Number(input.mileage) >= input.minimum && Number(input.mileage) <= 999999999 &&
    Number.isInteger(input.fuel) && input.fuel >= 0 && input.fuel <= 100 && input.confirmed && (!input.damage || !!input.notes.trim());
}
export function handoverDestinationLabel(destination: string) {
  return ({ driver: 'Vozač', depot: 'Na depou ili parkingu', workshop: 'U radionici', returned: 'Vraćen najmodavcu' } as Record<string, string>)[destination] || destination;
}
export function acceptableHandoverPhoto(file: { type: string; name: string; size: number }) {
  return file.size > 0 && file.size <= 12 * 1024 * 1024 &&
    (/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) || (!file.type && /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)));
}
export function handoverDestinationIssue(input: { destination: string; vehicle: Record<string, any>; driverId: string; depotId: string; drivers: Array<{id:number}>; depots: Array<{id:number;active?:boolean}>; vehicles: Array<Record<string,any>>; allowReturn: boolean }) {
  const { destination, vehicle: v, driverId, depotId } = input;
  if (['sold','returned','stolen'].includes(v.status)) return 'Vozilo više nije dostupno za primopredaju. Osvježite flotu.';
  if (destination === 'driver') {
    if (['trailer','semi_trailer'].includes(v.features?.resource_type)) return 'Vozača zadužite na vučno vozilo, ne na prikolicu.';
    if (v.dispatch_blocked || !['active','available','idle','in_use','depot'].includes(v.status)) return 'Vozilo nije raspoloživo za zaduženje vozaču. Odaberite depo ili radionicu.';
    if (!input.drivers.some(d => String(d.id) === driverId)) return 'Izaberi vozača';
    if (Number(v.assigned_driver_user_id) === Number(driverId)) return 'Odabrani vozač već ima ovo vozilo. Odaberite drugog vozača ili razduženje.';
    if (input.vehicles.some(other => other.id !== v.id && Number(other.assigned_driver_user_id) === Number(driverId))) return 'Vozač već ima drugo vozilo. Prvo evidentirajte njegov povrat.';
  }
  if (destination === 'depot' && !input.depots.some(d => String(d.id) === depotId && d.active !== false)) return 'Izaberi depo';
  if (destination === 'returned' && (v.ownership_type !== 'rented' || !input.allowReturn)) return 'Povrat najmodavcu dostupan je samo za rentano vozilo i ovlaštenog korisnika.';
  const effectiveDepot = Number(depotId || v.depot_id || v.home_depot_id || 0);
  if (v.linked_trailers?.length && (['workshop','returned'].includes(destination) || effectiveDepot !== Number(v.depot_id || 0))) return 'Povezane prikolice prvo odvojite u pregledu vozila.';
  return '';
}
