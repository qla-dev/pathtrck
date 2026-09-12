import { useCallback, useMemo } from 'react';
import { ExternalLink, FileText, Globe, RefreshCcw } from 'lucide-react';

import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { API_BASE_URL, api, type ApiEnvelope, type LegalSourceRow } from '../../services/api';
import type { Language } from '../../types';
import { ServerDataTable, type ServerDataTableColumn } from '../ui/ServerDataTable';

type LegalSourcesTableProps = {
  lang: Language;
  jurisdiction: string;
  status: string;
  refreshKey: number;
};

type TableRow = LegalSourceRow & Record<string, unknown>;

export const JURISDICTION_TONES: Record<string, string> = {
  BA: 'border-sky-200 bg-sky-500/10 text-sky-600 dark:border-sky-500/20',
  EU: 'border-violet-200 bg-violet-500/10 text-violet-600 dark:border-violet-500/20',
  HR: 'border-rose-200 bg-rose-500/10 text-rose-600 dark:border-rose-500/20',
  RS: 'border-amber-200 bg-amber-500/10 text-amber-600 dark:border-amber-500/20',
};

const STATUS_TONES: Record<LegalSourceRow['status'], string> = {
  stored: 'border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/20',
  link: 'border-sky-200 bg-sky-500/10 text-sky-600 dark:border-sky-500/20',
  manual: 'border-amber-200 bg-amber-500/10 text-amber-600 dark:border-amber-500/20',
};

const formatBytes = (bytes: number | null) => {
  if (!bytes) return '';
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
};

const linkClass = 'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:text-slate-400';

export const LegalSourcesTable = ({ lang, jurisdiction, status, refreshKey }: LegalSourcesTableProps) => {
  const u = useCallback((key: string, fallback: string) => ui(lang, key, fallback), [lang]);
  const statusLabel = useCallback((value: LegalSourceRow['status']) => (
    value === 'stored' ? u('legal.stored', 'Stored') : value === 'link' ? u('legal.linkOnly', 'Link only') : u('legal.manual', 'Manual update')
  ), [u]);

  const columns = useMemo<ServerDataTableColumn<TableRow>[]>(() => [
    {
      key: 'title',
      header: u('legal.table.document', 'Document'),
      className: 'min-w-[360px] align-top',
      render: (row) => (
        <div className="min-w-0">
          <p className="text-xs font-bold leading-5 text-slate-700 dark:text-slate-200">{row.title}</p>
          <p className="mt-0.5 font-mono text-[10px] text-slate-400">{row.id}</p>
          <p className="mt-0.5 break-all text-[10px] text-slate-400">{row.folder}/documents/{row.file}</p>
          {row.note && <p className="mt-1 text-[10px] leading-4 text-amber-600 dark:text-amber-400">{row.note}</p>}
        </div>
      ),
      exportValue: (row) => row.title,
    },
    {
      key: 'jurisdiction',
      header: u('legal.table.jurisdiction', 'Jurisdiction'),
      className: 'whitespace-nowrap align-top',
      render: (row) => (
        <span title={u(`legal.jurisdiction.${row.jurisdiction}`, row.jurisdictionName)} className={cn('inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider', JURISDICTION_TONES[row.jurisdiction])}>
          {row.jurisdiction}
        </span>
      ),
      exportValue: (row) => row.jurisdiction,
    },
    {
      key: 'publisher',
      header: u('legal.table.publisher', 'Publisher'),
      className: 'max-w-[220px] align-top text-xs leading-5 text-slate-500',
      render: (row) => <span className="line-clamp-2">{row.publisher || '—'}</span>,
      exportValue: (row) => row.publisher,
    },
    {
      key: 'status',
      header: u('legal.table.status', 'Status'),
      className: 'whitespace-nowrap align-top',
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <span className={cn('inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider', STATUS_TONES[row.status])}>
            {statusLabel(row.status)}
          </span>
          {row.autoDiscover && (
            <span title={u('legal.autoHint', 'Follows the publisher page to newly uploaded versions')} className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
              <RefreshCcw className="h-3 w-3" /> {u('legal.auto', 'auto')}
            </span>
          )}
        </div>
      ),
      exportValue: (row) => statusLabel(row.status),
    },
    {
      key: 'retrieved',
      header: u('legal.table.retrieved', 'Retrieved'),
      className: 'whitespace-nowrap align-top text-xs text-slate-500',
      render: (row) => (
        <div>
          <p>{row.retrieved || '—'}</p>
          {row.bytes ? <p className="mt-0.5 text-[10px] text-slate-400">{formatBytes(row.bytes)}</p> : null}
        </div>
      ),
      exportValue: (row) => row.retrieved,
    },
    {
      key: 'links',
      header: u('legal.table.links', 'Links'),
      className: 'whitespace-nowrap align-top',
      exportable: false,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <a href={`${API_BASE_URL}/legal-sources/${encodeURIComponent(row.id)}`} target="_blank" rel="noreferrer" title={u('legal.open', 'Open document')} className={linkClass}>
            <FileText className="h-3.5 w-3.5" />
          </a>
          {row.url && (
            <a href={row.url} target="_blank" rel="noreferrer" title={u('legal.source', 'Download URL')} className={linkClass}>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {row.page && (
            <a href={row.page} target="_blank" rel="noreferrer" title={u('legal.page', 'Publisher page')} className={linkClass}>
              <Globe className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      ),
    },
  ], [statusLabel, u]);

  const request = useCallback(async (
    params: Record<string, string | number | boolean | undefined> = {},
  ): Promise<ApiEnvelope<TableRow[]>> => {
    const response = await api.legalSources.list({
      search: typeof params.search === 'string' ? params.search : undefined,
      jurisdiction: jurisdiction || undefined,
      status: status || undefined,
      page: typeof params.pageno === 'number' ? params.pageno : 1,
      per_page: typeof params.limit === 'number' ? params.limit : 50,
    });

    return response as ApiEnvelope<TableRow[]>;
  }, [jurisdiction, status]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <ServerDataTable<TableRow>
        title={u('legal.title', 'Laws & legal sources')}
        request={request}
        columns={columns}
        refreshKey={refreshKey}
        initialPageSize={50}
        rowKey={(row) => row.id}
        emptyMessage={u('legal.empty', 'No legal sources match your search.')}
      />
    </section>
  );
};
