import { useEffect, useMemo, useRef, useState } from 'react';
import Flatpickr from 'react-flatpickr';
import { BarChart3, CalendarDays, Clock3, Filter, MapPin, Search, Sparkles, WandSparkles } from 'lucide-react';
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet';
import { Language } from '../../types';
import { api } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';
import { getRouteInsights } from '../../services/geminiService';
import { flatpickrI18n, ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { Card } from '../ui/Card';

type ViewMode = 'all' | 'today' | 'calendar';
type RightTab = 'overview' | 'map' | 'timeline' | 'magic';
type QuickRangePreset = '1m' | '6m' | '12m' | null;

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

export const HistoryView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const numberFormatLocale = lang === 'de' ? 'de-DE' : lang === 'bs' ? 'bs-BA' : 'en-US';
  const routesResult = useApiList(api.routes.list, { per_page: 100 });
  const historyRoutes = useMemo<HistoryRoute[]>(() => routesResult.items.map((row) => {
    const freightLoad = (row.freight_load || {}) as Record<string, unknown>;
    const loadStops = Array.isArray(freightLoad.stops) ? freightLoad.stops as Array<Record<string, unknown>> : [];
    const routeStops = Array.isArray(row.stops) ? row.stops as Array<Record<string, unknown>> : [];
    const events = Array.isArray(row.events) ? row.events as Array<Record<string, unknown>> : [];
    const rawPath = Array.isArray(row.path) ? row.path : [];
    const dateObj = new Date(String(row.starts_at || row.created_at || new Date().toISOString()));
    const minutes = Number(row.duration_minutes || 0);
    const status = String(row.status || '').toLowerCase();
    return {
      id: String(row.id), routeCode: String(row.route_code || `Route ${row.id}`), date: formatDdMmYyyy(dateObj), dateObj,
      distance: `${Number(row.distance_km || 0).toLocaleString(numberFormatLocale)} km`, duration: `${Math.floor(minutes / 60)}h ${minutes % 60}m`, stops: routeStops.length || loadStops.length,
      path: rawPath.filter((point): point is [number, number] => Array.isArray(point) && point.length >= 2).map((point) => [Number(point[0]), Number(point[1])]),
      origin: String(loadStops[0]?.city || 'â€”'), destination: String(loadStops[loadStops.length - 1]?.city || 'â€”'),
      vehicle: String(((row.vehicle || {}) as Record<string, unknown>).registration_number || 'â€”'), fuel: `${Number(row.fuel_liters || 0)} L`, cost: `EUR ${Number(row.estimated_cost || 0).toLocaleString(numberFormatLocale)}`,
      confidence: Number(row.ai_confidence || 0), status: status === 'completed' ? 'Completed' : status === 'delayed' ? 'Delayed' : 'Optimized',
      events: events.map((event) => ({ time: String(event.recorded_at || event.created_at || '').slice(11, 16), title: String(event.event_type || event.status || 'Update'), note: String(event.description || event.location_name || '') })),
    };
  }), [routesResult.items, numberFormatLocale]);
  const [leftMode, setLeftMode] = useState<ViewMode>('all');
  const [rightTab, setRightTab] = useState<RightTab>('overview');
  const [query, setQuery] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [rangeStart, setRangeStart] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return startOfDay(d);
  });
  const [rangeEnd, setRangeEnd] = useState(() => endOfDay(new Date()));
  const [quickRangePreset, setQuickRangePreset] = useState<QuickRangePreset>('1m');
  const [insights, setInsights] = useState('');
  const isProgrammaticRangeChange = useRef(false);

  const searchedRoutes = useMemo(
    () =>
      historyRoutes.filter((route) => {
        const haystack = `${route.routeCode} ${route.origin} ${route.destination} ${route.vehicle}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      }),
    [historyRoutes, query]
  );

  const todayRoutes = useMemo(() => {
    const todayStart = startOfDay(new Date()).getTime();
    const todayEnd = endOfDay(new Date()).getTime();
    return searchedRoutes.filter((route) => {
      const ts = route.dateObj.getTime();
      return ts >= todayStart && ts <= todayEnd;
    });
  }, [searchedRoutes]);

  const rangeRoutes = useMemo(
    () =>
      searchedRoutes.filter((route) => {
        const ts = route.dateObj.getTime();
        return ts >= rangeStart.getTime() && ts <= rangeEnd.getTime();
      }),
    [searchedRoutes, rangeStart, rangeEnd]
  );

  const activeRoutes = leftMode === 'all' ? searchedRoutes : leftMode === 'today' ? todayRoutes : rangeRoutes;
  const activeRoute = activeRoutes.find((route) => route.id === selectedRouteId) || activeRoutes[0] || null;
  const mapRoutes = leftMode === 'today' ? (activeRoute ? [activeRoute] : []) : activeRoutes;
  const mapCenter = (activeRoute?.path[0] || [47.3769, 8.5417]) as [number, number];
  const dateRangeLabel = `${formatDdMmYyyy(rangeStart)} - ${formatDdMmYyyy(rangeEnd)}`;
  const focusLabel = leftMode === 'calendar'
    ? dateRangeLabel
    : leftMode === 'today'
      ? formatDdMmYyyy(new Date())
      : u('history.allRoutes', 'All routes');

  const totalDistance = activeRoutes.reduce((sum, route) => sum + (Number(route.distance.replace(/[^\d.]/g, '')) || 0), 0);
  const totalEarned = activeRoutes.reduce((sum, route) => {
    const parsed = Number(route.cost.replace(/[^0-9.,]/g, '').replace(/,/g, '')) || 0;
    return sum + parsed;
  }, 0);
  const avgConfidence = activeRoutes.length
    ? Math.round(activeRoutes.reduce((sum, route) => sum + route.confidence, 0) / activeRoutes.length)
    : 0;

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

  const applyQuickRange = (monthsBack: number, preset: Exclude<QuickRangePreset, null>) => {
    const end = endOfDay(new Date());
    const start = new Date(end);
    start.setMonth(start.getMonth() - monthsBack);
    isProgrammaticRangeChange.current = true;
    setRangeStart(startOfDay(start));
    setRangeEnd(end);
    setQuickRangePreset(preset);
    setLeftMode('calendar');
  };

  const openCalendarMode = () => {
    if (leftMode !== 'calendar') {
      applyQuickRange(1, '1m');
      return;
    }
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
            placeholder={u('history.searchRoutes', 'Search routes...')}
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 grid grid-cols-3 gap-2">
          <button
            onClick={() => setLeftMode('all')}
            className={cn(
              'h-10 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2',
              leftMode === 'all' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            )}
          >
            <Filter className="w-4 h-4" />
            {u('history.filter.all', 'All')}
          </button>
          <button
            onClick={() => setLeftMode('today')}
            className={cn(
              'h-10 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2',
              leftMode === 'today' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            )}
          >
            <Clock3 className="w-4 h-4" />
            {u('history.filter.today', 'Today')}
          </button>
          <button
            onClick={openCalendarMode}
            className={cn(
              'h-10 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2',
              leftMode === 'calendar' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            )}
          >
            <CalendarDays className="w-4 h-4" />
            {u('history.filter.calendar', 'Calendar')}
          </button>
        </div>

        {leftMode === 'calendar' && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wider text-primary">
                {u('history.dateRange', 'Date Range')}
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
                  prevArrow: '<span aria-hidden="true">â€¹</span>',
                  nextArrow: '<span aria-hidden="true">â€º</span>',
                }}
                onChange={(dates) => {
                  if (dates.length === 2) {
                    if (isProgrammaticRangeChange.current) {
                      isProgrammaticRangeChange.current = false;
                      return;
                    }
                    setRangeStart(startOfDay(dates[0]));
                    setRangeEnd(endOfDay(dates[1]));
                    setQuickRangePreset(null);
                  }
                }}
                className="hidden"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => applyQuickRange(1, '1m')}
                className={cn(
                  'h-9 rounded-lg border text-xs font-bold cursor-pointer transition-colors',
                  quickRangePreset === '1m'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary'
                )}
              >
                {u('history.quickRange.1m', 'Past month')}
              </button>
              <button
                onClick={() => applyQuickRange(6, '6m')}
                className={cn(
                  'h-9 rounded-lg border text-xs font-bold cursor-pointer transition-colors',
                  quickRangePreset === '6m'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary'
                )}
              >
                {u('history.quickRange.6m', 'Past half year')}
              </button>
              <button
                onClick={() => applyQuickRange(12, '12m')}
                className={cn(
                  'h-9 rounded-lg border text-xs font-bold cursor-pointer transition-colors',
                  quickRangePreset === '12m'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary'
                )}
              >
                {u('history.quickRange.12m', 'Past year')}
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {(leftMode === 'calendar' ? rangeRoutes : activeRoutes).map((route) => (
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
              {u('history.noRoutes', 'No routes match this filter.')}
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
            {u('history.tab.overview', 'Overview')}
          </button>
          <button
            onClick={() => setRightTab('map')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'map' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <MapPin className="w-4 h-4" />
            {u('history.tab.map', 'Map')}
          </button>
          <button
            onClick={() => setRightTab('timeline')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'timeline' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Clock3 className="w-4 h-4" />
            {u('history.tab.timeline', 'Timeline')}
          </button>
          <button
            onClick={() => setRightTab('magic')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'magic' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <WandSparkles className="w-4 h-4" />
            {u('history.tab.magic', 'Magic')}
          </button>
        </div>

        {rightTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-12 gap-4">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:col-span-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">{u('history.stats.routesInFocus', 'Routes in focus')}</p>
                <p className="text-3xl font-black dark:text-white mt-1">{activeRoutes.length}</p>
                <p className="text-xs text-slate-500 mt-1">{focusLabel}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:col-span-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">{u('history.stats.totalDistance', 'Total distance')}</p>
                <p className="text-3xl font-black dark:text-white mt-1">{Math.round(totalDistance)} km</p>
                <p className="text-xs text-slate-500 mt-1">{u('history.stats.selectedWindow', 'in selected window')}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:col-span-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">{u('history.stats.totalEarned', 'Total earned')}</p>
                <p className="text-3xl font-black dark:text-white mt-1">
                  {new Intl.NumberFormat(numberFormatLocale).format(Math.round(totalEarned))} â‚¬
                </p>
                <p className="text-xs text-slate-500 mt-1">{u('history.stats.fromSelectedRoutes', 'from selected routes')}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:col-span-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">{u('history.stats.aiConfidence', 'AI confidence')}</p>
                <p className="text-3xl font-black text-primary mt-1">{avgConfidence}%</p>
                <p className="text-xs text-slate-500 mt-1">{u('history.stats.avgActiveRoutes', 'average across active routes')}</p>
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
                        <p className="text-sm font-bold dark:text-white">{route.routeCode} â€¢ {route.origin} {'->'} {route.destination}</p>
                        <p className="text-xs text-slate-500 mt-1">{formatDdMmYyyy(route.dateObj)} â€¢ {route.vehicle}</p>
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
                {mapRoutes.map((route, index) => (
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
                {mapRoutes.map((route) => (
                  <Marker key={`${route.id}-start`} position={route.path[0]}>
                    <Popup>{route.routeCode} â€¢ {route.origin}</Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </Card>
        )}

        {rightTab === 'timeline' && (
          <Card title={u('history.routeTimeline', 'Route Timeline')}>
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
            <Card title={u('history.magicTwin', 'Magic Route Twin')}>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950">
                  <div className="flex items-center gap-2 text-primary mb-3">
                    <Sparkles className="w-4 h-4" />
                    <p className="text-xs font-black uppercase tracking-wider">
                      {u('history.aiInsight', 'AI Insight')}
                    </p>
                  </div>
                  <p className="text-sm dark:text-slate-200 italic">"{insights}"</p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950">
                  <div className="flex items-center gap-2 text-primary mb-3">
                    <Filter className="w-4 h-4" />
                    <p className="text-xs font-black uppercase tracking-wider">
                      {u('history.predictions', 'Predictions')}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: u('history.metrics.delayRisk', 'Delay risk'), value: leftMode === 'calendar' ? u('history.low', 'Low') : u('history.veryLow', 'Very Low'), width: '22%' },
                      { label: u('history.metrics.fuelEfficiency', 'Fuel efficiency'), value: `${avgConfidence}%`, width: `${Math.max(40, avgConfidence)}%` },
                      { label: u('history.metrics.routeQuality', 'Route quality'), value: activeRoute ? `${activeRoute.confidence}%` : '--', width: `${Math.max(30, activeRoute?.confidence || 0)}%` },
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

            <Card title={u('history.generatedByAi', 'Generated by Smartfreight.ai AI')}>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { label: u('history.bestWindow', 'Best window'), value: '06:00 - 10:00' },
                  { label: u('history.topVehicle', 'Top vehicle'), value: activeRoute?.vehicle || '---' },
                  { label: u('history.co2Savings', 'CO2 savings'), value: `${activeRoutes.length * 7}%` },
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

