import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowDown,
  ArrowUp,
  Box,
  Building2,
  CalendarDays,
  ChevronRight,
  Copy,
  Container,
  Coins,
  DoorOpen,
  Download,
  Eye,
  Gauge,
  Layers,
  ListOrdered,
  Maximize,
  Navigation2,
  PersonStanding,
  Plus,
  RotateCcw,
  RotateCw,
  Ruler,
  Save,
  ScanEye,
  Search,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  Truck,
  Upload,
  WandSparkles,
  Warehouse,
  X,
  ZoomIn,
  ZoomOut,
  type LucideIcon,
} from 'lucide-react';
import { api } from '../../services/api';
import { Language, Role } from '../../types';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { PinnedPanel } from '../ui/PinnedPanel';
import { PinnedPanelLeft } from '../ui/PinnedPanelLeft';
import { SmallModal } from '../ui/SmallModal';
import { planningLabels } from '../planning/labels';
import { autoPlan, Cargo, COLORS, Equipment, EQUIPMENT, fits, Plan, rackSlotsPerPage, readPlan, revalidate, validEquipment, volume, type RackItem, type RackPage } from '../planning/model';
import type { CameraSnapshot, SceneView } from '../planning/PlanningScene';

// Three.js is heavy, so the page renders first and each scene streams in behind a skeleton.
const PlanningScene = React.lazy(() => import('../planning/PlanningScene').then(module => ({ default: module.PlanningScene })));
// Load details drag in the whole tracking stack, maps included, so they stream in on first open.
const LoadDetailsModal = React.lazy(() => import('../tracking/LoadDetailsModal').then(module => ({ default: module.LoadDetailsModal })));

type Draft = { loadId?: string; reference?: string; route?: string; name: string; customer: string; length: number; width: number; height: number; weight: number | ''; pieces: number; shape: Cargo['shape']; stackable: boolean; pickup: string; delivery: string; documents: string };
const EMPTY_DRAFT: Draft = { name: '', customer: '', length: 1.2, width: .8, height: 1, weight: 250, pieces: 1, shape: 'box', stackable: false, pickup: '', delivery: '', documents: '' };
// Loads still being arranged or moved; received, finished and cancelled ones no longer need space.
const CURRENT_STATUSES = 'pending,booked,opened,in_delivery';
const positive = (value: unknown) => { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : 0; };
const round = (value: number) => Math.round(value * 1000) / 1000;
/** A tracking load stores totals, so pallets become EUR-pallet units sharing the weight; otherwise it is one unit of the recorded size. */
function loadDraft(row: Record<string, unknown>): Draft {
  const stops = Array.isArray(row.stops) ? row.stops as Record<string, unknown>[] : [];
  const pickup = stops.find(s => s.type === 'pickup'), delivery = [...stops].reverse().find(s => s.type === 'delivery');
  const place = (s?: Record<string, unknown>) => [s?.address, s?.city, s?.country_code].filter(Boolean).join(', ');
  const named = (value: unknown) => String((value as { name?: string } | null)?.name || '');
  const pallets = Math.min(300, Math.floor(positive(row.pallets))), pieces = Math.max(1, pallets), weight = positive(row.weight_kg), volume = positive(row.volume_m3);
  let length = positive(row.length_m) || 1.2, width = positive(row.width_m) || .8, height = positive(row.height_m);
  if (pallets) { length = 1.2; width = .8; height = height && height <= 3 ? height : volume ? volume / (pieces * .96) : 1.2; }
  else if (!height) height = volume ? volume / (length * width) : 1;
  const reference = String((row.shipment as { tracking_number?: string } | null)?.tracking_number || row.booking_reference || `#${row.id}`);
  return {
    loadId: String(row.id), reference, route: [pickup?.city, delivery?.city].filter(Boolean).join(' → '),
    name: String(row.title || reference).slice(0, 100), customer: (named(row.consignee) || named(row.company)).slice(0, 120),
    length: round(length), width: round(width), height: round(Math.min(Math.max(height, .05), 10)),
    weight: weight ? round(weight / pieces) : '', pieces, shape: pallets ? 'pallet' : 'box', stackable: false,
    pickup: place(pickup).slice(0, 250), delivery: place(delivery).slice(0, 250),
    documents: [row.goods_type || row.cargo_type, row.notes].filter(Boolean).join(' · ').slice(0, 2000),
  };
}

// The same field and label treatment as the other workspace screens.
const fieldClass = 'h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white';
const labelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500';

const RackSummaryCard = ({ item }: { item: RackItem }) => {
  const warehouse = item.side === 'warehouse';
  const status = item.status ? item.status.replaceAll('_', ' ') : '—';
  const route = item.route || item.groupLabel || '—';
  return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
    <div className="mb-2 flex items-center justify-between gap-3">
      <span className="min-w-0 truncate font-mono text-sm font-bold text-primary">{item.reference || `#${item.key}`}</span>
      <div className="flex shrink-0 items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300"><Truck className="h-3 w-3" />{warehouse ? 'WAREHOUSE' : 'ROAD'}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{status}</span>
      </div>
    </div>
    <p className="truncate text-base font-black text-slate-900 dark:text-white">{item.title || '—'}</p>
    <p className="mt-1 truncate text-xs font-semibold text-slate-400">Booking reference: {item.reference || '—'}</p>
    <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
      <div className="flex min-w-0 items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300"><span className="text-base">{warehouse ? '🏢' : '📍'}</span><span className="truncate text-xs font-bold">{warehouse ? item.groupLabel || 'Warehouse' : route.split(' → ')[0] || '—'}</span></div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
      <div className="flex min-w-0 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"><span className="text-base">{warehouse ? '📦' : '📍'}</span><span className="truncate text-xs font-bold">{warehouse ? item.storageType || 'Stored' : route.split(' → ')[1] || '—'}</span></div>
    </div>
    <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(6rem,1fr))] gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
      {([{ icon: Building2, label: warehouse ? 'Warehouse' : 'Carrier', value: item.groupLabel || '—', tone: 'text-primary' }, { icon: Truck, label: 'Driver', value: '—', tone: 'text-sky-500' }, { icon: Truck, label: 'Vehicle', value: '—', tone: 'text-violet-500' }] as { icon: LucideIcon; label: string; value: string; tone: string }[]).map(({ icon: Icon, label, value, tone }) => <div key={label} className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-2 py-2 dark:bg-slate-950"><Icon className={`h-4 w-4 shrink-0 ${tone}`} /><div className="min-w-0"><p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400" title={label}>{label}</p><p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{value}</p></div></div>)}
    </div>
    <div className="mt-2 grid grid-cols-2 gap-2">
      <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950"><Coins className="h-4 w-4 shrink-0 text-emerald-500" /><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pieces</p><p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{item.pallets || 0} pallets</p></div></div>
      <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950"><CalendarDays className="h-4 w-4 shrink-0 text-violet-500" /><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Transit</p><p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">Not scheduled</p></div></div>
    </div>
  </div>;
};
const toolButton = 'h-9 w-9 rounded-xl bg-white p-0 dark:bg-slate-900';
// 'partial' is the middle step of a three-way toggle: the active blue border and text, but the
// resting background, so it reads as "on, but not fully" against both themes.
const overlayToggle = (on: boolean | 'partial') => cn(
  'pointer-events-auto inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border backdrop-blur transition-all active:scale-95',
  on === 'partial' ? 'border-primary bg-white/90 text-primary dark:border-primary dark:bg-slate-900/90 dark:text-primary'
    : on ? 'border-primary bg-primary text-white'
    : 'border-slate-200 bg-white/90 text-slate-600 hover:text-primary dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300',
);
type SettingsTab = 'equipment' | 'cargo' | 'utilization' | 'sequence';
const SETTINGS_TABS: { value: SettingsTab; icon: LucideIcon }[] = [
  { value: 'equipment', icon: Container },
  { value: 'cargo', icon: Box },
  { value: 'utilization', icon: Gauge },
  { value: 'sequence', icon: ListOrdered },
];
const SCREENS: { value: SceneView; icon: LucideIcon }[] = [
  { value: 'overview', icon: Box },
  { value: 'exterior', icon: Container },
  { value: 'loading', icon: DoorOpen },
  { value: 'top', icon: Eye },
  { value: 'side', icon: Layers },
];

const CardHeading = ({ icon: Icon, tone, title, subtitle, id, children }: { icon: LucideIcon; tone: string; title: React.ReactNode; subtitle?: string; id?: string; children?: React.ReactNode }) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex min-w-0 items-center gap-2">
      <Icon className={cn('h-4 w-4 shrink-0', tone)} />
      <div className="min-w-0">
        <p id={id} className="text-sm font-black text-slate-900 dark:text-white">{title}</p>
        {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
      </div>
    </div>
    {children}
  </div>
);

const SceneSkeleton = ({ label }: { label: string }) => (
  <div role="status" aria-label={label} className="flex h-full w-full animate-pulse items-center justify-center bg-slate-200/70 dark:bg-slate-800/60">
    <Container className="h-10 w-10 text-slate-400 dark:text-slate-600" />
  </div>
);

export default function LoadPlanningView({ lang, userId, role }: { lang: Language; userId?: number; role?: Role }) {
  const t = planningLabels(lang);
  const [plan, setPlan] = useState<Plan>({ version: 1, name: '', equipment: { ...EQUIPMENT[0] }, cargo: [] });
  const [view, setView] = useState<SceneView>('overview');
  const [activeView, setActiveView] = useState<SceneView | null>('overview');
  const [selected, setSelected] = useState('');
  // The virtual workspace always starts as a complete warehouse overview: a generic 40HC container
  // between both rack systems. The scene animates the two rack groups into this initial state.
  const [warehouse, setWarehouse] = useState(true), [wallsMode, setWallsMode] = useState<'solid' | 'through' | 'off'>('solid'), [dimensionsOn, setDimensionsOn] = useState(true);
  const [ambient, setAmbient] = useState(true);
  // Walls cycle solid → see through → off; the scene still takes the two plain flags it always did.
  const walls = wallsMode !== 'off', seeThrough = wallsMode === 'through';
  const [tracking, setTracking] = useState(true);
  const [racks, setRacks] = useState<{ warehouse?: RackPage; tracking?: RackPage }>({});
  const [rackPick, setRackPick] = useState<RackItem | null>(null);
  const [openLoadId, setOpenLoadId] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('equipment');
  const [equipmentTab, setEquipmentTab] = useState<'container' | 'vehicle' | 'custom'>(() => (plan.equipment.truck ? 'vehicle' : 'container'));
  const [carrying, setCarrying] = useState(false);
  const [panel, setPanel] = useState<'view' | null>(null);
  // The View sidebar opens at once with placeholders; live previews then mount one at a time after the
  // slide-in, so creating their WebGL scenes never stalls the panel animation.
  const [previewCount, setPreviewCount] = useState(0);
  useEffect(() => {
    if (panel !== 'view') { setPreviewCount(0); return; }
    let count = 0;
    const timer = setInterval(() => { count += 1; setPreviewCount(count); if (count >= SCREENS.length) clearInterval(timer); }, 180);
    return () => clearInterval(timer);
  }, [panel]);
  const [reset, setReset] = useState(0), [zoom, setZoom] = useState(0), [overview, setOverview] = useState(0);
  const [cameraSnapshot, setCameraSnapshot] = useState(0);
  const [adding, setAdding] = useState(false), [notice, setNotice] = useState('');
  const [vehicles, setVehicles] = useState<Record<string, unknown>[]>([]);
  const [fleetError, setFleetError] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT), [draftKey, setDraftKey] = useState(0);
  const [trackingQuery, setTrackingQuery] = useState(''), [trackingLoads, setTrackingLoads] = useState<Record<string, unknown>[]>([]), [trackingState, setTrackingState] = useState<'loading' | 'idle' | 'error'>('idle');
  const viewport = useRef<HTMLDivElement>(null), importInput = useRef<HTMLInputElement>(null);
  const key = `freightbook-loading-plan-v1-${userId ?? 'guest'}`;

  useEffect(() => {
    if (!adding) return;
    let active = true;
    setTrackingState('loading');
    const timer = setTimeout(async () => {
      try {
        const response = await api.loads.list({ tracking: true, for_storage: false, per_page: 50, sort: 'date_desc', statuses: CURRENT_STATUSES, tracking_search: trackingQuery.trim() || undefined });
        if (active) { setTrackingLoads(response.data); setTrackingState('idle'); }
      } catch { if (active) setTrackingState('error'); }
    }, trackingQuery ? 300 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [adding, trackingQuery]);
  // Entering the virtual workspace is intentionally a fresh planning session. Saved plans remain
  // available through Import, but should not replace the generic scene that opens from “Go virtual”.
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rows: Record<string, unknown>[] = [];
        for (let page = 1; page <= 100; page++) {
          const response = await api.vehicles.list({ page, per_page: 100 });
          rows.push(...response.data);
          if (page >= Number(response.meta?.last_page ?? 1)) break;
        }
        if (active) setVehicles(rows.filter(v => !v.transport_type || v.transport_type === 'road'));
      } catch { if (active) setFleetError(true); }
    };
    void load();
    return () => { active = false; };
  }, []);

  const e = plan.equipment, cargo = plan.cargo;
  const current = cargo.find(c => c.id === selected);
  useEffect(() => { if (current) setPosition({ x: +current.x.toFixed(3), y: +current.y.toFixed(3), z: +current.z.toFixed(3) }); }, [current]);
  const placed = cargo.filter(c => c.placed), usedVolume = placed.reduce((s, c) => s + volume(c), 0), usedWeight = placed.reduce((s, c) => s + c.weight, 0);
  const volumePercent = usedVolume / volume(e) * 100, weightPercent = usedWeight / e.payload * 100;
  const occupiedLength = Math.max(0, ...placed.map(c => c.x + c.length));

  const settingsTabLabels: Record<SettingsTab, string> = { equipment: t.equipment, cargo: t.shipments, utilization: t.usage, sequence: t.order };
  const togglePanel = (next: 'view') => setPanel(currentPanel => currentPanel === next ? null : next);
  // An open sidebar rolls over the page header, so it carries its own View switch.
  const panelSwitch = (
    <>
      {([['view', Eye, t.viewPanel]] as const).map(([id, Icon, label]) => (
        <button key={id} type="button" aria-pressed={panel === id} aria-label={label} title={label} onClick={() => togglePanel(id)}
          className={cn('flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition-colors', panel === id ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-slate-100 text-slate-600 hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')}>
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </>
  );
  const changeEquipment = (next: Equipment) => { if (!validEquipment(next)) { setNotice(t.invalid); return; } setPlan(p => ({ ...p, equipment: next, cargo: revalidate(p.cargo, next) })); };
  const move = (id: string, x: number, y: number, z: number) => {
    const c = cargo.find(c => c.id === id); if (!c) return;
    const next = { ...c, x, y, z, placed: true }; if (!fits(next, cargo, e)) { setNotice(t.invalid); return; }
    setPlan(p => ({ ...p, cargo: revalidate(p.cargo.map(c => c.id === id ? next : c), e) })); setSelected(id); setNotice('');
  };
  // Taken out of the unit: back to waiting outside. Anything that stood on it loses its support and comes out too.
  const unplace = (id: string) => setPlan(p => ({ ...p, cargo: revalidate(p.cargo.map(c => (c.id === id ? { ...c, placed: false } : c)), p.equipment) }));
  const remove = (id: string) => setPlan(p => ({ ...p, cargo: revalidate(p.cargo.filter(c => c.id !== id), e) }));
  const rotate = () => { if (!current) return; const next = { ...current, length: current.width, width: current.length }; if (current.placed && !fits(next, cargo, e)) { setNotice(t.invalid); return; } setPlan(p => ({ ...p, cargo: revalidate(p.cargo.map(c => c.id === selected ? next : c), e) })); };
  const copyCamera = (snapshot: CameraSnapshot) => { void navigator.clipboard?.writeText(JSON.stringify(snapshot, null, 2)); setNotice('Camera POV copied as JSON.'); };
  const reorder = (id: string, delta: number) => { const next = [...cargo], i = next.findIndex(c => c.id === id), j = i + delta; if (j < 0 || j >= next.length) return; [next[i], next[j]] = [next[j], next[i]]; setPlan(p => ({ ...p, cargo: next })); };
  // Bringing cargo out is staged like a warehouse move: turn to the overview (Settings collapses so it can be seen),
  // bring in the racks if hidden, lift the walls away, then take the cargo off the shelves.
  const stage = (bringOut: () => void) => {
    setView('overview'); setOverview(n => n + 1);
    let wait = 700;
    if (!warehouse) { setTimeout(() => setWarehouse(true), wait); wait += 1300; }
    if (walls) { setTimeout(() => setWallsMode('off'), wait); wait += 700; }
    setTimeout(bringOut, wait);
  };
  // Switching the warehouse on turns to the overview first so the racks drop into a view that shows them; off just lifts them away.
  const toggleWarehouse = () => {
    if (warehouse) { setWarehouse(false); return; }
    setView('overview'); setOverview(n => n + 1);
    setTimeout(() => setWarehouse(true), 700);
  };
  const toggleTracking = () => {
    if (tracking) { setTracking(false); return; }
    setView('overview'); setOverview(n => n + 1);
    setTimeout(() => setTracking(true), 700);
  };
  // Real cargo for the inner rack rows, one page of rack slots at a time: warehouse stock on one side, current tracking loads on the other.
  const loadRack = async (side: 'warehouse' | 'tracking', page: number) => {
    const per_page = rackSlotsPerPage(plan.equipment.length);
    const text = (value: unknown) => (value == null ? '' : String(value));
    const positiveOrUndefined = (value: unknown) => (Number(value) > 0 ? Number(value) : undefined);
    try {
      if (side === 'warehouse') {
        const response = await api.loadPlanning.warehouseRack({ page, per_page });
        const labelsById = new Map((response.data.warehouses ?? []).map(w => [text(w.id), `${text(w.name)} · ${Number(w.occupied_pallets ?? 0).toLocaleString()} ${t.rackPallets}`] as [string, string]));
        const items: RackItem[] = (response.data.items ?? []).map(row => {
          const load = (row.load ?? null) as Record<string, unknown> | null;
          return {
            key: text(row.key), side, title: text(load?.title || row.description || row.customer_name) || t.warehouse,
            group: text(row.warehouse_id), groupLabel: labelsById.get(text(row.warehouse_id)) ?? text(row.warehouse_name),
            pallets: Number(row.pallets) || 0, weight: Number(row.weight_kg) || 0, volume: Number(row.cbm) || 0,
            customer: text(row.customer_name), status: text(load?.status), storageType: text(row.storage_type), storedSince: text(row.stored_since),
            route: text(row.warehouse_name), reference: load?.id ? `#${text(load.id)}` : '', loadId: load?.id ? text(load.id) : undefined,
            length: positiveOrUndefined(load?.length_m), width: positiveOrUndefined(load?.width_m), height: positiveOrUndefined(load?.height_m),
          };
        });
        const meta = response.meta ?? {};
        setRacks(r => ({ ...r, warehouse: { items, page: Number(meta.current_page ?? page), lastPage: Number(meta.last_page ?? 1), total: Number(meta.total ?? items.length) } }));
      } else {
        const response = await api.loadPlanning.trackingRack({ page, per_page });
        const meta = response.meta ?? {}, total = Number(meta.total ?? response.data.length);
        const items: RackItem[] = response.data.map(row => ({
          key: `t:${text(row.id)}`, side, title: text(row.title) || text(row.reference), group: 'tracking', groupLabel: `${t.tracking} · ${total.toLocaleString()}`,
          pallets: Number(row.pallets) || 0, weight: Number(row.weight_kg) || 0, volume: Number(row.volume_m3) || 0,
          customer: text(row.customer), status: text(row.status).replaceAll('_', ' '), storageType: text(row.goods_type), storedSince: '',
          route: [row.pickup_city, row.delivery_city].filter(Boolean).join(' → '), reference: text(row.reference), loadId: text(row.id),
          length: positiveOrUndefined(row.length_m), width: positiveOrUndefined(row.width_m), height: positiveOrUndefined(row.height_m),
        }));
        setRacks(r => ({ ...r, tracking: { items, page: Number(meta.current_page ?? page), lastPage: Number(meta.last_page ?? 1), total } }));
      }
    } catch { setNotice(t.rackFailed); }
  };
  // Slot counts follow the unit's length, so another unit starts the racks again from page one.
  useEffect(() => { setRacks({}); }, [plan.equipment.length]);
  useEffect(() => { if (warehouse && !racks.warehouse) void loadRack('warehouse', 1); }, [warehouse, racks.warehouse]);
  useEffect(() => { if (tracking && !racks.tracking) void loadRack('tracking', 1); }, [tracking, racks.tracking]);
  // A rack unit becomes cargo waiting in front of the unit: pallets as EUR pallets sharing the weight, otherwise one unit of the recorded size.
  const putInFront = (item: RackItem) => {
    const room = 300 - cargo.length;
    if (room <= 0) { setNotice(t.countLimit); return; }
    const pallets = Math.min(Math.floor(item.pallets), room), count = Math.max(1, pallets);
    const height = pallets
      ? Math.min(Math.max(item.volume ? item.volume / (pallets * .96) : 1.2, .3), 2.6)
      : Math.min(Math.max(item.height ?? (item.volume && item.length && item.width ? item.volume / (item.length * item.width) : 1), .1), 3);
    const color = COLORS[cargo.length % COLORS.length];
    const entries: Cargo[] = Array.from({ length: count }, (_, i) => ({
      id: crypto.randomUUID(), name: `${item.title.slice(0, 80)}${count > 1 ? ` · ${i + 1}` : ''}`, customer: item.customer.slice(0, 120),
      length: pallets ? 1.2 : Math.min(item.length ?? 1.2, 30), width: pallets ? .8 : Math.min(item.width ?? .8, 10), height: round(height),
      weight: round(item.weight ? Math.max(item.weight / count, .01) : 100), color, shape: pallets ? 'pallet' : 'box', stackable: false,
      pickup: '', delivery: '', documents: [item.storageType, item.status].filter(Boolean).join(' · ').slice(0, 2000),
      x: 0, y: 0, z: 0, placed: false, loadId: item.loadId, reference: item.reference, rackKey: item.key,
    }));
    setRackPick(null);
    stage(() => setPlan(p => ({ ...p, cargo: [...p.cargo, ...entries] })));
  };
  const openAdd = () => { setDraft(EMPTY_DRAFT); setDraftKey(k => k + 1); setTrackingQuery(''); setAdding(true); };
  const chooseLoad = (next: Draft) => { setDraft(next); setDraftKey(k => k + 1); };
  const addCargo = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget), num = (k: string) => Number(data.get(k));
    const count = num('pieces'); if (!Number.isInteger(count) || count < 1 || cargo.length + count > 300) { setNotice(t.countLimit); return; }
    const entries: Cargo[] = Array.from({ length: count }, (_, i) => ({ id: crypto.randomUUID(), name: String(data.get('name')) + (count > 1 ? ` · ${i + 1}` : ''), customer: String(data.get('customer')), length: num('length'), width: num('width'), height: num('height'), weight: num('weight'), shape: data.get('shape') as Cargo['shape'], stackable: data.get('stackable') === 'on', color: COLORS[cargo.length % COLORS.length], pickup: String(data.get('pickup')), delivery: String(data.get('delivery')), documents: String(data.get('documents')), x: 0, y: 0, z: 0, placed: false, loadId: draft.loadId, reference: draft.reference }));
    setAdding(false); setNotice('');
    stage(() => { setPlan(p => ({ ...p, cargo: [...p.cargo, ...entries] })); setSelected(entries[0].id); });
  };
  const sample = () => { if (cargo.length) return; const items: Cargo[] = ['A', 'B', 'C', 'D', 'E', 'F'].flatMap((name, i) => Array.from({ length: 2 }, (_, j) => ({ id: crypto.randomUUID(), name: `${name}-${j + 1}`, customer: '', length: 1.2, width: .8, height: 1 + i % 3 * .3, weight: 250 + i * 50, color: COLORS[i], shape: 'pallet' as const, stackable: false, pickup: '', delivery: '', documents: '', x: 0, y: 0, z: 0, placed: false })));
    // The example lands outside the unit, sorted on the warehouse floor.
    stage(() => setPlan(p => (p.cargo.length ? p : { ...p, cargo: items })));
  };
  // Packs everything into the unit. Closed walls lift away first so the flight in is visible, then settle back.
  const organize = () => {
    if (!cargo.length) return;
    const lift = walls, restore = wallsMode, wait = lift ? 650 : 0;
    if (lift) setWallsMode('off');
    setTimeout(() => setPlan(p => ({ ...p, cargo: autoPlan(p.cargo, p.equipment) })), wait);
    if (lift) setTimeout(() => setWallsMode(restore), wait + cargo.length * 90 + 1300);
    setNotice('');
  };
  const save = () => { try { localStorage.setItem(key, JSON.stringify(plan)); setNotice(t.saved); } catch { setNotice(t.failed); } };
  const exportPlan = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'freightbook-loading-plan.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const importPlan = async (file?: File) => { if (!file) return; try { if (file.size > 2_000_000) throw Error(); const next = readPlan(JSON.parse(await file.text())); if (!next) throw Error(); setPlan(next); setSelected(''); setNotice(''); } catch { setNotice(t.failed); } if (importInput.current) importInput.current.value = ''; };
  const selectVehicle = (id: string) => {
    const v = vehicles.find(v => String(v.id) === id); if (!v) { changeEquipment({ ...EQUIPMENT[0] }); return; }
    const f = (v.features ?? {}) as Record<string, unknown>, base = EQUIPMENT.find(e => e.truck)!, width = Number(f.width_m) || base.width, height = Number(f.height_m) || base.height;
    // Vehicles record volume but not body dimensions, so length follows capacity_m3 at default width and height.
    const fromVolume = Number(v.capacity_m3) / (width * height);
    changeEquipment({ ...base, registration: String(v.registration_number), length: Number(f.length_m) || (fromVolume > 0 && fromVolume <= 30 ? Math.round(fromVolume * 100) / 100 : base.length), width, height, doorWidth: Math.min(base.doorWidth, width), doorHeight: Math.min(base.doorHeight, height), payload: Number(v.capacity_kg) || base.payload });
  };

  return (
    // Like the map: the scene fills the whole content area edge to edge, and the header floats over it.
    // Nothing takes height from the scene, so the page never scrolls and pinned sidebars roll over it.
    <motion.div ref={viewport} role="region" aria-label={`3D · ${e.registration || e.code}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative h-full min-h-0 w-full overflow-hidden bg-slate-100 dark:bg-slate-950">
      <input ref={importInput} type="file" accept=".json,application/json" hidden onChange={event => void importPlan(event.target.files?.[0])} />
      <div className="absolute inset-0">
        <React.Suspense fallback={<SceneSkeleton label={t.loading3d} />}>
          <PlanningScene equipment={e} cargo={cargo} view={view} selected={selected} onSelect={setSelected} onMove={move} onRotate={rotate} onFreeRoam={() => setActiveView(null)} onCarry={setCarrying} onUnplace={unplace} tracking={tracking} racks={racks} pickedRack={rackPick?.key} loadMoreLabel={t.loadMore} cameraSnapshot={cameraSnapshot} onCameraSnapshot={copyCamera}
            onRackMore={side => void loadRack(side, (racks[side]?.page ?? 1) + 1)} onRackPick={setRackPick} warehouse={warehouse} walls={walls} dimensions={dimensionsOn} seeThrough={seeThrough} ambient={ambient} reset={reset} zoom={zoom} overview={overview} unavailable={t.unavailable} />
        </React.Suspense>
      </div>

      {/* Header, then the equipment name under it, both on the same 12px inset from the scene's left edge. */}
      <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex flex-col items-start gap-3">
      <PageHeader
        className="pointer-events-auto w-full"
        leading={e.truck ? <Truck className="h-5 w-5 text-primary" /> : <Container className="h-5 w-5 text-primary" />}
        // The plan name is edited in place, the same way Post a new load titles a load.
        title={(
          <input value={plan.name} maxLength={100} aria-label={t.planName} placeholder={t.planPlaceholder} onChange={ev => setPlan(p => ({ ...p, name: ev.target.value }))}
            className="-mx-1 w-[22rem] max-w-full cursor-text truncate rounded-md bg-transparent px-1 text-base font-black leading-tight tracking-tight text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-primary/40 md:text-lg dark:text-white" />
        )}
        subtitle={`3D · ${e.registration || e.code} · ${t.subtitle}`}
        actions={(
          <div className="flex w-full min-w-0 items-center justify-end gap-2 lg:w-auto">
            <button type="button" disabled={!cargo.length} onClick={organize}
              className="inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border border-primary bg-primary px-4 text-sm font-medium text-white transition-all hover:bg-primary-dark active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">
              <Sparkles className="h-4 w-4" />{t.organize}
            </button>
            <div role="group" aria-label="3D views" className="flex flex-wrap items-center justify-end gap-2">
              {SCREENS.map(({ value, icon: Icon }) => {
                const label=value==='overview'?'Overview':t[value];
                return <button key={value} type="button" aria-pressed={activeView===value} onClick={()=>{setView(value);setActiveView(value);setReset(n=>n+1);}}
                  title={label} aria-label={label} className={cn('inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all active:scale-95',activeView===value?'border-primary bg-primary text-white shadow-md shadow-primary/20':'border-sky-200 bg-white/80 text-slate-600 hover:border-primary hover:bg-primary/10 hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')}>
                  <Icon className="h-4 w-4" />
                </button>;
              })}
            </div>
          </div>
        )}
      />

      {/* Under the header: scene toggles and equipment name on the left, view tools on the right. */}
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
        <button type="button" aria-pressed={walls} aria-label={wallsMode === 'solid' ? t.walls : wallsMode === 'through' ? t.seeThrough : t.wallsOff} title={wallsMode === 'solid' ? t.walls : wallsMode === 'through' ? t.seeThrough : t.wallsOff}
          onClick={() => setWallsMode(current => current === 'solid' ? 'through' : current === 'through' ? 'off' : 'solid')} className={overlayToggle(wallsMode === 'through' ? 'partial' : wallsMode === 'solid')}>
          {wallsMode === 'solid' ? <Box className="h-4 w-4" /> : wallsMode === 'through' ? <ScanEye className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>
        <button type="button" aria-pressed={warehouse} aria-label={t.warehouse} title={t.warehouse} onClick={toggleWarehouse} className={overlayToggle(warehouse)}>
          <Warehouse className="h-4 w-4" />
        </button>
        <button type="button" aria-pressed={tracking} aria-label={t.tracking} title={t.tracking} onClick={toggleTracking} className={overlayToggle(tracking)}>
          <Navigation2 className="h-4 w-4" />
        </button>
        <button type="button" aria-pressed={dimensionsOn} aria-label={t.dimensionLabels} title={t.dimensionLabels} onClick={() => setDimensionsOn(current => !current)} className={overlayToggle(dimensionsOn)}>
          <Ruler className="h-4 w-4" />
        </button>
        <button type="button" aria-pressed={ambient} aria-label={t.ambient} title={t.ambient} onClick={() => setAmbient(current => !current)} className={overlayToggle(ambient)}>
          <PersonStanding className="h-4 w-4" />
        </button>
        </div>
        <div className="pointer-events-auto flex gap-1.5">
          <Button variant="outline" className={toolButton} title={t.zoomIn} aria-label={t.zoomIn} onClick={() => { setActiveView(null); setZoom(z => z + 1); }}><ZoomIn className="h-4 w-4" /></Button>
          <Button variant="outline" className={toolButton} title={t.zoomOut} aria-label={t.zoomOut} onClick={() => { setActiveView(null); setZoom(z => z - 1); }}><ZoomOut className="h-4 w-4" /></Button>
          <Button variant="outline" className={toolButton} title={t.reset} aria-label={t.reset} onClick={() => { setActiveView(view); setReset(n => n + 1); }}><RotateCcw className="h-4 w-4" /></Button>
          {role === 'superadmin' && <Button variant="outline" className={toolButton} title="Copy camera POV JSON" aria-label="Copy camera POV JSON" onClick={() => setCameraSnapshot(n => n + 1)}><Copy className="h-4 w-4" /></Button>}
          <Button variant="outline" className={toolButton} title={t.fullscreen} aria-label={t.fullscreen} onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void viewport.current?.requestFullscreen(); }}><Maximize className="h-4 w-4" /></Button>
        </div>
      </div>
      {/* Notices float over the scene, so they never resize it or re-frame its camera. */}
      {notice && (
          <div className="flex w-full justify-center">
            <div role="status" className="pointer-events-auto flex max-w-lg items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50/95 px-4 py-2.5 text-sm text-sky-800 shadow-lg backdrop-blur dark:border-sky-900 dark:bg-sky-950/90 dark:text-sky-200">
              {notice}
              <button type="button" aria-label={t.cancel} onClick={() => setNotice('')} className="rounded-lg p-1 hover:bg-sky-100 dark:hover:bg-sky-900"><X className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>
        <p role={carrying ? 'status' : undefined} className={cn('pointer-events-none absolute bottom-3 left-3 max-w-[55%] rounded-xl px-3 py-1.5 text-[11px] backdrop-blur', carrying ? 'block bg-primary font-bold text-white shadow-lg' : 'hidden bg-white/85 text-slate-600 md:block dark:bg-slate-900/85 dark:text-slate-300')}>{carrying ? t.releaseHint : t.hint}</p>

      <PinnedPanel open={panel === 'view'} className="z-[310]" icon={Eye} title={t.viewPanel} subtitle={t.viewHint} onClose={() => setPanel(null)} closeLabel={t.close} collapseLabel={t.collapse} expandLabel={t.expand}>
        {SCREENS.map(({ value, icon: Icon }, index) => (
          <button key={value} type="button" aria-pressed={view === value} onClick={() => { setView(value); setActiveView(value); setReset(n => n + 1); }}
            className={cn('block w-full overflow-hidden rounded-2xl border text-left transition-colors', view === value ? 'border-primary ring-2 ring-primary/30' : 'border-slate-200 hover:border-primary/60 dark:border-slate-800')}>
            <span className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200"><Icon className="h-4 w-4 text-primary" />{value === 'overview' ? 'Overview' : t[value]}</span>
            <span className="block h-36 bg-slate-100 dark:bg-slate-900">
              {index < previewCount
                ? <React.Suspense fallback={<SceneSkeleton label={t.loading3d} />}><PlanningScene mini equipment={e} cargo={cargo} view={value} warehouse={warehouse} walls={walls} unavailable={t.unavailable} /></React.Suspense>
                : <SceneSkeleton label={t.loading3d} />}
            </span>
          </button>
        ))}
      </PinnedPanel>

      <PinnedPanel open collapseSignal={overview} actions={panelSwitch} icon={Settings2} title={t.settings} subtitle={t.settingsHint} collapseLabel={t.collapse} expandLabel={t.expand} defaultCollapsed collapsedTitle={cargo.length ? t.seePlan : t.startPlanning}
        placeholder={(
          <div role="status" aria-label={t.loading3d} className="min-h-0 flex-1 animate-pulse space-y-3 p-3">
            <div className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-24 rounded-2xl bg-slate-100 dark:bg-slate-800" />
          </div>
        )}
        toolbar={(
          <div role="tablist" aria-label={t.settings} className="grid grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
            {SETTINGS_TABS.map(({ value, icon: Icon }) => (
              <button key={value} type="button" role="tab" aria-selected={settingsTab === value} onClick={() => setSettingsTab(value)}
                className={cn('flex min-w-0 cursor-pointer flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-bold transition-colors', settingsTab === value ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-500 hover:text-primary dark:text-slate-300')}>
                <Icon className="h-4 w-4" /><span className="w-full truncate text-center">{settingsTabLabels[value]}</span>
              </button>
            ))}
          </div>
        )}
        footer={(
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="gap-2 rounded-full" onClick={() => importInput.current?.click()}><Upload className="h-4 w-4" />{t.import}</Button>
            <Button variant="outline" className="gap-2 rounded-full" onClick={exportPlan}><Download className="h-4 w-4" />{t.export}</Button>
            <Button className="col-span-2 gap-2 rounded-full" onClick={save}><Save className="h-4 w-4" />{t.save}</Button>
          </div>
        )}>
        {settingsTab === 'equipment' && <Card className="shadow-none" contentClassName="space-y-3 p-3">
          <CardHeading icon={e.truck ? Truck : Container} tone="text-violet-500" title={t.equipment} subtitle={`${e.length} × ${e.width} × ${e.height} m · ${e.payload.toLocaleString()} kg`} />
          <div role="tablist" aria-label={t.equipment} className="grid grid-cols-3 gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
            {([['container', Container, t.containerTab], ['vehicle', Truck, t.vehicleTab], ['custom', Ruler, t.customTab]] as const).map(([value, Icon, label]) => (
              <button key={value} type="button" role="tab" aria-selected={equipmentTab === value} onClick={() => setEquipmentTab(value)}
                className={cn('flex min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition-colors', equipmentTab === value ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-slate-500 hover:text-primary dark:text-slate-300')}>
                <Icon className="h-4 w-4 shrink-0" /><span className="truncate">{label}</span>
              </button>
            ))}
          </div>
          {equipmentTab === 'container' && (
            <label className="block"><span className={labelClass}>{t.containerTab}</span>
              <select className={fieldClass} value={e.truck ? '' : e.code} onChange={ev => changeEquipment({ ...EQUIPMENT.find(item => item.code === ev.target.value)! })}>
                {e.truck && <option value="" disabled>—</option>}
                {EQUIPMENT.filter(item => !item.truck).map(item => <option key={item.code} value={item.code}>{item.code}</option>)}
              </select>
            </label>
          )}
          {equipmentTab === 'vehicle' && (
            <>
              <label className="block"><span className={labelClass}>{t.vehicle}</span>
                <select className={fieldClass} value={e.truck ? String(vehicles.find(v => v.registration_number === e.registration)?.id ?? 'ltl') : ''} onChange={ev => { if (ev.target.value === 'ltl') changeEquipment({ ...EQUIPMENT.find(item => item.truck)! }); else selectVehicle(ev.target.value); }}>
                  {!e.truck && <option value="" disabled>—</option>}
                  <option value="ltl">{t.boxTruck}</option>
                  {vehicles.map(v => <option key={String(v.id)} value={String(v.id)}>{String(v.registration_number)}</option>)}
                </select>
              </label>
              {fleetError && <p role="alert" className="text-[11px] text-amber-600">{t.fleetFailed}</p>}
            </>
          )}
          {equipmentTab === 'custom' && <>
          <div className="grid grid-cols-2 gap-2">
            {(['length', 'width', 'height', 'doorWidth', 'doorHeight', 'payload'] as const).map(k => (
              <label key={`${e.code}-${e.registration}-${k}-${e[k]}`}><span className={labelClass}>{t[k]} ({k === 'payload' ? 'kg' : 'm'})</span>
                <input className={fieldClass} type="number" min="0.01" step="0.001" defaultValue={e[k]} onBlur={ev => { const next = { ...e, [k]: Number(ev.target.value) }; if (validEquipment(next)) changeEquipment(next); else { ev.target.value = String(e[k]); setNotice(t.invalid); } }} />
              </label>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">{t.defaults}</p>
          </>}
        </Card>}

        {settingsTab === 'cargo' && <Card className="shadow-none" contentClassName="p-3">
          <CardHeading icon={Box} tone="text-sky-500" title={<>{t.shipments} <span className="ml-1 rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] text-sky-600 dark:bg-sky-500/10">{cargo.length}</span></>}>
            <Button size="sm" className="gap-1.5 rounded-full" onClick={openAdd}><Plus className="h-4 w-4" />{t.add}</Button>
          </CardHeading>
          {!cargo.length ? (
            <div className="mt-3 flex h-44 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 text-slate-400 dark:border-slate-700">
              <Box className="h-9 w-9" />
              <p className="text-sm">{t.empty}</p>
              <Button variant="outline" size="sm" className="rounded-full" onClick={sample}>{t.sample}</Button>
            </div>
          ) : (
            <div className="mt-3 max-h-80 overflow-auto rounded-xl border border-slate-100 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800">
                  <tr><th className="px-2.5 py-2">{t.name}</th><th className="px-2.5 py-2">{t.cargoDimensions}</th><th className="px-2.5 py-2 text-right">kg</th><th className="px-2.5 py-2">{t.placed}</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cargo.map(c => (
                    <tr key={c.id} onClick={() => setSelected(c.id)} className={cn('cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50', selected === c.id && 'bg-sky-50 dark:bg-sky-950/40')}>
                      <td className="px-2.5 py-2">
                        <button type="button" onClick={() => setSelected(c.id)} className="flex items-center gap-2 text-left font-bold text-slate-800 dark:text-slate-100"><span className="h-5 w-1 shrink-0 rounded-full" style={{ background: c.color }} />{c.name}</button>
                        {(c.reference || c.customer) && <p className="mt-0.5 pl-3 text-[11px] text-slate-500">{[c.reference, c.customer].filter(Boolean).join(' · ')}</p>}
                      </td>
                      <td className="whitespace-nowrap px-2.5 py-2 text-slate-700 dark:text-slate-300">{c.length} × {c.width} × {c.height}<p className="text-[11px] text-slate-500">{volume(c).toFixed(2)} m³</p></td>
                      <td className="whitespace-nowrap px-2.5 py-2 text-right text-slate-700 dark:text-slate-300">{c.weight.toLocaleString()}</td>
                      <td className="px-2.5 py-2"><span className={cn('whitespace-nowrap rounded-lg px-2 py-1 text-[10px] font-bold', c.placed ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400')}>{c.placed ? t.placed : t.pending}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {current && (
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-black text-slate-900 dark:text-white">{current.name}</p>
                <div className="flex gap-1.5">
                  <Button variant="outline" className={toolButton} onClick={rotate} title={t.rotate} aria-label={t.rotate}><RotateCw className="h-4 w-4" /></Button>
                  <Button variant="outline" className={toolButton} onClick={() => remove(current.id)} title={t.remove} aria-label={t.remove}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <p className={labelClass}>{t.position}</p>
              <div className="flex flex-wrap items-end gap-2">
                {(['x', 'y', 'z'] as const).map(k => (
                  <label key={k} className="w-20"><span className={labelClass}>{k.toUpperCase()}</span><input className={fieldClass} type="number" step=".05" min="0" value={position[k]} onChange={ev => setPosition(p => ({ ...p, [k]: Number(ev.target.value) }))} /></label>
                ))}
                <Button variant="outline" className="h-10 rounded-full" onClick={() => move(current.id, position.x, position.y, position.z)}>{t.apply}</Button>
              </div>
              {current.pickup && <p>{t.pickup}: {current.pickup}</p>}
              {current.delivery && <p>{t.delivery}: {current.delivery}</p>}
              {current.documents && <p>{t.documents}: {current.documents}</p>}
              {current.y + current.height > e.height && <p className="font-bold text-amber-600">{t.overheight}</p>}
            </div>
          )}
        </Card>}

        {settingsTab === 'utilization' && <Card className="shadow-none" contentClassName="p-3">
          <CardHeading icon={Gauge} tone="text-emerald-500" title={t.utilization} />
          <div className="mt-3 flex items-center gap-4">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#0ea5e9 ${Math.min(volumePercent, 100)}%, rgba(148,163,184,.2) 0)` }}>
              <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-white dark:bg-slate-900">
                <strong className="text-lg font-black text-slate-900 dark:text-white">{volumePercent.toFixed(1)}%</strong>
                <small className="text-[11px] text-slate-500">m³</small>
              </div>
            </div>
            <dl className="min-w-0 space-y-1.5 text-xs">
              <div><dt className="text-[11px] text-slate-500">{t.volume}</dt><dd className="font-bold text-slate-800 dark:text-slate-100">{usedVolume.toFixed(2)} / {volume(e).toFixed(2)} m³</dd></div>
              <div><dt className="text-[11px] text-slate-500">{t.weight}</dt><dd className="font-bold text-slate-800 dark:text-slate-100">{usedWeight.toLocaleString()} / {e.payload.toLocaleString()} kg</dd></div>
              <div><dt className="text-[11px] text-slate-500">{t.floor}</dt><dd className="font-bold text-slate-800 dark:text-slate-100">{occupiedLength.toFixed(2)} / {e.length} m</dd></div>
            </dl>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><span className="block h-full rounded-full bg-sky-500" style={{ width: `${Math.min(weightPercent, 100)}%` }} /></div>
          <p className="mt-2 text-[11px] text-slate-500">{t.placed}: {placed.length} / {cargo.length} · {t.pending}: {cargo.length - placed.length}</p>
          <p className="mt-2 text-[11px] text-slate-500">{t.estimate}</p>
        </Card>}

        {settingsTab === 'sequence' && <Card className="shadow-none" contentClassName="p-3">
          <CardHeading icon={ListOrdered} tone="text-amber-500" title={t.sequence} />
          <ol aria-label={t.sequence} className="mt-2 max-h-72 divide-y divide-slate-100 overflow-auto dark:divide-slate-800">
            {cargo.map((c, i) => (
              <li key={c.id} className="flex items-center gap-2 py-1.5 text-xs">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold text-slate-900" style={{ background: c.color }}>{i + 1}</span>
                <button type="button" className="min-w-0 flex-1 truncate text-left font-bold text-slate-700 hover:text-primary dark:text-slate-200" onClick={() => setSelected(c.id)}>{c.name}</button>
                <small className="text-[11px] text-slate-500">{c.placed ? t.placed : t.pending}</small>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title={t.up} aria-label={`${t.up} ${c.name}`} disabled={i === 0} onClick={() => reorder(c.id, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title={t.down} aria-label={`${t.down} ${c.name}`} disabled={i === cargo.length - 1} onClick={() => reorder(c.id, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
              </li>
            ))}
          </ol>
        </Card>}
      </PinnedPanel>

      <AnimatePresence>
        {adding && (
          <SmallModal labelledBy="load-planning-add" onClose={() => setAdding(false)} className="max-w-2xl">
            <form onSubmit={addCargo} className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 id="load-planning-add" className="text-base font-black text-slate-900 dark:text-white">{t.add}</h2>
                <button type="button" onClick={() => setAdding(false)} aria-label={t.cancel} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-4 w-4" /></button>
              </div>

              <section aria-label={t.fromTracking} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className={labelClass}>{t.fromTracking}</p>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="search" autoFocus className={cn(fieldClass, 'pl-9')} value={trackingQuery} placeholder={t.trackingSearch} aria-label={t.trackingSearch} onChange={ev => setTrackingQuery(ev.target.value)} />
                </div>
                {trackingState === 'loading' ? <p className="mt-2 text-xs text-slate-500">{t.trackingLoading}</p>
                  : trackingState === 'error' ? <p role="alert" className="mt-2 text-xs text-amber-600">{t.trackingFailed}</p>
                    : !trackingLoads.length ? <p className="mt-2 text-xs text-slate-500">{t.trackingEmpty}</p>
                      : (
                        <ul className="mt-2 max-h-52 divide-y divide-slate-100 overflow-auto dark:divide-slate-800">
                          {trackingLoads.map(row => {
                            const d = loadDraft(row), added = cargo.some(c => c.loadId === d.loadId), chosen = draft.loadId === d.loadId;
                            return (
                              <li key={d.loadId} className={cn('flex items-center justify-between gap-3 rounded-lg px-2 py-2', chosen && 'bg-sky-50 dark:bg-sky-950/40')}>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{d.reference}</p>
                                  <p className="truncate text-[11px] text-slate-500">{[d.name, d.route, d.weight ? `${round(Number(d.weight) * d.pieces).toLocaleString()} kg` : '', d.shape === 'pallet' ? `${d.pieces} × ${t.pallet}` : ''].filter(Boolean).join(' · ')}</p>
                                </div>
                                <Button type="button" variant={chosen ? 'primary' : 'outline'} size="sm" className="rounded-full" disabled={added} aria-pressed={chosen} onClick={() => chooseLoad(d)}>{added ? t.inPlan : t.use}</Button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                <p className="mt-2 text-[11px] text-slate-500">{t.trackingNote}</p>
              </section>

              <div key={draftKey} className="grid gap-3 sm:grid-cols-2">
                <label><span className={labelClass}>{t.name}</span><input className={fieldClass} name="name" required maxLength={100} defaultValue={draft.name} /></label>
                <label><span className={labelClass}>{t.customer}</span><input className={fieldClass} name="customer" maxLength={120} defaultValue={draft.customer} /></label>
                {(['length', 'width', 'height', 'weight', 'pieces'] as const).map(k => (
                  <label key={k}><span className={labelClass}>{t[k]} {['length', 'width', 'height'].includes(k) ? '(m)' : k === 'weight' ? '(kg)' : ''}</span>
                    <input className={fieldClass} name={k} type="number" required min={k === 'pieces' ? 1 : .001} max={k === 'pieces' ? 300 : k === 'length' ? 30 : ['width', 'height'].includes(k) ? 10 : 100000} step={k === 'pieces' ? 1 : .001} defaultValue={draft[k]} />
                  </label>
                ))}
                <label><span className={labelClass}>{t.shape}</span><select className={fieldClass} name="shape" defaultValue={draft.shape}>{(['box', 'pallet', 'pipe', 'drum'] as const).map(s => <option key={s} value={s}>{t[s]}</option>)}</select></label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 sm:col-span-2 dark:text-slate-300"><input type="checkbox" className="h-4 w-4 accent-sky-500" name="stackable" defaultChecked={draft.stackable} />{t.stackable}</label>
                <label><span className={labelClass}>{t.pickup}</span><input className={fieldClass} name="pickup" maxLength={250} defaultValue={draft.pickup} /></label>
                <label><span className={labelClass}>{t.delivery}</span><input className={fieldClass} name="delivery" maxLength={250} defaultValue={draft.delivery} /></label>
                <label className="sm:col-span-2"><span className={labelClass}>{t.documents}</span><textarea className={cn(fieldClass, 'h-20 py-2')} name="documents" maxLength={2000} defaultValue={draft.documents} /></label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setAdding(false)}>{t.cancel}</Button>
                <Button type="submit" className="gap-2 rounded-full"><Plus className="h-4 w-4" />{t.add}</Button>
              </div>
            </form>
          </SmallModal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {rackPick && (() => {
          const inPlan = cargo.some(c => c.rackKey === rackPick.key);
          const stored = rackPick.storedSince && !Number.isNaN(Date.parse(rackPick.storedSince)) ? new Date(rackPick.storedSince).toLocaleDateString() : '';
          const details: [string, string][] = [
            [rackPick.side === 'warehouse' ? t.warehouse : t.route, rackPick.side === 'warehouse' ? rackPick.groupLabel : rackPick.route],
            [t.customer, rackPick.customer],
            [t.status, rackPick.status],
            [t.pieces, rackPick.pallets ? `${rackPick.pallets.toLocaleString()} ${t.rackPallets}` : ''],
            [t.weight, rackPick.weight ? `${rackPick.weight.toLocaleString()} kg` : ''],
            [t.volume, rackPick.volume ? `${rackPick.volume.toLocaleString()} m³` : ''],
            [t.cargoDimensions, rackPick.length && rackPick.width && rackPick.height ? `${rackPick.length} × ${rackPick.width} × ${rackPick.height}` : ''],
            [t.storageType, rackPick.storageType],
            [t.storedSince, stored],
          ];
          const summary = (
            <div className="w-full">
              <RackSummaryCard item={rackPick} />
              <dl className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-x-4 gap-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                {details.filter(([, value]) => value).map(([label, value]) => (
                  <div key={label} className="min-w-0"><dt className={cn(labelClass, 'break-words')}>{label}</dt><dd className="truncate text-sm font-bold text-slate-800 dark:text-slate-100" title={value}>{value}</dd></div>
                ))}
              </dl>
            </div>
          );
          return (
            <PinnedPanelLeft open icon={Box} title={rackPick.title} subtitle={rackPick.reference || (rackPick.side === 'warehouse' ? t.warehouse : t.tracking)} onClose={() => setRackPick(null)} closeLabel={t.close} collapseLabel={t.collapse} expandLabel={t.expand} className={openLoadId ? 'z-[130]' : undefined} contentClassName="!p-0" extension={summary} extensionLabel="Selected rack load details" extensionFooter={
              <div className="grid min-w-0 gap-2">
                {rackPick.loadId && <Button type="button" variant="outline" className="min-w-0 gap-1 rounded-full px-2" onClick={() => setOpenLoadId(rackPick.loadId ?? null)}><Eye className="h-4 w-4 shrink-0" /><span className="truncate">See load details</span></Button>}
                <Button type="button" className="min-w-0 gap-1 rounded-full px-2" disabled={inPlan} onClick={() => putInFront(rackPick)}><Truck className="h-4 w-4 shrink-0" /><span className="truncate">{inPlan ? t.inPlan : t.putInFront}</span></Button>
              </div>
            }>
              <div>
                <p className={`${labelClass} px-3 pt-3`}>Loads on rack</p>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(racks[rackPick.side]?.items ?? []).map(item => (
                    <button key={item.key} type="button" onClick={() => setRackPick(item)} className={cn('flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-900', item.key === rackPick.key && 'bg-sky-50 dark:bg-sky-950/30')}>
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><Box className="h-3.5 w-3.5" /></span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold text-slate-800 dark:text-slate-100">{item.title}</span><span className="block truncate text-[11px] text-slate-500">{item.reference || item.route || item.groupLabel}</span></span>
                      <span className="shrink-0 text-[10px] font-bold uppercase text-slate-400">{item.pallets || 0} pallets</span>
                    </button>
                  ))}
                </div>
              </div>
            </PinnedPanelLeft>
          );
        })()}
      </AnimatePresence>

      {openLoadId && (
        <React.Suspense fallback={null}>
          <LoadDetailsModal loadId={openLoadId} lang={lang} role={role ?? null} userId={userId} onClose={() => setOpenLoadId(null)} />
        </React.Suspense>
      )}
    </motion.div>
  );
}
