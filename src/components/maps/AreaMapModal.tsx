import { useEffect, useState } from 'react';
import { Check, Loader2, MapPin, Radar, Search, X } from 'lucide-react';
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { latLng } from 'leaflet';
import { AnimatePresence, motion } from 'motion/react';

import { Language } from '../../types';
import { ui } from '../../i18n';
import { useLocationAutocomplete } from '../../hooks/useLocationAutocomplete';
import { LocationSearchResult, reverseLocation } from '../../services/locationSearch';
import { Button } from '../ui/Button';

type AreaMapModalProps = {
  open: boolean;
  lang: Language;
  title: string;
  initialQuery?: string;
  initialPosition?: [number, number] | null;
  initialRadiusKm?: number;
  onClose: () => void;
  onSelect: (location: LocationSearchResult, radiusKm: number) => void;
};

const RADIUS_PRESETS_KM = [10, 25, 50, 100, 200];
const DEFAULT_POSITION: [number, number] = [43.8563, 18.4131];

// Unlike the single-address picker, the viewport has to follow the radius as well as the centre -
// widening the circle past the edge of the map is what makes an area feel picked rather than typed.
const AreaViewport = ({ position, radiusKm }: { position: [number, number]; radiusKm: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyToBounds(latLng(position).toBounds(radiusKm * 1000 * 2.6), { duration: 0.7 });
  }, [map, position, radiusKm]);
  return null;
};

const AreaSelection = ({ onSelect }: { onSelect: (latitude: number, longitude: number) => void }) => {
  useMapEvents({ click: (event) => onSelect(event.latlng.lat, event.latlng.lng) });
  return null;
};

export const AreaMapModal = ({ open, lang, title, initialQuery = '', initialPosition, initialRadiusKm = 25, onClose, onSelect }: AreaMapModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState<LocationSearchResult | null>(null);
  const [position, setPosition] = useState<[number, number]>(initialPosition || DEFAULT_POSITION);
  const [radiusKm, setRadiusKm] = useState(initialRadiusKm);
  const [mapPointLoading, setMapPointLoading] = useState(false);
  const { results, loading, isOpen, open: openSuggestions, close, select } = useLocationAutocomplete(query);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setSelected(null);
    setPosition(initialPosition || DEFAULT_POSITION);
    setRadiusKm(initialRadiusKm);
  }, [initialPosition, initialQuery, initialRadiusKm, open]);

  const locationToUse = selected || results[0] || null;

  const selectResult = (result: LocationSearchResult) => {
    select(result.label);
    setSelected(result);
    setPosition([result.latitude, result.longitude]);
    setQuery(result.label);
  };

  const selectMapPoint = (latitude: number, longitude: number) => {
    setPosition([latitude, longitude]);
    setMapPointLoading(true);
    void reverseLocation(latitude, longitude)
      .then((result) => {
        select(result.label);
        setSelected(result);
        setQuery(result.label);
      })
      .catch(() => setSelected({ id: `${latitude}-${longitude}`, label: query || `${latitude}, ${longitude}`, latitude, longitude, city: '', countryCode: '' }))
      .finally(() => setMapPointLoading(false));
  };

  return (
    <AnimatePresence>
      {open && <motion.div className="fixed inset-0 z-[300] flex h-[100dvh] flex-col bg-white dark:bg-slate-950" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 px-5 dark:border-slate-800">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-primary leading-none">{u('map.chooseArea', 'Choose area')}</p>
          <h2 className="truncate text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5">{title}</h2>
        </div>
        <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="relative min-h-0 flex-1">
        <MapContainer center={position} zoom={9} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          <AreaViewport position={position} radiusKm={radiusKm} />
          <AreaSelection onSelect={selectMapPoint} />
          <Circle
            center={position}
            radius={radiusKm * 1000}
            pathOptions={{ color: '#f97316', weight: 2, dashArray: '8 8', fillColor: '#f97316', fillOpacity: 0.12 }}
          />
          <Marker position={position} />
        </MapContainer>

        <div className="absolute left-1/2 top-5 z-[1000] w-[min(720px,calc(100%-2rem))] -translate-x-1/2">
          <div className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelected(null);
              }}
              onFocus={openSuggestions}
              placeholder={u('map.searchArea', 'Search a city or region')}
              className="h-12 w-full rounded-xl border-0 bg-slate-50 pl-11 pr-11 text-sm font-semibold outline-none dark:bg-slate-950 dark:text-white"
            />
            {(loading || mapPointLoading) && <Loader2 className="absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-primary" />}
          </div>
          {isOpen && (
            <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              {results.map((result) => (
                <button key={result.id} type="button" onClick={() => selectResult(result)} className="flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{result.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="absolute bottom-6 left-1/2 z-[1000] w-[min(560px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <div className="flex items-center justify-between gap-3">
            <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-orange-500">
              <Radar className="h-4 w-4" />
              {u('map.areaRadius', 'Search radius')}
            </p>
            <p className="text-sm font-black text-slate-900 dark:text-white">{radiusKm} km</p>
          </div>
          <input
            type="range"
            min={5}
            max={300}
            step={5}
            value={radiusKm}
            onChange={(event) => setRadiusKm(Number(event.target.value))}
            className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-orange-500 dark:bg-slate-700"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {RADIUS_PRESETS_KM.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setRadiusKm(preset)}
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-bold transition-colors ${radiusKm === preset ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-orange-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}
              >
                {preset} km
              </button>
            ))}
          </div>
        </div>
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
        <p className="min-w-0 truncate text-sm text-slate-500">
          {locationToUse ? `${locationToUse.label} · ${radiusKm} km` : u('map.areaClickHint', 'Search or click the map to centre your area, then set the radius.')}
        </p>
        <Button disabled={!locationToUse || loading || mapPointLoading} onClick={() => locationToUse && onSelect(locationToUse, radiusKm)} className="shrink-0 gap-2">
          <Check className="h-4 w-4" /> {u('map.useArea', 'Use area')}
        </Button>
      </footer>
      </motion.div>}
    </AnimatePresence>
  );
};
