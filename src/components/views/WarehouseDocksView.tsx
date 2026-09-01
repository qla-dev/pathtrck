import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarClock,
  CheckCircle2,
  CircleSlash,
  LayoutGrid,
  List,
  Loader2,
  Package,
  Plus,
  Search,
  Truck,
  Warehouse as WarehouseIcon,
  type LucideIcon,
} from 'lucide-react';

import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { Language } from '../../types';
import { api } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { DataTable } from '../ui/DataTable';
import { PageHeader } from '../ui/PageHeader';

type Direction = 'inbound' | 'outbound';
type MovementStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

type DockMovement = {
  id: string;
  warehouseId: string;
  warehouseName: string;
  direction: Direction;
  status: MovementStatus;
  scheduledAt: string;
  dockNumber: string;
  customerName: string;
  storageType: string;
  pallets: number;
  description: string;
};

const STATUS_ORDER: MovementStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled'];

const STATUS_ICONS: Record<MovementStatus, LucideIcon> = {
  scheduled: CalendarClock,
  in_progress: Truck,
  completed: CheckCircle2,
  cancelled: CircleSlash,
};

// One colour per status, used by both the filter pills and the row chips so a movement reads the
// same wherever it appears.
const STATUS_TONE: Record<MovementStatus, string> = {
  scheduled: 'border-amber-500/30 text-amber-600 dark:text-amber-400',
  in_progress: 'border-sky-500/30 text-sky-600 dark:text-sky-400',
  completed: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
  cancelled: 'border-rose-500/30 text-rose-600 dark:text-rose-400',
};

const DIRECTION_TONE: Record<Direction, string> = {
  inbound: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  outbound: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
};

const toDateInput = (date: Date) => date.toISOString().slice(0, 10);

/**
 * "My docks" - the warehouse counterpart of the carrier's "My cargo" page.
 *
 * A warehouse account does not run loads, it runs a dock day: what arrives, what leaves, at which
 * gate and for whom. The dashboard already shows today's schedule as one panel; this is the same
 * ledger as a page you can work from - filter by direction and status, search a customer, widen the
 * date window past today - laid out the way the cargo page is so the two feel like one product.
 */
export const WarehouseDocksView = ({ lang, onReceiveGoods }: { lang: Language; onReceiveGoods?: () => void }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const today = toDateInput(new Date());
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [direction, setDirection] = useState<'all' | Direction>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | MovementStatus>('all');
  const [warehouseId, setWarehouseId] = useState<'all' | string>('all');
  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState<'list' | 'grid'>('list');

  const movementsResult = useApiList(api.warehouseMovements.list, {
    per_page: 200,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    ...(direction === 'all' ? {} : { direction }),
  });

  // The facility filter only earns its place once the account runs more than one warehouse.
  const [facilities, setFacilities] = useState<Array<{ id: string; name: string }>>([]);
  useEffect(() => {
    let cancelled = false;
    void api.warehouses.list({ per_page: 200 })
      .then((response) => {
        if (cancelled) return;
        setFacilities(response.data.map((row) => ({ id: String(row.id), name: String(row.name || `#${row.id}`) })));
      })
      .catch(() => {
        // Non-critical - without it the page simply shows every facility at once.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const movements = useMemo<DockMovement[]>(() => movementsResult.items.map((row) => {
    const warehouse = (row.warehouse || {}) as Record<string, unknown>;
    const status = String(row.status || 'scheduled');
    return {
      id: String(row.id),
      warehouseId: String(row.warehouse_id ?? ''),
      warehouseName: String(warehouse.name || row.warehouse_name || '—'),
      direction: row.direction === 'outbound' ? 'outbound' : 'inbound',
      status: (STATUS_ORDER as string[]).includes(status) ? status as MovementStatus : 'scheduled',
      scheduledAt: String(row.scheduled_at || ''),
      dockNumber: String(row.dock_number || ''),
      customerName: String(row.customer_name || '—'),
      storageType: String(row.storage_type || ''),
      pallets: Number(row.pallets || 0),
      description: String(row.description || ''),
    };
  }), [movementsResult.items]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: movements.length };
    for (const status of STATUS_ORDER) counts[status] = movements.filter((row) => row.status === status).length;
    return counts;
  }, [movements]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return movements.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (warehouseId !== 'all' && row.warehouseId !== warehouseId) return false;
      if (!needle) return true;
      return `${row.customerName} ${row.dockNumber} ${row.storageType} ${row.description} ${row.warehouseName}`
        .toLowerCase()
        .includes(needle);
    });
  }, [movements, query, statusFilter, warehouseId]);

  const statusLabel = (status: MovementStatus) => ({
    scheduled: u('warehouseDocks.status.scheduled', 'Scheduled'),
    in_progress: u('warehouseDocks.status.inProgress', 'In progress'),
    completed: u('warehouseDocks.status.completed', 'Completed'),
    cancelled: u('warehouseDocks.status.cancelled', 'Cancelled'),
  }[status]);

  const directionLabel = (value: Direction) => value === 'inbound'
    ? u('warehouseView.inbound', 'Inbound')
    : u('warehouseView.outbound', 'Outbound');

  const formatTime = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? '—'
      : parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  const formatDay = (value: string) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString();
  };

  const inbound = visible.filter((row) => row.direction === 'inbound');
  const outbound = visible.filter((row) => row.direction === 'outbound');
  const showFacilityColumn = facilities.length > 1;

  const StatusChip = ({ status }: { status: MovementStatus }) => {
    const Icon = STATUS_ICONS[status];
    return (
      <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider', STATUS_TONE[status])}>
        <Icon className="h-3 w-3" />
        {statusLabel(status)}
      </span>
    );
  };

  const DirectionChip = ({ value }: { value: Direction }) => (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', DIRECTION_TONE[value])}>
      {value === 'inbound' ? <ArrowDownToLine className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
      {directionLabel(value)}
    </span>
  );

  return (
    <div className="space-y-3">
      <PageHeader
        icon={ArrowDownToLine}
        title={u('nav.myDocks', 'My docks')}
        subtitle={u('warehouseDocks.subtitle', 'Everything booked in and out of your docks.')}
        actions={onReceiveGoods && (
          <Button className="rounded-full" onClick={onReceiveGoods}>
            <Plus className="mr-2 h-4 w-4" />
            {u('warehouseDocks.receiveGoods', 'Receive goods')}
          </Button>
        )}
        filters={[
          { id: 'all', label: u('history.filter.all', 'All'), count: movements.length },
          { id: 'inbound', label: u('warehouseView.inbound', 'Inbound'), count: movements.filter((row) => row.direction === 'inbound').length },
          { id: 'outbound', label: u('warehouseView.outbound', 'Outbound'), count: movements.filter((row) => row.direction === 'outbound').length },
        ]}
        activeFilter={direction}
        onFilterChange={(id) => setDirection(id as 'all' | Direction)}
        stats={[
          { label: u('warehouseDocks.stat.movements', 'Movements'), value: visible.length, icon: CalendarClock, tone: 'bg-sky-500/10 text-sky-500' },
          { label: u('warehouseView.inbound', 'Inbound'), value: inbound.length, icon: ArrowDownToLine, tone: 'bg-emerald-500/10 text-emerald-500' },
          { label: u('warehouseView.outbound', 'Outbound'), value: outbound.length, icon: ArrowUpFromLine, tone: 'bg-violet-500/10 text-violet-500' },
          { label: u('warehouseDocks.stat.palletsIn', 'Pallets in'), value: inbound.reduce((sum, row) => sum + row.pallets, 0), icon: Package, tone: 'bg-emerald-500/10 text-emerald-500' },
          { label: u('warehouseDocks.stat.palletsOut', 'Pallets out'), value: outbound.reduce((sum, row) => sum + row.pallets, 0), icon: Package, tone: 'bg-violet-500/10 text-violet-500' },
        ]}
      />

      {/* One pill per status, the way the cargo page reads its shipments. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(['all', ...STATUS_ORDER] as Array<'all' | MovementStatus>).map((status) => {
          const Icon = status === 'all' ? LayoutGrid : STATUS_ICONS[status];
          return (
            <button
              type="button"
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border bg-white text-sm font-bold transition-all hover:-translate-y-0.5 dark:bg-slate-900',
                status === 'all' ? 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300' : STATUS_TONE[status],
                statusFilter === status && 'ring-2 ring-current ring-offset-2 dark:ring-offset-slate-950'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{status === 'all' ? u('history.filter.all', 'All') : statusLabel(status)}</span>
              <span className="opacity-70">{statusCounts[status] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <Card className="shadow-none" contentClassName="p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={u('warehouseDocks.searchPlaceholder', 'Search customer, dock or storage type...')}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          {showFacilityColumn && (
            <select
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
              className="h-10 cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">{u('warehouseDocks.allFacilities', 'All warehouses')}</option>
              {facilities.map((facility) => <option key={facility.id} value={facility.id}>{facility.name}</option>)}
            </select>
          )}
          <div className="inline-flex h-10 items-center rounded-lg border border-slate-200 p-1 dark:border-slate-800">
            {([['list', List], ['grid', LayoutGrid]] as const).map(([mode, Icon]) => (
              <button
                type="button"
                key={mode}
                onClick={() => setLayout(mode)}
                className={cn('flex h-8 w-8 cursor-pointer items-center justify-center rounded-md', layout === mode ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800')}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </Card>

      {movementsResult.loading ? (
        <Card className="shadow-none" contentClassName="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {u('common.loading', 'Loading...')}
        </Card>
      ) : visible.length === 0 ? (
        <Card className="shadow-none" contentClassName="py-12 text-center text-sm text-slate-500">
          {u('warehouseDocks.empty', 'No dock movements match this filter.')}
        </Card>
      ) : layout === 'list' ? (
        <Card className="shadow-none" contentClassName="p-0">
          <div className="overflow-x-auto">
            <DataTable className="min-w-[720px] text-[13px]">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th className="px-3 py-2">{u('warehouseView.colTime', 'Time')}</th>
                  {showFacilityColumn && <th className="px-3 py-2">{u('warehouseView.colFacility', 'Warehouse')}</th>}
                  <th className="px-3 py-2">{u('warehouseView.colType', 'Type')}</th>
                  <th className="px-3 py-2">{u('warehouseDocks.colDock', 'Dock')}</th>
                  <th className="px-3 py-2">{u('warehouseView.colCustomer', 'Customer')}</th>
                  <th className="px-3 py-2">{u('warehouseView.colPallets', 'Pallets')}</th>
                  <th className="px-3 py-2">{u('warehouseView.colStatus', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 dark:border-slate-800/60">
                    <td className="px-3 py-2">
                      <span className="block font-bold text-slate-800 dark:text-white">{formatTime(row.scheduledAt)}</span>
                      <span className="text-[10px] text-slate-400">{formatDay(row.scheduledAt)}</span>
                    </td>
                    {showFacilityColumn && <td className="px-3 py-2 text-slate-500">{row.warehouseName}</td>}
                    <td className="px-3 py-2"><DirectionChip value={row.direction} /></td>
                    <td className="px-3 py-2 text-xs font-bold text-primary">{row.dockNumber || '—'}</td>
                    <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{row.customerName}</td>
                    <td className="px-3 py-2 font-bold dark:text-white">{row.pallets}</td>
                    <td className="px-3 py-2"><StatusChip status={row.status} /></td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((row) => (
            <Card key={row.id} className="shadow-none" contentClassName="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900 dark:text-white">{row.customerName}</p>
                  <p className="text-[11px] font-semibold text-slate-500">
                    {formatTime(row.scheduledAt)} · {formatDay(row.scheduledAt)}
                  </p>
                </div>
                <StatusChip status={row.status} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <DirectionChip value={row.direction} />
                {row.dockNumber && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {u('warehouseDocks.colDock', 'Dock')} {row.dockNumber}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Package className="h-3 w-3" />
                  {row.pallets}
                </span>
              </div>
              {(showFacilityColumn || row.storageType) && (
                <p className="flex items-center gap-1.5 truncate text-[11px] font-semibold text-slate-500">
                  <WarehouseIcon className="h-3.5 w-3.5 shrink-0" />
                  {[showFacilityColumn ? row.warehouseName : '', row.storageType].filter(Boolean).join(' · ')}
                </p>
              )}
              {row.description && <p className="line-clamp-2 text-[11px] text-slate-500">{row.description}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
