import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, CircleSlash, Clock3, Gavel, Loader2, TimerOff, Undo2, XCircle } from 'lucide-react';

import type { Language } from '../../types';
import { cn } from '../../lib/cn';
import { ui } from '../../i18n';

// The prebook screen decides an offer by setting its status, the same way a load is moved along by
// its own status picker. Accepting is the one status that does more than record a decision: the
// booking is confirmed and the shipment is created, so the caller runs its own flow for it.
export const OFFER_STATUSES = ['pending', 'accepted', 'not_selected', 'rejected', 'withdrawn', 'expired', 'cancelled'] as const;

export type OfferStatus = typeof OFFER_STATUSES[number];

const STATUS_ICONS: Record<OfferStatus, typeof Clock3> = {
  pending: Clock3,
  accepted: CheckCircle2,
  not_selected: CircleSlash,
  rejected: XCircle,
  withdrawn: Undo2,
  expired: TimerOff,
  cancelled: CircleSlash,
};

const STATUS_LABELS: Record<'en' | 'bs' | 'de', Record<OfferStatus, string>> = {
  en: { pending: 'Pending', accepted: 'Accepted', not_selected: 'Not selected', rejected: 'Rejected', withdrawn: 'Withdrawn', expired: 'Expired', cancelled: 'Cancelled' },
  bs: { pending: 'Na čekanju', accepted: 'Prihvaćeno', not_selected: 'Nije odabrano', rejected: 'Odbijeno', withdrawn: 'Povučeno', expired: 'Isteklo', cancelled: 'Otkazano' },
  de: { pending: 'Ausstehend', accepted: 'Angenommen', not_selected: 'Nicht ausgewählt', rejected: 'Abgelehnt', withdrawn: 'Zurückgezogen', expired: 'Abgelaufen', cancelled: 'Storniert' },
};

const statusColors = (status: OfferStatus) => {
  switch (status) {
    case 'accepted': return 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
    case 'pending': return 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
    case 'rejected': return 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
    case 'cancelled': return 'border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
    default: return 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200';
  }
};

export const offerStatusLabel = (lang: Language, status: string) => {
  const locale = lang === 'bs' || lang === 'de' ? lang : lang === 'hr' || lang === 'sr' ? 'bs' : 'en';
  return STATUS_LABELS[locale][status as OfferStatus]
    ?? String(status || '—').replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase());
};

export const OfferStatusIcon = ({ status, className = 'h-3.5 w-3.5' }: { status: string; className?: string }) => {
  const Icon = STATUS_ICONS[status as OfferStatus] ?? Gavel;
  return <Icon className={className} />;
};

export const OfferStatusPicker = ({ lang, status, isChanging = false, disabled = false, onChange, className }: {
  lang: Language;
  status: string;
  isChanging?: boolean;
  disabled?: boolean;
  onChange: (status: OfferStatus) => void;
  className?: string;
}) => {
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const current = (OFFER_STATUSES as readonly string[]).includes(status) ? status as OfferStatus : 'pending';

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
        disabled={isChanging || disabled}
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-busy={isChanging}
        className={cn(
          'flex h-11 w-full cursor-pointer items-center gap-3 rounded-xl border px-4 transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          statusColors(current),
        )}
      >
        <span className="hidden text-[10px] font-black uppercase tracking-wider opacity-65 sm:inline">
          {ui(lang, 'shipmentOperations.offerStatus', 'Offer status')}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2 text-xs font-bold leading-none">
          {isChanging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <OfferStatusIcon status={current} />}
          {offerStatusLabel(lang, current)}
        </span>
      </button>

      {open && (
        <div role="listbox" aria-label={ui(lang, 'shipmentOperations.offerStatus', 'Offer status')} className="absolute inset-x-0 top-full z-[1300] mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {OFFER_STATUSES.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={current === option}
              key={option}
              onClick={() => { setOpen(false); if (option !== current) onChange(option); }}
              className={cn(
                'flex w-full cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-left text-xs font-bold transition-transform hover:translate-x-0.5',
                statusColors(option),
                current === option && 'ring-2 ring-current ring-offset-1 dark:ring-offset-slate-900',
              )}
            >
              <span className="flex items-center gap-2"><OfferStatusIcon status={option} /><span>{offerStatusLabel(lang, option)}</span></span>
              {current === option && <span className="h-2 w-2 rounded-full bg-current" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
