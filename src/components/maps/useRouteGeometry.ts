import { useEffect, useState } from 'react';

export type RouteGeometry = {
  /** The whole driven line, or an empty list while it loads / when the router is unreachable. */
  points: [number, number][];
  /** The same line cut at the stops: legs[i] runs from stop i to stop i + 1, so each can be drawn
      in the colour of the stop it leaves. Empty whenever `points` is. */
  legs: [number, number][][];
  distanceKm: number | null;
  loading: boolean;
};

type OsrmStep = { geometry?: { coordinates?: [number, number][] } };
type OsrmRoute = {
  distance?: number;
  geometry?: { coordinates?: [number, number][] };
  legs?: Array<{ steps?: OsrmStep[] }>;
};

const toLatLng = (coordinates: [number, number][] = []): [number, number][] =>
  coordinates.map(([longitude, latitude]) => [latitude, longitude]);

/**
 * Driving geometry for an ordered list of waypoints, from OSRM's public router.
 *
 * A multi-stop road load passes every pickup and delivery in the order they are visited, so the
 * line drawn on the map and the distance beside it are the route actually driven rather than a
 * straight origin-to-destination hop. Steps are asked for as well as the overview, because the leg
 * geometry they add is what lets the map colour the run between two stops after the first of them.
 *
 * OSRM is a best-effort public service: when it is unreachable the line stays empty and the
 * distance null, and the caller keeps whatever estimate it already had.
 */
export const useRouteGeometry = (positions: [number, number][], enabled = true): RouteGeometry => {
  const [points, setPoints] = useState<[number, number][]>([]);
  const [legs, setLegs] = useState<[number, number][][]>([]);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  // Callers rebuild the positions array on every render, so the effect keys off the coordinates
  // themselves - depending on the array identity would refetch the route on each keystroke.
  const waypoints = positions.map(([latitude, longitude]) => `${longitude},${latitude}`).join(';');

  useEffect(() => {
    setPoints([]);
    setLegs([]);
    setDistanceKm(null);
    if (!enabled || positions.length < 2) return;

    const controller = new AbortController();
    setLoading(true);
    void fetch(`https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson&steps=true`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Route unavailable')))
      .then((data: { routes?: OsrmRoute[] }) => {
        const route = data.routes?.[0];
        if (!route?.geometry?.coordinates?.length) return;
        setPoints(toLatLng(route.geometry.coordinates));
        // Steps within a leg repeat the junction they meet at, which costs nothing to draw.
        setLegs((route.legs || []).map((leg) => (leg.steps || []).flatMap((step) => toLatLng(step.geometry?.coordinates))));
        if (route.distance) setDistanceKm(Math.round(route.distance / 1000));
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [enabled, waypoints]);

  return { points, legs, distanceKm, loading };
};
