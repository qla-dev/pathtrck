import { Building2, MapPin, PlaneLanding, Radar, Ship, Truck, Warehouse, type LucideIcon } from 'lucide-react';

/**
 * The icon that stands for a stop's place type - the same one its picker shows on the stop card.
 *
 * A stop is recognised by what kind of place it is long before its address is read, so the route
 * timeline and both maps mark it with this rather than with a number: a warehouse looks like a
 * warehouse whether it is pickup 2 or the final drop.
 *
 * Every place type any transport mode can set is here, since the timeline and the maps are shared:
 * road picks between warehouse, port and airport, air adds its terminals and airports of loading,
 * sea and rail speak in leg types, and a warehouse request can ask for a whole area.
 */
const PLACE_TYPE_ICONS: Record<string, LucideIcon> = {
  Warehouse,
  Port: Ship,
  Airport: PlaneLanding,
  Terminal: Building2,
  Address: MapPin,
  Area: Radar,
  'Port to Port': Ship,
  'Door to Port': Truck,
  'Port to Door': Truck,
  'AOL / Airport of loading': PlaneLanding,
  'AOD / Airport of delivery': PlaneLanding,
  'Address + Last Mile Delivery': MapPin,
};

export const placeTypeIcon = (placeType: string, fallback: LucideIcon = MapPin): LucideIcon =>
  PLACE_TYPE_ICONS[placeType] || fallback;
