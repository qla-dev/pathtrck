import { cn } from '../../../lib/cn';
import type { LucideIcon } from 'lucide-react';

// One stop on the vertical route timeline (icon + label + value), connected to the next stop by a
// dashed line running down the left column - the vertical counterpart to RoutePoint's horizontal
// row, used by the Route step's own route-summary column.
export const VerticalRoutePoint = ({
  icon: Icon,
  iconClassName,
  label,
  value,
  last = false,
}: {
  icon: LucideIcon;
  iconClassName: string;
  label: string;
  value: string;
  last?: boolean;
}) => (
  <div className={cn('flex min-w-0 gap-3', !last && 'flex-1')}>
    <div className="flex flex-col items-center self-stretch">
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-lg', iconClassName)}>
        <Icon className="h-4 w-4" />
      </span>
      {!last && <span className="my-1 min-h-[1.5rem] w-0 flex-1 border-l-2 border-dashed border-sky-300/80 dark:border-sky-700/80" />}
    </div>
    <div className={cn('min-w-0', !last && 'pb-4')}>
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  </div>
);
