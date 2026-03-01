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
import { MOCK_LOADS } from '../../mockData';
import { ui, trLoadStatus, trPackageStatus } from '../../i18n';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PostLoadModal } from '../modals/PostLoadModal';

type RangeOption = '24h' | '7d' | '30d';

const tr = (lang: Language, en: string, bs: string, de: string) => {
  if (lang === 'bs') return bs;
  if (lang === 'de') return de;
  return en;
};

export const Dashboard = ({ role, lang }: { role: Role; lang: Language }) => {
  const [isPostLoadOpen, setIsPostLoadOpen] = useState(false);
  const [range, setRange] = useState<RangeOption>('7d');
  const isDriver = role === 'driver';
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  const analyticsTitle = tr(lang, 'Analytics Command Center', 'Analiticki komandni centar', 'Analytics-Kommandozentrale');
  const analyticsSubtitle = isDriver
    ? tr(
        lang,
        'Live route quality, stop performance, and delivery precision for your fleet.',
        'Kvalitet ruta uzivo, ucinak stajanja i preciznost isporuka za vasu flotu.',
        'Live-Routenqualitaet, Stopp-Performance und Lieferpraezision fuer Ihre Flotte.'
      )
    : tr(
        lang,
        'Shipment visibility, carrier performance, and cost control in one analytics hub.',
        'Vidljivost posiljki, ucinak prevoznika i kontrola troskova na jednom mjestu.',
        'Sendungstransparenz, Fahrerleistung und Kostenkontrolle in einem Analytics-Hub.'
      );

  const rangeOptions: Array<{ id: RangeOption; label: string }> = [
    { id: '24h', label: tr(lang, '24h', '24h', '24h') },
    { id: '7d', label: tr(lang, '7d', '7d', '7d') },
    { id: '30d', label: tr(lang, '30d', '30d', '30d') },
  ];

  const topMetrics = isDriver
    ? [
        {
          label: tr(lang, 'Active Trips', 'Aktivne rute', 'Aktive Fahrten'),
          value: '8',
          delta: tr(lang, '+2 vs yesterday', '+2 u odnosu na jucer', '+2 vs gestern'),
          icon: Truck,
          tone: 'text-sky-500',
        },
        {
          label: tr(lang, 'Delivered Today', 'Isporuceno danas', 'Heute zugestellt'),
          value: '21',
          delta: tr(lang, '98.1% on-time', '98.1% na vrijeme', '98.1% puenktlich'),
          icon: CheckCircle2,
          tone: 'text-emerald-500',
        },
        {
          label: trPackageStatus(lang, 'In Transit'),
          value: '6',
          delta: tr(lang, '2 priority routes', '2 prioritetne rute', '2 Prioritaetsrouten'),
          icon: PackageIcon,
          tone: 'text-indigo-500',
        },
        {
          label: tr(lang, 'Avg Stop Delay', 'Prosjecno kasnjenje stajanja', 'Durchschn. Stopp-Verzoegerung'),
          value: '6m',
          delta: tr(lang, '-18% this week', '-18% ove sedmice', '-18% diese Woche'),
          icon: Clock3,
          tone: 'text-amber-500',
        },
        {
          label: tr(lang, 'Fuel Efficiency', 'Efikasnost goriva', 'Kraftstoffeffizienz'),
          value: '7.8 L',
          delta: tr(lang, 'per 100 km', 'na 100 km', 'pro 100 km'),
          icon: Gauge,
          tone: 'text-cyan-500',
        },
        {
          label: tr(lang, 'Safety Score', 'Sigurnosni score', 'Sicherheits-Score'),
          value: '99%',
          delta: tr(lang, '0 incidents', '0 incidenata', '0 Vorfaelle'),
          icon: Activity,
          tone: 'text-violet-500',
        },
      ]
    : [
        {
          label: tr(lang, 'Active Shipments', 'Aktivne posiljke', 'Aktive Sendungen'),
          value: '12',
          delta: tr(lang, '+4 today', '+4 danas', '+4 heute'),
          icon: PackageIcon,
          tone: 'text-sky-500',
        },
        {
          label: tr(lang, 'Delivered Today', 'Isporuceno danas', 'Heute zugestellt'),
          value: '38',
          delta: tr(lang, '97.4% on-time', '97.4% na vrijeme', '97.4% puenktlich'),
          icon: CheckCircle2,
          tone: 'text-emerald-500',
        },
        {
          label: tr(lang, 'Carrier Response', 'Odgovor prevoznika', 'Fahrer-Reaktion'),
          value: '18m',
          delta: tr(lang, '-5m this week', '-5m ove sedmice', '-5 Min diese Woche'),
          icon: Clock3,
          tone: 'text-indigo-500',
        },
        {
          label: tr(lang, 'Cost Efficiency', 'Efikasnost troska', 'Kosteneffizienz'),
          value: '+9.2%',
          delta: tr(lang, 'vs last month', 'u odnosu na prosli mjesec', 'vs letztem Monat'),
          icon: BarChart3,
          tone: 'text-amber-500',
        },
        {
          label: tr(lang, 'Route Coverage', 'Pokrivenost ruta', 'Routenabdeckung'),
          value: '192',
          delta: tr(lang, 'cities online', 'gradova online', 'Staedte online'),
          icon: Route,
          tone: 'text-cyan-500',
        },
        {
          label: tr(lang, 'Risk Alerts', 'Rizicna upozorenja', 'Risikoalarme'),
          value: '2',
          delta: tr(lang, 'all handled', 'sve obradjeno', 'alle bearbeitet'),
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
    { name: tr(lang, 'On Time', 'Na vrijeme', 'Puenktlich'), value: 78, color: '#00AEEF' },
    { name: tr(lang, 'Minor Delay', 'Manje kasnjenje', 'Kleine Verzoegerung'), value: 16, color: '#F59E0B' },
    { name: tr(lang, 'Critical Delay', 'Kriticno kasnjenje', 'Kritische Verzoegerung'), value: 6, color: '#EF4444' },
  ];

  const alertFeed = [
    {
      title: tr(lang, 'AI rerouted HAM-SJJ-214', 'AI preusmjerio HAM-SJJ-214', 'KI hat HAM-SJJ-214 umgeleitet'),
      time: '09:14',
      tone: 'text-primary',
    },
    {
      title: tr(lang, 'Munich checkpoint cleared', 'Minhenski checkpoint odobren', 'Muenchner Checkpoint freigegeben'),
      time: '09:22',
      tone: 'text-emerald-500',
    },
    {
      title: tr(lang, 'ETA drift detected on ZAG-BER', 'Detektovan ETA drift na ZAG-BER', 'ETA-Abweichung auf ZAG-BER erkannt'),
      time: '09:31',
      tone: 'text-amber-500',
    },
    {
      title: tr(lang, 'Proof-of-delivery synced', 'Dokaz isporuke sinhronizovan', 'Zustellnachweis synchronisiert'),
      time: '09:36',
      tone: 'text-violet-500',
    },
  ];

  const recentActivity = [
    {
      title: tr(lang, 'Route completed', 'Ruta zavrsena', 'Route abgeschlossen'),
      desc: tr(lang, 'R1 reached final checkpoint in Sarajevo.', 'R1 stigla na zavrsni checkpoint u Sarajevu.', 'R1 hat den finalen Checkpoint in Sarajevo erreicht.'),
      time: tr(lang, '2 mins ago', 'prije 2 min', 'vor 2 Min'),
    },
    {
      title: tr(lang, 'New load posted', 'Objavljen novi teret', 'Neue Ladung erstellt'),
      desc: tr(lang, 'Electronics Pallets now visible to matching drivers.', 'Electronics Pallets sada vidljiv odgovarajucim vozacima.', 'Electronics Pallets sind jetzt fuer passende Fahrer sichtbar.'),
      time: tr(lang, '19 mins ago', 'prije 19 min', 'vor 19 Min'),
    },
    {
      title: tr(lang, 'AI forecast refreshed', 'AI prognoza osvjezena', 'KI-Prognose aktualisiert'),
      desc: tr(lang, 'Risk model recalculated with latest weather and traffic.', 'Rizicni model preracunat sa zadnjim vremenom i saobracajem.', 'Risikomodell mit aktuellen Wetter- und Verkehrsdaten neu berechnet.'),
      time: tr(lang, '1 hour ago', 'prije 1h', 'vor 1 Std'),
    },
  ];

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
          {role === 'user' ? (
            <Button size="sm" onClick={() => setIsPostLoadOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {u('common.postNewLoad', 'Post New Load')}
            </Button>
          ) : (
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {u('common.newRoute', 'New Route')}
            </Button>
          )}
        </div>
      </div>

      <PostLoadModal isOpen={isPostLoadOpen} onClose={() => setIsPostLoadOpen(false)} lang={lang} />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {topMetrics.map((metric) => (
          <Card key={metric.label} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{metric.label}</p>
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
                {tr(lang, 'Delivery Throughput', 'Protok isporuka', 'Lieferdurchsatz')}
              </p>
              <p className="text-xs text-slate-500">
                {tr(lang, 'Completed vs planned volume', 'Zavrseni naspram planiranog volumena', 'Abgeschlossenes vs geplantes Volumen')}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary" />
              {tr(lang, 'Completed', 'Zavrseno', 'Abgeschlossen')}
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-400" />
              {tr(lang, 'Planned', 'Planirano', 'Geplant')}
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={throughputData}>
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
                {tr(lang, 'Service Health', 'Zdravlje servisa', 'Service-Status')}
              </p>
              <p className="text-xs text-slate-500">{tr(lang, 'Current SLA distribution', 'Trenutna SLA raspodjela', 'Aktuelle SLA-Verteilung')}</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {tr(lang, 'Stable', 'Stabilno', 'Stabil')}
            </div>
          </div>
          <div className="h-[210px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={serviceMix} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>
                  {serviceMix.map((item) => (
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
            {serviceMix.map((item) => (
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
              {tr(lang, 'Corridor Performance', 'Ucinak koridora', 'Korridor-Performance')}
            </p>
            <span className="text-xs text-slate-500">
              {tr(lang, 'On-time %', '% na vrijeme', '% puenktlich')}
            </span>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={corridorData}>
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
              {tr(lang, 'ETA Variance Trend', 'Trend ETA odstupanja', 'ETA-Abweichungstrend')}
            </p>
            <span className="text-xs text-emerald-500 font-semibold">-12%</span>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={etaTrendData}>
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
            {tr(lang, 'Live Alerts', 'Upozorenja uzivo', 'Live-Alarme')}
          </p>
          <div className="space-y-4">
            {alertFeed.map((item) => (
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
              {tr(lang, 'AI Forecast', 'AI prognoza', 'KI-Prognose')}
            </div>
            <p className="text-sm text-slate-500 mt-2">
              {tr(
                lang,
                'Expected risk down 14% if reroute policy stays enabled.',
                'Ocekivani rizik manji za 14% ako reroute politika ostane aktivna.',
                'Erwartetes Risiko sinkt um 14%, wenn die Umleitungsregel aktiv bleibt.'
              )}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-7">
          <p className="text-sm font-bold dark:text-white mb-4">
            {tr(lang, 'Recent Activity', 'Nedavna aktivnost', 'Letzte Aktivitaet')}
          </p>
          <div className="space-y-4">
            {recentActivity.map((item, idx) => (
              <div key={item.title} className="flex gap-4">
                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5" />
                  {idx !== recentActivity.length - 1 && <div className="absolute top-4 left-[4.5px] w-px h-10 bg-slate-200 dark:bg-slate-800" />}
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
            {tr(lang, 'Automation Snapshot', 'Snapshot automatizacije', 'Automations-Snapshot')}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: tr(lang, 'AI Dispatch', 'AI dispecer', 'KI-Dispatch'),
                value: '24',
                meta: tr(lang, 'rules active', 'aktivna pravila', 'aktive Regeln'),
              },
              {
                label: tr(lang, 'Fallback Routes', 'Fallback rute', 'Fallback-Routen'),
                value: '7',
                meta: tr(lang, 'prepared', 'spremno', 'vorbereitet'),
              },
              {
                label: tr(lang, 'Security Checks', 'Sigurnosne provjere', 'Sicherheitspruefungen'),
                value: '112',
                meta: tr(lang, 'last 24h', 'zadnja 24h', 'letzte 24h'),
              },
              {
                label: tr(lang, 'Smart ETA Pings', 'Smart ETA pingovi', 'Smart-ETA-Pings'),
                value: '318',
                meta: tr(lang, 'auto-sent', 'auto poslano', 'auto gesendet'),
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
                    {tr(lang, 'Load ID', 'ID tereta', 'Ladungs-ID')}
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{tr(lang, 'Route', 'Ruta', 'Route')}</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{tr(lang, 'Cargo', 'Teret', 'Fracht')}</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{tr(lang, 'Status', 'Status', 'Status')}</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {MOCK_LOADS.slice(0, 3).map((load) => (
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
        <Card title={tr(lang, 'Active Route Board', 'Aktivna ruta tabla', 'Aktive Routenliste')}>
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

