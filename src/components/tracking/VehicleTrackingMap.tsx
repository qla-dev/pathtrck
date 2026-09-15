import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import { Truck, Search, UserRound, Building2, Package, ArrowRight, Gauge, LayoutGrid, MapPinOff, Handshake } from 'lucide-react';
import type { Language, Role } from '../../types';
import { api } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';
import { trackingMarkerIcon } from './trackingMapMarker';
import { mapLoadToPackage } from '../../lib/loadDetails';
import { trPackageStatus } from '../../i18n';

const COPY = {
  en: { own: 'My fleet', partner: 'Partner vehicle', otherOperator: 'Other operator', legend: 'Legend', all: 'All', loads: 'Loads', vehicles: 'Vehicles', search: 'Search registration, model, driver…', capacity: 'Capacity', aboard: 'On board', free: 'Free space', cargo: 'Loads on board', empty: 'No loads on board', noGps: 'Without location', none: 'No vehicles found', loading: 'Loading fleet…', error: 'Could not load fleet data.', retry: 'Retry', updated: 'Last position', specs: 'Vehicle specifications', driver: 'Driver', company: 'Company', unknown: 'Unknown', owner: 'Owner', documents: 'Documents' },
  bs: { own: 'Moja flota', partner: 'Partnersko vozilo', otherOperator: 'Drugi prevoznik', legend: 'Legenda', all: 'Sva', loads: 'Tereti', vehicles: 'Vozila', search: 'Traži registraciju, model, vozača…', capacity: 'Kapacitet', aboard: 'Utovareno', free: 'Slobodno', cargo: 'Tereti u vozilu', empty: 'Nema utovarenih tereta', noGps: 'Bez lokacije', none: 'Nema pronađenih vozila', loading: 'Učitavanje flote…', error: 'Podaci flote nisu dostupni.', retry: 'Pokušaj ponovo', updated: 'Zadnja lokacija', specs: 'Specifikacije vozila', driver: 'Vozač', company: 'Kompanija', unknown: 'Nepoznato', owner: 'Vlasnik', documents: 'Dokumenti' },
  de: { own: 'Eigene Flotte', partner: 'Partnerfahrzeug', otherOperator: 'Anderer Betreiber', legend: 'Legende', all: 'Alle', loads: 'Ladungen', vehicles: 'Fahrzeuge', search: 'Kennzeichen, Modell, Fahrer suchen…', capacity: 'Kapazität', aboard: 'Geladen', free: 'Verfügbar', cargo: 'Geladene Ladungen', empty: 'Keine Ladungen an Bord', noGps: 'Ohne Standort', none: 'Keine Fahrzeuge gefunden', loading: 'Flotte wird geladen…', error: 'Flottendaten konnten nicht geladen werden.', retry: 'Erneut versuchen', updated: 'Letzte Position', specs: 'Fahrzeugspezifikationen', driver: 'Fahrer', company: 'Unternehmen', unknown: 'Unbekannt', owner: 'Eigentümer', documents: 'Dokumente' },
  hr: { own: 'Moja flota', partner: 'Partnersko vozilo', otherOperator: 'Drugi prijevoznik', legend: 'Legenda', all: 'Sva', loads: 'Tereti', vehicles: 'Vozila', search: 'Traži registraciju, model, vozača…', capacity: 'Kapacitet', aboard: 'Utovareno', free: 'Slobodno', cargo: 'Tereti u vozilu', empty: 'Nema utovarenih tereta', noGps: 'Bez lokacije', none: 'Nema pronađenih vozila', loading: 'Učitavanje flote…', error: 'Podaci flote nisu dostupni.', retry: 'Pokušaj ponovno', updated: 'Zadnja lokacija', specs: 'Specifikacije vozila', driver: 'Vozač', company: 'Tvrtka', unknown: 'Nepoznato', owner: 'Vlasnik', documents: 'Dokumenti' },
  sr: { own: 'Moja flota', partner: 'Partnersko vozilo', otherOperator: 'Drugi prevoznik', legend: 'Legenda', all: 'Sva', loads: 'Tereti', vehicles: 'Vozila', search: 'Traži registraciju, model, vozača…', capacity: 'Kapacitet', aboard: 'Utovareno', free: 'Slobodno', cargo: 'Tereti u vozilu', empty: 'Nema utovarenih tereta', noGps: 'Bez lokacije', none: 'Nema pronađenih vozila', loading: 'Učitavanje flote…', error: 'Podaci flote nisu dostupni.', retry: 'Pokušaj ponovo', updated: 'Poslednja lokacija', specs: 'Specifikacije vozila', driver: 'Vozač', company: 'Kompanija', unknown: 'Nepoznato', owner: 'Vlasnik', documents: 'Dokumenti' },
};
export const vehicleMapCopy = (lang: Language) => COPY[lang as keyof typeof COPY] || COPY.en;
type RecordData = Record<string, unknown>;
const record = (value: unknown): RecordData => value && typeof value === 'object' ? value as RecordData : {};
export const vehiclePosition = (vehicle: RecordData) => {
  // The fleet list now carries only the newest fix as `latest_location`; a full trail still works.
  const latest = vehicle.latest_location && typeof vehicle.latest_location === 'object' ? [vehicle.latest_location as RecordData] : [];
  const locations = latest.length ? latest : Array.isArray(vehicle.locations) ? [...vehicle.locations] as RecordData[] : [];
  locations.sort((a, b) => (Date.parse(String(b.recorded_at)) || 0) - (Date.parse(String(a.recorded_at)) || 0) || Number(b.id) - Number(a.id));
  const location = locations[0];
  if (!location || location.latitude == null || location.longitude == null || location.latitude === '' || location.longitude === '') return null;
  const lat = Number(location.latitude), lng = Number(location.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180
    ? { point: [lat, lng] as [number, number], recordedAt: String(location.recorded_at || '') } : null;
};

const Bounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    const resize = () => map.invalidateSize();
    const observer = new ResizeObserver(resize); observer.observe(map.getContainer());
    resize();
    if (points.length) map.fitBounds(L.latLngBounds(points), { paddingTopLeft: [40, 160], paddingBottomRight: [40, 40], maxZoom: 12 });
    return () => observer.disconnect();
  }, [map, points]);
  return null;
};

const VehicleCard = ({ vehicle, loads, lang, cargoError, onOpenLoad, external, externalLabel }: { vehicle: RecordData; loads: RecordData[]; lang: Language; cargoError: boolean; onOpenLoad: (id: string) => void; external: boolean; externalLabel: string }) => {
  const t = vehicleMapCopy(lang);
  const capacity = Number(vehicle.capacity_kg) || 0;
  const weight = loads.reduce((sum, load) => sum + (Number(load.weight_kg) || 0), 0);
  const percentage = capacity > 0 ? Math.round(weight / capacity * 100) : null;
  const kg = (value: number) => `${value.toLocaleString(lang)} kg`;
  const location = vehiclePosition(vehicle);
  const stamp = location?.recordedAt ? new Date(location.recordedAt) : null;
  return <div className="w-[300px] max-w-[calc(100vw-5rem)] overflow-hidden rounded-2xl bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-100">
    <div className={`bg-gradient-to-br p-4 text-white ${external ? 'from-violet-500 to-fuchsia-600' : 'from-sky-500 to-cyan-600'}`}>
      {external && <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide"><Handshake className="h-3 w-3" />{externalLabel}</div>}
      <div className="flex items-center gap-3"><span className="rounded-xl bg-white/20 p-2.5"><Truck className="h-6 w-6" /></span><div><div className="text-lg font-black tracking-wide">{String(vehicle.registration_number || `#${vehicle.id}`)}</div><div className="text-xs opacity-80">{[vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' · ')}</div></div></div>
      <div className="mt-4 grid grid-cols-3 gap-2">{[[t.capacity, capacity ? kg(capacity) : '—'], [t.aboard, cargoError ? '—' : kg(weight)], [t.free, capacity && !cargoError ? kg(Math.max(0, capacity - weight)) : '—']].map(([label, value]) => <div key={label}><div className="text-[9px] font-bold uppercase opacity-75">{label}</div><div className="mt-1 text-xs font-black">{value}</div></div>)}</div>
      {percentage !== null && !cargoError && <div className="mt-3 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25"><div className={`h-full rounded-full ${percentage > 100 ? 'bg-rose-300' : 'bg-white'}`} style={{ width: `${Math.min(100, percentage)}%` }} /></div><span className="text-[10px] font-black">{percentage}%</span></div>}
    </div>
    <div className="max-h-[38vh] space-y-3 overflow-y-auto p-3">
      {[[UserRound, t.driver, record(vehicle.assigned_driver).name], [Building2, t.company, record(vehicle.company).name], [UserRound, t.owner, record(vehicle.owner).name]].map(([Icon, label, value]) => { const Glyph = Icon as typeof UserRound; return value ? <div key={String(label)} className="flex items-center gap-2 text-xs"><Glyph className="h-3.5 w-3.5 shrink-0 text-sky-500" /><span className="text-slate-400">{String(label)}</span><strong className="ml-auto truncate">{String(value)}</strong></div> : null; })}
      <details className="rounded-xl bg-slate-50 p-2.5 dark:bg-white/5"><summary className="cursor-pointer text-xs font-bold">{t.specs}</summary><div className="mt-2 space-y-1 text-xs">{[vehicle.vehicle_type, vehicle.capacity_m3 ? `${vehicle.capacity_m3} m³` : '', vehicle.vin ? `VIN: ${vehicle.vin}` : '', ...(Array.isArray(vehicle.features) ? vehicle.features : [])].filter(Boolean).map((value, index) => <div key={index}>{String(value)}</div>)}<div>{t.documents}: {Array.isArray(vehicle.documents) ? vehicle.documents.length : 0}</div></div></details>
      <div className="flex items-center gap-2 text-xs font-black"><Package className="h-4 w-4 text-sky-500" />{t.cargo}<span className="ml-auto rounded-full bg-sky-100 px-2 text-sky-700">{cargoError ? '—' : loads.length}</span></div>
      {cargoError ? <div role="alert" className="text-xs text-rose-500">{t.error}</div> : loads.length ? loads.map((load) => { const pkg = mapLoadToPackage(load, lang); return <button key={String(load.id)} onClick={() => onOpenLoad(String(load.id))} className="block w-full rounded-xl border border-slate-200 p-2.5 text-left transition hover:border-sky-400 hover:bg-sky-50 dark:border-slate-700 dark:hover:bg-sky-950"><div className="flex items-center justify-between gap-2 text-[10px] font-bold text-sky-600"><span>{pkg.trackingNumber || `#${load.id}`}</span><span>{trPackageStatus(lang, pkg.status)}</span></div><div className="my-2 flex items-center gap-2 text-xs font-bold"><span className="truncate">{pkg.origin}</span><ArrowRight className="h-3 w-3 shrink-0 text-sky-500" /><span className="truncate">{pkg.destination}</span></div><div className="text-[10px] text-slate-500">{kg(Number(load.weight_kg) || 0)}{load.cargo_type ? ` · ${load.cargo_type}` : ''}</div></button>; }) : <div className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">{t.empty}</div>}
      <div className="flex items-center gap-1 text-[9px] text-slate-400"><Gauge className="h-3 w-3" />{location ? `${t.updated}: ${stamp && !Number.isNaN(stamp.getTime()) ? stamp.toLocaleString(lang) : t.unknown}` : t.noGps}</div>
    </div>
  </div>;
};

/** Marker and legend colours: the viewer's own fleet, and everyone else's trucks they can see. */
const OWN_COLOR = '#0ea5e9';
const EXTERNAL_COLOR = '#8b5cf6';

const chipClass = (active: boolean) => `flex h-9 flex-[1_1_0px] shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-bold transition-all hover:-translate-y-0.5 ${active
  ? 'bg-white shadow-md ring-2 ring-current ring-offset-2 ring-offset-white/40 dark:bg-slate-900 dark:ring-offset-slate-900/40'
  : 'bg-white/25 backdrop-blur-md hover:bg-white/40 dark:bg-slate-900/25 dark:hover:bg-slate-900/40'}`;

export const VehicleTrackingMap = ({ lang, role, userId, companyIds, onOpenLoad, headerSlot }: { lang: Language; role: Role; userId?: number; companyIds: number[]; onOpenLoad: (id: string) => void; headerSlot?: HTMLElement | null }) => {
  const t = vehicleMapCopy(lang);
  const fleet = useApiList(api.vehicles.list, { per_page: 100 });
  const cargo = useApiList(api.loads.list, { per_page: 500, tracking: true, statuses: 'in_delivery' });
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRefs = useRef(new Map<string, L.Marker>());
  useEffect(() => { if (fleet.hasMore && !fleet.loading && !fleet.loadingMore && !fleet.error) void fleet.loadMore(); }, [fleet.hasMore, fleet.loading, fleet.loadingMore, fleet.error, fleet.loadMore]);
  useEffect(() => { if (cargo.hasMore && !cargo.loading && !cargo.loadingMore && !cargo.error) void cargo.loadMore(); }, [cargo.hasMore, cargo.loading, cargo.loadingMore, cargo.error, cargo.loadMore]);
  // The API already scopes the list - a superadmin gets every vehicle, a company its own plus partner
  // trucks carrying its loads, a driver the trucks they own or drive - so only the search narrows it.
  const vehicles = useMemo(() => fleet.items.filter((vehicle) => [vehicle.registration_number, vehicle.make, vehicle.model, record(vehicle.assigned_driver).name, record(vehicle.company).name]
    .join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase().trim())), [fleet.items, query]);
  // Not the viewer's: neither in their company nor owned or driven by them.
  const isExternal = (vehicle: RecordData) => !(companyIds.includes(Number(vehicle.company_id))
    || (Boolean(userId) && (Number(vehicle.owner_user_id) === userId || Number(vehicle.assigned_driver_user_id) === userId)));
  const externalLabel = role === 'superadmin' || role === 'master' ? t.otherOperator : t.partner;
  const ownCount = vehicles.filter((vehicle) => !isExternal(vehicle)).length;
  const points = useMemo(() => vehicles.flatMap((vehicle) => { const location = vehiclePosition(vehicle); return location ? [location.point] : []; }), [vehicles]);
  const cargoPending = Boolean(cargo.error) || cargo.loading || cargo.loadingMore || cargo.hasMore;
  const loadsFor = (vehicle: RecordData) => cargo.items.filter((load) => String(load.vehicle_id) === String(vehicle.id));
  // Located vehicles show their card as a map popup; the rest get it pinned bottom-left.
  const selectedVehicle = vehicles.find((vehicle) => String(vehicle.id) === selected && !vehiclePosition(vehicle));
  const card = (vehicle: RecordData) => <VehicleCard vehicle={vehicle} loads={loadsFor(vehicle)} lang={lang} cargoError={cargoPending} onOpenLoad={onOpenLoad} external={isExternal(vehicle)} externalLabel={externalLabel} />;
  const showAll = () => {
    setSelected(null);
    const map = mapRef.current;
    if (!map) return;
    map.closePopup();
    if (points.length) map.flyToBounds(L.latLngBounds(points), { paddingTopLeft: [40, 160], paddingBottomRight: [40, 40], maxZoom: 12, duration: 0.6 });
  };
  const focusVehicle = (vehicle: RecordData) => {
    const id = String(vehicle.id);
    if (selected === id) { showAll(); return; }
    setSelected(id);
    const map = mapRef.current, location = vehiclePosition(vehicle);
    if (!map) return;
    map.closePopup();
    if (!location) return;
    map.once('moveend', () => markerRefs.current.get(id)?.openPopup());
    map.flyTo(location.point, Math.max(map.getZoom(), 9), { duration: 0.6 });
  };
  const headerChips = <>
    <button type="button" aria-pressed={selected === null} onClick={showAll} className={`${chipClass(selected === null)} border-slate-400 text-slate-700 dark:text-slate-200`}><LayoutGrid className="h-3.5 w-3.5 shrink-0" /><span>{t.all}</span><span className="opacity-70">{vehicles.length}</span></button>
    {vehicles.map((vehicle) => {
      const id = String(vehicle.id), located = Boolean(vehiclePosition(vehicle));
      return <button key={id} type="button" aria-pressed={selected === id} title={located ? undefined : t.noGps} onClick={() => focusVehicle(vehicle)} className={`${chipClass(selected === id)} ${located ? (isExternal(vehicle) ? 'border-violet-400 text-violet-700 dark:text-violet-300' : 'border-sky-400 text-sky-700 dark:text-sky-300') : 'border-dashed border-slate-400 text-slate-500 dark:text-slate-400'}`}>
        {located ? <Truck className="h-3.5 w-3.5 shrink-0" /> : <MapPinOff className="h-3.5 w-3.5 shrink-0" />}<span>{String(vehicle.registration_number || `#${id}`)}</span>{!cargoPending && <span className="opacity-70">{loadsFor(vehicle).length}</span>}
      </button>;
    })}
  </>;
  return <div className="absolute inset-0 z-0">
    {headerSlot && createPortal(headerChips, headerSlot)}
    <MapContainer ref={mapRef} center={[48.5, 14.8]} zoom={5} zoomControl={false} className="h-full w-full">
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      <ZoomControl position="bottomright" /><Bounds points={points} />
      {vehicles.map((vehicle) => { const id = String(vehicle.id), location = vehiclePosition(vehicle); if (!location) return null; return <Marker key={id} position={location.point} title={String(vehicle.registration_number || '')} icon={trackingMarkerIcon(String(vehicle.transport_type || 'road'), 'Booked', isExternal(vehicle) ? EXTERNAL_COLOR : OWN_COLOR)}
        ref={(marker) => { if (marker) markerRefs.current.set(id, marker); else markerRefs.current.delete(id); }}
        eventHandlers={{ mouseover: (event) => event.target.openPopup(), popupopen: () => setSelected(id), popupclose: () => setSelected((current) => current === id ? null : current) }}><Popup maxWidth={320} minWidth={280} autoPanPaddingTopLeft={[20, 160]} autoPanPaddingBottomRight={[20, 30]}>{card(vehicle)}</Popup></Marker>; })}
    </MapContainer>
    <div className="absolute left-4 right-4 top-[82px] z-[1000] flex flex-wrap items-center gap-3 rounded-2xl border border-white/60 bg-white/90 p-3 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90">
      <Search className="h-4 w-4 text-sky-500" /><input aria-label={t.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} className="min-w-0 flex-1 bg-transparent text-sm outline-none dark:text-white" /><span className="text-xs font-bold text-sky-600">{vehicles.length} {t.vehicles.toLocaleLowerCase()}</span>
      {(fleet.loading || fleet.loadingMore) && <span className="text-xs text-slate-500">{t.loading}</span>}
      {(fleet.error || cargo.error) && <button className="text-xs text-rose-600" onClick={() => { void fleet.refresh(); void cargo.refresh(); }}>{t.error} {t.retry}</button>}
      {!fleet.loading && !fleet.error && vehicles.length === 0 && <span className="text-xs text-slate-500">{t.none}</span>}
    </div>
    <div className="absolute bottom-6 left-4 z-[1000] min-w-40 rounded-xl border border-white/60 bg-white/90 px-3 py-2 text-[11px] font-bold text-slate-700 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-slate-900/90 dark:text-slate-200">
      <div className="mb-1 text-[9px] uppercase tracking-wider text-slate-400">{t.legend}</div>
      {([[OWN_COLOR, t.own, ownCount], [EXTERNAL_COLOR, externalLabel, vehicles.length - ownCount]] as const).map(([color, label, count]) => (
        <div key={label} className="flex items-center gap-2 py-0.5"><span className="h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white dark:ring-slate-900" style={{ background: color }} />{label}<span className="ml-auto pl-3 text-slate-400">{count}</span></div>
      ))}
    </div>
    {selectedVehicle && <div className="absolute bottom-28 left-4 z-[1001] overflow-hidden rounded-2xl shadow-2xl"><button aria-label="Close" onClick={() => setSelected(null)} className="absolute right-2 top-1 text-xl text-white">×</button>{card(selectedVehicle)}</div>}
  </div>;
};
