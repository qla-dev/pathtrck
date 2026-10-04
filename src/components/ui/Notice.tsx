import type { ReactNode } from 'react';
import { CircleAlert, Info, TriangleAlert } from 'lucide-react';

import { cn } from '../../lib/cn';

const TONES = {
  info: { box: 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300', icon: Info },
  warn: { box: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300', icon: TriangleAlert },
  bad: { box: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300', icon: CircleAlert },
} as const;

/** Inline banner for warnings, errors and hints inside a screen or card - not for toasts. */
export const Notice = ({ tone = 'info', children, className }: { tone?: keyof typeof TONES; children: ReactNode; className?: string }) => {
  const { box, icon: Icon } = TONES[tone];
  return (
    <div role={tone === 'bad' ? 'alert' : undefined} className={cn('flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm', box, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
};
