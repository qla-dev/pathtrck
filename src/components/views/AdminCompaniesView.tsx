import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { ApiError, api } from '../../services/api';
import { Language } from '../../types';
import { AdminField, AdminFormModal, adminFieldClass } from './AdminFormModal';
import { ApiRegistryView } from './ApiRegistryView';

const initial = { company_name: '', company_email: '', company_phone: '', country_code: 'BA', city: '', address: '', tax_number: '', registration_number: '', plan: 'starter', status: 'pending', owner_name: '', owner_email: '', owner_username: '', owner_password: '', owner_phone: '' };

export const AdminCompaniesView = ({ lang: _lang, onOpenEmailStudio }: { lang: Language; onOpenEmailStudio?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const field = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => { setSubmitting(true); setError(''); try { await api.companies.onboard(form); setOpen(false); setForm(initial); setRefreshToken((value) => value + 1); } catch (caught) { const validation = caught instanceof ApiError ? Object.values(caught.errors).flat()[0] : null; setError(validation || (caught instanceof Error ? caught.message : 'Company could not be created.')); } finally { setSubmitting(false); } };
  return <>
    <ApiRegistryView eyebrow="Superadmin registry" title="Logistics Companies" description="Company records and relations loaded from Laravel." icon={Building2} request={api.companies.list} empty="No companies in the database." onEmail={onOpenEmailStudio} actionLabel="Add company" onAction={() => setOpen(true)} refreshToken={refreshToken} columns={[{ label: 'Company', value: (row) => row.name }, { label: 'Email', value: (row) => row.email }, { label: 'Country', value: (row) => row.country_code }, { label: 'Fleet', value: (row) => Array.isArray(row.vehicles) ? row.vehicles.length : 0 }, { label: 'Plan', value: (row) => row.plan }, { label: 'Status', value: (row) => row.status }]} />
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
