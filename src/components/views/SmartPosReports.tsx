import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, CalendarRange, CheckCircle2, Copy, FileBarChart2, Hash, LoaderCircle, Play, Printer, Sun, Wifi, WifiOff } from 'lucide-react';

import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Dialog } from '../ui/Dialog';
import { IconSelect } from '../ui/IconSelect';
import { Notice } from '../ui/Notice';
import { RecordTable } from '../ui/RecordTable';
import { StatusBadge } from '../ui/StatusBadge';
import { cn } from '../../lib/cn';
import { type Accounting, FieldGrid, money, type Row, today } from './accounting/shared';

// Port of invoice-maker FiscalReportsPanel: same fiscal actions, same worker commands.
const FISCAL_ACTIONS = [{ id: 'daily', icon: Sun }, { id: 'snapshot', icon: CalendarClock }, { id: 'periodic', icon: CalendarRange }, { id: 'duplicate', icon: Copy }] as const;
const clock = () => new Date().toLocaleTimeString('bs-BA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const bsDate = (value: string) => { const [y, m, d] = value.split('-'); return value ? `${Number(d)}. ${Number(m)}. ${y}.` : 'n/a'; };

export function SmartPosReports({ acc }: { acc: Accounting }) {
  const { company, t, fail } = acc;
  const [range, setRange] = useState<Row>({ from: today(), to: today() });
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
  const loadSummary = (kind: string) => { setSummaryKind(kind); api.accounting.get<Row>(company, `pos/summary?from=${range.from}&to=${range.to}`).then(r => setSummary(r.data)).catch(fail); };
  const summaryRows: Row[] = summary ? (summaryKind === 'by_item' ? summary.by_item : summary.by_payment) : [];
  const printSummary = () => summary && void runReport('text', { lines: [t(`pos_${summaryKind}`).toUpperCase(), `OD ${bsDate(range.from)} DO ${bsDate(range.to)}`,
    ...summaryRows.map(r => summaryKind === 'by_item' ? `${String(r.description).slice(0, 24)} ${r.quantity} ${r.total}` : `${t(`pay_${r.payment_method}`)} ${r.total}`)] });
  const online = status?.online === true;
  const tile = 'flex h-20 cursor-pointer flex-col items-start justify-between rounded-2xl border border-slate-200 bg-white p-3 text-left text-sm font-bold transition hover:border-primary hover:bg-primary/5 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900';

  return <div className="space-y-3">
    <Card className="shadow-none" contentClassName="flex flex-wrap items-end justify-between gap-3 p-4">
      <div className="w-full max-w-md"><FieldGrid acc={acc} keys={['from', 'to']} object={range} onChange={setRange} columns="grid-cols-2" /></div>
      <div className="flex items-center gap-2">
        <StatusBadge tone={!status ? 'warn' : online ? 'ok' : 'bad'} icon={online ? Wifi : WifiOff}>{!status ? t('pos_checking') : online ? t('pos_online') : t('pos_offline')}</StatusBadge>
        <span className="text-xs text-slate-500">{status?.port ? `${status.port} · ` : ''}{status?.installed === false ? t('pos_not_installed') : status?.name ?? status?.reason ?? ''}</span>
      </div>
    </Card>

    <Card className="shadow-none" title={t('pos_fiscalReports')} contentClassName="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
      {FISCAL_ACTIONS.map(({ id, icon: Icon }) => <button key={id} type="button" className={tile} disabled={!!pending} onClick={() => id === 'duplicate' ? openDuplicate() : void runReport(id, id === 'periodic' ? range : {})}>{pending === id ? <LoaderCircle className="h-5 w-5 animate-spin text-primary" /> : <Icon className="h-5 w-5 text-primary" />}{t(`pos_${id}`)}</button>)}
      <button type="button" className={cn(tile, 'border-emerald-300 dark:border-emerald-900')} disabled={!!pending} onClick={() => void runReport('text', { lines: ['NEFISKALNI TEST', 'SMART POS', `OD ${bsDate(range.from)} DO ${bsDate(range.to)}`] })}>{pending === 'text' ? <LoaderCircle className="h-5 w-5 animate-spin text-emerald-600" /> : <Play className="h-5 w-5 text-emerald-600" />}{t('pos_test')}</button>
    </Card>

    <section className="grid min-w-0 gap-3 xl:grid-cols-12">
      <Card className="shadow-none xl:col-span-4" title={t('pos_nonFiscal')} contentClassName="space-y-2 p-4">
        {['by_item', 'by_payment'].map(k => <button key={k} type="button" onClick={() => loadSummary(k)} className={cn(tile, 'h-14 w-full flex-row items-center justify-start gap-2', summaryKind === k && 'border-primary bg-primary/5 text-primary')}><FileBarChart2 className="h-5 w-5" />{t(`pos_${k}`)}</button>)}
        <Button variant="outline" className="h-12 w-full gap-2" disabled={!summary || !!pending} onClick={printSummary}><Printer className="h-4 w-4" />{t('pos_printText')}</Button>
      </Card>
      <Card className="min-w-0 shadow-none xl:col-span-8" title={summary ? `${t(`pos_${summaryKind}`)} · ${summary.receipts} ${t('pos_receipts')}` : t('summary')} contentClassName="p-0">
        <RecordTable dense empty={t('empty')} rows={summaryRows} columns={summaryKind === 'by_item'
          ? [{ key: 'description', header: t('description') }, { key: 'quantity', header: t('quantity'), align: 'right' }, { key: 'total', header: t('total'), align: 'right', render: r => <strong>{money(r.total)}</strong> }]
          : [{ key: 'payment_method', header: t('payment_method'), render: r => t(`pay_${r.payment_method}`) }, { key: 'total', header: t('total'), align: 'right', render: r => <strong>{money(r.total)}</strong> }]} />
      </Card>
    </section>

    <Card className="shadow-none" contentClassName="space-y-3 p-4">
      {pending ? <Notice tone="info"><span className="inline-flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" />{t('sending')}</span></Notice>
        : error ? <Notice tone="bad">{error}</Notice>
          : result ? <div className="space-y-2"><StatusBadge tone="ok" icon={CheckCircle2}>{t('pos_done')}</StatusBadge><dl className="grid gap-2 text-xs sm:grid-cols-3">{[['Model', result.bridgeSettings?.model], ['COM port', result.bridgeSettings?.comPort], ['Command', result.command], ['Request file', result.requestFile], ['Answer file', result.answerFile], ['Payload', result.payload?.payload ?? result.payload?.reportTypeOption]].map(([k, v]) => <div key={k} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800"><dt className="text-[10px] font-bold uppercase text-slate-400">{k}</dt><dd className="break-all font-mono">{v ?? 'n/a'}</dd></div>)}</dl></div>
            : <p className="text-sm text-slate-500">{t('pos_hint')}</p>}
      <div className="grid gap-3 lg:grid-cols-2"><pre className="max-h-56 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] leading-5 text-slate-200">{log.join('\n') || '—'}</pre><pre className="max-h-56 overflow-auto rounded-xl bg-slate-950 p-3 font-mono text-[11px] leading-5 text-sky-300">{result?.rawAnswer ?? (result ? JSON.stringify(result, null, 2) : '—')}</pre></div>
    </Card>

    {duplicateOpen && <Dialog icon={Copy} title={t('pos_duplicate')} onClose={() => setDuplicateOpen(false)} closeDisabled={pending === 'duplicate'} closeLabel={t('close')}
      footer={<><Button variant="outline" onClick={openDuplicate}>{t('refresh')}</Button><Button disabled={!duplicateId || !!pending} onClick={() => void runReport('duplicate', { invoice_id: Number(duplicateId) })} className="gap-2">{pending === 'duplicate' && <LoaderCircle className="h-4 w-4 animate-spin" />}{t('pos_duplicate')}</Button></>}>
      {options.length ? <IconSelect value={duplicateId} onChange={setDuplicateId} icon={Hash} ariaLabel={t('fiscal_number')} placeholder="—" searchable searchPlaceholder={t('search')} noResults={t('empty')}
        options={options.map(o => ({ value: String(o.id), label: `#${o.fiscal_number} · ${o.number} · ${o.partner_name ?? ''} · ${String(o.fiscalised_at ?? '').slice(0, 16)}`, icon: Hash }))} />
        : <p className="text-sm text-slate-500">{t('empty')}</p>}
    </Dialog>}
  </div>;
}
