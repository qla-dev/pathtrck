import { Database, LucideIcon, PlugZap, ShieldCheck } from 'lucide-react';
import { ReactNode } from 'react';
import { useApiList } from '../../hooks/useApiList';
import { ApiEnvelope } from '../../services/api';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { InlineDataState } from '../ui/InlineDataState';

type Row = Record<string, unknown>;
export const ApiCollectionPage = ({ title, description, empty, icon: Icon, request, render }: { title: string; description: string; empty: string; icon: LucideIcon; request: (params?: Record<string, string | number | boolean | undefined>) => Promise<ApiEnvelope<Row[]>>; render: (row: Row) => ReactNode }) => {
  const result = useApiList(request, { per_page: 100 });
  return <div className="space-y-6"><PageHeader
    icon={Icon}
    title={title}
    subtitle={description}
    stats={[
      { label: 'Database records', value: result.loading ? '—' : result.total, icon: Database, tone: 'bg-primary/10 text-primary' },
      { label: 'Laravel API', value: result.loading ? 'Connecting' : result.error ? 'Unavailable' : 'Connected', icon: result.error ? PlugZap : ShieldCheck, tone: result.error ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500' },
    ]}
  /><Card>{result.loading || result.error || result.items.length === 0 ? <InlineDataState loading={result.loading} error={result.error} empty={empty} onRetry={result.refresh} /> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{result.items.map((row) => <div key={String(row.id)} className="p-4">{render(row)}</div>)}</div>}</Card></div>;
};
