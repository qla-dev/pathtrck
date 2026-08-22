import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import { Loader2, Route, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { Language } from '../../types';
import { ui } from '../../i18n';

type RouteMapModalProps = {
  open: boolean;
  lang: Language;
  pickup: { label: string; position: [number, number] };
  delivery: { label: string; position: [number, number] };
  onClose: () => void;
};

const drivingDistanceEstimate = (from: [number, number], to: [number, number]) => {
  const radians = (value: number) => (value * Math.PI) / 180;
  const [fromLat, fromLon] = from;
  const [toLat, toLon] = to;
  const a = Math.sin(radians(toLat - fromLat) / 2) ** 2
    + Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(radians(toLon - fromLon) / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.18);
};

const FitRoute = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(points, { padding: [56, 56], maxZoom: 11 });
  }, [map, points]);
  return null;
};

export const RouteMapModal = ({ open, lang, pickup, delivery, onClose }: RouteMapModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const fallbackDistance = useMemo(() => drivingDistanceEstimate(pickup.position, delivery.position), [pickup.position, delivery.position]);
  const [points, setPoints] = useState<[number, number][]>([pickup.position, delivery.position]);
  const [distanceKm, setDistanceKm] = useState(fallbackDistance);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPoints([pickup.position, delivery.position]);
    setDistanceKm(fallbackDistance);
    if (!open) return;

    const controller = new AbortController();
    setLoading(true);
    const [fromLat, fromLon] = pickup.position;
    const [toLat, toLon] = delivery.position;
    void fetch(`https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=full&geometries=geojson`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Route unavailable')))
      .then((data: { routes?: Array<{ distance?: number; geometry?: { coordinates?: [number, number][] } }> }) => {
        const route = data.routes?.[0];
        if (!route?.geometry?.coordinates?.length) return;
        setPoints(route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]));
        if (route.distance) setDistanceKm(Math.round(route.distance / 1000));
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [delivery.position, fallbackDistance, open, pickup.position]);

  return (
    <AnimatePresence>
      {open && <motion.div className="fixed inset-0 z-[300] flex h-[100dvh] flex-col bg-white dark:bg-slate-950" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 px-5 dark:border-slate-800">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-primary leading-none">{u('postLoadModal.routeSummary', 'Route')}</p>
          <h2 className="truncate text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5">{pickup.label} → {delivery.label}</h2>
        </div>
        <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900"><X className="h-4 w-4" /></button>
      </header>

      <div className="relative min-h-0 flex-1">
        <MapContainer center={pickup.position} zoom={7} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          <FitRoute points={points} />
          <Polyline positions={points} pathOptions={{ color: '#0ea5e9', weight: 5, opacity: 0.9 }} />
          <Marker position={pickup.position} />
          <Marker position={delivery.position} />
        </MapContainer>

        <div className="absolute left-1/2 top-5 z-[1000] w-[min(720px,calc(100%-2rem))] -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-white/95 p-3 shadow-xl backdrop-blur dark:border-sky-900 dark:bg-slate-900/95">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><Route className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{u('landing.distance', 'Distance')}</p>
              <p className="text-lg font-black text-slate-900 dark:text-white">{distanceKm.toLocaleString()} km</p>
            </div>
            {loading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          </div>
        </div>
      </div>
      </motion.div>}
    </AnimatePresence>
  );
};
