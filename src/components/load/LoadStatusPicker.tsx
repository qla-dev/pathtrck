import { useEffect, useRef, useState } from 'react';
import { CircleCheckBig, CircleX, Clock3, Eye, Loader2, Megaphone, PackageCheck, Send, Truck } from 'lucide-react';

import { trPackageStatus } from '../../i18n';
import { cn } from '../../lib/cn';
import { Language, LoadStatus } from '../../types';

export const LOAD_STATUS_OPTIONS: Array<[string, LoadStatus]> = [
  ['posted', 'Posted'], ['opened', 'Opened'], ['sent', 'Sent'], ['in_delivery', 'In delivery'],
  ['received', 'Received'], ['finished', 'Finished'], ['pending', 'Pending'], ['cancelled', 'Cancelled'],
];

const STATUS_ICONS: Record<LoadStatus, typeof Clock3> = {
  Posted: Megaphone, Opened: Eye, Sent: Send, 'In delivery': Truck,
  Received: PackageCheck, Finished: CircleCheckBig, Pending: Clock3, Cancelled: CircleX,
};

export const LoadStatusIcon = ({ status, className = 'h-3.5 w-3.5' }: { status: LoadStatus; className?: string }) => {
  const Icon = STATUS_ICONS[status];
  return <Icon className={className} />;
};

const statusPickerColors = (status: LoadStatus) => {
  switch (status) {
    case 'Opened': return 'border-cyan-400 bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300';
    case 'Sent': return 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300';
    case 'In delivery': return 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
    case 'Received': return 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300';
    case 'Finished': return 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
    case 'Cancelled': return 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
    default: return 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
  }
};

type LoadStatusPickerProps = {
  lang: Language;
  status: LoadStatus;
  isChanging?: boolean;
  onChange: (status: LoadStatus) => void;
  className?: string;
  compact?: boolean;
  availableStatuses?: LoadStatus[];
  actionLabels?: Partial<Record<LoadStatus, string>>;
};

export const LoadStatusPicker = ({ lang, status, isChanging = false, onChange, className, compact = false, availableStatuses, actionLabels }: LoadStatusPickerProps) => {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [open]);

  return (
    <div ref={pickerRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={isChanging}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-busy={isChanging}
        aria-label={`${trPackageStatus(lang, status)} status`}
        className={cn(
          compact
            ? 'flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border transition-colors disabled:cursor-wait disabled:opacity-60'
            : 'flex h-12 w-full cursor-pointer items-center gap-3 rounded-xl border px-4 transition-colors disabled:cursor-wait disabled:opacity-60',
          statusPickerColors(status)
        )}
      >
        {compact ? (
          isChanging ? <Loader2 className="h-4 w-4 animate-spin" /> : <LoadStatusIcon status={status} className="h-5 w-5" />
        ) : (
          <>
            <span className="hidden text-[10px] font-black uppercase tracking-wider opacity-65 sm:inline">Status</span>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="flex items-center gap-2 text-xs font-bold leading-none">
                {isChanging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LoadStatusIcon status={status} />}
                {trPackageStatus(lang, status)}
              </span>
            </span>
          </>
        )}
      </button>

      {open && (
        <div role="listbox" aria-label="Shipment status" className={cn('absolute top-full z-[1300] mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900', compact ? 'right-0 w-56' : 'inset-x-0 w-full')}>
          {LOAD_STATUS_OPTIONS.filter(([, option]) => !availableStatuses || availableStatuses.includes(option)).map(([value, option]) => (
            <button
              type="button"
              role="option"
              aria-selected={status === option}
              key={value}
              onClick={() => { setOpen(false); onChange(option); }}
              className={cn(
                'flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-bold transition-transform hover:translate-x-0.5',
                statusPickerColors(option),
                status === option && 'ring-2 ring-current ring-offset-1 dark:ring-offset-slate-900'
              )}
            >
              <span className="flex items-center gap-2"><LoadStatusIcon status={option} /><span>{actionLabels?.[option] || trPackageStatus(lang, option)}</span></span>
              {status === option && <span className="h-2 w-2 rounded-full bg-current" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
