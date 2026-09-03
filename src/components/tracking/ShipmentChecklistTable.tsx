import type { ReactNode } from 'react';
import { Check, ClipboardCheck } from 'lucide-react';

import type { Language } from '../../types';
import { cn } from '../../lib/cn';
import { ui } from '../../i18n';
import { checklistHint, checklistLabel, checklistOwner, checklistStatusLabel } from '../../lib/shipmentChecklist';

type Props = {
  checklist: Array<Record<string, unknown>>;
  lang: Language;
  dueDate?: string;
  /** Extra controls rendered between the card header and the table (e.g. the offer status picker). */
  toolbar?: ReactNode;
  renderAction?: (item: Record<string, unknown>, index: number) => ReactNode;
  /** Replaces the read-only due date with an editable control, where the task has a date to set. */
  renderDueDate?: (item: Record<string, unknown>) => ReactNode;
  /** The plain-language hint column, worth the width only where the work is actually done. */
  showInstruction?: boolean;
};

const titleCase = (value: unknown) => String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export const ShipmentChecklistTable = ({ checklist, lang, dueDate = '—', toolbar, renderAction, renderDueDate, showInstruction }: Props) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <h2 className="flex items-center gap-2 font-black text-slate-900 dark:text-white">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          {u('shipmentOperations.title', 'Operational checklist')}
        </h2>
      </div>
      {toolbar && <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">{toolbar}</div>}
      {checklist.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:bg-slate-950">
              <tr>
                <th className="px-5 py-3">{u('shipmentDetails.task', 'Task')}</th>
                {showInstruction && <th className="px-4 py-3">{u('shipmentDetails.instruction', 'What to do')}</th>}
                <th className="px-4 py-3">{u('shipmentDetails.owner', 'Owner')}</th>
                <th className="px-4 py-3">{u('shipmentDetails.dueDate', 'Due date')}</th>
                <th className="px-4 py-3">{u('shipmentDetails.status', 'Status')}</th>
                {renderAction && <th className="px-5 py-3 text-right">{u('shipmentDetails.action', 'Action')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {checklist.map((item, index) => {
                // A finished task trades its number for a tick, so the done ones read at a glance.
                const done = ['completed', 'approved', 'done'].includes(String(item.status || '').toLowerCase());

                return (
                  <tr key={String(item.key)}>
                    <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-100">
                      <span className={cn(
                        'mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs',
                        done
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                          : 'border-primary text-primary'
                      )}>
                        {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                      </span>
                      {checklistLabel(lang, item.key)}
                    </td>
                    {showInstruction && (
                      <td className="max-w-[260px] px-4 py-4 text-xs font-medium text-slate-500">
                        {checklistHint(lang, item.key)}
                      </td>
                    )}
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                      {checklistOwner(item.key) === 'customer'
                        ? u('shipmentDetails.customer', 'Customer')
                        : u('shipmentDetails.provider', 'Provider')}
                    </td>
                    <td className={cn('px-4 py-4 font-semibold', done ? 'text-slate-400' : 'text-rose-500')}>{renderDueDate?.(item) ?? dueDate}</td>
                    <td className="px-4 py-4">
                      <span className={cn(
                        'rounded-full px-2.5 py-1 text-[10px] font-black uppercase',
                        done
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      )}>
                        {checklistStatusLabel(lang, item.status)}
                      </span>
                    </td>
                    {renderAction && <td className="px-5 py-4 text-right">{renderAction(item, index)}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <p className="p-6 text-sm text-slate-500">{u('shipmentDetails.noTasks', 'No operational tasks yet.')}</p>}
    </section>
  );
};
