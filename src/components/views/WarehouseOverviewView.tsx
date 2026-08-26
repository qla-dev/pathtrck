import { useEffect, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Gauge,
  MapPin,
  PackageCheck,
  Radio,
  TrendingUp,
  Users,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

import { Language } from '../../types';
import { cn } from '../../lib/cn';
import { ui } from '../../i18n';
import { Card } from '../ui/Card';
import { api } from '../../services/api';

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

  useEffect(() => {
    void api.warehouse
      .overview()
      .then((response) => setData(response.data as unknown as WarehouseOverviewData))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-500">{u('common.loading', 'Loading...')}</div>;
  }

  if (!data?.warehouse) {
    return (
      <Card className="p-8 text-center">
        <WarehouseIcon className="mx-auto h-10 w-10 text-slate-400" />
        <p className="mt-3 font-black text-slate-900 dark:text-white">{u('warehouseView.emptyTitle', 'No warehouse set up yet')}</p>
        <p className="mt-1 text-sm text-slate-500">{u('warehouseView.emptySubtitle', 'Contact support to set up your warehouse facility.')}</p>
      </Card>
    );
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

  return (
    <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <section className="relative overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-white via-orange-50 to-amber-100 p-6 text-slate-900 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-amber-950 dark:text-white md:p-8">
        <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl dark:bg-orange-500/25" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/30">
                <WarehouseIcon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400">{u('warehouseView.eyebrow', 'Warehouse Company')}</p>
                <h1 className="text-2xl font-black md:text-3xl">{u('warehouseView.title', 'Moj Warehouse')}</h1>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
              <MapPin className="h-4 w-4 shrink-0" />
              {String(warehouse.name || '—')} · {String(warehouse.city || '')}{warehouse.country_code ? `, ${String(warehouse.country_code)}` : ''}
            </p>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-white/70 px-4 py-3 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
              <Radio className="h-4 w-4 animate-pulse" /> {u('common.live', 'Live')}
            </div>
            <p className="mt-1 text-sm font-semibold">
              {occupiedPallets} / {totalCapacity} {u('warehouseView.palletsUnit', 'paleta')}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {statCards.map((metric) => (
          <Card key={metric.label} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{metric.label}</p>
                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{metric.value}</p>
              </div>
              <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', metric.tone)}>
                <metric.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-4">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-orange-500" />
            <p className="text-lg font-black text-slate-900 dark:text-white">{u('warehouseView.capacityTitle', 'Kapacitet skladišta')}</p>
          </div>
          <div className="mt-2 h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={occupancyData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>
                  {occupancyData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #1e293b', background: '#0f172a', color: '#e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {occupancyData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-2 text-slate-500">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-bold dark:text-white">{item.value} pal.</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ArrowDownToLine className="h-5 w-5 text-orange-500" />
              <p className="text-lg font-black text-slate-900 dark:text-white">{u('warehouseView.dockSchedule', 'Raspored dokova - danas')}</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  <th className="pb-2 pr-3">{u('warehouseView.colTime', 'Vrijeme')}</th>
                  <th className="pb-2 pr-3">{u('warehouseView.colType', 'Tip')}</th>
                  <th className="pb-2 pr-3">{u('warehouseView.colCustomer', 'Klijent')}</th>
                  <th className="pb-2 pr-3">{u('warehouseView.colPallets', 'Palete')}</th>
                  <th className="pb-2">{u('warehouseView.colStatus', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {dockSchedule.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-slate-500">{u('warehouseView.noMovementsToday', 'Nema zakazanih kretanja danas.')}</td>
                  </tr>
                )}
                {dockSchedule.map((row) => {
                  const isInbound = row.direction === 'inbound';
                  return (
                    <tr key={String(row.id)} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-3 font-semibold text-slate-700 dark:text-slate-300">{formatTime(row.scheduled_at)}</td>
                      <td className="py-2 pr-3">
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold', isInbound ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-violet-500/10 text-violet-600 dark:text-violet-400')}>
                          {isInbound ? <ArrowDownToLine className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
                          {isInbound ? u('warehouseView.inbound', 'Prijem') : u('warehouseView.outbound', 'Otprema')}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{String(row.customer_name || '—')}</td>
                      <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{String(row.pallets ?? 0)}</td>
                      <td className="py-2">
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', row.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400')}>
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

      <div className="grid gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-6">
          <div className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-orange-500" />
            <p className="text-lg font-black text-slate-900 dark:text-white">{u('warehouseView.inventorySummary', 'Pregled zaliha po vrsti')}</p>
          </div>
          <div className="mt-4 space-y-3">
            {inventorySummary.length === 0 && <p className="text-sm text-slate-500">{u('warehouseView.noInventory', 'Nema trenutno uskladištene robe.')}</p>}
            {inventorySummary.map((row) => (
              <div key={String(row.storage_type)} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{String(row.storage_type || '—')}</span>
                <strong className="text-slate-900 dark:text-white">{String(row.net_pallets)} pal.</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            <p className="text-lg font-black text-slate-900 dark:text-white">{u('warehouseView.topCustomers', 'Najveći klijenti po skladištenju')}</p>
          </div>
          <div className="mt-4 space-y-3">
            {topCustomers.length === 0 && <p className="text-sm text-slate-500">{u('warehouseView.noCustomers', 'Nema podataka o klijentima.')}</p>}
            {topCustomers.map((row) => (
              <div key={String(row.customer_name)} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{String(row.customer_name || '—')}</span>
                <strong className="text-slate-900 dark:text-white">{String(row.net_pallets)} pal.</strong>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2">
          <PackageCheck className="h-5 w-5 text-orange-500" />
          <p className="text-lg font-black text-slate-900 dark:text-white">{u('warehouseView.recentArrivals', 'Nedavno primljene pošiljke')}</p>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="pb-2 pr-3">{u('warehouseView.colDate', 'Datum')}</th>
                <th className="pb-2 pr-3">{u('warehouseView.colCustomer', 'Klijent')}</th>
                <th className="pb-2 pr-3">{u('warehouseView.colStorageType', 'Vrsta skladištenja')}</th>
                <th className="pb-2">{u('warehouseView.colPallets', 'Palete')}</th>
              </tr>
            </thead>
            <tbody>
              {recentArrivals.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-sm text-slate-500">{u('warehouseView.noArrivals', 'Nema nedavnih pošiljki.')}</td>
                </tr>
              )}
              {recentArrivals.map((row) => (
                <tr key={String(row.id)} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{formatDate(row.completed_at)}</td>
                  <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{String(row.customer_name || '—')}</td>
                  <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{String(row.storage_type || '—')}</td>
                  <td className="py-2 text-slate-700 dark:text-slate-300">{String(row.pallets ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
