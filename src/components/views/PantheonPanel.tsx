import { useEffect, useState } from 'react';
import { BookOpen, Database, PlugZap, Receipt, RefreshCw, Upload, Users } from 'lucide-react';

import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { IconSelect } from '../ui/IconSelect';
import { Notice } from '../ui/Notice';
import { RecordTable } from '../ui/RecordTable';
import { StatusBadge } from '../ui/StatusBadge';
import { Tabs } from '../ui/Tabs';
import { Label, TextField } from '../modals/AddWarehouseModal/fields';
import { type Accounting, money, type Row, shortDate, today } from './accounting/shared';

type Props = { acc: Accounting; canSync: boolean; canWrite: boolean };
const defaults = { host: '', port: '1433', database: '', schema: 'dbo', username: '', password: '', allow_write: false, clerk_id: '0', outgoing_doc_type: '4200', incoming_doc_type: '4300', journal_doc_type: '4700',
  sync_enabled: false, sync_interval_minutes: '15', push_entries_from: '', default_country_code: '', account_kinds: {} as Record<string, string> };
const kinds = ['asset', 'liability', 'equity', 'income', 'expense'];

export function PantheonPanel({ acc, canSync, canWrite }: Props) {
  const { company, t, fail, refresh: onSynced } = acc;
  const [form, setForm] = useState<Row>(defaults); const [saved, setSaved] = useState<Row | null>(null); const [busy, setBusy] = useState(false);
  const [test, setTest] = useState<Row | null>(null); const [type, setType] = useState<'accounts' | 'partners' | 'taxes'>('accounts'); const [rows, setRows] = useState<Row[] | null>(null);
  const [range, setRange] = useState({ from: `${today().slice(0, 8)}01`, to: today() }); const [exportResult, setExportResult] = useState<Row | null>(null);
  const load = async () => { const r = await api.accounting.get<Row | null>(company, 'pantheon'); setSaved(r.data); if (r.data) setForm({ ...defaults, ...r.data, push_entries_from: r.data.push_entries_from ?? '', default_country_code: r.data.default_country_code ?? '', password: '' }); };
  useEffect(() => { load().catch(fail); }, [company]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (fn: () => Promise<void>) => { if (busy) return; setBusy(true); try { await fn(); } catch (e) { fail(e); } finally { setBusy(false); } };
  const payload = (f: Row) => ({ ...f, port: Number(f.port), clerk_id: Number(f.clerk_id), sync_interval_minutes: Number(f.sync_interval_minutes), password: f.password || null,
    push_entries_from: f.push_entries_from || null, default_country_code: f.default_country_code || null });
  const sync = () => run(async () => { try { await api.accounting.send<Row>(company, 'pantheon/sync', {}); } finally { await load(); } await onSynced(); });
  const browse = (k: typeof type) => run(async () => { setType(k); setRows(null); setRows((await api.accounting.get<Row[]>(company, `pantheon/preview?type=${k}`)).data); });
  const field = (k: string, kind = 'text') => <label key={k} className="block min-w-0"><Label>{t(`pantheon_${k}`)}</Label><TextField type={kind} value={String(form[k] ?? '')} autoComplete={kind === 'password' ? 'new-password' : 'off'} placeholder={k === 'password' && saved ? '••••••••' : undefined} onChange={e => setForm({ ...form, [k]: k === 'default_country_code' ? e.target.value.toUpperCase() : e.target.value })} /></label>;
  const check = (k: string, label: string) => <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={!!form[k]} onChange={e => setForm({ ...form, [k]: e.target.checked })} />{label}</label>;
  const summary = saved?.last_sync_summary as Row | null;
  const pendingAccounts: Row[] = summary?.accounts?.pending ?? []; const pendingPartners: Row[] = summary?.partners?.pending ?? [];
  const counts = (k: 'accounts' | 'partners') => summary?.[k] && <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t(k)}</p><p className="mt-1 text-sm">+{summary[k].created} · {t('pantheon_updated')} {summary[k].updated} · {t('pantheon_linked')} {summary[k].linked}{k === 'accounts' ? ` · ${t('pantheon_deactivated')} ${summary[k].deactivated}` : ''}</p></div>;

  return <div className="space-y-3">
    <Card className="shadow-none" contentClassName="p-0">
      <form onSubmit={e => { e.preventDefault(); void run(async () => { const r = await api.accounting.send<Row>(company, 'pantheon', payload(form)); setSaved(r.data); setForm({ ...form, password: '' }); }); }}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div><p className="flex items-center gap-2 text-sm font-black"><PlugZap className="h-4 w-4 text-primary" />{t('pantheon')}</p><p className="mt-0.5 text-xs text-slate-500">{t('pantheon_licence')}</p></div>
          {saved?.last_test_status && <StatusBadge tone={saved.last_test_status === 'ok' ? 'ok' : 'bad'}>{t(saved.last_test_status === 'ok' ? 'pantheon_connected' : 'failed')} · {String(saved.last_tested_at ?? '').slice(0, 16)}</StatusBadge>}
        </div>
        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{field('host')}{field('port', 'number')}{field('database')}{field('schema')}{field('username')}{field('password', 'password')}{field('clerk_id', 'number')}</div>
          <div className="grid gap-3 sm:grid-cols-3">{field('outgoing_doc_type')}{field('incoming_doc_type')}{field('journal_doc_type')}</div>
          {check('allow_write', t('pantheon_allow_write'))}
          <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            {check('sync_enabled', t('pantheon_sync_enabled'))}
            <p className="text-xs text-slate-500">{t('pantheon_sync_note')}</p>
            <div className="grid gap-3 sm:grid-cols-3">{field('sync_interval_minutes', 'number')}{field('push_entries_from', 'date')}{field('default_country_code')}</div>
          </div>
          {test && <Notice tone={test.ok ? 'info' : 'bad'}>{test.ok ? `${t('pantheon_connected')} · ${test.accounts} ${t('accounts')} · ${test.subjects} ${t('partners')}` : test.error}</Notice>}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 p-4 dark:border-slate-800"><Button disabled={busy}>{t('save')}</Button><Button type="button" variant="outline" disabled={busy || !saved} onClick={() => void run(async () => { setTest((await api.accounting.send<Row>(company, 'pantheon/test', {})).data); await load(); })}>{t('pantheon_test')}</Button></div>
      </form>
    </Card>

    {saved && <Card className="shadow-none" contentClassName="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <div><p className="flex items-center gap-2 text-sm font-black"><RefreshCw className="h-4 w-4 text-primary" />{t('pantheon_sync')}</p>
          <p className="mt-0.5 text-xs text-slate-500">{saved.sync_enabled ? `${t('pantheon_sync_auto')} ${saved.sync_interval_minutes} min` : t('pantheon_sync_off')}{saved.last_synced_at ? ` · ${t('pantheon_last_sync')}: ${String(saved.last_synced_at).slice(0, 16)}` : ''}</p></div>
        <div className="flex items-center gap-2">{saved.last_sync_status && <StatusBadge tone={saved.last_sync_status === 'ok' ? 'ok' : 'bad'}>{saved.last_sync_status}</StatusBadge>}{canSync && <Button size="sm" disabled={busy} onClick={() => void sync()} className="gap-1.5"><RefreshCw className="h-3.5 w-3.5" />{t('pantheon_sync_now')}</Button>}</div>
      </div>
      <div className="space-y-3 p-4">
        {saved.last_sync_status === 'failed' && <Notice tone="bad">{saved.last_sync_error}</Notice>}
        {summary ? <div className="grid gap-3 md:grid-cols-3">{counts('accounts')}{counts('partners')}
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('journal')}</p><p className="mt-1 text-sm">{summary.entries?.enabled ? `${t('pantheon_exported')}: ${summary.entries.exported} · ${t('pantheon_waiting')}: ${summary.entries.waiting}` : t('pantheon_push_off')}</p></div></div>
          : <p className="text-sm text-slate-500">{t('pantheon_sync_note')}</p>}
        {summary?.entries?.problems?.length > 0 && <Notice tone="bad"><ul className="list-disc pl-4 text-xs">{summary.entries.problems.map((p: Row) => <li key={p.entry_id}>#{p.entry_id}: {p.problems.join(' ')}</li>)}</ul></Notice>}
        {pendingAccounts.length > 0 && <div className="space-y-2">
          <Notice tone="warn">{t('pantheon_pending_accounts')}</Notice>
          <RecordTable dense empty={t('empty')} rows={pendingAccounts} rowKey={a => a.key} columns={[
            { key: 'key', header: t('code'), render: a => <span className="font-mono">{a.key}</span> }, { key: 'name', header: t('name') },
            { key: 'kind', header: t('kind'), render: a => <div className="w-48"><IconSelect value={form.account_kinds?.[a.key] ?? ''} disabled={!canSync} onChange={v => setForm({ ...form, account_kinds: { ...form.account_kinds, [a.key]: v } })} icon={BookOpen} ariaLabel={t('kind')} placeholder="—" options={[{ value: '', label: '—', icon: BookOpen }, ...kinds.map(k => ({ value: k, label: t(k), icon: BookOpen }))]} /></div> },
          ]} />
          {canSync && <Button size="sm" disabled={busy} onClick={() => void run(async () => { const account_kinds = Object.fromEntries(Object.entries(form.account_kinds ?? {}).filter(([, v]) => v)); await api.accounting.send<Row>(company, 'pantheon', payload({ ...form, account_kinds })); await api.accounting.send<Row>(company, 'pantheon/sync', {}); await load(); await onSynced(); })}>{t('pantheon_save_and_sync')}</Button>}
        </div>}
        {pendingPartners.length > 0 && <Notice tone="warn">{t('pantheon_pending_partners')}: {pendingPartners.map(p => p.name).join(', ')}</Notice>}
      </div>
    </Card>}

    {saved && <Card className="shadow-none" contentClassName="p-0">
      <div className="border-b border-slate-100 p-4 dark:border-slate-800"><p className="flex items-center gap-2 text-sm font-black"><Database className="h-4 w-4 text-primary" />{t('pantheon_browse')}</p></div>
      <Tabs className="px-3" label={t('pantheon_browse')} value={type} onChange={k => void browse(k)} items={[
        { value: 'accounts', label: t('accounts'), icon: BookOpen }, { value: 'partners', label: t('partners'), icon: Users }, { value: 'taxes', label: t('pantheon_taxes'), icon: Receipt },
      ]} />
      {type === 'taxes' && rows?.length ? <Notice tone="warn" className="m-3">{t('noTaxAssumption')}</Notice> : null}
      {rows === null ? <div className="p-4"><Button size="sm" variant="outline" disabled={busy} onClick={() => void browse(type)}>{t('preview')}</Button></div> : <RecordTable dense empty={t('empty')} rows={rows} rowKey={r => String(r.code ?? r.key)} columns={type === 'accounts' ? [
        { key: 'code', header: t('code'), render: r => <span className="font-mono">{r.code}</span> }, { key: 'name', header: t('name') }, { key: 'kind', header: t('kind'), render: r => r.kind ? t(r.kind) : '—' },
        { key: 'status', header: t('status'), render: r => <StatusBadge tone={r.exists ? 'ok' : r.postable ? 'info' : 'muted'}>{r.exists ? t('pantheon_in_sync') : r.postable ? t('pantheon_next_sync') : t('pantheon_synthetic')}</StatusBadge> },
      ] : type === 'partners' ? [
        { key: 'name', header: t('name') }, { key: 'tax_number', header: t('tax_number') }, { key: 'country_code', header: t('country_code') },
        { key: 'status', header: t('status'), render: r => <StatusBadge tone={r.exists ? 'ok' : 'info'}>{r.exists ? t('pantheon_in_sync') : t('pantheon_next_sync')}</StatusBadge> },
      ] : [
        { key: 'code', header: t('code'), render: r => <span className="font-mono">{r.code}</span> }, { key: 'name', header: t('name') }, { key: 'rate', header: t('rate'), align: 'right', render: r => `${r.rate}%` }, { key: 'fiscal_code', header: t('pantheon_fiscal_code') },
      ]} />}
    </Card>}

    {saved && <Card className="shadow-none" contentClassName="p-0">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <div><p className="flex items-center gap-2 text-sm font-black"><Upload className="h-4 w-4 text-primary" />{t('pantheon_export')}</p><p className="mt-0.5 text-xs text-slate-500">{t('pantheon_export_note')}</p></div>
        <div className="flex flex-wrap items-end gap-2">{(['from', 'to'] as const).map(k => <label key={k} className="block"><Label>{t(k)}</Label><TextField type="date" value={range[k]} onChange={e => setRange({ ...range, [k]: e.target.value })} /></label>)}
          <Button variant="outline" disabled={busy} onClick={() => void run(async () => setExportResult((await api.accounting.send<Row>(company, 'pantheon/export', { ...range, write: false })).data))}>{t('preview')}</Button>
          {canWrite && <Button disabled={busy || !saved.allow_write || !exportResult?.dry_run || !exportResult.ready} onClick={() => { if (window.confirm(t('pantheon_confirm_write'))) void run(async () => setExportResult((await api.accounting.send<Row>(company, 'pantheon/export', { ...range, write: true })).data)); }}>{t('pantheon_write')} ({exportResult?.ready ?? 0})</Button>}</div>
      </div>
      {exportResult && !exportResult.dry_run && <Notice tone="info" className="m-3">{t('pantheon_exported')}: {exportResult.exported.map((e: Row) => e.pantheon_key).join(', ') || '0'}</Notice>}
      {exportResult && <RecordTable dense empty={t('empty')} rows={exportResult.documents} rowKey={d => d.entry_id} columns={[
        { key: 'date', header: t('posting_date'), render: d => shortDate(d.date) }, { key: 'doc_type', header: t('pantheon_doc_type'), render: d => <span className="font-mono">{d.doc_type}</span> }, { key: 'document', header: t('document') },
        { key: 'debit', header: t('debit'), align: 'right', render: d => money(d.debit) }, { key: 'credit', header: t('credit'), align: 'right', render: d => money(d.credit) },
        { key: 'status', header: t('status'), render: d => d.problems.length ? <span className="text-xs text-rose-600">{d.problems.join(' ')}</span> : <StatusBadge tone="ok">{t('pantheon_ready')}</StatusBadge> },
      ]} />}
    </Card>}
  </div>;
}
