import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

type CompactCardProps = {
  children: ReactNode;
  icon: LucideIcon;
  tone: string;
  selected?: boolean;
  onClick?: () => void;
};

export const CompactCard = ({ children, icon: Icon, tone, selected, onClick }: CompactCardProps) => {
  const className = cn(
    'flex min-w-0 items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-[0_1px_4px_rgb(15_23_42/.04)] dark:border-slate-800 dark:bg-slate-900',
    onClick && 'min-h-12 w-full cursor-pointer text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900',
    selected && 'border-primary bg-primary/5 dark:border-primary dark:bg-primary/10',
  );
  const content = <>
    <div className="min-w-0">{children}</div>
    <span className={cn('ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', tone)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  </>;

  return onClick
    ? <button type="button" aria-pressed={selected} onClick={onClick} className={className}>{content}</button>
    : <div className={className}>{content}</div>;
};
