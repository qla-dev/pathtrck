import { useEffect, useState } from 'react';
import { ClipboardList, PlugZap, RefreshCw } from 'lucide-react';

import type { Language } from '../../types';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { InlineDataState } from '../ui/InlineDataState';
import { Notice } from '../ui/Notice';
import { StatusBadge } from '../ui/StatusBadge';
import { Label, TextField } from '../modals/AddWarehouseModal/fields';
import { type Row, useAccounting } from './accounting/shared';
import { CrmPushSettings } from './CrmPushSettings';
import { PantheonPanel } from './PantheonPanel';

/*
 * Company details -> Integracije. SmartFreight works on its own; PANTHEON is only a connector.
 * Agent note: every module keeps its data locally and a sync pushes/pulls PANTHEON (accounting
 * postings, CRM pull, work orders). Never add a UI action that writes PANTHEON directly.
 */
export function CompanyIntegrations({ lang }: { lang: Language }) {
  const acc = useAccounting(lang);
  const { t, company, context, loading, can, error } = acc;
  if (loading) return <Card className="shadow-none" contentClassName="p-0"><InlineDataState loading empty="" /></Card>;
  if (!company) return <Notice tone="warn">{t('noCompany')}</Notice>;
  if (!can('integrations')) return <Notice tone="warn">{t('integrations_no_access')}</Notice>;
  return <div className="space-y-3">
    <Card className="shadow-none" contentClassName="flex items-start gap-3 p-4">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><PlugZap className="h-4 w-4" /></span>
      <div><h2 className="font-black">{t('integrations_title')}</h2><p className="text-sm text-slate-500">{t('integrations_intro')}</p>{context?.company?.name && <p className="mt-1 text-xs text-slate-400">{context.company.name}</p>}</div>
    </Card>
    {error && <Notice tone="bad">{error}</Notice>}
    <PantheonPanel acc={acc} canSync={can('setup')} canWrite={can('post')} />
    <CrmPushSettings company={company} t={t} fail={acc.fail} />
    <OpsPantheonSettings company={company} t={t} fail={acc.fail} />
  </div>;
}

/** Work orders (FreightBook Ops) -> PANTHEON tHF_WOEx. Dry run first; writing needs the connector write switch too. */
function OpsPantheonSettings({ company, t, fail }: { company: number; t: (k: string) => string; fail: (e: unknown) => void }) {
  const [form, setForm] = useState<Row>({ sync_enabled: false, order_doc_type: '', push_orders_from: '', default_worker: '', worker_map: {} as Record<string, string> });
  const [state, setState] = useState<Row | null>(null); const [result, setResult] = useState<Row | null>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { api.accounting.get<Row | null>(company, 'ops/pantheon').then(r => { const s = r.data; setState(s); if (s) setForm({ sync_enabled: !!s.sync_enabled, order_doc_type: s.order_doc_type ?? '', push_orders_from: s.push_orders_from ?? '', default_worker: s.default_worker ?? '', worker_map: s.worker_map ?? {} }); }).catch(() => undefined); }, [company]);
  const run = async (fn: () => Promise<void>) => { if (busy) return; setBusy(true); try { await fn(); } catch (e) { fail(e); } finally { setBusy(false); } };
  const summary = (result ?? state?.last_sync_summary) as Row | null;
  return <Card className="shadow-none" contentClassName="space-y-3 p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="flex items-center gap-2 font-black"><ClipboardList className="h-4 w-4" />{t('ops_sync_title')}</h3>
      {state?.last_sync_status && <StatusBadge tone={state.last_sync_status === 'ok' ? 'ok' : 'bad'}>{state.last_sync_status === 'ok' ? t('pantheon_connected') : t('failed')} · {String(state.last_synced_at ?? '').slice(0, 16)}</StatusBadge>}</div>
    <p className="text-sm text-slate-500">{t('ops_sync_note')}</p>
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="block"><Label>{t('ops_order_doc_type')}</Label><TextField value={form.order_doc_type} maxLength={4} placeholder="6A00" onChange={e => setForm({ ...form, order_doc_type: e.target.value.toUpperCase() })} /></label>
      <label className="block"><Label>{t('ops_push_from')}</Label><TextField type="date" value={form.push_orders_from} onChange={e => setForm({ ...form, push_orders_from: e.target.value })} /></label>
      <label className="flex items-end gap-2 pb-2 text-sm font-semibold"><input type="checkbox" checked={form.sync_enabled} onChange={e => setForm({ ...form, sync_enabled: e.target.checked })} />{t('ops_sync_enabled')}</label>
    </div>
    <div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <p className="text-sm font-semibold">{t('ops_workers')}</p><p className="text-xs text-slate-500">{t('ops_workers_note')}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block"><Label>{t('ops_default_worker')}</Label><TextField value={form.default_worker} maxLength={30} onChange={e => setForm({ ...form, default_worker: e.target.value })} /></label>
        {(state?.members ?? []).map((m: Row) => <label key={m.id} className="block"><Label>{m.name}</Label><TextField value={(form.worker_map as Record<string, string>)[String(m.id)] ?? ''} maxLength={30}
          onChange={e => setForm({ ...form, worker_map: { ...(form.worker_map as Record<string, string>), [String(m.id)]: e.target.value } })} /></label>)}
      </div>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={busy} onClick={() => void run(async () => setState((await api.accounting.send<Row>(company, 'ops/pantheon', { ...form, order_doc_type: form.order_doc_type || null, push_orders_from: form.push_orders_from || null, default_worker: form.default_worker || null,
        worker_map: Object.fromEntries(Object.entries(form.worker_map as Record<string, string>).filter(([, v]) => v)) })).data))}>{t('save')}</Button>
      <Button size="sm" variant="outline" disabled={busy || !state} onClick={() => void run(async () => setResult((await api.accounting.send<Row>(company, 'ops/pantheon/sync', { write: false })).data))}>{t('preview')}</Button>
      <Button size="sm" variant="outline" className="gap-1.5" disabled={busy || !state?.sync_enabled} onClick={() => void run(async () => setResult((await api.accounting.send<Row>(company, 'ops/pantheon/sync', { write: true })).data))}><RefreshCw className="h-3.5 w-3.5" />{t('ops_sync_now')}</Button>
    </div>
    {summary && <div className="space-y-1 text-sm">
      <p>{t('ops_pushed')}: {(summary.pushed ?? []).length} · {t('pantheon_updated')}: {(summary.updated ?? []).length} · {t('ops_pulled_closed')}: {(summary.pulled_closed ?? []).length}</p>
      {(summary.waiting ?? []).slice(0, 20).map((w: Row) => <p key={w.order_id} className="text-xs text-amber-700 dark:text-amber-400">{w.reference}: {(w.problems ?? []).map((p: string) => t(`ops_problem_${p.split(':')[0]}`) + (p.includes(':') ? p.slice(p.indexOf(':')) : '')).join(' · ')}</p>)}
    </div>}
  </Card>;
}
