import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, CreditCard, Loader2, PackageCheck, Save, Sparkles, X } from 'lucide-react';

import { api } from '../../services/api';
import { ui } from '../../i18n';
import type { Language, UserSubscription } from '../../types';
import { Button } from '../ui/Button';

export type AdminSubscriptionTarget = {
  userId: number;
  name: string;
  subscription: UserSubscription | null;
};

const dateTimeInputValue = (value?: string | null) => {
  const date = value ? new Date(value) : new Date(Date.now() + 30 * 86_400_000);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
};

export const LenaTokenCount = ({ subscription }: { subscription?: UserSubscription | null }) => (
  <span className="inline-flex items-center gap-1 font-bold whitespace-nowrap">
    <Sparkles className="h-4 w-4 fill-primary/15 text-primary" />
    {Number(subscription?.remaining_tokens || 0).toLocaleString()}
  </span>
);

export const AdminSubscriptionButton = ({
  disabled,
  label,
  ariaLabel,
  onClick,
}: {
  disabled?: boolean;
  label: string;
  ariaLabel: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    disabled={disabled}
    title={disabled ? ariaLabel : undefined}
    aria-label={ariaLabel}
    onClick={onClick}
    className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 text-xs font-bold text-primary transition hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-40"
  >
    <CreditCard className="h-4 w-4" />
    {label}
  </button>
);

export const AdminSubscriptionModal = ({
  open,
  target,
  lang,
  onClose,
  onSaved,
}: {
  open: boolean;
  target: AdminSubscriptionTarget | null;
  lang: Language;
  onClose: () => void;
  onSaved: (subscription: UserSubscription) => void;
}) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [packages, setPackages] = useState<Record<string, unknown>[]>([]);
  const [packageId, setPackageId] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [remainingTokens, setRemainingTokens] = useState('0');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !target) return;
    const subscription = target.subscription;
    setPackageId(subscription?.subscription_package_id ? String(subscription.subscription_package_id) : '');
    setExpiresAt(dateTimeInputValue(subscription?.expires_at));
    setRemainingTokens(String(subscription?.remaining_tokens ?? 0));
    setError('');
    setLoading(true);
    void api.subscriptionPackages.list({ per_page: 100 })
      .then((response) => {
        const available = response.data.filter((item) => item.is_active !== false);
        setPackages(available);
        if (!subscription && available[0]) {
          setPackageId(String(available[0].id));
          setRemainingTokens(String(Number(available[0].lena_ai_tokens || 0)));
        }
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : u('adminSubscription.loadFailed', 'Subscription packages could not be loaded.')))
      .finally(() => setLoading(false));
  }, [open, target]);

  const save = async () => {
    if (!target || !packageId || !expiresAt) {
      setError(u('adminSubscription.required', 'Package and expiration date are required.'));
      return;
    }
    const tokens = Number(remainingTokens);
    if (!Number.isInteger(tokens) || tokens < 0) {
      setError(u('adminSubscription.invalidTokens', 'Token count must be a whole number of zero or more.'));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const response = await api.subscriptions.assign(target.userId, {
        subscription_package_id: Number(packageId),
        active: target.subscription?.active ?? true,
        expires_at: new Date(expiresAt).toISOString(),
        remaining_tokens: tokens,
      });
      onSaved(response.data as unknown as UserSubscription);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : u('adminSubscription.saveFailed', 'Subscription could not be saved.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && target && (
        <motion.div
          className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-subscription-title"
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.99 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <CreditCard className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 id="admin-subscription-title" className="truncate text-lg font-black text-slate-950 dark:text-white">
                    {u('adminSubscription.title', 'Edit user subscription')}
                  </h2>
                  <p className="truncate text-sm text-slate-500">{target.name}</p>
                </div>
              </div>
              <button type="button" onClick={onClose} aria-label={u('common.cancel', 'Cancel')} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500"><PackageCheck className="h-4 w-4 text-primary" />{u('adminSubscription.package', 'Package')}</span>
                <select value={packageId} disabled={loading} onChange={(event) => {
                  const nextId = event.target.value;
                  setPackageId(nextId);
                  if (!target.subscription) {
                    const selectedPackage = packages.find((item) => String(item.id) === nextId);
                    setRemainingTokens(String(Number(selectedPackage?.lena_ai_tokens || 0)));
                  }
                }} className="h-12 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                  <option value="">{loading ? u('common.loading', 'Loading...') : u('adminSubscription.selectPackage', 'Select package')}</option>
                  {packages.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.name || '')}</option>)}
                </select>
              </label>
              <label className="space-y-2">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500"><CalendarDays className="h-4 w-4 text-primary" />{u('adminSubscription.expiresAt', 'Subscription ends')}</span>
                <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500"><Sparkles className="h-4 w-4 text-primary" />{u('adminSubscription.tokens', 'LenaAI token count')}</span>
                <input type="number" min="0" step="1" value={remainingTokens} onChange={(event) => setRemainingTokens(event.target.value)} className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              </label>
              {error && <p className="sm:col-span-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>}
            </div>

            <footer className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4 dark:border-slate-800">
              <Button variant="ghost" onClick={onClose} disabled={submitting}>{u('common.cancel', 'Cancel')}</Button>
              <Button onClick={() => void save()} disabled={loading || submitting || packages.length === 0}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {submitting ? u('adminSubscription.saving', 'Saving...') : u('adminSubscription.save', 'Save subscription')}
              </Button>
            </footer>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
