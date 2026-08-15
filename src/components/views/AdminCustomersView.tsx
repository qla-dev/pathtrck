import { useMemo, useState } from 'react';
import { BadgeCheck, CircleAlert, Eye, Mail, PackageCheck, Search, UserRound, Users } from 'lucide-react';

import { Language } from '../../types';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type CustomerStatus = 'Active' | 'Pending' | 'Restricted';
type Customer = {
  id: number;
  name: string;
  kind: 'Business' | 'Individual';
  country: string;
  email: string;
  activeLoads: number;
  completedLoads: number;
  monthlySpend: string;
  joined: string;
  status: CustomerStatus;
};

const CUSTOMERS: Customer[] = [
  { id: 1, name: 'PharmaNova Europe', kind: 'Business', country: 'Germany', email: 'logistics@pharmanova.eu', activeLoads: 18, completedLoads: 486, monthlySpend: 'EUR 74,260', joined: '12.02.2025', status: 'Active' },
  { id: 2, name: 'Adriatic Retail Group', kind: 'Business', country: 'Bosnia & Herzegovina', email: 'supply@adriatic-retail.ba', activeLoads: 12, completedLoads: 308, monthlySpend: 'EUR 48,910', joined: '08.05.2025', status: 'Active' },
  { id: 3, name: 'Marta Kowalska', kind: 'Individual', country: 'Poland', email: 'marta.k@example.com', activeLoads: 2, completedLoads: 41, monthlySpend: 'EUR 6,840', joined: '21.09.2025', status: 'Active' },
  { id: 4, name: 'Benelux Auto Parts', kind: 'Business', country: 'Netherlands', email: 'freight@beneluxparts.nl', activeLoads: 7, completedLoads: 174, monthlySpend: 'EUR 31,550', joined: '17.11.2025', status: 'Pending' },
  { id: 5, name: 'Luca Bianchi', kind: 'Individual', country: 'Italy', email: 'luca.b@example.com', activeLoads: 0, completedLoads: 23, monthlySpend: 'EUR 2,190', joined: '04.01.2026', status: 'Restricted' },
  { id: 6, name: 'Iberia Fresh Markets', kind: 'Business', country: 'Spain', email: 'transport@iberiafresh.es', activeLoads: 9, completedLoads: 219, monthlySpend: 'EUR 39,780', joined: '26.03.2025', status: 'Active' },
];

const statusTone: Record<CustomerStatus, string> = {
  Active: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Restricted: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

export const AdminCustomersView = ({ lang: _lang, onOpenEmailStudio }: { lang: Language; onOpenEmailStudio?: () => void }) => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'All' | CustomerStatus>('All');
  const [selected, setSelected] = useState<Customer | null>(null);
  const visible = useMemo(
    () => CUSTOMERS.filter((customer) =>
      `${customer.name} ${customer.country} ${customer.email} ${customer.kind}`.toLowerCase().includes(query.toLowerCase())
      && (status === 'All' || customer.status === status)),
    [query, status],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500"><UserRound className="h-6 w-6" /></div>
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Superadmin registry</p><h1 className="text-2xl font-black dark:text-white">All Customers</h1></div>
          </div>
          <Button onClick={onOpenEmailStudio} className="gap-2"><Mail className="h-4 w-4" /> Email customers</Button>
        </div>
        <p className="mt-4 max-w-3xl text-sm text-slate-500">Manage every shipper account, inspect activity and spending, review account access, and contact customers directly.</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4"><p className="text-xs uppercase text-slate-500">Total customers</p><p className="mt-1 text-3xl font-black dark:text-white">2,416</p><p className="mt-1 text-xs text-emerald-500">+84 this month</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-slate-500">Business accounts</p><p className="mt-1 text-3xl font-black dark:text-white">1,728</p><p className="mt-1 text-xs text-slate-500">71.5% of customers</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-slate-500">Active customer loads</p><p className="mt-1 text-3xl font-black text-primary">642</p><p className="mt-1 text-xs text-slate-500">Across 31 countries</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-slate-500">Monthly cargo spend</p><p className="mt-1 text-3xl font-black text-violet-500">EUR 3.8M</p><p className="mt-1 text-xs text-emerald-500">+12.7% this month</p></Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative min-w-64 max-w-md flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></div>
          <div className="flex flex-wrap gap-2">{(['All', 'Active', 'Pending', 'Restricted'] as const).map((option) => <button key={option} onClick={() => setStatus(option)} className={cn('rounded-xl px-3 py-2 text-xs font-bold', status === option ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>{option}</button>)}</div>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800"><th className="p-3">Customer</th><th className="p-3">Type</th><th className="p-3">Active loads</th><th className="p-3">Completed</th><th className="p-3">Monthly spend</th><th className="p-3">Joined</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{visible.map((customer) => <tr key={customer.id}><td className="p-3"><p className="font-bold text-slate-900 dark:text-white">{customer.name}</p><p className="text-xs text-slate-500">{customer.country} · {customer.email}</p></td><td className="p-3"><span className="rounded-full bg-sky-500/10 px-2 py-1 text-xs font-bold text-sky-600 dark:text-sky-400">{customer.kind}</span></td><td className="p-3 text-sm font-bold">{customer.activeLoads}</td><td className="p-3 text-sm">{customer.completedLoads}</td><td className="p-3 font-black dark:text-white">{customer.monthlySpend}</td><td className="p-3 text-sm text-slate-500">{customer.joined}</td><td className="p-3"><span className={cn('rounded-full px-2 py-1 text-xs font-bold', statusTone[customer.status])}>{customer.status}</span></td><td className="p-3"><div className="flex gap-2"><button onClick={() => setSelected(customer)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-primary dark:bg-slate-800"><Eye className="h-4 w-4" /></button><button onClick={onOpenEmailStudio} className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:text-primary dark:bg-slate-800"><Mail className="h-4 w-4" /></button></div></td></tr>)}</tbody>
          </table>
        </div>
      </Card>

      {selected && <Card><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-wider text-primary">Customer detail</p><h2 className="text-xl font-black dark:text-white">{selected.name}</h2><p className="text-sm text-slate-500">{selected.email} · {selected.country}</p></div><button onClick={() => setSelected(null)} className="text-xs font-bold text-slate-500">Close</button></div><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[[PackageCheck, 'Active loads', selected.activeLoads], [BadgeCheck, 'Completed loads', selected.completedLoads], [Users, 'Account type', selected.kind], [selected.status === 'Active' ? BadgeCheck : CircleAlert, 'Account status', selected.status]].map(([Icon, label, value]) => <div key={String(label)} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><Icon className="h-4 w-4 text-primary" /><p className="mt-2 text-xs text-slate-500">{String(label)}</p><p className="font-black dark:text-white">{String(value)}</p></div>)}</div></Card>}
    </div>
  );
};
