import { useState, type ReactNode } from 'react';
import { Download, Plus, ShieldCheck } from 'lucide-react';

import { api } from '../../../services/api';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { HeaderStatCard } from '../../ui/PageHeader';
import { Notice } from '../../ui/Notice';
import { RecordTable } from '../../ui/RecordTable';
import { StatusBadge } from '../../ui/StatusBadge';
import { Banknote, Scale, TrendingDown, TrendingUp } from 'lucide-react';
import { type Accounting, downloadCsv, FieldGrid, money, type Row, shortDate, statusTone, today } from './shared';

type Open = (name: string, defaults?: Row) => void;
type PanelProps = { acc: Accounting; openForm: Open };

/** Card with a title row and the toolbar of a ledger section; the table goes edge to edge below it. */
const Section = ({ title, note, actions, children }: { title: string; note?: string; actions?: ReactNode; children: ReactNode }) => (
  <Card className="min-w-0 shadow-none" contentClassName="p-0">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
      <div className="min-w-0"><p className="text-sm font-black dark:text-white">{title}</p>{note && <p className="mt-0.5 text-xs text-slate-500">{note}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
    {children}
  </Card>
);
const add = (label: string, onClick: () => void, variant: 'primary' | 'outline' = 'primary') => <Button size="sm" variant={variant} onClick={onClick} className="gap-1.5">{variant === 'primary' && <Plus className="h-3.5 w-3.5" />}{label}</Button>;
const exportButton = (label: string, onClick: () => void) => <Button size="sm" variant="outline" onClick={onClick} className="gap-1.5"><Download className="h-3.5 w-3.5" />{label}</Button>;
const DateRange = ({ acc, onSubmit, form, setForm, extra }: { acc: Accounting; onSubmit: () => void; form: Row; setForm: (next: Row) => void; extra?: ReactNode }) => (
  <form className="flex flex-wrap items-end gap-3 p-4" onSubmit={e => { e.preventDefault(); onSubmit(); }}>
    <div className="w-full max-w-md"><FieldGrid acc={acc} keys={['from', 'to']} object={form} onChange={setForm} required columns="grid-cols-2" /></div>
    <Button disabled={acc.busy}>{acc.t('preview')}</Button>{extra}
  </form>
);

export function AccountsPanel({ acc, openForm }: PanelProps) {
  const { t, can, data } = acc;
  const rows: Row[] = data.accounts.map(a => { const b = data.balances.find(x => x.account_id === a.id); return { ...a, debit: b?.debit || '0.00', credit: b?.credit || '0.00', balance: (Number(b?.debit || 0) - Number(b?.credit || 0)).toFixed(2) }; });
  return <Section title={t('accounts')} actions={<>{can('setup') && <>{add(t('create'), () => openForm('accounts'))}{add(t('importAccounts'), () => openForm('importAccounts'), 'outline')}</>}{exportButton(t('export'), () => downloadCsv(rows, 'accounts'))}</>}>
    <RecordTable empty={t('empty')} rows={rows} columns={[
      { key: 'code', header: t('code'), render: a => <span className="font-mono font-bold">{a.code}</span> }, { key: 'name', header: t('name') },
      { key: 'kind', header: t('kind'), render: a => t(a.kind) }, { key: 'active', header: t('status'), render: a => <StatusBadge tone={a.active ? 'ok' : 'muted'}>{t(a.active ? 'open' : 'locked')}</StatusBadge> },
      { key: 'debit', header: t('debit'), align: 'right', render: a => money(a.debit) }, { key: 'credit', header: t('credit'), align: 'right', render: a => money(a.credit) },
      { key: 'balance', header: t('balance'), align: 'right', render: a => <strong>{money(a.balance)}</strong> },
    ]} />
  </Section>;
}

export function JournalPanel({ acc, openForm }: PanelProps) {
  const { t, can, data } = acc;
  const start = (prefix: string) => openForm('journal', { event_key: `${prefix}:${crypto.randomUUID()}`, posting_date: today(), lines: [{ account_id: '', debit: '0', credit: '0' }, { account_id: '', debit: '0', credit: '0' }] });
  const code = (id: unknown) => data.accounts.find(a => a.id === id)?.code ?? id;
  return <Section title={t('journal')} actions={<>{can('post') && <>{add(t('manual'), () => start('manual'))}{add(t('opening'), () => start('opening'), 'outline')}</>}{exportButton(t('export'), () => downloadCsv(data.entries.flatMap(e => e.lines.map((l: Row) => ({ ...l, posting_date: e.posting_date, description: e.description, event_key: e.event_key }))), 'journal'))}</>}>
    {!data.entries.length ? <RecordTable empty={t('empty')} rows={[]} columns={[]} /> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{data.entries.map(entry => (
      <div key={entry.id} className="p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold">{shortDate(entry.posting_date)} · {entry.description}</p>
          {can('correct') && /^(manual|opening):/.test(entry.event_key) && !data.entries.some(e => e.reverses_entry_id === entry.id) && <Button size="sm" variant="outline" onClick={() => openForm('reverse', { id: entry.id, posting_date: today() })}>{t('reversal')}</Button>}
        </div>
        <RecordTable dense empty={t('empty')} rows={entry.lines} columns={[
          { key: 'account_id', header: t('account_id'), render: l => <span className="font-mono">{code(l.account_id)}</span> },
          { key: 'debit', header: t('debit'), align: 'right', render: l => money(l.debit) }, { key: 'credit', header: t('credit'), align: 'right', render: l => money(l.credit) },
        ]} />
      </div>
    ))}</div>}
  </Section>;
}

export function BankPanel({ acc, openForm }: PanelProps) {
  const { t, can, data } = acc;
  return <Section title={t('bank')} actions={<>{can('payments') && add(t('create'), () => openForm('bank', { direction: 'incoming', transaction_date: today(), currency: data.settings?.base_currency, exchange_rate: '1', exchange_source: 'base_currency' }))}{can('payments') && can('post') && add(t('allocate'), () => openForm('allocations', { posting_date: today(), request_key: crypto.randomUUID() }), 'outline')}</>}>
    <RecordTable empty={t('empty')} rows={data.bank} columns={[
      { key: 'reference', header: t('reference'), render: b => <span className="font-bold">{b.reference}</span> }, { key: 'partner_name', header: t('partner_name') },
      { key: 'direction', header: t('direction'), render: b => <StatusBadge tone={b.direction === 'incoming' ? 'ok' : 'info'}>{t(b.direction)}</StatusBadge> },
      { key: 'transaction_date', header: t('transaction_date'), render: b => shortDate(b.transaction_date) },
      { key: 'amount', header: t('amount'), align: 'right', render: b => money(b.amount, b.currency) }, { key: 'allocated_amount', header: t('allocated_amount'), align: 'right', render: b => money(b.allocated_amount, b.currency) },
    ]} />
  </Section>;
}

export function AdvancesPanel({ acc, openForm }: PanelProps) {
  const { t, can, data } = acc;
  return <Section title={t('advances')} actions={can('payments') && can('post') ? add(t('create'), () => openForm('advances')) : undefined}>
    <RecordTable empty={t('empty')} rows={data.advances} columns={[
      { key: 'partner_name', header: t('partner_name') }, { key: 'bank_transaction_id', header: t('bank_transaction_id'), render: a => data.bank.find(b => b.id === a.bank_transaction_id)?.reference ?? a.bank_transaction_id },
      { key: 'amount', header: t('amount'), align: 'right', render: a => money(a.amount) }, { key: 'settled_amount', header: t('settled_amount'), align: 'right', render: a => money(a.settled_amount) },
    ]} />
  </Section>;
}

export function VatPanel({ acc }: { acc: Accounting }) {
  const { t, run, company } = acc;
  const [range, setRange] = useState<Row>({ from: `${today().slice(0, 8)}01`, to: today() }); const [rows, setRows] = useState<Row[]>([]);
  return <Section title={t('vat')} note={t('noTaxAssumption')}>
    <DateRange acc={acc} form={range} setForm={setRange} onSubmit={() => void run(async () => setRows((await api.accounting.get<Row[]>(company, `vat?from=${range.from}&to=${range.to}`)).data))} extra={exportButton(t('export'), () => downloadCsv(rows, 'vat'))} />
    <RecordTable empty={t('empty')} minWidth="min-w-[900px]" rows={rows} columns={[
      { key: 'number', header: t('number') }, { key: 'supplier_number', header: t('supplier_number') }, { key: 'direction', header: t('direction'), render: r => t(r.direction) },
      { key: 'tax_date', header: t('tax_date'), render: r => shortDate(r.tax_date) }, { key: 'net_base', header: t('net_base'), align: 'right', render: r => money(r.net_base) },
      { key: 'vat_base', header: t('vat_base'), align: 'right', render: r => money(r.vat_base) }, { key: 'deductible_base', header: t('deductible_base'), align: 'right', render: r => money(r.deductible_base) },
      { key: 'version', header: t('version') }, { key: 'article', header: t('article') },
    ]} />
  </Section>;
}

export function PeriodsPanel({ acc, openForm }: PanelProps) {
  const { t, can, data } = acc;
  return <Section title={t('periods')} actions={can('periods') ? add(t('create'), () => openForm('periods')) : undefined}>
    <RecordTable empty={t('empty')} rows={data.periods} columns={[
      { key: 'name', header: t('name'), render: p => <span className="font-bold">{p.name}</span> }, { key: 'starts_on', header: t('starts_on'), render: p => shortDate(p.starts_on) }, { key: 'ends_on', header: t('ends_on'), render: p => shortDate(p.ends_on) },
      { key: 'status', header: t('status'), render: p => <StatusBadge tone={statusTone(p.status)}>{t(p.status)}</StatusBadge> },
      { key: 'action', header: '', align: 'right', render: p => can('periods') ? <Button size="sm" variant="outline" onClick={() => openForm('periodStatus', { id: p.id, status: p.status === 'open' ? 'locked' : 'open' })}>{t(p.status === 'open' ? 'lock' : 'reopen')}</Button> : null },
    ]} />
  </Section>;
}

export function RulesPanel({ acc, openForm }: PanelProps) {
  const { t, can, data } = acc;
  return <Section title={t('rules')} note={t('noTaxAssumption')} actions={can('rules') ? add(t('create'), () => openForm('rules', { tax_type: 'vat', jurisdiction: data.settings?.jurisdiction })) : undefined}>
    <RecordTable empty={t('empty')} minWidth="min-w-[900px]" rows={data.rules} columns={[
      { key: 'name', header: t('name'), render: r => <span className="font-bold">{r.name}</span> }, { key: 'jurisdiction', header: t('jurisdiction') }, { key: 'treatment', header: t('treatment') },
      { key: 'rate', header: t('rate'), align: 'right', render: r => r.rate == null ? '?' : `${r.rate}%` }, { key: 'deductible_percent', header: t('deductible_percent'), align: 'right' },
      { key: 'version', header: t('version') }, { key: 'article', header: t('article') },
      { key: 'verification_status', header: t('verification_status'), render: r => <StatusBadge tone={statusTone(r.verification_status)}>{t(r.verification_status)}</StatusBadge> },
      { key: 'action', header: '', align: 'right', render: r => <div className="flex justify-end gap-2">{/^https?:\/\//.test(r.source_url) && <a className="text-xs font-bold text-primary underline" href={r.source_url} target="_blank" rel="noreferrer">{t('source_url')}</a>}{can('rules') && !r.approved_by && <Button size="sm" onClick={() => openForm('approveRule', { id: r.id })}>{t('approve')}</Button>}</div> },
    ]} />
  </Section>;
}

export function MarginsPanel({ acc, openForm }: PanelProps) {
  const { t, can, data } = acc;
  const job = (id: unknown) => data.jobs.find(j => j.id === id)?.reference ?? id;
  return <div className="grid min-w-0 gap-3 xl:grid-cols-2">
    <Section title={t('margins')} note={t('marginNote')}>
      <RecordTable empty={t('empty')} rows={data.job_margins} rowKey={(r, i) => `${r.workspace_id}-${r.currency}-${i}`} columns={[
        { key: 'workspace_id', header: t('workspace_id'), render: r => <span className="font-bold">{job(r.workspace_id)}</span> }, { key: 'revenue', header: t('revenue'), align: 'right', render: r => money(r.revenue, r.currency) },
        { key: 'cost', header: t('cost'), align: 'right', render: r => money(r.cost, r.currency) }, { key: 'margin', header: t('margin'), align: 'right', render: r => <strong className={Number(r.margin) < 0 ? 'text-rose-600' : 'text-emerald-600'}>{money(r.margin, r.currency)}</strong> },
      ]} />
    </Section>
    <Section title={t('estimates')} actions={can('prepare') ? add(t('create'), () => openForm('estimates', { currency: data.settings?.base_currency })) : undefined}>
      <RecordTable empty={t('empty')} rows={data.estimates} columns={[
        { key: 'workspace_id', header: t('workspace_id'), render: r => job(r.workspace_id) }, { key: 'description', header: t('description') }, { key: 'amount', header: t('amount'), align: 'right', render: r => money(r.amount, r.currency) },
      ]} />
    </Section>
  </div>;
}

export function PartnersPanel({ acc, openForm }: PanelProps) {
  const { t, can, data } = acc;
  return <div className="grid min-w-0 gap-3 xl:grid-cols-12">
    <div className="min-w-0 xl:col-span-7"><Section title={t('partners')} actions={can('prepare') ? add(t('create'), () => openForm('partners', { country_code: 'BA' })) : undefined}>
      <RecordTable empty={t('empty')} rows={data.partners} columns={[
        { key: 'name', header: t('name'), render: p => <span className="font-bold">{p.name}</span> }, { key: 'tax_number', header: t('tax_number') }, { key: 'vat_number', header: t('vat_number') }, { key: 'country_code', header: t('country_code') }, { key: 'email', header: t('email') },
      ]} />
    </Section></div>
    <div className="min-w-0 xl:col-span-5"><Section title={t('remaining_amount')}>
      <RecordTable empty={t('empty')} rows={data.invoices.filter(i => i.posting_status === 'posted' && !i.corrects_invoice_id && Number(i.remaining_amount) > 0)} columns={[
        { key: 'partner_name', header: t('partner_name') }, { key: 'direction', header: t('direction'), render: i => <StatusBadge tone={i.direction === 'incoming' ? 'warn' : 'info'}>{t(i.direction)}</StatusBadge> },
        { key: 'remaining_amount', header: t('remaining_amount'), align: 'right', render: i => money(i.remaining_amount, i.currency) },
      ]} />
    </Section></div>
  </div>;
}

export function ReportsPanel({ acc }: { acc: Accounting }) {
  const { t, run, company } = acc;
  const [range, setRange] = useState<Row>({ from: `${today().slice(0, 4)}-01-01`, to: today() }); const [report, setReport] = useState<Row | null>(null);
  const icons: Record<string, typeof Scale> = { income: TrendingUp, expense: TrendingDown, asset: Banknote };
  return <Section title={t('reports')}>
    <DateRange acc={acc} form={range} setForm={setRange} onSubmit={() => void run(async () => setReport((await api.accounting.get<Row>(company, `reports?from=${range.from}&to=${range.to}`)).data))} extra={report ? exportButton(t('export'), () => downloadCsv(report.trial_balance, 'trial-balance')) : undefined} />
    {report && <div className="space-y-3 px-4 pb-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Object.entries(report.categories).map(([k, v]) => <HeaderStatCard key={k} label={t(k)} value={money(v, report.currency)} icon={icons[k] || Scale} />)}
        <HeaderStatCard label={t('result')} value={money(report.result, report.currency)} icon={Scale} tone={Number(report.result) < 0 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'} />
      </div>
      <RecordTable dense empty={t('empty')} rows={report.trial_balance} rowKey={r => r.code} columns={[
        { key: 'code', header: t('code'), render: r => <span className="font-mono">{r.code}</span> }, { key: 'name', header: t('name') },
        { key: 'opening_balance', header: t('opening_balance'), align: 'right', render: r => money(r.opening_balance) }, { key: 'debit', header: t('debit'), align: 'right', render: r => money(r.debit) },
        { key: 'credit', header: t('credit'), align: 'right', render: r => money(r.credit) }, { key: 'closing_balance', header: t('closing_balance'), align: 'right', render: r => <strong>{money(r.closing_balance)}</strong> },
      ]} />
    </div>}
  </Section>;
}

export function SettingsPanel({ acc, openForm }: PanelProps) {
  const { t, data } = acc;
  const settings = data.settings;
  return <Section title={t('settings')} actions={add(t(settings ? 'save' : 'create'), () => openForm('settings', settings || { jurisdiction: 'FBiH', base_currency: 'BAM', invoice_prefix: 'INV' }))}>
    <dl className="grid gap-3 p-4 sm:grid-cols-3">{['jurisdiction', 'base_currency', 'invoice_prefix'].map(k => <div key={k} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t(k)}</dt><dd className="mt-1 text-lg font-black">{settings?.[k] ?? '—'}</dd></div>)}</dl>
  </Section>;
}

export function PermissionsPanel({ acc }: { acc: Accounting }) {
  const { t, context, busy, run, send } = acc;
  const [form, setForm] = useState<Row>({ user_id: context?.user_id ?? '', abilities: [] });
  if (!context) return null;
  return <Section title={t('permissions')} actions={<StatusBadge tone="info" icon={ShieldCheck}>{context.company?.name}</StatusBadge>}>
    <form className="space-y-4 p-4" onSubmit={e => { e.preventDefault(); void run(() => send('permissions', { user_id: form.user_id, abilities: form.abilities })); }}>
      <div className="max-w-xs"><FieldGrid acc={acc} keys={['user_id']} object={form} onChange={setForm} required columns="grid-cols-1" /></div>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">{context.available_abilities.map(a => <label key={a} className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold has-[:checked]:border-primary has-[:checked]:bg-primary/5 dark:border-slate-700"><input type="checkbox" checked={form.abilities.includes(a)} onChange={e => setForm({ ...form, abilities: e.target.checked ? [...form.abilities, a] : form.abilities.filter((v: string) => v !== a) })} />{t(a)}</label>)}</div>
      <Button disabled={busy}>{t('grant')}</Button>
    </form>
  </Section>;
}

export const NotConfigured = ({ acc, openForm }: PanelProps) => <Notice tone="warn"><span className="mr-3">{acc.t('settings')}</span>{acc.can('setup') && <Button size="sm" onClick={() => openForm('settings', { jurisdiction: 'FBiH', base_currency: 'BAM', invoice_prefix: 'INV' })}>{acc.t('create')}</Button>}</Notice>;
