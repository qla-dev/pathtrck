import { ArrowDownWideNarrow, Check, DollarSign, CalendarDays, RotateCcw } from 'lucide-react';

import { Language } from '../../types';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';

export type FeedSortMode = 'price_desc' | 'price_asc' | 'date_desc' | 'date_asc';

type SortOption = {
  id: FeedSortMode;
  title: string;
  subtitle: string;
  Icon: typeof DollarSign;
};

type SidebarSortProps = {
  lang: Language;
  sortMode: FeedSortMode;
  onSortModeChange: (mode: FeedSortMode) => void;
  onReset: () => void;
  embeddedInSidebar?: boolean;
};

export const SidebarSort = ({
  lang,
  sortMode,
  onSortModeChange,
  onReset,
  embeddedInSidebar = false,
}: SidebarSortProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  const options: SortOption[] = [
    {
      id: 'price_desc',
      title: u('legacy.sidebarSort.priceDescending', 'Price descending'),
      subtitle: u('legacy.sidebarSort.highestPriceFirst', 'Highest price first'),
      Icon: DollarSign,
    },
    {
      id: 'price_asc',
      title: u('legacy.sidebarSort.priceAscending', 'Price ascending'),
      subtitle: u('legacy.sidebarSort.lowestPriceFirst', 'Lowest price first'),
      Icon: DollarSign,
    },
    {
      id: 'date_desc',
      title: u('legacy.sidebarSort.dateDescending', 'Date descending'),
      subtitle: u('legacy.sidebarSort.newestFirst', 'Newest first'),
      Icon: CalendarDays,
    },
    {
      id: 'date_asc',
      title: u('legacy.sidebarSort.dateAscending', 'Date ascending'),
      subtitle: u('legacy.sidebarSort.oldestFirst', 'Oldest first'),
      Icon: CalendarDays,
    },
  ];

  return (
    <aside
      className={cn(
        'space-y-6',
        embeddedInSidebar
          ? 'h-full'
          : 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 h-fit'
      )}
    >
      <div
        className={cn(
          'flex items-center justify-between',
          embeddedInSidebar &&
            'sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm py-1'
        )}
      >
        <div className="inline-flex items-center gap-2 text-sm font-bold dark:text-white">
          <ArrowDownWideNarrow className="w-4 h-4 text-primary" />
          {u('legacy.sidebarSort.sort', 'Sort')}
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 h-8 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-200 hover:text-primary hover:border-primary/40 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {u('legacy.sidebarSort.default', 'Default')}
        </button>
      </div>

      <div className="space-y-2">
        {options.map((option) => {
          const isSelected = sortMode === option.id;

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSortModeChange(option.id)}
              className={cn(
                'w-full rounded-xl border px-3 py-2.5 text-left transition-all cursor-pointer',
                isSelected
                  ? 'border-primary/50 bg-primary/10 shadow-sm'
                  : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
              )}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2">
                  <option.Icon className={cn('w-4 h-4', isSelected ? 'text-primary' : 'text-slate-400')} />
                  <span>
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                      {option.title}
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">{option.subtitle}</span>
                  </span>
                </span>
                <span
                  className={cn(
                    'h-5 w-5 rounded-md border flex items-center justify-center transition-all',
                    isSelected
                      ? 'border-primary text-primary bg-primary/15'
                      : 'border-slate-400/60 dark:border-slate-500/60'
                  )}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};
