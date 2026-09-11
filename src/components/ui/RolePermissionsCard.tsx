import { CheckCircle2, Eye, MinusCircle, type LucideIcon } from 'lucide-react';
import { Card } from './Card';
import { cn } from '../../lib/cn';
import type { AccessLevel } from '../../lib/permissions';

export type RoleModuleAccess = { key: string; label: string; level: AccessLevel };

/**
 * How each access level reads at a glance - the legend from the access table, in the same three
 * colours: green for full use, amber for read-only, grey struck through for nothing at all.
 */
const LEVEL_STYLES: Record<AccessLevel, { icon: LucideIcon; chip: string; row: string }> = {
  full: {
    icon: CheckCircle2,
    chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    row: 'text-slate-700 dark:text-slate-200',
  },
  view: {
    icon: Eye,
    chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    row: 'text-slate-700 dark:text-slate-200',
  },
  none: {
    icon: MinusCircle,
    chip: 'bg-slate-400/10 text-slate-400 dark:text-slate-500',
    row: 'text-slate-400 line-through decoration-slate-300 dark:text-slate-600',
  },
};

export function RolePermissionsCard({
  title,
  permissions,
  permissionsLabel,
  icon: Icon,
  tone,
  shell,
  modules,
  moduleLabels,
}: {
  title: string;
  permissions: string[];
  permissionsLabel: string;
  icon: LucideIcon;
  tone: string;
  shell: string;
  /** Every module this role can reach, and at what level. Omitted, the card stays as it was. */
  modules?: RoleModuleAccess[];
  moduleLabels?: { heading: string; full: string; view: string; none: string };
}) {
  const counts = modules?.reduce(
    (totals, module) => ({ ...totals, [module.level]: totals[module.level] + 1 }),
    { full: 0, view: 0, none: 0 } as Record<AccessLevel, number>,
  );

  return <Card className={cn('shadow-none', shell)} contentClassName="p-5">
    <div className="flex items-center gap-3">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', tone)}><Icon className="h-5 w-5" /></div>
      <div className="min-w-0">
        <p className="font-black text-slate-900 dark:text-white">{title}</p>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{permissions.length} {permissionsLabel}</p>
      </div>
      {/* The headline the table is read for: how many modules this role can use, look at, or not reach. */}
      {counts && moduleLabels ? (
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {(['full', 'view', 'none'] as AccessLevel[]).map((level) => {
            const LevelIcon = LEVEL_STYLES[level].icon;
            return (
              <span
                key={level}
                title={moduleLabels[level]}
                className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black', LEVEL_STYLES[level].chip)}
              >
                <LevelIcon className="h-3 w-3" />
                {counts[level]}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>

    {/* Two columns where there is room: what the role does on the left, what it can open on the right,
        so a permission and the module it applies to are read side by side rather than a scroll apart. */}
    <div className={cn('mt-4 grid gap-4', modules?.length && 'lg:grid-cols-2')}>
      <ul className="grid content-start gap-2">
        {permissions.map((permission) => (
          <li key={permission} className="flex items-start gap-2 rounded-xl bg-white/70 px-3 py-2 text-xs font-medium text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            {permission}
          </li>
        ))}
      </ul>

      {modules?.length && moduleLabels ? (
        <div className="grid content-start gap-1.5">
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{moduleLabels.heading}</p>
          {modules.map((module) => {
            const style = LEVEL_STYLES[module.level];
            const LevelIcon = style.icon;
            return (
              <div
                key={module.key}
                className="flex items-center justify-between gap-2 rounded-xl bg-white/70 px-3 py-1.5 dark:bg-slate-950/50"
              >
                <span className={cn('truncate text-xs font-medium', style.row)}>{module.label}</span>
                <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide', style.chip)}>
                  <LevelIcon className="h-3 w-3" />
                  {moduleLabels[module.level]}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  </Card>;
}
