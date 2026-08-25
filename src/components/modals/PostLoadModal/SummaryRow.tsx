export const SummaryRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0">
    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
    <span className="text-sm font-medium text-right dark:text-white">{value || '—'}</span>
  </div>
);

