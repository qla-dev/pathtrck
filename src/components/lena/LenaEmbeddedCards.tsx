import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { Activity, ArrowRight, Box, CalendarClock, Coins, Flag, Hash, MapPin, MapPinned, PackageCheck, Scale, Truck } from 'lucide-react';

import { trLoadStatus, ui } from '../../i18n';
import { searchLocations, type LocationSearchResult } from '../../services/locationSearch';
import { Language } from '../../types';
import { AddressMapModal } from '../maps/AddressMapModal';

type LenaLoadDetailsCardProps = {
  lang: Language;
  load: Record<string, unknown>;
  onOpen?: () => void;
};

const flagUrl = (code: string) => `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

export const LenaLocationChoiceCard = ({ lang, kind, onSelect }: { lang: Language; kind: 'pickup' | 'delivery'; onSelect: (location: LocationSearchResult) => void }) => {
  const [mapOpen, setMapOpen] = useState(false);
  const pickup = kind === 'pickup';
  const title = lang === 'bs'
    ? pickup ? 'Odaberite lokaciju preuzimanja' : 'Odaberite lokaciju isporuke'
    : lang === 'de'
      ? pickup ? 'Abholort auswählen' : 'Lieferort auswählen'
      : pickup ? 'Choose pickup location' : 'Choose delivery location';
  const description = lang === 'bs'
    ? 'Pretražite adresu ili označite tačnu lokaciju na mapi.'
    : lang === 'de'
      ? 'Suchen Sie eine Adresse oder markieren Sie den genauen Ort auf der Karte.'
      : 'Search for an address or mark the exact point on the map.';
  const buttonLabel = lang === 'bs' ? 'Otvori mapu' : lang === 'de' ? 'Karte öffnen' : 'Open map';

  return (
    <>
      <div className="flex w-full items-center justify-between gap-4 rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 to-white p-4 shadow-sm dark:to-slate-900">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><MapPinned className="h-5 w-5" /></span>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 dark:text-white">{title}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">{description}</p>
          </div>
        </div>
        <button type="button" onClick={() => setMapOpen(true)} className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-white transition-all hover:brightness-95"><MapPin className="h-4 w-4" />{buttonLabel}</button>
      </div>
      {mapOpen && <AddressMapModal
        open={mapOpen}
        lang={lang}
        title={title}
        onClose={() => setMapOpen(false)}
        onSelect={(location) => {
          setMapOpen(false);
          onSelect(location);
        }}
      />}
    </>
  );
};

export const LenaLoadStatusCard = ({ lang, load }: { lang: Language; load: Record<string, unknown> }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const rawStatus = String(load.status || 'pending').toLowerCase();
  const statusMap: Record<string, string> = {
    posted: 'Posted', opened: 'Opened', sent: 'Sent', in_delivery: 'In delivery', received: 'Received', finished: 'Finished', pending: 'Pending', cancelled: 'Cancelled',
  };
  const status = trLoadStatus(lang, statusMap[rawStatus] || rawStatus);
  const active = ['posted', 'opened', 'sent', 'in_delivery'].includes(rawStatus);

  return (
    <div className="flex w-full max-w-xl items-center justify-between gap-4 rounded-2xl border border-primary/25 bg-white p-4 shadow-sm dark:bg-slate-900">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Activity className="h-5 w-5" /></span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{u('Current load status', 'Current load status')}</p>
          <p className="mt-0.5 truncate text-sm font-black text-slate-900 dark:text-white">{String(load.title || load.booking_reference || `#${load.id}`)}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{String(load.booking_reference || `#${load.id}`)}</p>
        </div>
      </div>
      <span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${active ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
        <span className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-400'}`} />{status}
      </span>
    </div>
  );
};

export const LenaLoadDetailsCard = ({ lang, load, onOpen }: LenaLoadDetailsCardProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const stops = Array.isArray(load.stops) ? load.stops as Array<Record<string, unknown>> : [];
  const pickup = stops.find((stop) => String(stop.type) === 'pickup') || stops[0];
  const delivery = [...stops].reverse().find((stop) => String(stop.type) === 'delivery') || stops.at(-1);
  const currency = String(load.currency || 'EUR');
  const budget = load.budget == null ? '—' : `${currency} ${Number(load.budget).toLocaleString()}`;
  const details = [
    { label: u('legacy.loadDetails.weight', 'Weight'), value: load.weight_kg ? `${Number(load.weight_kg).toLocaleString()} kg` : '—', icon: Scale },
    { label: u('legacy.loadDetails.cargo', 'Cargo'), value: String(load.cargo_type || load.goods_type || '—'), icon: Box },
    { label: u('legacy.loadDetails.price', 'Price'), value: budget, icon: Coins },
    { label: 'ETA', value: String(delivery?.window_starts_at || delivery?.window_ends_at || '—').replace('T', ' ').slice(0, 16), icon: CalendarClock },
  ];

  const renderLocation = (stop: Record<string, unknown> | undefined, kind: 'pickup' | 'delivery') => {
    const code = String(stop?.country_code || '').toUpperCase();
    return (
      <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
          {kind === 'pickup' ? <MapPin className="h-3.5 w-3.5 text-sky-500" /> : <Flag className="h-3.5 w-3.5 text-rose-500" />}
          {kind === 'pickup' ? u('legacy.loadDetails.pickup', 'Pickup') : u('legacy.loadDetails.delivery', 'Delivery')}
        </p>
        <p className="mt-2 flex min-w-0 items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
          {/^[A-Z]{2}$/.test(code) && <img src={flagUrl(code)} alt={code} className="h-3.5 w-5 shrink-0 rounded-sm object-cover" />}
          <span className="truncate">{String(stop?.city || '—')}</span>
        </p>
      </div>
    );
  };

  return (
    <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.035] shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-primary/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><Truck className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-slate-900 dark:text-white">{String(load.title || u('Load details', 'Load details'))}</p>
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400"><Hash className="h-3 w-3" />{String(load.booking_reference || `#${load.id}`)}</p>
          </div>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase text-primary">{String(load.status || '—').replace('_', ' ')}</span>
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-2">{renderLocation(pickup, 'pickup')}<ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />{renderLocation(delivery, 'delivery')}</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {details.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl bg-white p-3 dark:bg-slate-900">
              <p className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-400"><Icon className="h-3 w-3 text-primary" />{label}</p>
              <p className="mt-1 truncate text-xs font-bold text-slate-800 dark:text-white">{value}</p>
            </div>
          ))}
        </div>
        {onOpen && <button type="button" onClick={onOpen} className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary text-xs font-black text-white transition-all hover:brightness-95">{u('View details', 'View details')}<ArrowRight className="h-4 w-4" /></button>}
      </div>
    </div>
  );
};

export const LenaLocationCard = ({ lang, load }: { lang: Language; load: Record<string, unknown> }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const stops = Array.isArray(load.stops) ? load.stops as Array<Record<string, unknown>> : [];
  const pickup = stops.find((stop) => String(stop.type) === 'pickup') || stops[0];
  const delivery = [...stops].reverse().find((stop) => String(stop.type) === 'delivery') || stops.at(-1);

  const location = (stop: Record<string, unknown> | undefined, tone: 'emerald' | 'blue') => {
    const code = String(stop?.country_code || '').toUpperCase();
    const city = String(stop?.city || u('Not specified', 'Not specified'));
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className={tone === 'emerald' ? 'h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500' : 'h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500'} />
        {/^[A-Z]{2}$/.test(code) && <img src={flagUrl(code)} alt={code} className="h-4 w-6 shrink-0 rounded-sm object-cover" />}
        <span className="truncate text-sm font-bold text-slate-900 dark:text-white">{city}{code ? `, ${code}` : ''}</span>
      </div>
    );
  };

  return (
    <div className="flex w-full max-w-xl items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-900">
      {location(pickup, 'emerald')}
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
      {location(delivery, 'blue')}
    </div>
  );
};

type LenaMapPoint = {
  latitude: number;
  longitude: number;
  label: string;
  isCurrentPosition: boolean;
};

const coordinate = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const LenaLoadMapCard = ({ lang, load }: { lang: Language; load: Record<string, unknown> }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const lastLocationLabel = u('Last available location', 'Last available location');
  const pickupLocationLabel = u('Pickup location', 'Pickup location');
  const unmappedLocationLabel = u('Location could not be mapped', 'Location could not be mapped');
  const shipment = (load.shipment || {}) as Record<string, unknown>;
  const events = Array.isArray(shipment.events) ? shipment.events as Array<Record<string, unknown>> : [];
  const stops = Array.isArray(load.stops) ? load.stops as Array<Record<string, unknown>> : [];
  const pickup = stops.find((stop) => String(stop.type) === 'pickup') || stops[0];

  const locationSource = useMemo(() => {
    const event = events.find((item) => coordinate(item.latitude) !== null && coordinate(item.longitude) !== null);
    if (event) {
      return {
        point: {
          latitude: coordinate(event.latitude)!,
          longitude: coordinate(event.longitude)!,
          label: String(event.location || event.title || lastLocationLabel),
          isCurrentPosition: true,
        } satisfies LenaMapPoint,
        search: '',
      };
    }

    const shipmentLatitude = coordinate(shipment.current_latitude);
    const shipmentLongitude = coordinate(shipment.current_longitude);
    if (shipmentLatitude !== null && shipmentLongitude !== null) {
      return {
        point: {
          latitude: shipmentLatitude,
          longitude: shipmentLongitude,
          label: lastLocationLabel,
          isCurrentPosition: true,
        } satisfies LenaMapPoint,
        search: '',
      };
    }

    const pickupLatitude = coordinate(pickup?.latitude);
    const pickupLongitude = coordinate(pickup?.longitude);
    const pickupLabel = [pickup?.city, pickup?.country_code].filter(Boolean).join(', ');
    if (pickupLatitude !== null && pickupLongitude !== null) {
      return {
        point: {
          latitude: pickupLatitude,
          longitude: pickupLongitude,
          label: pickupLabel || pickupLocationLabel,
          isCurrentPosition: false,
        } satisfies LenaMapPoint,
        search: '',
      };
    }

    const eventLocation = events.find((item) => String(item.location || '').trim())?.location;
    return { point: null, search: String(eventLocation || pickupLabel || '').trim() };
  }, [events, lastLocationLabel, pickup, pickupLocationLabel, shipment.current_latitude, shipment.current_longitude]);

  const [mapPoint, setMapPoint] = useState<LenaMapPoint | null>(locationSource.point);

  useEffect(() => {
    setMapPoint(locationSource.point);
    if (locationSource.point || !locationSource.search) return undefined;

    const controller = new AbortController();
    void searchLocations(locationSource.search, controller.signal)
      .then((results) => {
        const result = results[0];
        if (result) {
          setMapPoint({
            latitude: result.latitude,
            longitude: result.longitude,
            label: [result.city, result.countryCode].filter(Boolean).join(', ') || locationSource.search,
            isCurrentPosition: false,
          });
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [locationSource]);

  return (
    <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white"><MapPin className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wider text-primary">
            {mapPoint?.isCurrentPosition ? lastLocationLabel : pickupLocationLabel}
          </p>
          <p className="truncate text-sm font-black text-slate-900 dark:text-white">{mapPoint?.label || locationSource.search || unmappedLocationLabel}</p>
        </div>
      </div>
      {mapPoint && (
        <MapContainer
          key={`${mapPoint.latitude}-${mapPoint.longitude}`}
          center={[mapPoint.latitude, mapPoint.longitude]}
          zoom={12}
          scrollWheelZoom={false}
          className="h-56 w-full"
        >
          <TileLayer
            url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
            attribution="&copy; Google Maps"
          />
          <Marker position={[mapPoint.latitude, mapPoint.longitude]}>
            <Popup>{mapPoint.label}</Popup>
          </Marker>
        </MapContainer>
      )}
    </div>
  );
};

export const LenaBookingCard = ({ lang, load, onBook }: { lang: Language; load?: Record<string, unknown>; onBook: () => void | Promise<void> }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const rawBudget = load?.budget;
  const numericBudget = rawBudget === null || rawBudget === undefined || rawBudget === '' ? null : Number(rawBudget);
  const price = numericBudget !== null && Number.isFinite(numericBudget)
    ? `${String(load?.currency || 'EUR')} ${numericBudget.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
    : String(load?.price_insurance || '').trim();

  return (
    <div className="flex w-full max-w-xl items-center justify-between gap-4 rounded-2xl border border-emerald-300/60 bg-emerald-50 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/10">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white"><PackageCheck className="h-5 w-5" /></span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-black text-slate-900 dark:text-white">{u('Direct booking', 'Direct booking')}</p>
            {price && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-black text-emerald-700 dark:text-emerald-300">{price}</span>}
          </div>
          <p className="truncate text-xs text-slate-500 dark:text-slate-300">{u('Load ready for booking', 'This load is available for direct booking.')}</p>
        </div>
      </div>
      <button type="button" onClick={() => void onBook()} className="flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-xs font-black text-white transition-all hover:brightness-95">{u('common.bookLoad', 'Reserve')}<ArrowRight className="h-4 w-4" /></button>
    </div>
  );
};
