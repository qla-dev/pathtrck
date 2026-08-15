import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Filter,
  Gauge,
  Package as PackageIcon,
  Plus,
  Route,
  Sparkles,
  Truck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Language, Role } from '../../types';
import { api } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';
import { ui, trLoadStatus, trPackageStatus } from '../../i18n';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type RangeOption = '24h' | '7d' | '30d';

export const Dashboard = ({ role, lang }: { role: Role; lang: Language }) => {
  const [range, setRange] = useState<RangeOption>('7d');
  const isDriver = role === 'driver';
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const loadsResult = useApiList(api.loads.list, { per_page: 100 });
  const routesResult = useApiList(api.routes.list, { per_page: 100 });
  const shipmentsResult = useApiList(api.shipments.list, { per_page: 100 });
  const eventsResult = useApiList(api.trackingEvents.list, { per_page: 100 });
  const loadRows = loadsResult.items;
  const routeRows = routesResult.items;
  const shipmentRows = shipmentsResult.items;

  const analyticsTitle = u('legacy.dashboard.analyticsCommandCenter', 'Analytics Command Center');
  const analyticsSubtitle = isDriver
    ? u('legacy.dashboard.driverAnalyticsSubtitle', 'Live route quality, stop performance, and delivery precision for your fleet.')
    : u('legacy.dashboard.userAnalyticsSubtitle', 'Shipment visibility, carrier performance, and cost control in one analytics hub.');

  const rangeOptions: Array<{ id: RangeOption; label: string }> = [
    { id: '24h', label: u('legacy.dashboard.range24h', '24h') },
    { id: '7d', label: u('legacy.dashboard.range7d', '7d') },
    { id: '30d', label: u('legacy.dashboard.range30d', '30d') },
  ];

  const topMetrics = isDriver
    ? [
        {
          label: u('legacy.dashboard.activeTrips', 'Active Trips'),
          value: '8',
          delta: u('legacy.dashboard.plus2VsYesterday', '+2 vs yesterday'),
          icon: Truck,
          tone: 'text-sky-500',
        },
        {
          label: u('legacy.dashboard.deliveredToday', 'Delivered Today'),
          value: '21',
          delta: u('legacy.dashboard.onTime981', '98.1% on-time'),
          icon: CheckCircle2,
          tone: 'text-emerald-500',
        },
        {
          label: trPackageStatus(lang, 'In Transit'),
          value: '6',
          delta: u('legacy.dashboard.priorityRoutes2', '2 priority routes'),
          icon: PackageIcon,
          tone: 'text-indigo-500',
        },
        {
          label: u('legacy.dashboard.avgStopDelay', 'Avg Stop Delay'),
          value: '6m',
          delta: u('legacy.dashboard.minus18ThisWeek', '-18% this week'),
          icon: Clock3,
          tone: 'text-amber-500',
        },
        {
          label: u('legacy.dashboard.fuelEfficiency', 'Fuel Efficiency'),
          value: '7.8 L',
          delta: u('legacy.dashboard.per100Km', 'per 100 km'),
          icon: Gauge,
          tone: 'text-cyan-500',
        },
        {
          label: u('legacy.dashboard.safetyScore', 'Safety Score'),
          value: '99%',
          delta: u('legacy.dashboard.incidents0', '0 incidents'),
          icon: Activity,
          tone: 'text-violet-500',
        },
      ]
    : [
        {
          label: u('legacy.dashboard.activeShipments', 'Active Shipments'),
          value: '12',
          delta: u('legacy.dashboard.plus4Today', '+4 today'),
          icon: PackageIcon,
          tone: 'text-sky-500',
        },
        {
          label: u('legacy.dashboard.deliveredToday', 'Delivered Today'),
          value: '38',
          delta: u('legacy.dashboard.onTime974', '97.4% on-time'),
          icon: CheckCircle2,
          tone: 'text-emerald-500',
        },
        {
          label: u('legacy.dashboard.carrierResponse', 'Carrier Response'),
          value: '18m',
          delta: u('legacy.dashboard.minus5mThisWeek', '-5m this week'),
          icon: Clock3,
          tone: 'text-indigo-500',
        },
        {
          label: u('legacy.dashboard.costEfficiency', 'Cost Efficiency'),
          value: '+9.2%',
          delta: u('legacy.dashboard.vsLastMonth', 'vs last month'),
          icon: BarChart3,
          tone: 'text-amber-500',
        },
        {
          label: u('legacy.dashboard.routeCoverage', 'Route Coverage'),
          value: '192',
          delta: u('legacy.dashboard.citiesOnline', 'cities online'),
          icon: Route,
          tone: 'text-cyan-500',
        },
        {
          label: u('legacy.dashboard.riskAlerts', 'Risk Alerts'),
          value: '2',
          delta: u('legacy.dashboard.allHandled', 'all handled'),
          icon: AlertTriangle,
          tone: 'text-violet-500',
        },
      ];

  const throughputData = useMemo(() => {
    if (range === '24h') {
      return [
        { slot: '00:00', completed: 12, planned: 14, punctuality: 92 },
        { slot: '04:00', completed: 9, planned: 11, punctuality: 90 },
        { slot: '08:00', completed: 24, planned: 26, punctuality: 95 },
        { slot: '12:00', completed: 34, planned: 35, punctuality: 97 },
        { slot: '16:00', completed: 29, planned: 31, punctuality: 94 },
        { slot: '20:00', completed: 18, planned: 20, punctuality: 93 },
      ];
    }
    if (range === '30d') {
      return [
        { slot: 'W1', completed: 188, planned: 194, punctuality: 95 },
        { slot: 'W2', completed: 201, planned: 207, punctuality: 96 },
        { slot: 'W3', completed: 196, planned: 204, punctuality: 94 },
        { slot: 'W4', completed: 224, planned: 231, punctuality: 97 },
      ];
    }
    return [
      { slot: 'Mon', completed: 42, planned: 47, punctuality: 93 },
      { slot: 'Tue', completed: 48, planned: 52, punctuality: 95 },
      { slot: 'Wed', completed: 44, planned: 49, punctuality: 91 },
      { slot: 'Thu', completed: 56, planned: 60, punctuality: 96 },
      { slot: 'Fri', completed: 63, planned: 67, punctuality: 97 },
      { slot: 'Sat', completed: 38, planned: 42, punctuality: 92 },
      { slot: 'Sun', completed: 34, planned: 37, punctuality: 94 },
    ];
  }, [range]);

  const corridorData = [
    { name: 'HAM-SJJ', value: 96 },
    { name: 'VIE-PRG', value: 92 },
    { name: 'ZAG-BER', value: 88 },
    { name: 'MUC-AMS', value: 94 },
    { name: 'MIL-VIE', value: 90 },
  ];

  const etaTrendData = [
    { day: 'Mon', variance: 11 },
    { day: 'Tue', variance: 9 },
    { day: 'Wed', variance: 12 },
    { day: 'Thu', variance: 8 },
    { day: 'Fri', variance: 6 },
    { day: 'Sat', variance: 7 },
    { day: 'Sun', variance: 6 },
  ];

  const serviceMix = [
    { name: u('legacy.dashboard.onTime', 'On Time'), value: 78, color: '#00AEEF' },
    { name: u('legacy.dashboard.minorDelay', 'Minor Delay'), value: 16, color: '#F59E0B' },
    { name: u('legacy.dashboard.criticalDelay', 'Critical Delay'), value: 6, color: '#EF4444' },
  ];

  const alertFeed = [
    {
      title: u('legacy.dashboard.aiReroutedHamSjj214', 'AI rerouted HAM-SJJ-214'),
      time: '09:14',
      tone: 'text-primary',
    },
    {
      title: u('legacy.dashboard.munichCheckpointCleared', 'Munich checkpoint cleared'),
      time: '09:22',
      tone: 'text-emerald-500',
    },
    {
      title: u('legacy.dashboard.etaDriftDetectedOnZagBer', 'ETA drift detected on ZAG-BER'),
      time: '09:31',
      tone: 'text-amber-500',
    },
    {
      title: u('legacy.dashboard.proofOfDeliverySynced', 'Proof-of-delivery synced'),
      time: '09:36',
      tone: 'text-violet-500',
    },
  ];

  const recentActivity = [
    {
      title: u('legacy.dashboard.routeCompleted', 'Route completed'),
      desc: u('legacy.dashboard.r1ReachedFinalCheckpointInSarajevo', 'R1 reached final checkpoint in Sarajevo.'),
      time: u('legacy.dashboard.time2MinsAgo', '2 mins ago'),
    },
    {
      title: u('legacy.dashboard.newLoadPosted', 'New load posted'),
      desc: u('legacy.dashboard.electronicsPalletsNowVisibleToMatchingDrivers', 'Electronics Pallets now visible to matching drivers.'),
      time: u('legacy.dashboard.time19MinsAgo', '19 mins ago'),
    },
    {
      title: u('legacy.dashboard.aiForecastRefreshed', 'AI forecast refreshed'),
      desc: u('legacy.dashboard.riskModelRecalculatedWithLatestWeatherAndTraffic', 'Risk model recalculated with latest weather and traffic.'),
      time: u('legacy.dashboard.time1HourAgo', '1 hour ago'),
    },
  ];

  const activeCount = loadRows.filter((item) => ['available', 'assigned', 'in_transit'].includes(String(item.status).toLowerCase())).length;
  const completedCount = loadRows.filter((item) => String(item.status).toLowerCase() === 'completed').length;
  const liveTopMetrics = topMetrics.map((metric, index) => ({
    ...metric,
    value: String([activeCount, completedCount, shipmentRows.length, routeRows.length, loadRows.length, eventsResult.total][index] ?? 0),
    delta: loadsResult.loading || routesResult.loading ? u('common.loading', 'Loading') : u('legacy.dashboard.liveDatabaseValue', 'Live database value'),
  }));
  const liveThroughputData = Array.from({ length: range === '24h' ? 6 : range === '30d' ? 4 : 7 }, (_, index) => {
    const completed = loadRows.filter((item) => String(item.status).toLowerCase() === 'completed').length;
    return { slot: range === '24h' ? `${index * 4}:00` : range === '30d' ? `W${index + 1}` : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index], completed, planned: loadRows.length, punctuality: loadRows.length ? Math.round((completed / loadRows.length) * 100) : 0 };
  });
  const liveCorridorData = routeRows.slice(0, 5).map((item) => ({ name: String(item.route_code || `R-${item.id}`), value: Number(item.ai_confidence || 0) }));
  const liveEtaTrendData = routeRows.slice(0, 7).map((item) => ({ day: String(item.route_code || item.id), variance: Number(item.duration_minutes || 0) }));
  const statusCount = (status: string) => shipmentRows.filter((item) => String(item.status).toLowerCase() === status).length;
  const liveServiceMix = [
    { name: u('legacy.dashboard.onTime', 'Delivered'), value: statusCount('delivered'), color: '#00AEEF' },
    { name: u('legacy.dashboard.minorDelay', 'In transit'), value: statusCount('in_transit'), color: '#F59E0B' },
    { name: u('legacy.dashboard.criticalDelay', 'Exception'), value: statusCount('exception'), color: '#EF4444' },
  ];
  const liveAlertFeed = eventsResult.items.slice(0, 4).map((item) => ({ title: String(item.event_type || item.status || `Event ${item.id}`), time: String(item.recorded_at || item.created_at || '').slice(11, 16), tone: 'text-primary' }));
  const liveRecentActivity = loadRows.slice(0, 3).map((item) => ({ title: String(item.title || `Load ${item.id}`), desc: `${String(item.cargo_type || '')} · ${String(item.status || '')}`, time: String(item.updated_at || item.created_at || '').replace('T', ' ').slice(0, 16) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">{analyticsTitle}</h1>
          <p className="text-sm text-slate-500 mt-1">{analyticsSubtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
            {rangeOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setRange(opt.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                  range === opt.id
                    ? 'bg-primary text-white shadow-md'
                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            {u('common.filter', 'Filter')}
          </Button>
          {role === 'driver' ? (
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {u('common.newRoute', 'New Route')}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {liveTopMetrics.map((metric) => (
          <Card key={metric.label} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold leading-snug break-words max-w-[11ch]">
                  {metric.label}
                </p>
                <p className="text-2xl font-black mt-1 dark:text-white">{metric.value}</p>
                <p className="text-[11px] text-slate-500 mt-1">{metric.delta}</p>
              </div>
              <div className={cn('w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center', metric.tone)}>
                <metric.icon className="w-5 h-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold dark:text-white">
                {u('legacy.dashboard.deliveryThroughput', 'Delivery Throughput')}
              </p>
              <p className="text-xs text-slate-500">
                {u('legacy.dashboard.completedVsPlannedVolume', 'Completed vs planned volume')}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary" />
              {u('legacy.dashboard.completed', 'Completed')}
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-400" />
              {u('legacy.dashboard.planned', 'Planned')}
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={liveThroughputData}>
                <defs>
                  <linearGradient id="throughputGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00AEEF" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00AEEF" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="plannedGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#94A3B8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" opacity={0.25} />
                <XAxis dataKey="slot" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #1e293b',
                    background: '#0f172a',
                    color: '#e2e8f0',
                  }}
                />
                <Area type="monotone" dataKey="planned" stroke="#94A3B8" strokeWidth={2} fill="url(#plannedGradient)" />
                <Area type="monotone" dataKey="completed" stroke="#00AEEF" strokeWidth={3} fill="url(#throughputGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="xl:col-span-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold dark:text-white">
                {u('legacy.dashboard.serviceHealth', 'Service Health')}
              </p>
              <p className="text-xs text-slate-500">{u('legacy.dashboard.currentSlaDistribution', 'Current SLA distribution')}</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {u('legacy.dashboard.stable', 'Stable')}
            </div>
          </div>
          <div className="h-[210px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={liveServiceMix} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>
                  {liveServiceMix.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #1e293b',
                    background: '#0f172a',
                    color: '#e2e8f0',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {liveServiceMix.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-2 text-slate-500">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-bold dark:text-white">{item.value}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold dark:text-white">
              {u('legacy.dashboard.corridorPerformance', 'Corridor Performance')}
            </p>
            <span className="text-xs text-slate-500">
              {u('legacy.dashboard.onTimePercent', 'On-time %')}
            </span>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={liveCorridorData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} domain={[70, 100]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #1e293b',
                    background: '#0f172a',
                    color: '#e2e8f0',
                  }}
                />
                <Bar dataKey="value" fill="#00AEEF" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="xl:col-span-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold dark:text-white">
              {u('legacy.dashboard.etaVarianceTrend', 'ETA Variance Trend')}
            </p>
            <span className="text-xs text-emerald-500 font-semibold">-12%</span>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={liveEtaTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f2937" opacity={0.2} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #1e293b',
                    background: '#0f172a',
                    color: '#e2e8f0',
                  }}
                />
                <Line type="monotone" dataKey="variance" stroke="#00AEEF" strokeWidth={3} dot={{ r: 3, fill: '#00AEEF' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <p className="text-sm font-bold dark:text-white mb-4">
            {u('legacy.dashboard.liveAlerts', 'Live Alerts')}
          </p>
          <div className="space-y-4">
            {liveAlertFeed.map((item) => (
              <div key={`${item.time}-${item.title}`} className="flex gap-3">
                <div className={cn('w-2.5 h-2.5 rounded-full mt-1.5 shrink-0', item.tone.replace('text-', 'bg-'))} />
                <div>
                  <p className="text-xs text-slate-500">{item.time}</p>
                  <p className="text-sm dark:text-slate-200 leading-relaxed">{item.title}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              {u('legacy.dashboard.aiForecast', 'AI Forecast')}
            </div>
            <p className="text-sm text-slate-500 mt-2">
              {u('legacy.dashboard.expectedRiskDown14IfReroutePolicyStaysEnabled', 'Expected risk down 14% if reroute policy stays enabled.')}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-7">
          <p className="text-sm font-bold dark:text-white mb-4">
            {u('legacy.dashboard.recentActivity', 'Recent Activity')}
          </p>
          <div className="space-y-4">
            {liveRecentActivity.map((item, idx) => (
              <div key={item.title} className="flex gap-4">
                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5" />
                  {idx !== liveRecentActivity.length - 1 && <div className="absolute top-4 left-[4.5px] w-px h-10 bg-slate-200 dark:bg-slate-800" />}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold dark:text-white">{item.title}</p>
                    <span className="text-[11px] text-slate-400">{item.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <p className="text-sm font-bold dark:text-white mb-4">
            {u('legacy.dashboard.automationSnapshot', 'Automation Snapshot')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: u('legacy.dashboard.aiDispatch', 'AI Dispatch'),
                value: '24',
                meta: u('legacy.dashboard.rulesActive', 'rules active'),
              },
              {
                label: u('legacy.dashboard.fallbackRoutes', 'Fallback Routes'),
                value: '7',
                meta: u('legacy.dashboard.prepared', 'prepared'),
              },
              {
                label: u('legacy.dashboard.securityChecks', 'Security Checks'),
                value: '112',
                meta: u('legacy.dashboard.last24h', 'last 24h'),
              },
              {
                label: u('legacy.dashboard.smartEtaPings', 'Smart ETA Pings'),
                value: '318',
                meta: u('legacy.dashboard.autoSent', 'auto-sent'),
              },
            ].map((tile) => (
              <div key={tile.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">{tile.label}</p>
                <p className="text-xl font-black dark:text-white mt-1">{tile.value}</p>
                <p className="text-xs text-slate-500">{tile.meta}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {role === 'user' ? (
        <Card title={u('dashboard.myActiveLoads', 'My Active Loads')}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {u('legacy.dashboard.loadId', 'Load ID')}
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{u('legacy.dashboard.route', 'Route')}</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{u('legacy.dashboard.cargo', 'Cargo')}</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{u('legacy.dashboard.status', 'Status')}</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {loadRows.slice(0, 3).map((load) => (
                  <tr key={load.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 text-sm font-bold dark:text-white">{load.id}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{load.pickup}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span>{load.delivery}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-slate-500">{load.cargoType} ({load.weight}kg)</td>
                    <td className="p-4">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                          load.status === 'Available' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                        )}
                      >
                        {trLoadStatus(lang, load.status)}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-500">{load.eta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card title={u('legacy.dashboard.activeRouteBoard', 'Active Route Board')}>
          <div className="space-y-3">
            {[
              { id: 'HAM-SJJ-214', route: 'Hamburg -> Sarajevo', status: 'In Transit', eta: '14:20', progress: 78 },
              { id: 'VIE-PRG-551', route: 'Vienna -> Prague', status: 'Out for Delivery', eta: '13:05', progress: 92 },
              { id: 'ZAG-BER-882', route: 'Zagreb -> Berlin', status: 'In Transit', eta: '18:40', progress: 64 },
              { id: 'MUC-AMS-441', route: 'Munich -> Amsterdam', status: 'Pending', eta: '16:55', progress: 36 },
            ].map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold dark:text-white">{item.id}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.route}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={cn(
                        'px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        item.status === 'Out for Delivery'
                          ? 'bg-amber-100 text-amber-600'
                          : item.status === 'In Transit'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {trPackageStatus(lang, item.status)}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">ETA {item.eta}</p>
                  </div>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${item.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
