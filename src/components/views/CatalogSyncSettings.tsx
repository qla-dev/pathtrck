import { useEffect, useState } from 'react';
import { Package, RefreshCw } from 'lucide-react';

import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Label, TextField } from '../modals/AddWarehouseModal/fields';
import type { Row } from './accounting/shared';

/** Catalogue <-> PANTHEON tHE_SetItem (PantheonCatalogSync): which item sets are pulled, and where new products are pushed. */
export function CatalogSyncSettings({ company, t, fail }: { company: number; t: (k: string) => string; fail: (e: unknown) => void }) {
  const [form, setForm] = useState<Row>({ catalog_item_sets: 'USL,OPR', catalog_push_enabled: false, catalog_push_item_set: '' });
  const [ready, setReady] = useState(false); const [busy, setBusy] = useState(false); const [result, setResult] = useState<Row | null>(null); const [last, setLast] = useState('');
  useEffect(() => {
    api.accounting.get<Row | null>(company, 'catalog/pantheon/settings').then(r => { if (!r.data) return; setReady(true); setLast(String(r.data.last_catalog_sync_at ?? ''));
      setForm({ catalog_item_sets: r.data.catalog_item_sets ?? '', catalog_push_enabled: !!r.data.catalog_push_enabled, catalog_push_item_set: r.data.catalog_push_item_set ?? '' }); }).catch(() => undefined);
  }, [company]);
  const run = async (fn: () => Promise<void>) => { if (busy) return; setBusy(true); try { await fn(); } catch (e) { fail(e); } finally { setBusy(false); } };
  const sync = (write: boolean) => run(async () => setResult((await api.accounting.send<Row>(company, 'catalog/pantheon/sync', { write })).data));
  if (!ready) return null;
  return <Card className="shadow-none" contentClassName="space-y-3 p-4">
    <h3 className="flex items-center gap-2 font-black"><Package className="h-4 w-4" />{t('catalog_sync_title')}</h3>
    <p className="text-sm text-slate-500">{t('catalog_sync_note')}{last ? ` · ${t('crm_last_sync')}: ${last.slice(0, 16).replace('T', ' ')}` : ''}</p>
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="block"><Label>{t('catalog_item_sets')}</Label><TextField value={form.catalog_item_sets} placeholder="USL,OPR" onChange={e => setForm({ ...form, catalog_item_sets: e.target.value.toUpperCase().replace(/\s/g, '') })} /></label>
      <label className="block"><Label>{t('catalog_push_item_set')}</Label><TextField value={form.catalog_push_item_set} maxLength={3} placeholder="USL" onChange={e => setForm({ ...form, catalog_push_item_set: e.target.value.toUpperCase() })} /></label>
      <label className="flex items-end gap-2 pb-2 text-sm font-semibold"><input type="checkbox" checked={form.catalog_push_enabled} onChange={e => setForm({ ...form, catalog_push_enabled: e.target.checked })} />{t('catalog_push_enabled')}</label>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={busy} onClick={() => void run(async () => { await api.accounting.send<Row>(company, 'catalog/pantheon/settings', { ...form, catalog_item_sets: form.catalog_item_sets || null, catalog_push_item_set: form.catalog_push_item_set || null }); })}>{t('save')}</Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void sync(false)}>{t('preview')}</Button>
      <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => void sync(true)}><RefreshCw className="h-3.5 w-3.5" />{t('ops_sync_now')}</Button>
    </div>
    {result && <div className="space-y-1 text-sm">
      <p>{t('catalog_pulled')}: {result.pulled} (+{result.created}) · {t('ops_pushed')}: {result.pushed.length} · {t('pantheon_linked')}: {result.linked.length}</p>
      {result.waiting.slice(0, 20).map((w: Row) => <p key={w.code} className="text-xs text-amber-700 dark:text-amber-400">{w.code}: {(w.problems ?? []).map((p: string) => t(`crm_problem_${p}`)).join(' · ')}</p>)}
    </div>}
  </Card>;
}
