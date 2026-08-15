import { useMemo, useState } from 'react';
import { Building2, Eye, Mail, Search } from 'lucide-react';
import { ApiError, api } from '../../services/api';
import { Language } from '../../types';
import { AdminField, AdminFormModal, adminFieldClass } from './AdminFormModal';
import { useApiList } from '../../hooks/useApiList';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { confirmAction, showSuccess } from '../../lib/swal';

const initial = { company_name: '', company_email: '', company_phone: '', country_code: 'BA', city: '', address: '', tax_number: '', registration_number: '', plan: 'starter', status: 'pending', owner_name: '', owner_email: '', owner_username: '', owner_password: '', owner_phone: '' };

export const AdminCompaniesView = ({ lang: _lang, onOpenEmailStudio }: { lang: Language; onOpenEmailStudio?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const companies = useApiList(api.companies.list, { per_page: 100 });
  const visible = useMemo(() => companies.items.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase())), [companies.items, query]);
  const field = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    const confirmed = await confirmAction({ title: 'Create this company?', text: `The company and owner login for ${form.company_name || form.owner_email} will be created together.`, confirmText: 'Create company' });
    if (!confirmed) return;
    setSubmitting(true);
    setError('');
    try {
      await api.companies.onboard(form);
      await companies.refresh();
      setOpen(false);
      setForm(initial);
      void showSuccess('Company created', 'The company and owner account are ready.');
    } catch (caught) {
      const validation = caught instanceof ApiError ? Object.values(caught.errors).flat()[0] : null;
      setError(validation || (caught instanceof Error ? caught.message : 'Company could not be created.'));
    } finally {
      setSubmitting(false);
    }
  };
  return <>
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500"><Building2 className="h-6 w-6" /></div><div><p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Superadmin registry</p><h1 className="text-2xl font-black dark:text-white">Logistics Companies</h1></div></div><div className="flex gap-2"><Button variant="outline" onClick={onOpenEmailStudio}><Mail className="mr-2 h-4 w-4" />Email</Button><Button onClick={() => setOpen(true)}>Add company</Button></div></div><p className="mt-4 text-sm text-slate-500">Inspect every logistics company, owner, subscription, fleet and verification state.</p></section>
      <div className="grid gap-4 sm:grid-cols-3"><Card className="p-4"><p className="text-xs uppercase text-slate-500">Total companies</p><p className="mt-1 text-3xl font-black dark:text-white">{companies.total}</p></Card><Card className="p-4"><p className="text-xs uppercase text-slate-500">Pending verification</p><p className="mt-1 text-3xl font-black text-amber-500">{companies.items.filter((row) => row.status === 'pending').length}</p></Card><Card className="p-4"><p className="text-xs uppercase text-slate-500">Enterprise accounts</p><p className="mt-1 text-3xl font-black text-violet-500">{companies.items.filter((row) => row.plan === 'enterprise').length}</p></Card></div>
      <Card><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search companies..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-left"><thead><tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800"><th className="p-3">Company</th><th className="p-3">Owner</th><th className="p-3">Plan</th><th className="p-3">Fleet</th><th className="p-3">Members</th><th className="p-3">Status</th><th className="p-3"></th></tr></thead><tbody>{visible.map((row) => <tr key={String(row.id)} className="border-b border-slate-100 dark:border-slate-800"><td className="p-3"><p className="font-bold dark:text-white">{String(row.name)}</p><p className="text-xs text-slate-500">{String(row.country_code || '—')} · {String(row.email || '—')}</p></td><td className="p-3 text-sm">{String(((row.owner || {}) as Record<string, unknown>).name || '—')}</td><td className="p-3 font-bold text-violet-500">{String(row.plan || '—')}</td><td className="p-3">{Array.isArray(row.vehicles) ? row.vehicles.length : 0}</td><td className="p-3">{Array.isArray(row.users) ? row.users.length : 0}</td><td className="p-3"><span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">{String(row.status || '—')}</span></td><td className="p-3"><button onClick={() => setSelected(row)} className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800"><Eye className="h-4 w-4" /></button></td></tr>)}</tbody></table></div></Card>
      {selected && <Card><div className="flex justify-between"><div><p className="text-xs font-black uppercase text-primary">Company detail</p><h2 className="text-xl font-black dark:text-white">{String(selected.name)}</h2><p className="text-sm text-slate-500">{String(selected.address || '')} {String(selected.city || '')}</p></div><button onClick={() => setSelected(null)} className="text-sm font-bold text-slate-500">Close</button></div></Card>}
    </div>
    <AdminFormModal open={open} title="Add logistics company" description="Create the company, owner login and active admin membership together." submitting={submitting} error={error} onClose={() => { setOpen(false); setError(''); }} onSubmit={() => void save()}>
      <div className="sm:col-span-2"><p className="font-black text-slate-900 dark:text-white">Company information</p></div>
      <AdminField label="Company name"><input required value={form.company_name} onChange={(event) => field('company_name', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Company email"><input type="email" value={form.company_email} onChange={(event) => field('company_email', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Company phone"><input value={form.company_phone} onChange={(event) => field('company_phone', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Country code"><input required maxLength={2} value={form.country_code} onChange={(event) => field('country_code', event.target.value.toUpperCase())} className={adminFieldClass} /></AdminField>
      <AdminField label="City"><input value={form.city} onChange={(event) => field('city', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Address"><input value={form.address} onChange={(event) => field('address', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Tax number"><input value={form.tax_number} onChange={(event) => field('tax_number', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Registration number"><input value={form.registration_number} onChange={(event) => field('registration_number', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Plan"><select value={form.plan} onChange={(event) => field('plan', event.target.value)} className={adminFieldClass}><option value="starter">Starter</option><option value="growth">Growth</option><option value="enterprise">Enterprise</option></select></AdminField>
      <AdminField label="Status"><select value={form.status} onChange={(event) => field('status', event.target.value)} className={adminFieldClass}><option value="pending">Pending</option><option value="verified">Verified</option><option value="suspended">Suspended</option></select></AdminField>
      <div className="mt-2 border-t border-slate-200 pt-4 sm:col-span-2 dark:border-slate-800"><p className="font-black text-slate-900 dark:text-white">Company owner login</p></div>
      <AdminField label="Owner name"><input required value={form.owner_name} onChange={(event) => field('owner_name', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Owner email"><input required type="email" value={form.owner_email} onChange={(event) => field('owner_email', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Owner username"><input required value={form.owner_username} onChange={(event) => field('owner_username', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Temporary password"><input required minLength={8} type="password" value={form.owner_password} onChange={(event) => field('owner_password', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Owner phone"><input value={form.owner_phone} onChange={(event) => field('owner_phone', event.target.value)} className={adminFieldClass} /></AdminField>
    </AdminFormModal>
  </>;
};
