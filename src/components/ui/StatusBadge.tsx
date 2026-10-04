import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../../lib/cn';

export type StatusTone = 'ok' | 'warn' | 'bad' | 'info' | 'muted';

const TONES: Record<StatusTone, string> = {
  ok: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  warn: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  bad: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  muted: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
};

/** The one status pill for lists, detail headers and summaries - use it instead of ad-hoc rounded spans. */
export const StatusBadge = ({ tone, icon: Icon, children, className }: { tone: StatusTone; icon?: LucideIcon; children: ReactNode; className?: string }) => (
  <span className={cn('inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold', TONES[tone], className)}>
    {Icon && <Icon className="h-3 w-3" />}
    {children}
  </span>
);
