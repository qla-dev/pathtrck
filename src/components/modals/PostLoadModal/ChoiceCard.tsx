import type { MouseEvent } from 'react';
import { CheckCircle2, MapPin } from 'lucide-react';
import { cn } from '../../../lib/cn';

export const ChoiceCard = ({
  active,
  title,
  description,
  icon: Icon,
  onClick,
  compact = false,
  className,
  nowrap = false,
  truncate = false,
}: {
  active: boolean;
  title: string;
  description?: string;
  icon: typeof MapPin;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  compact?: boolean;
  className?: string;
  nowrap?: boolean;
  truncate?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'relative flex min-w-0 cursor-pointer items-center gap-3 rounded-2xl border text-left transition-all',
      compact ? 'p-3' : 'p-4',
      active
        ? 'border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
        : 'border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-primary/5 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200',
      className
    )}
  >
    <span className={cn('flex shrink-0 items-center justify-center rounded-xl', compact ? 'h-9 w-9' : 'h-10 w-10', active ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800')}>
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0"><span className={cn('block text-sm font-bold', nowrap && 'whitespace-nowrap', truncate && 'truncate')} title={truncate ? title : undefined}>{title}</span>{description && <span className="mt-0.5 block text-xs text-slate-500">{description}</span>}</span>
    {active && <CheckCircle2 className="absolute right-3 top-3 h-4 w-4 text-primary" />}
  </button>
);

