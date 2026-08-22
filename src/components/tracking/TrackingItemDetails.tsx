import { Children, useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../../lib/cn';

type TrackingItemDetailsProps = {
  open: boolean;
  headerAction?: ReactNode;
  bodyClassName?: string;
  onClose: () => void;
  children: ReactNode;
};

export const TrackingItemDetails = ({ open, headerAction, bodyClassName, onClose, children }: TrackingItemDetailsProps) => {
  const [headerNavigation, ...bodyContent] = Children.toArray(children);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-140 bg-white dark:bg-slate-950"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <motion.div
            className="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-white dark:bg-slate-950"
            initial={{ opacity: 0, y: 24, scale: 0.992 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.996 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="flex h-16 shrink-0 items-center gap-4 border-b border-slate-100 px-5 dark:border-slate-800 md:px-7">
              <div className="min-w-0 flex-1">{headerNavigation}</div>
              <div className="flex shrink-0 items-center gap-2">
                {headerAction}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close tracking item details"
                  className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-600 transition-all hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>
            <div className={cn('min-h-0 flex-1 overflow-y-auto p-5 md:p-7', bodyClassName)}>{bodyContent}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
