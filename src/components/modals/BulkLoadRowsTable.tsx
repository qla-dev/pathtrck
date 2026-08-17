import { AlertTriangle, Check } from 'lucide-react';
import { BulkLoadRow } from '../../services/api';
import { bulkRowIsUsable, bulkRowSummary } from './bulkLoadRows';

type BulkLoadRowsTableProps = {
  rows: BulkLoadRow[];
  selected?: Record<number, boolean>;
  onToggle?: (index: number) => void;
};

export const BulkLoadRowsTable = ({ rows, selected, onToggle }: BulkLoadRowsTableProps) => {
  const editable = Boolean(onToggle);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
      {rows.map((row, index) => {
        const checked = selected ? selected[index] !== false : true;
        const usable = bulkRowIsUsable(row);
        const { route, weight, budget } = bulkRowSummary(row);
        return (
          <div
            key={index}
            className={`flex items-center gap-3 px-4 py-3 transition-colors ${
              index < rows.length - 1 ? 'border-b border-slate-100 dark:border-slate-800' : ''
            } ${editable ? 'cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-slate-900' : ''} ${
              !checked && editable ? 'opacity-60' : ''
            }`}
            onClick={editable ? () => onToggle?.(index) : undefined}
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
              <div className="flex items-center gap-2">
                <p className={`truncate text-sm font-semibold ${checked ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                  {row.title || 'New load'}
                </p>
                {!usable && (
                  <span title="Missing pickup, delivery or weight - review before importing">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-slate-500">
                {route}
                {weight ? ` · ${weight}` : ''}
                {budget ? ` · ${budget}` : ''}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
