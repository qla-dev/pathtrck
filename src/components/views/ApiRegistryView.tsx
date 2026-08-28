import { useEffect, useMemo, useState } from 'react';
import { Database, LucideIcon, Mail, PlugZap, Plus, Search, ShieldCheck } from 'lucide-react';
import { useApiList } from '../../hooks/useApiList';
import { ApiEnvelope } from '../../services/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { InlineDataState } from '../ui/InlineDataState';

type Row = Record<string, unknown>;
type Column = { label: string; value: (row: Row) => unknown };
type Props = { eyebrow: string; title: string; description: string; icon: LucideIcon; request: (params?: Record<string, string | number | boolean | undefined>) => Promise<ApiEnvelope<Row[]>>; filter?: (row: Row) => boolean; columns: Column[]; empty: string; onEmail?: () => void; actionLabel?: string; onAction?: () => void; refreshToken?: number };

export const ApiRegistryView = ({ eyebrow, title, description, icon: Icon, request, filter, columns, empty, onEmail, actionLabel, onAction, refreshToken }: Props) => {
  const [query, setQuery] = useState('');
  const result = useApiList(request, { per_page: 100 });
  useEffect(() => { if (refreshToken) void result.refresh(); }, [refreshToken, result.refresh]);
  const rows = useMemo(() => result.items.filter((row) => (!filter || filter(row)) && JSON.stringify(row).toLowerCase().includes(query.toLowerCase())), [filter, query, result.items]);
  return <div className="space-y-6">
    <PageHeader
      icon={Icon}
      title={title}
      subtitle={description}
      badge={<span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{eyebrow}</span>}
      actions={<>
        {onEmail && <Button variant="outline" onClick={onEmail}><Mail className="mr-2 h-4 w-4" />Email</Button>}
        {onAction && actionLabel && <Button onClick={onAction}><Plus className="mr-2 h-4 w-4" />{actionLabel}</Button>}
      </>}
      stats={[
        { label: 'Database records', value: result.loading ? '—' : rows.length, icon: Database, tone: 'bg-primary/10 text-primary' },
        { label: 'API status', value: result.loading ? 'Loading' : result.error ? 'Unavailable' : 'Connected', icon: result.error ? PlugZap : ShieldCheck, tone: result.error ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500' },
      ]}
    />
    <Card><div className="relative max-w-md"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()}...`} className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white" /></div>{result.loading || result.error || rows.length === 0 ? <InlineDataState loading={result.loading} error={result.error} empty={empty} onRetry={result.refresh} /> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">{columns.map((column) => <th key={column.label} className="p-3">{column.label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={String(row.id)} className="border-b border-slate-100 dark:border-slate-800">{columns.map((column) => <td key={column.label} className="p-3 text-sm text-slate-600 first:font-bold first:text-slate-900 dark:text-slate-300 dark:first:text-white">{String(column.value(row) || '—')}</td>)}</tr>)}</tbody></table></div>}</Card>
  </div>;
};
