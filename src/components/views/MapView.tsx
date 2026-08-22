import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MapPin, Search } from 'lucide-react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

import { Language } from '../../types';
import { ui } from '../../i18n';
import { useApiList } from '../../hooks/useApiList';
import { useLocationAutocomplete } from '../../hooks/useLocationAutocomplete';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { api } from '../../services/api';
import { LocationSearchResult } from '../../services/locationSearch';

const MapViewport = ({ result }: { result: LocationSearchResult | null }) => {
  const map = useMap();
  useEffect(() => {
    if (result) map.flyTo([result.latitude, result.longitude], 14, { duration: 0.8 });
  }, [map, result]);
  return null;
};

export const MapView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const loads = useApiList(api.loads.list, { per_page: 500 });
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<LocationSearchResult | null>(null);
  const { results, loading, isOpen, open, close, select } = useLocationAutocomplete(query);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  useOutsideClick(searchBoxRef, close, isOpen);

  const stops = useMemo(() => loads.items.flatMap((load) => {
    const loadStops = Array.isArray(load.stops) ? load.stops as Array<Record<string, unknown>> : [];
    return loadStops.flatMap((stop) => {
      if (stop.latitude === null || stop.latitude === undefined || stop.latitude === '' || stop.longitude === null || stop.longitude === undefined || stop.longitude === '') return [];
      const latitude = Number(stop.latitude);
      const longitude = Number(stop.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
      return [{
        id: `${load.id}-${stop.id || stop.position}`,
        latitude,
        longitude,
        title: String(load.title || load.public_id || load.id),
        location: String(stop.address || stop.city || ''),
        type: String(stop.type || ''),
      }];
    });
  }), [loads.items]);

  const chooseResult = (result: LocationSearchResult) => {
    select(result.label);
    setSelected(result);
    setQuery(result.label);
  };

  return (
    <div className="relative h-full min-h-0 overflow-hidden bg-white dark:bg-slate-900">
      <MapContainer center={[43.8563, 18.4131]} zoom={7} className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        <MapViewport result={selected} />
        {selected && <Marker position={[selected.latitude, selected.longitude]}><Popup>{selected.label}</Popup></Marker>}
        {stops.map((stop) => (
          <Marker key={stop.id} position={[stop.latitude, stop.longitude]}>
            <Popup><strong>{stop.title}</strong><br />{stop.type}: {stop.location}</Popup>
          </Marker>
        ))}
      </MapContainer>

      <div ref={searchBoxRef} className="absolute left-1/2 top-5 z-[1000] w-[min(720px,calc(100%-2rem))] -translate-x-1/2">
        <div className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} onFocus={open} placeholder={u('map.searchAddress', 'Search city, street or address')} className="h-12 w-full rounded-xl border-0 bg-slate-50 pl-11 pr-11 text-sm font-semibold outline-none dark:bg-slate-950 dark:text-white" />
          {loading && <Loader2 className="absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-primary" />}
        </div>
        {isOpen && (
          <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            {results.map((result) => (
              <button key={result.id} type="button" onClick={() => chooseResult(result)} className="flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-3 text-left text-sm hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{result.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
