import { useEffect, useState } from 'react';
import { Check, Loader2, MapPin, Search, X } from 'lucide-react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';

import { Language } from '../../types';
import { ui } from '../../i18n';
import { useLocationAutocomplete } from '../../hooks/useLocationAutocomplete';
import { LocationSearchResult, reverseLocation } from '../../services/locationSearch';
import { Button } from '../ui/Button';

type AddressMapModalProps = {
  open: boolean;
  lang: Language;
  title: string;
  initialQuery?: string;
  initialPosition?: [number, number] | null;
  onClose: () => void;
  onSelect: (location: LocationSearchResult) => void;
};

const MapViewport = ({ position }: { position: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(position, 15, { duration: 0.8 });
  }, [map, position]);
  return null;
};

const MapSelection = ({ onSelect }: { onSelect: (latitude: number, longitude: number) => void }) => {
  useMapEvents({ click: (event) => onSelect(event.latlng.lat, event.latlng.lng) });
  return null;
};

export const AddressMapModal = ({ open, lang, title, initialQuery = '', initialPosition, onClose, onSelect }: AddressMapModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const defaultPosition: [number, number] = initialPosition || [43.8563, 18.4131];
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState<LocationSearchResult | null>(null);
  const [position, setPosition] = useState<[number, number]>(defaultPosition);
  const [mapPointLoading, setMapPointLoading] = useState(false);
  const { results, loading, isOpen, open: openSuggestions, close, select } = useLocationAutocomplete(query);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setSelected(null);
    setPosition(initialPosition || [43.8563, 18.4131]);
  }, [initialPosition, initialQuery, open]);

  if (!open) return null;

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
    <div className="fixed inset-0 z-[300] flex h-[100dvh] flex-col bg-white dark:bg-slate-950">
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 px-5 dark:border-slate-800">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-primary leading-none">{u('map.chooseLocation', 'Choose location')}</p>
          <h2 className="truncate text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5">{title}</h2>
        </div>
        <button type="button" onClick={onClose} className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="relative min-h-0 flex-1">
        <MapContainer center={position} zoom={initialPosition ? 15 : 7} className="h-full w-full">
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          <MapViewport position={position} />
          <MapSelection onSelect={selectMapPoint} />
          {(selected || initialPosition) && <Marker position={position} />}
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
              placeholder={u('map.searchAddress', 'Search city, street or address')}
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
      </div>

      <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
        <p className="min-w-0 truncate text-sm text-slate-500">{locationToUse?.label || u('map.clickHint', 'Search or click the map to select an exact location.')}</p>
        <Button disabled={!locationToUse || loading || mapPointLoading} onClick={() => locationToUse && onSelect(locationToUse)} className="shrink-0 gap-2">
          <Check className="h-4 w-4" /> {u('map.useLocation', 'Use location')}
        </Button>
      </footer>
    </div>
  );
};
