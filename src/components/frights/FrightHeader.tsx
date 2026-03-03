import { Bell } from 'lucide-react';

import { Language } from '../../types';
import { cn } from '../../lib/cn';
import { SortMode } from './FrightTypes';

const tr = (lang: Language, en: string, bs: string, de: string) => {
  if (lang === 'bs') return bs;
  if (lang === 'de') return de;
  return en;
};

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
          {tr(
            lang,
            'Driver-only freight offers board.',
            'Tabela ponuda tereta samo za vozace.',
            'Frachtangebote nur fuer Fahrer.'
          )}
        </p>
      </div>
    </div>

    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-3">
      <div className="inline-flex items-center gap-2 text-sm font-semibold dark:text-white">
        <Bell className={cn('w-4 h-4', priceAlerts ? 'text-primary' : 'text-slate-400')} />
        {tr(lang, 'Get price alerts', 'Primi obavijesti o cijenama', 'Preisalarme aktivieren')}
        <button
          onClick={onTogglePriceAlerts}
          className={cn(
            'w-11 h-6 rounded-full transition-all p-0.5',
            priceAlerts ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
          )}
          aria-label={tr(lang, 'Toggle price alerts', 'Ukljuci obavijesti o cijenama', 'Preisalarme umschalten')}
        >
          <span
            className={cn(
              'block h-5 w-5 rounded-full bg-white transition-transform',
              priceAlerts ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </button>
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
          {tr(lang, 'Cheapest', 'Najjeftinije', 'Guenstigste')}
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
          {tr(lang, 'Fastest', 'Najbrze', 'Schnellste')}
        </button>
      </div>
    </div>
  </>
);
