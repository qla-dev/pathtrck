import type { ReactNode } from 'react';
import { ClipboardCheck } from 'lucide-react';

import type { Language } from '../../types';
import { ui } from '../../i18n';
import { checklistLabel, checklistOwner } from '../../lib/shipmentChecklist';

type Props = {
  checklist: Array<Record<string, unknown>>;
  lang: Language;
  dueDate?: string;
  /** Extra controls rendered between the card header and the table (e.g. the offer status picker). */
  toolbar?: ReactNode;
  renderAction?: (item: Record<string, unknown>, index: number) => ReactNode;
};

const titleCase = (value: unknown) => String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export const ShipmentChecklistTable = ({ checklist, lang, dueDate = '—', toolbar, renderAction }: Props) => {
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
                <th className="px-4 py-3">{u('shipmentDetails.owner', 'Owner')}</th>
                <th className="px-4 py-3">{u('shipmentDetails.dueDate', 'Due date')}</th>
                <th className="px-4 py-3">{u('shipmentDetails.status', 'Status')}</th>
                {renderAction && <th className="px-5 py-3 text-right">{u('shipmentDetails.action', 'Action')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {checklist.map((item, index) => (
                <tr key={String(item.key)}>
                  <td className="px-5 py-4 font-bold text-slate-800 dark:text-slate-100">
                    <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary text-xs text-primary">{index + 1}</span>
                    {checklistLabel(lang, item.key)}
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                    {checklistOwner(item.key) === 'customer'
                      ? u('shipmentDetails.customer', 'Customer')
                      : u('shipmentDetails.provider', 'Provider')}
                  </td>
                  <td className="px-4 py-4 font-semibold text-rose-500">{dueDate}</td>
                  <td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase text-slate-500 dark:bg-slate-800">{titleCase(item.status)}</span></td>
                  {renderAction && <td className="px-5 py-4 text-right">{renderAction(item, index)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="p-6 text-sm text-slate-500">{u('shipmentDetails.noTasks', 'No operational tasks yet.')}</p>}
    </section>
  );
};
