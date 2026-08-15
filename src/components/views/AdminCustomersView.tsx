import { useMemo, useState } from 'react';
import { Eye, Mail, Search, UserRound } from 'lucide-react';
import { ApiError, api } from '../../services/api';
import { Language } from '../../types';
import { AdminField, AdminFormModal, adminFieldClass } from './AdminFormModal';
import { useApiList } from '../../hooks/useApiList';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

const customer = (row: Record<string, unknown>) => (row.role as { name?: string } | undefined)?.name === 'user';
const initial = { name: '', email: '', username: '', password: '', phone: '', country_code: 'BA', language: 'bs' };

export const AdminCustomersView = ({ lang: _lang, onOpenEmailStudio }: { lang: Language; onOpenEmailStudio?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const users = useApiList(api.users.list, { per_page: 100 });
  const customers = useMemo(() => users.items.filter(customer), [users.items]);
  const visible = useMemo(() => customers.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase())), [customers, query]);
  const field = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => { setSubmitting(true); setError(''); try { await api.users.createCustomer(form); await users.refresh(); setOpen(false); setForm(initial); } catch (caught) { const validation = caught instanceof ApiError ? Object.values(caught.errors).flat()[0] : null; setError(validation || (caught instanceof Error ? caught.message : 'Customer could not be created.')); } finally { setSubmitting(false); } };
  return <>
    <div className="space-y-6"><section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500"><UserRound className="h-6 w-6" /></div><div><p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Superadmin registry</p><h1 className="text-2xl font-black dark:text-white">All Customers</h1></div></div><div className="flex gap-2"><Button variant="outline" onClick={onOpenEmailStudio}><Mail className="mr-2 h-4 w-4" />Email</Button><Button onClick={() => setOpen(true)}>Add customer</Button></div></div><p className="mt-4 text-sm text-slate-500">Manage customer accounts, access, load activity and contact information.</p></section>
      <div className="grid gap-4 sm:grid-cols-3"><Card className="p-4"><p className="text-xs uppercase text-slate-500">Total customers</p><p className="mt-1 text-3xl font-black dark:text-white">{customers.length}</p></Card><Card className="p-4"><p className="text-xs uppercase text-slate-500">Active accounts</p><p className="mt-1 text-3xl font-black text-emerald-500">{customers.filter((row) => row.is_active).length}</p></Card><Card className="p-4"><p className="text-xs uppercase text-slate-500">Countries</p><p className="mt-1 text-3xl font-black text-violet-500">{new Set(customers.map((row) => row.country_code).filter(Boolean)).size}</p></Card></div>
      <Card><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800"><th className="p-3">Customer</th><th className="p-3">Username</th><th className="p-3">Country</th><th className="p-3">Joined</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead><tbody>{visible.map((row) => <tr key={String(row.id)} className="border-b border-slate-100 dark:border-slate-800"><td className="p-3"><p className="font-bold dark:text-white">{String(row.name)}</p><p className="text-xs text-slate-500">{String(row.email)}</p></td><td className="p-3">{String(row.username)}</td><td className="p-3">{String(row.country_code || '—')}</td><td className="p-3 text-sm text-slate-500">{String(row.created_at || '').slice(0, 10)}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${row.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>{row.is_active ? 'Active' : 'Inactive'}</span></td><td className="p-3"><button onClick={() => setSelected(row)} className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800"><Eye className="h-4 w-4" /></button></td></tr>)}</tbody></table></div></Card>
      {selected && <Card><div className="flex justify-between"><div><p className="text-xs font-black uppercase text-primary">Customer detail</p><h2 className="text-xl font-black dark:text-white">{String(selected.name)}</h2><p className="text-sm text-slate-500">{String(selected.email)} · {String(selected.phone || '—')}</p></div><button onClick={() => setSelected(null)} className="text-sm font-bold text-slate-500">Close</button></div></Card>}
    </div>
    <AdminFormModal open={open} title="Add customer" description="Create a customer login manually." submitting={submitting} error={error} onClose={() => { setOpen(false); setError(''); }} onSubmit={() => void save()}>
      <AdminField label="Full name"><input required value={form.name} onChange={(event) => field('name', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Email"><input required type="email" value={form.email} onChange={(event) => field('email', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Username"><input required value={form.username} onChange={(event) => field('username', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Temporary password"><input required minLength={8} type="password" value={form.password} onChange={(event) => field('password', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Phone"><input value={form.phone} onChange={(event) => field('phone', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Country code"><input required maxLength={2} value={form.country_code} onChange={(event) => field('country_code', event.target.value.toUpperCase())} className={adminFieldClass} /></AdminField>
      <AdminField label="Language"><input maxLength={5} value={form.language} onChange={(event) => field('language', event.target.value)} className={adminFieldClass} /></AdminField>
    </AdminFormModal>
  </>;
};
