import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Boxes,
  Building2,
  CircleDollarSign,
  Crown,
  Gauge,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useApiList } from '../../hooks/useApiList';
import { api } from '../../services/api';
import { Language } from '../../types';
import { Card } from '../ui/Card';
import { HeaderStatCard, PageHeader } from '../ui/PageHeader';
import { InlineDataState } from '../ui/InlineDataState';

const page = { per_page: 100 };
const CHART_COLORS = ['#0ea5e9', '#8b5cf6', '#10b981', '#f97316', '#f43f5e', '#f59e0b', '#64748b'];
const tooltipStyle = { borderRadius: '12px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '12px' };

type WarehouseOverview = {
  warehouses?: Array<Record<string, unknown>>;
  stats?: Record<string, unknown>;
};

const groupBy = (rows: Array<Record<string, unknown>>, key: string, fallback: string) => {
  const grouped = new Map<string, number>();
  rows.forEach((row) => {
    const label = String(row[key] || fallback).replaceAll('_', ' ');
    grouped.set(label, (grouped.get(label) || 0) + 1);
  });
  return Array.from(grouped, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
};

const eventDate = (row: Record<string, unknown>) => {
  const value = row.occurred_at || row.event_at || row.created_at || row.updated_at;
  const date = value ? new Date(String(value)) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : null;
};

const PanelTitle = ({ icon: Icon, title, subtitle }: { icon: typeof Activity; title: string; subtitle?: string }) => (
  <div className="flex items-start gap-2">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
    <div>
      <p className="text-sm font-black text-slate-900 dark:text-white">{title}</p>
      {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
    </div>
  </div>
);

export const AdminOverviewView = ({ lang: _lang }: { lang: Language }) => {
  const companies = useApiList(api.companies.list, page);
  const customers = useApiList(api.customers.list, { limit: 1 });
  const drivers = useApiList(api.drivers.list, page);
  const loads = useApiList(api.loads.list, page);
  const vehicles = useApiList(api.vehicles.list, page);
  const invoices = useApiList(api.invoices.list, page);
  const events = useApiList(api.trackingEvents.list, { per_page: 100 });
  const warehouses = useApiList(api.warehouses.list, page);
  const [warehouseOverview, setWarehouseOverview] = useState<WarehouseOverview>({});

  useEffect(() => {
    void api.warehouse.overview().then((response) => setWarehouseOverview(response.data as WarehouseOverview)).catch(() => setWarehouseOverview({}));
  }, []);

  const sources = [companies, customers, drivers, loads, vehicles, invoices, events, warehouses];
  const loading = sources.some((source) => source.loading);
  const error = sources.find((source) => source.error)?.error;
  const loadsInTransit = loads.items.filter((load) => String(load.status).toLowerCase() === 'in_delivery');
  const loadsInExchange = loads.items.filter((load) => String(load.status).toLowerCase() === 'posted');
  const openInvoices = invoices.items.filter((invoice) => String(invoice.status).toLowerCase() !== 'paid');
  const totalWarehouseCapacity = Number(warehouseOverview.stats?.total_capacity_pallets)
    || warehouses.items.reduce((total, warehouse) => total + Number(warehouse.total_capacity_pallets || 0), 0);
  const occupiedWarehouseCapacity = Number(warehouseOverview.stats?.occupied_pallets || 0);
  const availableWarehouseCapacity = Math.max(0, Number(warehouseOverview.stats?.available_pallets ?? totalWarehouseCapacity - occupiedWarehouseCapacity));
  const pendingWarehouses = warehouses.items.filter((warehouse) => String(warehouse.status).toLowerCase() === 'pending');

  const loadStatusData = useMemo(() => groupBy(loads.items, 'status', 'unknown'), [loads.items]);
  const planData = useMemo(() => groupBy(companies.items, 'plan', 'unassigned'), [companies.items]);
  const invoiceData = useMemo(() => groupBy(invoices.items, 'status', 'open'), [invoices.items]);
  const capacityData = [
    { name: 'Occupied', value: occupiedWarehouseCapacity },
    { name: 'Available', value: availableWarehouseCapacity },
  ];
  const facilityData = useMemo(() => {
    const rows = warehouseOverview.warehouses?.length ? warehouseOverview.warehouses : warehouses.items;
    return rows.slice(0, 10).map((row) => {
      const capacity = Number(row.total_capacity_pallets || 0);
      const occupied = Number(row.occupied_pallets || 0);
      return {
        name: String(row.name || `Warehouse ${row.id || ''}`),
        occupied,
        available: Math.max(0, Number(row.available_pallets ?? capacity - occupied)),
      };
    });
  }, [warehouseOverview.warehouses, warehouses.items]);
  const activityData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - offset));
      const key = date.toISOString().slice(0, 10);
      return { key, day: date.toLocaleDateString(undefined, { weekday: 'short' }), loads: 0, events: 0, invoices: 0 };
    });
    const index = new Map(days.map((day) => [day.key, day]));
    loads.items.forEach((row) => { const day = index.get(eventDate(row) || ''); if (day) day.loads += 1; });
    events.items.forEach((row) => { const day = index.get(eventDate(row) || ''); if (day) day.events += 1; });
    invoices.items.forEach((row) => { const day = index.get(eventDate(row) || ''); if (day) day.invoices += 1; });
    return days;
  }, [events.items, invoices.items, loads.items]);

  const headerStats = [
    { label: 'Logistics companies', value: loading ? '—' : companies.total, icon: Building2, tone: 'bg-violet-500/10 text-violet-500' },
    { label: 'Warehouse companies', value: loading ? '—' : warehouses.total, icon: Warehouse, tone: 'bg-orange-500/10 text-orange-500' },
    { label: 'Drivers', value: loading ? '—' : drivers.total, icon: Users, tone: 'bg-sky-500/10 text-sky-500' },
    { label: 'Customers', value: loading ? '—' : customers.total, icon: Users, tone: 'bg-fuchsia-500/10 text-fuchsia-500' },
    { label: 'In transit', value: loading ? '—' : loadsInTransit.length, icon: PackageCheck, tone: 'bg-cyan-500/10 text-cyan-500' },
    { label: 'In exchange', value: loading ? '—' : loadsInExchange.length, icon: Boxes, tone: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Tracking events', value: loading ? '—' : events.total, icon: Activity, tone: 'bg-primary/10 text-primary' },
    { label: 'Open invoices', value: loading ? '—' : openInvoices.length, icon: ReceiptText, tone: 'bg-amber-500/10 text-amber-500' },
  ];

  const operationsStats = [
    { label: 'Warehouse capacity', value: loading ? '—' : `${totalWarehouseCapacity.toLocaleString()} pal.`, icon: Warehouse, tone: 'bg-orange-500/10 text-orange-500' },
    { label: 'Pending warehouses', value: loading ? '—' : pendingWarehouses.length, icon: ShieldCheck, tone: 'bg-amber-500/10 text-amber-500' },
    { label: 'Fleet vehicles', value: loading ? '—' : vehicles.total, icon: Truck, tone: 'bg-sky-500/10 text-sky-500' },
    { label: 'Database resources', value: loading ? '—' : sources.length, icon: ShieldCheck, tone: 'bg-emerald-500/10 text-emerald-500' },
  ];

  return <div className="space-y-3">
    <PageHeader
      icon={Crown}
      title="Platform Command Center"
      subtitle="Live visibility across logistics and warehouse operations stored in Freightbook.ai."
      badge={<span className="flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400"><ShieldCheck className="h-3.5 w-3.5" /> DATABASE CONNECTED</span>}
      stats={headerStats}
    />

    {error ? (
      <Card><InlineDataState loading={false} error={error} empty="" onRetry={() => sources.forEach((source) => void source.refresh())} /></Card>
    ) : <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {operationsStats.map((metric) => <HeaderStatCard key={metric.label} {...metric} />)}
      </section>

      <section className="grid gap-3 xl:grid-cols-12">
        <Card className="shadow-none xl:col-span-6" contentClassName="p-4">
          <PanelTitle icon={Activity} title="Platform activity" subtitle="Loads, tracking events and invoices created during the last 7 days" />
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminLoads" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} /><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} /></linearGradient>
                  <linearGradient id="adminEvents" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="loads" name="Loads" stroke="#0ea5e9" fill="url(#adminLoads)" strokeWidth={2} />
                <Area type="monotone" dataKey="events" name="Tracking events" stroke="#8b5cf6" fill="url(#adminEvents)" strokeWidth={2} />
                <Area type="monotone" dataKey="invoices" name="Invoices" stroke="#f59e0b" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="shadow-none xl:col-span-3" contentClassName="p-4">
          <PanelTitle icon={PackageCheck} title="Load pipeline" subtitle="Current distribution by status" />
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={loadStatusData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={3}>
                  {loadStatusData.map((item, index) => <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'capitalize' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="shadow-none xl:col-span-3" contentClassName="p-4">
          <PanelTitle icon={Gauge} title="Warehouse capacity" subtitle={`${occupiedWarehouseCapacity.toLocaleString()} of ${totalWarehouseCapacity.toLocaleString()} pallets occupied`} />
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={capacityData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={3}>
                  <Cell fill="#f97316" /><Cell fill="#e2e8f0" />
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section className="grid gap-3 xl:grid-cols-12">
        <Card className="shadow-none xl:col-span-6" contentClassName="p-4">
          <PanelTitle icon={Warehouse} title="Capacity by warehouse" subtitle="Occupied and available pallets across the largest facilities" />
          <div className="mt-3 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={facilityData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={125} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="occupied" name="Occupied" stackId="capacity" fill="#f97316" radius={[4, 0, 0, 4]} />
                <Bar dataKey="available" name="Available" stackId="capacity" fill="#cbd5e1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="shadow-none xl:col-span-3" contentClassName="p-4">
          <PanelTitle icon={BarChart3} title="Subscription mix" subtitle="Logistics companies by plan" />
          <div className="mt-2 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" name="Companies" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="shadow-none xl:col-span-3" contentClassName="p-4">
          <PanelTitle icon={CircleDollarSign} title="Invoice health" subtitle="Invoices grouped by payment status" />
          <div className="mt-2 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={invoiceData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3}>
                  {invoiceData.map((item, index) => <Cell key={item.name} fill={['#10b981', '#f59e0b', '#f43f5e', '#64748b'][index % 4]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'capitalize' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <div className="grid gap-3 xl:grid-cols-12">
        <Card className="shadow-none xl:col-span-8" contentClassName="p-4">
          <PanelTitle icon={Building2} title="Company operations" subtitle="Live company, fleet, plan and verification overview" />
          {companies.loading || companies.items.length === 0 ? (
            <InlineDataState loading={companies.loading} error={companies.error} empty="No companies in the database yet." onRetry={companies.refresh} />
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead><tr className="border-b border-slate-200 text-[11px] uppercase text-slate-500 dark:border-slate-800"><th className="p-2">Company</th><th className="p-2">Country</th><th className="p-2">Fleet</th><th className="p-2">Plan</th><th className="p-2">Status</th></tr></thead>
                <tbody>{companies.items.map((company) => <tr key={String(company.id)} className="border-b border-slate-100 dark:border-slate-800"><td className="p-2 text-sm font-bold dark:text-white">{String(company.name || '')}</td><td className="p-2 text-xs">{String(company.country_code || '—')}</td><td className="p-2 text-xs">{Array.isArray(company.vehicles) ? company.vehicles.length : 0}</td><td className="p-2 text-xs">{String(company.plan || '—')}</td><td className="p-2 text-xs">{String(company.status || '—')}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="shadow-none xl:col-span-4" contentClassName="p-4">
          <PanelTitle icon={Activity} title="Latest tracking events" subtitle="Newest operational signals across the platform" />
          {events.loading || events.items.length === 0 ? (
            <InlineDataState loading={events.loading} error={events.error} empty="No tracking events yet." onRetry={events.refresh} />
          ) : (
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">{events.items.slice(0, 8).map((event) => <div key={String(event.id)} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" /><div><p className="text-xs font-bold dark:text-white">{String(event.title || event.status || 'Tracking event')}</p><p className="text-[11px] text-slate-500">{String(event.location || '')}</p></div></div>)}</div>
          )}
        </Card>
      </div>
    </>}
  </div>;
};
