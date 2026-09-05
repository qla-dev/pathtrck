import { useEffect, useRef, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/cn';

/** Render conditional instances inside AnimatePresence to retain the dialog during its exit. */
export const SmallModal = ({ children, labelledBy, onClose, closeDisabled = false, onEscape, className }: {
  children: ReactNode;
  labelledBy: string;
  onClose: () => void;
  closeDisabled?: boolean;
  onEscape?: () => void;
  className?: string;
}) => {
  const dialog = useRef<HTMLDialogElement>(null);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  return <motion.dialog
    ref={dialog}
    aria-labelledby={labelledBy}
    onCancel={(event) => {
      event.preventDefault();
      if (onEscape) onEscape();
      else if (!closeDisabled) onClose();
    }}
    initial={{ opacity: 0, y: reducedMotion ? 0 : 12, scale: reducedMotion ? 1 : 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: reducedMotion ? 0 : 8, scale: reducedMotion ? 1 : 0.98, pointerEvents: 'none' }}
    transition={{ duration: reducedMotion ? 0 : 0.18, ease: 'easeOut' }}
    className={cn('m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-sm overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-800 shadow-xl backdrop:bg-black/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100', className)}
  >{children}</motion.dialog>;
};
