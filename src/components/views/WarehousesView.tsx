import { useMemo, useState } from 'react';
import { Boxes, MapPin, Plus, Search, Warehouse as WarehouseIcon } from 'lucide-react';

import { ApiError, api } from '../../services/api';
import { Language, Role } from '../../types';
import { ui } from '../../i18n';
import { useApiList } from '../../hooks/useApiList';
import { AdminField, AdminFormModal, adminFieldClass } from './AdminFormModal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { showSuccess } from '../../lib/swal';

const emptyForm = { name: '', address: '', city: '', country_code: 'BA', total_capacity_pallets: '', storage_types: '' };

// The warehouse directory every non-warehouse role reaches from the sidebar. Warehouse-role users
// get their own facility dashboard instead (WarehouseOverviewView), so this stays a browse +
// create surface rather than an operations screen.
export const WarehousesView = ({ lang, role }: { lang: Language; role: Role }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const warehouses = useApiList(api.warehouses.list, { per_page: 100 });
  // POST /warehouses is gated to warehouse/superadmin/master on the backend, so the button only
  // appears where it can actually succeed.
  const canCreate = role === 'superadmin' || role === 'master' || role === 'warehouse';
  const field = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const visible = useMemo(
    () => warehouses.items.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase())),
    [warehouses.items, query],
  );
  const totalCapacity = warehouses.items.reduce((sum, row) => sum + Number(row.total_capacity_pallets || 0), 0);
  const countries = new Set(warehouses.items.map((row) => String(row.country_code || '')).filter(Boolean));

  const save = async () => {
    setSubmitting(true);
    setError('');
    try {
      await api.warehouses.create({
        name: form.name,
        address: form.address || null,
        city: form.city || null,
        country_code: form.country_code || null,
        total_capacity_pallets: form.total_capacity_pallets === '' ? 0 : Number(form.total_capacity_pallets),
        storage_types: form.storage_types ? form.storage_types.split(',').map((value) => value.trim()).filter(Boolean) : null,
      });
      await warehouses.refresh();
      setOpen(false);
      setForm(emptyForm);
      void showSuccess(u('warehouses.created', 'Warehouse created'), u('warehouses.createdText', 'The facility is now listed.'));
    } catch (caught) {
      const validation = caught instanceof ApiError ? Object.values(caught.errors).flat()[0] : null;
      setError(validation || (caught instanceof Error ? caught.message : 'Warehouse could not be created.'));
    } finally {
      setSubmitting(false);
    }
  };

  return <>
    <div className="space-y-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><WarehouseIcon className="h-5 w-5" /></div>
          <div>
            <h1 className="text-lg font-black leading-tight dark:text-white">{u('nav.warehouse', 'Warehouse')}</h1>
            <p className="text-xs text-slate-500">{u('warehouses.subtitle', 'Browse storage facilities, capacity and coverage.')}</p>
          </div>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />{u('warehouses.create', 'Create Warehouse')}
          </Button>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="shadow-none" contentClassName="flex items-center justify-between gap-3 px-4 py-3">
          <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{u('warehouses.total', 'Warehouses')}</p><p className="mt-0.5 text-xl font-black dark:text-white">{warehouses.total}</p></div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-500"><WarehouseIcon className="h-4 w-4" /></div>
        </Card>
        <Card className="shadow-none" contentClassName="flex items-center justify-between gap-3 px-4 py-3">
          <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{u('warehouses.capacity', 'Total capacity')}</p><p className="mt-0.5 text-xl font-black text-sky-500">{totalCapacity.toLocaleString()} pal.</p></div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500"><Boxes className="h-4 w-4" /></div>
        </Card>
        <Card className="shadow-none" contentClassName="flex items-center justify-between gap-3 px-4 py-3">
          <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{u('warehouses.countries', 'Countries')}</p><p className="mt-0.5 text-xl font-black text-emerald-500">{countries.size}</p></div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500"><MapPin className="h-4 w-4" /></div>
        </Card>
      </div>

      <Card className="shadow-none" contentClassName="p-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={u('warehouses.search', 'Search warehouses...')} className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-800">
                <th className="py-2 pr-3">{u('warehouses.colName', 'Warehouse')}</th>
                <th className="py-2 pr-3">{u('warehouses.colLocation', 'Location')}</th>
                <th className="py-2 pr-3">{u('warehouses.colCapacity', 'Capacity')}</th>
                <th className="py-2 pr-3">{u('warehouses.colStorageTypes', 'Storage types')}</th>
                <th className="py-2">{u('warehouses.colStatus', 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.loading && <tr><td colSpan={5} className="py-6 text-center text-slate-500">{u('common.loading', 'Loading...')}</td></tr>}
              {!warehouses.loading && visible.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-500">{u('warehouses.empty', 'No warehouses found.')}</td></tr>}
              {visible.map((row) => (
                <tr key={String(row.id)} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-3 font-semibold text-slate-800 dark:text-white">{String(row.name || '—')}</td>
                  <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">{[row.city, row.country_code].filter(Boolean).map(String).join(', ') || '—'}</td>
                  <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">{Number(row.total_capacity_pallets || 0).toLocaleString()} pal.</td>
                  <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">{Array.isArray(row.storage_types) ? (row.storage_types as unknown[]).join(', ') : '—'}</td>
                  <td className="py-2"><span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">{String(row.status || 'active')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>

    <AdminFormModal
      open={open}
      title={u('warehouses.create', 'Create Warehouse')}
      description={u('warehouses.createDescription', 'Add a storage facility to the network.')}
      submitting={submitting}
      error={error}
      onClose={() => { setOpen(false); setError(''); }}
      onSubmit={() => void save()}
    >
      <AdminField label={u('warehouses.colName', 'Warehouse')}><input required value={form.name} onChange={(event) => field('name', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label={u('warehouses.address', 'Address')}><input value={form.address} onChange={(event) => field('address', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label={u('warehouses.city', 'City')}><input value={form.city} onChange={(event) => field('city', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label={u('warehouses.countryCode', 'Country code')}><input maxLength={2} value={form.country_code} onChange={(event) => field('country_code', event.target.value.toUpperCase())} className={adminFieldClass} /></AdminField>
      <AdminField label={u('warehouses.capacityPallets', 'Total capacity (pallets)')}><input type="number" min={0} value={form.total_capacity_pallets} onChange={(event) => field('total_capacity_pallets', event.target.value)} className={adminFieldClass} /></AdminField>
      <AdminField label={u('warehouses.storageTypes', 'Storage types (comma separated)')}><input value={form.storage_types} onChange={(event) => field('storage_types', event.target.value)} placeholder="Ambient, Chilled, Frozen" className={adminFieldClass} /></AdminField>
    </AdminFormModal>
  </>;
};
