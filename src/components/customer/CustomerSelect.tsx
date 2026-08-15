import { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, Check, ChevronDown, LoaderCircle, Search } from 'lucide-react';
import { api } from '../../services/api';
import { cn } from '../../lib/cn';

export type CustomerOption = {
  id: number;
  text: string;
  name: string;
  taxNumber: string;
  countryCode: string;
  city: string;
  address: string;
  source: string;
};

export const customerOptionFromRecord = (record: Record<string, unknown>): CustomerOption => ({
  id: Number(record.id),
  text: String(record.name || record.company_name || `Customer #${record.id}`),
  name: String(record.name || record.company_name || ''),
  taxNumber: String(record.tax_number || ''),
  countryCode: String(record.country_code || ''),
  city: String(record.city || ''),
  address: String(record.address || record.billing_address || ''),
  source: String(record.source || ''),
});

const mapOption = (record: Record<string, unknown>): CustomerOption => ({
  id: Number(record.id),
  text: String(record.text || record.name || `Customer #${record.id}`),
  name: String(record.name || record.text || ''),
  taxNumber: String(record.tax_number || ''),
  countryCode: String(record.country_code || ''),
  city: String(record.city || ''),
  address: String(record.address || ''),
  source: String(record.source || ''),
});

const optionMeta = (option: CustomerOption) =>
  [option.taxNumber, [option.city, option.countryCode].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join(' · ');

type CustomerSelectProps = {
  value: CustomerOption | null;
  onChange: (option: CustomerOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
};

export const CustomerSelect = ({
  value,
  onChange,
  placeholder = 'Search the global customer database',
  disabled = false,
  required = false,
}: CustomerSelectProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<CustomerOption[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchPage = useCallback(async (pageNumber: number, search: string, append: boolean) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError('');

    try {
      const response = await api.customerOptions({
        search: search.trim() || undefined,
        limit: 20,
        pageno: pageNumber,
      });
      if (requestId !== requestIdRef.current) return;

      const incoming = response.data.map(mapOption);
      setOptions((current) => {
        const combined = append ? [...current, ...incoming] : incoming;
        return Array.from(new Map(combined.map((option) => [option.id, option])).values());
      });
      setPage(pageNumber);
      setHasMore(Boolean(response.meta?.has_more));
    } catch (caught) {
      if (requestId !== requestIdRef.current) return;
      setError(caught instanceof Error ? caught.message : 'Customers could not be loaded.');
      if (!append) setOptions([]);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => void fetchPage(1, query, false), 300);
    return () => window.clearTimeout(timer);
  }, [fetchPage, open, query]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const loadMore = () => {
    if (!loading && hasMore) void fetchPage(page + 1, query, true);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex min-h-[54px] w-full items-center gap-3 rounded-xl border bg-slate-50 px-4 text-left text-sm outline-none transition dark:bg-slate-950 dark:text-white',
          open ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200 dark:border-slate-800',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <Building2 className="h-5 w-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          {value ? (
            <>
              <span className="block truncate font-bold">{value.text}</span>
              {optionMeta(value) && <span className="block truncate text-xs text-slate-500">{optionMeta(value)}</span>}
            </>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-[280] mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="border-b border-slate-100 p-3 dark:border-slate-800">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-950">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, tax number, city or country"
                className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none dark:text-white"
              />
              {loading && <LoaderCircle className="h-4 w-4 animate-spin text-primary" />}
            </div>
          </div>

          <div
            role="listbox"
            className="max-h-72 overflow-y-auto p-2"
            onScroll={(event) => {
              const target = event.currentTarget;
              if (target.scrollHeight - target.scrollTop - target.clientHeight < 64) loadMore();
            }}
          >
            {options.map((option) => {
              const selected = value?.id === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-sky-50 dark:hover:bg-slate-800',
                    selected && 'bg-sky-50 dark:bg-sky-950/40',
                  )}
                >
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold dark:text-white">{option.text}</span>
                    <span className="block truncate text-xs text-slate-500">{optionMeta(option) || 'No additional details'}</span>
                  </span>
                  {selected && <Check className="h-4 w-4 shrink-0 text-emerald-500" />}
                </button>
              );
            })}

            {!loading && options.length === 0 && !error && (
              <p className="px-3 py-8 text-center text-sm text-slate-500">No customers found.</p>
            )}
            {error && <p className="px-3 py-4 text-center text-sm font-semibold text-rose-600">{error}</p>}
            {hasMore && (
              <button
                type="button"
                disabled={loading}
                onClick={loadMore}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold text-primary hover:bg-sky-50 disabled:opacity-60 dark:hover:bg-slate-800"
              >
                {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {loading ? 'Loading...' : 'Load more'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
