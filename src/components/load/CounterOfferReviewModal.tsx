import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Gavel, X } from 'lucide-react';

import { Language, Load } from '../../types';
import { ui } from '../../i18n';
import { Button } from '../ui/Button';
import { diffOfferRecords } from '../../lib/offerBid';

type CounterOfferReviewModalProps = {
  open: boolean;
  lang: Language;
  load: Load;
  originalOffer: Record<string, unknown> | null;
  counterOffer: Record<string, unknown> | null;
  loading?: boolean;
  onClose: () => void;
  onAccept: () => void;
};

export const CounterOfferReviewModal = ({
  open,
  lang,
  load,
  originalOffer,
  counterOffer,
  loading = false,
  onClose,
  onAccept,
}: CounterOfferReviewModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const diffs = originalOffer && counterOffer ? diffOfferRecords(originalOffer, counterOffer) : [];

  return createPortal(
    <AnimatePresence>
      {open && counterOffer && (
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
            className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-slate-950/25 dark:border-slate-700 dark:bg-slate-900"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500 text-white shadow-lg shadow-violet-500/20"><Gavel className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <p className="font-black text-slate-900 dark:text-white">{u('Counter offer received', 'Counter offer received')}</p>
                  <p className="truncate text-xs font-semibold uppercase tracking-wider text-primary">{load.trackingNumber || '—'}</p>
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

            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-3xl font-black text-primary">{String(counterOffer.currency || 'EUR')} {Number(counterOffer.amount || 0).toLocaleString()}</p>
              <p className="mt-1 text-sm text-slate-500">{u('New terms proposed by the load poster', 'New terms proposed by the load poster')}</p>

              {diffs.length > 0 && (
                <div className="mt-5 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{u('What changed', 'What changed')}</p>
                  {diffs.map((diff) => (
                    <div key={diff.key} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-950">
                      <span className="font-bold text-slate-600 dark:text-slate-300">{diff.label}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-slate-400 line-through">{diff.oldValue}</span>
                        <span className="font-black text-primary">{diff.newValue}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {Boolean(counterOffer.message) && (
                <p className="mt-5 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">{String(counterOffer.message)}</p>
              )}
            </div>

            <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              <Button variant="secondary" className="h-11 flex-1" onClick={onClose} disabled={loading}>{u('common.cancel', 'Cancel')}</Button>
              <Button className="h-11 flex-1 shadow-lg shadow-primary/20" disabled={loading} onClick={onAccept}>
                {loading ? u('Accepting…', 'Accepting…') : <><CheckCircle2 className="mr-2 h-4 w-4" />{u('Accept counter', 'Accept counter')}</>}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
