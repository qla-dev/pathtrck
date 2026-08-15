import { useState } from 'react';
import { UserRound } from 'lucide-react';
import { ApiError, api } from '../../services/api';
import { Language } from '../../types';
import { AdminField, AdminFormModal, adminFieldClass } from './AdminFormModal';
import { ApiRegistryView } from './ApiRegistryView';

const customer = (row: Record<string, unknown>) => (row.role as { name?: string } | undefined)?.name === 'user';
const initial = { name: '', email: '', username: '', password: '', phone: '', country_code: 'BA', language: 'bs' };

export const AdminCustomersView = ({ lang: _lang, onOpenEmailStudio }: { lang: Language; onOpenEmailStudio?: () => void }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const field = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => { setSubmitting(true); setError(''); try { await api.users.createCustomer(form); setOpen(false); setForm(initial); setRefreshToken((value) => value + 1); } catch (caught) { const validation = caught instanceof ApiError ? Object.values(caught.errors).flat()[0] : null; setError(validation || (caught instanceof Error ? caught.message : 'Customer could not be created.')); } finally { setSubmitting(false); } };
  return <>
    <ApiRegistryView eyebrow="Superadmin registry" title="All Customers" description="Customer accounts loaded from Laravel." icon={UserRound} request={api.users.list} filter={customer} empty="No customer accounts in the database." onEmail={onOpenEmailStudio} actionLabel="Add customer" onAction={() => setOpen(true)} refreshToken={refreshToken} columns={[{ label: 'Customer', value: (row) => row.name }, { label: 'Username', value: (row) => row.username }, { label: 'Email', value: (row) => row.email }, { label: 'Country', value: (row) => row.country_code }, { label: 'Status', value: (row) => row.is_active ? 'Active' : 'Inactive' }]} />
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
