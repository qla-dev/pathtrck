import { ReactNode, useMemo, useState } from 'react';
import { Check, ChevronDown, Minus, Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../../../lib/cn';

/** Rounded section card - the product's card shape, at the density of the reference screens. */
export const SectionCard = ({
  icon: Icon,
  title,
  subtitle,
  action,
  className,
  children,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) => (
  <section className={cn('rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900', className)}>
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black leading-tight text-primary">{title}</p>
          {subtitle && <p className="mt-0.5 text-[11px] leading-tight text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    {children}
  </section>
);

/** Compact label above a control. `required` renders the red asterisk the reference screens use. */
export const Label = ({ children, required }: { children: ReactNode; required?: boolean }) => (
  <span className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">
    {children}
    {required && <span className="ml-0.5 text-rose-500">*</span>}
  </span>
);

const controlBase =
  'h-10 w-full rounded-xl border border-slate-200 bg-white text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

/** Text input with an optional leading glyph, matching the icon-prefixed fields in the reference. */
export const TextField = ({
  icon: Icon,
  invalid,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { icon?: LucideIcon; invalid?: boolean }) => (
  <div className="relative">
    {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />}
    <input
      {...props}
      className={cn(controlBase, Icon ? 'pl-9 pr-3' : 'px-3', invalid && 'border-rose-400 ring-2 ring-rose-500/20', className)}
    />
  </div>
);

export const SelectField = ({
  icon: Icon,
  invalid,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { icon?: LucideIcon; invalid?: boolean }) => (
  <div className="relative">
    {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />}
    <select
      {...props}
      className={cn(
        controlBase,
        'cursor-pointer appearance-none',
        Icon ? 'pl-9 pr-9' : 'pl-3 pr-9',
        invalid && 'border-rose-400 ring-2 ring-rose-500/20',
        className,
      )}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
  </div>
);

/** Textarea with the "0/500" counter the reference screens put in the bottom-right corner. */
export const TextareaField = ({
  value,
  onChange,
  maxLength = 500,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
}) => (
  <div className="relative">
    <textarea
      value={value}
      rows={rows}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 pb-6 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
    />
    <span className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-slate-400">{value.length}/{maxLength}</span>
  </div>
);

/** Segmented pill group - preferred contact method, RFID capability, license type. */
export const Segmented = <T extends string>({
  options,
  value,
  onChange,
  icons,
}: {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  icons?: Partial<Record<string, LucideIcon>>;
}) => (
  <div className="flex flex-wrap gap-1.5">
    {options.map((option) => {
      const Icon = icons?.[option];
      const active = value === option;
      return (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            'inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors',
            active
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-slate-200 bg-white text-slate-500 hover:border-primary/40 dark:border-slate-700 dark:bg-slate-950',
          )}
        >
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {option}
        </button>
      );
    })}
  </div>
);

/** Yes / No pair rendered as radios, the way the compliance questions read in the reference. */
export const YesNo = ({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) => (
  <div className="flex items-center gap-5 pt-1.5">
    {[true, false].map((option) => (
      <button
        key={String(option)}
        type="button"
        onClick={() => onChange(option)}
        className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
      >
        <span
          className={cn(
            'flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors',
            value === option ? 'border-primary' : 'border-slate-300 dark:border-slate-600',
          )}
        >
          {value === option && <span className="h-2 w-2 rounded-full bg-primary" />}
        </span>
        {option ? 'Yes' : 'No'}
      </button>
    ))}
  </div>
);

/** Square checkbox used by the capability grids and the standards list. */
export const CheckBox = ({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label?: string }) => (
  <button type="button" onClick={() => onChange(!checked)} className="inline-flex cursor-pointer items-center gap-2 text-left">
    <span
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors',
        checked ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-slate-600',
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </span>
    {label && <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>}
  </button>
);

/** Capability tile: icon + title + description on the left, checkbox on the right. */
export const CapabilityCard = ({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={cn(
      'flex w-full cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors',
      checked ? 'border-primary/40 bg-primary/5' : 'border-slate-200 bg-white hover:border-primary/30 dark:border-slate-700 dark:bg-slate-950',
    )}
  >
    <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', checked ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-800')}>
      <Icon className="h-3.5 w-3.5" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-xs font-bold text-slate-800 dark:text-white">{title}</span>
      <span className="block truncate text-[11px] leading-tight text-slate-500">{description}</span>
    </span>
    <span
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors',
        checked ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-slate-600',
      )}
    >
      {checked && <Check className="h-3 w-3" strokeWidth={3} />}
    </span>
  </button>
);

/** Equipment row: glyph, label, then a minus / value / plus counter and its unit. */
export const CounterRow = ({
  icon: Icon,
  label,
  value,
  onChange,
  unit = 'units',
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
}) => (
  <div className="flex items-center gap-2">
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800">
      <Icon className="h-3.5 w-3.5" />
    </span>
    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</span>
    <div className="flex h-8 shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-1 dark:border-slate-700">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        value={value}
        onChange={(event) => onChange(Math.max(0, Number(event.target.value.replace(/[^0-9]/g, '')) || 0))}
        className="w-8 bg-transparent text-center text-xs font-bold text-slate-800 outline-none dark:text-white"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
    <span className="w-9 shrink-0 text-[11px] text-slate-400">{unit}</span>
  </div>
);

// A short dial-code list keyed by ISO code, so the phone fields can show a flag the way the
// reference does without pulling in a phone-number library.
export const DIAL_CODES: Array<{ code: string; dial: string }> = [
  { code: 'ba', dial: '+387' }, { code: 'hr', dial: '+385' }, { code: 'rs', dial: '+381' },
  { code: 'si', dial: '+386' }, { code: 'me', dial: '+382' }, { code: 'mk', dial: '+389' },
  { code: 'de', dial: '+49' }, { code: 'at', dial: '+43' }, { code: 'ch', dial: '+41' },
  { code: 'it', dial: '+39' }, { code: 'fr', dial: '+33' }, { code: 'es', dial: '+34' },
  { code: 'pt', dial: '+351' }, { code: 'nl', dial: '+31' }, { code: 'be', dial: '+32' },
  { code: 'pl', dial: '+48' }, { code: 'cz', dial: '+420' }, { code: 'sk', dial: '+421' },
  { code: 'hu', dial: '+36' }, { code: 'ro', dial: '+40' }, { code: 'bg', dial: '+359' },
  { code: 'gr', dial: '+30' }, { code: 'tr', dial: '+90' }, { code: 'gb', dial: '+44' },
  { code: 'ie', dial: '+353' }, { code: 'dk', dial: '+45' }, { code: 'se', dial: '+46' },
  { code: 'no', dial: '+47' }, { code: 'fi', dial: '+358' }, { code: 'us', dial: '+1' },
  { code: 'ae', dial: '+971' },
];

/** Flag + dial-code selector glued to a phone number input. */
export const PhoneField = ({
  dial,
  onDialChange,
  value,
  onChange,
  placeholder = '(555) 000-0000',
}: {
  dial: string;
  onDialChange: (dial: string) => void;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => DIAL_CODES.find((entry) => entry.dial === dial) ?? DIAL_CODES[0], [dial]);
  return (
    <div className="relative flex">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-1 rounded-l-xl border border-r-0 border-slate-200 bg-white px-2 dark:border-slate-700 dark:bg-slate-950"
      >
        <img src={`https://flagcdn.com/w40/${selected.code}.png`} alt="" className="h-3 w-5 rounded-[2px] object-cover" />
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={`${dial} ${placeholder}`}
        className="h-10 min-w-0 flex-1 rounded-r-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
      {open && (
        <div className="absolute left-0 top-11 z-30 max-h-56 w-44 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {DIAL_CODES.map((entry) => (
            <button
              key={entry.code}
              type="button"
              onMouseDown={(event) => { event.preventDefault(); onDialChange(entry.dial); setOpen(false); }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <img src={`https://flagcdn.com/w40/${entry.code}.png`} alt="" className="h-3 w-5 rounded-[2px] object-cover" />
              <span className="font-semibold text-slate-700 dark:text-slate-200">{entry.dial}</span>
              <span className="uppercase text-slate-400">{entry.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** Small status pill - document upload state, expiry state, threshold legend. */
export const StatusPill = ({ tone, children }: { tone: 'ok' | 'warn' | 'bad' | 'muted'; children: ReactNode }) => (
  <span
    className={cn(
      'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
      tone === 'ok' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      tone === 'warn' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      tone === 'bad' && 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      tone === 'muted' && 'bg-slate-100 text-slate-500 dark:bg-slate-800',
    )}
  >
    {children}
  </span>
);
