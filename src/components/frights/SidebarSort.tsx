import { ArrowDownWideNarrow, Check, DollarSign, CalendarDays, RotateCcw } from 'lucide-react';

import { Language } from '../../types';
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

const tr = (lang: Language, en: string, bs: string, de: string) => {
  if (lang === 'bs') return bs;
  if (lang === 'de') return de;
  return en;
};

export const SidebarSort = ({
  lang,
  sortMode,
  onSortModeChange,
  onReset,
  embeddedInSidebar = false,
}: SidebarSortProps) => {
  const options: SortOption[] = [
    {
      id: 'price_desc',
      title: tr(lang, 'Price descending', 'Cijena opadajuce', 'Preis absteigend'),
      subtitle: tr(lang, 'Highest price first', 'Prvo najveca cijena', 'Hoechster Preis zuerst'),
      Icon: DollarSign,
    },
    {
      id: 'price_asc',
      title: tr(lang, 'Price ascending', 'Cijena rastuce', 'Preis aufsteigend'),
      subtitle: tr(lang, 'Lowest price first', 'Prvo najmanja cijena', 'Niedrigster Preis zuerst'),
      Icon: DollarSign,
    },
    {
      id: 'date_desc',
      title: tr(lang, 'Date descending', 'Datum opadajuce', 'Datum absteigend'),
      subtitle: tr(lang, 'Newest first', 'Prvo najnoviji', 'Neueste zuerst'),
      Icon: CalendarDays,
    },
    {
      id: 'date_asc',
      title: tr(lang, 'Date ascending', 'Datum rastuce', 'Datum aufsteigend'),
      subtitle: tr(lang, 'Oldest first', 'Prvo najstariji', 'Aelteste zuerst'),
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
          {tr(lang, 'Sort', 'Sortiranje', 'Sortierung')}
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 h-8 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-200 hover:text-primary hover:border-primary/40 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {tr(lang, 'Default', 'Zadano', 'Standard')}
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
