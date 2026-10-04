import { useEffect, useState } from 'react';
import { Database, PlugZap, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { Button } from '../ui/Button';

type Row = Record<string, any>;
type Props = { company: number; t: (key: string) => string; fail: (e: unknown) => void; canSync: boolean; canWrite: boolean; inputClass: string; panel: string; onSynced: () => Promise<void> };
const defaults = { host: '', port: '1433', database: '', schema: 'dbo', username: '', password: '', allow_write: false, clerk_id: '0', outgoing_doc_type: '4200', incoming_doc_type: '4300', journal_doc_type: '4700',
  sync_enabled: false, sync_interval_minutes: '15', push_entries_from: '', default_country_code: '', account_kinds: {} as Record<string, string> };
const kinds = ['asset', 'liability', 'equity', 'income', 'expense'];
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Sarajevo' }).format(new Date());

export function PantheonPanel({ company, t, fail, canSync, canWrite, inputClass, panel, onSynced }: Props) {
  const [form, setForm] = useState<Row>(defaults); const [saved, setSaved] = useState<Row | null>(null); const [busy, setBusy] = useState(false);
  const [test, setTest] = useState<Row | null>(null); const [type, setType] = useState(''); const [rows, setRows] = useState<Row[]>([]);
  const [range, setRange] = useState({ from: `${today().slice(0, 8)}01`, to: today() }); const [exportResult, setExportResult] = useState<Row | null>(null);
  const load = async () => { const r = await api.accounting.get<Row | null>(company, 'pantheon'); setSaved(r.data); if (r.data) setForm({ ...defaults, ...r.data, push_entries_from: r.data.push_entries_from ?? '', default_country_code: r.data.default_country_code ?? '', password: '' }); };
  useEffect(() => { load().catch(fail); }, [company]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (fn: () => Promise<void>) => { if (busy) return; setBusy(true); try { await fn(); } catch (e) { fail(e); } finally { setBusy(false); } };
  const payload = (f: Row) => ({ ...f, port: Number(f.port), clerk_id: Number(f.clerk_id), sync_interval_minutes: Number(f.sync_interval_minutes), password: f.password || null,
    push_entries_from: f.push_entries_from || null, default_country_code: f.default_country_code || null });
  const sync = () => run(async () => { try { await api.accounting.send<Row>(company, 'pantheon/sync', {}); } finally { await load(); } await onSynced(); });
  const field = (k: string, kind = 'text') => <label key={k} className="block text-xs font-medium text-slate-500">{t(`pantheon_${k}`)}<input className={`${inputClass} mt-1`} type={kind} value={String(form[k] ?? '')} autoComplete={kind === 'password' ? 'new-password' : 'off'} placeholder={k === 'password' && saved ? '••••••••' : undefined} onChange={e => setForm({ ...form, [k]: k === 'default_country_code' ? e.target.value.toUpperCase() : e.target.value })} /></label>;
  const summary = saved?.last_sync_summary as Row | null;
  const pendingAccounts: Row[] = summary?.accounts?.pending ?? []; const pendingPartners: Row[] = summary?.partners?.pending ?? [];
  const counts = (k: 'accounts' | 'partners') => summary?.[k] ? `${t(k)}: +${summary[k].created} · ${t('pantheon_updated')} ${summary[k].updated} · ${t('pantheon_linked')} ${summary[k].linked}${k === 'accounts' ? ` · ${t('pantheon_deactivated')} ${summary[k].deactivated}` : ''}` : '';
  return <div className="space-y-4">
    <form className={`${panel} space-y-4`} onSubmit={e => { e.preventDefault(); void run(async () => { const r = await api.accounting.send<Row>(company, 'pantheon', payload(form)); setSaved(r.data); setForm({ ...form, password: '' }); }); }}>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-bold"><PlugZap size={18} />{t('pantheon')}</h2>{saved?.last_test_status && <span className={`rounded-lg px-3 py-1 text-xs ${saved.last_test_status === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{t(saved.last_test_status === 'ok' ? 'pantheon_connected' : 'failed')} · {String(saved.last_tested_at ?? '').slice(0, 16)}</span>}</div>
      <p className="text-sm text-slate-500">{t('pantheon_licence')}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{field('host')}{field('port', 'number')}{field('database')}{field('schema')}{field('username')}{field('password', 'password')}{field('clerk_id', 'number')}</div>
      <div className="grid gap-3 sm:grid-cols-3">{field('outgoing_doc_type')}{field('incoming_doc_type')}{field('journal_doc_type')}</div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.allow_write} onChange={e => setForm({ ...form, allow_write: e.target.checked })} />{t('pantheon_allow_write')}</label>
      <div className="space-y-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={!!form.sync_enabled} onChange={e => setForm({ ...form, sync_enabled: e.target.checked })} />{t('pantheon_sync_enabled')}</label>
        <p className="text-xs text-slate-500">{t('pantheon_sync_note')}</p>
        <div className="grid gap-3 sm:grid-cols-3">{field('sync_interval_minutes', 'number')}{field('push_entries_from', 'date')}{field('default_country_code')}</div>
      </div>
      <div className="flex flex-wrap gap-2"><Button disabled={busy}>{t('save')}</Button><Button type="button" variant="outline" disabled={busy || !saved} onClick={() => void run(async () => { const r = await api.accounting.send<Row>(company, 'pantheon/test', {}); setTest(r.data); await load(); })}>{t('pantheon_test')}</Button></div>
      {test && <p className={`text-sm ${test.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{test.ok ? `${t('pantheon_connected')} · ${test.accounts} ${t('accounts')} · ${test.subjects} ${t('partners')}` : test.error}</p>}
    </form>
    {saved && <section className={`${panel} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-bold"><RefreshCw size={18} />{t('pantheon_sync')}</h2>
        {canSync && <Button size="sm" disabled={busy} onClick={() => void sync()}>{t('pantheon_sync_now')}</Button>}</div>
      <p className="text-sm text-slate-500">{saved.sync_enabled ? `${t('pantheon_sync_auto')} ${saved.sync_interval_minutes} min` : t('pantheon_sync_off')}{saved.last_synced_at ? ` · ${t('pantheon_last_sync')}: ${String(saved.last_synced_at).slice(0, 16)}` : ''}</p>
      {saved.last_sync_status === 'failed' && <p className="text-sm text-rose-700">{saved.last_sync_error}</p>}
      {summary && <div className="space-y-1 text-sm"><p>{counts('accounts')}</p><p>{counts('partners')}</p>
        <p>{summary.entries?.enabled ? `${t('pantheon_exported')}: ${summary.entries.exported} · ${t('pantheon_waiting')}: ${summary.entries.waiting}` : t('pantheon_push_off')}</p></div>}
      {summary?.entries?.problems?.length > 0 && <ul className="list-disc pl-5 text-xs text-rose-700">{summary.entries.problems.map((p: Row) => <li key={p.entry_id}>#{p.entry_id}: {p.problems.join(' ')}</li>)}</ul>}
      {pendingAccounts.length > 0 && <div className="space-y-2"><p className="text-sm font-medium text-amber-700">{t('pantheon_pending_accounts')}</p>
        <div className="max-h-[320px] overflow-auto"><table className="w-full text-left text-sm"><tbody>{pendingAccounts.map(a => <tr key={a.key} className="border-t border-slate-100 dark:border-slate-800">
          <td className="p-2 font-mono">{a.key}</td><td className="p-2">{a.name}</td><td className="p-2"><select className={inputClass} disabled={!canSync} value={form.account_kinds?.[a.key] ?? ''} onChange={e => setForm({ ...form, account_kinds: { ...form.account_kinds, [a.key]: e.target.value } })}><option value="">—</option>{kinds.map(k => <option key={k} value={k}>{t(k)}</option>)}</select></td></tr>)}</tbody></table></div>
        {canSync && <Button size="sm" disabled={busy} onClick={() => void run(async () => { const account_kinds = Object.fromEntries(Object.entries(form.account_kinds ?? {}).filter(([, v]) => v)); await api.accounting.send<Row>(company, 'pantheon', payload({ ...form, account_kinds })); await api.accounting.send<Row>(company, 'pantheon/sync', {}); await load(); await onSynced(); })}>{t('pantheon_save_and_sync')}</Button>}</div>}
      {pendingPartners.length > 0 && <p className="text-sm text-amber-700">{t('pantheon_pending_partners')}: {pendingPartners.map(p => p.name).join(', ')}</p>}
    </section>}
    {saved && <section className={`${panel} space-y-4`}>
      <h2 className="flex items-center gap-2 font-bold"><Database size={18} />{t('pantheon_browse')}</h2>
      <div className="flex flex-wrap gap-2">{['accounts', 'partners', 'taxes'].map(k => <Button key={k} size="sm" variant={type === k ? 'primary' : 'outline'} disabled={busy} onClick={() => void run(async () => { setType(k); setRows((await api.accounting.get<Row[]>(company, `pantheon/preview?type=${k}`)).data); })}>{t(k === 'taxes' ? 'pantheon_taxes' : k)}</Button>)}</div>
      {type === 'taxes' && rows.length > 0 && <p className="text-sm text-amber-700">{t('noTaxAssumption')}</p>}
      {rows.length > 0 && <div className="max-h-[420px] overflow-auto"><table className="w-full text-left text-sm"><thead><tr className="text-xs text-slate-500">{(type === 'accounts' ? ['code', 'name', 'kind', 'status'] : type === 'partners' ? ['name', 'tax_number', 'country_code', 'status'] : ['code', 'name', 'rate', 'pantheon_fiscal_code']).map(k => <th className="p-2" key={k}>{t(k)}</th>)}</tr></thead>
        <tbody>{rows.map(r => <tr key={String(r.code ?? r.key)} className="border-t border-slate-100 dark:border-slate-800">
          {type === 'accounts' && <><td className="p-2 font-mono">{r.code}</td><td className="p-2">{r.name}</td><td className="p-2">{r.kind ? t(r.kind) : '—'}</td><td className="p-2 text-xs">{r.exists ? t('pantheon_in_sync') : r.postable ? t('pantheon_next_sync') : t('pantheon_synthetic')}</td></>}
          {type === 'partners' && <><td className="p-2">{r.name}</td><td className="p-2">{r.tax_number ?? '—'}</td><td className="p-2">{r.country_code ?? '—'}</td><td className="p-2 text-xs">{r.exists ? t('pantheon_in_sync') : t('pantheon_next_sync')}</td></>}
          {type === 'taxes' && <><td className="p-2 font-mono">{r.code}</td><td className="p-2">{r.name}</td><td className="p-2">{r.rate}</td><td className="p-2">{r.fiscal_code}</td></>}
        </tr>)}</tbody></table></div>}
    </section>}
    {saved && <section className={`${panel} space-y-4`}>
      <h2 className="font-bold">{t('pantheon_export')}</h2><p className="text-sm text-slate-500">{t('pantheon_export_note')}</p>
      <div className="flex flex-wrap items-end gap-3">{(['from', 'to'] as const).map(k => <label key={k} className="block text-xs font-medium text-slate-500">{t(k)}<input type="date" className={`${inputClass} mt-1`} value={range[k]} onChange={e => setRange({ ...range, [k]: e.target.value })} /></label>)}
        <Button variant="outline" disabled={busy} onClick={() => void run(async () => setExportResult((await api.accounting.send<Row>(company, 'pantheon/export', { ...range, write: false })).data))}>{t('preview')}</Button>
        {canWrite && <Button disabled={busy || !saved.allow_write || !exportResult?.dry_run || !exportResult.ready} onClick={() => { if (window.confirm(t('pantheon_confirm_write'))) void run(async () => setExportResult((await api.accounting.send<Row>(company, 'pantheon/export', { ...range, write: true })).data)); }}>{t('pantheon_write')} ({exportResult?.ready ?? 0})</Button>}</div>
      {exportResult && <div className="space-y-2">{!exportResult.dry_run && <p className="text-sm text-emerald-700">{t('pantheon_exported')}: {exportResult.exported.map((e: Row) => e.pantheon_key).join(', ') || '0'}</p>}
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="text-xs text-slate-500">{['posting_date', 'pantheon_doc_type', 'document', 'debit', 'credit', 'status'].map(k => <th className="p-2" key={k}>{t(k)}</th>)}</tr></thead><tbody>{exportResult.documents.map((d: Row) => <tr key={d.entry_id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-2">{d.date}</td><td className="p-2 font-mono">{d.doc_type}</td><td className="p-2">{d.document}</td><td className="p-2">{d.debit}</td><td className="p-2">{d.credit}</td><td className={`p-2 text-xs ${d.problems.length ? 'text-rose-700' : 'text-emerald-700'}`}>{d.problems.length ? d.problems.join(' ') : t('pantheon_ready')}</td></tr>)}</tbody></table>{!exportResult.documents.length && <p className="p-4 text-center text-slate-500">{t('empty')}</p>}</div></div>}
    </section>}
  </div>;
}
