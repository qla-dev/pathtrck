import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, LoaderCircle, Play, Printer, Wifi, WifiOff, X } from 'lucide-react';
import { api } from '../../services/api';
import { Button } from '../ui/Button';

type Row = Record<string, any>;
type Props = { company: number; t: (key: string) => string; fail: (e: unknown) => void; inputClass: string; panel: string };

// Port of invoice-maker FiscalReportsPanel: same fiscal actions, same worker commands.
const FISCAL_ACTIONS = ['daily', 'snapshot', 'periodic', 'duplicate'] as const;
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Sarajevo' }).format(new Date());
const clock = () => new Date().toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const bsDate = (value: string) => { const [y, m, d] = value.split('-'); return value ? `${Number(d)}. ${Number(m)}. ${y}.` : 'n/a'; };

export function SmartPosReports({ company, t, fail, inputClass, panel }: Props) {
  const [from, setFrom] = useState(today()); const [to, setTo] = useState(today());
  const [status, setStatus] = useState<Row | null>(null); const [pending, setPending] = useState('');
  const [result, setResult] = useState<Row | null>(null); const [error, setError] = useState('');
  const [log, setLog] = useState<string[]>([]); const [summary, setSummary] = useState<Row | null>(null); const [summaryKind, setSummaryKind] = useState('');
  const [duplicateOpen, setDuplicateOpen] = useState(false); const [options, setOptions] = useState<Row[]>([]); const [duplicateId, setDuplicateId] = useState('');
  const push = (line: string) => setLog(current => [`[${clock()}] ${line}`, ...current].slice(0, 30));
  const loadStatus = useCallback(() => api.accounting.get<Row>(company, 'pos/status').then(r => setStatus(r.data)).catch(e => setStatus({ online: false, reason: e instanceof Error ? e.message : String(e) })), [company]);
  useEffect(() => { void loadStatus(); const id = window.setInterval(() => void loadStatus(), 15000); return () => window.clearInterval(id); }, [loadStatus]);
  const runReport = async (type: string, body: Row = {}) => {
    if (pending) return; setPending(type); setError(''); setResult(null); push(`${t(`pos_${type}`)} · ${t('sending')}`);
    try { const r = await api.accounting.send<Row>(company, `pos/reports/${type}`, { request_key: crypto.randomUUID(), ...body }); setResult(r.data); push(`${t(`pos_${type}`)} · ${t('pos_done')} · ${r.data.answerFile ?? r.data.command ?? ''}`); if (type === 'duplicate') setDuplicateOpen(false); }
    catch (e) { const message = e instanceof Error ? e.message : String(e); setError(message); push(`${t('failed')}: ${message}`); }
    finally { setPending(''); }
  };
  const openDuplicate = () => { setDuplicateOpen(true); api.accounting.get<Row[]>(company, 'pos/duplicate-options').then(r => { setOptions(r.data); setDuplicateId(current => current || String(r.data[0]?.id ?? '')); }).catch(fail); };
  const loadSummary = (kind: string) => { setSummaryKind(kind); api.accounting.get<Row>(company, `pos/summary?from=${from}&to=${to}`).then(r => setSummary(r.data)).catch(fail); };
  const summaryRows: Row[] = summary ? (summaryKind === 'by_item' ? summary.by_item : summary.by_payment) : [];
  const printSummary = () => summary && void runReport('text', { lines: [t(`pos_${summaryKind}`).toUpperCase(), `OD ${bsDate(from)} DO ${bsDate(to)}`,
    ...summaryRows.map(r => summaryKind === 'by_item' ? `${String(r.description).slice(0, 24)} ${r.quantity} ${r.total}` : `${t(`pay_${r.payment_method}`)} ${r.total}`)] });
  const online = status?.online === true;
  return <div className="space-y-4">
    <section className={`${panel} flex flex-wrap items-center justify-between gap-4`}>
      <div className="flex flex-wrap items-center gap-3 text-sm"><span>{t('from')}</span><div className="w-44"><input type="date" className={inputClass} value={from} onChange={e => setFrom(e.target.value)} /></div><span>{t('to')}</span><div className="w-44"><input type="date" className={inputClass} value={to} onChange={e => setTo(e.target.value)} /></div></div>
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-2 text-sm ${online ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${!status ? 'bg-amber-400' : online ? 'bg-emerald-500' : 'bg-rose-500'}`} />{online ? <Wifi size={16} /> : <WifiOff size={16} />}
        <div><p className="font-semibold">{!status ? t('pos_checking') : online ? t('pos_online') : t('pos_offline')}</p><p className="text-xs opacity-80">{status?.port ? `${status.port} · ` : ''}{status?.installed === false ? t('pos_not_installed') : status?.name ?? status?.reason ?? ''}</p></div>
      </div>
    </section>
    <section className={`${panel} space-y-3`}><h2 className="font-bold">{t('pos_fiscalReports')}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{FISCAL_ACTIONS.map(k => <Button key={k} variant="outline" className="h-16" disabled={!!pending} onClick={() => k === 'duplicate' ? openDuplicate() : void runReport(k, k === 'periodic' ? { from, to } : {})}>{pending === k ? <LoaderCircle size={16} className="mr-2 animate-spin" /> : null}{t(`pos_${k}`)}</Button>)}
        <Button variant="outline" className="h-16 border-emerald-500 text-emerald-700" disabled={!!pending} onClick={() => void runReport('text', { lines: ['NEFISKALNI TEST', 'SMART POS', `OD ${bsDate(from)} DO ${bsDate(to)}`] })}>{pending === 'text' ? <LoaderCircle size={16} className="mr-2 animate-spin" /> : <Play size={16} className="mr-2" />}{t('pos_test')}</Button></div>
    </section>
    <section className={`${panel} grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]`}>
      <div className="space-y-3"><h2 className="font-bold">{t('pos_nonFiscal')}</h2>{['by_item', 'by_payment'].map(k => <Button key={k} variant={summaryKind === k ? 'primary' : 'outline'} className="h-14 w-full" onClick={() => loadSummary(k)}>{t(`pos_${k}`)}</Button>)}
        <Button variant="outline" className="h-14 w-full" disabled={!summary || !!pending} onClick={printSummary}><Printer size={16} className="mr-2" />{t('pos_printText')}</Button></div>
      <div className="space-y-3">
        {summary && <div className="overflow-x-auto rounded-xl border p-3 dark:border-slate-700"><p className="mb-2 text-xs text-slate-500">{summary.receipts} · {t('pos_receipts')}</p><table className="w-full text-left text-sm"><tbody>{summaryRows.map((r, i) => <tr key={i} className="border-t border-slate-100 dark:border-slate-800"><td className="p-2">{summaryKind === 'by_item' ? r.description : t(`pay_${r.payment_method}`)}</td>{summaryKind === 'by_item' && <td className="p-2">{r.quantity}</td>}<td className="p-2 text-right font-medium">{r.total}</td></tr>)}</tbody></table>{!summaryRows.length && <p className="p-4 text-center text-slate-500">{t('empty')}</p>}</div>}
        <div className="rounded-xl border p-3 text-sm dark:border-slate-700">
          {pending ? <p className="flex items-center gap-2 text-amber-700"><LoaderCircle size={16} className="animate-spin" />{t('sending')}</p>
            : error ? <p className="flex items-start gap-2 text-rose-700"><AlertTriangle size={16} className="mt-0.5 shrink-0" />{error}</p>
              : result ? <div className="space-y-2"><p className="flex items-center gap-2 text-emerald-700"><CheckCircle2 size={16} />{t('pos_done')}</p><div className="grid gap-2 text-xs sm:grid-cols-3">{[['Model', result.bridgeSettings?.model], ['COM port', result.bridgeSettings?.comPort], ['Command', result.command], ['Request file', result.requestFile], ['Answer file', result.answerFile], ['Payload', result.payload?.payload ?? result.payload?.reportTypeOption]].map(([k, v]) => <div key={k} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800"><p className="text-[10px] font-bold uppercase text-slate-400">{k}</p><p className="break-all font-mono">{v ?? 'n/a'}</p></div>)}</div></div>
                : <p className="text-slate-500">{t('pos_hint')}</p>}
        </div>
        <div className="grid gap-3 lg:grid-cols-2"><pre className="max-h-56 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] leading-5 text-slate-200">{log.join('\n') || '—'}</pre><pre className="max-h-56 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] leading-5 text-sky-300">{result?.rawAnswer ?? (result ? JSON.stringify(result, null, 2) : '—')}</pre></div>
      </div>
    </section>
    {duplicateOpen && <div className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/60 p-4"><section role="dialog" aria-modal="true" aria-label={t('pos_duplicate')} className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-5 dark:bg-slate-950">
      <header className="flex justify-between"><h2 className="text-lg font-bold">{t('pos_duplicate')}</h2><Button variant="ghost" aria-label={t('close')} disabled={pending === 'duplicate'} onClick={() => setDuplicateOpen(false)}><X size={18} /></Button></header>
      <select className={inputClass} value={duplicateId} onChange={e => setDuplicateId(e.target.value)}><option value="">—</option>{options.map(o => <option key={o.id} value={o.id}>{`${t('fiscal_number')} ${o.fiscal_number} · ${o.number} · ${o.partner_name ?? ''} · ${String(o.fiscalised_at ?? '').slice(0, 16)}`}</option>)}</select>
      {!options.length && <p className="text-sm text-slate-500">{t('empty')}</p>}
      <div className="flex justify-end gap-2"><Button variant="outline" onClick={openDuplicate}>{t('refresh')}</Button><Button disabled={!duplicateId || !!pending} onClick={() => void runReport('duplicate', { invoice_id: Number(duplicateId) })}>{pending === 'duplicate' && <LoaderCircle size={16} className="mr-2 animate-spin" />}{t('pos_duplicate')}</Button></div>
    </section></div>}
  </div>;
}
