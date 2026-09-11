import { CheckCircle2, type LucideIcon } from 'lucide-react';
import { Card } from './Card';
import { cn } from '../../lib/cn';

export function RolePermissionsCard({
  title,
  permissions,
  permissionsLabel,
  icon: Icon,
  tone,
  shell,
}: {
  title: string;
  permissions: string[];
  permissionsLabel: string;
  icon: LucideIcon;
  tone: string;
  shell: string;
}) {
  return <Card className={cn('shadow-none', shell)} contentClassName="p-5">
    <div className="flex items-center gap-3">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', tone)}><Icon className="h-5 w-5" /></div>
      <div className="min-w-0">
        <p className="font-black text-slate-900 dark:text-white">{title}</p>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{permissions.length} {permissionsLabel}</p>
      </div>
    </div>

    <ul className="mt-4 grid content-start gap-2">
      {permissions.map((permission) => (
        <li key={permission} className="flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
          {permission}
        </li>
      ))}
    </ul>
  </Card>;
}
