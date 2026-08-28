import { useCallback, useMemo } from 'react';

import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { api, type ApiEnvelope, type TariffCatalogRow } from '../../services/api';
import type { Language } from '../../types';
import { ServerDataTable, type ServerDataTableColumn } from '../ui/ServerDataTable';

type TariffTableProps = {
  lang: Language;
  section: string;
  chapter: string;
  refreshKey: number;
};

type TableRow = TariffCatalogRow & Record<string, unknown>;

export const TariffTable = ({ lang, section, chapter, refreshKey }: TariffTableProps) => {
  const u = useCallback((key: string, fallback: string) => ui(lang, key, fallback), [lang]);

  const columns = useMemo<ServerDataTableColumn<TableRow>[]>(() => [
    {
      key: 'code',
      header: u('tariffs.table.code', 'Tariff code'),
      className: 'whitespace-nowrap align-top',
      render: (row) => row.code
        ? <span className={cn('font-mono text-xs font-black', row.selectable ? 'text-primary' : 'text-slate-500')}>{row.code}</span>
        : <span className="text-slate-300">—</span>,
      exportValue: (row) => row.code,
    },
    {
      key: 'name',
      header: u('tariffs.table.name', 'Description'),
      className: 'min-w-[360px] align-top',
      render: (row) => (
        <div className="flex items-start gap-2" style={{ paddingLeft: `${Math.min(8, row.depth ?? 0) * 10}px` }}>
          <span className={cn('mt-0.5 shrink-0 text-sm font-black', row.selectable ? 'text-primary' : 'text-slate-400')}>
            {row.selectable ? '•' : '›'}
          </span>
          <div className="min-w-0">
            <p className={cn('text-xs leading-5', row.selectable ? 'font-semibold text-slate-700 dark:text-slate-200' : 'font-bold text-slate-500')}>
              {row.name || row.description}
            </p>
            {row.parentCode && (
              <p className="mt-0.5 text-[10px] text-slate-400">
                {u('tariffs.table.parent', 'Parent')}: {row.parentCode}
              </p>
            )}
          </div>
        </div>
      ),
      exportValue: (row) => row.name || row.description,
    },
    {
      key: 'section',
      header: u('tariffs.table.section', 'Section'),
      className: 'max-w-[260px] align-top text-xs leading-5 text-slate-500',
      render: (row) => <span className="line-clamp-2">{row.section || '—'}</span>,
      exportValue: (row) => row.section,
    },
    {
      key: 'chapter',
      header: u('tariffs.table.chapter', 'Chapter'),
      className: 'max-w-[220px] align-top text-xs leading-5 text-slate-500',
      render: (row) => <span className="line-clamp-2">{row.chapterName || '—'}</span>,
      exportValue: (row) => row.chapterName,
    },
    {
      key: 'type',
      header: u('tariffs.table.type', 'Type'),
      className: 'whitespace-nowrap align-top',
      render: (row) => (
        <span className={cn(
          'inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wider',
          row.selectable
            ? 'border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-500/20'
            : 'border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800',
        )}>
          {row.selectable ? u('tariffs.table.leaf', 'Selectable') : u('tariffs.table.group', 'Group')}
        </span>
      ),
      exportValue: (row) => row.selectable ? u('tariffs.table.leaf', 'Selectable') : u('tariffs.table.group', 'Group'),
    },
  ], [u]);

  const request = useCallback(async (
    params: Record<string, string | number | boolean | undefined> = {},
  ): Promise<ApiEnvelope<TableRow[]>> => {
    const response = await api.tariffs.catalog({
      query: typeof params.search === 'string' ? params.search : undefined,
      section: section || undefined,
      chapter: chapter || undefined,
      page: typeof params.pageno === 'number' ? params.pageno : 1,
      per_page: typeof params.limit === 'number' ? params.limit : 50,
      lang,
    });

    return response as ApiEnvelope<TableRow[]>;
  }, [chapter, lang, section]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <ServerDataTable<TableRow>
        title={u('tariffs.title', 'Tariffs & HS')}
        request={request}
        columns={columns}
        refreshKey={refreshKey}
        initialPageSize={50}
        rowKey={(row) => String(row.catalogId ?? `${row.code}-${row.name}`)}
        emptyMessage={u('tariffs.empty', 'No tariff entries match your search.')}
      />
    </section>
  );
};
