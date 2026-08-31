import { useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';
import { divIcon } from 'leaflet';
import {
  ArrowRight,
  Boxes,
  CalendarClock,
  Coins,
  MapPin,
  Package,
  Plane,
  Radio,
  Ship,
  TrainFront,
  Truck,
  Warehouse as WarehouseIcon,
  type LucideIcon,
} from 'lucide-react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { LANDING_DEMO_LOADS, type DemoLoad } from './landingDemoLoads';

const TRANSPORT_ICONS: Record<string, LucideIcon> = {
  road: Truck,
  air: Plane,
  sea: Ship,
  rail: TrainFront,
  warehouse: WarehouseIcon,
};

type Stop = Record<string, unknown>;

const stopsOf = (load: DemoLoad): Stop[] => (Array.isArray(load.stops) ? (load.stops as Stop[]) : []);

const positionsOf = (load: DemoLoad): [number, number][] =>
  stopsOf(load)
    .map((stop) => [Number(stop.latitude), Number(stop.longitude)] as [number, number])
    .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

const text = (value: unknown, fallback = '—') => {
  const result = value === null || value === undefined ? '' : String(value).trim();
  return result === '' ? fallback : result;
};

const num = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const markerIcon = () =>
  divIcon({
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    html: '<span style="display:block;width:14px;height:14px;border-radius:9999px;border:3px solid #8b5cf6;background:#fff;box-shadow:0 1px 4px rgba(15,23,42,.35)"></span>',
  });

/**
 * The tracking board: six shipments on the left, and whatever is selected drawn out on the right -
 * its figures, its route on the map, and its stops as a waypoint list. Everything comes from the
 * landing demo loads, because this page is public and cannot call the tracking API.
 */
export const LandingTrackingBoard = ({ lang, className }: { lang: Language; className?: string }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const shipments = LANDING_DEMO_LOADS.slice(0, 6);
  const [selectedId, setSelectedId] = useState(String(shipments[0]?.id ?? ''));

  const selected = shipments.find((load) => String(load.id) === selectedId) || shipments[0];
  const stops = stopsOf(selected);
  const positions = positionsOf(selected);
  const SelectedIcon = TRANSPORT_ICONS[String(selected?.transport_type)] || Truck;

  const figures = selected
    ? [
        { label: u('warehouseStatus.colWeight', 'Weight'), value: `${num(selected.weight_kg).toLocaleString()} kg`, icon: Boxes },
        { label: u('postLoadModal.budget', 'Budget'), value: `${text(selected.currency, 'EUR')} ${num(selected.budget).toLocaleString()}`, icon: Coins },
        { label: u('landing.tracking.distance', 'Distance'), value: num(selected.distance_km) > 0 ? `${num(selected.distance_km).toLocaleString()} km` : '—', icon: MapPin },
        { label: 'ETA', value: String(stops.at(-1)?.window_starts_at || '').replace('T', ' ').slice(0, 16) || '—', icon: CalendarClock },
      ]
    : [];

  return (
    <div className={cn('grid gap-6 md:grid-cols-12', className)}>
      <div className="md:col-span-7 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 lg:p-10 border border-slate-100 dark:border-slate-800 flex flex-col">
        <div className="w-14 h-14 bg-violet-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-violet-500/30">
          <MapPin className="text-white w-7 h-7" />
        </div>
        <h3 className="text-3xl lg:text-4xl font-bold mb-4 dark:text-white tracking-tight">
          {u('landing.realTimeGlobalVisibility', 'Real-time Global Visibility')}
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
          {u(
            'landing.realTimeGlobalVisibilityDesc',
            'Track every package, vehicle, and asset in real-time with sub-meter precision across 180+ countries.',
          )}
        </p>

        {/* Two rows of three - the same card repeated, one per shipment on the board. */}
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shipments.map((load) => {
            const CardIcon = TRANSPORT_ICONS[String(load.transport_type)] || Truck;
            const cardStops = stopsOf(load);
            const active = String(load.id) === selectedId;
            return (
              <button
                key={String(load.id)}
                type="button"
                onClick={() => setSelectedId(String(load.id))}
                className={cn(
                  'flex min-w-0 cursor-pointer flex-col gap-2 rounded-2xl border p-3 text-left transition-all',
                  active
                    ? 'border-violet-500 bg-violet-500/10 ring-1 ring-violet-500/20'
                    : 'border-slate-200 bg-white hover:border-violet-500/40 hover:bg-violet-500/5 dark:border-slate-800 dark:bg-slate-950',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', active ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800')}>
                    <CardIcon className="h-4 w-4" />
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-500">
                    <Radio className="h-3 w-3 animate-pulse" />
                    {u('common.live', 'Live')}
                  </span>
                </div>
                <span className="block truncate text-xs font-black text-slate-900 dark:text-white">
                  {text(load.booking_reference)}
                </span>
                <span className="flex min-w-0 items-center gap-1 text-[11px] text-slate-500">
                  <span className="truncate">{text(cardStops[0]?.city)}</span>
                  <ArrowRight className="h-3 w-3 shrink-0" />
                  <span className="truncate">{text(cardStops.at(-1)?.city)}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap gap-4">
          <div className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <div className="w-2 h-2 min-w-2 min-h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold dark:text-white">99.9% Accuracy</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2">
            <Package className="w-4 h-4 text-violet-500" />
            <span className="text-xs font-bold dark:text-white">{u('landing.globalCoverage', 'Global Coverage')}</span>
          </div>
        </div>
      </div>

      <div className="md:col-span-5 bg-white dark:bg-slate-900 rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 dark:border-slate-800 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500 inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {u('landing.routeStops', 'Route Stops')}
            </p>
            <h3 className="truncate text-2xl font-bold dark:text-white tracking-tight">
              {u('landing.waypointPlanner', 'Waypoint Planner')}
            </h3>
          </div>
          <span className="shrink-0 rounded-full bg-violet-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-violet-500">
            {stops.length} {u('landing.markers', 'markers')}
          </span>
        </div>

        <div className="mt-4 flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white">
            <SelectedIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black text-slate-900 dark:text-white">{text(selected?.booking_reference)}</span>
            <span className="block truncate text-[11px] text-slate-500">{text(selected?.title)}</span>
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {figures.map((figure) => {
            const FigureIcon = figure.icon;
            return (
              <div key={figure.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <FigureIcon className="h-3 w-3 shrink-0 text-violet-500" />
                  {figure.label}
                </p>
                <p className="mt-1 truncate text-sm font-black tabular-nums text-slate-900 dark:text-white">{figure.value}</p>
              </div>
            );
          })}
        </div>

        {positions.length > 1 && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <MapContainer
              key={selectedId}
              bounds={positions}
              boundsOptions={{ padding: [24, 24] }}
              dragging={false}
              scrollWheelZoom={false}
              doubleClickZoom={false}
              zoomControl={false}
              attributionControl={false}
              className="h-52 min-h-[13rem] w-full grayscale-[0.03] dark:brightness-75"
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
              <Polyline positions={positions} pathOptions={{ color: '#8b5cf6', weight: 4, opacity: 0.9 }} />
              {positions.map((position, index) => (
                <Marker key={`${selectedId}-${index}`} position={position} icon={markerIcon()} />
              ))}
            </MapContainer>
          </div>
        )}

      </div>
    </div>
  );
};
