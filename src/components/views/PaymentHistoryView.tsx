import { useEffect, useState } from 'react';
import { FileText, Loader2, Sparkles, Zap } from 'lucide-react';
import { Language, SubscriptionPackage } from '../../types';
import { ui, flatpickrI18n } from '../../i18n';
import { Card } from '../ui/Card';
import { InlineDataState } from '../ui/InlineDataState';
import { api } from '../../services/api';
import { planName } from '../pricing/PricingPlanCard';

type PaymentRow = {
  id: number;
  type: 'topup' | 'package';
  amount: string | number;
  currency: string;
  tokens: number;
  status: string;
  created_at: string;
  subscription_package?: { id: number; slug: string; name: string } | null;
};

export const PaymentHistoryView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [invoiceLoading, setInvoiceLoading] = useState<number | null>(null);
  const [invoiceError, setInvoiceError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.payments.list();
      setPayments((response.data as unknown as PaymentRow[]) || []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load payment history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const monthLong = (date: Date) => flatpickrI18n(lang).months.longhand[date.getMonth()];
  const formatDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    const time = parsed.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return lang === 'en'
      ? `${monthLong(parsed)} ${parsed.getDate()}, ${parsed.getFullYear()} · ${time}`
      : `${parsed.getDate()}. ${monthLong(parsed)} ${parsed.getFullYear()}. · ${time}`;
  };

  const typeLabel = (type: string) => u(`payments.type.${type}`, type === 'topup' ? 'Top-up' : 'Plan purchase');

  const generateInvoice = async (paymentId: number) => {
    if (invoiceLoading !== null) return;
    setInvoiceLoading(paymentId);
    setInvoiceError('');
    try {
      await api.paymentInvoice(paymentId);
    } catch (caught) {
      setInvoiceError(caught instanceof Error ? caught.message : u('payments.history.invoiceError', 'The invoice could not be generated.'));
    } finally {
      setInvoiceLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-black dark:text-white">{u('payments.paymentHistory', 'Payment History')}</h1>
        <p className="text-slate-500">{u('payments.history.subtitle', 'Every top-up and plan purchase on your account.')}</p>
      </div>

      {invoiceError && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{invoiceError}</p>}

      <Card contentClassName="p-0">
        {loading || error || payments.length === 0 ? (
          <div className="p-6">
            <InlineDataState loading={loading} error={error} empty={u('payments.history.empty', 'No payments yet.')} onRetry={load} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                  <th className="p-4">{u('payments.history.date', 'Date')}</th>
                  <th className="p-4">{u('payments.history.type', 'Type')}</th>
                  <th className="p-4">{u('payments.history.plan', 'Plan')}</th>
                  <th className="p-4">{u('payments.history.amount', 'Amount')}</th>
                  <th className="p-4">{u('payments.history.tokens', 'Messages')}</th>
                  <th className="p-4 text-right">{u('payments.history.invoice', 'Invoice')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-300">{formatDate(payment.created_at)}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 text-sm font-semibold dark:text-white">
                        {payment.type === 'topup' ? <Zap className="w-3.5 h-3.5 text-primary" /> : <Sparkles className="w-3.5 h-3.5 text-primary" />}
                        {typeLabel(payment.type)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                      {payment.subscription_package ? planName(u, payment.subscription_package as unknown as SubscriptionPackage) : '—'}
                    </td>
                    <td className="p-4 text-sm font-bold dark:text-white">
                      {Number(payment.amount).toLocaleString()} {payment.currency === 'BAM' ? 'KM' : payment.currency}
                    </td>
                    <td className="p-4 text-sm text-primary font-bold">+{payment.tokens.toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => void generateInvoice(payment.id)}
                        disabled={invoiceLoading !== null}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
                      >
                        {invoiceLoading === payment.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                        {u('payments.history.generateInvoice', 'Generate invoice')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
