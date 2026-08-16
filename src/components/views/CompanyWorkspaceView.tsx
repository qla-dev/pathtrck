import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Gauge,
  MapPinned,
  PackageCheck,
  Radio,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';

import { Language } from '../../types';
import { cn } from '../../lib/cn';
import { Card } from '../ui/Card';
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

export const CompanyWorkspaceView = ({ lang }: { lang: Language }) => {
  const copy = getCompanyOverviewCopy(lang);
  const vehicles = useApiList(api.vehicles.list, { per_page: 100 });
  const loads = useApiList(api.loads.list, { per_page: 100 });
  const routes = useApiList(api.routes.list, { per_page: 100 });
  const memberships = useApiList(api.companyMemberships.list, { per_page: 100 });
  const events = useApiList(api.trackingEvents.list, { per_page: 20 });
  const [user, setUser] = useState<ApiUser | null>(null);
  useEffect(() => { void api.auth.me().then(setUser); }, []);
  const company = (user?.companies?.[0] || {}) as Record<string, unknown>;
  const companyId = Number(company.id || 0);
  const companyVehicles = vehicles.items.filter((row) => !companyId || Number(row.company_id) === companyId);
  const companyLoads = loads.items.filter((row) => !companyId || Number(row.company_id) === companyId);
  const companyRoutes = routes.items.filter((row) => companyLoads.some((load) => Number(load.id) === Number(row.load_id)));
  const companyMembers = memberships.items.filter((row) => !companyId || Number(row.company_id) === companyId);
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

  return (
  <div className="space-y-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
    <section className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-cyan-100 p-6 text-slate-900 shadow-xl shadow-sky-900/10 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-cyan-950 dark:text-white dark:shadow-black/30 md:p-8">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl dark:bg-primary/25" />
      <div className="absolute bottom-0 right-1/3 h-28 w-48 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/30">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">{copy.company}</p>
              <h1 className="text-2xl font-black md:text-3xl">{copy.title}</h1>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            {copy.subtitle}
          </p>
        </div>
        <div className="rounded-2xl border border-sky-200 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400"><Radio className="h-4 w-4 animate-pulse" /> {copy.live}</div>
          <p className="mt-1 text-sm font-semibold">{companyVehicles.length} assets · {activeLoads.length} active loads</p>
        </div>
      </div>
      <div className="relative mt-7 grid gap-3 sm:grid-cols-3">
        {copy.stats.map((label, index) => (
          <div key={label} className="rounded-2xl border border-sky-200/80 bg-white/65 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
            <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-black">{heroStats[index]}</p>
          </div>
        ))}
      </div>
    </section>

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric, index) => (
        <Card key={copy.metrics[index][0]} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{copy.metrics[index][0]}</p>
              <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{metric.value}</p>
              <p className="mt-1 text-xs text-slate-500">{copy.metrics[index][1]}</p>
            </div>
            <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', metric.tone)}><metric.icon className="h-5 w-5" /></div>
          </div>
        </Card>
      ))}
    </section>

    <div className="grid gap-6 xl:grid-cols-12">
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

    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-linear-to-r from-primary/10 via-transparent to-violet-500/10 p-5">
        <div><p className="font-black text-slate-900 dark:text-white">{copy.performance[0]}</p><p className="mt-1 text-sm text-slate-500">{copy.performance[1]}</p></div>
        <button className="inline-flex items-center gap-2 text-sm font-bold text-primary">{copy.performance[2]} <ArrowRight className={cn('h-4 w-4', lang === 'ar' && 'rotate-180')} /></button>
      </div>
    </Card>
  </div>
  );
};
