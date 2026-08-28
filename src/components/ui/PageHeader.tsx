import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

import { cn } from '../../lib/cn';
import { Card } from './Card';

// The page header every screen opens with: a tinted title bar, an optional row of scope filters,
// and an optional row of KPI tiles. It was factored out of the warehouse dashboard, which is where
// all three parts appear at once - most screens only need the title bar.
export type PageHeaderTone = 'primary' | 'orange' | 'violet' | 'emerald' | 'amber' | 'rose' | 'slate';

export type PageHeaderStat = {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  /** Tailwind background + text classes for the tile icon, e.g. 'bg-sky-500/10 text-sky-500'. */
  tone?: string;
};

export type PageHeaderFilter = {
  id: string | number;
  label: string;
  count?: number;
};

type HeaderStatCardProps = PageHeaderStat & {
  className?: string;
};

// A header metric is also useful in dashboard bodies. Keeping the compact tile in one component
// prevents command-center screens from drifting back to larger, one-off KPI cards.
export const HeaderStatCard = ({ label, value, icon: Icon, tone, className }: HeaderStatCardProps) => (
  <Card className={cn('min-w-0 shadow-none', className)} contentClassName="flex items-center justify-between gap-2 px-3 py-2.5">
    <div className="min-w-0">
      <p className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 truncate text-lg font-black text-slate-900 dark:text-white">{value}</p>
    </div>
    <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', tone || 'bg-primary/10 text-primary')}>
      <Icon className="h-4 w-4" />
    </div>
  </Card>
);

type PageHeaderProps = {
  icon: LucideIcon;
  title: string;
  subtitle?: ReactNode;
  subtitleIcon?: LucideIcon;
  tone?: PageHeaderTone;
  /** Chip rendered left of the actions - status, counters, "live" indicators. */
  badge?: ReactNode;
  actions?: ReactNode;
  filters?: PageHeaderFilter[];
  activeFilter?: string | number;
  onFilterChange?: (id: string | number) => void;
  stats?: PageHeaderStat[];
  className?: string;
};

const TONES: Record<PageHeaderTone, { shell: string; icon: string; chip: string; activeChip: string }> = {
  primary: {
    shell: 'border-sky-100 from-white via-sky-50 to-cyan-50 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950',
    icon: 'bg-primary',
    chip: 'border-sky-200 bg-white/70 dark:border-white/10 dark:bg-white/5',
    activeChip: 'border-primary bg-primary',
  },
  orange: {
    shell: 'border-orange-100 from-white via-orange-50 to-amber-50 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950',
    icon: 'bg-orange-500',
    chip: 'border-orange-200 bg-white/70 dark:border-white/10 dark:bg-white/5',
    activeChip: 'border-orange-500 bg-orange-500',
  },
  violet: {
    shell: 'border-violet-100 from-white via-violet-50 to-fuchsia-50 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950',
    icon: 'bg-violet-500',
    chip: 'border-violet-200 bg-white/70 dark:border-white/10 dark:bg-white/5',
    activeChip: 'border-violet-500 bg-violet-500',
  },
  emerald: {
    shell: 'border-emerald-100 from-white via-emerald-50 to-teal-50 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950',
    icon: 'bg-emerald-500',
    chip: 'border-emerald-200 bg-white/70 dark:border-white/10 dark:bg-white/5',
    activeChip: 'border-emerald-500 bg-emerald-500',
  },
  amber: {
    shell: 'border-amber-100 from-white via-amber-50 to-yellow-50 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-amber-950',
    icon: 'bg-amber-500',
    chip: 'border-amber-200 bg-white/70 dark:border-white/10 dark:bg-white/5',
    activeChip: 'border-amber-500 bg-amber-500',
  },
  rose: {
    shell: 'border-rose-100 from-white via-rose-50 to-pink-50 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-rose-950',
    icon: 'bg-rose-500',
    chip: 'border-rose-200 bg-white/70 dark:border-white/10 dark:bg-white/5',
    activeChip: 'border-rose-500 bg-rose-500',
  },
  slate: {
    shell: 'border-slate-200 from-white via-slate-50 to-slate-100 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800',
    icon: 'bg-slate-700',
    chip: 'border-slate-200 bg-white/70 dark:border-white/10 dark:bg-white/5',
    activeChip: 'border-slate-700 bg-slate-700',
  },
};

// Tailwind only ships classes it can see in the source, so the column counts are spelled out
// rather than interpolated.
const STAT_COLUMNS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  6: 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  7: 'grid-cols-2 lg:grid-cols-4 xl:grid-cols-7',
  8: 'grid-cols-2 lg:grid-cols-4 xl:grid-cols-8',
};

export const PageHeader = ({
  icon: Icon,
  title,
  subtitle,
  subtitleIcon: SubtitleIcon,
  tone = 'primary',
  badge,
  actions,
  filters,
  activeFilter,
  onFilterChange,
  stats,
  className,
}: PageHeaderProps) => {
  const palette = TONES[tone];
  const columns = STAT_COLUMNS[Math.min(8, Math.max(1, stats?.length ?? 1))];

  return (
    <div className={cn('space-y-3', className)}>
      <section className={cn('flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-gradient-to-r px-4 py-3', palette.shell)}>
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white', palette.icon)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-black leading-tight text-slate-900 dark:text-white">{title}</h1>
            {subtitle && (
              <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
                {SubtitleIcon && <SubtitleIcon className="h-3 w-3 shrink-0" />}
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {(badge || actions) && (
          <div className="flex flex-wrap items-center gap-2">
            {badge && <div className={cn('flex items-center gap-2 rounded-xl border px-3 py-1.5', palette.chip)}>{badge}</div>}
            {actions}
          </div>
        )}
      </section>

      {filters && filters.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => onFilterChange?.(filter.id)}
              className={cn(
                'max-w-[240px] truncate rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors',
                filter.id === activeFilter
                  ? cn(palette.activeChip, 'text-white')
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
              )}
            >
              {filter.label}{filter.count === undefined ? '' : ` (${filter.count})`}
            </button>
          ))}
        </div>
      )}

      {stats && stats.length > 0 && (
        <section className={cn('grid gap-3', columns)}>
          {stats.map((metric) => (
            <HeaderStatCard key={metric.label} {...metric} />
          ))}
        </section>
      )}
    </div>
  );
};
