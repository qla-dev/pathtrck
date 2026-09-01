import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../../lib/cn';
import { STOP_COLORS, routeStopMarker } from './routeStopMarker';
import { routeLegs } from './routeLegs';

export type RoutePreviewStop = {
  label: string;
  position: [number, number];
  /** Pickups are drawn green and deliveries blue, matching the two form columns. */
  kind: 'pickup' | 'delivery';
  /** The stop's place type drawn inside the marker - a warehouse, a port, an airport. */
  icon: LucideIcon;
};

const FitStops = ({ bounds }: { bounds: [number, number][] }) => {
  const map = useMap();
  const key = bounds.map(([latitude, longitude]) => `${latitude},${longitude}`).join(';');
  useEffect(() => {
    if (bounds.length === 1) {
      map.setView(bounds[0], 9);
      return;
    }
    if (bounds.length > 1) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 11 });
    // The bounds array is rebuilt on every render, so the fit keys off the coordinates instead.
  }, [key, map]);
  return null;
};

/**
 * The route drawn small, above the "Show route" button on the Route step - enough to see at a
 * glance that the stops are in the order intended, without leaving the form for the full-screen
 * map. Scroll-wheel zoom stays off so scrolling the form past the map does not zoom it instead.
 */
export const RoutePreviewMap = ({
  stops,
  legs,
  className,
}: {
  stops: RoutePreviewStop[];
  /** The driven line cut at the stops, fetched by the caller - which needs its distance anyway. */
  legs: [number, number][][];
  className?: string;
}) => {
  const positions = useMemo(() => stops.map((stop) => stop.position), [stops]);
  const segments = routeLegs(positions, legs);
  const bounds = segments.length ? segments.flat() : positions;

  if (stops.length === 0) return null;

  return (
    // The height belongs on this wrapper, not on the map: index.css forces
    // `.leaflet-container { height: 100% }` after Tailwind's utilities, so a height class on the
    // map itself is overridden and the map collapses to nothing.
    <div className={cn('h-40 shrink-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800', className)}>
      <MapContainer
        center={positions[0]}
        zoom={7}
        scrollWheelZoom={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        <FitStops bounds={bounds} />
        {segments.map((segment, index) => (
          <Polyline
            key={index}
            positions={segment}
            pathOptions={{ color: STOP_COLORS[stops[index].kind], weight: 4, opacity: 0.9 }}
          />
        ))}
        {stops.map((stop, index) => (
          <Marker key={`${stop.kind}-${index}`} position={stop.position} icon={routeStopMarker(stop.kind, stop.icon, 22)} title={stop.label} />
        ))}
      </MapContainer>
    </div>
  );
};
