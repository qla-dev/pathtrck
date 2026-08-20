import { useState, useMemo } from 'react';
import Flatpickr from 'react-flatpickr';
import { Search, MapPin, ChevronRight, Package as PackageIcon, Clock3, Coins, Truck, Plane, Ship, Filter, CalendarDays, Trash2, List, LayoutGrid } from 'lucide-react';
import { Language, Package as PackageData, Role } from '../../types';
import { api } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';
import { flatpickrI18n, ui, trPackageStatus } from '../../i18n';
import { cn } from '../../lib/cn';
import { mapLoadToPackage } from '../../lib/loadDetails';
import { LOAD_STATUS_OPTIONS, LoadStatusIcon } from '../load/LoadStatusPicker';
import { LoadDetailsModal } from '../tracking/LoadDetailsModal';

type TrackingFilterMode = 'all' | 'today' | 'calendar';
type TrackingStatusFilter = PackageData['status'] | 'all';
type TrackingLayoutMode = 'list' | 'grid';

const TRACKING_STATUS_FILTERS = LOAD_STATUS_OPTIONS
  .map(([, status]) => status)
  .filter((status) => status !== 'Posted');

const statusCardColors = (status: TrackingStatusFilter) => {
  switch (status) {
    case 'Opened': return 'border-cyan-400 text-cyan-600 dark:text-cyan-300';
    case 'Sent': return 'border-blue-500 text-blue-600 dark:text-blue-300';
    case 'In delivery': return 'border-amber-400 text-amber-600 dark:text-amber-300';
    case 'Received': return 'border-violet-500 text-violet-600 dark:text-violet-300';
    case 'Finished': return 'border-emerald-500 text-emerald-600 dark:text-emerald-300';
    case 'Pending': return 'border-orange-400 text-orange-600 dark:text-orange-300';
    case 'Cancelled': return 'border-rose-500 text-rose-600 dark:text-rose-300';
    default: return 'border-slate-400 text-slate-600 dark:text-slate-300';
  }
};

const statusBadgeColors = (status: PackageData['status']) => {
  switch (status) {
    case 'Opened': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300';
    case 'Sent': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300';
    case 'In delivery': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
    case 'Received': return 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300';
    case 'Finished': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
    case 'Cancelled': return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
};

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

const packageActivityDate = (pkg: PackageData) => {
  const source = pkg.history[0]?.date || pkg.addedDate;
  const direct = new Date(source);
  if (!Number.isNaN(direct.getTime())) return direct;
  const parts = source.match(/^(\d{1,2})\s+([A-Za-z]+)(?:,\s*(\d{1,2}):(\d{2}))?/);
  if (!parts) return null;
  const [, day, month, hours = '00', minutes = '00'] = parts;
  const timestamp = Date.parse(`${month} ${day}, ${new Date().getFullYear()} ${hours}:${minutes}`);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
};

type TrackingViewProps = {
  lang: Language;
  role: Role;
  userId?: number;
  companyIds?: number[];
};

export const TrackingView = ({ lang, role, userId, companyIds = [] }: TrackingViewProps) => {
  const TRUCK_CAPACITY_KG = 48000;
  const loadsResult = useApiList(api.loads.list, { per_page: 500 });
  const packages = useMemo<PackageData[]>(
    () => loadsResult.items
      .filter((load) => String(load.status || '').toLowerCase() !== 'posted')
      .map((load) => mapLoadToPackage(load, lang)),
    [lang, loadsResult.items]
  );
  const [openLoadId, setOpenLoadId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrackingStatusFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layout, setLayout] = useState<TrackingLayoutMode>('list');
  const [filterMode, setFilterMode] = useState<TrackingFilterMode>('all');
  const [rangeStart, setRangeStart] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return startOfDay(date);
  });
  const [rangeEnd, setRangeEnd] = useState(() => endOfDay(new Date()));
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  const filteredPackages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const todayStart = startOfDay(new Date()).getTime();
    const todayEnd = endOfDay(new Date()).getTime();

    return packages.filter((pkg) => {
      const matchesQuery = `${pkg.trackingNumber} ${pkg.bookingReference || ''} ${pkg.recipient || ''} ${pkg.carrier} ${pkg.origin} ${pkg.destination}`
        .toLowerCase()
        .includes(normalizedQuery);
      const matchesFields = matchesQuery && (statusFilter === 'all' || pkg.status === statusFilter);
      if (!matchesFields || filterMode === 'all') return matchesFields;

      const activityDate = packageActivityDate(pkg);
      if (!activityDate) return false;
      const timestamp = activityDate.getTime();

      return filterMode === 'today'
        ? timestamp >= todayStart && timestamp <= todayEnd
        : timestamp >= rangeStart.getTime() && timestamp <= rangeEnd.getTime();
    });
  }, [filterMode, packages, query, rangeEnd, rangeStart, statusFilter]);

  const statusCounts = useMemo(() => Object.fromEntries(
    ['all', ...TRACKING_STATUS_FILTERS].map((status) => [
      status,
      status === 'all' ? packages.length : packages.filter((pkg) => pkg.status === status).length,
    ])
  ) as Record<TrackingStatusFilter, number>, [packages]);

  const loadCapacity = useMemo(() => {
    const roleLoads = loadsResult.items.filter((load) => {
      if (role === 'driver') return Boolean(userId) && Number(load.assigned_driver_user_id) === userId;
      if (role === 'company') {
        return (
          (Boolean(userId) && Number(load.customer_user_id) === userId) ||
          companyIds.includes(Number(load.company_id))
        );
      }
      return false;
    });
    const activeLoads = roleLoads.filter((load) =>
      ['sent', 'in_delivery'].includes(String(load.status).toLowerCase())
    );
    const totalWeightKg = activeLoads.reduce((sum, load) => sum + Number(load.weight_kg || 0), 0);
    const usedPercentage = Math.min(100, Math.round((totalWeightKg / TRUCK_CAPACITY_KG) * 100));

    return {
      activeLoads,
      totalWeightKg,
      usedPercentage,
      remainingPercentage: Math.max(0, 100 - usedPercentage),
      remainingKg: Math.max(0, TRUCK_CAPACITY_KG - totalWeightKg),
    };
  }, [companyIds, loadsResult.items, role, userId]);

  return (
    <div className="space-y-6">
      <div className="w-full">
      {/* Sidebar List */}
      <div className="w-full">
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          {(['all', ...TRACKING_STATUS_FILTERS] as TrackingStatusFilter[]).map((status) => (
            <button
              type="button"
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'min-h-20 cursor-pointer rounded-xl border bg-white px-3 py-3 text-center transition-all hover:-translate-y-0.5 dark:bg-slate-900',
                statusCardColors(status),
                statusFilter === status && 'ring-2 ring-current ring-offset-2 dark:ring-offset-slate-950'
              )}
            >
              <span className="flex items-center justify-center gap-1.5 truncate text-xs font-bold">
                {status === 'all' ? <LayoutGrid className="h-3.5 w-3.5" /> : <LoadStatusIcon status={status} />}
                <span>{status === 'all' ? u('history.filter.all', 'All') : trPackageStatus(lang, status)}</span>
              </span>
              <span className="mt-1 block text-2xl font-black text-slate-700 dark:text-slate-100">{statusCounts[status]}</span>
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h3 className="text-lg font-black text-slate-800 dark:text-white">{u('tracking.filters', 'Shipment filters')}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
                className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-primary px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
              >
                <Filter className="h-4 w-4" />
                {filtersOpen ? u('tracking.hideFilters', 'Hide filters') : u('tracking.showFilters', 'Show filters')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const start = new Date();
                  start.setMonth(start.getMonth() - 1);
                  setQuery('');
                  setStatusFilter('all');
                  setFilterMode('all');
                  setRangeStart(startOfDay(start));
                  setRangeEnd(endOfDay(new Date()));
                }}
                className="flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-rose-400 px-3 text-xs font-bold text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/20"
              >
                <Trash2 className="h-4 w-4" />
                {u('tracking.clearFilters', 'Clear filters')}
              </button>
              <div className="relative block w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={u('common.searchTracking', 'Search tracking number...')}
                  className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
                {([
                  ['list', List, u('home.layout.list', 'List')],
                  ['grid', LayoutGrid, u('home.layout.grid', 'Grid')],
                ] as const).map(([mode, Icon, label]) => (
                  <button
                    type="button"
                    key={mode}
                    onClick={() => setLayout(mode)}
                    title={label}
                    aria-label={label}
                    aria-pressed={layout === mode}
                    className={cn(
                      'flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition-colors',
                      layout === mode
                        ? 'bg-primary text-white'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filtersOpen && (
            <div className="space-y-5 p-5">
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['all', Filter, u('history.filter.all', 'All')],
                  ['today', Clock3, u('history.filter.today', 'Today')],
                  ['calendar', CalendarDays, u('history.filter.calendar', 'Calendar')],
                ] as const).map(([mode, Icon, label]) => (
                  <button
                    type="button"
                    key={mode}
                    onClick={() => setFilterMode(mode)}
                    className={cn(
                      'flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all',
                      filterMode === mode
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              {filterMode === 'calendar' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-slate-500">{u('tracking.dateFrom', 'Date from')}</span>
                    <span className="relative block">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Flatpickr
                        value={rangeStart}
                        options={{ dateFormat: 'Y-m-d', altInput: true, altFormat: 'd.m.Y', allowInput: true, locale: flatpickrI18n(lang) }}
                        onChange={(dates) => dates[0] && setRangeStart(startOfDay(dates[0]))}
                        className="h-11 w-full cursor-pointer rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </span>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-bold text-slate-500">{u('tracking.dateTo', 'Date to')}</span>
                    <span className="relative block">
                      <CalendarDays className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Flatpickr
                        value={rangeEnd}
                        options={{ dateFormat: 'Y-m-d', altInput: true, altFormat: 'd.m.Y', allowInput: true, locale: flatpickrI18n(lang) }}
                        onChange={(dates) => dates[0] && setRangeEnd(endOfDay(dates[0]))}
                        className="h-11 w-full cursor-pointer rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                    </span>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {(role === 'company' || role === 'driver') && (
        <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                {u('tracking.loadCapacity', 'Load on truck')}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {loadCapacity.activeLoads.length} {u('tracking.activeLoads', 'active loads')}
              </p>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white whitespace-nowrap">
              {loadCapacity.totalWeightKg.toLocaleString()} kg
            </p>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Truck className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${loadCapacity.usedPercentage}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div>
                <p className="text-lg font-black text-primary">{loadCapacity.usedPercentage}%</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {u('tracking.cargoUsed', 'Cargo')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-slate-900 dark:text-white">{loadCapacity.remainingPercentage}%</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {u('tracking.freeSpace', 'Free space')}
                </p>
              </div>
            </div>
          </div>
        </div>
        )}

        <div className={cn(
          'mt-6',
          layout === 'list'
            ? 'space-y-4'
            : 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'
        )}>
          {filteredPackages.map(pkg => (
            <button
              key={pkg.id}
              onClick={() => setOpenLoadId(pkg.id)}
              className="h-full w-full cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-primary dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{pkg.carrier}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {pkg.transportType === 'air' ? (
                      <Plane className="h-3 w-3" />
                    ) : pkg.transportType === 'sea' ? (
                      <Ship className="h-3 w-3" />
                    ) : (
                      <Truck className="h-3 w-3" />
                    )}
                    {pkg.transportType === 'air'
                      ? u('postLoadModal.transport.air', 'Air')
                      : pkg.transportType === 'sea'
                        ? u('postLoadModal.transport.sea', 'Sea')
                        : u('postLoadModal.transport.road', 'Road')}
                    {pkg.cargoType ? ` · ${pkg.cargoType}` : ''}
                  </span>
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                    statusBadgeColors(pkg.status)
                  )}>
                    <LoadStatusIcon status={pkg.status} className="h-3 w-3" />
                    {trPackageStatus(lang, pkg.status)}
                  </span>
                </div>
              </div>
              <p className="font-bold dark:text-white">{pkg.recipient || '—'}</p>
              <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">
                {u('tracking.bookingReference', 'Booking reference')}: {pkg.bookingReference || '—'}
              </p>
              {pkg.description && (
                <p className="mt-2 line-clamp-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  {pkg.description}
                </p>
              )}
              <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                <div className="flex min-w-0 items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
                    <MapPin className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate text-xs font-bold">{pkg.origin}</span>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="flex min-w-0 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white">
                    <MapPin className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate text-xs font-bold">{pkg.destination}</span>
                </div>
              </div>
              <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-3 dark:border-slate-800">
                <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950">
                  <PackageIcon className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{u('tracking.number', 'Tracking no.')}</p><p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{pkg.trackingNumber}</p></div>
                </div>
                <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950">
                  <Coins className="h-4 w-4 shrink-0 text-emerald-500" />
                  <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{u('tracking.totalAmount', 'Load value')}</p><p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{pkg.totalAmount || '—'}</p></div>
                </div>
                <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950">
                  <CalendarDays className="h-4 w-4 shrink-0 text-violet-500" />
                  <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{u('tracking.transit', 'Transit')}</p><p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{pkg.transitDays ? `${pkg.transitDays} ${u('tracking.days', 'days')}` : u('tracking.notScheduled', 'Not scheduled')}</p></div>
                </div>
              </div>
            </button>
          ))}
          {filteredPackages.length === 0 && (
            <div className={cn(
              'rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800',
              layout === 'grid' && 'md:col-span-2 xl:col-span-3'
            )}>
              {u('tracking.noPackagesFound', 'No tracking items found for this filter.')}
            </div>
          )}
        </div>
      </div>

      {openLoadId && (
        <LoadDetailsModal
          loadId={openLoadId}
          lang={lang}
          role={role}
          userId={userId}
          companyIds={companyIds}
          onClose={() => setOpenLoadId(null)}
          onChanged={loadsResult.refresh}
        />
      )}
      </div>
    </div>
  );
};
