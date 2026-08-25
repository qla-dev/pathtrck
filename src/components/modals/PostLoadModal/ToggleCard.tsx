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
      'flex cursor-pointer flex-col items-start rounded-2xl border px-4 py-3 text-left transition-all',
      active
        ? 'border-primary bg-primary/5 shadow-sm'
        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-primary/40'
    )}
  >
    {Icon && (
      <Icon
        className={cn(
          'mb-2 h-5 w-5',
          active ? 'text-primary' : 'text-slate-400'
        )}
      />
    )}
    <p className="w-full truncate text-sm font-bold dark:text-white" title={title}>{title}</p>
    <p className="mt-1 w-full overflow-hidden text-xs text-slate-500 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">{description}</p>
  </button>
);

