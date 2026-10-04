import { useEffect, useMemo, useState } from 'react';
import { Banknote, CheckCircle2, ChevronDown, Clock3, CreditCard, Delete, FileCheck2, History, Landmark, Minus, PackagePlus, Plus, Printer, ReceiptText, Search, Ticket, Trash2, Truck, UserRound, X } from 'lucide-react';

import { cn } from '../../../lib/cn';
import { api } from '../../../services/api';
import { IconSelect } from '../../ui/IconSelect';
import { Notice } from '../../ui/Notice';
import { StatusBadge } from '../../ui/StatusBadge';
import { type Accounting, KeyField, money, type Row, today } from './shared';

type Line = { key: string; description: string; quantity: string; unit_price: string; account_id: string; tax_rule_id: string; workspace_id: string };
type Tile = { id: string; group: 'jobs' | 'recent'; title: string; subtitle: string; price: string; line: Omit<Line, 'key' | 'quantity'> };
type KeypadTarget = 'quantity' | 'unit_price' | 'received';
const METHODS = [{ id: 'cash', icon: Banknote }, { id: 'card', icon: CreditCard }, { id: 'cheque', icon: FileCheck2 }, { id: 'transfer', icon: Landmark }, { id: 'voucher', icon: Ticket }] as const;
const num = (v: string) => Number(String(v || '0').replace(',', '.')) || 0;

/**
 * Full-screen cash register for Smart POS: catalogue tiles on the left, the receipt with keypad,
 * totals and payment methods on the right. "Charge" runs draft -> approval -> issue -> fiscal receipt
 * as far as the cashier's permissions allow; the backend still enforces every rule.
 */
export function PosTerminal({ acc, onClose }: { acc: Accounting; onClose: () => void }) {
  const { t, data, can, company, context, send, run, busy, error, setError } = acc;
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<'all' | 'jobs' | 'recent'>('all');
  const [lines, setLines] = useState<Line[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [target, setTarget] = useState<KeypadTarget>('quantity');
  const [buffer, setBuffer] = useState('');
  // Retail default, as on any till: the company's walk-in customer when one exists.
  const [partnerId, setPartnerId] = useState(() => String(data.partners.find(p => /krajnji kupac|walk-in|endkunde/i.test(p.name))?.id ?? ''));
  const [method, setMethod] = useState<(typeof METHODS)[number]['id']>('cash');
  const [received, setReceived] = useState('');
  const [lineSettings, setLineSettings] = useState(false);
  const [device, setDevice] = useState<Row | null>(null);
  const [now, setNow] = useState(new Date());
  const [done, setDone] = useState<Row | null>(null);

  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (can('pos')) api.accounting.get<Row>(company, 'pos/status').then(r => setDevice(r.data)).catch(() => setDevice({ online: false })); }, [company]); // eslint-disable-line react-hooks/exhaustive-deps

  // Defaults come from the company's own latest outgoing line: the same income account and approved VAT rule.
  const recentLines = useMemo(() => data.invoices.filter(i => i.direction === 'outgoing').flatMap(i => i.items || []), [data.invoices]);
  // Same check as the server (AccountingInvoices::validateReady): approved, own jurisdiction, VAT, valid on today's tax date.
  // A rule approved for a later date is never picked, so a receipt cannot fail with "rule valid on the tax date".
  const validRules = useMemo(() => {
    const day = today();
    return data.rules.filter(r => r.verification_status === 'approved' && r.approved_by && r.rate !== null && (r.tax_type ?? 'vat') === 'vat'
      && [data.settings?.jurisdiction, 'BA'].includes(r.jurisdiction) && String(r.effective_from) <= day && String(r.applies_from) <= day
      && (!r.effective_until || String(r.effective_until) >= day));
  }, [data.rules, data.settings]);
  const validRule = (id: unknown) => validRules.some(r => String(r.id) === String(id));
  const defaults = useMemo(() => {
    const last = recentLines.find(l => l.account_id && validRule(l.tax_rule_id));
    return { account_id: String(last?.account_id ?? data.accounts.find(a => a.kind === 'income' && a.active)?.id ?? ''), tax_rule_id: String(last?.tax_rule_id ?? validRules[0]?.id ?? '') };
  }, [data.accounts, validRules, recentLines]); // eslint-disable-line react-hooks/exhaustive-deps
  const tiles = useMemo<Tile[]>(() => {
    const jobs = data.jobs.map(j => ({ id: `job-${j.id}`, group: 'jobs' as const, title: `${t('pos_job')} ${j.reference || j.id}`, subtitle: j.currency || '', price: String(j.agreed_amount ?? '0'),
      line: { description: `${t('pos_job')} ${j.reference || j.id}`, unit_price: String(j.agreed_amount ?? '0'), workspace_id: String(j.id), ...defaults } }));
    const seen = new Set<string>();
    const recent = recentLines.filter(l => l.description && !seen.has(l.description) && seen.add(l.description)).slice(0, 24).map((l, n) => ({ id: `recent-${n}`, group: 'recent' as const, title: l.description, subtitle: `${l.tax_rate ?? '?'}%`, price: String(l.unit_price),
      line: { description: l.description, unit_price: String(l.unit_price), account_id: String(l.account_id ?? defaults.account_id), tax_rule_id: validRule(l.tax_rule_id) ? String(l.tax_rule_id) : defaults.tax_rule_id, workspace_id: '' } }));
    return [...jobs, ...recent];
  }, [data.jobs, recentLines, defaults, t, validRules]); // eslint-disable-line react-hooks/exhaustive-deps
  const visible = tiles.filter(tile => (group === 'all' || tile.group === group) && tile.title.toLowerCase().includes(query.toLowerCase()));

  const rate = (l: Line) => data.rules.find(r => String(r.id) === l.tax_rule_id)?.rate;
  const net = lines.reduce((s, l) => s + num(l.quantity) * num(l.unit_price), 0);
  const vat = lines.reduce((s, l) => s + num(l.quantity) * num(l.unit_price) * Number(rate(l) ?? 0) / 100, 0);
  const total = net + vat;
  const change = num(received) - total;
  const current = lines.find(l => l.key === selected);
  const missing = [!partnerId && t('pos_customer'), !lines.length && t('lines'), lines.some(l => !l.account_id || !l.tax_rule_id) && t('pos_item_settings')].filter(Boolean) as string[];

  const addLine = (line: Omit<Line, 'key' | 'quantity'>) => {
    const existing = lines.find(l => l.description === line.description && l.unit_price === line.unit_price && l.workspace_id === line.workspace_id);
    if (existing) { setLines(lines.map(l => l === existing ? { ...l, quantity: String(num(l.quantity) + 1) } : l)); setSelected(existing.key); }
    else { const key = crypto.randomUUID(); setLines([...lines, { ...line, key, quantity: '1' }]); setSelected(key); }
    setTarget('quantity'); setBuffer('');
  };
  const updateLine = (key: string, patch: Partial<Line>) => setLines(list => list.map(l => l.key === key ? { ...l, ...patch } : l));
  const press = (k: string) => {
    const next = k === 'C' ? '' : k === '⌫' ? buffer.slice(0, -1) : k === ',' ? (buffer.includes(',') ? buffer : `${buffer || '0'},`) : `${buffer}${k}`;
    setBuffer(next);
    const value = next.replace(',', '.') || '0';
    if (target === 'received') setReceived(value);
    else if (current) updateLine(current.key, { [target]: target === 'quantity' && value === '0' ? '1' : value });
  };
  const reset = () => { setLines([]); setSelected(null); setReceived(''); setBuffer(''); setDone(null); setError(''); };
  const payload = () => {
    const d = today();
    return { direction: 'outgoing', partner_id: Number(partnerId), issued_at: d, due_at: d, event_date: d, tax_date: d, posting_date: d, currency: 'BAM', exchange_rate: '1', exchange_date: d, exchange_source: 'base_currency', document_ids: [],
      items: lines.map(l => ({ description: l.description, quantity: l.quantity, unit_price: l.unit_price, account_id: l.account_id || null, tax_rule_id: l.tax_rule_id || null, workspace_id: l.workspace_id || null })) };
  };
  const saveDraft = () => void run(async () => { await send('invoices', payload()); reset(); });
  const charge = () => void run(async () => {
    const id = (await send('invoices', payload())).data.id;
    await send(`invoices/${id}/submit`, {});
    if (!can('approve')) { setDone({ stage: 'pending', total }); return; }
    await send(`invoices/${id}/approve`, {});
    await send(`invoices/${id}/issue`, {});
    if (!can('pos')) { setDone({ stage: 'issued', total }); return; }
    const fiscal = (await send(`pos/invoices/${id}/fiscalise`, { payment_method: method, request_key: crypto.randomUUID() })).data;
    setDone({ stage: fiscal.fiscal_status, id, total, fiscal_number: fiscal.fiscal_number, change: method === 'cash' && received ? change : null });
  });

  return (
    <div className="fixed inset-0 z-[230] flex flex-col bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500 text-white"><ReceiptText className="h-4 w-4" /></span>
          <div><p className="text-sm font-black leading-tight">{t('smartPos')} · {t('pos_new_sale')}</p><p className="text-[11px] text-slate-500">{context?.company?.name} · {t('pos_cashier')} #{context?.user_id}</p></div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge tone="muted" icon={Clock3}>{now.toLocaleString('bs-BA', { dateStyle: 'short', timeStyle: 'short' })}</StatusBadge>
          {device && <StatusBadge tone={device.online ? 'ok' : 'bad'}>{t('pos_device')}: {t(device.online ? 'pos_online' : device.installed === false ? 'pos_not_installed' : 'pos_offline')}</StatusBadge>}
          <button type="button" onClick={onClose} disabled={busy} aria-label={t('close')} className="cursor-pointer rounded-xl bg-slate-100 p-2 text-slate-500 disabled:opacity-50 dark:bg-slate-800"><X className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_440px]">
        <section className="flex min-h-0 flex-col gap-3 p-4">
          <label className="relative block"><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder={t('pos_search')} className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-base outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-900" /></label>
          <div className="flex flex-wrap gap-2">{([['all', 'all', PackagePlus], ['jobs', 'pos_jobs', Truck], ['recent', 'pos_recent', History]] as const).map(([id, label, Icon]) => <button key={id} type="button" onClick={() => setGroup(id)} className={cn('inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold', group === id ? 'bg-primary text-white' : 'bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300')}><Icon className="h-4 w-4" />{t(label)}</button>)}</div>
          <div className="grid min-h-0 flex-1 auto-rows-[112px] grid-cols-2 gap-3 overflow-y-auto pb-2 md:grid-cols-3 xl:grid-cols-4">
            <button type="button" onClick={() => addLine({ description: t('pos_manual'), unit_price: '0', workspace_id: '', ...defaults })} className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-bold text-slate-500 transition hover:border-primary hover:text-primary active:scale-[0.98] dark:border-slate-700"><Plus className="h-6 w-6" />{t('pos_manual')}</button>
            {visible.map(tile => <button key={tile.id} type="button" onClick={() => addLine(tile.line)} className="flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-primary hover:shadow-md active:scale-[0.98] dark:border-slate-800 dark:bg-slate-900">
              <span className="flex items-start justify-between gap-2"><span className="line-clamp-2 text-sm font-bold">{tile.title}</span>{tile.group === 'jobs' ? <Truck className="h-4 w-4 shrink-0 text-sky-500" /> : <History className="h-4 w-4 shrink-0 text-violet-500" />}</span>
              <span className="flex items-end justify-between"><span className="text-[11px] text-slate-400">{tile.subtitle}</span><span className="text-base font-black text-primary">{money(tile.price)}</span></span>
            </button>)}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col border-l border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          {done ? <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <CheckCircle2 className={cn('h-16 w-16', done.stage === 'fiscalised' ? 'text-emerald-500' : 'text-amber-500')} />
            <p className="text-xl font-black">{t(done.stage === 'fiscalised' ? 'pos_done_receipt' : done.stage === 'pending' ? 'pos_needs_approval' : done.stage === 'issued' ? 'issued' : `fiscal_${done.stage}`)}</p>
            {done.fiscal_number && <p className="text-sm text-slate-500">{t('fiscal_number')} <strong className="text-slate-900 dark:text-white">#{done.fiscal_number}</strong></p>}
            <p className="text-4xl font-black text-primary">{money(done.total, 'KM')}</p>
            {done.change != null && <p className="text-lg">{t('pos_change')}: <strong>{money(done.change, 'KM')}</strong></p>}
            <div className="flex gap-2">{done.stage === 'fiscalised' && <button type="button" disabled={busy} onClick={() => void run(() => send('pos/reports/duplicate', { invoice_id: done.id, request_key: crypto.randomUUID() }))} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 font-bold dark:border-slate-700"><Printer className="h-4 w-4" />{t('pos_duplicate')}</button>}
              <button type="button" onClick={reset} className="cursor-pointer rounded-xl bg-primary px-6 py-3 font-black text-white">{t('pos_new_sale')}</button></div>
          </div> : <>
            <div className="border-b border-slate-100 p-3 dark:border-slate-800">
              <IconSelect value={partnerId} onChange={setPartnerId} icon={UserRound} ariaLabel={t('pos_customer')} placeholder={t('pos_customer')} searchable searchPlaceholder={t('search')} noResults={t('empty')}
                options={data.partners.map(p => ({ value: String(p.id), label: `${p.name}${p.tax_number ? ` · ${p.tax_number}` : ''}`, icon: UserRound }))} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {!lines.length ? <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate-400"><ReceiptText className="h-10 w-10" />{t('pos_cart_empty')}</div>
                : <ul className="divide-y divide-slate-100 dark:divide-slate-800">{lines.map(l => <li key={l.key}>
                  <button type="button" onClick={() => { setSelected(l.key); setBuffer(''); setTarget('quantity'); }} className={cn('flex w-full cursor-pointer items-start justify-between gap-3 px-4 py-3 text-left', selected === l.key && 'bg-primary/5')}>
                    <span className="min-w-0"><span className="block truncate text-sm font-bold">{l.description}</span><span className="text-xs text-slate-500">{l.quantity} × {money(l.unit_price)} · {rate(l) ?? '?'}%</span></span>
                    <span className="shrink-0 text-sm font-black tabular-nums">{money(num(l.quantity) * num(l.unit_price))}</span>
                  </button>
                  {selected === l.key && <div className="space-y-2 px-4 pb-3">
                    <div className="flex items-center gap-2">
                      <button type="button" aria-label={t('remove')} onClick={() => updateLine(l.key, { quantity: String(Math.max(1, num(l.quantity) - 1)) })} className="cursor-pointer rounded-lg bg-slate-100 p-2 dark:bg-slate-800"><Minus className="h-4 w-4" /></button>
                      <button type="button" aria-label={t('addLine')} onClick={() => updateLine(l.key, { quantity: String(num(l.quantity) + 1) })} className="cursor-pointer rounded-lg bg-slate-100 p-2 dark:bg-slate-800"><Plus className="h-4 w-4" /></button>
                      {l.description === t('pos_manual') || !l.workspace_id ? <input value={l.description} onChange={e => updateLine(l.key, { description: e.target.value })} aria-label={t('description')} className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-2 text-sm dark:border-slate-700 dark:bg-slate-950" /> : <span className="flex-1" />}
                      <button type="button" aria-label={t('remove')} onClick={() => { setLines(lines.filter(x => x.key !== l.key)); setSelected(null); }} className="cursor-pointer rounded-lg bg-rose-500/10 p-2 text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <button type="button" onClick={() => setLineSettings(!lineSettings)} className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold text-slate-500">{t('pos_item_settings')}<ChevronDown className={cn('h-3 w-3 transition', lineSettings && 'rotate-180')} /></button>
                    {lineSettings && <div className="grid gap-2 sm:grid-cols-2"><KeyField acc={acc} name="account_id" value={l.account_id} onChange={v => updateLine(l.key, { account_id: v })} /><KeyField acc={acc} name="tax_rule_id" value={l.tax_rule_id} onChange={v => updateLine(l.key, { tax_rule_id: v })} /></div>}
                  </div>}
                </li>)}</ul>}
            </div>

            <div className="space-y-3 border-t border-slate-200 p-3 dark:border-slate-800">
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">{t('net')}</span><span className="tabular-nums">{money(net)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">{t('tax')}</span><span className="tabular-nums">{money(vat)}</span></div>
                  <div className="flex items-baseline justify-between border-t border-slate-100 pt-1 dark:border-slate-800"><span className="font-black">{t('total')}</span><span className="text-3xl font-black tabular-nums text-primary">{money(total)}</span></div>
                  {method === 'cash' && <div className="flex justify-between text-xs"><button type="button" onClick={() => { setTarget('received'); setBuffer(''); }} className={cn('cursor-pointer font-bold', target === 'received' ? 'text-primary' : 'text-slate-500')}>{t('pos_received')}: {money(received || 0)}</button><span className={cn('font-bold', change < 0 ? 'text-rose-500' : 'text-emerald-600')}>{t('pos_change')}: {received ? money(change) : '—'}</span></div>}
                </div>
                <div className="w-[168px]">
                  <div className="mb-1 grid grid-cols-2 gap-1 text-[10px] font-bold">{(['quantity', 'unit_price'] as const).map(k => <button key={k} type="button" disabled={!current} onClick={() => { setTarget(k); setBuffer(''); }} className={cn('cursor-pointer rounded-md py-1 disabled:opacity-40', target === k ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800')}>{t(k === 'quantity' ? 'pos_qty' : 'pos_price')}</button>)}</div>
                  <div className="grid grid-cols-3 gap-1">{['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', '⌫'].map(k => <button key={k} type="button" disabled={target !== 'received' && !current} onClick={() => press(k)} className="flex h-10 cursor-pointer items-center justify-center rounded-lg bg-slate-100 text-base font-bold active:scale-95 disabled:opacity-40 dark:bg-slate-800">{k === '⌫' ? <Delete className="h-4 w-4" /> : k}</button>)}</div>
                </div>
              </div>
              <div className="grid grid-cols-5 gap-1.5">{METHODS.map(({ id, icon: Icon }) => <button key={id} type="button" onClick={() => setMethod(id)} className={cn('flex cursor-pointer flex-col items-center gap-1 rounded-xl border py-2 text-[11px] font-bold', method === id ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-500 dark:border-slate-700')}><Icon className="h-5 w-5" />{t(`pay_${id}`)}</button>)}</div>
              {error && <Notice tone="bad">{error}</Notice>}
              {!error && lines.length > 0 && missing.length > 0 && <Notice tone="warn">{t('pos_missing')} {missing.join(', ')}</Notice>}
              <div className="grid grid-cols-[auto_auto_1fr] gap-2">
                <button type="button" disabled={busy || !lines.length} onClick={reset} className="cursor-pointer rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-500 disabled:opacity-40 dark:border-slate-700">{t('pos_cancel')}</button>
                <button type="button" disabled={busy || !lines.length || !partnerId || !can('prepare')} onClick={saveDraft} className="cursor-pointer rounded-xl border border-slate-200 px-3 text-sm font-bold disabled:opacity-40 dark:border-slate-700">{t('pos_hold')}</button>
                <button type="button" disabled={busy || missing.length > 0 || !can('prepare')} onClick={charge} className="h-16 cursor-pointer rounded-2xl bg-emerald-500 text-lg font-black text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-600 active:scale-[0.99] disabled:opacity-40">{busy ? '…' : `${t('pos_charge')} ${money(total, 'KM')}`}</button>
              </div>
            </div>
          </>}
        </aside>
      </div>
    </div>
  );
}
