import { useEffect, useState } from 'react';
import { Handshake, RefreshCw } from 'lucide-react';

import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Label, TextField } from '../modals/AddWarehouseModal/fields';
import type { Row } from './accounting/shared';

/** SmartFreight CRM offers/orders -> PANTHEON tHE_Order (CrmPantheonPush). Dry run first; writing also needs the connector write switch. */
export function CrmPushSettings({ company, t, fail }: { company: number; t: (k: string) => string; fail: (e: unknown) => void }) {
  const [form, setForm] = useState<Row>({ crm_push_enabled: false, crm_push_doc_type: '', crm_push_from: '' });
  const [result, setResult] = useState<Row | null>(null); const [busy, setBusy] = useState(false); const [ready, setReady] = useState(false);
  useEffect(() => {
    api.accounting.get<Row | null>(company, 'crm/pantheon/settings').then(r => { if (r.data) { setReady(true); setForm({ crm_push_enabled: !!r.data.crm_push_enabled, crm_push_doc_type: r.data.crm_push_doc_type ?? '', crm_push_from: r.data.crm_push_from ?? '' }); } }).catch(() => undefined);
  }, [company]);
  const run = async (fn: () => Promise<void>) => { if (busy) return; setBusy(true); try { await fn(); } catch (e) { fail(e); } finally { setBusy(false); } };
  const push = (write: boolean) => run(async () => setResult((await api.accounting.send<Row>(company, 'crm/pantheon/push', { write })).data));
  if (!ready) return null;
  return <Card className="shadow-none" contentClassName="space-y-3 p-4">
    <h3 className="flex items-center gap-2 font-black"><Handshake className="h-4 w-4" />{t('crm_push_title')}</h3>
    <p className="text-sm text-slate-500">{t('crm_push_note')}</p>
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="block"><Label>{t('crm_push_doc_type')}</Label><TextField value={form.crm_push_doc_type} maxLength={4} placeholder="0110" onChange={e => setForm({ ...form, crm_push_doc_type: e.target.value.toUpperCase() })} /></label>
      <label className="block"><Label>{t('crm_push_from')}</Label><TextField type="date" value={form.crm_push_from} onChange={e => setForm({ ...form, crm_push_from: e.target.value })} /></label>
      <label className="flex items-end gap-2 pb-2 text-sm font-semibold"><input type="checkbox" checked={form.crm_push_enabled} onChange={e => setForm({ ...form, crm_push_enabled: e.target.checked })} />{t('crm_push_enabled')}</label>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={busy} onClick={() => void run(async () => { await api.accounting.send<Row>(company, 'crm/pantheon/settings', { ...form, crm_push_doc_type: form.crm_push_doc_type || null, crm_push_from: form.crm_push_from || null }); })}>{t('save')}</Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void push(false)}>{t('preview')}</Button>
      <Button size="sm" variant="outline" className="gap-1.5" disabled={busy || !form.crm_push_enabled} onClick={() => void push(true)}><RefreshCw className="h-3.5 w-3.5" />{t('ops_sync_now')}</Button>
    </div>
    {result && <div className="space-y-1 text-sm">
      <p>{t('ops_pushed')}: {result.pushed.length + result.relinked.length} · {t('pantheon_updated')}: {result.updated.length} · {t('crm_push_locked')}: {result.locked.length}</p>
      {result.waiting.slice(0, 20).map((w: Row) => <p key={w.id} className="text-xs text-amber-700 dark:text-amber-400">{w.title ?? w.id}: {(w.problems ?? []).map((p: string) => t(`crm_problem_${p.split(':')[0]}`) + (p.includes(':') ? p.slice(p.indexOf(':')) : '')).join(' · ')}</p>)}
    </div>}
  </Card>;
}
