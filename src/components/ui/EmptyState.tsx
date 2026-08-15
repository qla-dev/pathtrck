import { PackageSearch, type LucideIcon } from 'lucide-react';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
};

export const EmptyState = ({
  title,
  description,
  icon: Icon = PackageSearch,
  className = '',
}: EmptyStateProps) => (
  <div
    className={`flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900 ${className}`}
  >
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
      <Icon className="h-7 w-7" aria-hidden="true" />
    </div>
    <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
    {description && <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">{description}</p>}
  </div>
);
