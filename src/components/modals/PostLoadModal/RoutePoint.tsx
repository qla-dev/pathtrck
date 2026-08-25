import { cn } from '../../../lib/cn';
import type { LucideIcon } from 'lucide-react';

// One stop on the sea route timeline (icon + label + value) - keeps the four points (origin
// address, POL, POD, destination address) visually identical instead of four hand-copied blocks.
export const RoutePoint = ({
  icon: Icon,
  iconClassName,
  label,
  value,
  align = 'left',
}: {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: string;
  align?: 'left' | 'right';
}) => {
  const icon = (
    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-lg', iconClassName)}>
      <Icon className="h-4 w-4" />
    </span>
  );
  const text = (
    <div className={cn('mt-0.5 shrink-0', align === 'right' && 'text-right')}>
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className={cn('w-[10rem] truncate text-xs font-bold text-slate-900 dark:text-white', align === 'right' && 'ml-auto')}>{value}</p>
    </div>
  );
  return (
    <div className="flex shrink-0 items-center gap-2">
      {align === 'left' ? <>{icon}{text}</> : <>{text}{icon}</>}
    </div>
  );
};

