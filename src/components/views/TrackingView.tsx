import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Flatpickr from 'react-flatpickr';
import { renderToStaticMarkup } from 'react-dom/server';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, ZoomControl, useMap } from 'react-leaflet';
import { Search, MapPin, ChevronRight, Package as PackageIcon, Coins, Truck, Plane, Ship, Filter, CalendarDays, Trash2, List, LayoutGrid, Map as MapIcon, LocateFixed, Route, BriefcaseBusiness, Navigation, CalendarRange, BadgeEuro, Building2, Container, Tags, FileText, SlidersHorizontal, ShieldAlert, Zap, X, Weight, Box, Layers, Thermometer, ShieldCheck, Stamp, Lock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Language, Package as PackageData, Role } from '../../types';
import { api } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';
import { flatpickrI18n, ui, trPackageStatus } from '../../i18n';
import { cn } from '../../lib/cn';
import { mapLoadToPackage } from '../../lib/loadDetails';
import { LOAD_STATUS_OPTIONS, LoadStatusIcon } from '../load/LoadStatusPicker';
import { LoadDetailsModal } from '../tracking/LoadDetailsModal';
import { TrackingMapCard } from '../tracking/TrackingMapCard';
import { INCOTERM_OPTIONS, ROAD_CHARACTERISTIC_OPTIONS, VEHICLE_OPTIONS } from '../modals/loadFormOptions';
import { IconSelect, type IconSelectOption } from '../ui/IconSelect';

type TrackingStatusFilter = PackageData['status'] | 'all';
type TrackingLayoutMode = 'list' | 'grid' | 'map';

const countryFlagUrl = (countryCode: string) => `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

const TRACKING_STATUS_FILTERS = LOAD_STATUS_OPTIONS
  .map(([, status]) => status)
  .filter((status) => status !== 'Posted');

const statusCardColors = (status: TrackingStatusFilter) => {
  switch (status) {
    case 'Opened': return 'border-cyan-400 text-cyan-600 dark:text-cyan-300';
    case 'Sent': return 'border-blue-500 text-blue-600 dark:text-blue-300';
    case 'In delivery': return 'border-amber-400 text-amber-600 dark:text-amber-300';
    case 'Received': return 'border-violet-500 text-violet-600 dark:text-violet-300';
    case 'Finished': return 'border-emerald-500 text-emerald-600 dark:text-emerald-300';
    case 'Pending': return 'border-orange-400 text-orange-600 dark:text-orange-300';
    case 'Cancelled': return 'border-rose-500 text-rose-600 dark:text-rose-300';
    default: return 'border-slate-400 text-slate-600 dark:text-slate-300';
  }
};

const statusBadgeColors = (status: PackageData['status']) => {
  switch (status) {
    case 'Opened': return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300';
    case 'Sent': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300';
    case 'In delivery': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300';
    case 'Received': return 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300';
    case 'Finished': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300';
    case 'Cancelled': return 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
};

const apiDate = (date?: Date) => date
  ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  : undefined;

const TRACKING_SERVICES = ['FTL', 'LTL', 'Express', 'Dedicated', 'Standard', 'Priority', 'Economy', 'Charter', 'FCL', 'Groupage'] as const;

const FilterSelect = ({ icon: Icon, label, value, onChange, options, allLabel }: { icon: LucideIcon; label: string; value: string; onChange: (value: string) => void; options: IconSelectOption[]; allLabel: string }) => (
  <label className="min-w-0">
    <span className="mb-1.5 block text-[10px] font-bold text-slate-500">{label}</span>
    <IconSelect value={value} onChange={onChange} icon={Icon} ariaLabel={label} placeholder={allLabel} options={[{ value: '', label: allLabel, icon: Icon }, ...options]} />
  </label>
);

const FilterInput = ({ icon: Icon, label, value, onChange, placeholder, type = 'text', allowNegative = false }: { icon: LucideIcon; label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: 'text' | 'number'; allowNegative?: boolean }) => (
  <label className="min-w-0">
    <span className="mb-1.5 block text-[10px] font-bold text-slate-500">{label}</span>
    <span className="relative block">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <input type={type} min={type === 'number' && !allowNegative ? 0 : undefined} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs font-semibold text-slate-600 outline-none placeholder:font-normal placeholder:text-slate-400 focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200" />
    </span>
  </label>
);

// react-flatpickr@4 rebuilds its flatpickr instance on every render (its internal `options` memo
// keys off the props object, which is a new identity each time). Each rebuild destroys the styled
// altInput and momentarily un-hides the source input, so the cell resizes and shoves the whole
// filter grid. memo() keeps this subtree from re-rendering on unrelated filter changes, and the
// absolutely-positioned input inside a fixed-height wrapper pins the cell at 40px regardless.
const DATE_INPUT_CLASS = 'absolute inset-0 h-10 w-full cursor-pointer rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-xs font-semibold text-slate-600 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200';

const DatePickerField = memo(({ value, onChange, placeholder, minDate, maxDate, lang }: { value?: Date; onChange: (date?: Date) => void; placeholder: string; minDate?: Date; maxDate?: Date; lang: Language }) => {
  const options = useMemo(
    () => ({ dateFormat: 'Y-m-d', altInput: true, altInputClass: DATE_INPUT_CLASS, altFormat: 'd.m.Y', locale: flatpickrI18n(lang), allowInput: true, minDate, maxDate }),
    [lang, minDate, maxDate]
  );
  const handleChange = useCallback(([date]: Date[]) => onChange(date), [onChange]);

  return (
    <span className="relative block h-10">
      <CalendarRange className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <Flatpickr value={value} options={options} onChange={handleChange} placeholder={placeholder} className={DATE_INPUT_CLASS} />
    </span>
  );
});

const TrackingCardsSkeleton = ({ layout }: { layout: TrackingLayoutMode }) => (
  <div className={cn('mt-6 animate-pulse gap-4', layout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'flex flex-col')}>
    {Array.from({ length: 6 }, (_, index) => <div key={index} className="min-h-52 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="flex justify-between"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" /><div className="h-6 w-24 rounded-full bg-slate-100 dark:bg-slate-800" /></div><div className="mt-5 h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-700" /><div className="mt-5 grid grid-cols-2 gap-3"><div className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800" /><div className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800" /></div><div className="mt-5 h-14 rounded-xl bg-slate-100 dark:bg-slate-800" /></div>)}
  </div>
);

const STATUS_MARKER_COLORS: Record<PackageData['status'], string> = {
  Posted: '#64748b', Opened: '#06b6d4', Sent: '#3b82f6', 'In delivery': '#f59e0b',
  Received: '#8b5cf6', Finished: '#10b981', Pending: '#fb923c', Cancelled: '#f43f5e',
};

const TRANSPORT_MARKER_ICONS = { air: Plane, sea: Ship, road: Truck } as const;

// Leaflet wants raw HTML, and the glyph/colour pair only varies by transport+status - so render
// each combination once and reuse the icon across every marker that shares it.
const markerIconCache = new Map<string, L.DivIcon>();

const trackingMarkerIcon = (transportType: string, status: PackageData['status']) => {
  const key = `${transportType}|${status}`;
  const cached = markerIconCache.get(key);
  if (cached) return cached;

  const color = STATUS_MARKER_COLORS[status] || '#64748b';
  const Icon = TRANSPORT_MARKER_ICONS[transportType as keyof typeof TRANSPORT_MARKER_ICONS] || Truck;
  const glyph = renderToStaticMarkup(<Icon width={16} height={16} color="#ffffff" strokeWidth={2.4} />);
  const icon = L.divIcon({
    className: 'tracking-map-marker',
    html: `<div style="position:relative;width:32px;height:38px;">
      <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:9999px;background:${color};border:2.5px solid #fff;box-shadow:0 2px 8px rgba(15,23,42,0.45);">${glyph}</div>
      <div style="position:absolute;left:50%;top:29px;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid #fff;"></div>
    </div>`,
    iconSize: [32, 38],
    iconAnchor: [16, 38],
    popupAnchor: [0, -40],
  });
  markerIconCache.set(key, icon);
  return icon;
};

const TrackingMapBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return undefined;
    // Switching into map layout mounts this while the container is still being laid out, so
    // Leaflet would solve the zoom against a stale (smaller) size and land far too close once
    // the real size lands. Re-measure first, and fit again after the layout settles.
    const fit = () => {
      map.invalidateSize();
      map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 6 });
    };
    const raf = requestAnimationFrame(fit);
    const timer = window.setTimeout(fit, 300);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
  }, [map, points]);

  return null;
};

const TrackingMapAutoResize = () => {
  const map = useMap();

  useEffect(() => {
    const raf = requestAnimationFrame(() => map.invalidateSize());
    const timer = window.setTimeout(() => map.invalidateSize(), 250);
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
};

type TrackingViewProps = {
  lang: Language;
  role: Role;
  userId?: number;
  companyIds?: number[];
  onLayoutModeChange?: (mode: TrackingLayoutMode) => void;
};

export const TrackingView = ({ lang, role, userId, companyIds = [], onLayoutModeChange }: TrackingViewProps) => {
  const TRUCK_CAPACITY_KG = 48000;
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const mapRef = useRef<L.Map | null>(null);
  const moreFiltersRef = useRef<HTMLDivElement>(null);
  const dateCellRef = useRef<HTMLDivElement>(null);
  const [openLoadId, setOpenLoadId] = useState<string | null>(null);
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrackingStatusFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [layout, setLayout] = useState<TrackingLayoutMode>('grid');
  const [transportType, setTransportType] = useState('');
  const [service, setService] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [currency, setCurrency] = useState('');
  const [partner, setPartner] = useState('');
  const [equipment, setEquipment] = useState('');
  const [characteristic, setCharacteristic] = useState('');
  const [incoterm, setIncoterm] = useState('');
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [adrOnly, setAdrOnly] = useState(false);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [weightMin, setWeightMin] = useState('');
  const [weightMax, setWeightMax] = useState('');
  const [volumeMin, setVolumeMin] = useState('');
  const [volumeMax, setVolumeMax] = useState('');
  const [palletsMin, setPalletsMin] = useState('');
  const [palletsMax, setPalletsMax] = useState('');
  const [temperatureMin, setTemperatureMin] = useState('');
  const [temperatureMax, setTemperatureMax] = useState('');
  const [insuranceRequired, setInsuranceRequired] = useState(false);
  const [customsRequired, setCustomsRequired] = useState(false);
  const [securityRequired, setSecurityRequired] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (layout === 'map') setFiltersOpen(false);
    else setMapSelectedId(null);
  }, [layout]);

  useEffect(() => {
    onLayoutModeChange?.(layout);
  }, [layout, onLayoutModeChange]);

  useEffect(() => {
    const el = moreFiltersRef.current;
    const rect = el?.getBoundingClientRect();
    const scrollParent = el?.closest('.overflow-y-auto') as HTMLElement | null;
    const dateRect = dateCellRef.current?.getBoundingClientRect();
    const dateInputs = dateCellRef.current?.querySelectorAll('input').length;
    console.log('[tracking-debug]', {
      y: rect?.y,
      x: rect?.x,
      height: rect?.height,
      dateCellHeight: dateRect?.height,
      dateInputCount: dateInputs,
      windowScrollY: window.scrollY,
      docScrollTop: document.documentElement.scrollTop,
      scrollParentScrollTop: scrollParent?.scrollTop,
      scrollParentClass: scrollParent?.className,
      statusCountsLoading: statusCountsResult.loading,
      loadsLoading: loadsResult.loading,
      time: new Date().toISOString(),
    });
  });

  const trackingFilterParams = {
    tracking: true,
    for_storage: false,
    tracking_search: debouncedQuery || undefined,
    transport_types: transportType || undefined,
    services: service || undefined,
    origin: origin || undefined,
    destination: destination || undefined,
    tracking_date_from: apiDate(dateFrom),
    tracking_date_to: apiDate(dateTo),
    budget_min: minPrice || undefined,
    budget_max: maxPrice || undefined,
    currencies: currency || undefined,
    partner: partner || undefined,
    equipment: equipment || undefined,
    characteristics: characteristic || undefined,
    incoterms: incoterm || undefined,
    tracking_requires_adr: adrOnly || undefined,
    tracking_is_urgent: urgentOnly || undefined,
    weight_min: weightMin || undefined,
    weight_max: weightMax || undefined,
    volume_min: volumeMin || undefined,
    volume_max: volumeMax || undefined,
    pallets_min: palletsMin || undefined,
    pallets_max: palletsMax || undefined,
    temperature_min: temperatureMin || undefined,
    temperature_max: temperatureMax || undefined,
    requirements: [insuranceRequired && 'insurance', customsRequired && 'customs_bonded', securityRequired && 'security']
      .filter(Boolean)
      .join(',') || undefined,
  };
  const loadsResult = useApiList(api.loads.list, {
    ...trackingFilterParams,
    per_page: 500,
    status: statusFilter === 'all' ? undefined : statusFilter.toLowerCase().replaceAll(' ', '_'),
    sort: 'date_desc',
  });
  const statusCountsResult = useApiList(api.loads.trackingStatusCounts, trackingFilterParams);
  const capacityResult = useApiList(api.loads.list, { per_page: 500, tracking: true, for_storage: false, statuses: 'sent,in_delivery' });
  const packages = useMemo<PackageData[]>(
    () => loadsResult.items.map((load) => mapLoadToPackage(load, lang)),
    [lang, loadsResult.items]
  );
  const trackingMapPoints = useMemo<[number, number][]>(
    () => packages.map((pkg) => pkg.currentLocation),
    [packages]
  );
  const mapSelectedPackage = useMemo(
    () => packages.find((pkg) => pkg.id === mapSelectedId),
    [packages, mapSelectedId]
  );
  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(TRACKING_STATUS_FILTERS.map((status) => [status, 0])) as Record<TrackingStatusFilter, number>;
    statusCountsResult.items.forEach((row) => {
      const mapped = TRACKING_STATUS_FILTERS.find((status) => status.toLowerCase().replaceAll(' ', '_') === String(row.status || '').toLowerCase());
      if (mapped) counts[mapped] = Number(row.count || 0);
    });
    counts.all = TRACKING_STATUS_FILTERS.reduce((sum, status) => sum + (counts[status] || 0), 0);
    return counts;
  }, [statusCountsResult.items]);

  const loadCapacity = useMemo(() => {
    const roleLoads = capacityResult.items.filter((load) => {
      if (role === 'driver') return Boolean(userId) && Number(load.assigned_driver_user_id) === userId;
      if (role === 'company') {
        return (
          (Boolean(userId) && Number(load.customer_user_id) === userId) ||
          companyIds.includes(Number(load.company_id))
        );
      }
      return false;
    });
    const activeLoads = roleLoads;
    const totalWeightKg = activeLoads.reduce((sum, load) => sum + Number(load.weight_kg || 0), 0);
    const usedPercentage = Math.min(100, Math.round((totalWeightKg / TRUCK_CAPACITY_KG) * 100));

    return {
      activeLoads,
      totalWeightKg,
      usedPercentage,
      remainingPercentage: Math.max(0, 100 - usedPercentage),
      remainingKg: Math.max(0, TRUCK_CAPACITY_KG - totalWeightKg),
    };
  }, [capacityResult.items, companyIds, role, userId]);

  const clearFilters = () => {
    setQuery(''); setDebouncedQuery(''); setStatusFilter('all'); setTransportType(''); setService('');
    setOrigin(''); setDestination(''); setDateFrom(undefined); setDateTo(undefined); setMinPrice(''); setMaxPrice(''); setCurrency('');
    setPartner(''); setEquipment(''); setCharacteristic(''); setIncoterm(''); setAdrOnly(false); setUrgentOnly(false);
    setWeightMin(''); setWeightMax(''); setVolumeMin(''); setVolumeMax(''); setPalletsMin(''); setPalletsMax('');
    setTemperatureMin(''); setTemperatureMax(''); setInsuranceRequired(false); setCustomsRequired(false); setSecurityRequired(false);
  };

  const locateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      mapRef.current?.flyTo([position.coords.latitude, position.coords.longitude], 13);
    });
  };

  const activeFilters = [
    transportType && { key: 'transport', label: transportType, clear: () => setTransportType('') },
    service && { key: 'service', label: service, clear: () => setService('') },
    statusFilter !== 'all' && { key: 'status', label: trPackageStatus(lang, statusFilter), clear: () => setStatusFilter('all') },
    origin && { key: 'origin', label: origin, clear: () => setOrigin('') },
    destination && { key: 'destination', label: destination, clear: () => setDestination('') },
    (dateFrom || dateTo) && {
      key: 'date',
      label: dateFrom && dateTo
        ? `${dateFrom.toLocaleDateString()} – ${dateTo.toLocaleDateString()}`
        : dateFrom
          ? `${u('tracking.from', 'From')} ${dateFrom.toLocaleDateString()}`
          : `${u('tracking.to', 'To')} ${dateTo!.toLocaleDateString()}`,
      clear: () => { setDateFrom(undefined); setDateTo(undefined); },
    },
    (minPrice || maxPrice) && { key: 'price', label: `${minPrice || '0'} – ${maxPrice || '∞'} ${currency || ''}`.trim(), clear: () => { setMinPrice(''); setMaxPrice(''); } },
    currency && !minPrice && !maxPrice && { key: 'currency', label: currency, clear: () => setCurrency('') },
    partner && { key: 'partner', label: partner, clear: () => setPartner('') },
    equipment && { key: 'equipment', label: equipment, clear: () => setEquipment('') },
    characteristic && { key: 'characteristic', label: characteristic, clear: () => setCharacteristic('') },
    incoterm && { key: 'incoterm', label: incoterm, clear: () => setIncoterm('') },
    adrOnly && { key: 'adr', label: 'ADR', clear: () => setAdrOnly(false) },
    urgentOnly && { key: 'urgent', label: u('tracking.urgentOnly', 'Urgent'), clear: () => setUrgentOnly(false) },
    (weightMin || weightMax) && { key: 'weight', label: `${weightMin || '0'} – ${weightMax || '∞'} kg`, clear: () => { setWeightMin(''); setWeightMax(''); } },
    (volumeMin || volumeMax) && { key: 'volume', label: `${volumeMin || '0'} – ${volumeMax || '∞'} m³`, clear: () => { setVolumeMin(''); setVolumeMax(''); } },
    (palletsMin || palletsMax) && { key: 'pallets', label: `${palletsMin || '0'} – ${palletsMax || '∞'} ${u('tracking.pallets', 'pallets')}`, clear: () => { setPalletsMin(''); setPalletsMax(''); } },
    (temperatureMin || temperatureMax) && { key: 'temperature', label: `${temperatureMin || '-∞'} – ${temperatureMax || '∞'} °C`, clear: () => { setTemperatureMin(''); setTemperatureMax(''); } },
    insuranceRequired && { key: 'insurance', label: u('tracking.insuranceRequired', 'Insurance'), clear: () => setInsuranceRequired(false) },
    customsRequired && { key: 'customs', label: u('tracking.customsRequired', 'Customs'), clear: () => setCustomsRequired(false) },
    securityRequired && { key: 'security', label: u('tracking.securityRequired', 'Security'), clear: () => setSecurityRequired(false) },
  ].filter(Boolean) as Array<{ key: string; label: string; clear: () => void }>;
  const transportOptions: IconSelectOption[] = [
    { value: 'road', label: u('postLoadModal.transport.road', 'Road'), icon: Truck },
    { value: 'air', label: u('postLoadModal.transport.air', 'Air'), icon: Plane },
    { value: 'sea', label: u('postLoadModal.transport.sea', 'Sea'), icon: Ship },
  ];
  const serviceOptions: IconSelectOption[] = TRACKING_SERVICES.map((value) => ({ value, label: value, icon: value === 'Express' || value === 'Priority' ? Zap : PackageIcon }));
  const equipmentOptions: IconSelectOption[] = VEHICLE_OPTIONS.map((value) => ({ value, label: value, icon: Container }));
  const characteristicOptions: IconSelectOption[] = ROAD_CHARACTERISTIC_OPTIONS.map((value) => ({ value, label: value, icon: value === 'ADR' ? ShieldAlert : value === 'Express' ? Zap : Tags }));
  const incotermOptions: IconSelectOption[] = INCOTERM_OPTIONS.map((value) => ({ value, label: value, icon: FileText }));
  const currencyOptions: IconSelectOption[] = ['EUR', 'USD', 'BAM', 'CHF'].map((value) => ({ value, label: value, icon: Coins }));

  return (
    <div className={cn(layout === 'map' ? 'h-full' : 'space-y-6')}>
      <div className={cn('w-full', layout === 'map' && 'h-full')}>
      {/* Sidebar List */}
      <div className={cn('w-full', layout === 'map' && 'h-full')}>
        {(role === 'company' || role === 'driver') && layout !== 'map' && (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {u('tracking.loadCapacity', 'Load on truck')}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {loadCapacity.activeLoads.length} {u('tracking.activeLoads', 'active loads')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <p className="whitespace-nowrap text-2xl font-black text-slate-900 dark:text-white">
                  {loadCapacity.totalWeightKg.toLocaleString()} kg
                </p>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Truck className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${loadCapacity.usedPercentage}%` }}
                  />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <div>
                  <p className="text-lg font-black text-primary">{loadCapacity.usedPercentage}%</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {u('tracking.cargoUsed', 'Cargo')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-slate-900 dark:text-white">{loadCapacity.remainingPercentage}%</p>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {u('tracking.freeSpace', 'Free space')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={cn('relative', layout === 'map' && 'h-full min-h-0 overflow-hidden')}>
          {layout === 'map' && (
            <div className="absolute inset-0 z-0">
              <MapContainer ref={mapRef} key="tracking-map" center={[48.5, 14.8]} zoom={5} zoomControl={false} className="h-full w-full">
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                  subdomains={['a', 'b', 'c']}
                />
                <TrackingMapAutoResize />
                <TrackingMapBounds points={trackingMapPoints} />
                <ZoomControl position="bottomright" />
                {packages.map((pkg) => (
                  <Marker
                    key={pkg.id}
                    position={pkg.currentLocation}
                    icon={trackingMarkerIcon(pkg.transportType || 'road', pkg.status)}
                    eventHandlers={{ click: () => setMapSelectedId(pkg.id) }}
                  />
                ))}
              </MapContainer>

              {/* Leaflet keeps every pane inside .leaflet-map-pane, so a real popup can never paint
                  above the filter overlay that sits next to the map. Render the card as its own
                  sibling instead, where it can own a higher z-index than the filters. */}
              {mapSelectedPackage && (
                <div className="pointer-events-auto absolute bottom-4 left-4 z-30">
                  <TrackingMapCard
                    pkg={mapSelectedPackage}
                    lang={lang}
                    onOpenDetails={() => { setOpenLoadId(mapSelectedPackage.id); setMapSelectedId(null); }}
                    onClose={() => setMapSelectedId(null)}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={locateMe}
                title={u('tracking.locateMe', 'Locate me')}
                aria-label={u('tracking.locateMe', 'Locate me')}
                className="absolute bottom-[120px] right-2.5 z-[1000] flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-2 border-black/20 bg-white text-slate-700 shadow hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                <LocateFixed className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className={cn(layout === 'map' ? 'pointer-events-none absolute inset-x-0 top-0 z-10 space-y-3 overflow-visible p-4' : undefined)}>
        <div className={cn('mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8', layout === 'map' && 'pointer-events-auto gap-2')}>
          {(['all', ...TRACKING_STATUS_FILTERS] as TrackingStatusFilter[]).map((status) => (
            <button type="button" key={status} onClick={() => setStatusFilter(status)} className={cn('flex cursor-pointer items-center justify-center gap-2 rounded-full border text-sm font-bold transition-all hover:-translate-y-0.5', layout === 'map' ? 'h-9 gap-1.5 px-3 text-xs' : 'h-14 px-4', statusCardColors(status), layout === 'map'
              ? statusFilter === status
                ? 'bg-white shadow-md ring-2 ring-current ring-offset-2 ring-offset-white/40 dark:bg-slate-900 dark:ring-offset-slate-900/40'
                : 'bg-white/25 backdrop-blur-md hover:bg-white/40 dark:bg-slate-900/25 dark:hover:bg-slate-900/40'
              : cn('bg-white dark:bg-slate-900', statusFilter === status && 'bg-current/10 ring-2 ring-current ring-offset-2 dark:ring-offset-slate-950'))}>
              {status === 'all' ? <LayoutGrid className={cn('shrink-0', layout === 'map' ? 'h-3.5 w-3.5' : 'h-4 w-4')} /> : <LoadStatusIcon status={status} className={cn('shrink-0', layout === 'map' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />}
              <span className="truncate">{status === 'all' ? u('history.filter.all', 'All') : trPackageStatus(lang, status)}</span>
              <span className="opacity-70">{statusCounts[status]}</span>
            </button>
          ))}
        </div>

        <div className={cn('overflow-visible rounded-2xl border border-slate-200 dark:border-slate-800', layout === 'map' ? 'pointer-events-auto border-white/60 bg-white/25 shadow-md shadow-slate-900/10 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/25' : 'bg-white dark:bg-slate-900')}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="flex h-9 min-w-0 items-center gap-2 overflow-x-auto rounded-xl bg-slate-50 px-3 dark:bg-slate-950/60">
                  {activeFilters.length > 0 ? (
                    <>
                      <span className="shrink-0 text-[10px] font-bold text-slate-500">{u('tracking.activeFilters', 'Active filters')}:</span>
                      {activeFilters.map((filter) => <button type="button" key={filter.key} onClick={filter.clear} className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-bold text-sky-600 hover:bg-sky-100 dark:bg-sky-950/30 dark:text-sky-300">{filter.label}<X className="h-3 w-3" /></button>)}
                    </>
                  ) : (
                    <span className="shrink-0 text-[10px] font-bold text-slate-400">{u('tracking.noActiveFilters', 'No active filters')}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button type="button" onClick={() => setFiltersOpen((open) => !open)} className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-primary px-3 text-[11px] font-bold text-primary hover:bg-primary/5"><Filter className="h-3.5 w-3.5" />{filtersOpen ? u('tracking.hideFilters', 'Hide filters') : u('tracking.showFilters', 'Show filters')}</button>
                <button type="button" onClick={clearFilters} className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-rose-400 px-3 text-[11px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"><Trash2 className="h-3.5 w-3.5" />{u('tracking.clearFilters', 'Clear filters')}</button>
                <div className="relative min-w-56 flex-1 sm:max-w-80"><Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={u('tracking.searchPlaceholder', 'Search shipment number, booking ref...')} className={cn('h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-xs outline-none focus:border-primary dark:bg-slate-950 dark:text-white', layout === 'map' ? 'border-slate-200/50 dark:border-slate-700/40' : 'border-slate-200 dark:border-slate-700')} /></div>
                <div className={cn('inline-flex h-10 items-center rounded-lg border bg-transparent p-1', layout === 'map' ? 'border-slate-200/50 dark:border-slate-700/40' : 'border-slate-200 dark:border-slate-800')}>{([['list', List, u('home.layout.list', 'List')], ['grid', LayoutGrid, u('home.layout.grid', 'Grid')]] as const).map(([mode, Icon, label]) => <button type="button" key={mode} onClick={() => setLayout(mode)} title={label} className={cn('flex h-8 w-8 cursor-pointer items-center justify-center rounded-md', layout === mode ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800')}><Icon className="h-4 w-4" /></button>)}</div>
                <div className={cn('inline-flex h-10 items-center rounded-lg border bg-transparent p-1', layout === 'map' ? 'border-slate-200/50 dark:border-slate-700/40' : 'border-slate-200 dark:border-slate-800')}>
                  <button type="button" onClick={() => setLayout('map')} title={u('home.layout.map', 'Map')} aria-label={u('home.layout.map', 'Map')} className={cn('flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 text-[11px] font-bold', layout === 'map' ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800')}>
                    <span>{u('home.layout.map', 'Map')}</span>
                    <MapIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {filtersOpen && <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <FilterSelect icon={Route} label={u('tracking.transportMode', 'Transport mode')} value={transportType} onChange={setTransportType} allLabel={u('tracking.allModes', 'All modes')} options={transportOptions} />
                <FilterSelect icon={BriefcaseBusiness} label={u('tracking.service', 'Service')} value={service} onChange={setService} allLabel={u('tracking.allServices', 'All services')} options={serviceOptions} />
                <FilterSelect icon={Container} label={u('tracking.equipment', 'Equipment')} value={equipment} onChange={setEquipment} allLabel={u('tracking.allEquipment', 'All equipment')} options={equipmentOptions} />
                <FilterInput icon={MapPin} label={u('tracking.origin', 'Origin')} value={origin} onChange={setOrigin} placeholder={u('tracking.chooseOrigin', 'Choose origin')} />
                <FilterInput icon={Navigation} label={u('tracking.destination', 'Destination')} value={destination} onChange={setDestination} placeholder={u('tracking.chooseDestination', 'Choose destination')} />
                <div className="min-w-0" ref={dateCellRef}>
                  <span className="mb-1.5 block text-[10px] font-bold text-slate-500">{u('tracking.date', 'Date')}</span>
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
                    <DatePickerField value={dateFrom} onChange={setDateFrom} placeholder={u('tracking.from', 'From')} maxDate={dateTo} lang={lang} />
                    <span className="text-slate-400">–</span>
                    <DatePickerField value={dateTo} onChange={setDateTo} placeholder={u('tracking.to', 'To')} minDate={dateFrom} lang={lang} />
                  </div>
                </div>
                <div className="col-span-2 grid grid-cols-[1fr_auto_1fr_80px] items-end gap-2"><FilterInput icon={BadgeEuro} label={u('tracking.priceRange', 'Price range')} value={minPrice} onChange={setMinPrice} placeholder={u('tracking.minPrice', 'Min price')} type="number" /><span className="mb-3 text-slate-400">–</span><FilterInput icon={BadgeEuro} label=" " value={maxPrice} onChange={setMaxPrice} placeholder={u('tracking.maxPrice', 'Max price')} type="number" /><FilterSelect icon={Coins} label=" " value={currency} onChange={setCurrency} allLabel="EUR" options={currencyOptions} /></div>
                <FilterInput icon={Building2} label={u('tracking.carriersPartners', 'Carriers / Partners')} value={partner} onChange={setPartner} placeholder={u('tracking.choosePartner', 'Choose partner')} />
                <FilterSelect icon={Tags} label={u('tracking.loadCharacteristics', 'Load characteristics')} value={characteristic} onChange={setCharacteristic} allLabel={u('tracking.allCharacteristics', 'All characteristics')} options={characteristicOptions} />
                <FilterSelect icon={FileText} label="Incoterms" value={incoterm} onChange={setIncoterm} allLabel={u('tracking.allIncoterms', 'All incoterms')} options={incotermOptions} />
                <div className="min-w-0" ref={moreFiltersRef}>
                  <span className="mb-1.5 block text-[10px] font-bold text-transparent select-none">·</span>
                  <button type="button" onClick={() => setMoreFiltersOpen((open) => !open)} className={cn('flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 text-xs font-bold', moreFiltersOpen || adrOnly || urgentOnly ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}><SlidersHorizontal className="h-3.5 w-3.5" />{u('tracking.moreFilters', 'More filters')}</button>
                </div>
              </div>
              {moreFiltersOpen && (
                <div className="mt-3 flex flex-col gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setAdrOnly((value) => !value)} className={cn('flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold', adrOnly ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}><ShieldAlert className="h-3.5 w-3.5" />ADR</button>
                    <button type="button" onClick={() => setUrgentOnly((value) => !value)} className={cn('flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold', urgentOnly ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}><Zap className="h-3.5 w-3.5" />{u('tracking.urgentOnly', 'Urgent')}</button>
                    <button type="button" onClick={() => setInsuranceRequired((value) => !value)} className={cn('flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold', insuranceRequired ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}><ShieldCheck className="h-3.5 w-3.5" />{u('tracking.insuranceRequired', 'Insurance')}</button>
                    <button type="button" onClick={() => setCustomsRequired((value) => !value)} className={cn('flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold', customsRequired ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}><Stamp className="h-3.5 w-3.5" />{u('tracking.customsRequired', 'Customs')}</button>
                    <button type="button" onClick={() => setSecurityRequired((value) => !value)} className={cn('flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold', securityRequired ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300')}><Lock className="h-3.5 w-3.5" />{u('tracking.securityRequired', 'Security')}</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="col-span-2 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                      <FilterInput icon={Weight} label={u('tracking.weightRange', 'Weight (kg)')} value={weightMin} onChange={setWeightMin} placeholder={u('tracking.min', 'Min')} type="number" />
                      <span className="mb-3 text-slate-400">–</span>
                      <FilterInput icon={Weight} label=" " value={weightMax} onChange={setWeightMax} placeholder={u('tracking.max', 'Max')} type="number" />
                    </div>
                    <div className="col-span-2 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                      <FilterInput icon={Box} label={u('tracking.volumeRange', 'Volume (m³)')} value={volumeMin} onChange={setVolumeMin} placeholder={u('tracking.min', 'Min')} type="number" />
                      <span className="mb-3 text-slate-400">–</span>
                      <FilterInput icon={Box} label=" " value={volumeMax} onChange={setVolumeMax} placeholder={u('tracking.max', 'Max')} type="number" />
                    </div>
                    <div className="col-span-2 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                      <FilterInput icon={Layers} label={u('tracking.palletsRange', 'Pallets')} value={palletsMin} onChange={setPalletsMin} placeholder={u('tracking.min', 'Min')} type="number" />
                      <span className="mb-3 text-slate-400">–</span>
                      <FilterInput icon={Layers} label=" " value={palletsMax} onChange={setPalletsMax} placeholder={u('tracking.max', 'Max')} type="number" />
                    </div>
                    <div className="col-span-2 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                      <FilterInput icon={Thermometer} label={u('tracking.temperatureRange', 'Temperature (°C)')} value={temperatureMin} onChange={setTemperatureMin} placeholder={u('tracking.min', 'Min')} type="number" allowNegative />
                      <span className="mb-3 text-slate-400">–</span>
                      <FilterInput icon={Thermometer} label=" " value={temperatureMax} onChange={setTemperatureMax} placeholder={u('tracking.max', 'Max')} type="number" allowNegative />
                    </div>
                  </div>
                </div>
              )}
            </div>}
          </div>

        {layout !== 'map' && (loadsResult.loading ? <TrackingCardsSkeleton layout={layout} /> : <div className={cn(
          'mt-6',
          layout === 'list'
            ? 'space-y-4'
            : 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'
        )}>
          {packages.map(pkg => (
            <button
              key={pkg.id}
              onClick={() => setOpenLoadId(pkg.id)}
              className="h-full w-full cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-primary dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{pkg.carrier}</span>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {pkg.transportType === 'air' ? (
                      <Plane className="h-3 w-3" />
                    ) : pkg.transportType === 'sea' ? (
                      <Ship className="h-3 w-3" />
                    ) : (
                      <Truck className="h-3 w-3" />
                    )}
                    {pkg.transportType === 'air'
                      ? u('postLoadModal.transport.air', 'Air')
                      : pkg.transportType === 'sea'
                        ? u('postLoadModal.transport.sea', 'Sea')
                        : u('postLoadModal.transport.road', 'Road')}
                    {pkg.cargoType ? ` · ${pkg.cargoType}` : ''}
                  </span>
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                    statusBadgeColors(pkg.status)
                  )}>
                    <LoadStatusIcon status={pkg.status} className="h-3 w-3" />
                    {trPackageStatus(lang, pkg.status)}
                  </span>
                </div>
              </div>
              <p className="font-bold dark:text-white">{pkg.recipient || '—'}</p>
              <p className="mt-1 truncate text-[11px] font-semibold text-slate-400">
                {u('tracking.bookingReference', 'Booking reference')}: {pkg.bookingReference || '—'}
              </p>
              {pkg.description && (
                <p className="mt-2 line-clamp-1 text-sm font-medium text-slate-600 dark:text-slate-300">
                  {pkg.description}
                </p>
              )}
              <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                <div className="flex min-w-0 items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300">
                  {pkg.originCountryCode
                    ? <img src={countryFlagUrl(pkg.originCountryCode)} alt={pkg.originCountryCode} className="h-4 w-6 shrink-0 rounded-sm object-cover shadow-sm" />
                    : <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white"><MapPin className="h-3.5 w-3.5" /></span>}
                  <span className="truncate text-xs font-bold">{pkg.origin}</span>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="flex min-w-0 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                  {pkg.destinationCountryCode
                    ? <img src={countryFlagUrl(pkg.destinationCountryCode)} alt={pkg.destinationCountryCode} className="h-4 w-6 shrink-0 rounded-sm object-cover shadow-sm" />
                    : <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white"><MapPin className="h-3.5 w-3.5" /></span>}
                  <span className="truncate text-xs font-bold">{pkg.destination}</span>
                </div>
              </div>
              <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-3 dark:border-slate-800">
                <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950">
                  <PackageIcon className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{u('Track no.', 'Track no.')}</p><p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{pkg.trackingNumber}</p></div>
                </div>
                <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950">
                  <Coins className="h-4 w-4 shrink-0 text-emerald-500" />
                  <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{u('Amount', 'Amount')}</p><p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{pkg.totalAmount || '—'}</p></div>
                </div>
                <div className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950">
                  <CalendarDays className="h-4 w-4 shrink-0 text-violet-500" />
                  <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{u('tracking.transit', 'Transit')}</p><p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200">{pkg.transitDays ? `${pkg.transitDays} ${u('tracking.days', 'days')}` : u('tracking.notScheduled', 'Not scheduled')}</p></div>
                </div>
              </div>
            </button>
          ))}
          {packages.length === 0 && (
            <div className={cn(
              'rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-800',
              layout === 'grid' && 'md:col-span-2 xl:col-span-3'
            )}>
              {u('tracking.noPackagesFound', 'No tracking items found for this filter.')}
            </div>
          )}
        </div>)}
          </div>
        </div>
      </div>

      {openLoadId && (
        <LoadDetailsModal
          loadId={openLoadId}
          lang={lang}
          role={role}
          userId={userId}
          companyIds={companyIds}
          onClose={() => setOpenLoadId(null)}
          onChanged={() => {
            void loadsResult.refresh();
            void capacityResult.refresh();
            void statusCountsResult.refresh();
          }}
        />
      )}
      </div>
    </div>
  );
};
