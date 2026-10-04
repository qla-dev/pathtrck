import type { LucideIcon } from 'lucide-react';

import { cn } from '../../lib/cn';

export type TabItem<T extends string> = { value: T; label: string; icon?: LucideIcon; count?: number };

/**
 * Underlined section tabs inside a card or detail view (e.g. Stavke / Knjiženja / Plaćanja / Historija).
 * Page-level scope switching uses PageHeader filters or SegmentedControl instead.
 */
export function Tabs<T extends string>({ value, onChange, items, label, className }: { value: T; onChange: (value: T) => void; items: TabItem<T>[]; label: string; className?: string }) {
  return (
    <div role="tablist" aria-label={label} className={cn('flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800', className)}>
      {items.map(({ value: item, label: text, icon: Icon, count }) => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={value === item}
          onClick={() => onChange(item)}
          className={cn(
            '-mb-px inline-flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors',
            value === item ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
          )}
        >
          {Icon && <Icon className="h-4 w-4" />}
          {text}
          {count !== undefined && <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800">{count}</span>}
        </button>
      ))}
    </div>
  );
}
