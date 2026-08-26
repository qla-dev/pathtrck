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
  iconSurface,
  iconTone,
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
  /** Per-option icon colours (transport types keep their own tone when unselected). */
  iconSurface?: string;
  iconTone?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'relative flex min-w-0 cursor-pointer items-center rounded-xl border text-left transition-all',
      compact ? 'gap-2.5 p-2.5' : 'gap-3 rounded-2xl p-4',
      active
        ? 'border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
        : 'border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-primary/5 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200',
      className
    )}
  >
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg',
        compact ? 'h-8 w-8' : 'h-10 w-10 rounded-xl',
        active
          ? 'bg-primary text-white'
          : iconSurface
            ? cn(iconSurface, iconTone)
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
      )}
    >
      <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
    </span>
    <span className="min-w-0 flex-1">
      <span
        className={cn('block font-bold', compact ? 'text-xs' : 'text-sm', nowrap && 'whitespace-nowrap', truncate && 'truncate')}
        title={truncate ? title : undefined}
      >
        {title}
      </span>
      {description && (
        <span className={cn('block truncate text-slate-500', compact ? 'text-[11px] leading-tight' : 'mt-0.5 text-xs')}>{description}</span>
      )}
    </span>
    {active && <CheckCircle2 className={cn('absolute text-primary', compact ? 'right-2 top-2 h-3.5 w-3.5' : 'right-3 top-3 h-4 w-4')} />}
  </button>
);
