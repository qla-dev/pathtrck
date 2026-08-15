import { LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';
import { useApiList } from '../../hooks/useApiList';
import { ApiEnvelope } from '../../services/api';
import { Card } from '../ui/Card';
import { InlineDataState } from '../ui/InlineDataState';

type Row = Record<string, unknown>;
export const ApiCollectionPage = ({ title, description, empty, icon: Icon, request, render }: { title: string; description: string; empty: string; icon: LucideIcon; request: (params?: Record<string, string | number | boolean | undefined>) => Promise<ApiEnvelope<Row[]>>; render: (row: Row) => ReactNode }) => {
  const result = useApiList(request, { per_page: 100 });
  return <div className="space-y-6"><section className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-cyan-100 p-6 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-cyan-950"><div className="relative flex items-center gap-3"><div className="rounded-2xl bg-primary p-3 text-white shadow-lg shadow-primary/20"><Icon className="h-6 w-6" /></div><div><h1 className="text-2xl font-black text-slate-900 dark:text-white">{title}</h1><p className="text-sm text-slate-500 dark:text-slate-300">{description}</p></div></div></section><div className="grid gap-4 sm:grid-cols-2"><Card className="p-4"><p className="text-xs font-bold uppercase text-slate-500">Database records</p><p className="mt-1 text-3xl font-black dark:text-white">{result.loading ? '—' : result.total}</p></Card><Card className="p-4"><p className="text-xs font-bold uppercase text-slate-500">Laravel API</p><p className={`mt-1 text-lg font-black ${result.error ? 'text-rose-500' : 'text-emerald-500'}`}>{result.loading ? 'Connecting' : result.error ? 'Unavailable' : 'Connected'}</p></Card></div><Card>{result.loading || result.error || result.items.length === 0 ? <InlineDataState loading={result.loading} error={result.error} empty={empty} onRetry={result.refresh} /> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{result.items.map((row) => <div key={String(row.id)} className="p-4">{render(row)}</div>)}</div>}</Card></div>;
};
