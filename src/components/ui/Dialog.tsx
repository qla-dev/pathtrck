import { useId, type ReactNode } from 'react';
import { X, type LucideIcon } from 'lucide-react';

import { cn } from '../../lib/cn';
import { SmallModal } from './SmallModal';

const SIZES = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' } as const;

/** Titled dialog on SmallModal: header with icon, title and close, a body, and an optional sticky footer for actions. */
export const Dialog = ({ title, subtitle, icon: Icon, onClose, closeDisabled = false, closeLabel, size = 'md', footer, children }: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  onClose: () => void;
  closeDisabled?: boolean;
  closeLabel: string;
  size?: keyof typeof SIZES;
  footer?: ReactNode;
  children: ReactNode;
}) => {
  const titleId = useId();

  return (
    <SmallModal labelledBy={titleId} onClose={onClose} closeDisabled={closeDisabled} className={cn('p-0', SIZES[size])}>
      <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>}
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-base font-black text-slate-900 dark:text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        <button type="button" onClick={onClose} disabled={closeDisabled} aria-label={closeLabel} className="cursor-pointer rounded-xl bg-slate-100 p-2 text-slate-500 disabled:opacity-50 dark:bg-slate-800">
          <X className="h-4 w-4" />
        </button>
      </header>
      <div className="px-5 py-4">{children}</div>
      {footer && <footer className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">{footer}</footer>}
    </SmallModal>
  );
};
