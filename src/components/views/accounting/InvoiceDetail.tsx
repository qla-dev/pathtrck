import { useState } from 'react';
import { ArrowLeft, BookCheck, FileText, History, ListChecks, Paperclip, Printer, ReceiptText, Send, WalletCards } from 'lucide-react';

import { api } from '../../../services/api';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Notice } from '../../ui/Notice';
import { RecordTable } from '../../ui/RecordTable';
import { StatusBadge } from '../../ui/StatusBadge';
import { Tabs } from '../../ui/Tabs';
import { type Accounting, FieldGrid, money, type Row, shortDate, statusTone, today } from './shared';

type Tab = 'items' | 'posting' | 'payments' | 'history';

/** Detail page of one invoice: header with status and the actions its state allows, section tabs, and a summary card. */
export function InvoiceDetail({ acc, invoice, onBack, onEdit, openForm }: { acc: Accounting; invoice: Row; onBack: () => void; onEdit: (invoice: Row) => void; openForm: (name: string, defaults?: Row) => void }) {
  const { t, can, busy, data, run, send, company } = acc;
  const [tab, setTab] = useState<Tab>('items');
  const [posting, setPosting] = useState<Row>({});
  const [preview, setPreview] = useState<Row[]>([]);
  const outgoing = invoice.direction === 'outgoing';
  const action = (name: string) => run(() => send(`invoices/${invoice.id}/${name}`, posting));
  const statuses = [invoice.approval_status, ...(outgoing ? [invoice.issuance_status, `fiscal_${invoice.fiscal_status || 'none'}`] : []), invoice.posting_status, invoice.payment_status].filter(Boolean);
  const accountCode = (id: unknown) => data.accounts.find(a => a.id === id)?.code ?? id;
  const ledgerLines = preview.length ? preview : data.entries.find(e => e.invoice_id === invoice.id)?.lines || [];

  const actions = <>
    {can('prepare') && ['draft', 'rejected'].includes(invoice.approval_status) && invoice.issuance_status === 'draft' && <>
      {!invoice.corrects_invoice_id && <Button size="sm" variant="outline" onClick={() => onEdit(invoice)}>{t('save')}</Button>}
      <Button size="sm" disabled={busy} onClick={() => void action('submit')} className="gap-1.5"><Send className="h-3.5 w-3.5" />{t('submit')}</Button>
    </>}
    {can('approve') && invoice.approval_status === 'pending' && <>
      <Button size="sm" disabled={busy} onClick={() => void action('approve')}>{t('approve')}</Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void action('reject')}>{t('reject')}</Button>
    </>}
    {can('prepare') && outgoing && invoice.approval_status === 'approved' && invoice.issuance_status === 'draft' && <Button size="sm" disabled={busy} onClick={() => void action('issue')}>{t('issue')}</Button>}
    {invoice.issuance_status === 'issued' && <>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => api.accounting.print(company, invoice.id))} className="gap-1.5"><Printer className="h-3.5 w-3.5" />{t('print')}</Button>
      {can('prepare') && <Button size="sm" variant="outline" onClick={() => openForm('deliver', { id: invoice.id, request_key: crypto.randomUUID(), document_ids: [] })}>{t('deliver')}</Button>}
    </>}
    {can('pos') && outgoing && invoice.issuance_status === 'issued' && !invoice.corrects_invoice_id && ['none', 'failed', undefined, null].includes(invoice.fiscal_status) && <Button size="sm" disabled={busy} onClick={() => openForm('fiscalise', { id: invoice.id, payment_method: 'cash', request_key: crypto.randomUUID() })} className="gap-1.5"><ReceiptText className="h-3.5 w-3.5" />{t('fiscalise')}</Button>}
    {can('pos') && invoice.fiscal_status === 'fiscalised' && <>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => send('pos/reports/duplicate', { invoice_id: invoice.id, request_key: crypto.randomUUID() }))}>{t('pos_duplicate')}</Button>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => openForm('refund', { id: invoice.id, request_key: crypto.randomUUID() })}>{t('refund')}</Button>
    </>}
    {can('pos') && ['unconfirmed', 'refund_unconfirmed'].includes(invoice.fiscal_status) && <Button size="sm" variant="outline" disabled={busy} onClick={() => openForm('confirmFiscal', { id: invoice.id })}>{t('confirmFiscal')}</Button>}
    {can('correct') && invoice.posting_status === 'posted' && !invoice.corrects_invoice_id && !data.invoices.some(i => i.corrects_invoice_id === invoice.id) && <Button size="sm" variant="outline" onClick={() => openForm('corrective', { id: invoice.id, posting_date: today() })}>{t('correction')}</Button>}
  </>;

  return <div className="space-y-3">
    <Card className="shadow-none" contentClassName="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onBack} aria-label={t('back')}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="min-w-0">
          <p className="truncate text-lg font-black text-primary">{invoice.supplier_number || invoice.number}</p>
          <p className="truncate text-xs text-slate-500">{invoice.partner_name || '—'} · {t(invoice.direction)} · {shortDate(invoice.issued_at)}</p>
        </div>
        <div className="flex flex-wrap gap-1">{statuses.map((s, i) => <StatusBadge key={i} tone={statusTone(s)}>{t(s)}</StatusBadge>)}</div>
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </Card>

    {['unconfirmed', 'refund_unconfirmed'].includes(invoice.fiscal_status) && <Notice tone="warn">{t('fiscalUnconfirmed')}</Notice>}
    {invoice.tax_unknown && <Notice tone="warn">{t('unknown')}</Notice>}
    {invoice.duplicate_warning && <Notice tone="warn">{t('duplicate')}</Notice>}

    <section className="grid min-w-0 gap-3 xl:grid-cols-12">
      <Card className="min-w-0 shadow-none xl:col-span-8" contentClassName="p-0">
        <Tabs<Tab> className="px-3" label={t('details')} value={tab} onChange={setTab} items={[
          { value: 'items', label: t(outgoing ? 'lines' : 'items_costs'), icon: ListChecks, count: invoice.items.length },
          { value: 'posting', label: t('tab_posting'), icon: BookCheck },
          { value: 'payments', label: t('tab_payments'), icon: WalletCards },
          { value: 'history', label: t('tab_history'), icon: History },
        ]} />
        <div className="space-y-4 p-4">
          {tab === 'items' && <>
            <RecordTable dense empty={t('empty')} rows={invoice.items} columns={[
              { key: 'description', header: t('description') },
              { key: 'quantity', header: t('quantity'), align: 'right' },
              { key: 'unit_price', header: t('unit_price'), align: 'right', render: r => money(r.unit_price) },
              { key: 'tax_rate', header: t('tax_rate'), align: 'right', render: r => r.tax_rate == null ? '?' : `${r.tax_rate}%` },
              { key: 'tax_amount', header: t('tax_amount'), align: 'right', render: r => r.tax_amount == null ? '—' : money(r.tax_amount) },
              { key: 'total', header: t('total'), align: 'right', render: r => <strong>{money(r.total)}</strong> },
              { key: 'tax_rule_id', header: t('tax_rule_id'), render: r => data.rules.find(rule => rule.id === r.tax_rule_id)?.name },
            ]} />
            {!outgoing && <div className="space-y-2">
              <p className="text-sm font-black">{t('costAllocation')}</p>
              <p className="text-xs text-slate-500">{t('replacement')}</p>
              <RecordTable dense empty={t('empty')} rows={invoice.allocations} columns={[
                { key: 'description', header: t('description'), render: a => invoice.items.find((i: Row) => i.id === a.invoice_item_id)?.description },
                { key: 'workspace_id', header: t('workspace_id'), render: a => a.workspace_id ? data.jobs.find(j => j.id === a.workspace_id)?.reference ?? a.workspace_id : t('overhead') },
                { key: 'amount', header: t('amount'), align: 'right', render: a => money(a.amount) },
                { key: 'estimate_id', header: t('estimate_id') },
              ]} />
            </div>}
          </>}
          {tab === 'posting' && <>
            <Notice tone={invoice.posting_status === 'unposted' ? 'info' : 'warn'}>{t(invoice.posting_status === 'unposted' ? 'event_unposted' : 'event_posted')} · {t('noTaxAssumption')}</Notice>
            <FieldGrid acc={acc} keys={['control_account_id', 'vat_account_id']} object={posting} onChange={setPosting} columns="sm:grid-cols-2" />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={busy} onClick={() => void run(async () => setPreview((await send(`invoices/${invoice.id}/preview`, { ...posting, vat_account_id: posting.vat_account_id || null })).data as unknown as Row[]))}>{t('preview')}</Button>
              {can('post') && invoice.approval_status === 'approved' && invoice.posting_status === 'unposted' && (!outgoing || invoice.issuance_status === 'issued') && <Button disabled={busy || !preview.length} onClick={() => void action('post')}>{t('post')}</Button>}
            </div>
            <RecordTable dense empty={t('empty')} rows={ledgerLines} columns={[
              { key: 'account_id', header: t('account_id'), render: l => accountCode(l.account_id) },
              { key: 'debit', header: t('debit'), align: 'right', render: l => money(l.debit) },
              { key: 'credit', header: t('credit'), align: 'right', render: l => money(l.credit) },
            ]} />
          </>}
          {tab === 'payments' && <>
            {can('payments') && can('post') && invoice.posting_status === 'posted' && <Button onClick={() => openForm('allocations', { invoice_id: invoice.id, posting_date: today(), request_key: crypto.randomUUID() })}>{t('allocate')}</Button>}
            <RecordTable dense empty={t('empty')} rows={data.allocations.filter(a => a.invoice_id === invoice.id)} columns={[
              { key: 'bank_transaction_id', header: t('bank_transaction_id'), render: a => data.bank.find(b => b.id === a.bank_transaction_id)?.reference ?? a.bank_transaction_id },
              { key: 'amount', header: t('amount'), align: 'right', render: a => money(a.amount, invoice.currency) },
              { key: 'confirmed_by', header: t('confirmed_by') },
              { key: 'created_at', header: t('created_at'), render: a => shortDate(a.created_at) },
            ]} />
          </>}
          {tab === 'history' && <RecordTable dense empty={t('empty')} rows={data.audit.filter(a => a.entity_type === 'invoice' && a.entity_id === invoice.id)} columns={[
            { key: 'action', header: t('action'), render: a => t(a.action) },
            { key: 'user_name', header: t('user_name') },
            { key: 'created_at', header: t('created_at'), render: a => String(a.created_at ?? '').slice(0, 16).replace('T', ' ') },
          ]} />}
        </div>
      </Card>

      <Card className="shadow-none xl:col-span-4" contentClassName="space-y-4 p-4">
        <p className="flex items-center gap-2 text-sm font-black"><FileText className="h-4 w-4 text-primary" />{t('summary')}</p>
        <dl className="space-y-2 text-xs">
          {[[t('net'), invoice.tax_unknown ? '—' : money(invoice.subtotal, invoice.currency)], [t('tax'), invoice.tax_unknown ? '?' : money(invoice.tax, invoice.currency)]].map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="font-bold">{value}</dd></div>)}
          <div className="flex justify-between gap-3 border-t border-slate-100 pt-2 text-sm dark:border-slate-800"><dt className="font-bold">{t('total')}</dt><dd className="font-black text-primary">{invoice.tax_unknown ? '—' : money(invoice.total, invoice.currency)}</dd></div>
          {[[t('paid'), money(invoice.paid_amount, invoice.currency)], [t('remaining'), money(invoice.remaining_amount, invoice.currency)]].map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt className="text-slate-500">{label}</dt><dd className="font-bold">{value}</dd></div>)}
        </dl>
        <dl className="space-y-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
          {['partner_tax_number', 'issued_at', 'due_at', 'event_date', 'tax_date', 'posting_date', 'exchange_rate', 'exchange_source'].map(k => <div key={k} className="flex justify-between gap-3"><dt className="text-slate-500">{t(k)}</dt><dd className="text-right font-semibold">{/(_at|_date)$/.test(k) ? shortDate(invoice[k]) : invoice[k] || '—'}</dd></div>)}
          {invoice.fiscal_number && <div className="flex justify-between gap-3"><dt className="text-slate-500">{t('fiscal_number')}</dt><dd className="font-bold">#{invoice.fiscal_number} · {t(`pay_${invoice.fiscal_payment_method}`)}{invoice.fiscal_refund_number ? ` · ${t('refund')} #${invoice.fiscal_refund_number}` : ''}</dd></div>}
        </dl>
        <div className="space-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <p className="text-xs font-bold text-slate-500">{t('documents')}</p>
          {invoice.documents.length ? invoice.documents.map((d: Row) => <button key={d.id} type="button" onClick={() => void run(() => api.documents.open(d.id, d.name, true))} className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800"><Paperclip className="h-3.5 w-3.5 text-primary" /><span className="truncate">{d.name}</span></button>) : <p className="text-xs text-slate-400">—</p>}
        </div>
      </Card>
    </section>
  </div>;
}
