import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { AlertTriangle, Anchor, LocateFixed, Maximize2, Minimize2, RefreshCw, Search, Ship, SlidersHorizontal, Trash2, X } from 'lucide-react';
import type { Language } from '../../types';
import { api, type LiveVessel } from '../../services/api';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';

type Viewport = { south: number; west: number; north: number; east: number };
type VesselCategory = 'all' | 'cargo' | 'tanker' | 'passenger' | 'fishing' | 'tug' | 'pleasure' | 'fast' | 'other';
const LOCKED_ZOOM = 6;

const normalizeViewport = (bounds: Viewport): Viewport => {
  const south = Math.max(-90, bounds.south);
  const north = Math.min(90, bounds.north);
  if (bounds.east - bounds.west >= 360) return { south, west: -180, north, east: 180 };
  const wrap = (value: number) => ((value + 180) % 360 + 360) % 360 - 180;
  return { south, west: wrap(bounds.west), north, east: wrap(bounds.east) };
};

const CATEGORIES: Array<{ id: VesselCategory; label: string }> = [
  { id: 'all', label: 'All vessels' }, { id: 'cargo', label: 'Cargo' }, { id: 'tanker', label: 'Tankers' },
  { id: 'passenger', label: 'Passenger' }, { id: 'fishing', label: 'Fishing' }, { id: 'tug', label: 'Tugs' },
  { id: 'pleasure', label: 'Pleasure craft' }, { id: 'fast', label: 'High-speed craft' }, { id: 'other', label: 'Other' },
];

const vesselCategory = (type?: number): Exclude<VesselCategory, 'all'> => {
  const value = Number(type || 0);
  if (value === 30) return 'fishing';
  if (value === 31 || value === 32 || value === 52) return 'tug';
  if (value >= 40 && value < 50) return 'fast';
  if (value >= 60 && value < 70) return 'passenger';
  if (value >= 70 && value < 80) return 'cargo';
  if (value >= 80 && value < 90) return 'tanker';
  if (value === 36 || value === 37) return 'pleasure';
  return 'other';
};

const vesselIcon = (vessel: LiveVessel, selected: boolean) => {
  const category = vesselCategory(vessel.ship_type);
  const color = category === 'cargo' ? '#f97316' : category === 'tanker' ? '#e11d48' : category === 'passenger' ? '#8b5cf6' : '#0284c7';
  return L.divIcon({
    className: '', iconSize: [38, 32], iconAnchor: [19, 16],
    html: `<div style="width:38px;height:32px;display:flex;align-items:center;justify-content:center;transform:rotate(${Number(vessel.heading ?? vessel.course ?? 0) - 90}deg);filter:drop-shadow(0 1px 2px rgba(15,23,42,.55))"><svg viewBox="0 0 34 32" width="${selected ? 38 : 31}" height="${selected ? 32 : 27}" aria-hidden="true"><path d="M2.5 17h28L24 26H9L2.5 17Z" fill="${color}" stroke="white" stroke-width="2" stroke-linejoin="round"/><path d="M8 17V10h11l7 7H8Z" fill="${color}" stroke="white" stroke-width="2" stroke-linejoin="round"/><path d="M12 10V6h6v4M11.5 13.5h2M16 13.5h2M20.5 13.5h2" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round"/><path d="M8 28h15" fill="none" stroke="white" stroke-width="1.6" stroke-linecap="round" opacity=".85"/></svg></div>`,
  });
};

const MapSupport = ({ onViewport }: { onViewport: (bounds: Viewport) => void }) => {
  const map = useMapEvents({ moveend: (event) => { const b = event.target.getBounds(); onViewport({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() }); } });
  useEffect(() => { const b = map.getBounds(); onViewport({ south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() }); const timer = window.setTimeout(() => map.invalidateSize(), 100); return () => window.clearTimeout(timer); }, [map, onViewport]);
  return null;
};

export const VesselView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const requestId = useRef(0);
  const centeredSearchRef = useRef('');
  const [viewport, setViewport] = useState<Viewport | null>(null);
  const [vessels, setVessels] = useState<LiveVessel[]>([]);
  const [selectedMmsi, setSelectedMmsi] = useState<string | null>(null);
  const [category, setCategory] = useState<VesselCategory>('all');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [movingOnly, setMovingOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const updateViewport = useCallback((bounds: Viewport) => {
    const normalized = normalizeViewport(bounds);
    setViewport({ south: Number(normalized.south.toFixed(3)), west: Number(normalized.west.toFixed(3)), north: Number(normalized.north.toFixed(3)), east: Number(normalized.east.toFixed(3)) });
  }, []);
  const load = useCallback(async () => {
    if (!viewport) return;
    const id = ++requestId.current; setLoading(true); setError('');
    try { const response = await api.vessels.list({ ...viewport, search: debouncedQuery || undefined }); if (id === requestId.current) setVessels(response.data); }
    catch (reason) { if (id === requestId.current) setError(reason instanceof Error ? reason.message : ui(lang, 'vessels.error', 'Live vessels could not be loaded.')); }
    finally { if (id === requestId.current) setLoading(false); }
  }, [debouncedQuery, lang, viewport]);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { const timer = window.setInterval(() => void load(), 8000); return () => window.clearInterval(timer); }, [load]);
  useEffect(() => {
    const handleFullscreenChange = () => { setIsFullscreen(document.fullscreenElement === containerRef.current); window.setTimeout(() => mapRef.current?.invalidateSize(), 100); };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const visible = useMemo(() => vessels.filter((vessel) => {
    if (category !== 'all' && vesselCategory(vessel.ship_type) !== category) return false;
    if (movingOnly && Number(vessel.speed || 0) <= 0.5) return false;
    const needle = query.trim().toLowerCase();
    return !needle || `${vessel.name || ''} ${vessel.mmsi} ${vessel.callsign || ''} ${vessel.destination || ''}`.toLowerCase().includes(needle);
  }), [category, movingOnly, query, vessels]);
  const selected = vessels.find((vessel) => vessel.mmsi === selectedMmsi) || null;
  useEffect(() => {
    if (!debouncedQuery) {
      centeredSearchRef.current = '';
      return;
    }
    if (vessels.length !== 1) return;
    const [result] = vessels;
    const resultKey = `${debouncedQuery}:${result.mmsi}`;
    if (centeredSearchRef.current === resultKey) return;
    centeredSearchRef.current = resultKey;
    setSelectedMmsi(result.mmsi);
    mapRef.current?.flyTo([result.lat, result.lon], LOCKED_ZOOM);
  }, [debouncedQuery, vessels]);
  const locate = () => navigator.geolocation?.getCurrentPosition(({ coords }) => mapRef.current?.flyTo([coords.latitude, coords.longitude], LOCKED_ZOOM));
  const toggleFullscreen = async () => {
    if (document.fullscreenElement === containerRef.current) await document.exitFullscreen();
    else await containerRef.current?.requestFullscreen();
  };
  const clear = () => { setCategory('all'); setQuery(''); setMovingOnly(false); };

  return <div ref={containerRef} className="relative h-full min-h-0 overflow-hidden bg-slate-100 dark:bg-slate-950">
    <MapContainer ref={mapRef} center={[43.4, 16.4]} zoom={LOCKED_ZOOM} minZoom={LOCKED_ZOOM} maxZoom={LOCKED_ZOOM} zoomControl={false} scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false} boxZoom={false} keyboard={false} className="h-full w-full">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" subdomains={['a','b','c']} />
      <MapSupport onViewport={updateViewport} />
      {visible.map((vessel) => <Marker key={vessel.mmsi} position={[vessel.lat, vessel.lon]} icon={vesselIcon(vessel, selectedMmsi === vessel.mmsi)} eventHandlers={{ click: () => setSelectedMmsi(vessel.mmsi) }} />)}
    </MapContainer>
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] p-4"><div className="pointer-events-auto mx-auto max-w-6xl overflow-hidden rounded-2xl border border-white/60 bg-white/85 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/85">
      <div className="flex flex-wrap items-center gap-3 p-3">
        <div className="flex min-w-56 flex-1 items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white"><Ship className="h-5 w-5" /></span><div><p className="font-black text-slate-900 dark:text-white">{u('vessels.title','Live vessels')}</p><p className="text-[10px] font-bold uppercase text-slate-400">{visible.length} {u('vessels.inView','vessels in view')}</p></div>{loading && <RefreshCw className="h-4 w-4 animate-spin text-primary" />}</div>
        <div className="relative min-w-52 flex-1 sm:max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setDebouncedQuery(e.currentTarget.value.trim()); }} autoComplete="off" aria-label={u('vessels.search','Name, MMSI, call sign or destination...')} placeholder={u('vessels.search','Name, MMSI, call sign or destination...')} className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></div>
        <button type="button" onClick={() => setFiltersOpen((value) => !value)} className={cn('flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-bold', filtersOpen || category !== 'all' || movingOnly ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}><SlidersHorizontal className="h-4 w-4" />{u('common.filter','Filters')}</button>
        <button type="button" onClick={() => void load()} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"><RefreshCw className="h-4 w-4" /></button>
        <button type="button" onClick={() => void toggleFullscreen()} title={isFullscreen ? u('map.exitFullscreen','Exit fullscreen') : u('map.fullscreen','Fullscreen')} aria-label={isFullscreen ? u('map.exitFullscreen','Exit fullscreen') : u('map.fullscreen','Fullscreen')} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300">{isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
      </div>
      {filtersOpen && <div className="border-t border-slate-200 p-3 dark:border-slate-700"><div className="flex gap-2 overflow-x-auto pb-2">{CATEGORIES.map((item) => <button type="button" key={item.id} onClick={() => setCategory(item.id)} className={cn('flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-bold', category === item.id ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300')}><Ship className="h-3.5 w-3.5" />{u(`vessels.category.${item.id}`,item.label)}</button>)}</div><div className="mt-2 flex gap-2"><button type="button" onClick={() => setMovingOnly((value) => !value)} className={cn('h-10 rounded-lg border px-4 text-xs font-bold', movingOnly ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}>{u('vessels.movingOnly','Moving only')}</button><button type="button" onClick={clear} className="flex h-10 items-center gap-2 rounded-lg border border-rose-400 px-3 text-xs font-bold text-rose-500"><Trash2 className="h-3.5 w-3.5" />{u('tracking.clearFilters','Clear filters')}</button></div></div>}
      {error && <div className="flex items-center gap-2 border-t border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600"><AlertTriangle className="h-4 w-4" />{error}</div>}
    </div></div>
    {selected && <div className="absolute bottom-5 left-5 z-[500] w-[min(360px,calc(100%-40px))] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900"><button type="button" onClick={() => setSelectedMmsi(null)} className="absolute right-3 top-3 text-slate-400"><X className="h-4 w-4" /></button><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Anchor className="h-5 w-5" /></span><div><p className="text-lg font-black dark:text-white">{selected.name || selected.mmsi}</p><p className="text-xs font-semibold text-slate-400">MMSI {selected.mmsi}{selected.callsign ? ` · ${selected.callsign}` : ''}</p></div></div><div className="mt-4 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><span className="block text-[10px] font-bold uppercase text-slate-400">{u('vessels.speed','Speed')}</span><strong className="dark:text-white">{selected.speed == null ? '—' : `${selected.speed.toFixed(1)} kt`}</strong></div><div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><span className="block text-[10px] font-bold uppercase text-slate-400">{u('vessels.course','Course')}</span><strong className="dark:text-white">{selected.course == null ? '—' : `${Math.round(selected.course)}°`}</strong></div></div>{selected.destination && <p className="mt-3 text-xs text-slate-500">{u('vessels.destination','Destination')}: <strong>{selected.destination}</strong></p>}</div>}
    <button type="button" onClick={locate} title={u('tracking.locateMe','Locate me')} className="absolute bottom-3 right-3 z-[500] flex h-9 w-9 items-center justify-center rounded-lg border-2 border-black/20 bg-white text-slate-700 shadow"><LocateFixed className="h-4 w-4" /></button>
  </div>;
};
