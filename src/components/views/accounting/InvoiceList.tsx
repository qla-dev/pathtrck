import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { cn } from '../../../lib/cn';
import { Card } from '../../ui/Card';
import { RecordTable } from '../../ui/RecordTable';
import { StatusBadge } from '../../ui/StatusBadge';
import { type Accounting, money, type Row, shortDate, statusTone } from './shared';

const FILTERS: Record<string, (i: Row) => boolean> = {
  all: () => true,
  draft: i => ['draft', 'rejected'].includes(i.approval_status),
  pending: i => i.approval_status === 'pending',
  unposted: i => i.approval_status === 'approved' && i.posting_status === 'unposted',
  unpaid: i => i.posting_status === 'posted' && i.payment_status !== 'paid',
  paid: i => i.payment_status === 'paid',
};

/** Invoice list of one direction, with status chips and search, in the Finance list layout. */
export function InvoiceList({ acc, direction, onSelect }: { acc: Accounting; direction: 'incoming' | 'outgoing'; onSelect: (invoice: Row) => void }) {
  const { t, data, loading } = acc;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const all = useMemo(() => data.invoices.filter(i => i.direction === direction), [data.invoices, direction]);
  const rows = all.filter(FILTERS[filter]).filter(i => `${i.number} ${i.supplier_number} ${i.partner_name}`.toLowerCase().includes(query.toLowerCase()));
  const badge = (status: string) => status ? <StatusBadge tone={statusTone(status)}>{t(status)}</StatusBadge> : null;

  return (
    <Card className="min-w-0 shadow-none" contentClassName="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <div><p className="text-sm font-black dark:text-white">{t(direction)}</p><p className="text-xs text-slate-500">{rows.length} / {all.length}</p></div>
        <div className="flex flex-wrap gap-1">{Object.keys(FILTERS).map(key => <button key={key} type="button" onClick={() => setFilter(key)} className={cn('cursor-pointer rounded-lg px-2.5 py-1.5 text-[11px] font-bold', filter === key ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800')}>{t(key === 'all' ? 'all' : key === 'unposted' ? 'kpi_unposted' : key)}</button>)}</div>
      </div>
      <div className="p-3"><label className="relative block max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder={t('search')} className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[13px] outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white" /></label></div>
      <RecordTable loading={loading} empty={t('empty')} minWidth="min-w-[900px]" rows={rows} onRowClick={onSelect} columns={[
        { key: 'number', header: t('number'), render: i => <span className="font-black text-primary">{i.supplier_number || i.number}<span className="mt-0.5 block text-[10px] font-normal text-slate-400">{shortDate(i.issued_at)}</span></span> },
        { key: 'partner_name', header: t('partner_name'), render: i => <span className="font-semibold dark:text-white">{i.partner_name}</span> },
        { key: 'total', header: t('total'), align: 'right', render: i => i.tax_unknown ? '?' : money(i.total, i.currency) },
        { key: 'approval_status', header: t('approval_status'), render: i => badge(i.approval_status) },
        ...(direction === 'outgoing' ? [{ key: 'fiscal_status', header: t('fiscal_status'), render: (i: Row) => <StatusBadge tone={statusTone(`fiscal_${i.fiscal_status || 'none'}`)}>{t(`fiscal_${i.fiscal_status || 'none'}`)}{i.fiscal_number ? ` #${i.fiscal_number}` : ''}</StatusBadge> }] : []),
        { key: 'posting_status', header: t('posting_status'), render: i => badge(i.posting_status) },
        { key: 'payment_status', header: t('payment_status'), render: i => badge(i.payment_status) },
        { key: 'remaining_amount', header: t('remaining_amount'), align: 'right', render: i => money(i.remaining_amount, i.currency) },
      ]} />
    </Card>
  );
}
