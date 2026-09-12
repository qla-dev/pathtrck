import { useEffect, useState } from 'react';
import { AlertTriangle, Database, ExternalLink, Flag, Globe2, Landmark, Layers3, RefreshCw, Scale } from 'lucide-react';

import { api, type LegalJurisdiction } from '../../services/api';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import type { Language } from '../../types';
import { LegalSourcesTable } from '../legal/LegalSourcesTable';
import { HorizontalScrollMenu } from '../ui/HorizontalScrollMenu';
import { PageHeader } from '../ui/PageHeader';

type SourceMeta = {
  total: number;
  stored: number;
  linkOnly: number;
  manual: number;
  jurisdictions: Record<string, number>;
};

const JURISDICTIONS: { code: LegalJurisdiction; fallback: string; icon: typeof Landmark; tone: string }[] = [
  { code: 'BA', fallback: 'Bosnia and Herzegovina', icon: Landmark, tone: 'border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300' },
  { code: 'EU', fallback: 'European Union', icon: Globe2, tone: 'border-violet-200 bg-violet-50 text-violet-700 hover:border-violet-300 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300' },
  { code: 'HR', fallback: 'Croatia', icon: Flag, tone: 'border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300' },
  { code: 'RS', fallback: 'Serbia', icon: Flag, tone: 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300' },
];

export const LegalSourcesView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [meta, setMeta] = useState<SourceMeta>({ total: 0, stored: 0, linkOnly: 0, manual: 0, jurisdictions: {} });
  const [jurisdiction, setJurisdiction] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.legalSources.list({ per_page: 10 })
      .then((response) => {
        if (!active) return;
        setMeta({
          total: response.meta?.total ?? 0,
          stored: response.meta?.stored ?? 0,
          linkOnly: response.meta?.link_only ?? 0,
          manual: response.meta?.manual ?? 0,
          jurisdictions: response.meta?.jurisdictions ?? {},
        });
      })
      .catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : u('legal.error', 'The legal sources could not be loaded.'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshToken]);

  const statuses = [
    { value: '', label: u('legal.allStatuses', 'All statuses'), count: meta.total },
    { value: 'stored', label: u('legal.stored', 'Stored'), count: meta.stored },
    { value: 'link', label: u('legal.linkOnly', 'Link only'), count: meta.linkOnly },
    { value: 'manual', label: u('legal.manual', 'Manual update'), count: meta.manual },
  ];

  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader
        icon={Scale}
        title={u('legal.title', 'Laws & legal sources')}
        subtitle={u('legal.subtitle', 'Every document LenaAI cites, with the official source it was downloaded from.')}
        tone="violet"
        actions={(
          <button type="button" onClick={() => setRefreshToken((current) => current + 1)} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-violet-200 bg-white/70 px-3 text-xs font-bold text-violet-600 dark:border-violet-500/20 dark:bg-white/5 dark:text-violet-300">
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            {u('legal.refresh', 'Refresh')}
          </button>
        )}
        stats={[
          { label: u('legal.documents', 'Documents'), value: meta.total.toLocaleString(), icon: Database, tone: 'bg-sky-500/10 text-sky-500' },
          { label: u('legal.stored', 'Stored'), value: meta.stored.toLocaleString(), icon: Layers3, tone: 'bg-emerald-500/10 text-emerald-500' },
          { label: u('legal.linkOnly', 'Link only'), value: meta.linkOnly.toLocaleString(), icon: ExternalLink, tone: 'bg-violet-500/10 text-violet-500' },
          { label: u('legal.manual', 'Manual update'), value: meta.manual.toLocaleString(), icon: AlertTriangle, tone: 'bg-amber-500/10 text-amber-500' },
        ]}
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-start gap-3">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">{u('legal.jurisdictions', 'Jurisdictions')}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{u('legal.refreshHint', 'Run php artisan legal-sources:refresh to download updated versions.')}</p>
          </div>
          <div className="min-w-0 flex-1">
            <HorizontalScrollMenu className="min-w-0" ariaLabel={u('legal.table.status', 'Status')}>
              {statuses.map((item) => (
                <button key={item.value || 'all'} type="button" onClick={() => setStatus(item.value)} className={cn('inline-flex h-9 shrink-0 cursor-pointer items-center rounded-xl border px-3 text-xs font-bold transition-colors', status === item.value ? 'border-primary bg-primary text-white shadow-sm shadow-primary/20' : 'border-slate-200 bg-white text-slate-600 hover:border-primary/40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')}>
                  {item.label} <span className={cn('ml-1.5 text-[10px]', status === item.value ? 'text-white/75' : 'text-slate-400')}>({item.count})</span>
                </button>
              ))}
            </HorizontalScrollMenu>
          </div>
        </div>
        <div className="grid auto-cols-[minmax(220px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
          <button type="button" onClick={() => setJurisdiction('')} className={cn('min-h-24 cursor-pointer rounded-2xl border p-4 text-left transition-all', !jurisdiction ? 'border-primary bg-primary text-white shadow-lg shadow-primary/15' : 'border-slate-200 bg-white text-slate-700 hover:border-primary/40 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200')}>
            <Layers3 className="h-5 w-5" />
            <p className="mt-3 text-sm font-black">{u('legal.all', 'All jurisdictions')}</p>
            <p className={cn('mt-1 text-xs', !jurisdiction ? 'text-white/75' : 'text-slate-500')}>{meta.total.toLocaleString()} {u('legal.documentsShort', 'documents')}</p>
          </button>
          {loading
            ? JURISDICTIONS.map((item) => <div key={item.code} className="min-h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)
            : JURISDICTIONS.map((item) => {
              const Icon = item.icon;
              const selected = jurisdiction === item.code;
              return (
                <button key={item.code} type="button" onClick={() => setJurisdiction(item.code)} className={cn('min-h-24 cursor-pointer rounded-2xl border p-4 text-left transition-all', selected ? 'border-primary bg-primary text-white shadow-lg shadow-primary/15' : item.tone)}>
                  <Icon className="h-5 w-5" />
                  <p className="mt-3 text-sm font-black">{u(`legal.jurisdiction.${item.code}`, item.fallback)}</p>
                  <p className={cn('mt-1 text-xs', selected ? 'text-white/75' : 'opacity-70')}>{(meta.jurisdictions[item.code] ?? 0).toLocaleString()} {u('legal.documentsShort', 'documents')}</p>
                </button>
              );
            })}
        </div>
      </section>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">{error}</div>}
      <LegalSourcesTable lang={lang} jurisdiction={jurisdiction} status={status} refreshKey={refreshToken} />
    </div>
  );
};
