import { cn } from '../../../lib/cn';
import type { LucideIcon } from 'lucide-react';

// One stop on the vertical route timeline (icon + label + value), connected to the next stop by a
// dashed line running down the left column - the vertical counterpart to RoutePoint's horizontal
// row. Used where a route is only read, never edited: the sea and rail leg summary, and the
// warehouse request's pickup/storage pair. Road's editable timeline is RouteStopTimeline.
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
  // The row stretches to spread the stops down the column while the stop inside it does not, so the
  // connector hangs off the row - from just under this icon to wherever the next stop begins -
  // rather than sitting in the flow and dragging the text down with it.
  <div className={cn('relative flex min-w-0', !last && 'flex-1 pb-4')}>
    {!last && (
      <span className="pointer-events-none absolute bottom-0 left-[15px] top-9 border-l-2 border-dashed border-sky-300/80 dark:border-sky-700/80" />
    )}
    <div className="flex min-w-0 flex-1 items-center gap-3 self-start">
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-lg', iconClassName)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
        <p className="truncate text-xs font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  </div>
);
