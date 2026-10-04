import { useEffect, useState } from 'react';
import { Package, Search } from 'lucide-react';

import { api } from '../../services/api';
import { TextField } from '../modals/AddWarehouseModal/fields';
import { money, type Row } from './accounting/shared';

/**
 * Searchable pick from the company catalogue (catalog_products: SmartFreight products plus PANTHEON
 * articles of the synced item sets). Used by CRM offer lines and service templates; POS has its own tiles.
 */
export function ProductPicker({ company, t, onPick }: { company: number; t: (k: string) => string; onPick: (product: Row) => void }) {
  const [query, setQuery] = useState(''); const [results, setResults] = useState<Row[]>([]); const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      api.accounting.get<Row>(company, `catalog?limit=12${query ? `&search=${encodeURIComponent(query)}` : ''}`).then(r => setResults(r.data.products ?? [])).catch(() => setResults([]));
    }, 200);
    return () => window.clearTimeout(handle);
  }, [company, query, open]);
  return <div className="relative">
    <TextField icon={Search} value={query} placeholder={t('catalog_pick')} onFocus={() => setOpen(true)} onBlur={() => window.setTimeout(() => setOpen(false), 150)} onChange={e => { setQuery(e.target.value); setOpen(true); }} />
    {open && <div className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
      {results.map(p => <button key={p.id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => { onPick(p); setQuery(''); setOpen(false); }}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
        <span className="flex min-w-0 items-center gap-2"><Package className="h-4 w-4 shrink-0 text-emerald-500" /><span className="min-w-0"><span className="block truncate font-semibold">{p.name}</span>
          <span className="block truncate text-xs text-slate-500">{p.code} · {p.unit}{p.vat_code ? ` · ${t('crm_vat_code')} ${p.vat_code}` : ''}{p.stock !== null && p.stock !== undefined ? ` · ${Number(p.stock)}` : ''}</span></span></span>
        <span className="shrink-0 text-xs font-bold">{p.sale_price !== null && p.sale_price !== undefined ? money(p.sale_price, p.currency) : '—'}</span>
      </button>)}
      {!results.length && <p className="px-3 py-3 text-sm text-slate-500">{t('catalog_empty')}</p>}
    </div>}
  </div>;
}
