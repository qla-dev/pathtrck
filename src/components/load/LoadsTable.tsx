import { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  CreditCard,
  DollarSign,
  Flag,
  MapPin,
  PackageSearch,
  Plane,
  Route,
  Scale,
  Ship,
  Truck,
  Zap,
} from 'lucide-react';

import { trGoodsType, trPaymentTerms, ui } from '../../i18n';
import { countryFlagUrl, estimateLoadDistanceMiles, getCountryCode, parseLoadPriceValue, parseLoadWeightValue } from '../../lib/loadGeo';
import { getBidState, getOfferLabel } from '../../lib/offerBid';
import { cn } from '../../lib/cn';
import { Language, Load } from '../../types';
import { Button } from '../ui/Button';

type TableSortKey =
  | 'pickup'
  | 'miles'
  | 'delivery'
  | 'provider'
  | 'equipment'
  | 'weight'
  | 'commodity'
  | 'paymentTerms'
  | 'urgency'
  | 'rate';
type SortDirection = 'asc' | 'desc';
type TableSortState = { key: TableSortKey; direction: SortDirection } | null;

type LoadsTableProps = {
  lang: Language;
  loads: Load[];
  userId?: number;
  onOpenDetails: (load: Load) => void;
};

const getSortValue = (load: Load, key: TableSortKey): string | number => {
  switch (key) {
    case 'pickup':
      return load.pickup.toLowerCase();
    case 'miles':
      return estimateLoadDistanceMiles(load.pickup, load.delivery);
    case 'delivery':
      return load.delivery.toLowerCase();
    case 'provider':
      return (load.shipperName || load.author || '').toLowerCase();
    case 'equipment':
      return (load.truckType || '').toLowerCase();
    case 'weight':
      return parseLoadWeightValue(load.weight);
    case 'commodity':
      return load.goodsType.toLowerCase();
    case 'paymentTerms':
      return load.paymentTerms.toLowerCase();
    case 'urgency':
      return (load.urgency || 'Standard').toLowerCase();
    case 'rate':
      return parseLoadPriceValue(load.price);
    default:
      return '';
  }
};

const getGoodsTone = (value: string) =>
  value === 'Flammable'
    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
    : value === 'Fragile'
      ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30'
      : value === 'High Value'
        ? 'bg-violet-500/10 text-violet-500 border-violet-500/30'
        : 'bg-slate-500/10 text-slate-500 border-slate-500/30';

const getPaymentTone = (value: string) =>
  value === 'In Advance'
    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
    : value === 'On Delivery'
      ? 'bg-sky-500/10 text-sky-500 border-sky-500/30'
      : 'bg-blue-500/10 text-blue-500 border-blue-500/30';

const getUrgencyTone = (value: string) =>
  value === 'Express'
    ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';

export const LoadsTable = ({ lang, loads, userId, onOpenDetails }: LoadsTableProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [sort, setSort] = useState<TableSortState>(null);

  const columns: Array<{ key: TableSortKey; label: string; icon: LucideIcon }> = [
    { key: 'pickup', label: u('home.table.pickup', 'Pickup'), icon: MapPin },
    { key: 'miles', label: u('home.table.distance', 'Est. miles'), icon: Route },
    { key: 'delivery', label: u('home.table.delivery', 'Delivery'), icon: Flag },
    { key: 'provider', label: u('home.table.provider', 'Provider'), icon: Building2 },
    { key: 'equipment', label: u('home.table.equipment', 'Equipment'), icon: Truck },
    { key: 'weight', label: u('home.table.weight', 'Weight'), icon: Scale },
    { key: 'commodity', label: u('legacy.sidebarFilter.goodsType', 'Goods type'), icon: PackageSearch },
    { key: 'paymentTerms', label: u('legacy.sidebarFilter.paymentTerms', 'Payment terms'), icon: CreditCard },
    { key: 'urgency', label: u('feed.filters.urgency', 'Urgency'), icon: Zap },
    { key: 'rate', label: u('home.table.rate', 'Rate'), icon: DollarSign },
  ];

  const toggleSort = (key: TableSortKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  };

  const rows = useMemo(() => {
    if (!sort) return loads;
    const items = [...loads];
    items.sort((a, b) => {
      const va = getSortValue(a, sort.key);
      const vb = getSortValue(b, sort.key);
      const comparison =
        typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sort.direction === 'asc' ? comparison : -comparison;
    });
    return items;
  }, [loads, sort]);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const theadRef = useRef<HTMLTableSectionElement>(null);
  const thRefs = useRef<Array<HTMLTableCellElement | null>>([]);
  const cloneRowRef = useRef<HTMLDivElement>(null);
  const [isDocked, setIsDocked] = useState(false);
  const [metrics, setMetrics] = useState<{ left: number; width: number; colWidths: number[] } | null>(null);

  const measure = () => {
    const wrapperEl = wrapperRef.current;
    if (!wrapperEl) return;
    const rect = wrapperEl.getBoundingClientRect();
    const colWidths = thRefs.current.map((th) => th?.offsetWidth || 0);
    setMetrics({ left: rect.left, width: rect.width, colWidths });
  };

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    const wrapperEl = wrapperRef.current;
    const resizeObserver = wrapperEl ? new ResizeObserver(measure) : null;
    if (wrapperEl && resizeObserver) resizeObserver.observe(wrapperEl);
    return () => {
      window.removeEventListener('resize', measure);
      resizeObserver?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows.length]);

  useEffect(() => {
    const el = theadRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const nextIsDocked = !entry.isIntersecting && entry.boundingClientRect.top < 100;
        if (nextIsDocked) measure();
        setIsDocked(nextIsDocked);
      },
      { threshold: 0, rootMargin: '-65px 0px 0px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isDocked && wrapperRef.current && cloneRowRef.current) {
      cloneRowRef.current.style.transform = `translateX(-${wrapperRef.current.scrollLeft}px)`;
    }
  }, [isDocked]);

  const handleWrapperScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (cloneRowRef.current) {
      cloneRowRef.current.style.transform = `translateX(-${event.currentTarget.scrollLeft}px)`;
    }
  };

  return (
    <div className="relative w-full">
      {isDocked && metrics && (
        <div
          className="fixed z-30 overflow-hidden border-b border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          style={{ top: 64, left: metrics.left, width: metrics.width }}
        >
          <div ref={cloneRowRef} className="flex text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {columns.map((column, index) => (
              <div key={column.key} style={{ width: metrics.colWidths[index] }} className="shrink-0 px-4 py-3">
                <button
                  type="button"
                  onClick={() => toggleSort(column.key)}
                  className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap transition-colors hover:text-primary"
                >
                  <column.icon className="h-3.5 w-3.5" />
                  {column.label}
                  {sort?.key === column.key ? (
                    sort.direction === 'asc' ? (
                      <ArrowUp className="h-3 w-3 text-primary" />
                    ) : (
                      <ArrowDown className="h-3 w-3 text-primary" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30" />
                  )}
                </button>
              </div>
            ))}
            <div style={{ width: metrics.colWidths[columns.length] }} className="shrink-0 px-4 py-3 text-right">
              {u('home.table.action', 'Action')}
            </div>
          </div>
        </div>
      )}

      <div
        ref={wrapperRef}
        onScroll={handleWrapperScroll}
        className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      >
      <table className="w-full min-w-[1080px] text-left text-sm">
        <thead ref={theadRef}>
          <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {columns.map((column, index) => (
              <th
                key={column.key}
                ref={(el) => { thRefs.current[index] = el; }}
                className="border-b border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <button
                  type="button"
                  onClick={() => toggleSort(column.key)}
                  className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap transition-colors hover:text-primary"
                >
                  <column.icon className="h-3.5 w-3.5" />
                  {column.label}
                  {sort?.key === column.key ? (
                    sort.direction === 'asc' ? (
                      <ArrowUp className="h-3 w-3 text-primary" />
                    ) : (
                      <ArrowDown className="h-3 w-3 text-primary" />
                    )
                  ) : (
                    <ArrowUpDown className="h-3 w-3 opacity-30" />
                  )}
                </button>
              </th>
            ))}
            <th
              ref={(el) => { thRefs.current[columns.length] = el; }}
              className="sticky right-0 z-20 border-b border-slate-100 bg-white px-4 py-3 text-right dark:border-slate-800 dark:bg-slate-900"
            >
              {u('home.table.action', 'Action')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((load) => {
            const offerCurrency = load.price.split(' ')[0] || 'EUR';
            const bidState = getBidState(load.offers, userId, load.budget);
            const hasBudget = Boolean(load.budget && load.budget > 0);
            const actionLabel = load.isNegotiable === false
              ? (hasBudget ? `${u('common.bookNow', 'Book now')} · ${load.price}` : u('common.bookNow', 'Book now'))
              : getOfferLabel(u, bidState, offerCurrency);
            const pickupCountryCode = getCountryCode(load.pickup);
            const deliveryCountryCode = getCountryCode(load.delivery);
            const TransportIcon = load.transportType === 'air' ? Plane : load.transportType === 'sea' ? Ship : Truck;

            return (
              <tr
                key={load.id}
                onClick={() => onOpenDetails(load)}
                className="group cursor-pointer border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {pickupCountryCode && (
                      <img src={countryFlagUrl(pickupCountryCode)} alt="" className="h-3 w-[18px] shrink-0 rounded-sm object-cover" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-700 dark:text-slate-200">{load.pickup}</p>
                      <p className="text-xs text-slate-400">{load.date}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {estimateLoadDistanceMiles(load.pickup, load.delivery)} mi
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {deliveryCountryCode && (
                      <img src={countryFlagUrl(deliveryCountryCode)} alt="" className="h-3 w-[18px] shrink-0 rounded-sm object-cover" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-700 dark:text-slate-200">{load.delivery}</p>
                      <p className="text-xs text-slate-400">{load.eta}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{load.shipperName || load.author}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <TransportIcon className="h-3.5 w-3.5 text-primary" />
                    {load.truckType || '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Scale className="h-3.5 w-3.5 text-slate-400" />
                    {load.weight} kg
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    title={trGoodsType(lang, load.goodsType)}
                    className={cn('inline-block w-44 truncate rounded-full border px-2.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider', getGoodsTone(load.goodsType))}
                  >
                    {trGoodsType(lang, load.goodsType)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    title={trPaymentTerms(lang, load.paymentTerms)}
                    className={cn('inline-block w-44 truncate rounded-full border px-2.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider', getPaymentTone(load.paymentTerms))}
                  >
                    {trPaymentTerms(lang, load.paymentTerms)}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn('inline-block w-44 truncate rounded-full border px-2.5 py-1 text-center text-[11px] font-bold uppercase tracking-wider', getUrgencyTone(load.urgency || 'Standard'))}>
                    {load.urgency === 'Express' ? u('feed.urgency.express', 'Express') : u('feed.urgency.standard', 'Standard')}
                  </span>
                </td>
                <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{load.price}</td>
                <td
                  className={cn(
                    'sticky right-0 z-[1] bg-white px-4 py-3 text-right dark:bg-slate-900',
                    'shadow-[-8px_0_12px_-8px_rgba(15,23,42,0.12)] dark:shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.45)]',
                    'group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60'
                  )}
                >
                  <Button
                    size="sm"
                    variant="primary"
                    className="w-48 justify-center truncate"
                    onClick={(event) => {
                      event.stopPropagation();
                      onOpenDetails(load);
                    }}
                  >
                    {actionLabel}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
};
