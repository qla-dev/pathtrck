import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Container,
  DoorOpen,
  Forklift,
  Gauge,
  HelpCircle,
  Layers,
  Lock,
  Package,
  Radio,
  ScanLine,
  Snowflake,
  ThermometerSnowflake,
  Truck,
  Warehouse as WarehouseIcon,
  type LucideIcon,
} from 'lucide-react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { WAREHOUSE_EQUIPMENT_OPTIONS, WAREHOUSE_STORAGE_TYPE_OPTIONS } from '../modals/loadFormOptions';
import { HeaderStatCard } from '../ui/PageHeader';

// The same glyphs the warehouse request form uses for each option, so the marketing preview and
// the real screens read as one product.
const STORAGE_TYPE_ICONS: Record<(typeof WAREHOUSE_STORAGE_TYPE_OPTIONS)[number], LucideIcon> = {
  Ambient: Package,
  Chilled: Snowflake,
  Frozen: ThermometerSnowflake,
  Hazmat: AlertTriangle,
  Bulk: Layers,
  Bonded: Lock,
  Outdoor: Container,
  Unsure: HelpCircle,
};

const EQUIPMENT_ICONS: Record<(typeof WAREHOUSE_EQUIPMENT_OPTIONS)[number], LucideIcon> = {
  Forklifts: Forklift,
  'Pallet Jacks': Package,
  'Reach Trucks': Truck,
  'Dock Levellers': Layers,
  Conveyors: Layers,
  'Handheld Scanners': ScanLine,
  'Dock Doors': DoorOpen,
};

const CAPACITY_PALLETS = 500;

// A meter is the form for one ratio against a limit: the fill carries severity and the unfilled
// track is a lighter step of that same ramp. The percentage is always printed beside it, so state
// never rests on colour alone.
const occupancyRamp = (percent: number) =>
  percent >= 90
    ? { fill: 'bg-rose-500', track: 'bg-rose-100 dark:bg-rose-500/15', ink: 'text-rose-600 dark:text-rose-400' }
    : percent >= 70
      ? { fill: 'bg-amber-500', track: 'bg-amber-100 dark:bg-amber-500/15', ink: 'text-amber-600 dark:text-amber-400' }
      : { fill: 'bg-emerald-500', track: 'bg-emerald-100 dark:bg-emerald-500/15', ink: 'text-emerald-600 dark:text-emerald-400' };

/**
 * The warehouse counterpart of FleetOnboardingPreview: the header KPI tiles, the live occupancy
 * meter from the warehouse status screen, and the storage-type / handling-equipment pickers from
 * the storage request form. Interactive on purpose - picking storage types moves the occupancy.
 */
export const WarehouseOnboardingPreview = ({ lang, className }: { lang: Language; className?: string }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [storageTypes, setStorageTypes] = useState<string[]>(['Chilled']);
  const [equipment, setEquipment] = useState<string[]>(['Forklifts', 'Dock Doors']);

  const toggle = (setter: (updater: (current: string[]) => string[]) => void, value: string) =>
    setter((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));

  // Every storage type booked takes another slice of the floor, so the meter reacts to the picker.
  const occupied = Math.min(CAPACITY_PALLETS, storageTypes.length * 130);
  const percent = Math.round((occupied / CAPACITY_PALLETS) * 100);
  const ramp = occupancyRamp(percent);

  const stats = useMemo(
    () => [
      { label: u('warehouseStatus.capacity', 'Capacity'), value: CAPACITY_PALLETS.toLocaleString(), icon: Gauge, tone: 'bg-sky-500/10 text-sky-500' },
      { label: u('warehouseStatus.occupied', 'Occupied'), value: occupied.toLocaleString(), icon: Boxes, tone: 'bg-orange-500/10 text-orange-500' },
      { label: u('warehouseStatus.available', 'Available'), value: (CAPACITY_PALLETS - occupied).toLocaleString(), icon: Package, tone: 'bg-emerald-500/10 text-emerald-500' },
      { label: u('warehouseView.occupancy', 'Occupancy'), value: `${percent}%`, icon: WarehouseIcon, tone: 'bg-violet-500/10 text-violet-500' },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [occupied, percent, lang]
  );

  const pill = (active: boolean) =>
    cn(
      'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold leading-none transition-colors',
      active
        ? 'border-primary bg-primary text-white'
        : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
    );

  return (
    <div className={cn('relative', className)}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-3 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 sm:p-5"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((stat) => (
            <HeaderStatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} />
          ))}
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2 text-orange-500">
            <Gauge className="h-4 w-4" />
            <p className="text-xs font-black uppercase tracking-wider">{u('warehouseView.occupancy', 'Occupancy')}</p>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className={cn('text-3xl font-black tabular-nums', ramp.ink)}>{percent}%</span>
            <span className="text-xs tabular-nums text-slate-500">
              {occupied.toLocaleString()} / {CAPACITY_PALLETS.toLocaleString()} {u('warehouseView.palletsUnit', 'paleta')}
            </span>
          </div>
          <div
            className={cn('h-2 w-full overflow-hidden rounded-full', ramp.track)}
            role="img"
            aria-label={`${u('warehouseView.occupancy', 'Occupancy')}: ${percent}%`}
          >
            <div className={cn('h-full rounded-full transition-all duration-500', ramp.fill)} style={{ width: `${percent}%` }} />
          </div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
            <Radio className="h-3 w-3 animate-pulse" />
            {u('common.live', 'Live')}
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2 text-primary">
            <WarehouseIcon className="h-4 w-4" />
            <p className="text-xs font-black uppercase tracking-wider">{u('postLoadModal.storageTypeTitle', 'Storage type')}</p>
          </div>
          <div className="space-y-1">
            <div className="flex min-h-10 items-center rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap gap-2">
                {WAREHOUSE_STORAGE_TYPE_OPTIONS.filter((option) => option !== 'Unsure').map((option) => {
                  const StorageIcon = STORAGE_TYPE_ICONS[option];
                  return (
                    <button key={option} type="button" onClick={() => toggle(setStorageTypes, option)} className={pill(storageTypes.includes(option))}>
                      <StorageIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="leading-none">{u(`postLoadModal.storageType.${option}`, option)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {u('postLoadModal.warehouseEquipment', 'Handling equipment')}
            </p>
            <div className="flex min-h-10 items-center rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap gap-2">
                {WAREHOUSE_EQUIPMENT_OPTIONS.map((option) => {
                  const EquipmentIcon = EQUIPMENT_ICONS[option];
                  return (
                    <button key={option} type="button" onClick={() => toggle(setEquipment, option)} className={pill(equipment.includes(option))}>
                      <EquipmentIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="leading-none">{u(`postLoadModal.warehouseEquipment.${option}`, option)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute -bottom-8 -left-4 max-w-[16rem] rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-800 sm:-left-8"
      >
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-sm font-bold dark:text-white">{u('landing.spaceBooked', 'Space booked')}</p>
        </div>
        <p className="text-xs text-slate-500">
          {u('landing.spaceBookedDesc', 'Matched to a verified warehouse with the handling gear you need.')}
        </p>
      </motion.div>
    </div>
  );
};
