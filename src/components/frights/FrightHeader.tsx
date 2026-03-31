import { Bell } from 'lucide-react';

import { Language } from '../../types';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { Toggle } from '../ui/Toggle';
import { SortMode } from './FrightTypes';

type FrightHeaderProps = {
  lang: Language;
  priceAlerts: boolean;
  sortMode: SortMode;
  onTogglePriceAlerts: () => void;
  onSortChange: (mode: SortMode) => void;
};

export const FrightHeader = ({
  lang,
  priceAlerts,
  sortMode,
  onTogglePriceAlerts,
  onSortChange,
}: FrightHeaderProps) => (
  <>
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold dark:text-white">Frights</h1>
        <p className="text-sm text-slate-500">
          {ui(lang, 'Driver-only freight offers board.', 'Driver-only freight offers board.')}
        </p>
      </div>
    </div>

    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex items-center gap-2 text-sm font-semibold dark:text-white">
        <Bell className={cn('w-4 h-4', priceAlerts ? 'text-primary' : 'text-slate-400')} />
        {ui(lang, 'Get price alerts', 'Get price alerts')}
        <Toggle
          checked={priceAlerts}
          onClick={onTogglePriceAlerts}
          aria-label={ui(lang, 'Toggle price alerts', 'Toggle price alerts')}
        />
      </div>

      <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <button
          onClick={() => onSortChange('cheapest')}
          className={cn(
            'px-3 py-1.5 text-xs font-bold transition-all',
            sortMode === 'cheapest'
              ? 'bg-primary text-white'
              : 'bg-white dark:bg-slate-900 text-slate-500'
          )}
        >
          {ui(lang, 'Cheapest', 'Cheapest')}
        </button>
        <button
          onClick={() => onSortChange('fastest')}
          className={cn(
            'px-3 py-1.5 text-xs font-bold transition-all',
            sortMode === 'fastest'
              ? 'bg-primary text-white'
              : 'bg-white dark:bg-slate-900 text-slate-500'
          )}
        >
          {ui(lang, 'Fastest', 'Fastest')}
        </button>
      </div>
    </div>
  </>
);
