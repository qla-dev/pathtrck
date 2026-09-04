import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  Ban,
  BarChart3,
  Boxes,
  Clock3,
  Gauge,
  Loader2,
  MapPin,
  PackageCheck,
  Pencil,
  Plus,
  Radio,
  ShieldAlert,
  TrendingUp,
  Users,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

import { api } from '../../services/api';
import { Language } from '../../types';
import { cn } from '../../lib/cn';
import { ui } from '../../i18n';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { AddWarehouseModal } from '../modals/AddWarehouseModal/AddWarehouseModal';
import { WarehouseStatusModal } from '../modals/WarehouseStatusModal';
import { showError, showSuccess } from '../../lib/swal';
import { IconSelect } from '../ui/IconSelect';
import { DataTable } from '../ui/DataTable';

type WarehouseStatus = 'pending' | 'verified' | 'suspended';

type WarehouseFacility = {
  id: number;
  name: string | null;
  city: string | null;
  country_code: string | null;
  status: string | null;
  total_capacity_pallets: number;
  occupied_pallets: number;
  available_pallets: number;
  occupancy_percent: number;
};

type WarehouseOverviewData = {
  warehouse: Record<string, unknown> | null;
  warehouses: WarehouseFacility[];
  selected_warehouse_id: number | null;
  stats: Record<string, unknown>;
  dock_schedule: Record<string, unknown>[];
  inventory_summary: Record<string, unknown>[];
  recent_arrivals: Record<string, unknown>[];
  top_customers: Record<string, unknown>[];
};

const formatTime = (value: unknown) => {
  const date = value ? new Date(String(value)) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';
};

const isLive = (status: unknown) => status === 'verified' || status === 'active';

const formatDate = (value: unknown) => {
  const date = value ? new Date(String(value)) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : '—';
};

export const WarehouseOverviewView = ({
  lang,
  networkView = false,
  createSignal = 0,
  onCreateSignalHandled,
}: {
  lang: Language;
  networkView?: boolean;
  createSignal?: number;
  onCreateSignalHandled?: () => void;
}) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [data, setData] = useState<WarehouseOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  // When navigation carries a create signal, mount with the modal already open; do not paint an
  // intermediate warehouse frame before the effect processes the signal.
  const [createOpen, setCreateOpen] = useState(createSignal > 0);
  const [editMode, setEditMode] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Record<string, unknown> | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [statusSavingId, setStatusSavingId] = useState<number | null>(null);
  const [statusWarehouseId, setStatusWarehouseId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // 'all' keeps every facility the account operates in one set of figures; an id narrows every
  // panel below to that one warehouse. The server does the aggregating either way.
  const [scope, setScope] = useState<number | 'all'>('all');

  useEffect(() => {
    if (createSignal <= 0) return;
    setCreateOpen(true);
    onCreateSignalHandled?.();
  }, [createSignal, onCreateSignalHandled]);

  useEffect(() => {
    setLoading(true);
    const overviewRequest = api.warehouse.overview(scope === 'all' ? {} : { warehouse_id: scope });
    void (networkView
      ? Promise.all([overviewRequest, api.warehouses.list({ per_page: 500 })]).then(([response, directory]) => {
          const overview = response.data as unknown as WarehouseOverviewData;
          if ((overview.warehouses || []).length > 0 || directory.data.length === 0) return overview;

          // Compatibility fallback for an API node that still returns the old owner-scoped
          // overview payload: admins must see the global directory immediately instead of the
          // misleading "no warehouse" state while that node is being rolled forward.
          const facilities = directory.data.map((row) => {
            const capacity = Math.max(0, Number(row.total_capacity_pallets || 0));
            const occupied = Math.max(0, Number(row.occupied_pallets || 0));
            return {
              id: Number(row.id),
              name: row.name == null ? null : String(row.name),
              city: row.city == null ? null : String(row.city),
              country_code: row.country_code == null ? null : String(row.country_code),
              status: row.status == null ? null : String(row.status),
              total_capacity_pallets: capacity,
              occupied_pallets: occupied,
              available_pallets: Math.max(0, capacity - occupied),
              occupancy_percent: capacity > 0 ? Math.min(100, Math.round((occupied / capacity) * 1000) / 10) : 0,
            } satisfies WarehouseFacility;
          });
          const totalCapacity = facilities.reduce((sum, facility) => sum + facility.total_capacity_pallets, 0);
          const occupiedPallets = facilities.reduce((sum, facility) => sum + facility.occupied_pallets, 0);
          return {
            ...overview,
            warehouse: directory.data[0] || null,
            warehouses: facilities,
            selected_warehouse_id: null,
            stats: {
              ...(overview.stats || {}),
              warehouse_count: facilities.length,
              scoped_warehouse_count: facilities.length,
              total_capacity_pallets: totalCapacity,
              occupied_pallets: occupiedPallets,
              available_pallets: Math.max(0, totalCapacity - occupiedPallets),
              occupancy_percent: totalCapacity > 0 ? Math.min(100, Math.round((occupiedPallets / totalCapacity) * 1000) / 10) : 0,
              currency: String(overview.stats?.currency || 'EUR'),
            },
            dock_schedule: overview.dock_schedule || [],
            inventory_summary: overview.inventory_summary || [],
            recent_arrivals: overview.recent_arrivals || [],
            top_customers: overview.top_customers || [],
          } satisfies WarehouseOverviewData;
        })
      : overviewRequest.then((response) => response.data as unknown as WarehouseOverviewData))
      .then(setData)
      .finally(() => setLoading(false));
  }, [networkView, reloadKey, scope]);

  const createModal = (
    <AddWarehouseModal
      open={createOpen}
      lang={lang}
      onClose={() => setCreateOpen(false)}
      onCreated={() => {
        setReloadKey((current) => current + 1);
        void showSuccess(u('warehouses.created', 'Warehouse created'), u('warehouses.createdText', 'The facility is now listed.'));
      }}
    />
  );

  const editWarehouse = async (id: number) => {
    setEditingId(id);
    try {
      const response = await api.warehouses.get(id);
      setEditingWarehouse(response.data);
    } catch (caught) {
      void showError(
        u('warehouses.editFailed', 'Warehouse could not be opened'),
        caught instanceof Error ? caught.message : undefined,
      );
    } finally {
      setEditingId(null);
    }
  };

  const editModal = (
    <>
    <WarehouseStatusModal
      open={statusWarehouseId !== null}
      lang={lang}
      warehouseId={statusWarehouseId}
      onClose={() => setStatusWarehouseId(null)}
    />
    <AddWarehouseModal
      open={Boolean(editingWarehouse)}
      lang={lang}
      warehouse={editingWarehouse}
      onClose={() => setEditingWarehouse(null)}
      onUpdated={() => {
        setEditingWarehouse(null);
        setReloadKey((current) => current + 1);
        void showSuccess(u('warehouses.updated', 'Warehouse updated'), u('warehouses.updatedText', 'The facility profile has been saved.'));
      }}
    />
    </>
  );

  const updateStatus = async (facility: WarehouseFacility, status: WarehouseStatus) => {
    const currentStatus = facility.status === 'active' ? 'verified' : facility.status;
    if (currentStatus === status) return;
    setStatusSavingId(facility.id);
    try {
      await api.warehouses.update(facility.id, { status });
      setData((current) => current ? {
        ...current,
        warehouses: current.warehouses.map((row) => row.id === facility.id ? { ...row, status } : row),
        warehouse: current.warehouse && Number(current.warehouse.id) === facility.id
          ? { ...current.warehouse, status }
          : current.warehouse,
      } : current);
      void showSuccess(
        u('warehouses.statusUpdated', 'Warehouse status updated'),
        u('warehouses.statusUpdatedText', 'The new status is active immediately.'),
      );
    } catch (caught) {
      void showError(
        u('warehouses.statusFailed', 'Could not update the warehouse status'),
        caught instanceof Error ? caught.message : undefined,
      );
    } finally {
      setStatusSavingId(null);
    }
  };

  if (loading) {
    return <>
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">{u('common.loading', 'Loading...')}</div>
      {createModal}
      {editModal}
    </>;
  }

  if (!data || (data.warehouses || []).length === 0) {
    return <>
      <Card contentClassName="p-8 text-center">
        <WarehouseIcon className="mx-auto h-10 w-10 text-slate-400" />
        <p className="mt-3 font-black text-slate-900 dark:text-white">{networkView ? u('warehouses.empty', 'No warehouses found.') : u('warehouseView.emptyTitle', 'No warehouse set up yet')}</p>
        <p className="mt-1 text-sm text-slate-500">{networkView ? u('warehouses.subtitle', 'Browse storage facilities, capacity and coverage.') : u('warehouseView.emptySubtitle', 'Contact support to set up your warehouse facility.')}</p>
        <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}><Plus className="mr-1.5 h-4 w-4" />{u('warehouses.create', 'Create Warehouse')}</Button>
      </Card>
      {createModal}
      {editModal}
    </>;
  }

  const facilities = data.warehouses;
  const scoped = scope === 'all' ? facilities : facilities.filter((row) => row.id === scope);
  const scopeLabel = scope === 'all'
    ? `${facilities.length} ${u('warehouseView.facilitiesUnit', 'objekata')}`
    : `${scoped[0]?.name || '—'}${scoped[0]?.city ? ` · ${scoped[0].city}` : ''}${scoped[0]?.country_code ? `, ${scoped[0].country_code}` : ''}`;
  // A facility stays visible to its owner while it waits for an admin to enable it - the banner is
  // what tells them the numbers below are not live in the network yet. Across several facilities it
  // reports how many of them are still waiting rather than singling one out.
  const waiting = scoped.filter((row) => !isLive(row.status));
  const suspended = waiting.filter((row) => row.status === 'suspended');
  const statusNotice = waiting.length === 0
    ? null
    : suspended.length === waiting.length
      ? { title: u('warehouseView.statusSuspended', 'Suspended'), text: u('warehouseView.statusSuspendedText', 'This facility is disabled and cannot take new bookings.'), tone: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300' }
      : { title: u('warehouseView.statusPending', 'Pending verification'), text: u('warehouseView.statusPendingText', 'An administrator still has to enable this facility before it goes live in the network.'), tone: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300' };
  const stats = data.stats || {};
  const currency = String(stats.currency || 'EUR');
  const occupancyPercent = Number(stats.occupancy_percent || 0);
  const occupiedPallets = Number(stats.occupied_pallets || 0);
  const availablePallets = Number(stats.available_pallets || 0);
  const totalCapacity = Number(stats.total_capacity_pallets || 0);

  const occupancyRamp = (percent: number) =>
    percent >= 90
      ? { fill: 'bg-rose-500', track: 'bg-rose-100 dark:bg-rose-500/15', ink: 'text-rose-600 dark:text-rose-400' }
      : percent >= 70
        ? { fill: 'bg-amber-500', track: 'bg-amber-100 dark:bg-amber-500/15', ink: 'text-amber-600 dark:text-amber-400' }
        : { fill: 'bg-emerald-500', track: 'bg-emerald-100 dark:bg-emerald-500/15', ink: 'text-emerald-600 dark:text-emerald-400' };

  const occupancyData = [
    { name: u('warehouseView.occupied', 'Zauzeto'), value: occupiedPallets, color: '#f97316' },
    { name: u('warehouseView.available', 'Dostupno'), value: Math.max(0, availablePallets), color: '#e2e8f0' },
  ];

  const statCards = [
    { label: u('warehouseView.warehouseCount', 'Skladišta'), value: String(scoped.length), icon: WarehouseIcon, tone: 'bg-orange-500/10 text-orange-500' },
    { label: u('warehouseView.occupancy', 'Popunjenost'), value: `${occupancyPercent}%`, icon: Gauge, tone: 'bg-orange-500/10 text-orange-500' },
    { label: u('warehouseView.availableCapacity', 'Dostupni kapacitet'), value: `${availablePallets} pal.`, icon: Boxes, tone: 'bg-sky-500/10 text-sky-500' },
    { label: u('warehouseView.inboundToday', 'Prijem danas'), value: String(stats.inbound_today || 0), icon: ArrowDownToLine, tone: 'bg-emerald-500/10 text-emerald-500' },
    { label: u('warehouseView.outboundToday', 'Otprema danas'), value: String(stats.outbound_today || 0), icon: ArrowUpFromLine, tone: 'bg-violet-500/10 text-violet-500' },
    { label: u('warehouseView.storageRevenue', 'Prihod od skladištenja'), value: `${currency} ${Number(stats.storage_revenue || 0).toLocaleString()}`, icon: TrendingUp, tone: 'bg-amber-500/10 text-amber-500' },
    { label: u('warehouseView.totalRevenue', 'Ukupan prihod'), value: `${currency} ${Number(stats.total_revenue || 0).toLocaleString()}`, icon: PackageCheck, tone: 'bg-rose-500/10 text-rose-500' },
  ];

  const dockSchedule = data.dock_schedule || [];
  const showFacilityColumn = scope === 'all' && facilities.length > 1;
  const inventorySummary = data.inventory_summary || [];
  const topCustomers = data.top_customers || [];
  const recentArrivals = data.recent_arrivals || [];

  // Section heading shared by every panel below - compact by design so the KPI tiles plus four
  // panels stay inside one screen, the way the reference dashboard lays them out.
  const panelTitle = (Icon: typeof Boxes, text: string) => (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-orange-500" />
      <p className="text-sm font-black text-slate-900 dark:text-white">{text}</p>
    </div>
  );

  return <>
    <div className="space-y-3" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {statusNotice && (
        <div className={cn('flex items-start gap-2 rounded-2xl border px-4 py-3', statusNotice.tone)}>
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="text-sm font-black">{statusNotice.title}</p>
            <p className="mt-0.5 text-xs opacity-90">{statusNotice.text}</p>
          </div>
        </div>
      )}
      <PageHeader
        icon={WarehouseIcon}
        tone="orange"
        title={networkView ? u('nav.allWarehouseCompanies', 'Warehouse Companies') : u('warehouseView.title', 'Moj Warehouse')}
        subtitle={scopeLabel}
        subtitleIcon={MapPin}
        actions={<div className="flex flex-wrap items-center justify-end gap-2">
          {/* Same segmented control as My Fleet's Vehicles / Statistics switch, so both views
              change section the same way. */}
          <div className="inline-flex items-center rounded-full border border-sky-200/80 bg-sky-50/70 p-1 dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className={cn(
                'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95',
                editMode
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-slate-500 hover:text-primary dark:text-slate-300',
              )}
            >
              <WarehouseIcon className="h-4 w-4" />
              {u('warehouses.tabs.overview', 'Overview')}
            </button>
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className={cn(
                'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95',
                !editMode
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-slate-500 hover:text-primary dark:text-slate-300',
              )}
            >
              <BarChart3 className="h-4 w-4" />
              {u('warehouses.statistics', 'Statistics')}
            </button>
          </div>
          <Button className="rounded-full" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />{u('warehouses.create', 'Create Warehouse')}</Button>
        </div>}
        filters={[{ id: 'all', label: u('warehouseView.allFacilities', 'Sva skladišta'), count: facilities.length }, ...facilities.map((facility) => ({ id: facility.id, label: facility.name || '—' }))]}
        filtersAside={(
          <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-white/70 px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
            <span className="flex items-center gap-1 text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400"><Radio className="h-3 w-3 animate-pulse" />{u('common.live', 'Live')}</span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{occupiedPallets} / {totalCapacity} {u('warehouseView.palletsUnit', 'paleta')}</span>
          </div>
        )}
        activeFilter={scope}
        onFilterChange={(id) => setScope(id === 'all' ? 'all' : Number(id))}
        stats={statCards}
      />
      <AnimatePresence initial={false} mode="popLayout">
      {editMode ? (
        <motion.div
          key="warehouse-edit-list"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
        <Card className="shadow-none" contentClassName="p-0">
          <div className="overflow-x-auto">
            <DataTable className="min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                  <th className="p-3">{u('warehouses.colName', 'Warehouse')}</th>
                  <th className="p-3">{u('warehouses.colLocation', 'Location')}</th>
                  <th className="p-3">{u('warehouses.colCapacity', 'Capacity')}</th>
                  <th className="p-3">{u('warehouseView.occupancy', 'Occupancy')}</th>
                  <th className="p-3">{u('warehouses.colStatus', 'Status')}</th>
                  <th className="p-3 text-right">{u('Action', 'Action')}</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((facility) => (
                  <tr key={facility.id} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                    <td className="p-3 font-bold text-slate-900 dark:text-white">{facility.name || '—'}</td>
                    <td className="p-3 text-slate-500">{[facility.city, facility.country_code].filter(Boolean).join(', ') || '—'}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">{facility.total_capacity_pallets.toLocaleString()} {u('warehouseView.palletsUnit', 'paleta')}</td>
                    <td className="p-3">
                      {(() => {
                        const percent = Math.max(0, Math.min(100, Number(facility.occupancy_percent) || 0));
                        const ramp = occupancyRamp(percent);
                        return (
                          <div className="w-32">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className={cn('text-xs font-bold tabular-nums', ramp.ink)}>{percent}%</span>
                              <span className="text-[11px] tabular-nums text-slate-500">
                                {facility.occupied_pallets.toLocaleString()} / {facility.total_capacity_pallets.toLocaleString()}
                              </span>
                            </div>
                            <div
                              className={cn('mt-1 h-1.5 w-full overflow-hidden rounded-full', ramp.track)}
                              role="img"
                              aria-label={`${u('warehouseView.occupancy', 'Occupancy')}: ${percent}%`}
                            >
                              <div className={cn('h-full rounded-full', ramp.fill)} style={{ width: `${percent}%` }} />
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-3">
                      <div className="relative w-40">
                        {statusSavingId === facility.id && <Loader2 className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-primary" />}
                        <IconSelect
                          value={facility.status === 'active' ? 'verified' : String(facility.status || 'pending')}
                          disabled={statusSavingId === facility.id}
                          onChange={(next) => void updateStatus(facility, next as WarehouseStatus)}
                          placeholder={u('warehouses.colStatus', 'Status')}
                          ariaLabel={`${u('warehouses.changeStatus', 'Change status')}: ${facility.name || u('warehouses.colName', 'Warehouse')}`}
                          icon={Clock3}
                          className={statusSavingId === facility.id ? '[&_button]:pl-9' : undefined}
                          options={[
                            { value: 'pending', label: u('warehouses.statusPendingLabel', 'Pending'), icon: Clock3 },
                            { value: 'verified', label: u('warehouses.statusVerifiedLabel', 'Verified'), icon: BadgeCheck },
                            { value: 'suspended', label: u('warehouses.statusSuspendedLabel', 'Suspended'), icon: Ban },
                          ]}
                        />
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setStatusWarehouseId(facility.id)}>
                          <Activity className="mr-1.5 h-3.5 w-3.5" />{u('warehouses.colStatus', 'Status')}
                        </Button>
                        <Button size="sm" variant="outline" disabled={editingId === facility.id} onClick={() => void editWarehouse(facility.id)}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />{u('warehouses.edit', 'Edit')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>
        </Card>
        </motion.div>
      ) : <motion.div
        key="warehouse-statistics"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-3"
      >
      <div className="grid gap-3 xl:grid-cols-12">
      {facilities.length > 1 && (
        <Card className="shadow-none xl:col-span-3" contentClassName="p-4">
          {panelTitle(WarehouseIcon, u('warehouseView.capacityByFacility', 'Kapacitet po skladištu'))}
          <div className="mt-2 space-y-2.5">
            {facilities.map((facility) => (
              <div key={facility.id}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="truncate font-semibold text-slate-700 dark:text-slate-300">
                    {facility.name || '—'}
                    {!isLive(facility.status) && <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">{String(facility.status || 'pending')}</span>}
                  </span>
                  <span className="shrink-0 font-bold text-slate-900 dark:text-white">
                    {facility.occupied_pallets} / {facility.total_capacity_pallets} {u('warehouseView.palletsUnit', 'paleta')} · {facility.occupancy_percent}%
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-orange-500" style={{ width: `${Math.min(100, facility.occupancy_percent)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className={cn('grid gap-3', facilities.length > 1 ? 'xl:col-span-9 xl:grid-cols-9' : 'xl:col-span-12 xl:grid-cols-12')}>
        <Card className="shadow-none xl:col-span-3" contentClassName="p-4">
          {panelTitle(Gauge, u('warehouseView.capacityTitle', 'Kapacitet skladišta'))}
          <div className="mt-1 h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={occupancyData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={62} paddingAngle={3}>
                  {occupancyData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #1e293b', background: '#0f172a', color: '#e2e8f0' }} itemStyle={{ color: '#e2e8f0' }} labelStyle={{ color: '#e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {occupancyData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-2 text-slate-500">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-bold dark:text-white">{item.value} pal.</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className={cn('shadow-none', facilities.length > 1 ? 'xl:col-span-6' : 'xl:col-span-9')} contentClassName="p-4">
          {panelTitle(ArrowDownToLine, u('warehouseView.latestDockMovements', 'Latest dock movements'))}
          <div className="mt-2 overflow-x-auto">
            <DataTable className="min-w-[480px] text-xs">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="pb-1.5 pr-3">{u('warehouseView.colTime', 'Vrijeme')}</th>
                  {showFacilityColumn && <th className="pb-1.5 pr-3">{u('warehouseView.colFacility', 'Skladište')}</th>}
                  <th className="pb-1.5 pr-3">{u('warehouseView.colType', 'Tip')}</th>
                  <th className="pb-1.5 pr-3">{u('warehouseView.colCustomer', 'Klijent')}</th>
                  <th className="pb-1.5 pr-3">{u('warehouseView.colPallets', 'Palete')}</th>
                  <th className="pb-1.5">{u('warehouseView.colStatus', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {dockSchedule.length === 0 && (
                  <tr>
                    <td colSpan={showFacilityColumn ? 6 : 5} className="py-4 text-center text-slate-500">{u('warehouseView.noDockMovements', 'No dock movements recorded yet.')}</td>
                  </tr>
                )}
                {dockSchedule.map((row) => {
                  const isInbound = row.direction === 'inbound';
                  return (
                    <tr key={String(row.id)} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-300">
                        <span className="block font-semibold">{formatTime(row.scheduled_at)}</span>
                        <span className="block text-[10px] text-slate-400">{formatDate(row.scheduled_at)}</span>
                      </td>
                      {showFacilityColumn && <td className="py-1.5 pr-3 text-slate-500">{String(row.warehouse_name || '—')}</td>}
                      <td className="py-1.5 pr-3">
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', isInbound ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-violet-500/10 text-violet-600 dark:text-violet-400')}>
                          {isInbound ? <ArrowDownToLine className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
                          {isInbound ? u('warehouseView.inbound', 'Prijem') : u('warehouseView.outbound', 'Otprema')}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-300">{String(row.customer_name || '—')}</td>
                      <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-300">{String(row.pallets ?? 0)}</td>
                      <td className="py-1.5">
                        <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', row.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400')}>
                          {row.status === 'completed' ? u('warehouseView.completed', 'Završeno') : u('warehouseView.scheduled', 'Zakazano')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          </div>
        </Card>
      </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-12">
        <Card className="shadow-none xl:col-span-6" contentClassName="p-4">
          {panelTitle(Boxes, u('warehouseView.inventorySummary', 'Pregled zaliha po vrsti'))}
          <div className="mt-2 space-y-1.5">
            {inventorySummary.length === 0 && <p className="text-xs text-slate-500">{u('warehouseView.noInventory', 'Nema trenutno uskladištene robe.')}</p>}
            {inventorySummary.map((row) => (
              <div key={String(row.storage_type)} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{String(row.storage_type || '—')}</span>
                <strong className="text-xs text-slate-900 dark:text-white">{String(row.net_pallets)} pal.</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card className="shadow-none xl:col-span-6" contentClassName="p-4">
          {panelTitle(Users, u('warehouseView.topCustomers', 'Najveći klijenti po skladištenju'))}
          <div className="mt-2 space-y-1.5">
            {topCustomers.length === 0 && <p className="text-xs text-slate-500">{u('warehouseView.noCustomers', 'Nema podataka o klijentima.')}</p>}
            {topCustomers.map((row) => (
              <div key={String(row.customer_name)} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{String(row.customer_name || '—')}</span>
                <strong className="text-xs text-slate-900 dark:text-white">{String(row.net_pallets)} pal.</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="shadow-none" contentClassName="p-4">
        {panelTitle(PackageCheck, u('warehouseView.recentArrivals', 'Nedavno primljene pošiljke'))}
        <div className="mt-2 overflow-x-auto">
          <DataTable className="min-w-[480px] text-xs">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="pb-1.5 pr-3">{u('warehouseView.colDate', 'Datum')}</th>
                {showFacilityColumn && <th className="pb-1.5 pr-3">{u('warehouseView.colFacility', 'Skladište')}</th>}
                <th className="pb-1.5 pr-3">{u('warehouseView.colCustomer', 'Klijent')}</th>
                <th className="pb-1.5 pr-3">{u('warehouseView.colStorageType', 'Vrsta skladištenja')}</th>
                <th className="pb-1.5">{u('warehouseView.colPallets', 'Palete')}</th>
              </tr>
            </thead>
            <tbody>
              {recentArrivals.length === 0 && (
                <tr>
                  <td colSpan={showFacilityColumn ? 5 : 4} className="py-4 text-center text-slate-500">{u('warehouseView.noArrivals', 'Nema nedavnih pošiljki.')}</td>
                </tr>
              )}
              {recentArrivals.map((row) => (
                <tr key={String(row.id)} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-300">{formatDate(row.completed_at)}</td>
                  {showFacilityColumn && <td className="py-1.5 pr-3 text-slate-500">{String(row.warehouse_name || '—')}</td>}
                  <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-300">{String(row.customer_name || '—')}</td>
                  <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-300">{String(row.storage_type || '—')}</td>
                  <td className="py-1.5 text-slate-700 dark:text-slate-300">{String(row.pallets ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </div>
      </Card>
      </motion.div>}
      </AnimatePresence>
    </div>
    {createModal}
    {editModal}
  </>;
};
