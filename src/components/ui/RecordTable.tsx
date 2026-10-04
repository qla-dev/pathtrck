import type { ReactNode } from 'react';

import { cn } from '../../lib/cn';
import { DataTable } from './DataTable';
import { InlineDataState } from './InlineDataState';

export type RecordColumn<T> = {
  key: string;
  header: ReactNode;
  /** Defaults to the raw value of `row[key]`, or an em dash when it is empty. */
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right';
  className?: string;
};

type Props<T> = {
  columns: RecordColumn<T>[];
  rows: T[];
  empty: string;
  rowKey?: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
  selectedKey?: string | number | null;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  /** Inner tables inside detail views and cards use the compact density. */
  dense?: boolean;
  /** Tailwind min-width class for wide list tables, e.g. 'min-w-[850px]'. */
  minWidth?: string;
  footer?: ReactNode;
};

/**
 * Column-driven table on top of DataTable: list tables and the small inner tables of detail views.
 * Loading, error and empty states come from InlineDataState, so screens never hand-roll them.
 */
export function RecordTable<T extends Record<string, any>>({ columns, rows, empty, rowKey, onRowClick, selectedKey, loading = false, error, onRetry, dense = false, minWidth, footer }: Props<T>) {
  if (loading || error || !rows.length) return <InlineDataState loading={loading} error={error} empty={empty} onRetry={onRetry} />;
  const keyOf = (row: T, index: number) => rowKey ? rowKey(row, index) : (row.id ?? index);
  const cell = dense ? 'px-3 py-2' : 'px-3 py-3';

  return (
    <div className="overflow-x-auto">
      <DataTable className={cn(dense ? 'text-xs' : 'text-[13px]', minWidth)}>
        <thead>
          <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {columns.map((column) => <th key={column.key} className={cn('whitespace-nowrap', dense ? 'px-3 py-2' : 'px-3 py-2.5', column.align === 'right' && 'text-right', column.className)}>{column.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const key = keyOf(row, index);
            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(onRowClick && 'cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40', selectedKey != null && selectedKey === key && 'bg-primary/5')}
              >
                {columns.map((column) => {
                  const value = column.render ? column.render(row) : row[column.key];
                  return <td key={column.key} className={cn(cell, column.align === 'right' && 'text-right tabular-nums', column.className)}>{value === null || value === undefined || value === '' ? '—' : value}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
        {footer && <tfoot>{footer}</tfoot>}
      </DataTable>
    </div>
  );
}
