import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  label: string;
  options: { value: T; label: string; icon: LucideIcon }[];
};

export function SegmentedControl<T extends string>({ value, onChange, label, options }: Props<T>) {
  return (
    <div role="group" aria-label={label} className="inline-flex items-center rounded-full border border-sky-200/80 bg-sky-50/70 p-1 dark:border-slate-700 dark:bg-slate-900">
      {options.map(({ value: option, label: text, icon: Icon }) => (
        <button key={option} type="button" aria-pressed={value === option} onClick={() => onChange(option)}
          className={cn(
            'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95',
            value === option ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-500 hover:text-primary dark:text-slate-300',
          )}>
          <Icon className="h-4 w-4" />
          {text}
        </button>
      ))}
    </div>
  );
}
