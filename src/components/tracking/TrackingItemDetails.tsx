import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

type TrackingItemDetailsProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

export const TrackingItemDetails = ({ open, title, subtitle, onClose, children }: TrackingItemDetailsProps) => {
  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-140 bg-white dark:bg-slate-950">
      <div className="flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-white dark:bg-slate-950">
        <header className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 dark:border-slate-800 md:px-7">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-primary">Tracking item details</p>
            <h2 className="truncate text-xl font-black text-slate-900 dark:text-white md:text-2xl">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close tracking item details"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-600 transition-all hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-7">{children}</div>
      </div>
    </div>
  );
};
