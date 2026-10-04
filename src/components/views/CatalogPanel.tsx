import { useCallback, useEffect, useState } from 'react';
import { Package, Plus } from 'lucide-react';

import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Dialog } from '../ui/Dialog';
import { IconSelect } from '../ui/IconSelect';
import { Notice } from '../ui/Notice';
import { RecordTable } from '../ui/RecordTable';
import { StatusBadge } from '../ui/StatusBadge';
import { Label, TextField } from '../modals/AddWarehouseModal/fields';
import { money, type Row } from './accounting/shared';

/*
 * Products and services ("Prevoz", "Carinjenje", …): one catalogue for CRM offers, service templates and POS.
 * Articles from PANTHEON (item sets chosen in Integracije, with stock over all warehouses) are edited in
 * PANTHEON; here they can only be switched off. Products created here are pushed by the catalogue sync.
 */
export function CatalogPanel({ company, t, canEdit }: { company: number; t: (k: string) => string; canEdit: boolean }) {
  const [rows, setRows] = useState<Row[]>([]); const [search, setSearch] = useState(''); const [edit, setEdit] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const load = useCallback(() => api.accounting.get<Row>(company, `catalog?limit=200&all=1${search ? `&search=${encodeURIComponent(search)}` : ''}`).then(r => setRows(r.data.products ?? [])).catch(e => setError(e instanceof Error ? e.message : String(e))), [company, search]);
  useEffect(() => { const h = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(h); }, [load]);
  const save = async () => {
    if (!edit || busy) return; setBusy(true); setError('');
    try { await api.accounting.send<Row>(company, 'catalog', { ...edit, sale_price: edit.sale_price === '' ? null : edit.sale_price, vat_percent: edit.vat_percent === '' ? null : edit.vat_percent }); setEdit(null); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  const fromPantheon = edit?.source === 'pantheon';
  return <div className="space-y-3">
    <Card className="shadow-none" contentClassName="flex flex-wrap items-end justify-between gap-3 p-3">
      <label className="block w-72"><Label>{t('catalog_search')}</Label><TextField value={search} onChange={e => setSearch(e.target.value)} /></label>
      {canEdit && <Button size="sm" className="gap-1.5" onClick={() => setEdit({ kind: 'service', unit: 'KOM', currency: 'BAM', vat_percent: '17', vat_code: '', active: true })}><Plus className="h-4 w-4" />{t('catalog_new')}</Button>}
    </Card>
    <p className="text-xs text-slate-500">{t('catalog_note')}</p>
    {error && !edit && <Notice tone="bad">{error}</Notice>}
    <Card className="shadow-none" contentClassName="p-0"><RecordTable minWidth="min-w-[900px]" empty={t('catalog_empty')} rows={rows} onRowClick={canEdit ? r => setEdit({ ...r, sale_price: r.sale_price ?? '', vat_percent: r.vat_percent ?? '', vat_code: r.vat_code ?? '', active: !!r.active }) : undefined} columns={[
      { key: 'code', header: t('code'), render: r => <span className="font-mono text-xs">{r.code}</span> }, { key: 'name', header: t('name'), render: r => <span className="font-semibold">{r.name}</span> },
      { key: 'kind', header: t('ops_line_type'), render: r => t(`catalog_kind_${r.kind}`) }, { key: 'unit', header: t('ops_unit') },
      { key: 'sale_price', header: t('unit_price'), align: 'right', render: r => r.sale_price === null ? '—' : money(r.sale_price, r.currency) },
      { key: 'vat', header: t('crm_vat'), render: r => `${r.vat_percent === null ? '—' : `${Number(r.vat_percent)}%`}${r.vat_code ? ` · ${r.vat_code}` : ''}` },
      { key: 'stock', header: t('catalog_stock'), align: 'right', render: r => r.stock === null ? '—' : Number(r.stock) },
      { key: 'source', header: t('status'), render: r => <span className="flex flex-wrap gap-1"><StatusBadge tone={r.source === 'pantheon' ? 'info' : 'muted'}>{r.source === 'pantheon' ? 'PANTHEON' : 'SmartFreight'}</StatusBadge>{!r.active && <StatusBadge tone="muted">{t('ops_inactive')}</StatusBadge>}</span> },
    ]} /></Card>

    {edit && <Dialog title={t(edit.id ? 'catalog_edit' : 'catalog_new')} icon={Package} onClose={() => setEdit(null)} closeLabel={t('close')} closeDisabled={busy}
      footer={<Button disabled={busy || (!fromPantheon && (!edit.code || !edit.name))} onClick={() => void save()}>{t('save')}</Button>}>
      {error && <Notice tone="bad" className="mb-3">{error}</Notice>}
      {fromPantheon && <Notice tone="info" className="mb-3">{t('catalog_pantheon_owned')}</Notice>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><Label required>{t('code')}</Label><TextField value={edit.code ?? ''} maxLength={16} disabled={fromPantheon} onChange={e => setEdit({ ...edit, code: e.target.value.toUpperCase() })} /></label>
        <label className="block"><Label required>{t('name')}</Label><TextField value={edit.name ?? ''} maxLength={80} disabled={fromPantheon} onChange={e => setEdit({ ...edit, name: e.target.value })} /></label>
        <label className="block"><Label>{t('ops_line_type')}</Label><IconSelect value={edit.kind ?? 'service'} disabled={fromPantheon} onChange={v => setEdit({ ...edit, kind: v })} icon={Package} ariaLabel={t('ops_line_type')} placeholder="—"
          options={['service', 'product'].map(k => ({ value: k, label: t(`catalog_kind_${k}`), icon: Package }))} /></label>
        <label className="block"><Label>{t('ops_unit')}</Label><TextField value={edit.unit ?? ''} maxLength={3} disabled={fromPantheon} onChange={e => setEdit({ ...edit, unit: e.target.value.toUpperCase() })} /></label>
        <label className="block"><Label>{t('unit_price')}</Label><TextField type="number" min="0" step="0.01" value={edit.sale_price ?? ''} disabled={fromPantheon} onChange={e => setEdit({ ...edit, sale_price: e.target.value })} /></label>
        <label className="block"><Label>{t('currency')}</Label><TextField value={edit.currency ?? 'BAM'} maxLength={3} disabled={fromPantheon} onChange={e => setEdit({ ...edit, currency: e.target.value.toUpperCase() })} /></label>
        <label className="block"><Label>{t('tax_rate')}</Label><TextField type="number" min="0" max="100" value={edit.vat_percent ?? ''} disabled={fromPantheon} onChange={e => setEdit({ ...edit, vat_percent: e.target.value })} /></label>
        <label className="block"><Label>{t('crm_vat_code')}</Label><TextField value={edit.vat_code ?? ''} maxLength={2} placeholder="P1" disabled={fromPantheon} onChange={e => setEdit({ ...edit, vat_code: e.target.value.toUpperCase() })} /></label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={!!edit.active} onChange={e => setEdit({ ...edit, active: e.target.checked })} />{t('ops_active')}</label>
    </Dialog>}
  </div>;
}
