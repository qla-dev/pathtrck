import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { UsersRound, X } from 'lucide-react';

import { Language, Load } from '../../types';
import type { Role } from '../../types';
import { ui } from '../../i18n';
import { LoadOffersPanel } from './LoadOffersPanel';
import type { OfferStatus } from './OfferStatusPicker';

type LoadOffersModalProps = {
  open: boolean;
  lang: Language;
  load: Load;
  offers: Array<Record<string, unknown>>;
  loading: boolean;
  actionMessage?: string;
  userId?: number;
  role: Role;
  onApprove: (offer: Record<string, unknown>) => void;
  onReject: (offer: Record<string, unknown>) => void;
  onChangeStatus?: (offer: Record<string, unknown>, status: OfferStatus) => void;
  changingStatusOfferId?: string | null;
  onSendCounter: (payload: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
};

// The offers list lives over the load details instead of replacing them, so closing it drops the
// customer back exactly where they were. It sits below z-160 on purpose: the bid, counter and
// history modals the panel opens have to stack on top of it.
export const LoadOffersModal = ({ open, lang, load, onClose, ...panelProps }: LoadOffersModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-150 flex flex-col bg-white dark:bg-slate-950"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 dark:border-slate-800 md:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/20">
                <UsersRound className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-black text-slate-900 dark:text-white">
                  {u('offers.title', 'Offers')} ({panelProps.offers.length})
                </p>
                <p className="truncate text-xs font-semibold uppercase tracking-wider text-primary">
                  {load.trackingNumber || `${load.pickup} → ${load.delivery}`}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={u('common.close', 'Close')}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:text-primary dark:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="mx-auto max-w-[1440px]">
              <LoadOffersPanel lang={lang} load={load} {...panelProps} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
