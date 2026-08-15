import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Crown,
  Database,
  Globe2,
  PackageCheck,
  Radio,
  ShieldCheck,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';

import { Language } from '../../types';
import { cn } from '../../lib/cn';
import { Card } from '../ui/Card';

const platformMetrics = [
  { label: 'Companies', value: '148', meta: '+9 this month', icon: Building2, tone: 'bg-violet-500/10 text-violet-500' },
  { label: 'Verified drivers', value: '3,842', meta: '2,916 online today', icon: Users, tone: 'bg-sky-500/10 text-sky-500' },
  { label: 'Active loads', value: '1,284', meta: 'EUR 2.8M cargo value', icon: PackageCheck, tone: 'bg-emerald-500/10 text-emerald-500' },
  { label: 'Fleet assets', value: '5,607', meta: '91.4% operational', icon: Truck, tone: 'bg-amber-500/10 text-amber-500' },
  { label: 'Platform revenue', value: 'EUR 486K', meta: '+18.2% this month', icon: CircleDollarSign, tone: 'bg-rose-500/10 text-rose-500' },
];

const companies = [
  { name: 'Nord Cargo GmbH', country: 'Germany', drivers: 184, loads: 96, fleet: 211, revenue: 'EUR 82,440', health: 98 },
  { name: 'Adria Freight d.o.o.', country: 'Bosnia & Herzegovina', drivers: 128, loads: 72, fleet: 146, revenue: 'EUR 61,280', health: 96 },
  { name: 'Benelux Transport BV', country: 'Netherlands', drivers: 96, loads: 58, fleet: 118, revenue: 'EUR 49,870', health: 93 },
  { name: 'Baltic Route Sp. z o.o.', country: 'Poland', drivers: 77, loads: 41, fleet: 91, revenue: 'EUR 37,220', health: 88 },
];

const liveEvents = [
  { label: 'Load SF-9082 crossed the Austria checkpoint', scope: 'Nord Cargo GmbH', tone: 'text-sky-500' },
  { label: 'New company verification submitted', scope: 'TransItalia SRL', tone: 'text-violet-500' },
  { label: 'Payout batch EUR 38,420 approved', scope: 'Finance', tone: 'text-emerald-500' },
  { label: 'Driver compliance document expires in 3 days', scope: 'Baltic Route', tone: 'text-amber-500' },
];

export const AdminOverviewView = ({ lang: _lang }: { lang: Language }) => (
  <div className="space-y-6">
    <section className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-violet-100 p-6 text-slate-900 shadow-xl shadow-sky-900/10 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950 dark:text-white dark:shadow-black/30 md:p-8">
      <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl dark:bg-primary/25" />
      <div className="absolute bottom-0 left-1/3 h-40 w-64 rounded-full bg-violet-400/15 blur-3xl dark:bg-violet-500/20" />
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3"><div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-violet-500 text-white shadow-lg shadow-primary/30"><Crown className="h-7 w-7" /></div><div><p className="text-xs font-black uppercase tracking-[0.22em] text-primary">Superadmin · God Mode</p><h1 className="text-3xl font-black">Platform Command Center</h1></div></div>
          <p className="mt-4 max-w-3xl text-sm text-slate-600 dark:text-slate-300">Complete visibility across every company, driver, vehicle, load, payment, message, and platform event.</p>
        </div>
        <div className="rounded-2xl border border-emerald-300/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm dark:border-emerald-400/20 dark:bg-emerald-400/10"><p className="flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-400"><Radio className="h-4 w-4 animate-pulse" /> ALL SYSTEMS LIVE</p><p className="mt-1 text-sm font-semibold">99.99% platform uptime</p></div>
      </div>
      <div className="relative mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[['Live API events', '28,491/min', Activity], ['Data records', '18.7M', Database], ['Countries active', '34', Globe2], ['Security incidents', '0', ShieldCheck]].map(([label, value, Icon]) => (
          <div key={String(label)} className="rounded-2xl border border-sky-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/5"><div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400"><Icon className="h-4 w-4 text-primary dark:text-slate-400" />{String(label)}</div><p className="mt-2 text-2xl font-black">{String(value)}</p></div>
        ))}
      </div>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {platformMetrics.map((metric) => (
        <Card key={metric.label} className="p-4"><div className="flex items-start justify-between gap-2"><div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{metric.label}</p><p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{metric.value}</p><p className="mt-1 text-xs text-slate-500">{metric.meta}</p></div><div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', metric.tone)}><metric.icon className="h-5 w-5" /></div></div></Card>
      ))}
    </section>

    <div className="grid gap-6 xl:grid-cols-12">
      <Card className="xl:col-span-8">
        <div className="flex items-center justify-between"><div><p className="text-lg font-black text-slate-900 dark:text-white">Top company operations</p><p className="text-sm text-slate-500">Cross-company performance and platform contribution.</p></div><TrendingUp className="h-5 w-5 text-emerald-500" /></div>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800"><th className="p-3">Company</th><th className="p-3">Drivers</th><th className="p-3">Active loads</th><th className="p-3">Fleet</th><th className="p-3">Revenue</th><th className="p-3">Health</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{companies.map((company) => <tr key={company.name}><td className="p-3"><p className="text-sm font-bold text-slate-900 dark:text-white">{company.name}</p><p className="text-xs text-slate-500">{company.country}</p></td><td className="p-3 text-sm text-slate-600 dark:text-slate-300">{company.drivers}</td><td className="p-3 text-sm text-slate-600 dark:text-slate-300">{company.loads}</td><td className="p-3 text-sm text-slate-600 dark:text-slate-300">{company.fleet}</td><td className="p-3 text-sm font-black text-slate-900 dark:text-white">{company.revenue}</td><td className="p-3"><span className={cn('rounded-full px-2 py-1 text-xs font-bold', company.health >= 95 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600')}>{company.health}%</span></td></tr>)}</tbody></table></div>
      </Card>

      <div className="space-y-6 xl:col-span-4">
        <Card><div className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /><p className="text-lg font-black dark:text-white">Live platform feed</p></div><div className="mt-4 space-y-4">{liveEvents.map((event) => <div key={event.label} className="flex items-start gap-3"><div className={cn('mt-1 h-2.5 w-2.5 rounded-full bg-current', event.tone)} /><div><p className="text-sm text-slate-700 dark:text-slate-300">{event.label}</p><p className="text-xs text-slate-500">{event.scope} · now</p></div></div>)}</div></Card>
        <Card><div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /><p className="text-lg font-black dark:text-white">Attention queue</p></div><div className="mt-4 space-y-2"><div className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">6 company verifications awaiting review</div><div className="rounded-xl bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-400">3 overdue balances above EUR 10K</div><div className="rounded-xl bg-sky-500/10 p-3 text-sm text-sky-700 dark:text-sky-400">14 driver documents expire this week</div></div></Card>
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      {[['Company health', '142 of 148 healthy', CheckCircle2], ['Load completion', '96.8% platform-wide', PackageCheck], ['Driver compliance', '98.1% verified', ShieldCheck]].map(([label, value, Icon]) => <Card key={String(label)} className="p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div><div><p className="text-xs uppercase tracking-wider text-slate-500">{String(label)}</p><p className="font-black text-slate-900 dark:text-white">{String(value)}</p></div></div></Card>)}
    </div>
  </div>
);
