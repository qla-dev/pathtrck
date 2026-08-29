import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  Gauge,
  MapPinned,
  PackageCheck,
  Plus,
  Radio,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Language } from '../../types';
import { cn } from '../../lib/cn';
import { ui } from '../../i18n';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { getCompanyOverviewCopy } from './companyOverviewCopy';
import { useEffect, useMemo, useState } from 'react';
import { ApiUser, api } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';

const metrics = [
  { value: '18', icon: Truck, tone: 'bg-sky-500/10 text-sky-500' },
  { value: '12', icon: PackageCheck, tone: 'bg-violet-500/10 text-violet-500' },
  { value: '21', icon: Users, tone: 'bg-emerald-500/10 text-emerald-500' },
  { value: '97.8%', icon: TrendingUp, tone: 'bg-amber-500/10 text-amber-500' },
];

const dispatchRows = [
  { id: 'SF-2048', route: 'Sarajevo → Vienna', driver: 'Marco Petrovic', vehicle: 'PT-19', eta: '14:20', progress: 74, status: 1 },
  { id: 'SF-2045', route: 'Berlin → Munich', driver: 'Lena Weber', vehicle: 'DE-442', eta: '12:45', progress: 91, status: 2 },
  { id: 'SF-2041', route: 'Zagreb → Rotterdam', driver: 'Amir Hadzic', vehicle: 'BA-908', eta: null, progress: 48, status: 1 },
];

const activityTones = ['text-sky-500', 'text-emerald-500', 'text-violet-500', 'text-amber-500'];
const chartColors = ['#0ea5e9', '#8b5cf6', '#10b981', '#f97316', '#f59e0b', '#f43f5e'];
const tooltipStyle = { borderRadius: '12px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '12px' };

const recordDate = (row: Record<string, unknown>) => {
  const value = row.recorded_at || row.occurred_at || row.created_at || row.updated_at;
  const date = value ? new Date(String(value)) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : null;
};

const groupCount = (rows: Array<Record<string, unknown>>, key: string, fallback: string) => {
  const values = new Map<string, number>();
  rows.forEach((row) => { const name = String(row[key] || fallback).replaceAll('_', ' '); values.set(name, (values.get(name) || 0) + 1); });
  return Array.from(values, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
};

export const CompanyWorkspaceView = ({ lang, onPostLoad }: { lang: Language; onPostLoad?: () => void }) => {
  const copy = getCompanyOverviewCopy(lang);
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const vehicles = useApiList(api.vehicles.list, { per_page: 100 });
  const loads = useApiList(api.loads.list, { per_page: 100 });
  const routes = useApiList(api.routes.list, { per_page: 100 });
  const memberships = useApiList(api.companyMemberships.list, { per_page: 100 });
  const events = useApiList(api.trackingEvents.list, { per_page: 20 });
  const invoices = useApiList(api.invoices.list, { per_page: 100 });
  const [user, setUser] = useState<ApiUser | null>(null);
  useEffect(() => { void api.auth.me().then(setUser); }, []);
  const company = (user?.companies?.[0] || {}) as Record<string, unknown>;
  const companyId = Number(company.id || 0);
  const companyVehicles = vehicles.items.filter((row) => !companyId || Number(row.company_id) === companyId);
  const companyLoads = loads.items.filter((row) => !companyId || Number(row.company_id) === companyId);
  const companyRoutes = routes.items.filter((row) => companyLoads.some((load) => Number(load.id) === Number(row.load_id)));
  const companyMembers = memberships.items.filter((row) => !companyId || Number(row.company_id) === companyId);
  const companyInvoices = invoices.items.filter((row) => !companyId || !row.company_id || Number(row.company_id) === companyId);
  const activeLoads = companyLoads.filter((row) => ['sent', 'in_delivery'].includes(String(row.status).toLowerCase()));
  const revenue = companyLoads.reduce((sum, row) => sum + Number(row.budget || 0), 0);
  const distance = companyRoutes.reduce((sum, row) => sum + Number(row.distance_km || 0), 0);
  const capacity = companyVehicles.length ? Math.round((companyVehicles.filter((row) => ['active', 'available'].includes(String(row.status).toLowerCase())).length / companyVehicles.length) * 100) : 0;
  const heroStats = [`EUR ${revenue.toLocaleString()}`, `${distance.toLocaleString()} km`, `${capacity}%`];
  const metrics = [
    { value: String(companyVehicles.length), icon: Truck, tone: 'bg-sky-500/10 text-sky-500' },
    { value: String(activeLoads.length), icon: PackageCheck, tone: 'bg-violet-500/10 text-violet-500' },
    { value: String(companyMembers.length), icon: Users, tone: 'bg-emerald-500/10 text-emerald-500' },
    { value: `${capacity}%`, icon: TrendingUp, tone: 'bg-amber-500/10 text-amber-500' },
  ];
  const dispatchRows = useMemo(() => activeLoads.map((row) => {
    const stops = Array.isArray(row.stops) ? row.stops as Array<Record<string, unknown>> : [];
    const driver = (row.assigned_driver || {}) as Record<string, unknown>;
    const vehicle = (row.vehicle || {}) as Record<string, unknown>;
    const status = String(row.status || '').toLowerCase();
    return { id: String(row.public_id || row.id), route: `${String(stops[0]?.city || '—')} → ${String(stops[stops.length - 1]?.city || '—')}`, driver: String(driver.name || '—'), vehicle: String(vehicle.registration_number || '—'), eta: String(stops[stops.length - 1]?.window_ends_at || '').slice(11, 16) || null, progress: status === 'in_delivery' ? 65 : 25, status: status === 'in_delivery' ? 2 : 1 };
  }), [activeLoads]);
  const activityRows = events.items.filter((event) => companyLoads.some((load) => Number(load.id) === Number(event.load_id))).slice(0, 4).map((event) => [String(event.event_type || event.status || 'Update'), String(event.recorded_at || event.created_at || '').replace('T', ' ').slice(0, 16)]);
  const availableVehicles = companyVehicles.filter((row) => ['active', 'available'].includes(String(row.status).toLowerCase())).length;
  const maintenanceVehicles = companyVehicles.filter((row) => String(row.status).toLowerCase() === 'maintenance').length;
  const companyEvents = events.items.filter((event) => companyLoads.some((load) => Number(load.id) === Number(event.load_id)));
  const loadStatusData = useMemo(() => groupCount(companyLoads, 'status', 'unknown'), [companyLoads]);
  const fleetStatusData = useMemo(() => groupCount(companyVehicles, 'status', 'unknown'), [companyVehicles]);
  const transportData = useMemo(() => groupCount(companyLoads, 'transport_type', 'road'), [companyLoads]);
  const budgetByStatus = useMemo(() => {
    const grouped = new Map<string, number>();
    companyLoads.forEach((row) => { const name = String(row.status || 'unknown').replaceAll('_', ' '); grouped.set(name, (grouped.get(name) || 0) + Number(row.budget || 0)); });
    return Array.from(grouped, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [companyLoads]);
  const activityData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - offset));
      const key = date.toISOString().slice(0, 10);
      return { key, day: date.toLocaleDateString(undefined, { weekday: 'short' }), loads: 0, events: 0, invoices: 0 };
    });
    const index = new Map(days.map((day) => [day.key, day]));
    companyLoads.forEach((row) => { const day = index.get(recordDate(row) || ''); if (day) day.loads += 1; });
    companyEvents.forEach((row) => { const day = index.get(recordDate(row) || ''); if (day) day.events += 1; });
    companyInvoices.forEach((row) => { const day = index.get(recordDate(row) || ''); if (day) day.invoices += 1; });
    return days;
  }, [companyEvents, companyInvoices, companyLoads]);

  return (
  <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <PageHeader
      icon={Building2}
      title={copy.title}
      subtitle={copy.subtitle}
      badge={<>
        <span className="flex items-center gap-1 text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400"><Radio className="h-3 w-3 animate-pulse" />{copy.live}</span>
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{companyVehicles.length} assets · {activeLoads.length} active loads</span>
      </>}
      actions={onPostLoad && (
        <Button size="sm" className="rounded-full" onClick={onPostLoad}>
          <Plus className="mr-1.5 h-4 w-4" />{u('common.postLoad', 'Post Load')}
        </Button>
      )}
      stats={[
        ...copy.stats.map((label, index) => ({ label, value: heroStats[index], icon: Gauge, tone: "bg-primary/10 text-primary" })),
        ...metrics.map((metric, index) => ({ label: copy.metrics[index][0], value: metric.value, icon: metric.icon, tone: metric.tone })),
      ]}
    />

    <section className="grid gap-3 xl:grid-cols-12">
      <Card className="shadow-none xl:col-span-6" contentClassName="p-4">
        <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /><div><p className="text-sm font-black dark:text-white">{u('companyDashboard.activityTrend', 'Operations trend')}</p><p className="text-[11px] text-slate-500">{u('companyDashboard.activityTrendSub', 'Loads, tracking events and invoices during the last 7 days')}</p></div></div>
        <div className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activityData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <defs><linearGradient id="companyLoads" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} /><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} /></linearGradient><linearGradient id="companyEvents" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} /><Legend wrapperStyle={{ fontSize: '11px' }} />
              <Area type="monotone" dataKey="loads" name="Loads" stroke="#0ea5e9" fill="url(#companyLoads)" strokeWidth={2} />
              <Area type="monotone" dataKey="events" name="Tracking events" stroke="#8b5cf6" fill="url(#companyEvents)" strokeWidth={2} />
              <Area type="monotone" dataKey="invoices" name="Invoices" stroke="#f59e0b" fill="transparent" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="shadow-none xl:col-span-3" contentClassName="p-4">
        <div className="flex items-center gap-2"><PackageCheck className="h-4 w-4 text-violet-500" /><div><p className="text-sm font-black dark:text-white">{u('companyDashboard.loadPipeline', 'Load pipeline')}</p><p className="text-[11px] text-slate-500">{u('companyDashboard.loadPipelineSub', 'Current loads grouped by status')}</p></div></div>
        <div className="mt-2 h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={loadStatusData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={3}>{loadStatusData.map((item, index) => <Cell key={item.name} fill={chartColors[index % chartColors.length]} />)}</Pie><Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#e2e8f0' }} labelStyle={{ color: '#e2e8f0' }} /><Legend iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'capitalize' }} /></PieChart></ResponsiveContainer></div>
      </Card>

      <Card className="shadow-none xl:col-span-3" contentClassName="p-4">
        <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-sky-500" /><div><p className="text-sm font-black dark:text-white">{u('companyDashboard.fleetReadiness', 'Fleet readiness')}</p><p className="text-[11px] text-slate-500">{u('companyDashboard.fleetReadinessSub', 'Vehicles grouped by operational status')}</p></div></div>
        <div className="mt-2 h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={fleetStatusData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={3}>{fleetStatusData.map((item, index) => <Cell key={item.name} fill={['#10b981', '#f59e0b', '#f43f5e', '#64748b'][index % 4]} />)}</Pie><Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#e2e8f0' }} labelStyle={{ color: '#e2e8f0' }} /><Legend iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'capitalize' }} /></PieChart></ResponsiveContainer></div>
      </Card>
    </section>

    <div className="grid gap-3 xl:grid-cols-12">
      <Card className="xl:col-span-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2"><MapPinned className="h-5 w-5 text-primary" /><p className="text-lg font-black text-slate-900 dark:text-white">{copy.dispatch[0]}</p></div>
            <p className="mt-1 text-sm text-slate-500">{copy.dispatch[1]}</p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">{copy.dispatch[2]}</span>
        </div>
        <div className="mt-5 space-y-3">
          {dispatchRows.map((row) => (
            <div key={row.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="font-black text-slate-900 dark:text-white">{row.route}</p><p className="mt-1 text-xs text-slate-500">{row.id} · {row.driver} · {row.vehicle}</p></div>
                <div className={cn('text-right', lang === 'ar' && 'text-left')}><p className="text-sm font-bold text-primary">ETA {row.eta || copy.statuses[0]}</p><p className="text-xs text-slate-500">{copy.statuses[row.status]}</p></div>
              </div>
              <div className="mt-3 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-primary" style={{ width: `${row.progress}%` }} /></div><span className="text-xs font-bold text-slate-500">{row.progress}%</span></div>
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-6 xl:col-span-4">
        <Card>
          <div className="flex items-center gap-2"><Gauge className="h-5 w-5 text-primary" /><p className="text-lg font-black dark:text-white">{copy.health[0]}</p></div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 p-3"><span className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" /> {copy.health[1]}</span><strong className="text-emerald-700 dark:text-emerald-400">{availableVehicles}</strong></div>
            <div className="flex items-center justify-between rounded-xl bg-amber-500/10 p-3"><span className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400"><Clock3 className="h-4 w-4" /> {copy.health[2]}</span><strong className="text-amber-700 dark:text-amber-400">{maintenanceVehicles}</strong></div>
            <div className="flex items-center justify-between rounded-xl bg-rose-500/10 p-3"><span className="flex items-center gap-2 text-sm font-semibold text-rose-700 dark:text-rose-400"><CircleAlert className="h-4 w-4" /> {copy.health[3]}</span><strong className="text-rose-700 dark:text-rose-400">{companyVehicles.length - availableVehicles - maintenanceVehicles}</strong></div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /><p className="text-lg font-black dark:text-white">{copy.activityTitle}</p></div>
          <div className="mt-4 space-y-4">
            {activityRows.map(([text, time], index) => (
              <div key={text} className="flex items-start gap-3"><div className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-current', activityTones[index])} /><div><p className="text-sm text-slate-700 dark:text-slate-300">{text}</p><p className="mt-0.5 text-xs text-slate-500">{time}</p></div></div>
            ))}
          </div>
        </Card>
      </div>
    </div>

    <section className="grid gap-3 xl:grid-cols-12">
      <Card className="shadow-none xl:col-span-6" contentClassName="p-4">
        <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /><div><p className="text-sm font-black dark:text-white">{u('companyDashboard.transportMix', 'Transport mix')}</p><p className="text-[11px] text-slate-500">{u('companyDashboard.transportMixSub', 'Company loads by transport mode')}</p></div></div>
        <div className="mt-3 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={transportData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip cursor={false} contentStyle={tooltipStyle} /><Bar dataKey="value" name="Loads" fill="#0ea5e9" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
      </Card>
      <Card className="shadow-none xl:col-span-6" contentClassName="p-4">
        <div className="flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-emerald-500" /><div><p className="text-sm font-black dark:text-white">{u('companyDashboard.valueByStatus', 'Load value by status')}</p><p className="text-[11px] text-slate-500">{u('companyDashboard.valueByStatusSub', 'Combined listed budget across the current pipeline')}</p></div></div>
        <div className="mt-3 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={budgetByStatus} layout="vertical" margin={{ top: 0, right: 15, left: 15, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} horizontal={false} /><XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip cursor={false} contentStyle={tooltipStyle} formatter={(value) => [`EUR ${Number(value).toLocaleString()}`, 'Budget']} /><Bar dataKey="value" name="Budget" fill="#10b981" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div>
      </Card>
    </section>

    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-linear-to-r from-primary/10 via-transparent to-violet-500/10 p-5">
        <div><p className="font-black text-slate-900 dark:text-white">{copy.performance[0]}</p><p className="mt-1 text-sm text-slate-500">{copy.performance[1]}</p></div>
        <button className="inline-flex items-center gap-2 text-sm font-bold text-primary">{copy.performance[2]} <ArrowRight className={cn('h-4 w-4', lang === 'ar' && 'rotate-180')} /></button>
      </div>
    </Card>
  </div>
  );
};
