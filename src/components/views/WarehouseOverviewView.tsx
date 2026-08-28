import { useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Gauge,
  MapPin,
  PackageCheck,
  Plus,
  Radio,
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
import { AddWarehouseModal } from '../modals/AddWarehouseModal/AddWarehouseModal';
import { showSuccess } from '../../lib/swal';

type WarehouseOverviewData = {
  warehouse: Record<string, unknown> | null;
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

const formatDate = (value: unknown) => {
  const date = value ? new Date(String(value)) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : '—';
};

export const WarehouseOverviewView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [data, setData] = useState<WarehouseOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    void api.warehouse
      .overview()
      .then((response) => setData(response.data as unknown as WarehouseOverviewData))
      .finally(() => setLoading(false));
  }, [reloadKey]);

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

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-500">{u('common.loading', 'Loading...')}</div>;
  }

  if (!data?.warehouse) {
    return <>
      <Card contentClassName="p-8 text-center">
        <WarehouseIcon className="mx-auto h-10 w-10 text-slate-400" />
        <p className="mt-3 font-black text-slate-900 dark:text-white">{u('warehouseView.emptyTitle', 'No warehouse set up yet')}</p>
        <p className="mt-1 text-sm text-slate-500">{u('warehouseView.emptySubtitle', 'Contact support to set up your warehouse facility.')}</p>
        <Button size="sm" className="mt-4" onClick={() => setCreateOpen(true)}><Plus className="mr-1.5 h-4 w-4" />{u('warehouses.create', 'Create Warehouse')}</Button>
      </Card>
      {createModal}
    </>;
  }

  const warehouse = data.warehouse;
  const stats = data.stats || {};
  const currency = String(stats.currency || 'EUR');
  const occupancyPercent = Number(stats.occupancy_percent || 0);
  const occupiedPallets = Number(stats.occupied_pallets || 0);
  const availablePallets = Number(stats.available_pallets || 0);
  const totalCapacity = Number(stats.total_capacity_pallets || 0);

  const occupancyData = [
    { name: u('warehouseView.occupied', 'Zauzeto'), value: occupiedPallets, color: '#f97316' },
    { name: u('warehouseView.available', 'Dostupno'), value: Math.max(0, availablePallets), color: '#e2e8f0' },
  ];

  const statCards = [
    { label: u('warehouseView.occupancy', 'Popunjenost'), value: `${occupancyPercent}%`, icon: Gauge, tone: 'bg-orange-500/10 text-orange-500' },
    { label: u('warehouseView.availableCapacity', 'Dostupni kapacitet'), value: `${availablePallets} pal.`, icon: Boxes, tone: 'bg-sky-500/10 text-sky-500' },
    { label: u('warehouseView.inboundToday', 'Prijem danas'), value: String(stats.inbound_today || 0), icon: ArrowDownToLine, tone: 'bg-emerald-500/10 text-emerald-500' },
    { label: u('warehouseView.outboundToday', 'Otprema danas'), value: String(stats.outbound_today || 0), icon: ArrowUpFromLine, tone: 'bg-violet-500/10 text-violet-500' },
    { label: u('warehouseView.storageRevenue', 'Prihod od skladištenja'), value: `${currency} ${Number(stats.storage_revenue || 0).toLocaleString()}`, icon: TrendingUp, tone: 'bg-amber-500/10 text-amber-500' },
    { label: u('warehouseView.totalRevenue', 'Ukupan prihod'), value: `${currency} ${Number(stats.total_revenue || 0).toLocaleString()}`, icon: PackageCheck, tone: 'bg-rose-500/10 text-rose-500' },
  ];

  const dockSchedule = data.dock_schedule || [];
  const inventorySummary = data.inventory_summary || [];
  const topCustomers = data.top_customers || [];
  const recentArrivals = data.recent_arrivals || [];

  // Section heading shared by every panel below - compact by design so six KPI tiles plus four
  // panels stay inside one screen, the way the reference dashboard lays them out.
  const panelTitle = (Icon: typeof Boxes, text: string) => (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-orange-500" />
      <p className="text-sm font-black text-slate-900 dark:text-white">{text}</p>
    </div>
  );

  return <>
    <div className="space-y-3" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-gradient-to-r from-white via-orange-50 to-amber-50 px-4 py-3 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white">
            <WarehouseIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-black leading-tight text-slate-900 dark:text-white">{u('warehouseView.title', 'Moj Warehouse')}</h1>
            <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
              <MapPin className="h-3 w-3 shrink-0" />
              {String(warehouse.name || '—')} · {String(warehouse.city || '')}{warehouse.country_code ? `, ${String(warehouse.country_code)}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-white/70 px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
            <span className="flex items-center gap-1 text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400"><Radio className="h-3 w-3 animate-pulse" />{u('common.live', 'Live')}</span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{occupiedPallets} / {totalCapacity} {u('warehouseView.palletsUnit', 'paleta')}</span>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-1.5 h-4 w-4" />{u('warehouses.create', 'Create Warehouse')}</Button>
        </div>
      </section>

      <section className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((metric) => (
          <Card key={metric.label} className="shadow-none" contentClassName="flex items-center justify-between gap-2 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-500">{metric.label}</p>
              <p className="mt-0.5 truncate text-lg font-black text-slate-900 dark:text-white">{metric.value}</p>
            </div>
            <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', metric.tone)}>
              <metric.icon className="h-4 w-4" />
            </div>
          </Card>
        ))}
      </section>

      <div className="grid gap-3 xl:grid-cols-12">
        <Card className="shadow-none xl:col-span-4" contentClassName="p-4">
          {panelTitle(Gauge, u('warehouseView.capacityTitle', 'Kapacitet skladišta'))}
          <div className="mt-1 h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={occupancyData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={62} paddingAngle={3}>
                  {occupancyData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #1e293b', background: '#0f172a', color: '#e2e8f0' }} />
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

        <Card className="shadow-none xl:col-span-8" contentClassName="p-4">
          {panelTitle(ArrowDownToLine, u('warehouseView.dockSchedule', 'Raspored dokova - danas'))}
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="pb-1.5 pr-3">{u('warehouseView.colTime', 'Vrijeme')}</th>
                  <th className="pb-1.5 pr-3">{u('warehouseView.colType', 'Tip')}</th>
                  <th className="pb-1.5 pr-3">{u('warehouseView.colCustomer', 'Klijent')}</th>
                  <th className="pb-1.5 pr-3">{u('warehouseView.colPallets', 'Palete')}</th>
                  <th className="pb-1.5">{u('warehouseView.colStatus', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {dockSchedule.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-slate-500">{u('warehouseView.noMovementsToday', 'Nema zakazanih kretanja danas.')}</td>
                  </tr>
                )}
                {dockSchedule.map((row) => {
                  const isInbound = row.direction === 'inbound';
                  return (
                    <tr key={String(row.id)} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-1.5 pr-3 font-semibold text-slate-700 dark:text-slate-300">{formatTime(row.scheduled_at)}</td>
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
            </table>
          </div>
        </Card>
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
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="pb-1.5 pr-3">{u('warehouseView.colDate', 'Datum')}</th>
                <th className="pb-1.5 pr-3">{u('warehouseView.colCustomer', 'Klijent')}</th>
                <th className="pb-1.5 pr-3">{u('warehouseView.colStorageType', 'Vrsta skladištenja')}</th>
                <th className="pb-1.5">{u('warehouseView.colPallets', 'Palete')}</th>
              </tr>
            </thead>
            <tbody>
              {recentArrivals.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500">{u('warehouseView.noArrivals', 'Nema nedavnih pošiljki.')}</td>
                </tr>
              )}
              {recentArrivals.map((row) => (
                <tr key={String(row.id)} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-300">{formatDate(row.completed_at)}</td>
                  <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-300">{String(row.customer_name || '—')}</td>
                  <td className="py-1.5 pr-3 text-slate-700 dark:text-slate-300">{String(row.storage_type || '—')}</td>
                  <td className="py-1.5 text-slate-700 dark:text-slate-300">{String(row.pallets ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
    {createModal}
  </>;
};
