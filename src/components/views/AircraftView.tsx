import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { AlertTriangle, LocateFixed, Maximize2, Minimize2, Plane, RefreshCw, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import type { Language } from '../../types';
import { api, type LiveAircraft } from '../../services/api';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';

type AircraftCategory = 'all' | 'passenger' | 'cargo' | 'military' | 'business' | 'general' | 'helicopter' | 'lighter';
const LOCKED_ZOOM = 6;

const CATEGORY_KEYS: Array<{ id: AircraftCategory; label: string; codes?: string[] }> = [
  { id: 'all', label: 'All categories' },
  { id: 'passenger', label: 'Passenger' },
  { id: 'cargo', label: 'Cargo' },
  { id: 'military', label: 'Military or government' },
  { id: 'business', label: 'Business jets' },
  { id: 'general', label: 'General aviation' },
  { id: 'helicopter', label: 'Helicopter', codes: ['A7'] },
  { id: 'lighter', label: 'Lighter-than-air', codes: ['B2'] },
];

const BUSINESS_TYPES = /^(C5|C6|C7|CL3|CL6|GLF|LJ|FA[057]|E5|E55|E75|HDJT|PRM1|BE4|H25)/i;
const CARGO_TEXT = /(cargo|freight|express|air transport|logistics|postal|parcel)/i;
const HELICOPTER_TEXT = /(helicopter|rotorcraft)/i;
const LIGHTER_TEXT = /(balloon|airship|lighter.than.air)/i;

const aircraftCategory = (aircraft: LiveAircraft): Exclude<AircraftCategory, 'all'> => {
  const text = `${aircraft.desc || ''} ${aircraft.ownOp || ''} ${aircraft.flight || ''}`;
  if ((Number(aircraft.dbFlags || 0) & 1) === 1) return 'military';
  if (aircraft.category === 'A7' || HELICOPTER_TEXT.test(text)) return 'helicopter';
  if (aircraft.category === 'B2' || LIGHTER_TEXT.test(text)) return 'lighter';
  if (CARGO_TEXT.test(text)) return 'cargo';
  if (BUSINESS_TYPES.test(aircraft.t || '') || /business jet/i.test(text)) return 'business';
  if (/^A[2-6]$/.test(aircraft.category || '') && aircraft.t) return 'passenger';
  return 'general';
};

const markerIcon = (aircraft: LiveAircraft, selected: boolean) => {
  const category = aircraftCategory(aircraft);
  const color = category === 'military' ? '#e11d48' : category === 'cargo' ? '#f97316' : category === 'helicopter' ? '#8b5cf6' : '#0284c7';
  return L.divIcon({
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<div style="width:30px;height:30px;display:flex;align-items:center;justify-content:center;transform:rotate(${Number(aircraft.track || 0)}deg);filter:drop-shadow(0 1px 2px rgba(15,23,42,.45))"><svg viewBox="0 0 24 24" width="${selected ? 30 : 25}" height="${selected ? 30 : 25}" fill="${color}" stroke="white" stroke-width="1.4"><path d="M12 2.5c.8 0 1.25.7 1.35 1.6l.45 5.2 6.25 3.65c.45.25.7.75.55 1.2l-.25.75-6.35-1.8.2 5.35 2.1 1.45v1.05L12 20l-4.3.95V19.9l2.1-1.45.2-5.35-6.35 1.8-.25-.75c-.15-.45.1-.95.55-1.2L10.2 9.3l.45-5.2c.1-.9.55-1.6 1.35-1.6Z"/></svg></div>`,
  });
};

const MapResize = () => {
  const map = useMap();
  useEffect(() => {
    const resize = () => map.invalidateSize();
    const timer = window.setTimeout(resize, 150);
    window.addEventListener('resize', resize);
    return () => { window.clearTimeout(timer); window.removeEventListener('resize', resize); };
  }, [map]);
  return null;
};

type ViewportBounds = { south: number; west: number; north: number; east: number };

const normalizeViewport = (bounds: ViewportBounds): ViewportBounds => {
  const south = Math.max(-90, bounds.south);
  const north = Math.min(90, bounds.north);
  if (bounds.east - bounds.west >= 360) return { south, west: -180, north, east: 180 };
  const wrap = (value: number) => ((value + 180) % 360 + 360) % 360 - 180;
  return { south, west: wrap(bounds.west), north, east: wrap(bounds.east) };
};

const MapObserver = ({ onViewportChange }: { onViewportChange: (bounds: ViewportBounds) => void }) => {
  const map = useMapEvents({
    moveend(event) {
      const bounds = event.target.getBounds();
      onViewportChange({ south: bounds.getSouth(), west: bounds.getWest(), north: bounds.getNorth(), east: bounds.getEast() });
    },
  });
  useEffect(() => {
    const bounds = map.getBounds();
    onViewportChange({ south: bounds.getSouth(), west: bounds.getWest(), north: bounds.getNorth(), east: bounds.getEast() });
  }, [map, onViewportChange]);
  return null;
};

export const AircraftView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const requestId = useRef(0);
  const traceRequestId = useRef(0);
  const [viewport, setViewport] = useState<ViewportBounds | null>(null);
  const [aircraft, setAircraft] = useState<LiveAircraft[]>([]);
  const [selectedHex, setSelectedHex] = useState<string | null>(null);
  const [category, setCategory] = useState<AircraftCategory>('all');
  const [query, setQuery] = useState('');
  const [minAltitude, setMinAltitude] = useState('');
  const [maxAltitude, setMaxAltitude] = useState('');
  const [airborneOnly, setAirborneOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [traceSegments, setTraceSegments] = useState<Array<Array<{ lat: number; lon: number }>>>([]);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const loadAircraft = useCallback(async () => {
    if (!viewport) return;
    const id = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const response = await api.aircraft.list(viewport);
      if (id !== requestId.current) return;
      setAircraft(response.data);
      setUpdatedAt(new Date());
    } catch (loadError) {
      if (id !== requestId.current) return;
      setError(loadError instanceof Error ? loadError.message : ui(lang, 'aircraft.error', 'Live aircraft could not be loaded.'));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [lang, viewport]);

  useEffect(() => { void loadAircraft(); }, [loadAircraft]);
  useEffect(() => {
    const timer = window.setInterval(() => void loadAircraft(), 15000);
    return () => window.clearInterval(timer);
  }, [loadAircraft]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
      window.setTimeout(() => mapRef.current?.invalidateSize(), 100);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const id = ++traceRequestId.current;
    setTraceSegments([]);
    setTraceError('');
    if (!selectedHex) {
      setTraceLoading(false);
      return;
    }
    setTraceLoading(true);
    api.aircraft.trace(selectedHex)
      .then((response) => { if (id === traceRequestId.current) setTraceSegments(response.data.segments); })
      .catch(() => { if (id === traceRequestId.current) setTraceError(ui(lang, 'aircraft.pathUnavailable', 'Aircraft path is temporarily unavailable.')); })
      .finally(() => { if (id === traceRequestId.current) setTraceLoading(false); });
  }, [lang, selectedHex]);

  const handleViewportChange = useCallback((bounds: ViewportBounds) => {
    const normalized = normalizeViewport(bounds);
    setViewport({
      south: Number(normalized.south.toFixed(3)), west: Number(normalized.west.toFixed(3)),
      north: Number(normalized.north.toFixed(3)), east: Number(normalized.east.toFixed(3)),
    });
  }, []);

  const filteredAircraft = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const min = minAltitude === '' ? null : Number(minAltitude);
    const max = maxAltitude === '' ? null : Number(maxAltitude);
    return aircraft.filter((item) => {
      if (category !== 'all' && aircraftCategory(item) !== category) return false;
      const altitude = item.alt_baro === 'ground' ? 0 : Number(item.alt_baro ?? item.alt_geom ?? 0);
      if (airborneOnly && item.alt_baro === 'ground') return false;
      if (min !== null && altitude < min) return false;
      if (max !== null && altitude > max) return false;
      return !needle || `${item.flight || ''} ${item.r || ''} ${item.t || ''} ${item.hex || ''} ${item.ownOp || ''}`.toLowerCase().includes(needle);
    });
  }, [airborneOnly, aircraft, category, maxAltitude, minAltitude, query]);

  const selected = aircraft.find((item) => item.hex === selectedHex) || null;
  const activeFilterCount = Number(category !== 'all') + Number(Boolean(minAltitude || maxAltitude)) + Number(airborneOnly);
  const clearFilters = () => { setCategory('all'); setQuery(''); setMinAltitude(''); setMaxAltitude(''); setAirborneOnly(false); };
  const locateMe = () => navigator.geolocation?.getCurrentPosition(({ coords }) => mapRef.current?.flyTo([coords.latitude, coords.longitude], LOCKED_ZOOM));
  const toggleFullscreen = async () => {
    if (document.fullscreenElement === containerRef.current) await document.exitFullscreen();
    else await containerRef.current?.requestFullscreen();
  };

  return (
    <div ref={containerRef} className="relative h-full min-h-0 overflow-hidden bg-slate-100 dark:bg-slate-950">
      <MapContainer ref={mapRef} center={[43.8563, 18.4131]} zoom={LOCKED_ZOOM} minZoom={LOCKED_ZOOM} maxZoom={LOCKED_ZOOM} zoomControl={false} scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false} boxZoom={false} keyboard={false} className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" subdomains={['a', 'b', 'c']} />
        <MapResize />
        <MapObserver onViewportChange={handleViewportChange} />
        {traceSegments.map((segment, index) => {
          const positions = segment.map((point) => [point.lat, point.lon] as L.LatLngTuple);
          return <Polyline key={`trace-shadow-${index}`} positions={positions} pathOptions={{ color: '#0f172a', weight: 7, opacity: 0.35, lineCap: 'round', lineJoin: 'round' }} interactive={false} />;
        })}
        {traceSegments.map((segment, index) => <Polyline key={`trace-${index}`} positions={segment.map((point) => [point.lat, point.lon] as L.LatLngTuple)} pathOptions={{ color: '#06b6d4', weight: 3.5, opacity: 0.95, lineCap: 'round', lineJoin: 'round' }} interactive={false} />)}
        {filteredAircraft.map((item) => (
          <Marker key={item.hex} position={[item.lat, item.lon]} icon={markerIcon(item, item.hex === selectedHex)} eventHandlers={{ click: () => setSelectedHex(item.hex) }} />
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] p-4">
        <div className="pointer-events-auto mx-auto max-w-6xl overflow-hidden rounded-2xl border border-white/60 bg-white/85 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/85">
          <div className="flex flex-wrap items-center gap-3 p-3">
            <div className="flex min-w-56 flex-1 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><Plane className="h-5 w-5" /></span>
              <div className="min-w-0">
                <p className="font-black text-slate-900 dark:text-white">{u('aircraft.title', 'Live aircraft')}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{filteredAircraft.length} {u('aircraft.inView', 'aircraft in view')}</p>
              </div>
              {loading && <RefreshCw className="h-4 w-4 animate-spin text-primary" />}
            </div>
            <div className="relative min-w-52 flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={u('aircraft.search', 'Callsign, registration, type or hex...')} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </div>
            <button type="button" onClick={() => setFiltersOpen((value) => !value)} className={cn('flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 text-xs font-bold', filtersOpen || activeFilterCount ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}><SlidersHorizontal className="h-4 w-4" />{u('common.filter', 'Filters')}{activeFilterCount > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] text-white">{activeFilterCount}</span>}</button>
            <button type="button" onClick={() => void loadAircraft()} title={u('aircraft.refresh', 'Refresh')} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:text-primary dark:border-slate-700 dark:text-slate-300"><RefreshCw className="h-4 w-4" /></button>
            <button type="button" onClick={() => void toggleFullscreen()} title={isFullscreen ? u('map.exitFullscreen', 'Exit fullscreen') : u('map.fullscreen', 'Fullscreen')} aria-label={isFullscreen ? u('map.exitFullscreen', 'Exit fullscreen') : u('map.fullscreen', 'Fullscreen')} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:text-primary dark:border-slate-700 dark:text-slate-300">{isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
          </div>

          {filtersOpen && (
            <div className="border-t border-slate-200 p-3 dark:border-slate-700">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {CATEGORY_KEYS.map((item) => <button type="button" key={item.id} onClick={() => setCategory(item.id)} className={cn('flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs font-bold transition-colors', category === item.id ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300')}><Plane className="h-3.5 w-3.5" />{u(`aircraft.category.${item.id}`, item.label)}</button>)}
              </div>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <label className="min-w-36 flex-1"><span className="mb-1 block text-[10px] font-bold text-slate-500">{u('aircraft.minAltitude', 'Minimum altitude (ft)')}</span><input type="number" min="0" value={minAltitude} onChange={(event) => setMinAltitude(event.target.value)} placeholder="0" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
                <label className="min-w-36 flex-1"><span className="mb-1 block text-[10px] font-bold text-slate-500">{u('aircraft.maxAltitude', 'Maximum altitude (ft)')}</span><input type="number" min="0" value={maxAltitude} onChange={(event) => setMaxAltitude(event.target.value)} placeholder="50000" className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></label>
                <button type="button" onClick={() => setAirborneOnly((value) => !value)} className={cn('h-10 cursor-pointer rounded-lg border px-4 text-xs font-bold', airborneOnly ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}>{u('aircraft.airborneOnly', 'Airborne only')}</button>
                <button type="button" onClick={clearFilters} className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-rose-400 px-3 text-xs font-bold text-rose-500"><Trash2 className="h-3.5 w-3.5" />{u('tracking.clearFilters', 'Clear filters')}</button>
              </div>
            </div>
          )}
          {error && <div className="flex items-center gap-2 border-t border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 dark:border-rose-900 dark:bg-rose-950/30"><AlertTriangle className="h-4 w-4" />{error}</div>}
        </div>
      </div>

      {selected && (
        <div className="absolute bottom-5 left-5 z-[500] w-[min(360px,calc(100%-40px))] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <button type="button" onClick={() => setSelectedHex(null)} className="absolute right-3 top-3 cursor-pointer text-slate-400 hover:text-slate-700"><X className="h-4 w-4" /></button>
          <div className="flex items-center gap-3 pr-6"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Plane className="h-5 w-5" /></span><div><p className="text-lg font-black text-slate-900 dark:text-white">{selected.flight?.trim() || selected.r || selected.hex.toUpperCase()}</p><p className="text-xs font-semibold text-slate-400">{selected.r || u('aircraft.unknownRegistration', 'Unknown registration')} · {selected.t || u('aircraft.unknownType', 'Unknown type')}</p></div></div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><span className="block text-[10px] font-bold uppercase text-slate-400">{u('aircraft.altitude', 'Altitude')}</span><strong className="text-slate-800 dark:text-white">{selected.alt_baro === 'ground' ? u('aircraft.ground', 'Ground') : `${Number(selected.alt_baro ?? selected.alt_geom ?? 0).toLocaleString()} ft`}</strong></div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><span className="block text-[10px] font-bold uppercase text-slate-400">{u('aircraft.speed', 'Ground speed')}</span><strong className="text-slate-800 dark:text-white">{selected.gs == null ? '—' : `${Math.round(selected.gs)} kt`}</strong></div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><span className="block text-[10px] font-bold uppercase text-slate-400">{u('aircraft.heading', 'Heading')}</span><strong className="text-slate-800 dark:text-white">{selected.track == null ? '—' : `${Math.round(selected.track)}°`}</strong></div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><span className="block text-[10px] font-bold uppercase text-slate-400">{u('aircraft.squawk', 'Squawk')}</span><strong className="text-slate-800 dark:text-white">{selected.squawk || '—'}</strong></div>
          </div>
          <p className="mt-3 flex items-center justify-between text-[10px] font-semibold text-slate-400"><span>{aircraftCategory(selected).replace(/^./, (value) => value.toUpperCase())}</span><span>{updatedAt ? `${u('aircraft.updated', 'Updated')} ${updatedAt.toLocaleTimeString()}` : ''}</span></p>
          {traceLoading && <p className="mt-2 text-[10px] font-semibold text-primary">{u('aircraft.pathLoading', 'Loading aircraft path...')}</p>}
          {traceError && <p className="mt-2 text-[10px] font-semibold text-rose-500">{traceError}</p>}
        </div>
      )}

      <button type="button" onClick={locateMe} title={u('tracking.locateMe', 'Locate me')} className="absolute bottom-3 right-3 z-[500] flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-2 border-black/20 bg-white text-slate-700 shadow"><LocateFixed className="h-4 w-4" /></button>
    </div>
  );
};
