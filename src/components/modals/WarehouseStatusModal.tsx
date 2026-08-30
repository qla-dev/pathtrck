import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  BarChart3,
  Ban,
  Boxes,
  ChevronRight,
  Clock3,
  FileText,
  Gauge,
  Layers,
  Loader2,
  MapPin,
  Package,
  Radio,
  ShieldCheck,
  Thermometer,
  Warehouse as WarehouseIcon,
  Weight,
  X,
} from 'lucide-react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { DataTable } from '../ui/DataTable';

type WarehouseStatusModalProps = {
  open: boolean;
  lang: Language;
  warehouseId: number | null;
  onClose: () => void;
};

type Row = Record<string, unknown>;

type StatusPayload = {
  warehouse: Row | null;
  occupancy: Row;
  stats: Row;
  by_storage_type: Row[];
  stock: Row[];
  movements: Row[];
};

const text = (value: unknown, fallback = '—') => {
  const result = value === null || value === undefined ? '' : String(value).trim();
  return result === '' ? fallback : result;
};

const num = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumber = (value: unknown, digits = 0) =>
  num(value).toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });

const formatDate = (value: unknown) => {
  const date = value ? new Date(String(value)) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString() : '—';
};

const formatDateTime = (value: unknown) => {
  const date = value ? new Date(String(value)) : null;
  return date && !Number.isNaN(date.getTime())
    ? `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : '—';
};

// A meter is the form for one ratio against a limit: the fill carries severity and the unfilled
// track is a lighter step of that same ramp, so how full the facility is reads across the whole
// bar. The percentage is always printed beside it, so state never rests on colour alone.
const occupancyRamp = (percent: number) =>
  percent >= 90
    ? { fill: 'bg-rose-500', track: 'bg-rose-100 dark:bg-rose-500/15', ink: 'text-rose-600 dark:text-rose-400' }
    : percent >= 70
      ? { fill: 'bg-amber-500', track: 'bg-amber-100 dark:bg-amber-500/15', ink: 'text-amber-600 dark:text-amber-400' }
      : { fill: 'bg-emerald-500', track: 'bg-emerald-100 dark:bg-emerald-500/15', ink: 'text-emerald-600 dark:text-emerald-400' };

const STATUS_BADGE: Record<string, { label: string; className: string; icon: typeof BadgeCheck }> = {
  verified: { label: 'Verified', className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400', icon: BadgeCheck },
  active: { label: 'Verified', className: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400', icon: BadgeCheck },
  pending: { label: 'Pending', className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400', icon: Clock3 },
  suspended: { label: 'Suspended', className: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400', icon: Ban },
};


// A view-only look at one stored consignment. Deliberately carries no booking or offer action:
// this screen is a warehouse operator inspecting what sits on their floor, not a marketplace
// listing.
const LoadDetailPanel = ({ lang, row, onClose }: { lang: Language; row: Row | null; onClose: () => void }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [load, setLoad] = useState<Row | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadId = row?.load_id ? Number(row.load_id) : null;

  useEffect(() => {
    if (!row) return undefined;
    setError('');
    setLoad(null);
    // Only a row backed by a freight load has anything more to fetch; the rest is already in the
    // ledger row we were handed.
    if (loadId) {
      setLoading(true);
      void api.loads
        .get(loadId)
        .then((response) => setLoad(response.data as unknown as Row))
        .catch(() => setError(ui(lang, 'warehouseStatus.loadDetailsFailed', 'Load details could not be loaded.')))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, loadId]);

  const temperatureText = load && (load.temperature_min !== null || load.temperature_max !== null)
    ? `${text(load.temperature_min, '?')}°C - ${text(load.temperature_max, '?')}°C`
    : '-';

  const groups: { title: string; icon: typeof Package; tone: string; rows: { label: string; value: string }[] }[] = row
    ? [
        {
          title: u('warehouseStatus.groupLedger', 'Warehouse ledger'),
          icon: Boxes,
          tone: 'text-violet-500',
          rows: [
            { label: u('warehouseStatus.colCustomer', 'Customer'), value: text(row.customer_name) },
            { label: u('warehouseStatus.colStorageType', 'Storage type'), value: text(row.storage_type) },
            { label: u('warehouseView.palletsUnit', 'paleta'), value: formatNumber(row.pallets) },
            { label: u('warehouseStatus.colWeight', 'Weight'), value: num(row.weight_kg) > 0 ? `${formatNumber(row.weight_kg)} kg` : '-' },
            { label: u('warehouseStatus.colVolume', 'Volume'), value: num(row.cbm) > 0 ? `${formatNumber(row.cbm, 2)} m3` : '-' },
            { label: u('warehouseStatus.rate', 'Storage charge'), value: num(row.rate) > 0 ? `${formatNumber(row.rate, 2)} ${text(row.currency, '')}`.trim() : '-' },
            { label: u('warehouseStatus.colStoredSince', 'Stored since'), value: formatDate(row.stored_since) },
            { label: u('warehouseStatus.description', 'Description'), value: text(row.description) },
          ],
        },
      ]
    : [];

  const loadGroups: typeof groups = load
    ? [
        {
          title: u('warehouseStatus.groupCargo', 'Cargo'),
          icon: Package,
          tone: 'text-orange-500',
          rows: [
            { label: u('warehouseStatus.colLoad', 'Load / goods'), value: text(load.title) },
            { label: u('warehouseStatus.goodsType', 'Goods type'), value: text(load.goods_type) },
            { label: u('warehouseStatus.cargoType', 'Cargo type'), value: text(load.cargo_type) },
            { label: u('warehouseStatus.colStorageType', 'Storage type'), value: text(load.storage_type) },
            { label: u('warehouseView.palletsUnit', 'paleta'), value: num(load.pallets) > 0 ? formatNumber(load.pallets) : '-' },
            { label: u('warehouseStatus.colWeight', 'Weight'), value: num(load.weight_kg) > 0 ? `${formatNumber(load.weight_kg)} kg` : '-' },
            { label: u('warehouseStatus.colVolume', 'Volume'), value: num(load.volume_m3) > 0 ? `${formatNumber(load.volume_m3, 2)} m3` : '-' },
            { label: u('warehouseStatus.temperature', 'Temperature'), value: temperatureText },
          ],
        },
        {
          title: u('warehouseStatus.groupStorage', 'Storage'),
          icon: WarehouseIcon,
          tone: 'text-sky-500',
          rows: [
            { label: u('warehouseStatus.colStoredSince', 'Stored since'), value: formatDate(load.storage_start_date) },
            { label: u('warehouseStatus.colUntil', 'Until'), value: load.is_storage_ongoing ? u('warehouseStatus.ongoing', 'Ongoing') : formatDate(load.storage_end_date) },
            { label: u('warehouses.colStatus', 'Status'), value: text(load.status) },
            { label: u('warehouseStatus.transportType', 'Transport type'), value: text(load.transport_type) },
            { label: u('warehouseStatus.reference', 'Reference'), value: text(load.booking_reference) },
            { label: u('warehouseStatus.createdAt', 'Registered'), value: formatDate(load.created_at) },
          ],
        },
        {
          title: u('warehouseStatus.groupHandling', 'Handling & notes'),
          icon: ShieldCheck,
          tone: 'text-emerald-500',
          rows: [
            { label: u('warehouseStatus.warehouseCity', 'Warehouse city'), value: text(load.warehouse_city) },
            { label: u('warehouseStatus.handlingRequirements', 'Handling'), value: Array.isArray(load.handling_requirements) ? load.handling_requirements.map(String).join(', ') || '-' : '-' },
            { label: u('warehouseStatus.handlingEquipment', 'Equipment'), value: Array.isArray(load.handling_equipment) ? load.handling_equipment.map(String).join(', ') || '-' : '-' },
            { label: u('warehouseStatus.notes', 'Notes'), value: text(load.notes) },
          ],
        },
      ]
    : [];

  const allGroups = [...groups, ...loadGroups];

  return (
    <AnimatePresence>
      {row !== null && (
        <motion.div
          className="fixed inset-0 z-[240] flex items-stretch justify-center overflow-hidden bg-slate-950/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
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
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-black dark:text-white">{text(load?.title || row?.description || row?.customer_name, u('warehouseStatus.loadDetails', 'Load details'))}</h2>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{loadId ? `#${loadId}` : u('warehouseStatus.unlinkedStock', 'Unlinked stock')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="w-full space-y-3 p-3 pb-6 sm:p-4 sm:pb-6">
                {loading && (
                  <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 p-10 text-sm text-slate-500 dark:border-slate-800">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    {u('common.loading', 'Loading...')}
                  </div>
                )}
                {!loading && error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">{error}</div>
                )}
                {!loading && !error && !loadId && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                    {u('warehouseStatus.noLinkedLoad', 'This stock is recorded only in the warehouse ledger - no freight load is linked to it.')}
                  </div>
                )}
                {!loading && !error && (
                  <div className="grid gap-3 lg:grid-cols-3">
                    {allGroups.map((group) => {
                      const GroupIcon = group.icon;
                      return (
                        <div key={group.title} className="space-y-3 self-start rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                          <div className={cn('flex items-center gap-2', group.tone)}>
                            <GroupIcon className="h-4 w-4" />
                            <p className="text-xs font-black uppercase tracking-wider">{group.title}</p>
                          </div>
                          <dl className="space-y-2">
                            {group.rows.map((row) => (
                              <div key={row.label} className="flex items-start justify-between gap-3">
                                <dt className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-500">{row.label}</dt>
                                <dd className="min-w-0 break-words text-right text-xs font-semibold text-slate-800 dark:text-slate-200">{row.value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const WarehouseStatusModal = ({ open, lang, warehouseId, onClose }: WarehouseStatusModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [data, setData] = useState<StatusPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // The occupancy/figures row stays put; only what sits under it swaps between the goods list and
  // the analytical panels.
  const [section, setSection] = useState<'stock' | 'stats'>('stock');
  const [detailRow, setDetailRow] = useState<Row | null>(null);

  useEffect(() => {
    if (!open || !warehouseId) return undefined;
    setLoading(true);
    setError('');
    setData(null);
    setSection('stock');
    setDetailRow(null);
    void api.warehouse
      .status(warehouseId)
      .then((response) => setData(response.data as unknown as StatusPayload))
      .catch(() => setError(u('warehouseStatus.loadFailed', 'Warehouse status could not be loaded.')))
      .finally(() => setLoading(false));

    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, warehouseId]);

  const warehouse = data?.warehouse || null;
  const occupancy = data?.occupancy || {};
  const stats = data?.stats || {};
  const percent = Math.max(0, Math.min(100, num(occupancy.occupancy_percent)));
  const ramp = occupancyRamp(percent);
  const statusKey = String(warehouse?.status || 'pending');
  const badge = STATUS_BADGE[statusKey] || STATUS_BADGE.pending;
  const BadgeGlyph = badge.icon;

  const arrayField = (value: unknown): string[] => (Array.isArray(value) ? value.map(String).filter(Boolean) : []);

  const detailRows: { label: string; value: string }[] = warehouse
    ? [
        { label: u('warehouseStatus.address', 'Address'), value: text(warehouse.address) },
        { label: u('warehouseStatus.location', 'Location'), value: [warehouse.city, warehouse.country_code].filter(Boolean).map(String).join(', ') || '—' },
        { label: u('warehouseStatus.contactEmail', 'Email'), value: text(warehouse.email) },
        { label: u('warehouseStatus.contactPhone', 'Phone'), value: text(warehouse.phone) },
        { label: u('warehouseStatus.taxNumber', 'Tax number'), value: text(warehouse.tax_number) },
        { label: u('warehouseStatus.registrationNumber', 'Registration number'), value: text(warehouse.registration_number) },
        { label: u('warehouseStatus.coordinates', 'Coordinates'), value: warehouse.latitude && warehouse.longitude ? `${text(warehouse.latitude)}, ${text(warehouse.longitude)}` : '—' },
        { label: u('warehouseStatus.createdAt', 'Registered'), value: formatDate(warehouse.created_at) },
      ]
    : [];

  const statTiles = [
    { label: u('warehouseStatus.capacity', 'Capacity'), value: `${formatNumber(occupancy.total_capacity_pallets)} ${u('warehouseView.palletsUnit', 'paleta')}`, icon: Gauge, tone: 'text-sky-500' },
    { label: u('warehouseStatus.occupied', 'Occupied'), value: `${formatNumber(occupancy.occupied_pallets)} ${u('warehouseView.palletsUnit', 'paleta')}`, icon: Boxes, tone: 'text-orange-500' },
    { label: u('warehouseStatus.available', 'Available'), value: `${formatNumber(occupancy.available_pallets)} ${u('warehouseView.palletsUnit', 'paleta')}`, icon: Package, tone: 'text-emerald-500' },
    { label: u('warehouseStatus.storedWeight', 'Stored weight'), value: `${formatNumber(stats.stored_weight_kg)} kg`, icon: Weight, tone: 'text-violet-500' },
    { label: u('warehouseStatus.storedVolume', 'Stored volume'), value: `${formatNumber(stats.stored_cbm, 2)} m³`, icon: Layers, tone: 'text-cyan-500' },
    { label: u('warehouseStatus.inboundToday', 'Inbound today'), value: formatNumber(stats.inbound_today), icon: ArrowDownToLine, tone: 'text-emerald-500' },
    { label: u('warehouseStatus.outboundToday', 'Outbound today'), value: formatNumber(stats.outbound_today), icon: ArrowUpFromLine, tone: 'text-rose-500' },
    { label: u('warehouseStatus.scheduled', 'Scheduled'), value: formatNumber(stats.scheduled_pending), icon: Clock3, tone: 'text-amber-500' },
  ];

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[220] flex items-stretch justify-center overflow-hidden bg-slate-950/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white">
                  <WarehouseIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-black dark:text-white">{text(warehouse?.name, u('warehouseStatus.title', 'Warehouse status'))}</h2>
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {[warehouse?.city, warehouse?.country_code].filter(Boolean).map(String).join(', ') || u('warehouseStatus.title', 'Warehouse status')}
                  </p>
                </div>
                <span className={cn('ml-1 hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold sm:inline-flex', badge.className)}>
                  <BadgeGlyph className="h-3.5 w-3.5" />
                  {u(`warehouses.status${badge.label}Label`, badge.label)}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="hidden items-center rounded-full border border-sky-200/80 bg-sky-50/70 p-1 dark:border-slate-700 dark:bg-slate-900 sm:inline-flex">
                  <button
                    type="button"
                    onClick={() => setSection('stock')}
                    className={cn(
                      'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95',
                      section === 'stock'
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'text-slate-500 hover:text-primary dark:text-slate-300',
                    )}
                  >
                    <Package className="h-4 w-4" />
                    {u('warehouseStatus.tabStock', 'Goods')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSection('stats')}
                    className={cn(
                      'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95',
                      section === 'stats'
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'text-slate-500 hover:text-primary dark:text-slate-300',
                    )}
                  >
                    <BarChart3 className="h-4 w-4" />
                    {u('warehouses.statistics', 'Statistics')}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="w-full space-y-3 p-3 pb-6 sm:p-4 sm:pb-6">
                {loading && (
                  <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 p-10 text-sm text-slate-500 dark:border-slate-800">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    {u('common.loading', 'Loading…')}
                  </div>
                )}

                {!loading && error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
                    {error}
                  </div>
                )}

                {!loading && !error && data && (
                  <>
                    <div className="grid gap-3 lg:grid-cols-3">
                      <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                        <div className="flex items-center gap-2 text-orange-500">
                          <Gauge className="h-4 w-4" />
                          <p className="text-xs font-black uppercase tracking-wider">{u('warehouseView.occupancy', 'Occupancy')}</p>
                        </div>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={cn('text-3xl font-black tabular-nums', ramp.ink)}>{percent}%</span>
                          <span className="text-xs tabular-nums text-slate-500">
                            {formatNumber(occupancy.occupied_pallets)} / {formatNumber(occupancy.total_capacity_pallets)} {u('warehouseView.palletsUnit', 'paleta')}
                          </span>
                        </div>
                        <div
                          className={cn('h-2 w-full overflow-hidden rounded-full', ramp.track)}
                          role="img"
                          aria-label={`${u('warehouseView.occupancy', 'Occupancy')}: ${percent}%`}
                        >
                          <div className={cn('h-full rounded-full', ramp.fill)} style={{ width: `${percent}%` }} />
                        </div>
                        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                          <Radio className="h-3 w-3 animate-pulse" />
                          {u('common.live', 'Live')}
                        </p>
                      </div>

                      <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 lg:col-span-2">
                        <div className="flex items-center gap-2 text-primary">
                          <Boxes className="h-4 w-4" />
                          <p className="text-xs font-black uppercase tracking-wider">{u('warehouseStatus.figures', 'Figures')}</p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                          {statTiles.map((tile) => {
                            const TileIcon = tile.icon;
                            return (
                              <div key={tile.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                                <div className="flex items-center gap-1.5">
                                  <TileIcon className={cn('h-3.5 w-3.5 shrink-0', tile.tone)} />
                                  <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">{tile.label}</p>
                                </div>
                                <p className="mt-1 truncate text-sm font-black tabular-nums text-slate-900 dark:text-white">{tile.value}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {section === 'stock' && (
                      <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-orange-500">
                            <Package className="h-4 w-4" />
                            <p className="text-xs font-black uppercase tracking-wider">{u('warehouseStatus.stock', 'Goods inside')}</p>
                          </div>
                          <span className="rounded-full bg-orange-500/10 px-2.5 py-1 text-[11px] font-bold tabular-nums text-orange-600 dark:text-orange-400">
                            {formatNumber(stats.stock_rows)} {u('warehouseStatus.consignments', 'consignments')}
                          </span>
                        </div>
                        {data.stock.length > 0 ? (
                          <div className="overflow-x-auto">
                            <DataTable className="min-w-[1060px] text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                                  <th className="p-3">{u('warehouseStatus.colLoad', 'Load / goods')}</th>
                                  <th className="p-3">{u('warehouseStatus.colCustomer', 'Customer')}</th>
                                  <th className="p-3">{u('warehouseStatus.colStorageType', 'Storage type')}</th>
                                  <th className="p-3 text-right">{u('warehouseView.palletsUnit', 'paleta')}</th>
                                  <th className="p-3 text-right">{u('warehouseStatus.colWeight', 'Weight')}</th>
                                  <th className="p-3 text-right">{u('warehouseStatus.colVolume', 'Volume')}</th>
                                  <th className="p-3">{u('warehouseStatus.colStoredSince', 'Stored since')}</th>
                                  <th className="p-3">{u('warehouseStatus.colUntil', 'Until')}</th>
                                  <th className="p-3 text-right">{u('Action', 'Action')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.stock.map((row, index) => {
                                  const load = (row.load || null) as Row | null;
                                  const temperature = load && (load.temperature_min !== null || load.temperature_max !== null)
                                    ? `${text(load.temperature_min, '—')}°C … ${text(load.temperature_max, '—')}°C`
                                    : '';
                                  return (
                                    <tr key={`${text(row.load_id, 'x')}-${index}`} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                                      <td className="p-3">
                                        <p className="font-bold text-slate-900 dark:text-white">{text(load?.title || row.description, u('warehouseStatus.unlinkedStock', 'Unlinked stock'))}</p>
                                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500">
                                          {load?.id ? <span>#{text(load.id)}</span> : null}
                                          {text(load?.goods_type, '') && <span>{text(load?.goods_type)}</span>}
                                          {text(load?.cargo_type, '') && <span>{text(load?.cargo_type)}</span>}
                                          {temperature && (
                                            <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400">
                                              <Thermometer className="h-3 w-3" />{temperature}
                                            </span>
                                          )}
                                        </p>
                                      </td>
                                      <td className="p-3 text-slate-600 dark:text-slate-300">{text(row.customer_name)}</td>
                                      <td className="p-3">
                                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                          {text(row.storage_type)}
                                        </span>
                                      </td>
                                      <td className="p-3 text-right font-bold tabular-nums text-slate-900 dark:text-white">{formatNumber(row.pallets)}</td>
                                      <td className="p-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{num(row.weight_kg) > 0 ? `${formatNumber(row.weight_kg)} kg` : '—'}</td>
                                      <td className="p-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{num(row.cbm) > 0 ? `${formatNumber(row.cbm, 2)} m³` : '—'}</td>
                                      <td className="p-3 tabular-nums text-slate-600 dark:text-slate-300">{formatDate(row.stored_since || load?.storage_start_date)}</td>
                                      <td className="p-3 tabular-nums text-slate-600 dark:text-slate-300">
                                        {load?.is_storage_ongoing ? u('warehouseStatus.ongoing', 'Ongoing') : formatDate(load?.storage_end_date)}
                                      </td>
                                      <td className="p-3 text-right">
                                        <Button size="sm" variant="outline" onClick={() => setDetailRow(row)}>
                                          <FileText className="mr-1.5 h-3.5 w-3.5" />
                                          {u('warehouseStatus.loadDetails', 'Load details')}
                                        </Button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </DataTable>
                          </div>
                        ) : (
                          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
                            {u('warehouseStatus.noStock', 'Nothing is stored in this warehouse right now.')}
                          </p>
                        )}
                      </div>
                    )}

                    {section === 'stats' && (
                      <>
                      <div className="grid gap-3 lg:grid-cols-3">
                        <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                          <div className="flex items-center gap-2 text-primary">
                            <WarehouseIcon className="h-4 w-4" />
                            <p className="text-xs font-black uppercase tracking-wider">{u('warehouseStatus.details', 'Details')}</p>
                          </div>
                          <dl className="space-y-2">
                            {detailRows.map((row) => (
                              <div key={row.label} className="flex items-start justify-between gap-3">
                                <dt className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-slate-500">{row.label}</dt>
                                <dd className="min-w-0 break-words text-right text-xs font-semibold text-slate-800 dark:text-slate-200">{row.value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>

                        <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                          <div className="flex items-center gap-2 text-emerald-500">
                            <ShieldCheck className="h-4 w-4" />
                            <p className="text-xs font-black uppercase tracking-wider">{u('warehouseStatus.capabilities', 'Storage & certificates')}</p>
                          </div>
                          {[
                            { label: u('warehouseStatus.storageTypes', 'Storage types'), values: arrayField(warehouse?.storage_types) },
                            { label: u('warehouseStatus.certifications', 'Certifications'), values: arrayField(warehouse?.certifications) },
                            { label: u('warehouseStatus.handling', 'Handling'), values: arrayField(warehouse?.handling_capabilities) },
                          ].map((group) => (
                            <div key={group.label} className="space-y-1">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{group.label}</p>
                              {group.values.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {group.values.map((value) => (
                                    <span key={value} className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                      {value}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400">—</p>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                          <div className="flex items-center gap-2 text-violet-500">
                            <Layers className="h-4 w-4" />
                            <p className="text-xs font-black uppercase tracking-wider">{u('warehouseStatus.byStorageType', 'Stock by storage type')}</p>
                          </div>
                          {data.by_storage_type.length > 0 ? (
                            <div className="space-y-2.5">
                              {data.by_storage_type.map((row) => {
                                const rowPallets = num(row.net_pallets);
                                const share = num(occupancy.occupied_pallets) > 0 ? Math.round((rowPallets / num(occupancy.occupied_pallets)) * 100) : 0;
                                return (
                                  <div key={text(row.storage_type, 'other')}>
                                    <div className="flex items-baseline justify-between gap-3 text-xs">
                                      <span className="truncate font-semibold text-slate-700 dark:text-slate-300">{text(row.storage_type)}</span>
                                      <span className="shrink-0 font-bold tabular-nums text-slate-900 dark:text-white">
                                        {formatNumber(rowPallets)} {u('warehouseView.palletsUnit', 'paleta')} · {share}%
                                      </span>
                                    </div>
                                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-violet-100 dark:bg-violet-500/15">
                                      <div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.min(100, share)}%` }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-400">{u('warehouseStatus.noStock', 'Nothing is stored in this warehouse right now.')}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                        <div className="flex items-center gap-2 text-sky-500">
                          <Clock3 className="h-4 w-4" />
                          <p className="text-xs font-black uppercase tracking-wider">{u('warehouseStatus.movements', 'Recent movements')}</p>
                        </div>
                        {data.movements.length > 0 ? (
                          <div className="overflow-x-auto">
                            <DataTable className="min-w-[720px] text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
                                  <th className="p-3">{u('warehouseStatus.colDirection', 'Direction')}</th>
                                  <th className="p-3">{u('warehouseStatus.colCustomer', 'Customer')}</th>
                                  <th className="p-3">{u('warehouseStatus.colDock', 'Dock')}</th>
                                  <th className="p-3 text-right">{u('warehouseView.palletsUnit', 'paleta')}</th>
                                  <th className="p-3">{u('warehouseStatus.colScheduled', 'Scheduled')}</th>
                                  <th className="p-3">{u('warehouses.colStatus', 'Status')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.movements.map((row) => {
                                  const inbound = row.direction === 'inbound';
                                  const completed = row.status === 'completed';
                                  return (
                                    <tr key={String(row.id)} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                                      <td className="p-3">
                                        <span className={cn('inline-flex items-center gap-1.5 text-xs font-bold', inbound ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                                          {inbound ? <ArrowDownToLine className="h-3.5 w-3.5" /> : <ArrowUpFromLine className="h-3.5 w-3.5" />}
                                          {inbound ? u('warehouseStatus.inbound', 'Inbound') : u('warehouseStatus.outbound', 'Outbound')}
                                        </span>
                                      </td>
                                      <td className="p-3 text-slate-600 dark:text-slate-300">{text(row.customer_name)}</td>
                                      <td className="p-3 text-slate-600 dark:text-slate-300">{text(row.dock_number)}</td>
                                      <td className="p-3 text-right font-bold tabular-nums text-slate-900 dark:text-white">{formatNumber(row.pallets)}</td>
                                      <td className="p-3 tabular-nums text-slate-600 dark:text-slate-300">{formatDateTime(row.scheduled_at)}</td>
                                      <td className="p-3">
                                        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold', completed
                                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400'
                                          : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400')}>
                                          {completed ? <BadgeCheck className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                                          {completed ? u('warehouseStatus.completed', 'Completed') : u('warehouseStatus.scheduledLabel', 'Scheduled')}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </DataTable>
                          </div>
                        ) : (
                          <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
                            {u('warehouseStatus.noMovements', 'No movements recorded yet.')}
                          </p>
                        )}
                      </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
          <LoadDetailPanel lang={lang} row={detailRow} onClose={() => setDetailRow(null)} />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
