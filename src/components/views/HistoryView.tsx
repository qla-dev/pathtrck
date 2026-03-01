import { useEffect, useMemo, useState } from 'react';
import Flatpickr from 'react-flatpickr';
import { BarChart3, CalendarDays, Clock3, Filter, MapPin, Search, Sparkles, WandSparkles } from 'lucide-react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import { Language } from '../../types';
import { MOCK_ROUTES } from '../../mockData';
import { getRouteInsights } from '../../services/geminiService';
import { flatpickrI18n, ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { Card } from '../ui/Card';

type ViewMode = 'day' | 'calendar';
type RightTab = 'overview' | 'map' | 'timeline' | 'magic';

type HistoryRoute = {
  id: string;
  routeCode: string;
  date: string;
  dateObj: Date;
  distance: string;
  duration: string;
  stops: number;
  path: [number, number][];
  origin: string;
  destination: string;
  vehicle: string;
  fuel: string;
  cost: string;
  confidence: number;
  status: 'Completed' | 'Optimized' | 'Delayed';
  events: { time: string; title: string; note: string }[];
};

const pad = (value: number) => `${value}`.padStart(2, '0');
const formatDdMmYyyy = (date: Date) => `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;

const startOfDay = (date: Date) => {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
};

const endOfDay = (date: Date) => {
  const clone = new Date(date);
  clone.setHours(23, 59, 59, 999);
  return clone;
};

const toDayKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const HISTORY_ROUTES: HistoryRoute[] = [
  {
    id: MOCK_ROUTES[0]?.id || 'R1',
    routeCode: 'BH-771',
    date: '27.02.2026',
    dateObj: new Date('2026-02-27T08:20:00'),
    distance: '420 km',
    duration: '5h 30m',
    stops: 12,
    path: [[43.8563, 18.4131], [44.1997, 17.9048], [44.7722, 17.191]],
    origin: 'Sarajevo, BA',
    destination: 'Banja Luka, BA',
    vehicle: 'Mercedes Sprinter',
    fuel: '126 L',
    cost: 'EUR 488',
    confidence: 97,
    status: 'Completed',
    events: [
      { time: '08:20', title: 'Departed Sarajevo Hub', note: 'All docs verified and route locked.' },
      { time: '10:05', title: 'Checkpoint Zenica', note: 'Traffic green corridor enabled.' },
      { time: '13:50', title: 'Delivered in Banja Luka', note: 'POD and signature uploaded.' },
    ],
  },
  {
    id: MOCK_ROUTES[1]?.id || 'R2',
    routeCode: 'DE-552',
    date: '26.02.2026',
    dateObj: new Date('2026-02-26T07:40:00'),
    distance: '150 km',
    duration: '2h 15m',
    stops: 5,
    path: [[48.1351, 11.582], [48.4011, 11.4426], [48.7758, 9.1829]],
    origin: 'Munich, DE',
    destination: 'Stuttgart, DE',
    vehicle: 'Ford Transit',
    fuel: '58 L',
    cost: 'EUR 214',
    confidence: 94,
    status: 'Optimized',
    events: [
      { time: '07:40', title: 'Loaded at Munich Port', note: 'AI picked eco-balanced profile.' },
      { time: '08:55', title: 'A8 speed corridor', note: 'ETA improved by 12 minutes.' },
      { time: '09:55', title: 'Arrived Stuttgart DC', note: 'Dock 6 auto-assigned.' },
    ],
  },
  {
    id: 'R3',
    routeCode: 'AT-901',
    date: '17.02.2026',
    dateObj: new Date('2026-02-17T06:50:00'),
    distance: '308 km',
    duration: '4h 05m',
    stops: 7,
    path: [[48.2082, 16.3738], [48.3069, 14.2858], [47.0707, 15.4395]],
    origin: 'Vienna, AT',
    destination: 'Graz, AT',
    vehicle: 'Renault Master',
    fuel: '96 L',
    cost: 'EUR 352',
    confidence: 96,
    status: 'Completed',
    events: [
      { time: '06:50', title: 'Departure approved', note: 'Cold-chain check passed.' },
      { time: '09:12', title: 'Linz relay handover', note: 'Zero idle waiting.' },
      { time: '10:55', title: 'Graz delivered', note: 'Client rating 5.0 received.' },
    ],
  },
  {
    id: 'R4',
    routeCode: 'HR-420',
    date: '03.01.2026',
    dateObj: new Date('2026-01-03T09:05:00'),
    distance: '517 km',
    duration: '7h 40m',
    stops: 11,
    path: [[45.815, 15.9819], [46.0569, 14.5058], [46.9479, 7.4474]],
    origin: 'Zagreb, HR',
    destination: 'Bern, CH',
    vehicle: 'MAN TGL 12.250',
    fuel: '172 L',
    cost: 'EUR 642',
    confidence: 91,
    status: 'Delayed',
    events: [
      { time: '09:05', title: 'Route started', note: 'Heavy weather alert on A1.' },
      { time: '12:44', title: 'Ljubljana bypass', note: 'Delay mitigation protocol started.' },
      { time: '16:45', title: 'Bern unload complete', note: 'Arrived 32 min behind ETA.' },
    ],
  },
  {
    id: 'R5',
    routeCode: 'NL-111',
    date: '12.12.2025',
    dateObj: new Date('2025-12-12T11:10:00'),
    distance: '240 km',
    duration: '3h 20m',
    stops: 6,
    path: [[52.3676, 4.9041], [52.0907, 5.1214], [51.9244, 4.4777]],
    origin: 'Amsterdam, NL',
    destination: 'Rotterdam, NL',
    vehicle: 'DAF LF 260',
    fuel: '71 L',
    cost: 'EUR 286',
    confidence: 98,
    status: 'Optimized',
    events: [
      { time: '11:10', title: 'High-density route loaded', note: 'AI switched to fast lane profile.' },
      { time: '12:50', title: 'Utrecht checkpoint', note: 'Real-time lane balancing applied.' },
      { time: '14:30', title: 'Rotterdam done', note: 'Earliest slot captured.' },
    ],
  },
  {
    id: 'R6',
    routeCode: 'PL-304',
    date: '02.11.2025',
    dateObj: new Date('2025-11-02T05:35:00'),
    distance: '690 km',
    duration: '9h 10m',
    stops: 14,
    path: [[52.2297, 21.0122], [51.1079, 17.0385], [50.0647, 19.945]],
    origin: 'Warsaw, PL',
    destination: 'Krakow, PL',
    vehicle: 'Scania R450',
    fuel: '219 L',
    cost: 'EUR 824',
    confidence: 93,
    status: 'Completed',
    events: [
      { time: '05:35', title: 'Departure Warsaw', note: 'Night mode safety enabled.' },
      { time: '10:04', title: 'Wroclaw cross-dock', note: 'Partial unload synced.' },
      { time: '14:45', title: 'Krakow final', note: 'Zero claim route.' },
    ],
  },
  {
    id: 'R7',
    routeCode: 'IT-222',
    date: '18.09.2025',
    dateObj: new Date('2025-09-18T08:05:00'),
    distance: '388 km',
    duration: '5h 10m',
    stops: 9,
    path: [[45.4642, 9.19], [44.4949, 11.3426], [43.7696, 11.2558]],
    origin: 'Milan, IT',
    destination: 'Florence, IT',
    vehicle: 'Volvo FL 250',
    fuel: '118 L',
    cost: 'EUR 438',
    confidence: 95,
    status: 'Completed',
    events: [
      { time: '08:05', title: 'Milan outbound', note: 'Driver trust level 5 applied.' },
      { time: '10:52', title: 'Bologna corridor', note: 'Congestion avoided by AI reroute.' },
      { time: '13:15', title: 'Florence complete', note: 'Client feedback: excellent handling.' },
    ],
  },
];

export const HistoryView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [leftMode, setLeftMode] = useState<ViewMode>('day');
  const [rightTab, setRightTab] = useState<RightTab>('overview');
  const [query, setQuery] = useState('');
  const [selectedDayKey, setSelectedDayKey] = useState(toDayKey(HISTORY_ROUTES[0].dateObj));
  const [selectedRouteId, setSelectedRouteId] = useState(HISTORY_ROUTES[0].id);
  const [rangeStart, setRangeStart] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return startOfDay(d);
  });
  const [rangeEnd, setRangeEnd] = useState(() => endOfDay(new Date()));
  const [insights, setInsights] = useState('');

  const searchedRoutes = useMemo(
    () =>
      HISTORY_ROUTES.filter((route) => {
        const haystack = `${route.routeCode} ${route.origin} ${route.destination} ${route.vehicle}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [query]
  );

  const dayBuckets = useMemo(() => {
    const map = new Map<string, { key: string; date: Date; count: number; totalDistanceKm: number }>();
    searchedRoutes.forEach((route) => {
      const key = toDayKey(route.dateObj);
      const distanceNum = Number(route.distance.replace(/[^\d.]/g, '')) || 0;
      if (!map.has(key)) map.set(key, { key, date: route.dateObj, count: 0, totalDistanceKm: 0 });
      const current = map.get(key)!;
      current.count += 1;
      current.totalDistanceKm += distanceNum;
    });
    return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [searchedRoutes]);

  const dayRoutes = useMemo(
    () => searchedRoutes.filter((route) => toDayKey(route.dateObj) === selectedDayKey),
    [searchedRoutes, selectedDayKey]
  );

  const rangeRoutes = useMemo(
    () =>
      searchedRoutes.filter((route) => {
        const ts = route.dateObj.getTime();
        return ts >= rangeStart.getTime() && ts <= rangeEnd.getTime();
      }),
    [searchedRoutes, rangeStart, rangeEnd]
  );

  const activeRoutes = leftMode === 'day' ? dayRoutes : rangeRoutes;
  const activeRoute = activeRoutes.find((route) => route.id === selectedRouteId) || activeRoutes[0] || null;
  const mapCenter = (activeRoute?.path[0] || [47.3769, 8.5417]) as [number, number];
  const routeDateLabel = activeRoute ? formatDdMmYyyy(activeRoute.dateObj) : '--.--.----';
  const dateRangeLabel = `${formatDdMmYyyy(rangeStart)} - ${formatDdMmYyyy(rangeEnd)}`;

  const totalDistance = activeRoutes.reduce((sum, route) => sum + (Number(route.distance.replace(/[^\d.]/g, '')) || 0), 0);
  const totalEarned = activeRoutes.reduce((sum, route) => {
    const parsed = Number(route.cost.replace(/[^0-9.,]/g, '').replace(/,/g, '')) || 0;
    return sum + parsed;
  }, 0);
  const avgConfidence = activeRoutes.length
    ? Math.round(activeRoutes.reduce((sum, route) => sum + route.confidence, 0) / activeRoutes.length)
    : 0;

  useEffect(() => {
    if (!dayBuckets.length) return;
    if (!dayBuckets.some((bucket) => bucket.key === selectedDayKey)) setSelectedDayKey(dayBuckets[0].key);
  }, [dayBuckets, selectedDayKey]);

  useEffect(() => {
    if (!activeRoutes.length) return;
    if (!activeRoutes.some((route) => route.id === selectedRouteId)) setSelectedRouteId(activeRoutes[0].id);
  }, [activeRoutes, selectedRouteId]);

  useEffect(() => {
    if (!activeRoute) {
      setInsights('');
      return;
    }
    getRouteInsights([activeRoute.origin, activeRoute.destination]).then(setInsights);
  }, [activeRoute]);

  const applyQuickRange = (monthsBack: number) => {
    const end = endOfDay(new Date());
    const start = new Date(end);
    start.setMonth(start.getMonth() - monthsBack);
    setRangeStart(startOfDay(start));
    setRangeEnd(end);
    setLeftMode('calendar');
  };

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder={lang === 'bs' ? 'Pretrazi rute...' : lang === 'de' ? 'Routen suchen...' : 'Search routes...'}
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => setLeftMode('day')}
            className={cn(
              'h-10 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2',
              leftMode === 'day' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            )}
          >
            <Clock3 className="w-4 h-4" />
            {lang === 'bs' ? 'Dan' : lang === 'de' ? 'Tag' : 'Day Focus'}
          </button>
          <button
            onClick={() => setLeftMode('calendar')}
            className={cn(
              'h-10 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2',
              leftMode === 'calendar' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            )}
          >
            <CalendarDays className="w-4 h-4" />
            {lang === 'bs' ? 'Kalendar' : lang === 'de' ? 'Kalender' : 'Calendar Range'}
          </button>
        </div>

        {leftMode === 'calendar' && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wider text-primary">
                {lang === 'bs' ? 'Raspon datuma' : lang === 'de' ? 'Datumsbereich' : 'Date Range'}
              </p>
              <span className="text-[11px] font-semibold text-slate-500">{dateRangeLabel}</span>
            </div>

            <div className="history-flatpickr">
              <Flatpickr
                value={[rangeStart, rangeEnd]}
                options={{
                  inline: true,
                  mode: 'range',
                  dateFormat: 'd.m.Y',
                  locale: flatpickrI18n(lang),
                  defaultDate: [rangeStart, rangeEnd],
                  prevArrow: '<span aria-hidden="true">‹</span>',
                  nextArrow: '<span aria-hidden="true">›</span>',
                }}
                onChange={(dates) => {
                  if (dates.length === 2) {
                    setRangeStart(startOfDay(dates[0]));
                    setRangeEnd(endOfDay(dates[1]));
                  }
                }}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => applyQuickRange(1)} className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-primary cursor-pointer">
                {lang === 'bs' ? '1 mjesec' : lang === 'de' ? '1 Monat' : 'Past month'}
              </button>
              <button onClick={() => applyQuickRange(6)} className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-primary cursor-pointer">
                {lang === 'bs' ? '6 mjeseci' : lang === 'de' ? '6 Monate' : 'Past half year'}
              </button>
              <button onClick={() => applyQuickRange(12)} className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-primary cursor-pointer">
                {lang === 'bs' ? '12 mjeseci' : lang === 'de' ? '12 Monate' : 'Past year'}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {leftMode === 'day' && dayBuckets.map((bucket) => (
            <button
              key={bucket.key}
              onClick={() => setSelectedDayKey(bucket.key)}
              className={cn(
                'w-full p-4 rounded-2xl border text-left transition-all cursor-pointer',
                selectedDayKey === bucket.key
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold dark:text-white">{formatDdMmYyyy(bucket.date)}</p>
                <span className="text-xs font-bold text-primary">{Math.round(bucket.totalDistanceKm)} km</span>
              </div>
              <p className="text-xs text-slate-500">
                {bucket.count} {lang === 'bs' ? 'ruta tog dana' : lang === 'de' ? 'Routen an dem Tag' : 'routes on this day'}
              </p>
            </button>
          ))}

          {leftMode === 'calendar' && rangeRoutes.map((route) => (
            <button
              key={route.id}
              onClick={() => setSelectedRouteId(route.id)}
              className={cn(
                'w-full p-4 rounded-2xl border text-left transition-all cursor-pointer',
                selectedRouteId === route.id
                  ? 'border-primary bg-primary/5'
                  : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold dark:text-white">{route.routeCode}</p>
                <span className="text-xs font-bold text-primary">{route.distance}</span>
              </div>
              <p className="text-xs text-slate-500">{route.origin} {'->'} {route.destination}</p>
              <p className="text-[11px] text-slate-400 mt-1">{formatDdMmYyyy(route.dateObj)}</p>
            </button>
          ))}

          {!activeRoutes.length && (
            <div className="p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500">
              {lang === 'bs' ? 'Nema ruta za odabrani filter.' : lang === 'de' ? 'Keine Routen fuer den ausgewaehlten Filter.' : 'No routes match this filter.'}
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-8 space-y-6">
        <div className="inline-flex h-12 items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
          <button
            onClick={() => setRightTab('overview')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'overview' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <BarChart3 className="w-4 h-4" />
            {lang === 'bs' ? 'Pregled' : lang === 'de' ? 'Uebersicht' : 'Overview'}
          </button>
          <button
            onClick={() => setRightTab('map')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'map' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <MapPin className="w-4 h-4" />
            {lang === 'bs' ? 'Mapa' : lang === 'de' ? 'Karte' : 'Map'}
          </button>
          <button
            onClick={() => setRightTab('timeline')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'timeline' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Clock3 className="w-4 h-4" />
            Timeline
          </button>
          <button
            onClick={() => setRightTab('magic')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'magic' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <WandSparkles className="w-4 h-4" />
            Magic
          </button>
        </div>

        {rightTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-12 gap-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:col-span-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">{lang === 'bs' ? 'Rute u fokusu' : lang === 'de' ? 'Routen im Fokus' : 'Routes in focus'}</p>
                <p className="text-3xl font-black dark:text-white mt-1">{activeRoutes.length}</p>
                <p className="text-xs text-slate-500 mt-1">{leftMode === 'day' ? routeDateLabel : dateRangeLabel}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:col-span-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">{lang === 'bs' ? 'Ukupna kilometraza' : lang === 'de' ? 'Gesamtkilometer' : 'Total distance'}</p>
                <p className="text-3xl font-black dark:text-white mt-1">{Math.round(totalDistance)} km</p>
                <p className="text-xs text-slate-500 mt-1">{lang === 'bs' ? 'u odabranom periodu' : lang === 'de' ? 'im gewaehlten Zeitraum' : 'in selected window'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:col-span-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">{lang === 'bs' ? 'Ukupna zarada' : lang === 'de' ? 'Gesamtverdienst' : 'Total earned'}</p>
                <p className="text-3xl font-black dark:text-white mt-1">
                  {new Intl.NumberFormat(lang === 'de' ? 'de-DE' : lang === 'bs' ? 'bs-BA' : 'en-US').format(Math.round(totalEarned))} €
                </p>
                <p className="text-xs text-slate-500 mt-1">{lang === 'bs' ? 'iz odabranih ruta' : lang === 'de' ? 'aus ausgewaehlten Routen' : 'from selected routes'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:col-span-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">{lang === 'bs' ? 'AI pouzdanost' : lang === 'de' ? 'KI-Vertrauen' : 'AI confidence'}</p>
                <p className="text-3xl font-black text-primary mt-1">{avgConfidence}%</p>
                <p className="text-xs text-slate-500 mt-1">{lang === 'bs' ? 'prosjek aktivnih ruta' : lang === 'de' ? 'Durchschnitt aktiver Routen' : 'average across active routes'}</p>
              </div>
            </div>

            <Card title={u('history.routeHistory', 'Route History')}>
              <div className="space-y-3">
                {activeRoutes.map((route) => (
                  <button
                    key={route.id}
                    onClick={() => setSelectedRouteId(route.id)}
                    className={cn(
                      'w-full text-left p-4 rounded-xl border transition-all cursor-pointer',
                      activeRoute?.id === route.id
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 dark:border-slate-800 hover:border-primary/40'
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold dark:text-white">{route.routeCode} • {route.origin} {'->'} {route.destination}</p>
                        <p className="text-xs text-slate-500 mt-1">{formatDdMmYyyy(route.dateObj)} • {route.vehicle}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{route.duration}</span>
                        <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">{route.distance}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {rightTab === 'map' && (
          <Card title={u('history.routePath', 'Route Path')}>
            <div className="h-[460px] rounded-xl overflow-hidden relative">
              <MapContainer center={mapCenter} zoom={6} className="h-full w-full">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {(leftMode === 'calendar' ? activeRoutes : activeRoute ? [activeRoute] : []).map((route, index) => (
                  <Polyline
                    key={route.id}
                    positions={route.path}
                    pathOptions={{
                      color: activeRoute?.id === route.id ? '#00AEEF' : ['#00AEEF', '#22C55E', '#A855F7', '#F59E0B'][index % 4],
                      weight: activeRoute?.id === route.id ? 5 : 3,
                      opacity: activeRoute?.id === route.id ? 0.95 : 0.6,
                    }}
                  />
                ))}
                {(leftMode === 'calendar' ? activeRoutes : activeRoute ? [activeRoute] : []).map((route) => (
                  <Marker key={`${route.id}-start`} position={route.path[0]}>
                    <Popup>{route.routeCode} • {route.origin}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </Card>
        )}

        {rightTab === 'timeline' && (
          <Card title={lang === 'bs' ? 'Route Timeline' : lang === 'de' ? 'Routen-Timeline' : 'Route Timeline'}>
            <div className="space-y-6">
              {(activeRoute?.events || []).map((event, index) => (
                <div key={`${event.time}-${index}`} className="flex gap-4">
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-primary mt-1.5" />
                    {index !== (activeRoute?.events.length || 0) - 1 && <div className="absolute top-5 left-[5px] w-px h-10 bg-slate-200 dark:bg-slate-800" />}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{event.time}</p>
                    <p className="text-sm font-bold dark:text-white">{event.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{event.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {rightTab === 'magic' && (
          <div className="space-y-6">
            <Card title={lang === 'bs' ? 'Magic Route Twin' : lang === 'de' ? 'Magic Route Twin' : 'Magic Route Twin'}>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950">
                  <div className="flex items-center gap-2 text-primary mb-3">
                    <Sparkles className="w-4 h-4" />
                    <p className="text-xs font-black uppercase tracking-wider">
                      {lang === 'bs' ? 'AI uvid' : lang === 'de' ? 'KI-Einblick' : 'AI Insight'}
                    </p>
                  </div>
                  <p className="text-sm dark:text-slate-200 italic">"{insights}"</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950">
                  <div className="flex items-center gap-2 text-primary mb-3">
                    <Filter className="w-4 h-4" />
                    <p className="text-xs font-black uppercase tracking-wider">
                      {lang === 'bs' ? 'Predikcije' : lang === 'de' ? 'Vorhersagen' : 'Predictions'}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: lang === 'bs' ? 'Rizik kasnjenja' : lang === 'de' ? 'Verspaetungsrisiko' : 'Delay risk', value: leftMode === 'calendar' ? 'Low' : 'Very Low', width: '22%' },
                      { label: lang === 'bs' ? 'Efikasnost goriva' : lang === 'de' ? 'Kraftstoffeffizienz' : 'Fuel efficiency', value: `${avgConfidence}%`, width: `${Math.max(40, avgConfidence)}%` },
                      { label: lang === 'bs' ? 'Kvalitet rute' : lang === 'de' ? 'Routenqualitaet' : 'Route quality', value: activeRoute ? `${activeRoute.confidence}%` : '--', width: `${Math.max(30, activeRoute?.confidence || 0)}%` },
                    ].map((metric) => (
                      <div key={metric.label}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>{metric.label}</span>
                          <span className="font-bold text-primary">{metric.value}</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: metric.width }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card title={u('history.generatedByAi', 'Generated by PathTracker.ai AI')}>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { label: lang === 'bs' ? 'Najbolji period' : lang === 'de' ? 'Bestes Zeitfenster' : 'Best window', value: '06:00 - 10:00' },
                  { label: lang === 'bs' ? 'Top vozilo' : lang === 'de' ? 'Top Fahrzeug' : 'Top vehicle', value: activeRoute?.vehicle || '---' },
                  { label: lang === 'bs' ? 'CO2 usteda' : lang === 'de' ? 'CO2 Einsparung' : 'CO2 savings', value: `${activeRoutes.length * 7}%` },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
                    <p className="text-xs uppercase tracking-wider text-slate-500">{item.label}</p>
                    <p className="text-lg font-black mt-1 text-primary">{item.value}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
