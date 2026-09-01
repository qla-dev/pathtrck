import { LoadDraft, RouteStopDraft } from './types';

export type StopSide = 'pickup' | 'delivery';

/**
 * Which flat draft field backs each field of stop 1 on either side.
 *
 * Stop 1 of a route is not stored as a list entry - it stays in pickupCity, deliveryAddress and the
 * rest, which the whole app already reads as a load's origin and destination. This table is what
 * lets the same stop card, the same red outlines and the same AI-refill markers drive either
 * storage shape without either side knowing about the other.
 */
export const PRIMARY_STOP_FIELDS: Record<StopSide, Record<keyof RouteStopDraft, keyof LoadDraft>> = {
  pickup: {
    placeType: 'pickupPlaceType',
    city: 'pickupCity',
    postalCode: 'pickupPostalCode',
    country: 'pickupCountry',
    address: 'pickupAddress',
    port: 'pickupPort',
    airport: 'pickupAirport',
    latitude: 'pickupLatitude',
    longitude: 'pickupLongitude',
    date: 'pickupDate',
    dateTo: 'pickupDateTo',
    timeFrom: 'pickupTimeFrom',
    timeTo: 'pickupTimeTo',
  },
  delivery: {
    placeType: 'deliveryPlaceType',
    city: 'deliveryCity',
    postalCode: 'deliveryPostalCode',
    country: 'deliveryCountry',
    address: 'deliveryAddress',
    port: 'deliveryPort',
    airport: 'deliveryAirport',
    latitude: 'deliveryLatitude',
    longitude: 'deliveryLongitude',
    date: 'deliveryDate',
    dateTo: 'deliveryDateTo',
    timeFrom: 'deliveryTimeFrom',
    timeTo: 'deliveryTimeTo',
  },
};

const EXTRAS_FIELD: Record<StopSide, 'extraPickups' | 'extraDeliveries'> = {
  pickup: 'extraPickups',
  delivery: 'extraDeliveries',
};

/** Stop 1 of a side, read out of the flat draft fields into the shape the stop card speaks. */
export const primaryStop = (draft: LoadDraft, side: StopSide): RouteStopDraft => {
  const fields = PRIMARY_STOP_FIELDS[side];
  return Object.fromEntries(
    (Object.keys(fields) as Array<keyof RouteStopDraft>).map((key) => [key, String(draft[fields[key]] ?? '')])
  ) as RouteStopDraft;
};

/** Every stop of one side, in the order it is driven: stop 1 first, then the added ones. */
export const stopsOfSide = (draft: LoadDraft, side: StopSide): RouteStopDraft[] =>
  [primaryStop(draft, side), ...draft[EXTRAS_FIELD[side]]];

/** Writes a full ordered list back into the flat fields (stop 1) and the extras list (the rest). */
export const withStopsOfSide = (draft: LoadDraft, side: StopSide, stops: RouteStopDraft[]): LoadDraft => {
  // A route always keeps one pickup and one delivery - the last stop of a side cannot be removed,
  // and an empty list would leave the flat fields with nothing to hold.
  if (stops.length === 0) return draft;
  const [first, ...rest] = stops;
  const fields = PRIMARY_STOP_FIELDS[side];
  const flattened = Object.fromEntries(
    (Object.keys(fields) as Array<keyof RouteStopDraft>).map((key) => [fields[key], first[key]])
  ) as Partial<LoadDraft>;
  return { ...draft, ...flattened, [EXTRAS_FIELD[side]]: rest };
};

/** Applies a card's patch to one stop of a side, wherever that stop happens to be stored. */
export const withStopPatch = (draft: LoadDraft, side: StopSide, index: number, patch: Partial<RouteStopDraft>): LoadDraft => {
  const stops = stopsOfSide(draft, side).map((stop, position) => (position === index ? { ...stop, ...patch } : stop));
  return withStopsOfSide(draft, side, stops);
};

/** Moves a stop within its side, keeping every other stop in the order it already had. */
const withReorderedStops = (draft: LoadDraft, side: StopSide, from: number, to: number): LoadDraft => {
  const stops = stopsOfSide(draft, side);
  if (from < 0 || to < 0 || from >= stops.length || to >= stops.length || from === to) return draft;
  const moved = [...stops];
  moved.splice(to, 0, ...moved.splice(from, 1));
  return withStopsOfSide(draft, side, moved);
};

/**
 * Moves a stop anywhere in the route, onto `target`'s side and either side of it.
 *
 * Dragging a pickup down among the deliveries turns it into one, and the reverse turns a delivery
 * back into a pickup - a stop is an address with a time window either way, and which list it sits
 * in is the only thing that says whether goods are loaded or unloaded there.
 *
 * A route always keeps at least one pickup and one delivery, so moving the only stop of its side
 * does not empty that side: the two stops trade places instead, which is how the origin and the
 * destination of a plain A-to-B route are swapped.
 */
export const withMovedStop = (
  draft: LoadDraft,
  from: { side: StopSide; index: number },
  target: { side: StopSide; index: number },
  placeAfter: boolean,
): LoadDraft => {
  if (from.side === target.side) return withReorderedStops(draft, from.side, from.index, target.index);

  const source = stopsOfSide(draft, from.side);
  const destination = stopsOfSide(draft, target.side);
  const moved = source[from.index];
  const landing = destination[target.index];
  if (!moved || !landing) return draft;

  if (source.length < 2) {
    return withStopsOfSide(
      withStopsOfSide(draft, from.side, source.map((stop, position) => (position === from.index ? landing : stop))),
      target.side,
      destination.map((stop, position) => (position === target.index ? moved : stop))
    );
  }

  const next = [...destination];
  next.splice(placeAfter ? target.index + 1 : target.index, 0, moved);
  return withStopsOfSide(
    withStopsOfSide(draft, from.side, source.filter((_, position) => position !== from.index)),
    target.side,
    next
  );
};

/** A stop only counts as a place on the map once it has coordinates to draw at. */
export const stopPosition = (stop: RouteStopDraft): [number, number] | null => {
  if (!stop.latitude.trim() || !stop.longitude.trim()) return null;
  const latitude = Number(stop.latitude);
  const longitude = Number(stop.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? [latitude, longitude] : null;
};

/** What to call a stop in the route summary and on the map - its address, else its city. */
export const stopLabel = (stop: RouteStopDraft): string =>
  stop.address || stop.city || stop.port || stop.airport || '—';

/**
 * The whole road route in driving order: every pickup, then every delivery. Multi-stop loads are
 * collected before anything is dropped off, which is what the two columns of the form describe.
 */
export const routeStopsOf = (draft: LoadDraft): Array<{ stop: RouteStopDraft; side: StopSide; index: number }> => [
  ...stopsOfSide(draft, 'pickup').map((stop, index) => ({ stop, side: 'pickup' as const, index })),
  ...stopsOfSide(draft, 'delivery').map((stop, index) => ({ stop, side: 'delivery' as const, index })),
];
