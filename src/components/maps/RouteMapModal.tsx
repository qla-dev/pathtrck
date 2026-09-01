import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import { Loader2, Route, X, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { Language } from '../../types';
import { ui } from '../../i18n';
import { useRouteGeometry } from './useRouteGeometry';
import { STOP_COLORS, routeStopMarker } from './routeStopMarker';
import { routeLegs } from './routeLegs';

type RouteStop = {
  label: string;
  position: [number, number];
  /** Set by the post-load form, so a stop is marked by what kind of place it is and which side of
      the route it belongs to. Callers that only know two points fall back to leaflet's own pin. */
  kind?: 'pickup' | 'delivery';
  icon?: LucideIcon;
};

type RouteMapModalProps = {
  open: boolean;
  lang: Language;
  pickup: RouteStop;
  delivery: RouteStop;
  /** Stops driven between the first pickup and the last delivery, in visiting order. */
  waypoints?: RouteStop[];
  onClose: () => void;
};

const FitRoute = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(points, { padding: [56, 56], maxZoom: 11 });
  }, [map, points]);
  return null;
};

export const RouteMapModal = ({ open, lang, pickup, delivery, waypoints = [], onClose }: RouteMapModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const stops = useMemo(() => [pickup, ...waypoints, delivery], [delivery, pickup, waypoints]);
  const positions = useMemo(() => stops.map((stop) => stop.position), [stops]);
  const { points, legs, distanceKm, loading } = useRouteGeometry(positions, open);
  const segments = routeLegs(positions, legs);

  return (
    <AnimatePresence>
      {open && <motion.div className="fixed inset-0 z-[300] flex h-[100dvh] flex-col bg-white dark:bg-slate-950" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 px-5 dark:border-slate-800">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-primary leading-none">{u('postLoadModal.routeSummary', 'Route')}</p>
          <h2 className="truncate text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5">{stops.map((stop) => stop.label).join(' → ')}</h2>
        </div>
        <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900"><X className="h-4 w-4" /></button>
      </header>

      <div className="relative min-h-0 flex-1">
        <MapContainer center={pickup.position} zoom={7} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          {points.length >= 2 && <FitRoute points={points} />}
          {segments.map((segment, index) => (
            <Polyline
              key={index}
              positions={segment}
              // Each leg is drawn in the colour of the stop it leaves, so a run between two pickups
              // stays green and only turns blue once the goods are moving between drops.
              pathOptions={{ color: stops[index].kind ? STOP_COLORS[stops[index].kind!] : '#0ea5e9', weight: 5, opacity: 0.9 }}
            />
          ))}
          {stops.map((stop, index) => (
            <Marker
              key={`${stop.label}-${index}`}
              position={stop.position}
              title={stop.label}
              {...(stop.icon && stop.kind ? { icon: routeStopMarker(stop.kind, stop.icon, 30) } : {})}
            />
          ))}
        </MapContainer>

        <div className="absolute left-1/2 top-5 z-[1000] w-[min(720px,calc(100%-2rem))] -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-sky-900 dark:bg-slate-900/95">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><Route className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{u('landing.distance', 'Distance')}</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">{distanceKm === null ? '—' : `${distanceKm.toLocaleString()} km`}</p>
            </div>
            {loading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          </div>
        </div>
      </div>
      </motion.div>}
    </AnimatePresence>
  );
};
