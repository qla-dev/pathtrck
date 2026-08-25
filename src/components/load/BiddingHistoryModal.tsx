import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { History, Repeat, X } from 'lucide-react';

import { Language, Load } from '../../types';
import { ui } from '../../i18n';
import { PAYMENT_TERMS_OPTIONS, PRICE_BASIS_OPTIONS, getOfferThread } from '../../lib/offerBid';

type BiddingHistoryModalProps = {
  open: boolean;
  lang: Language;
  load: Load;
  offerId: string | null;
  offers: Array<Record<string, unknown>>;
  onClose: () => void;
};

const optionLabel = (options: Array<{ value: string; label: string }>, value: unknown): string =>
  options.find((option) => option.value === value)?.label || (value == null ? '—' : String(value));

const formatDateTime = (value: unknown): string => {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
};

export const BiddingHistoryModal = ({ open, lang, load, offerId, offers, onClose }: BiddingHistoryModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const thread = offerId ? getOfferThread(offers, offerId) : [];

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-160 flex flex-col bg-white dark:bg-slate-950"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 dark:border-slate-800 md:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                <History className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-black text-slate-900 dark:text-white">{u('Bidding history', 'Bidding history')}</p>
                <p className="truncate text-xs font-semibold uppercase tracking-wider text-primary">{load.publicId || `#${load.id}`}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:text-primary dark:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 md:p-7">
            <div className="mx-auto max-w-2xl">
              {thread.length === 0 ? (
                <p className="py-16 text-center text-sm font-semibold text-slate-500">{u('No bidding history yet.', 'No bidding history yet.')}</p>
              ) : (
                <ol className="relative space-y-5 border-l-2 border-slate-100 pl-6 dark:border-slate-800">
                  {thread.map((offer, index) => {
                    const isCounter = Boolean(offer.is_counter);
                    const creator = offer.creator as { name?: string; email?: string } | undefined;
                    const company = offer.company as { name?: string } | undefined;
                    const status = String(offer.status || 'pending').toLowerCase();
                    return (
                      <li key={String(offer.id)} className="relative">
                        <span
                          className={`absolute -left-[1.95rem] flex h-7 w-7 items-center justify-center rounded-full border-4 border-white text-white dark:border-slate-950 ${isCounter ? 'bg-violet-500' : 'bg-primary'}`}
                        >
                          <Repeat className="h-3.5 w-3.5" />
                        </span>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${isCounter ? 'bg-violet-500/10 text-violet-600' : 'bg-primary/10 text-primary'}`}>
                              {index === 0 ? u('Original bid', 'Original bid') : u('Counter offer', 'Counter offer')}
                            </span>
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${status === 'accepted' ? 'bg-emerald-500/10 text-emerald-600' : status === 'rejected' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'}`}>
                              {status}
                            </span>
                          </div>
                          <p className="mt-2 text-2xl font-black text-primary">{String(offer.currency || 'EUR')} {Number(offer.amount || 0).toLocaleString()}</p>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {company?.name || creator?.name || creator?.email || u('Independent offer', 'Independent offer')} · {formatDateTime(offer.created_at)}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-bold">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{optionLabel(PRICE_BASIS_OPTIONS, offer.price_basis)}</span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{optionLabel(PAYMENT_TERMS_OPTIONS, offer.payment_terms)}</span>
                          </div>
                          {Boolean(offer.message) && (
                            <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">{String(offer.message)}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
