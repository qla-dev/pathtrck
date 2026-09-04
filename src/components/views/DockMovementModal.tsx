import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  CalendarClock,
  Coins,
  ExternalLink,
  FileText,
  Layers,
  Loader2,
  Package,
  Ruler,
  Thermometer,
  Truck,
  Warehouse as WarehouseIcon,
  Weight,
  X,
  type LucideIcon,
} from 'lucide-react';

import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { Language } from '../../types';
import { api } from '../../services/api';
import { Card } from '../ui/Card';
import { WarehouseReceiveButton } from './WarehouseReceiveButton';

type MovementRow = Record<string, unknown>;

const text = (value: unknown, fallback = '—') => {
  const result = value === null || value === undefined ? '' : String(value).trim();
  return result === '' ? fallback : result;
};

const num = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatDateTime = (value: unknown) => {
  const date = value ? new Date(String(value)) : null;
  return date && !Number.isNaN(date.getTime())
    ? `${date.toLocaleDateString()} · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : '—';
};

const Fact = ({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone?: string }) => (
  <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tone || 'bg-primary/10 text-primary')}>
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <p className="truncate text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  </div>
);

/**
 * One dock movement in full - the warehouse counterpart of the tracking page's load details.
 *
 * A movement is not a journey, so none of what that modal is built around applies: there is no
 * route to draw, no driver to reach, no ETA to count down. What a warehouse needs to see is what
 * arrives or leaves, at which gate, for whom, and in what quantity - which is what this shows.
 *
 * When the movement came from a booked load, that load is one click away rather than restated here.
 */
export const DockMovementModal = ({
  open,
  lang,
  movementId,
  onClose,
  onOpenLoad,
  onMovementChanged,
}: {
  open: boolean;
  lang: Language;
  movementId: string | null;
  onClose: () => void;
  onOpenLoad?: (loadId: string, movementId?: string) => void;
  onMovementChanged?: () => void;
}) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [movement, setMovement] = useState<MovementRow | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !movementId) {
      setMovement(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    void api.warehouseMovements.get(movementId)
      .then((response) => {
        if (!cancelled) setMovement(response.data);
      })
      .catch(() => {
        if (!cancelled) setMovement(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [movementId, open]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.querySelector('[data-load-prebook="true"]')) onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose, open]);

  const isInbound = movement?.direction !== 'outbound';
  const status = String(movement?.status || 'scheduled');
  const warehouse = (movement?.warehouse || {}) as MovementRow;
  const freightLoad = (movement?.freight_load || {}) as MovementRow;
  const loadId = movement?.load_id == null ? '' : String(movement.load_id);

  const statusLabel = {
    scheduled: u('warehouseDocks.status.scheduled', 'Scheduled'),
    in_progress: u('warehouseDocks.status.inProgress', 'In progress'),
    completed: u('warehouseDocks.status.completed', 'Completed'),
    cancelled: u('warehouseDocks.status.cancelled', 'Cancelled'),
  }[status] || status;

  const statusTone = {
    scheduled: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    in_progress: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400',
    completed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    cancelled: 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400',
  }[status] || 'border-slate-300 bg-slate-500/10 text-slate-600 dark:text-slate-300';

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[220] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <div className="flex min-w-0 items-center gap-3">
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white', isInbound ? 'bg-emerald-500' : 'bg-violet-500')}>
                  {isInbound ? <ArrowDownToLine className="h-5 w-5" /> : <ArrowUpFromLine className="h-5 w-5" />}
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-black dark:text-white">{text(movement?.customer_name, u('warehouseDocks.movement', 'Dock movement'))}</h2>
                  <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                    {isInbound ? u('warehouseView.inbound', 'Inbound') : u('warehouseView.outbound', 'Outbound')}
                    {' · '}
                    {formatDateTime(movement?.scheduled_at)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={cn('hidden items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-wider sm:inline-flex', statusTone)}>
                  {statusLabel}
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  {u('common.loading', 'Loading...')}
                </div>
              ) : !movement ? (
                <p className="py-16 text-center text-sm text-slate-500">{u('warehouseDocks.notFound', 'This movement could not be loaded.')}</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Fact icon={CalendarClock} label={u('warehouseDocks.scheduledFor', 'Scheduled for')} value={formatDateTime(movement.scheduled_at)} tone="bg-sky-500/10 text-sky-500" />
                    <Fact icon={WarehouseIcon} label={u('warehouseView.colFacility', 'Warehouse')} value={text(warehouse.name)} tone="bg-orange-500/10 text-orange-500" />
                    <Fact icon={Truck} label={u('warehouseDocks.colDock', 'Dock')} value={text(movement.dock_number)} />
                    <Fact icon={Layers} label={u('postLoadModal.warehouseStorageType', 'Storage type')} value={text(movement.storage_type)} tone="bg-violet-500/10 text-violet-500" />
                  </div>

                  <Card className="shadow-none" contentClassName="p-4">
                    <p className="mb-3 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                      <Boxes className="h-4 w-4" />
                      {u('warehouseDocks.quantities', 'Quantities')}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      <Fact icon={Package} label={u('warehouseView.colPallets', 'Pallets')} value={num(movement.pallets).toLocaleString()} tone="bg-emerald-500/10 text-emerald-500" />
                      <Fact icon={Ruler} label={u('postLoadModal.volume', 'CBM')} value={movement.cbm == null ? '—' : `${num(movement.cbm).toLocaleString()} m³`} />
                      <Fact icon={Weight} label={u('postLoadModal.weight', 'Weight')} value={movement.weight_kg == null ? '—' : `${num(movement.weight_kg).toLocaleString()} kg`} />
                      <Fact
                        icon={Coins}
                        label={u('warehouseDocks.rate', 'Rate')}
                        value={movement.rate == null ? '—' : `${num(movement.rate).toLocaleString()} ${text(movement.currency, 'EUR')}`}
                        tone="bg-amber-500/10 text-amber-500"
                      />
                    </div>
                  </Card>

                  {(movement.completed_at || movement.description) && (
                    <Card className="shadow-none" contentClassName="space-y-3 p-4">
                      {movement.completed_at != null && (
                        <Fact icon={Thermometer} label={u('warehouseDocks.completedAt', 'Completed at')} value={formatDateTime(movement.completed_at)} tone="bg-emerald-500/10 text-emerald-500" />
                      )}
                      {movement.description != null && String(movement.description).trim() !== '' && (
                        <div>
                          <p className="mb-1 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
                            <FileText className="h-4 w-4" />
                            {u('warehouseDocks.note', 'Note')}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{String(movement.description)}</p>
                        </div>
                      )}
                    </Card>
                  )}

                  {/* Booked against a load: that load is the whole story of where the goods came
                      from or are going, so it is linked rather than half-repeated here. */}
                  {loadId !== '' && onOpenLoad && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => onOpenLoad(loadId, movementId || undefined)}
                        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-left transition-colors hover:bg-primary/10"
                      >
                        <span className="min-w-0">
                          <span className="block text-[10px] font-black uppercase tracking-wider text-primary">
                            {u('warehouseDocks.linkedLoad', 'Booked against load')}
                          </span>
                          <span className="block truncate text-sm font-bold text-slate-900 dark:text-white">
                            {text(freightLoad.title, `#${loadId}`)}
                          </span>
                        </span>
                        <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
                      </button>
                      <WarehouseReceiveButton
                        movementId={movementId}
                        movement={movement}
                        lang={lang}
                        className="h-11 w-full rounded-xl"
                        onReceived={(updated) => {
                          setMovement(updated);
                          onMovementChanged?.();
                        }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};
