import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Gavel, X } from 'lucide-react';

import { Language } from '../../types';
import { ui } from '../../i18n';
import { Button } from '../ui/Button';

type QuickCounterModalProps = {
  open: boolean;
  lang: Language;
  currentAmount: number;
  currency: string;
  loading?: boolean;
  onClose: () => void;
  onSend: (amount: number) => void;
};

export const QuickCounterModal = ({ open, lang, currentAmount, currency, loading = false, onClose, onSend }: QuickCounterModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [amount, setAmount] = useState(() => String(currentAmount || ''));

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-170 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-3xl border border-white/70 bg-white p-5 shadow-2xl shadow-slate-950/25 dark:border-slate-700 dark:bg-slate-900"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20"><Gavel className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <p className="font-black text-slate-900 dark:text-white">{u('Quick counter', 'Quick counter')}</p>
                  <p className="text-xs text-slate-500">{u('Only the price changes, everything else is copied', 'Only the price changes, everything else is copied')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:text-primary disabled:cursor-not-allowed dark:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 block">
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-wider text-slate-500">{u('Counter amount', 'Counter amount')}</span>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-950">
                <span className="text-sm font-bold text-slate-400">{currency}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  autoFocus
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="h-12 w-full bg-transparent text-lg font-black text-slate-900 outline-none dark:text-white"
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">{u('Current amount', 'Current amount')}: {currency} {currentAmount.toLocaleString()}</p>
            </label>

            <div className="mt-5 flex items-center gap-3">
              <Button variant="secondary" className="h-11 flex-1" onClick={onClose} disabled={loading}>{u('common.cancel', 'Cancel')}</Button>
              <Button
                className="h-11 flex-1 shadow-lg shadow-primary/20"
                disabled={loading || !amount || Number(amount) <= 0}
                onClick={() => onSend(Number(amount))}
              >
                {loading ? u('legacy.loadDetails.sendingOffer', 'Sending…') : u('Send counter', 'Send counter')}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
