import { useState } from 'react';
import { ArrowUpRight, CalendarClock, CircleAlert, ClipboardList, Search, UserRound } from 'lucide-react';
import { Button } from '../ui/Button';
import { DataTable } from '../ui/DataTable';
import { Notice } from '../ui/Notice';
import { useOpsCopy } from './opsCopy';
import { transportModes } from './TransportFlowPanel';

type Row = Record<string, any>;
export type OpsEntrySection = 'overview' | 'documents' | 'operations' | 'flow';
export type OpsTask = { order_id: number; reference: string; kind: string; item: Row };
type Queue = { rows: OpsTask[]; loading: boolean; error: string };
type OpenOrder = (id: number, section: OpsEntrySection) => void;
type Filters = { origin: string; kind: string; department: string };
const field = 'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900';
const panel = 'rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';
const sources = { marketplace: 'Berza tereta', external: 'Eksterni nalog', manual: 'Ručni unos' };
const statuses: Record<string, string> = { open: 'Otvoren', dispatched: 'Organizovan', in_progress: 'U toku', partially_closed: 'Čeka završetak', closed: 'Završen', cancelled: 'Otkazan', booked: 'Rezervisano', delivered: 'Isporučen' };
const taskDue = (task: OpsTask) => String(task.item.due_date || task.item.due_at || '');
const waiting = (task: OpsTask) => task.item.status === 'waiting_external';
const todayKey = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Sarajevo' }).format(new Date());
const taskSection = (task: OpsTask): OpsEntrySection => {
  if (task.kind === 'transit') return 'flow';
  return ['documents_received', 'cargo_documents', 'goods_documents', 'check_storage_documents'].includes(task.item.key) ? 'documents' : 'operations';
};
const routeLabel = (row: Row) => [row.intake?.route?.from, row.intake?.route?.to].filter(Boolean).join(' → ');
export function OpsStatus({ status }: { status: string }) {
  const { t } = useOpsCopy();
  return <span className="inline-block rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-200">{t(statuses[status] || status || '—')}</span>;
}

export function OpsLanding({ orders, queue, user, members, filters, onFilters, onOpen, daily, onDaily, onRefresh }: {
  orders: Row[]; queue: Queue; user: number; members: Row[]; filters: Filters;
  onFilters: (filters: Filters) => void; onOpen: OpenOrder; daily: boolean; onDaily: () => void; onRefresh: () => void;
}) {
  const { t, taskLabel } = useOpsCopy();
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState('all');
  const today = todayKey();
  const overdue = (task: OpsTask) => !!taskDue(task) && taskDue(task).slice(0, 10) < today;
  const mine = (task: OpsTask) => !!user && Number(task.item.responsible_user_id) === user && !waiting(task);
  const owner = (id: unknown) => members.find(member => Number(member.id) === Number(id))?.name || (id ? '#' + id : '—');
  const taskTitle = (task: OpsTask) => task.item.next_action || (task.kind === 'checklist' ? taskLabel(task.item) : task.item.label) || t('Provjeriti stavku');
  const tasksByOrder = new Map<number, OpsTask[]>();
  for (const task of queue.rows) {
    const id = Number(task.order_id);
    const tasks = tasksByOrder.get(id) || [];
    tasks.push(task);
    tasksByOrder.set(id, tasks);
  }
  const base = orders.filter(row =>
    (filters.origin === 'all' || (row.intake?.source || 'manual') === filters.origin) &&
    (filters.kind === 'all' || (row.intake?.kind || 'order') === filters.kind) &&
    (filters.department === 'all' || (row.departments || []).includes(filters.department) || (row.intake?.department || row.transport_type) === filters.department));
  const metrics = [
    { id: 'all', label: 'Svi poslovi', icon: ClipboardList, match: () => true },
    { id: 'mine', label: 'Moje radnje', icon: UserRound, match: (row: Row) => tasksByOrder.get(Number(row.id))?.some(mine) || (!['closed', 'cancelled'].includes(row.status) && !!user && Number(row.responsible_user_id) === user) },
    { id: 'late', label: 'Rok probijen', icon: CircleAlert, match: (row: Row) => tasksByOrder.get(Number(row.id))?.some(overdue) },
    { id: 'waiting', label: 'Čeka drugu stranu', icon: CalendarClock, match: (row: Row) => tasksByOrder.get(Number(row.id))?.some(waiting) },
  ];
  const rows = base.filter(metrics.find(metric => metric.id === scope)!.match).filter(row =>
    [row.reference, row.title, row.customer_name, routeLabel(row), row.intake?.external_reference].join(' ').toLowerCase().includes(search.trim().toLowerCase()));
  // The daily endpoint can return items for orders outside the overview's 300-row window.
  const orderById = new Map(orders.map(order => [Number(order.id), order]));
  const dailyRows = queue.rows.filter(task => {
    const row = orderById.get(Number(task.order_id));
    return (['blocked','waiting_external'].includes(task.item.status) || !!taskDue(task) || task.kind==='transit') && [task.reference, row?.customer_name, row && routeLabel(row), taskTitle(task)].join(' ').toLowerCase().includes(search.trim().toLowerCase());
  });
  const lanes = [
    { title: 'Rok probijen', match: overdue, style: 'text-rose-700 dark:text-rose-300' },
    { title: 'Danas', match: (task: OpsTask) => taskDue(task).slice(0, 10) === today, style: 'text-sky-700 dark:text-sky-300' },
    { title: 'Blokade i čekanja', match: (task: OpsTask) => !taskDue(task) || (taskDue(task).slice(0,10) > today && ['blocked','waiting_external'].includes(task.item.status)), style: 'text-amber-700 dark:text-amber-300' },
    { title: 'Sljedeći rokovi', match: (task: OpsTask) => taskDue(task).slice(0,10) > today && !['blocked','waiting_external'].includes(task.item.status), style: 'text-slate-700 dark:text-slate-300' },
  ];
  return <section className="space-y-4">
    {queue.error && <Notice tone="warn"><div className="flex flex-wrap items-center gap-2">{queue.error}<Button size="sm" variant="outline" onClick={onRefresh}>{t('Osvježi')}</Button></div></Notice>}
    {!daily && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{metrics.map(({ id, label, icon: Icon, match }) =>
      <button key={id} type="button" aria-pressed={scope === id} onClick={() => setScope(id)}
        className={panel + ' flex items-start justify-between gap-2 p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-800 ' + (scope === id ? 'ring-2 ring-inset ring-sky-500' : '')}>
        <span><span className="block text-2xl font-bold tabular-nums">{id !== 'all' && (queue.loading || queue.error) ? '—' : base.filter(match).length}</span><span className="text-sm text-slate-600 dark:text-slate-300">{t(label)}</span></span>
        <Icon aria-hidden className="h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
      </button>)}</div>}
    <div className={panel}>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3 dark:border-slate-800">
        <label className="relative min-w-48 flex-1"><Search aria-hidden className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input type="search" aria-label={t('Pretraga naloga')} placeholder={t('Referenca, klijent ili relacija')} className={field + ' w-full pl-9'} value={search} onChange={e => setSearch(e.target.value)} />
        </label>
        {!daily && <>
          <select aria-label={t('Odjel')} value={filters.department} className={field} onChange={e => onFilters({ ...filters, department: e.target.value })}>
            <option value="all">{t('Svi odjeli')}</option>{Object.entries(transportModes).map(([id, label]) => <option key={id} value={id}>{t(label)}</option>)}
          </select>
          <select aria-label={t('Vrsta zapisa')} value={filters.kind} className={field} onChange={e => onFilters({ ...filters, kind: e.target.value })}>
            <option value="all">{t('Nalozi i upiti')}</option><option value="order">{t('Potvrđeni nalozi')}</option><option value="inquiry">{t('Upiti')}</option>
          </select>
          <select aria-label={t('Izvor')} value={filters.origin} className={field} onChange={e => onFilters({ ...filters, origin: e.target.value })}>
            <option value="all">{t('Svi izvori')}</option>{Object.entries(sources).map(([id, label]) => <option key={id} value={id}>{t(label)}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={onDaily}>{t('Danas i izuzeci')}</Button>
        </>}
      </div>
      {daily ? queue.loading && !queue.rows.length ? <p className="p-4 text-sm" role="status">{t('Učitavanje operative…')}</p> :
        <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-4">{lanes.map(lane => {
          const items = dailyRows.filter(lane.match);
          return <section key={lane.title} className="min-w-0 rounded-lg bg-slate-50 p-3 dark:bg-slate-950">
            <h3 className={'mb-3 text-sm font-bold ' + lane.style}>{t(lane.title)} <span className="ml-1 tabular-nums">{items.length}</span></h3>
            {items.map((task, index) => {
              const row = orderById.get(Number(task.order_id));
              return <article key={task.reference + ':' + task.kind + ':' + (task.item.key || task.item.id || index)} className={panel + ' mb-2 space-y-2 p-3'}>
                <p className="text-xs text-slate-500">{[task.reference, row?.customer_name, row && routeLabel(row)].filter(Boolean).join(' · ')}</p>
                <button className="text-left text-sm font-semibold text-sky-700 hover:underline dark:text-sky-300" onClick={() => onOpen(task.order_id, taskSection(task))}>{taskTitle(task)}</button>
                {task.item.exception_reason && <p className="text-xs">{task.item.exception_reason}</p>}
                <p className="text-xs text-slate-500">{waiting(task) ? t('Čeka drugu stranu') : owner(task.item.responsible_user_id)} · {taskDue(task) || '—'}</p>
              </article>;
            })}
            {!items.length && <p className="text-xs text-slate-500">{t('Nema stavki.')}</p>}
          </section>;
        })}</div> :
        <><div className="overflow-x-auto"><DataTable className="min-w-[780px] text-sm">
          <thead><tr>{['Nalog / upit', 'Klijent', 'Status', 'Sljedeća radnja', 'Odgovoran', 'Rok radnje'].map(label => <th scope="col" key={label}>{t(label)}</th>)}</tr></thead>
          <tbody>{rows.map(row => {
            const candidates = tasksByOrder.get(Number(row.id)) || [];
            const filterTask = scope === 'late' ? overdue : scope === 'waiting' ? waiting : scope === 'mine' ? mine : undefined;
            const matching = filterTask ? candidates.filter(filterTask) : candidates;
            const task = [...matching].sort((a, b) =>
              (taskDue(a) || '9999').localeCompare(taskDue(b) || '9999'))[0];
            const inquiry = row.intake?.kind === 'inquiry';
            const section = task ? taskSection(task) : inquiry ? 'operations' : 'overview';
            return <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
              <td><button type="button" className="font-bold text-sky-700 hover:underline dark:text-sky-300" onClick={() => onOpen(row.id, 'operations')}>{row.reference}</button>
                <p className="mt-1 max-w-72 text-xs text-slate-600 dark:text-slate-300">{routeLabel(row) || row.title}</p>
                <p className="mt-1 text-xs text-slate-500">{[t(transportModes[row.intake?.department || row.transport_type] || row.transport_type || '—'), t(sources[(row.intake?.source || 'manual') as keyof typeof sources] || '—')].join(' · ')}</p>
              </td>
              <td>{row.customer_name || '—'}</td>
              <td><OpsStatus status={inquiry ? 'Upit' : row.settlement?.transport === 'delivered' && row.status !== 'closed' && row.status !== 'cancelled' ? 'delivered' : row.status} />
                {row.settlement?.order === 'awaiting_finance' && <p className="mt-1 text-xs text-slate-500">{t('Otvoren · čeka finansije')}</p>}
                {row.settlement?.order === 'review_required' && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{t('Potreban ponovni pregled')}</p>}
              </td>
              <td><button type="button" onClick={() => onOpen(row.id, section)} className="inline-flex items-center gap-1 text-left font-semibold text-sky-700 hover:underline dark:text-sky-300">{task ? taskTitle(task) : t(inquiry ? 'Otvori upit' : 'Status pošiljke')}<ArrowUpRight aria-hidden className="h-3.5 w-3.5 shrink-0" /></button></td>
              <td>{task && waiting(task) ? t('Čeka drugu stranu') : owner(task?.item.responsible_user_id ?? row.responsible_user_id)}</td>
              <td className={task && overdue(task) ? 'whitespace-nowrap font-semibold text-rose-700 dark:text-rose-300' : 'whitespace-nowrap'}>{task ? taskDue(task) || '—' : '—'}</td>
            </tr>;
          })}</tbody>
        </DataTable></div>{!rows.length && <p className="p-4 text-sm text-slate-500">{t('Nema naloga.')}</p>}</>}
    </div>
  </section>;
}
