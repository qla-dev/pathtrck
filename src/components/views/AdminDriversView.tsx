import { useEffect, useState } from 'react';
import { UserRoundSearch } from 'lucide-react';
import { ApiError, api } from '../../services/api';
import { Language } from '../../types';
import { AdminField, AdminFormModal, adminFieldClass } from './AdminFormModal';
import { ApiRegistryView } from './ApiRegistryView';

const initial = { name: '', email: '', username: '', password: '', phone: '', country_code: 'BA', language: 'bs', primary_company_id: '', license_number: '', license_country_code: 'BA', license_expires_at: '', availability_status: 'available' };

export const AdminDriversView = ({ lang: _lang }: { lang: Language }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [companies, setCompanies] = useState<Record<string, unknown>[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const field = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (open && companies.length === 0) void api.companies.list({ per_page: 100 }).then((response) => setCompanies(response.data)).catch(() => setCompanies([]));
  }, [open, companies.length]);

  const save = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.users.createDriver(form);
      setOpen(false);
      setForm(initial);
      setRefreshToken((value) => value + 1);
    } catch (caught) {
      const validation = caught instanceof ApiError ? Object.values(caught.errors).flat()[0] : null;
      setError(validation || (caught instanceof Error ? caught.message : 'Driver could not be created.'));
    } finally {
      setSubmitting(false);
    }
  };

  return <>
    <ApiRegistryView eyebrow="Global workforce" title="All Drivers" description="Driver profiles and company relations loaded from Laravel." icon={UserRoundSearch} request={api.drivers.list} empty="No driver profiles in the database." actionLabel="Add driver" onAction={() => setOpen(true)} refreshToken={refreshToken} columns={[{ label: 'Driver', value: (row) => (row.user as { name?: string } | undefined)?.name }, { label: 'Company', value: (row) => (row.primary_company as { name?: string } | undefined)?.name }, { label: 'License', value: (row) => row.license_number }, { label: 'Country', value: (row) => row.license_country_code }, { label: 'Availability', value: (row) => row.availability_status }, { label: 'Trips', value: (row) => row.completed_trips }]} />
    <AdminFormModal open={open} title="Add driver" description="Create the driver login, professional profile and optional company membership together." submitting={submitting} error={error} onClose={() => { setOpen(false); setError(''); }} onSubmit={() => void save()}>
      <div className="sm:col-span-2"><p className="font-black text-slate-900 dark:text-white">Driver login</p></div>
      <AdminField label="Full name"><input required value={form.name} onChange={(event) => field('name', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Email"><input required type="email" value={form.email} onChange={(event) => field('email', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Username"><input required value={form.username} onChange={(event) => field('username', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Temporary password"><input required minLength={8} type="password" value={form.password} onChange={(event) => field('password', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Phone"><input value={form.phone} onChange={(event) => field('phone', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Account country"><input maxLength={2} value={form.country_code} onChange={(event) => field('country_code', event.target.value.toUpperCase())} className={adminFieldClass} /></AdminField>
      <AdminField label="Language"><input maxLength={5} value={form.language} onChange={(event) => field('language', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Company (optional)"><select value={form.primary_company_id} onChange={(event) => field('primary_company_id', event.target.value)} className={adminFieldClass}><option value="">Independent driver</option>{companies.map((company) => <option key={String(company.id)} value={String(company.id)}>{String(company.name)}</option>)}</select></AdminField>
      <div className="mt-2 border-t border-slate-200 pt-4 sm:col-span-2 dark:border-slate-800"><p className="font-black text-slate-900 dark:text-white">License &amp; availability</p></div>
      <AdminField label="License number"><input required value={form.license_number} onChange={(event) => field('license_number', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="License country"><input required maxLength={2} value={form.license_country_code} onChange={(event) => field('license_country_code', event.target.value.toUpperCase())} className={adminFieldClass} /></AdminField>
      <AdminField label="License expires"><input required type="date" value={form.license_expires_at} onChange={(event) => field('license_expires_at', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label="Availability"><select value={form.availability_status} onChange={(event) => field('availability_status', event.target.value)} className={adminFieldClass}><option value="available">Available</option><option value="on_load">On load</option><option value="off_duty">Off duty</option><option value="unavailable">Unavailable</option></select></AdminField>
    </AdminFormModal>
  </>;
};
