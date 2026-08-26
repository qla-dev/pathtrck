import { cn } from '../../../lib/cn';
import type { LucideIcon } from 'lucide-react';

export const ToggleCard = ({
  active,
  title,
  description,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon?: LucideIcon;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex cursor-pointer flex-col items-start rounded-xl border px-3 py-2.5 text-left transition-all',
      active
        ? 'border-primary bg-primary/5 shadow-sm'
        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-primary/40'
    )}
  >
    {Icon && (
      <Icon
        className={cn(
          'mb-1.5 h-4 w-4',
          active ? 'text-primary' : 'text-slate-400'
        )}
      />
    )}
    <p className="w-full truncate text-xs font-bold dark:text-white" title={title}>{title}</p>
    <p className="w-full truncate text-[11px] leading-tight text-slate-500" title={description}>{description}</p>
  </button>
);

