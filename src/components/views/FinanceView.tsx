import { useMemo, useState } from 'react';
import {
  ArrowDownToLine,
  Banknote,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileSpreadsheet,
  ReceiptText,
  Search,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
} from 'lucide-react';

import { Language } from '../../types';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type InvoiceStatus = 'Paid' | 'Pending' | 'Overdue';
type Invoice = {
  id: string;
  company: string;
  route: string;
  issued: string;
  due: string;
  amount: number;
  status: InvoiceStatus;
};

const INITIAL_INVOICES: Invoice[] = [
  { id: 'INV-2026-1048', company: 'Nord Cargo GmbH', route: 'Berlin → Vienna', issued: '12.08.2026', due: '27.08.2026', amount: 2840, status: 'Pending' },
  { id: 'INV-2026-1047', company: 'Adria Freight d.o.o.', route: 'Sarajevo → Munich', issued: '10.08.2026', due: '25.08.2026', amount: 1460, status: 'Paid' },
  { id: 'INV-2026-1041', company: 'Baltic Route Sp. z o.o.', route: 'Warsaw → Zagreb', issued: '01.08.2026', due: '14.08.2026', amount: 3190, status: 'Overdue' },
  { id: 'INV-2026-1038', company: 'Benelux Transport BV', route: 'Rotterdam → Paris', issued: '28.07.2026', due: '18.08.2026', amount: 2180, status: 'Pending' },
];

const statusTone: Record<InvoiceStatus, string> = {
  Paid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  Overdue: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

const formatMoney = (value: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

export const FinanceView = ({ lang: _lang }: { lang: Language }) => {
  const [invoices, setInvoices] = useState(INITIAL_INVOICES);
  const [payouts, setPayouts] = useState([
    { id: 1, label: 'Nord Cargo GmbH · EUR 2,840', approved: false },
    { id: 2, label: 'Adria Freight d.o.o. · EUR 1,460', approved: false },
    { id: 3, label: 'EuroTrans AG · EUR 1,120', approved: false },
  ]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'All' | InvoiceStatus>('All');

  const filteredInvoices = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesQuery = `${invoice.id} ${invoice.company} ${invoice.route}`.toLowerCase().includes(normalized);
      return matchesQuery && (status === 'All' || invoice.status === status);
    });
  }, [invoices, query, status]);

  const totals = useMemo(() => ({
    receivable: invoices.filter((invoice) => invoice.status !== 'Paid').reduce((sum, invoice) => sum + invoice.amount, 0),
    overdue: invoices.filter((invoice) => invoice.status === 'Overdue').reduce((sum, invoice) => sum + invoice.amount, 0),
    paid: invoices.filter((invoice) => invoice.status === 'Paid').reduce((sum, invoice) => sum + invoice.amount, 0),
  }), [invoices]);

  const exportInvoices = () => {
    const rows = [
      ['Invoice', 'Company', 'Route', 'Issued', 'Due', 'Amount EUR', 'Status'],
      ...filteredInvoices.map((invoice) => [invoice.id, invoice.company, invoice.route, invoice.issued, invoice.due, String(invoice.amount), invoice.status]),
    ];
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'smartfreight-finance.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const markPaid = (invoiceId: string) => {
    setInvoices((current) => current.map((invoice) => invoice.id === invoiceId ? { ...invoice, status: 'Paid' } : invoice));
  };

  const metrics = [
    { label: 'Open receivables', value: formatMoney(totals.receivable), meta: 'Pending and overdue', icon: WalletCards, tone: 'text-sky-500 bg-sky-500/10' },
    { label: 'Overdue balance', value: formatMoney(totals.overdue), meta: `${invoices.filter((item) => item.status === 'Overdue').length} invoice requires action`, icon: TriangleAlert, tone: 'text-rose-500 bg-rose-500/10' },
    { label: 'Paid this period', value: formatMoney(totals.paid), meta: 'Settled and reconciled', icon: CheckCircle2, tone: 'text-emerald-500 bg-emerald-500/10' },
    { label: 'Payout approvals', value: String(payouts.filter((payout) => !payout.approved).length), meta: 'Carrier payouts awaiting approval', icon: Banknote, tone: 'text-violet-500 bg-violet-500/10' },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CircleDollarSign className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Finance & Administration</p>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Financial Control Center</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400"><ShieldCheck className="h-4 w-4" /> Finance access</span>
            <Button variant="outline" onClick={exportInvoices} className="gap-2"><ArrowDownToLine className="h-4 w-4" /> Export</Button>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm text-slate-500">
          Review invoices, monitor overdue balances, reconcile payments, approve payouts, and export financial records. Operational fleet changes remain restricted.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{metric.label}</p>
                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{metric.value}</p>
                <p className="mt-1 text-xs text-slate-500">{metric.meta}</p>
              </div>
              <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', metric.tone)}><metric.icon className="h-5 w-5" /></div>
            </div>
          </Card>
        ))}
      </section>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ReceiptText className="h-5 w-5 text-primary" />
              <p className="text-lg font-black text-slate-900 dark:text-white">Invoices & receivables</p>
            </div>
            <p className="mt-1 text-sm text-slate-500">Company billing, payment state, due dates, and reconciliation actions.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['All', 'Pending', 'Overdue', 'Paid'] as const).map((option) => (
              <button key={option} onClick={() => setStatus(option)} className={cn('rounded-xl px-3 py-2 text-xs font-bold', status === option ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}>{option}</button>
            ))}
          </div>
        </div>

        <div className="relative mt-5 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search invoice, company or route..." className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 dark:border-slate-800">
                <th className="px-3 py-3">Invoice</th><th className="px-3 py-3">Company</th><th className="px-3 py-3">Route</th><th className="px-3 py-3">Due</th><th className="px-3 py-3">Amount</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="text-sm">
                  <td className="px-3 py-4 font-bold text-slate-900 dark:text-white">{invoice.id}<p className="text-xs font-normal text-slate-500">Issued {invoice.issued}</p></td>
                  <td className="px-3 py-4 text-slate-700 dark:text-slate-300">{invoice.company}</td>
                  <td className="px-3 py-4 text-slate-500">{invoice.route}</td>
                  <td className="px-3 py-4 text-slate-500"><span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{invoice.due}</span></td>
                  <td className="px-3 py-4 font-black text-slate-900 dark:text-white">{formatMoney(invoice.amount)}</td>
                  <td className="px-3 py-4"><span className={cn('rounded-full px-2.5 py-1 text-xs font-bold', statusTone[invoice.status])}>{invoice.status}</span></td>
                  <td className="px-3 py-4 text-right">
                    {invoice.status === 'Paid' ? <span className="text-xs font-bold text-emerald-600">Reconciled</span> : <Button size="sm" variant="outline" onClick={() => markPaid(invoice.id)}>Mark paid</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center gap-2"><Banknote className="h-5 w-5 text-primary" /><p className="text-lg font-black dark:text-white">Payout approvals</p></div>
          <div className="mt-4 space-y-3">
            {payouts.map((payout) => (
              <div key={payout.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{payout.label}</span>
                {payout.approved ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Approved</span>
                ) : (
                  <Button size="sm" onClick={() => setPayouts((current) => current.map((item) => item.id === payout.id ? { ...item, approved: true } : item))}>Approve</Button>
                )}
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-primary" /><p className="text-lg font-black dark:text-white">Role permissions</p></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {['View finance overview', 'Review overdue balances', 'Approve carrier payouts', 'Export invoice records'].map((permission) => (
              <div key={permission} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-950 dark:text-slate-300"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{permission}</div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
