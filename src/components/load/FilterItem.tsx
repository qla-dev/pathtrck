import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { RotateCcw, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Language } from '../../types';
import { ui } from '../../i18n';

type FilterItemProps = {
  open: boolean;
  lang: Language;
  title: string;
  icon: LucideIcon;
  onClose: () => void;
  onClear?: () => void;
  children: ReactNode;
};

export const FilterItem = ({ open, lang, title, icon: Icon, onClose, onClear, children }: FilterItemProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-160 flex items-end justify-center bg-slate-950/45 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="filter-item-title"
            className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl shadow-slate-950/25 dark:border-slate-700 dark:bg-slate-900"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="inline-flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <p id="filter-item-title" className="text-sm font-bold text-slate-900 dark:text-white">
                  {title}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-colors hover:text-primary dark:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">{children}</div>

            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              {onClear ? (
                <button
                  type="button"
                  onClick={onClear}
                  className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition-all hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:text-slate-200"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {u('feed.filterBar.clear', 'Clear')}
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={onClose}
                className="h-9 cursor-pointer rounded-xl bg-primary px-5 text-xs font-bold text-white transition-all hover:scale-[1.02]"
              >
                {u('common.done', 'Done')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
