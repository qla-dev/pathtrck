import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  CalendarClock,
  Coins,
  Flag,
  Handshake,
  MapPin,
  Package,
  Plane,
  Ship,
  ShieldAlert,
  Thermometer,
  TrainFront,
  Truck,
  Warehouse as WarehouseIcon,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { LenaLoadDetailsCard } from '../lena/LenaEmbeddedCards';
import { FilterLoads } from '../load/FilterLoads';
import { LoadItem } from '../load/LoadItem';
import { LANDING_DEMO_LOADS, LANDING_DEMO_LOAD_ITEMS, type DemoLoad } from './landingDemoLoads';

const TRANSPORT_ICONS: Record<string, LucideIcon> = {
  road: Truck,
  air: Plane,
  sea: Ship,
  rail: TrainFront,
  warehouse: WarehouseIcon,
};

const text = (value: unknown, fallback = '—') => {
  const result = value === null || value === undefined ? '' : String(value).trim();
  return result === '' ? fallback : result;
};

const num = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const stopOf = (load: DemoLoad, kind: 'pickup' | 'delivery') => {
  const stops = Array.isArray(load.stops) ? (load.stops as Record<string, unknown>[]) : [];
  return kind === 'pickup'
    ? stops.find((stop) => stop.type === 'pickup') || stops[0]
    : [...stops].reverse().find((stop) => stop.type === 'delivery') || stops.at(-1);
};

const formatWindow = (value: unknown) => String(value || '').replace('T', ' ').slice(0, 16) || '—';

/**
 * The landing page's load exchange. Everything it shows comes from LANDING_DEMO_LOADS - the page
 * is public, so it can never call the authenticated exchange endpoints. Picking a row opens the
 * same two views the app offers (details, and the pre-book terms), rendered from that static data.
 */
export const LandingLoadExchange = ({ lang, className }: { lang: Language; className?: string }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [openLoad, setOpenLoad] = useState<DemoLoad | null>(null);
  const [tab, setTab] = useState<'details' | 'prebook'>('details');
  const [search, setSearch] = useState('');
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [mode, setMode] = useState('all');
  const [goodsTypeIds, setGoodsTypeIds] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(6000);

  // The last demo shipment is held back from the board so the grid always ends on a full row.
  const board = LANDING_DEMO_LOAD_ITEMS.slice(0, -1);

  const goodsTypeOptions = useMemo(
    () =>
      Array.from(new Set(board.map((item) => item.goodsType).filter(Boolean))).map((value) => ({
        id: value,
        label: value,
        toneClass: 'border-primary/30 bg-primary/10 text-primary',
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const visible = board.filter((item) => {
    const haystack = `${item.title} ${item.pickup} ${item.delivery} ${item.bookingReference} ${item.goodsType}`.toLowerCase();
    if (search.trim() && !haystack.includes(search.trim().toLowerCase())) return false;
    if (startLocation.trim() && !item.pickup.toLowerCase().includes(startLocation.trim().toLowerCase())) return false;
    if (endLocation.trim() && !item.delivery.toLowerCase().includes(endLocation.trim().toLowerCase())) return false;
    if (mode !== 'all' && item.transportType !== mode) return false;
    if (goodsTypeIds.length > 0 && !goodsTypeIds.includes(item.goodsType)) return false;
    const budget = Number(item.budget || 0);
    if (budget < priceMin || budget > priceMax) return false;
    return true;
  });

  const clearFilters = () => {
    setSearch('');
    setStartLocation('');
    setEndLocation('');
    setMode('all');
    setGoodsTypeIds([]);
    setPriceMin(0);
    setPriceMax(6000);
  };

  const openWith = (load: DemoLoad, nextTab: 'details' | 'prebook') => {
    setOpenLoad(load);
    setTab(nextTab);
  };

  const pickup = openLoad ? stopOf(openLoad, 'pickup') : undefined;
  const delivery = openLoad ? stopOf(openLoad, 'delivery') : undefined;

  const terms = openLoad
    ? [
        { label: u('postLoadModal.budget', 'Budget'), value: `${text(openLoad.currency, 'EUR')} ${num(openLoad.budget).toLocaleString()}`, icon: Coins },
        { label: u('postLoadModal.paymentTerms', 'Payment terms'), value: text(openLoad.payment_terms), icon: CalendarClock },
        { label: u('postLoadModal.incoterms', 'Incoterms'), value: text(openLoad.incoterm), icon: Handshake },
        { label: u('landing.exchange.negotiable', 'Negotiable'), value: openLoad.is_negotiable ? u('common.yes', 'Yes') : u('common.no', 'No'), icon: Zap },
        { label: u('warehouseStatus.colWeight', 'Weight'), value: num(openLoad.weight_kg) > 0 ? `${num(openLoad.weight_kg).toLocaleString()} kg` : '—', icon: Boxes },
        { label: u('warehouseStatus.colVolume', 'Volume'), value: num(openLoad.volume_m3) > 0 ? `${num(openLoad.volume_m3)} m3` : '—', icon: Package },
        { label: u('warehouseView.palletsUnit', 'paleta'), value: num(openLoad.pallets) > 0 ? String(openLoad.pallets) : '—', icon: Boxes },
        {
          label: u('warehouseStatus.temperature', 'Temperature'),
          value: openLoad.temperature_min !== null || openLoad.temperature_max !== null
            ? `${text(openLoad.temperature_min, '?')}°C … ${text(openLoad.temperature_max, '?')}°C`
            : u('postLoadModal.ambient', 'Ambient'),
          icon: Thermometer,
        },
      ]
    : [];

  return (
    <div className={cn('min-w-0', className)}>

      <div className="mb-5">
        <FilterLoads
          lang={lang}
          trackingSearch={search}
          startLocation={startLocation}
          endLocation={endLocation}
          onTrackingSearchChange={setSearch}
          onStartLocationChange={setStartLocation}
          onEndLocationChange={setEndLocation}
          onClear={clearFilters}
          modeTabs={[
            { id: 'all', label: u('common.all', 'All') },
            { id: 'road', label: u('postLoadModal.road', 'Road') },
            { id: 'air', label: u('postLoadModal.air', 'Air') },
            { id: 'sea', label: u('postLoadModal.sea', 'Sea') },
            { id: 'rail', label: u('postLoadModal.rail', 'Rail') },
            { id: 'warehouse', label: u('postLoadModal.warehouse', 'Warehouse') },
          ]}
          activeModeTabId={mode}
          onModeTabChange={setMode}
          goodsTypeOptions={goodsTypeOptions}
          selectedGoodsTypeIds={goodsTypeIds}
          onToggleGoodsType={(id) =>
            setGoodsTypeIds((current) =>
              current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
            )
          }
          priceRange={{
            min: 0,
            max: 6000,
            selectedMin: priceMin,
            selectedMax: priceMax,
            onChange: (nextMin, nextMax) => { setPriceMin(nextMin); setPriceMax(nextMax); },
            prefix: 'EUR ',
            allowManualInput: true,
            step: 50,
          }}
        />
      </div>

      {visible.length === 0 && (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950">
          {u('landing.exchange.noMatches', 'No shipments match these filters.')}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((item) => (
          <LoadItem
            key={item.id}
            layout="grid"
            load={item}
            lang={lang}
            viewDetailsLabel={u('landing.exchange.offer', 'Make an offer')}
            onOpenDetails={() => {
              const demo = LANDING_DEMO_LOADS.find((row) => String(row.id) === item.id);
              if (demo) openWith(demo, 'details');
            }}
          />
        ))}
      </div>

      {createPortal(
        <AnimatePresence>
          {openLoad && (
            <motion.div
              className="fixed inset-0 z-[240] flex items-stretch justify-center overflow-hidden bg-slate-950/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onMouseDown={(event) => { if (event.target === event.currentTarget) setOpenLoad(null); }}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl dark:bg-slate-900"
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5 md:px-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-black dark:text-white">{text(openLoad.title)}</h2>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{text(openLoad.booking_reference)}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="hidden items-center rounded-full border border-sky-200/80 bg-sky-50/70 p-1 dark:border-slate-700 dark:bg-slate-900 sm:inline-flex">
                      {([
                        { id: 'details' as const, label: u('landing.exchange.tabDetails', 'Details'), icon: Package },
                        { id: 'prebook' as const, label: u('landing.exchange.tabPrebook', 'Pre-book'), icon: BadgeCheck },
                      ]).map((item) => {
                        const TabIcon = item.icon;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setTab(item.id)}
                            className={cn(
                              'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95',
                              tab === item.id
                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                : 'text-slate-500 hover:text-primary dark:text-slate-300',
                            )}
                          >
                            <TabIcon className="h-4 w-4" />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenLoad(null)}
                      className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800"
                    >
                      <X className="h-5 w-5 text-slate-500" />
                    </button>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  <div className="w-full space-y-3 p-3 pb-6 sm:p-4 sm:pb-6">
                    <div className="overflow-hidden rounded-2xl bg-white dark:bg-slate-900">
                      <LenaLoadDetailsCard lang={lang} load={openLoad} />
                    </div>

                    {tab === 'details' ? (
                      <div className="grid gap-3 lg:grid-cols-3">
                        {([
                          { title: u('legacy.loadDetails.pickup', 'Pickup'), stop: pickup, icon: MapPin, tone: 'text-sky-500' },
                          { title: u('legacy.loadDetails.delivery', 'Delivery'), stop: delivery, icon: Flag, tone: 'text-rose-500' },
                        ]).map((block) => {
                          const BlockIcon = block.icon;
                          return (
                            <div key={block.title} className="space-y-3 self-start rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                              <div className={cn('flex items-center gap-2', block.tone)}>
                                <BlockIcon className="h-4 w-4" />
                                <p className="text-xs font-black uppercase tracking-wider">{block.title}</p>
                              </div>
                              <dl className="space-y-2">
                                {[
                                  { label: u('warehouseStatus.location', 'Location'), value: `${text(block.stop?.city)}, ${text(block.stop?.country_code)}` },
                                  { label: u('warehouseStatus.address', 'Address'), value: text(block.stop?.address) },
                                  { label: u('postLoadModal.pickupWindow', 'Window'), value: `${formatWindow(block.stop?.window_starts_at)} — ${formatWindow(block.stop?.window_ends_at)}` },
                                ].map((row) => (
                                  <div key={row.label} className="flex items-start justify-between gap-3">
                                    <dt className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-500">{row.label}</dt>
                                    <dd className="min-w-0 break-words text-right text-xs font-semibold text-slate-800 dark:text-slate-200">{row.value}</dd>
                                  </div>
                                ))}
                              </dl>
                            </div>
                          );
                        })}

                        <div className="space-y-3 self-start rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                          <div className="flex items-center gap-2 text-emerald-500">
                            <Package className="h-4 w-4" />
                            <p className="text-xs font-black uppercase tracking-wider">{u('warehouseStatus.groupCargo', 'Cargo')}</p>
                          </div>
                          <dl className="space-y-2">
                            {[
                              { label: u('warehouseStatus.goodsType', 'Goods type'), value: text(openLoad.goods_type) },
                              { label: u('warehouseStatus.cargoType', 'Cargo type'), value: text(openLoad.cargo_type) },
                              { label: u('postLoadModal.dimensions', 'Dimensions'), value: num(openLoad.length_m) > 0 ? `${openLoad.length_m} × ${openLoad.width_m} × ${openLoad.height_m} m` : '—' },
                              { label: u('warehouseStatus.notes', 'Notes'), value: text(openLoad.notes) },
                            ].map((row) => (
                              <div key={row.label} className="flex items-start justify-between gap-3">
                                <dt className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-500">{row.label}</dt>
                                <dd className="min-w-0 break-words text-right text-xs font-semibold text-slate-800 dark:text-slate-200">{row.value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                          <div className="flex items-center gap-2 text-primary">
                            <Handshake className="h-4 w-4" />
                            <p className="text-xs font-black uppercase tracking-wider">{u('landing.exchange.terms', 'Booking terms')}</p>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            {terms.map((term) => {
                              const TermIcon = term.icon;
                              return (
                                <div key={term.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    <TermIcon className="h-3 w-3 shrink-0 text-primary" />
                                    {term.label}
                                  </p>
                                  <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">{term.value}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                          {u('landing.exchange.demoNotice', 'This is a sample shipment. Sign in to bid on and book real freight.')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
