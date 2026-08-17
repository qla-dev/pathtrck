import { Check } from 'lucide-react';
import { ScanFieldRow } from './scanFieldRows';

type ScanFieldsTableProps = {
  rows: ScanFieldRow[];
  selected?: Record<string, boolean>;
  onToggle?: (key: string) => void;
};

export const ScanFieldsTable = ({ rows, selected, onToggle }: ScanFieldsTableProps) => {
  const editable = Boolean(onToggle);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      {rows.map((row, index) => {
        const checked = selected ? selected[row.key] !== false : true;
        return (
          <div
            key={row.key}
            className={cnRow(index, rows.length, checked, editable)}
            onClick={editable ? () => onToggle?.(row.key) : undefined}
          >
            {editable && (
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                  checked ? 'border-primary bg-primary' : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{row.label}</p>
              <p className={`truncate text-sm font-semibold ${checked ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through'}`}>
                {row.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const cnRow = (index: number, total: number, checked: boolean, editable: boolean) => {
  const base = 'flex items-center gap-3 px-4 py-3 transition-colors';
  const border = index < total - 1 ? 'border-b border-slate-100 dark:border-slate-800' : '';
  const interactive = editable ? 'cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-900' : '';
  const dimmed = !checked && editable ? 'opacity-60' : '';
  return [base, border, interactive, dimmed].filter(Boolean).join(' ');
};
