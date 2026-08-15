import { useMemo, useState } from 'react';
import { Building2, CheckCircle2, CircleAlert, Eye, Mail, Search, ShieldCheck, Users } from 'lucide-react';

import { Language } from '../../types';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type CompanyStatus = 'Verified' | 'Pending' | 'Suspended';
type Company = { id: number; name: string; country: string; email: string; plan: string; drivers: number; fleet: number; loads: number; revenue: string; status: CompanyStatus };

const COMPANIES: Company[] = [
  { id: 1, name: 'Nord Cargo GmbH', country: 'Germany', email: 'ops@nordcargo.de', plan: 'Enterprise', drivers: 184, fleet: 211, loads: 96, revenue: 'EUR 82,440', status: 'Verified' },
  { id: 2, name: 'Adria Freight d.o.o.', country: 'Bosnia & Herzegovina', email: 'team@adriafreight.ba', plan: 'Enterprise', drivers: 128, fleet: 146, loads: 72, revenue: 'EUR 61,280', status: 'Verified' },
  { id: 3, name: 'Benelux Transport BV', country: 'Netherlands', email: 'dispatch@benelux.nl', plan: 'Growth', drivers: 96, fleet: 118, loads: 58, revenue: 'EUR 49,870', status: 'Verified' },
  { id: 4, name: 'Baltic Route Sp. z o.o.', country: 'Poland', email: 'office@balticroute.pl', plan: 'Growth', drivers: 77, fleet: 91, loads: 41, revenue: 'EUR 37,220', status: 'Pending' },
  { id: 5, name: 'TransItalia SRL', country: 'Italy', email: 'admin@transitalia.it', plan: 'Starter', drivers: 28, fleet: 34, loads: 19, revenue: 'EUR 12,640', status: 'Pending' },
  { id: 6, name: 'Iberia Cold Chain', country: 'Spain', email: 'billing@iberiacold.es', plan: 'Growth', drivers: 45, fleet: 52, loads: 23, revenue: 'EUR 19,810', status: 'Suspended' },
];

const statusTone: Record<CompanyStatus, string> = { Verified: 'bg-emerald-500/10 text-emerald-600', Pending: 'bg-amber-500/10 text-amber-600', Suspended: 'bg-rose-500/10 text-rose-600' };

export const AdminCompaniesView = ({ lang: _lang, onOpenEmailStudio }: { lang: Language; onOpenEmailStudio?: () => void }) => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'All' | CompanyStatus>('All');
  const [selected, setSelected] = useState<Company | null>(null);
  const visible = useMemo(() => COMPANIES.filter((company) => `${company.name} ${company.country} ${company.email}`.toLowerCase().includes(query.toLowerCase()) && (status === 'All' || company.status === status)), [query, status]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500"><Building2 className="h-6 w-6" /></div><div><p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Superadmin registry</p><h1 className="text-2xl font-black dark:text-white">Logistics Companies</h1></div></div><Button onClick={onOpenEmailStudio} className="gap-2"><Mail className="h-4 w-4" /> Email companies</Button></div><p className="mt-4 max-w-3xl text-sm text-slate-500">Inspect every freight forwarder, subscription, driver base, fleet, active load, revenue, and verification state.</p></section>

      <div className="grid gap-4 sm:grid-cols-3"><Card className="p-4"><p className="text-xs uppercase text-slate-500">Total companies</p><p className="mt-1 text-3xl font-black dark:text-white">148</p></Card><Card className="p-4"><p className="text-xs uppercase text-slate-500">Pending verification</p><p className="mt-1 text-3xl font-black text-amber-500">6</p></Card><Card className="p-4"><p className="text-xs uppercase text-slate-500">Enterprise accounts</p><p className="mt-1 text-3xl font-black text-violet-500">42</p></Card></div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4"><div className="relative min-w-64 flex-1 max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search companies..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></div><div className="flex gap-2">{(['All', 'Verified', 'Pending', 'Suspended'] as const).map((option) => <button key={option} onClick={() => setStatus(option)} className={cn('rounded-xl px-3 py-2 text-xs font-bold', status === option ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>{option}</button>)}</div></div>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[980px] text-left"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800"><th className="p-3">Company</th><th className="p-3">Plan</th><th className="p-3">Drivers</th><th className="p-3">Fleet</th><th className="p-3">Active loads</th><th className="p-3">Monthly revenue</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{visible.map((company) => <tr key={company.id}><td className="p-3"><p className="font-bold text-slate-900 dark:text-white">{company.name}</p><p className="text-xs text-slate-500">{company.country} · {company.email}</p></td><td className="p-3"><span className="rounded-full bg-violet-500/10 px-2 py-1 text-xs font-bold text-violet-600">{company.plan}</span></td><td className="p-3 text-sm">{company.drivers}</td><td className="p-3 text-sm">{company.fleet}</td><td className="p-3 text-sm">{company.loads}</td><td className="p-3 font-black dark:text-white">{company.revenue}</td><td className="p-3"><span className={cn('rounded-full px-2 py-1 text-xs font-bold', statusTone[company.status])}>{company.status}</span></td><td className="p-3"><div className="flex gap-2"><button onClick={() => setSelected(company)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-primary dark:bg-slate-800"><Eye className="h-4 w-4" /></button><button onClick={onOpenEmailStudio} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-primary dark:bg-slate-800"><Mail className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>
      </Card>

      {selected && <Card><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-primary">Company detail</p><h2 className="text-xl font-black dark:text-white">{selected.name}</h2><p className="text-sm text-slate-500">{selected.email} · {selected.country}</p></div><button onClick={() => setSelected(null)} className="text-xs font-bold text-slate-500">Close</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[[Users, 'Drivers', selected.drivers], [Building2, 'Fleet assets', selected.fleet], [CheckCircle2, 'Active loads', selected.loads], [selected.status === 'Verified' ? ShieldCheck : CircleAlert, 'Account status', selected.status]].map(([Icon, label, value]) => <div key={String(label)} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><Icon className="h-4 w-4 text-primary" /><p className="mt-2 text-xs text-slate-500">{String(label)}</p><p className="font-black dark:text-white">{String(value)}</p></div>)}</div></Card>}
    </div>
  );
};
