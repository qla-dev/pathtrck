import Flatpickr from 'react-flatpickr';
import { CalendarDays, Check } from 'lucide-react';

import { cn } from '../../lib/cn';
export { currencySymbol } from '../../lib/currency';
import { flatpickrI18n } from '../../i18n';
import { Language } from '../../types';

/** The controls shared by the transport bid form and the warehousing bid form. */

// Form controls intentionally use a very quiet edge. They should read as part of the card, not
// as separate heavy boxes - particularly when a bid has several additional-charge rows.
export const fieldInputClass = 'h-11 w-full rounded-2xl border border-slate-200/75 bg-slate-50/80 px-3.5 text-sm text-slate-700 shadow-sm shadow-slate-200/20 outline-none placeholder:text-slate-400 focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/5 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-white dark:shadow-none dark:focus:bg-slate-900 disabled:cursor-default';

export const Checkbox = ({ checked, onChange, disabled = false, className }: { checked: boolean; onChange: () => void; disabled?: boolean; className?: string }) => (
  <span className={cn('relative inline-flex h-4 w-4 shrink-0 items-center justify-center', className)}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="peer h-4 w-4 shrink-0 cursor-pointer appearance-none rounded border-2 border-slate-300 bg-white outline-none checked:border-primary checked:bg-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-950 dark:disabled:bg-slate-800"
    />
    <Check className="pointer-events-none absolute h-3 w-3 text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} />
  </span>
);

export const RadioDot = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center">
    <input
      type="radio"
      checked={checked}
      onChange={onChange}
      className="peer h-4 w-4 shrink-0 cursor-pointer appearance-none rounded-full border-2 border-slate-300 bg-white outline-none checked:border-primary checked:bg-primary focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 dark:border-slate-600 dark:bg-slate-950"
    />
    <span className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-white opacity-0 peer-checked:opacity-100" />
  </span>
);

export const FieldLabel = ({ children, required }: { children: string; required?: boolean }) => (
  <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
    {children}
    {required && <span className="text-red-500"> *</span>}
  </span>
);

export const DateField = ({ value, onChange, lang, placeholder }: { value: string; onChange: (value: string) => void; lang: Language; placeholder?: string }) => (
  <Flatpickr
    value={value}
    options={{ dateFormat: 'd.m.Y', locale: flatpickrI18n(lang), allowInput: true }}
    onChange={(_, dateStr) => onChange(dateStr)}
    render={(_, ref) => (
      <div className="relative">
        <input
          ref={ref}
          value={value}
          onChange={() => undefined}
          placeholder={placeholder}
          className={cn(fieldInputClass, 'cursor-pointer pr-9')}
        />
        <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
      </div>
    )}
  />
);

export const DateTimeField = ({ value, onChange, lang, placeholder }: { value: string; onChange: (value: string) => void; lang: Language; placeholder?: string }) => (
  <Flatpickr
    value={value}
    options={{ enableTime: true, dateFormat: 'd.m.Y H:i', time_24hr: true, locale: flatpickrI18n(lang), allowInput: true }}
    onChange={(_, dateStr) => onChange(dateStr)}
    render={(_, ref) => (
      <div className="relative">
        <input
          ref={ref}
          value={value}
          onChange={() => undefined}
          placeholder={placeholder}
          className={cn(fieldInputClass, 'cursor-pointer pr-9')}
        />
        <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
      </div>
    )}
  />
);

export const formatShortDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};
