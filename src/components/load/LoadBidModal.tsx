import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Coins, Gavel, MessageSquareText, TrendingUp, X } from 'lucide-react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { Button } from '../ui/Button';

type LoadBidModalProps = {
  open: boolean;
  lang: Language;
  amount: string;
  currency: string;
  message: string;
  referenceAmount?: number | null;
  editing: boolean;
  loading: boolean;
  onAmountChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export const LoadBidModal = ({
  open,
  lang,
  amount,
  currency,
  message,
  referenceAmount,
  editing,
  loading,
  onAmountChange,
  onMessageChange,
  onClose,
  onSubmit,
}: LoadBidModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const minimumAmount = referenceAmount ?? 0;

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [loading, onClose, open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-160 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !loading) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="load-bid-title"
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-slate-950/25 dark:border-slate-700 dark:bg-slate-900"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-primary/10 via-cyan-500/5 to-transparent px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                  <Gavel className="h-5 w-5" />
                </div>
                <div>
                  <p id="load-bid-title" className="font-black text-slate-900 dark:text-white">
                    {editing ? u('legacy.loadDetails.changeOffer', 'Change offer') : u('legacy.loadDetails.negotiateTerms', 'Make offer')}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                    {u('legacy.loadDetails.financialTerms', 'Financial Terms')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:text-primary disabled:cursor-not-allowed dark:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {referenceAmount != null && (
                <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500"><TrendingUp className="h-4 w-4 text-primary" />{u('Highest offer', 'Highest offer')}</span>
                  <span className="font-black text-primary">{currency} {referenceAmount.toLocaleString()}</span>
                </div>
              )}

              <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
                <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500"><Coins className="h-4 w-4 text-primary" />{u('legacy.loadDetails.offerAmountPlaceholder', 'Your offer amount')}</span>
                <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-primary dark:border-slate-700 dark:bg-slate-900">
                  <span className="flex items-center border-r border-slate-200 px-3 text-sm font-black text-slate-500 dark:border-slate-700">{currency}</span>
                  <input
                    type="number"
                    step="0.01"
                    autoFocus
                    value={amount}
                    onChange={(event) => onAmountChange(event.target.value)}
                    className="h-12 min-w-0 flex-1 bg-transparent px-3 text-lg font-black text-slate-900 outline-none dark:text-white"
                  />
                </div>
              </label>

              <label className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
                <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500"><MessageSquareText className="h-4 w-4 text-primary" />{u('legacy.loadDetails.offerMessagePlaceholder', 'Message to the customer (optional)')}</span>
                <textarea
                  value={message}
                  onChange={(event) => onMessageChange(event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                />
              </label>

              <Button
                className="h-12 w-full rounded-xl text-sm shadow-lg shadow-primary/20"
                disabled={loading}
                onClick={onSubmit}
              >
                {loading
                  ? (editing ? u('legacy.loadDetails.updatingOffer', 'Updating…') : u('legacy.loadDetails.sendingOffer', 'Sending…'))
                  : (editing ? u('legacy.loadDetails.updateOffer', 'Update offer') : u('legacy.loadDetails.sendOffer', 'Send offer'))}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
