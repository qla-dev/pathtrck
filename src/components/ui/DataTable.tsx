import { forwardRef, type ComponentPropsWithoutRef } from 'react';

import { cn } from '../../lib/cn';

/** Shared density, header, and divider rules for application data tables. */
export const DataTable = forwardRef<HTMLTableElement, ComponentPropsWithoutRef<'table'>>(
  ({ className, children, ...props }, ref) => (
    <table
      ref={ref}
      className={cn(
        'w-full text-left',
        '[&_thead>tr]:border-b [&_thead>tr]:border-slate-200 [&_thead>tr]:text-xs [&_thead>tr]:uppercase [&_thead>tr]:text-slate-500 dark:[&_thead>tr]:border-slate-800',
        '[&_th]:p-3 [&_td]:p-3',
        '[&_tbody>tr]:border-b [&_tbody>tr]:border-slate-100 dark:[&_tbody>tr]:border-slate-800 [&_tbody>tr:last-child]:border-b-0',
        className,
      )}
      {...props}
    >
      {children}
    </table>
  ),
);

DataTable.displayName = 'DataTable';
