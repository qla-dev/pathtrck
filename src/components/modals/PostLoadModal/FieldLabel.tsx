import { Sparkles } from 'lucide-react';
import { cn } from '../../../lib/cn';

export const FieldLabel = ({
  children,
  ai,
  title,
  onReprefill,
}: {
  children: string;
  ai?: boolean;
  title?: string;
  onReprefill?: () => void;
}) => (
  <label
    onClick={ai ? onReprefill : undefined}
    title={ai ? title : undefined}
    className={cn(
      'ml-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider',
      ai ? 'cursor-pointer text-primary' : 'text-slate-500'
    )}
  >
    <span>{children}</span>
    {ai && <Sparkles className="h-2.5 w-2.5 shrink-0" />}
  </label>
);

