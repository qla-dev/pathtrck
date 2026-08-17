import { Activity, Boxes, Building2, Crown, PackageCheck, ReceiptText, ShieldCheck, Users } from 'lucide-react';
import { useApiList } from '../../hooks/useApiList';
import { api } from '../../services/api';
import { Language } from '../../types';
import { Card } from '../ui/Card';
import { InlineDataState } from '../ui/InlineDataState';

const page = { per_page: 100 };
export const AdminOverviewView = ({ lang: _lang }: { lang: Language }) => {
  const companies = useApiList(api.companies.list, page);
  const customers = useApiList(api.customers.list, { limit: 1 });
  const drivers = useApiList(api.drivers.list, page);
  const loads = useApiList(api.loads.list, page);
  const vehicles = useApiList(api.vehicles.list, page);
  const invoices = useApiList(api.invoices.list, page);
  const events = useApiList(api.trackingEvents.list, { per_page: 10 });
  const sources = [companies, customers, drivers, loads, vehicles, invoices, events];
  const loading = sources.some((source) => source.loading);
  const error = sources.find((source) => source.error)?.error;
  const loadsInTransit = loads.items.filter((load) => String(load.status).toLowerCase() === 'in_delivery');
  const loadsInExchange = loads.items.filter((load) => String(load.status).toLowerCase() === 'posted');
  const metrics = [
    { label: 'Companies', value: companies.total, icon: Building2, tone: 'bg-violet-500/10 text-violet-500' },
    { label: 'Driver profiles', value: drivers.total, icon: Users, tone: 'bg-sky-500/10 text-sky-500' },
    { label: 'Loads in transit', value: loadsInTransit.length, icon: PackageCheck, tone: 'bg-sky-500/10 text-sky-500' },
    { label: 'Loads in exchange', value: loadsInExchange.length, icon: Boxes, tone: 'bg-emerald-500/10 text-emerald-500' },
  ];

  return <div className="space-y-6">
    <section className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-violet-100 p-6 text-slate-900 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-indigo-950 dark:text-white md:p-8">
      <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-6"><div className="flex items-center gap-3"><div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-lg"><Crown className="h-7 w-7" /></div><div><h1 className="text-3xl font-black">Platform Command Center</h1><p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-300">Live visibility across records stored in the Freightbook.ai database.</p></div></div><div className="rounded-2xl border border-emerald-300/70 bg-white/70 px-4 py-3 dark:border-emerald-400/20 dark:bg-emerald-400/10"><p className="flex items-center gap-2 text-xs font-black text-emerald-600 dark:text-emerald-400"><ShieldCheck className="h-4 w-4" /> DATABASE CONNECTED</p></div></div>
      <div className="relative mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Tracking events', events.total, Activity], ['Database resources', sources.length, ShieldCheck], ['Customers', customers.total, Users], ['Open invoices', invoices.items.filter((invoice) => String(invoice.status).toLowerCase() !== 'paid').length, ReceiptText]].map(([label, value, Icon]) => <div key={String(label)} className="rounded-2xl border border-sky-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5"><div className="flex items-center gap-2 text-xs uppercase tracking-wider text-slate-500"><Icon className="h-4 w-4 text-primary" />{String(label)}</div><p className="mt-2 text-2xl font-black">{loading ? '—' : String(value)}</p></div>)}</div>
    </section>
    {error ? <Card><InlineDataState loading={false} error={error} empty="" onRetry={() => sources.forEach((source) => void source.refresh())} /></Card> : <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <Card key={metric.label} className="shadow-none" contentClassName="flex items-center justify-between gap-3 px-5 py-3"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">{metric.label}</p><p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{loading ? '—' : metric.value}</p></div><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${metric.tone}`}><metric.icon className="h-6 w-6" /></div></Card>)}</section>
      <div className="grid gap-6 xl:grid-cols-12"><Card className="xl:col-span-8"><p className="text-lg font-black dark:text-white">Company operations</p>{companies.loading || companies.items.length === 0 ? <InlineDataState loading={companies.loading} error={companies.error} empty="No companies in the database yet." onRetry={companies.refresh} /> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[640px] text-left"><thead><tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800"><th className="p-3">Company</th><th className="p-3">Country</th><th className="p-3">Fleet</th><th className="p-3">Plan</th><th className="p-3">Status</th></tr></thead><tbody>{companies.items.map((company) => <tr key={String(company.id)} className="border-b border-slate-100 dark:border-slate-800"><td className="p-3 font-bold dark:text-white">{String(company.name || '')}</td><td className="p-3 text-sm">{String(company.country_code || '—')}</td><td className="p-3 text-sm">{Array.isArray(company.vehicles) ? company.vehicles.length : 0}</td><td className="p-3 text-sm">{String(company.plan || '—')}</td><td className="p-3 text-sm">{String(company.status || '—')}</td></tr>)}</tbody></table></div>}</Card><Card className="xl:col-span-4"><p className="text-lg font-black dark:text-white">Latest tracking events</p>{events.loading || events.items.length === 0 ? <InlineDataState loading={events.loading} error={events.error} empty="No tracking events yet." onRetry={events.refresh} /> : <div className="mt-4 space-y-3">{events.items.map((event) => <div key={String(event.id)} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><p className="text-sm font-bold dark:text-white">{String(event.title || event.status || 'Tracking event')}</p><p className="text-xs text-slate-500">{String(event.location || '')}</p></div>)}</div>}</Card></div>
    </>}
  </div>;
};
