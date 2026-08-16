import { useState, useEffect, useMemo } from 'react';
import Flatpickr from 'react-flatpickr';
import { Search, MapPin, ChevronRight, Package as PackageIcon, Clock3, RotateCcw, Share2, Star, Bot, Route, Lock, Coins, Loader2, Sparkles, Truck, FileBarChart2, Upload, FileSpreadsheet, Fuel, BedDouble, ParkingCircle, Landmark, Filter, CalendarDays, ReceiptText, FileText, Printer } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip } from 'react-leaflet';
import { Language, Package as PackageData, Role, ShipmentDetail } from '../../types';
import { api } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';
import { getSmartStatusUpdate } from '../../services/geminiService';
import { flatpickrI18n, ui, trPackageStatus } from '../../i18n';
import { cn } from '../../lib/cn';
import { confirmAction, showError, showSuccess } from '../../lib/swal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Toggle } from '../ui/Toggle';
import { ChatConversationPanel } from '../chat/ChatConversationPanel';
import { Conversation } from '../chat/types';
import { TrackingItemDetails } from '../tracking/TrackingItemDetails';
import { TrackingShipmentDetails } from '../tracking/TrackingShipmentDetails';

type AmenityCategory = 'toll' | 'fuel' | 'rest' | 'parking';
type TrackingFilterMode = 'all' | 'today' | 'calendar';

const TRACKING_FLOW: PackageData['status'][] = ['Posted', 'Opened', 'Sent', 'In delivery', 'Received', 'Finished'];
const LOAD_STATUS_OPTIONS: Array<[string, PackageData['status']]> = [
  ['posted', 'Posted'],
  ['opened', 'Opened'],
  ['sent', 'Sent'],
  ['in_delivery', 'In delivery'],
  ['received', 'Received'],
  ['finished', 'Finished'],
  ['pending', 'Pending'],
  ['cancelled', 'Cancelled'],
];

const mapLoadStatus = (value: unknown): PackageData['status'] => {
  const statuses: Record<string, PackageData['status']> = {
    posted: 'Posted', opened: 'Opened', sent: 'Sent', in_delivery: 'In delivery',
    received: 'Received', finished: 'Finished', pending: 'Pending', cancelled: 'Cancelled',
  };

  return statuses[String(value || '').toLowerCase()] || 'Pending';
};

const apiLoadStatus = (status: PackageData['status']) => status.toLowerCase().replace(/\s+/g, '_');

const detailValue = (value: unknown) => {
  const text = String(value ?? '').trim();
  return text && text !== 'null' ? text : '—';
};

const detailDate = (value: unknown) => {
  const text = String(value ?? '').trim();
  if (!text) return '—';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
};

const startOfDay = (date: Date) => {
  const clone = new Date(date);
  clone.setHours(0, 0, 0, 0);
  return clone;
};

const endOfDay = (date: Date) => {
  const clone = new Date(date);
  clone.setHours(23, 59, 59, 999);
  return clone;
};

const packageActivityDate = (pkg: PackageData) => {
  const source = pkg.history[0]?.date || pkg.addedDate;
  const direct = new Date(source);
  if (!Number.isNaN(direct.getTime())) return direct;
  const parts = source.match(/^(\d{1,2})\s+([A-Za-z]+)(?:,\s*(\d{1,2}):(\d{2}))?/);
  if (!parts) return null;
  const [, day, month, hours = '00', minutes = '00'] = parts;
  const timestamp = Date.parse(`${month} ${day}, ${new Date().getFullYear()} ${hours}:${minutes}`);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
};

type RouteAmenity = {
  id: string;
  category: AmenityCategory;
  labelKey: string;
  position: [number, number];
  costEur: number;
  valueKey: string;
};

const PACKAGE_ROUTE_AMENITIES: Record<string, RouteAmenity[]> = {};

type TrackingViewProps = {
  lang: Language;
  role: Role;
  userId?: number;
  companyIds?: number[];
};

export const TrackingView = ({ lang, role, userId, companyIds = [] }: TrackingViewProps) => {
  const TRUCK_CAPACITY_KG = 48000;
  const loadsResult = useApiList(api.loads.list, { per_page: 500 });
  const packages = useMemo<PackageData[]>(() => loadsResult.items
    .filter((load) => String(load.status || '').toLowerCase() !== 'posted')
    .map((load) => {
    const stops = Array.isArray(load.stops) ? load.stops as Array<Record<string, unknown>> : [];
    const shipment = (load.shipment || {}) as Record<string, unknown>;
    const events = Array.isArray(shipment.events) ? shipment.events as Array<Record<string, unknown>> : [];
    const consignee = (load.consignee || {}) as Record<string, unknown>;
    const company = (load.company || {}) as Record<string, unknown>;
    const mappedStatus = mapLoadStatus(load.status);
    const estimatedDeliveryAt = String(shipment.estimated_delivery_at || stops[stops.length - 1]?.window_ends_at || Date.now());
    const origin = String(stops[0]?.city || '—');
    const destination = String(stops[stops.length - 1]?.city || '—');
    const sourcePrice = String(load.price_insurance || '').trim();
    return {
      recipient: String(consignee.company_name || consignee.name || '—'),
      id: String(load.id),
      shipmentId: shipment.id ? String(shipment.id) : undefined,
      trackingNumber: String(shipment.tracking_number || load.public_id || load.id),
      carrier: String(shipment.carrier || company.name || '—'),
      status: mappedStatus,
      totalAmount: sourcePrice || `${String(load.currency || 'EUR')} ${Number(load.budget || 0).toLocaleString()}`,
      statusChange: load.status_change && typeof load.status_change === 'object'
        ? Object.fromEntries(Object.entries(load.status_change as Record<string, unknown>).map(([status, changedAt]) => [status, String(changedAt)]))
        : {},
      origin, destination,
      addedDate: String(load.published_at || load.created_at || ''), transitDays: Math.max(0, Math.ceil((new Date(estimatedDeliveryAt).getTime() - Date.now()) / 86400000)),
      description: String(load.title || load.cargo_type || ''), currentLocation: [Number(shipment.current_latitude || 43.8563), Number(shipment.current_longitude || 18.4131)],
      history: events.map((event) => ({ date: String(event.recorded_at || event.created_at || ''), status: String(event.status || event.event_type || ''), location: String(event.location_name || '') })),
      consigneeRecord: consignee,
      stops,
      details: [
        { key: 'published_at', label: 'Date/Datum', value: detailDate(load.published_at || load.created_at), rawValue: String(load.published_at || '').slice(0, 10), input: 'date' },
        { key: 'status', label: 'Shipment Status', value: trPackageStatus(lang, mappedStatus), rawValue: String(load.status || ''), input: 'status' },
        { key: 'booking_reference', label: 'Booking reference', value: detailValue(load.booking_reference), rawValue: detailValue(load.booking_reference) === '—' ? '' : String(load.booking_reference), input: 'text' },
        { key: 'insurance', label: 'Insurance', value: detailValue(load.insurance), rawValue: String(load.insurance || ''), input: 'text' },
        { key: 'department', label: 'Department', value: detailValue(load.department), rawValue: String(load.department || ''), input: 'text' },
        { key: 'freight_mode', label: 'Freight mode', value: detailValue(load.freight_mode || load.transport_type), rawValue: String(load.freight_mode || load.transport_type || ''), input: 'text' },
        { key: 'consignee_customer_id', label: 'Consignee', value: detailValue(consignee.company_name || consignee.name), rawValue: String(consignee.id || ''), input: 'customer' },
        { key: 'subdepartment', label: 'Subdepartment', value: detailValue(load.subdepartment), rawValue: String(load.subdepartment || ''), input: 'text' },
        { key: 'weight_kg', label: 'KGS', value: load.weight_kg ? `${Number(load.weight_kg).toLocaleString()} kg` : '—', rawValue: String(load.weight_kg || ''), input: 'number' },
        { key: 'quantity_measure', label: 'QTY/G.W./MEAs', value: detailValue(load.quantity_measure), rawValue: String(load.quantity_measure || ''), input: 'text' },
        { key: 'volume_m3', label: 'CBM', value: detailValue(load.volume_m3), rawValue: String(load.volume_m3 || ''), input: 'number' },
        { key: 'teu', label: 'TEU', value: detailValue(load.teu), rawValue: String(load.teu || ''), input: 'text' },
        { key: 'container_types', label: 'Container Types', value: detailValue(load.container_types), rawValue: String(load.container_types || ''), input: 'text' },
        { key: 'container_number', label: 'Container', value: detailValue(load.container_number), rawValue: String(load.container_number || ''), input: 'text' },
        { key: 'departure', label: 'Departure Port / Station', value: detailValue(origin), rawValue: origin === '—' ? '' : origin, input: 'text' },
        { key: 'arrival', label: 'Arrival Port / Station', value: detailValue(destination), rawValue: destination === '—' ? '' : destination, input: 'text' },
        { key: 'etd_at', label: 'ETD Date', value: detailDate(load.etd_at), rawValue: String(load.etd_at || '').slice(0, 10), input: 'date' },
        { key: 'eta_at', label: 'ETA Date', value: detailDate(stops[stops.length - 1]?.window_starts_at || shipment.estimated_delivery_at), rawValue: String(stops[stops.length - 1]?.window_starts_at || shipment.estimated_delivery_at || '').slice(0, 10), input: 'date' },
        { key: 'atd_at', label: 'ATD Date', value: detailDate(load.atd_at), rawValue: String(load.atd_at || '').slice(0, 10), input: 'date' },
        { key: 'shipper_name', label: 'Shipper Name', value: detailValue(load.shipper_name), rawValue: String(load.shipper_name || ''), input: 'text' },
        { key: 'mediator', label: 'Mediator', value: detailValue(load.mediator), rawValue: String(load.mediator || ''), input: 'text' },
        { key: 'incoterms', label: 'Incoterms', value: detailValue(load.incoterms), rawValue: String(load.incoterms || ''), input: 'text' },
        { key: 'price_insurance', label: 'Price + Insurance', value: detailValue(load.price_insurance), rawValue: String(load.price_insurance || ''), input: 'text' },
        { key: 'profit_loss', label: 'GP (Profit & Loss)', value: detailValue(load.profit_loss), rawValue: String(load.profit_loss || ''), input: 'text' },
      ],
    };
  }), [lang, loadsResult.items]);
  const emptyPackage: PackageData = { id: '', trackingNumber: '', carrier: '', status: 'Pending', origin: '', destination: '', addedDate: '', transitDays: 0, currentLocation: [43.8563, 18.4131], history: [] };
  const [selectedPackage, setSelectedPackage] = useState<PackageData>(emptyPackage);
  const [trackingDetailsOpen, setTrackingDetailsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<TrackingFilterMode>('all');
  const [rangeStart, setRangeStart] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return startOfDay(date);
  });
  const [rangeEnd, setRangeEnd] = useState(() => endOfDay(new Date()));
  const [smartStatus, setSmartStatus] = useState<string>("");
  const [rightTab, setRightTab] = useState<'tracker' | 'details' | 'dispatch' | 'map' | 'timeline' | 'return' | 'returnRoutes' | 'reports' | 'share' | 'invoice' | 'review'>('details');
  const [dispatchDraft, setDispatchDraft] = useState('');
  const [returnTokens, setReturnTokens] = useState(0);
  const [returnRoutesUnlocked, setReturnRoutesUnlocked] = useState(false);
  const [isUnlockingReturnRoutes, setIsUnlockingReturnRoutes] = useState(false);
  const [unlockStep, setUnlockStep] = useState(0);
  const [tachographFile, setTachographFile] = useState<File | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState<'predracun' | 'a4-faktura' | null>(null);
  const [invoiceError, setInvoiceError] = useState('');
  const [statusChanging, setStatusChanging] = useState<PackageData['status'] | null>(null);
  const [savingDetailKey, setSavingDetailKey] = useState<string | null>(null);
  const [headerStatus, setHeaderStatus] = useState('');
  const [mapFilters, setMapFilters] = useState<Record<AmenityCategory, boolean>>({
    toll: true,
    fuel: false,
    rest: false,
    parking: false,
  });
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const shipmentDetailsWithoutStatus = useMemo(
    () => (selectedPackage.details || []).filter((detail) => detail.key !== 'status'),
    [selectedPackage.details]
  );

  const filteredPackages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const todayStart = startOfDay(new Date()).getTime();
    const todayEnd = endOfDay(new Date()).getTime();

    return packages.filter((pkg) => {
      const matchesQuery = `${pkg.trackingNumber} ${pkg.recipient || ''} ${pkg.carrier} ${pkg.origin} ${pkg.destination}`
        .toLowerCase()
        .includes(normalizedQuery);
      if (!matchesQuery || filterMode === 'all') return matchesQuery;

      const activityDate = packageActivityDate(pkg);
      if (!activityDate) return false;
      const timestamp = activityDate.getTime();

      return filterMode === 'today'
        ? timestamp >= todayStart && timestamp <= todayEnd
        : timestamp >= rangeStart.getTime() && timestamp <= rangeEnd.getTime();
    });
  }, [packages, filterMode, query, rangeEnd, rangeStart]);

  useEffect(() => {
    if (!selectedPackage.id && packages[0]) setSelectedPackage(packages[0]);
    else if (selectedPackage.id) setSelectedPackage(packages.find((pkg) => pkg.id === selectedPackage.id) || packages[0] || emptyPackage);
  }, [packages]);

  useEffect(() => {
    if (selectedPackage.id) getSmartStatusUpdate(selectedPackage.status, selectedPackage.history[0]?.location || selectedPackage.destination).then(setSmartStatus);
  }, [selectedPackage]);

  useEffect(() => {
    setHeaderStatus(apiLoadStatus(selectedPackage.status));
  }, [selectedPackage.id, selectedPackage.status]);

  useEffect(() => {
    setReturnRoutesUnlocked(false);
    setIsUnlockingReturnRoutes(false);
    setUnlockStep(0);
  }, [selectedPackage.id]);

  useEffect(() => {
    if (!isUnlockingReturnRoutes) return;
    const timer = setInterval(() => {
      setUnlockStep((prev) => (prev + 1) % 3);
    }, 700);
    return () => clearInterval(timer);
  }, [isUnlockingReturnRoutes]);

  const dispatchConversation = useMemo<Conversation>(
    () => ({
      id: `dispatch-${selectedPackage.id}`,
      name: 'Lena / Route Ops',
      role: u('Dispatch Manager', 'Dispatch Manager'),
      channel: 'inapp',
      online: true,
      unread: 0,
      lastTime: 'now',
      messages: [
        {
          id: 'd0',
          sender: 'system',
          text:
            smartStatus ||
            u('AI status is updating...', 'AI status is updating...'),
          time: u('AI', 'AI'),
        },
      ],
    }),
    [selectedPackage.id, smartStatus, lang]
  );

  const handleDispatchSend = () => {
    if (!dispatchDraft.trim()) return;
    setDispatchDraft('');
  };

  const handleAiDispatchCompose = () => {
    const seed =
      smartStatus ||
      u('Update ETA and send status to customer.', 'Update ETA and send status to customer.');
    setDispatchDraft(seed);
  };

  const returnRouteSuggestions = useMemo(
    () => loadsResult.items.slice(0, 3).map((load) => {
      const stops = Array.isArray(load.stops) ? load.stops as Array<Record<string, unknown>> : [];
      return { id: String(load.id), title: `${String(stops[0]?.city || '—')} -> ${String(stops[stops.length - 1]?.city || '—')}`, deadhead: '—', cargo: String(load.cargo_type || load.title || '—'), payout: `${String(load.currency || 'EUR')} ${Number(load.budget || 0).toLocaleString()}`, eta: String(stops[stops.length - 1]?.window_ends_at || '—'), confidence: Number(((load.routes as Array<Record<string, unknown>> | undefined)?.[0]?.ai_confidence) || 0) };
    }),
    [loadsResult.items]
  );

  const unlockSteps = [
    u('AI is scanning active corridors...', 'AI is scanning active corridors...'),
    u('Filtering by profit and deadhead distance...', 'Filtering by profit and deadhead distance...'),
    u('Finalizing best return routes...', 'Finalizing best return routes...'),
  ];

  const handleUnlockReturnRoutes = () => {
    if (returnRoutesUnlocked || isUnlockingReturnRoutes || returnTokens < 10) return;
    setIsUnlockingReturnRoutes(true);
    setUnlockStep(0);
    setTimeout(() => {
      setIsUnlockingReturnRoutes(false);
      setReturnRoutesUnlocked(true);
      setReturnTokens((prev) => prev - 10);
    }, 2600);
  };

  const loadCapacity = useMemo(() => {
    const roleLoads = loadsResult.items.filter((load) => {
      if (role === 'driver') return Boolean(userId) && Number(load.assigned_driver_user_id) === userId;
      if (role === 'company') {
        return (
          (Boolean(userId) && Number(load.customer_user_id) === userId) ||
          companyIds.includes(Number(load.company_id))
        );
      }
      return false;
    });
    const activeLoads = roleLoads.filter((load) =>
      ['sent', 'in_delivery'].includes(String(load.status).toLowerCase())
    );
    const totalWeightKg = activeLoads.reduce((sum, load) => sum + Number(load.weight_kg || 0), 0);
    const usedPercentage = Math.min(100, Math.round((totalWeightKg / TRUCK_CAPACITY_KG) * 100));

    return {
      activeLoads,
      totalWeightKg,
      usedPercentage,
      remainingPercentage: Math.max(0, 100 - usedPercentage),
      remainingKg: Math.max(0, TRUCK_CAPACITY_KG - totalWeightKg),
    };
  }, [companyIds, loadsResult.items, role, userId]);

  const reportRows = useMemo(
    () => [
      [u('tracking.report.field', 'Field'), u('tracking.report.value', 'Value')],
      [u('tracking.report.trackingNumber', 'Tracking number'), selectedPackage.trackingNumber],
      [u('tracking.report.carrier', 'Carrier'), selectedPackage.carrier],
      [u('tracking.report.vehicle', 'Vehicle'), 'Truck PT-19'],
      [u('tracking.report.route', 'Route'), `${selectedPackage.origin} -> ${selectedPackage.destination}`],
      [u('tracking.report.distance', 'Mileage'), `${selectedPackage.transitDays * 265} km`],
      [u('tracking.report.stops', 'Number of stops'), String(selectedPackage.history.length)],
      [u('tracking.report.breaks', 'Driver breaks'), `${Math.max(1, selectedPackage.transitDays)} x 45 min`],
      [u('tracking.report.arrival', 'Arrival time'), selectedPackage.history[0]?.date || selectedPackage.addedDate],
      [u('tracking.report.delay', 'Delay'), selectedPackage.status === 'Finished' ? u('tracking.report.none', 'No delay') : '18 min'],
      [u('tracking.report.status', 'Status'), trPackageStatus(lang, selectedPackage.status)],
    ],
    [lang, selectedPackage, u]
  );

  const routeAmenities = useMemo<RouteAmenity[]>(
    () => PACKAGE_ROUTE_AMENITIES[selectedPackage.id] || [],
    [selectedPackage.id]
  );

  const trackingStage = TRACKING_FLOW.indexOf(selectedPackage.status);
  const trackingProgress = selectedPackage.status === 'Finished'
    ? 100
    : trackingStage >= 0
      ? (trackingStage / (TRACKING_FLOW.length - 1)) * 100
      : 0;

  const visibleAmenities = useMemo(
    () => routeAmenities.filter((item) => mapFilters[item.category]),
    [mapFilters, routeAmenities]
  );

  const tollTotal = useMemo(
    () => routeAmenities.filter((item) => item.category === 'toll').reduce((sum, item) => sum + item.costEur, 0),
    [routeAmenities]
  );

  const mapFilterButtons: Array<{ key: AmenityCategory; label: string; icon: typeof Landmark }> = [
    { key: 'toll', label: u('tracking.amenity.toll', 'Tolls'), icon: Landmark },
    { key: 'fuel', label: u('tracking.amenity.fuel', 'Fuel'), icon: Fuel },
    { key: 'rest', label: u('tracking.amenity.rest', 'Rest'), icon: BedDouble },
    { key: 'parking', label: u('tracking.amenity.parking', 'Parking'), icon: ParkingCircle },
  ];

  const exportRouteReport = () => {
    const csv = reportRows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedPackage.trackingNumber}-route-report.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const openInvoice = async (document: 'predracun' | 'a4-faktura') => {
    if (!selectedPackage.shipmentId || invoiceLoading) return;
    setInvoiceError('');
    setInvoiceLoading(document);
    try {
      await api.shipmentInvoice(selectedPackage.shipmentId, document);
    } catch (error) {
      setInvoiceError(error instanceof Error ? error.message : u('tracking.invoiceError', 'The invoice could not be generated.'));
    } finally {
      setInvoiceLoading(null);
    }
  };

  const changeLoadStatus = async (status: PackageData['status']) => {
    if (role !== 'superadmin' || !selectedPackage.id || statusChanging || status === selectedPackage.status) return;
    const label = trPackageStatus(lang, status);
    const confirmed = await confirmAction({
      title: u('tracking.changeStatusTitle', `Change status to ${label}?`),
      text: u('tracking.changeStatusText', 'The new status and exact change time will be saved immediately.'),
      confirmText: u('tracking.changeStatusConfirm', 'Change status'),
    });
    if (!confirmed) return;

    setStatusChanging(status);
    try {
      await api.loads.updateStatus(selectedPackage.id, apiLoadStatus(status));
      await loadsResult.refresh();
      void showSuccess(u('tracking.statusChanged', 'Status changed'), label);
    } catch (error) {
      void showError(
        u('tracking.statusChangeFailed', 'Status could not be changed'),
        error instanceof Error ? error.message : undefined
      );
    } finally {
      setStatusChanging(null);
    }
  };

  const saveShipmentDetail = async (detail: ShipmentDetail, value: string | number | null) => {
    if (role !== 'superadmin' || !selectedPackage.id || savingDetailKey) return false;

    setSavingDetailKey(detail.key);
    try {
      if (detail.key === 'status') {
        await api.loads.updateStatus(selectedPackage.id, String(value));
      } else if (detail.key === 'consignee_customer_id') {
        await api.loads.update(selectedPackage.id, { consignee_customer_id: Number(value) });
      } else if (detail.key === 'departure' || detail.key === 'arrival') {
        const city = String(value || '').trim();
        if (!city) throw new Error('Location cannot be empty.');

        const type = detail.key === 'departure' ? 'pickup' : 'delivery';
        const stop = selectedPackage.stops?.find((item) => String(item.type) === type);
        if (stop?.id) {
          await api.loadStops.update(String(stop.id), { city });
        } else {
          await api.loadStops.create({
            load_id: Number(selectedPackage.id),
            type,
            position: type === 'pickup' ? 1 : 2,
            city,
            country_code: 'XX',
          });
        }
      } else if (detail.key === 'eta_at') {
        const deliveryStop = selectedPackage.stops?.find((item) => String(item.type) === 'delivery');
        if (!deliveryStop?.id) throw new Error('Set the arrival location first.');
        await api.loadStops.update(String(deliveryStop.id), { window_starts_at: value || null });
      } else {
        const normalizedValue = detail.input === 'number'
          ? (value === '' || value === null ? null : Number(value))
          : (value === '' ? null : value);
        await api.loads.update(selectedPackage.id, { [detail.key]: normalizedValue });
      }

      await loadsResult.refresh();
      return true;
    } catch (error) {
      void showError(
        u('tracking.detailUpdateFailed', 'Shipment detail could not be updated'),
        error instanceof Error ? error.message : undefined
      );
      return false;
    } finally {
      setSavingDetailKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="w-full">
      {/* Sidebar List */}
      <div className="w-full">
        <div className="mb-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 grid grid-cols-3 gap-2">
          <button
            onClick={() => setFilterMode('all')}
            className={cn(
              'h-10 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2',
              filterMode === 'all' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            )}
          >
            <Filter className="w-4 h-4" />
            {u('history.filter.all', 'All')}
          </button>
          <button
            onClick={() => setFilterMode('today')}
            className={cn(
              'h-10 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2',
              filterMode === 'today' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            )}
          >
            <Clock3 className="w-4 h-4" />
            {u('history.filter.today', 'Today')}
          </button>
          <button
            onClick={() => setFilterMode('calendar')}
            className={cn(
              'h-10 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2',
              filterMode === 'calendar' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            )}
          >
            <CalendarDays className="w-4 h-4" />
            {u('history.filter.calendar', 'Calendar')}
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="text"
            placeholder={u('common.searchTracking', 'Search tracking number...')}
            className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {filterMode === 'calendar' && (
          <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <div className="history-flatpickr">
              <Flatpickr
                value={[rangeStart, rangeEnd]}
                options={{
                  inline: true,
                  mode: 'range',
                  dateFormat: 'd.m.Y',
                  locale: flatpickrI18n(lang),
                  defaultDate: [rangeStart, rangeEnd],
                  prevArrow: '<span aria-hidden="true">‹</span>',
                  nextArrow: '<span aria-hidden="true">›</span>',
                }}
                onChange={(dates) => {
                  if (dates.length === 2) {
                    setRangeStart(startOfDay(dates[0]));
                    setRangeEnd(endOfDay(dates[1]));
                  }
                }}
                className="hidden"
              />
            </div>
          </div>
        )}

        {(role === 'company' || role === 'driver') && (
        <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                {u('tracking.loadCapacity', 'Load on truck')}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {loadCapacity.activeLoads.length} {u('tracking.activeLoads', 'active loads')}
              </p>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white whitespace-nowrap">
              {loadCapacity.totalWeightKg.toLocaleString()} kg
            </p>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Truck className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${loadCapacity.usedPercentage}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
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

        <div className="mt-6 space-y-4">
          {filteredPackages.map(pkg => (
            <button 
              key={pkg.id}
              onClick={() => {
                setSelectedPackage(pkg);
                setRightTab('details');
                setTrackingDetailsOpen(true);
              }}
              className="w-full cursor-pointer rounded-2xl border border-transparent bg-white p-4 text-left transition-all hover:border-primary dark:bg-slate-900 dark:hover:border-primary"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{pkg.carrier}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                  pkg.status === 'Finished'
                    ? "bg-emerald-100 text-emerald-600"
                    : pkg.status === 'Cancelled'
                      ? "bg-rose-100 text-rose-600"
                      : "bg-blue-100 text-blue-600"
                )}>{trPackageStatus(lang, pkg.status)}</span>
              </div>
              <p className="font-bold dark:text-white">{pkg.recipient || '—'}</p>
              <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                <div className="flex min-w-0 items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
                    <MapPin className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate text-xs font-bold">{pkg.origin}</span>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="flex min-w-0 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white">
                    <MapPin className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate text-xs font-bold">{pkg.destination}</span>
                </div>
              </div>
            </button>
          ))}
          {filteredPackages.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500">
              {u('tracking.noPackagesFound', 'No tracking items found for this filter.')}
            </div>
          )}
        </div>
      </div>

      {/* Main Tracking Content (Amazon Inspired) */}
      <TrackingItemDetails
        open={trackingDetailsOpen && Boolean(selectedPackage.id)}
        onClose={() => setTrackingDetailsOpen(false)}
        title={selectedPackage.recipient || selectedPackage.trackingNumber || 'Tracking item'}
        subtitle={`${selectedPackage.origin} → ${selectedPackage.destination}`}
        headerAction={role === 'superadmin' ? (
          <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
            <span className="hidden text-[10px] font-black uppercase tracking-wider text-slate-400 sm:inline">Status</span>
            <select
              value={headerStatus}
              disabled={savingDetailKey !== null}
              onChange={(event) => {
                const nextStatus = event.target.value;
                const previousStatus = headerStatus;
                const statusDetail = selectedPackage.details?.find((detail) => detail.key === 'status');
                setHeaderStatus(nextStatus);
                if (!statusDetail) {
                  setHeaderStatus(previousStatus);
                  return;
                }
                void saveShipmentDetail(statusDetail, nextStatus).then((saved) => {
                  if (!saved) setHeaderStatus(previousStatus);
                });
              }}
              aria-label="Shipment status"
              className="h-full cursor-pointer border-0 bg-transparent text-sm font-bold text-slate-800 outline-none disabled:cursor-wait disabled:opacity-60 dark:text-white"
            >
              {LOAD_STATUS_OPTIONS.map(([value, status]) => (
                <option key={value} value={value}>{trPackageStatus(lang, status)}</option>
              ))}
            </select>
          </label>
        ) : undefined}
      >
        <div className="mb-6 overflow-x-auto px-1 [scrollbar-width:thin] [scrollbar-color:rgb(148_163_184/0.72)_transparent] dark:[scrollbar-color:rgb(71_85_105/0.8)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-400/70 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600/80 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-slate-500/90 dark:[&::-webkit-scrollbar-thumb:hover]:bg-slate-500/95">
          <div className="inline-flex h-12 min-w-full w-max items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
          <button
            onClick={() => setRightTab('details')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'details' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <FileSpreadsheet className="w-4 h-4" />
            {u('tracking.shipmentDetails', 'Shipment details')}
          </button>
          <button
            onClick={() => setRightTab('tracker')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'tracker' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <PackageIcon className="w-4 h-4" />
            {u('Tracker', 'Tracker')}
          </button>
          <button
            onClick={() => setRightTab('dispatch')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'dispatch' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Bot className="w-4 h-4" />
            {u('AI Dispatch', 'AI Dispatch')}
          </button>
          <button
            onClick={() => setRightTab('map')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'map' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <MapPin className="w-4 h-4" />
            {u('Map', 'Map')}
          </button>
          <button
            onClick={() => setRightTab('timeline')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'timeline' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Clock3 className="w-4 h-4" />
            {u('history.tab.timeline', 'Timeline')}
          </button>
          <button
            onClick={() => setRightTab('return')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'return' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <RotateCcw className="w-4 h-4" />
            {u('Return', 'Return')}
          </button>
          <button
            onClick={() => setRightTab('returnRoutes')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'returnRoutes' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Route className="w-4 h-4" />
            {u('Return Routes', 'Return Routes')}
          </button>
          <button
            onClick={() => setRightTab('reports')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'reports' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <FileBarChart2 className="w-4 h-4" />
            {u('Reports', 'Reports')}
          </button>
          <button
            onClick={() => setRightTab('share')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'share' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Share2 className="w-4 h-4" />
            {u('Share', 'Share')}
          </button>
          <button
            onClick={() => setRightTab('invoice')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'invoice' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <ReceiptText className="w-4 h-4" />
            {u('Invoice', 'Invoice')}
          </button>
          <button
            onClick={() => setRightTab('review')}
            className={cn(
              'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
              rightTab === 'review' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Star className="w-4 h-4" />
            {u('Review', 'Review')}
          </button>
          </div>
        </div>

        {rightTab === 'tracker' && (
          <div className="amazon-card">
            <div className="amazon-header flex items-center justify-between">
              <div className="flex gap-8">
                <div>
                  <p className="text-[10px] uppercase text-slate-500">{u('Ordered on', 'Ordered on')}</p>
                  <p className="font-bold">{selectedPackage.addedDate ? new Date(selectedPackage.addedDate).toLocaleDateString() : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-500">{u('tracking.totalAmount', 'Total amount')}</p>
                  <p className="font-bold text-emerald-700">
                    {selectedPackage.totalAmount || 'EUR 0'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-500">{u('Ship to', 'Ship to')}</p>
                  <p className="font-bold text-primary flex items-center gap-1 cursor-pointer">
                    {selectedPackage.recipient || '—'} <ChevronRight className="w-3 h-3" />
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-slate-500">Order # {selectedPackage.trackingNumber}</p>
              </div>
            </div>
            <div className="amazon-body">
              <h2 className="text-xl font-bold text-emerald-600 mb-4">
                {trPackageStatus(lang, selectedPackage.status)}
              </h2>
              <div className="relative h-2 bg-slate-100 dark:bg-slate-800 rounded-full mb-8">
                <div
                  className={cn('absolute top-0 left-0 h-full rounded-full', selectedPackage.status === 'Cancelled' ? 'bg-rose-500' : 'bg-emerald-500')}
                  style={{ width: `${trackingProgress}%` }}
                />
                {TRACKING_FLOW.map((status, index) => {
                  const position = (index / (TRACKING_FLOW.length - 1)) * 100;
                  const active = trackingStage >= index && !['Pending', 'Cancelled'].includes(selectedPackage.status);
                  return (
                    <button
                      type="button"
                      key={status}
                      disabled={role !== 'superadmin' || statusChanging !== null}
                      onClick={() => void changeLoadStatus(status)}
                      aria-label={`${u('tracking.changeStatusConfirm', 'Change status')}: ${trPackageStatus(lang, status)}`}
                      className={cn(
                        'absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white dark:border-slate-900',
                        role === 'superadmin' && 'cursor-pointer transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-primary/40',
                        active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      )}
                      style={{ left: `${position}%` }}
                    />
                  );
                })}
              </div>
              <div className="grid grid-cols-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {TRACKING_FLOW.map((status, index) => (
                  <span key={status} className={cn(index === 0 ? 'text-left' : index === TRACKING_FLOW.length - 1 ? 'text-right' : 'text-center')}>
                    <span className="block">{trPackageStatus(lang, status)}</span>
                    {selectedPackage.statusChange?.[apiLoadStatus(status)] && (
                      <span className="mt-1 block text-[9px] font-semibold normal-case tracking-normal text-slate-500">
                        {new Date(selectedPackage.statusChange[apiLoadStatus(status)]).toLocaleString()}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {rightTab === 'details' && (
          <Card title={u('tracking.shipmentDetails', 'Shipment details')}>
            {role === 'superadmin' && (
              <p className="mb-3 text-xs text-slate-400">{u('tracking.clickEdit', 'Click any field to edit.')}</p>
            )}
            <TrackingShipmentDetails
              details={shipmentDetailsWithoutStatus}
              lang={lang}
              role={role}
              consigneeRecord={selectedPackage.consigneeRecord}
              savingKey={savingDetailKey}
              onSave={saveShipmentDetail}
            />
          </Card>
        )}

        {rightTab === 'dispatch' && (
          <div className="h-[620px]">
            <ChatConversationPanel
              activeConversation={dispatchConversation}
              draft={dispatchDraft}
              onDraftChange={setDispatchDraft}
              onSend={handleDispatchSend}
              messagePlaceholder={u('Write a message to dispatch...', 'Write a message to dispatch...')}
              className="h-full"
              showAiDispatchButton
              aiDispatchLabel={u('Write with AI Dispatch', 'Write with AI Dispatch')}
              onAiDispatchClick={handleAiDispatchCompose}
            />
          </div>
        )}

        {rightTab === 'map' && (
          <Card
            title={u('tracking.liveLocation', 'Live Location')}
            headerAction={
              <div className="flex flex-wrap items-center justify-end gap-2">
                {mapFilters.toll && (
                  <div className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-600">
                    {u('tracking.tollTotal', 'Toll total')}: EUR {tollTotal}
                  </div>
                )}

                <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <span>{u('tracking.amenity.toll', 'Tolls')}</span>
                  <Toggle
                    checked={mapFilters.toll}
                    onClick={() => setMapFilters((prev) => ({ ...prev, toll: !prev.toll }))}
                  />
                </label>

                {mapFilterButtons
                  .filter((item) => item.key !== 'toll')
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = mapFilters[item.key];
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setMapFilters((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer',
                          isActive
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-900'
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {item.label}
                      </button>
                    );
                  })}
              </div>
            }
          >
            <div className="h-[520px] rounded-xl overflow-hidden relative">
               <MapContainer center={selectedPackage.currentLocation} zoom={13} className="h-full w-full">
                  <TileLayer 
                    url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                    subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                    attribution="&copy; Google Maps"
                  />
                  <Marker position={selectedPackage.currentLocation}>
                    <Popup>
                      <div className="p-2">
                        <p className="font-bold">{selectedPackage.trackingNumber}</p>
                        <p className="text-xs text-slate-500">{trPackageStatus(lang, selectedPackage.status)}</p>
                      </div>
                    </Popup>
                  </Marker>

                  {visibleAmenities.map((amenity) => (
                    <CircleMarker
                      key={amenity.id}
                      center={amenity.position}
                      radius={8}
                      pathOptions={{
                        color:
                          amenity.category === 'toll'
                            ? '#f59e0b'
                            : amenity.category === 'fuel'
                              ? '#06b6d4'
                              : amenity.category === 'rest'
                                ? '#8b5cf6'
                                : '#10b981',
                        fillOpacity: 0.95,
                      }}
                    >
                      <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                        <div className="space-y-1">
                          <p className="text-xs font-bold">{u(amenity.labelKey, amenity.labelKey)}</p>
                          <p className="text-[11px] text-slate-500">
                            {u('tracking.amenity.cost', 'Cost')}: EUR {amenity.costEur}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {u('tracking.amenity.value', 'Value')}: {u(amenity.valueKey, amenity.valueKey)}
                          </p>
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  ))}
               </MapContainer>
            </div>
          </Card>
        )}

        {rightTab === 'timeline' && (
          <Card title={u('tracking.history', 'Tracking History')}>
            <div className="space-y-6">
              {selectedPackage.history.map((h, i) => (
                <div key={i} className="flex gap-6">
                  <div className="w-24 text-right">
                    <p className="text-xs font-bold dark:text-white">{h.date.split(',')[0]}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{h.date.split(',')[1]}</p>
                  </div>
                  <div className="relative">
                    <div className={cn("w-3 h-3 rounded-full mt-1", i === 0 ? "bg-primary" : "bg-slate-300 dark:bg-slate-700")} />
                    {i !== selectedPackage.history.length - 1 && <div className="absolute top-4 left-1.5 w-px h-full bg-slate-200 dark:bg-slate-800" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold dark:text-white">{trPackageStatus(lang, h.status)}</p>
                    <p className="text-xs text-slate-500">{h.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {rightTab === 'return' && (
          <Card title={u('Return and Replace', 'Return and Replace')}>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  {u('Request Status', 'Request Status')}
                </p>
                <p className="text-sm mt-2 text-slate-600 dark:text-slate-300">
                  {u('Return window is 14 days. Pickup is available tomorrow between 09:00-13:00.', 'Return window is 14 days. Pickup is available tomorrow between 09:00-13:00.')}
                </p>
              </div>
              <Button>{u('Start Return Request', 'Start Return Request')}</Button>
            </div>
          </Card>
        )}

        {rightTab === 'returnRoutes' && (
          <Card title={u('AI Return Route Suggestions', 'AI Return Route Suggestions')}>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-900/60">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary inline-flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {u('AI Return Engine', 'AI Return Engine')}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {u('Unlock smart return routes so you do not drive back empty.', 'Unlock smart return routes so you do not drive back empty.')}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                  <Coins className="w-3.5 h-3.5" />
                  {returnTokens} {u('tokens', 'tokens')}
                </div>
              </div>

              <div className="relative">
                <div className={cn('space-y-3 transition-all', !returnRoutesUnlocked ? 'blur-[3px] select-none pointer-events-none' : '')}>
                  {returnRouteSuggestions.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold dark:text-white">{item.title}</p>
                          <p className="text-xs text-slate-500 mt-1">{item.cargo}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-black text-primary">{item.payout}</p>
                          <p className="text-xs text-slate-500">
                            {u('ETA', 'ETA')} {item.eta}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3 text-xs">
                        <div className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1.5">
                          <span className="text-slate-500">{u('Deadhead', 'Deadhead')}:</span>{' '}
                          <span className="font-bold dark:text-white">{item.deadhead}</span>
                        </div>
                        <div className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1.5">
                          <span className="text-slate-500">{u('Confidence', 'Confidence')}:</span>{' '}
                          <span className="font-bold dark:text-white">{item.confidence}%</span>
                        </div>
                        <div className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2 py-1.5">
                          <span className="text-slate-500">{u('Status', 'Status')}:</span>{' '}
                          <span className="font-bold text-emerald-500">{u('Ready', 'Ready')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {!returnRoutesUnlocked && (
                  <div className="absolute inset-0 rounded-xl border border-dashed border-primary/40 bg-slate-900/35 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200/20 bg-slate-950/75 text-center p-5">
                      {isUnlockingReturnRoutes ? (
                        <div className="space-y-4">
                          <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 text-primary flex items-center justify-center">
                            <Loader2 className="w-6 h-6 animate-spin" />
                          </div>
                          <p className="text-sm font-bold text-white">
                            {u('AI is finding the best return routes', 'AI is finding the best return routes')}
                          </p>
                          <p className="text-xs text-slate-300">{unlockSteps[unlockStep]}</p>
                          <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all duration-500"
                              style={{ width: `${(unlockStep + 1) * 33.33}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 text-primary flex items-center justify-center">
                            <Lock className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-bold text-white">
                            {u('Unlock AI return suggestions', 'Unlock AI return suggestions')}
                          </p>
                          <p className="text-xs text-slate-300">
                            {u('Spend 10 tokens to unlock premium return routes and higher earnings.', 'Spend 10 tokens to unlock premium return routes and higher earnings.')}
                          </p>
                          <Button onClick={handleUnlockReturnRoutes} className="w-full" disabled={returnTokens < 10}>
                            <Coins className="w-4 h-4 mr-2" />
                            {u('Unlock for 10 tokens', 'Unlock for 10 tokens')}
                          </Button>
                          {returnTokens < 10 && (
                            <p className="text-[11px] text-rose-300">
                              {u('Not enough tokens to unlock.', 'Not enough tokens to unlock.')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {rightTab === 'share' && (
          <Card title={u('Share Tracking', 'Share Tracking')}>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  {u('Public Link', 'Public Link')}
                </p>
                <p className="text-sm font-mono mt-2 break-all text-slate-700 dark:text-slate-200">
                  https://smartfreight.ai/t/{selectedPackage.trackingNumber}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm">Email</Button>
                <Button variant="outline" size="sm">SMS</Button>
                <Button variant="outline" size="sm">WhatsApp</Button>
              </div>
            </div>
          </Card>
        )}

        {rightTab === 'invoice' && (
          <Card title={u('tracking.invoiceDocuments', 'Invoice documents')}>
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {u('tracking.invoiceHelp', 'Generate a printable payment document for the selected shipment.')}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <p className="mt-4 font-bold text-slate-900 dark:text-white">{u('tracking.proformaInvoice', 'Pro forma invoice')}</p>
                  <p className="mt-1 text-xs text-slate-500">{u('tracking.proformaHelp', 'Open a pro forma invoice ready for PDF printing.')}</p>
                  <Button className="mt-4 w-full gap-2" disabled={!selectedPackage.shipmentId || invoiceLoading !== null} onClick={() => openInvoice('predracun')}>
                    {invoiceLoading === 'predracun' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    {u('tracking.openProforma', 'Open pro forma invoice')}
                  </Button>
                </div>
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                    <Printer className="h-5 w-5" />
                  </div>
                  <p className="mt-4 font-bold text-slate-900 dark:text-white">{u('tracking.a4Invoice', 'A4 invoice')}</p>
                  <p className="mt-1 text-xs text-slate-500">{u('tracking.a4InvoiceHelp', 'Open the final A4 invoice with a PDF button in the header.')}</p>
                  <Button variant="outline" className="mt-4 w-full gap-2" disabled={!selectedPackage.shipmentId || invoiceLoading !== null} onClick={() => openInvoice('a4-faktura')}>
                    {invoiceLoading === 'a4-faktura' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                    {u('tracking.openA4Invoice', 'Open A4 invoice')}
                  </Button>
                </div>
              </div>
              {invoiceError && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{invoiceError}</p>}
            </div>
          </Card>
        )}

        {rightTab === 'reports' && (
          <Card title={u('tracking.reportsTitle', 'Reports and Tachograph')}>
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-primary">
                      {u('tracking.tachographUpload', 'Upload tachograph file (.DDD)')}
                    </p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {u('tracking.tachographHelp', 'Attach the original tachograph export file for compliance and trip auditing.')}
                    </p>
                    <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <Upload className="h-4 w-4" />
                      {u('tracking.chooseDddFile', 'Choose .DDD file')}
                      <input
                        type="file"
                        accept=".ddd,.DDD"
                        className="sr-only"
                        onChange={(event) => setTachographFile(event.target.files?.[0] ?? null)}
                      />
                    </label>
                    <p className="mt-3 text-xs text-slate-500">
                      {tachographFile
                        ? `${u('tracking.selectedFile', 'Selected file')}: ${tachographFile.name}`
                        : u('tracking.noTachographFile', 'No tachograph file uploaded yet.')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                      {u('tracking.driverReports', 'Driver reports')}
                    </p>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                      {u('tracking.driverReportsHelp', 'Export route reports in Excel-compatible format with vehicle, trip, mileage, stops, driver breaks, arrival time and delays.')}
                    </p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {reportRows.slice(2).map(([label, value]) => (
                        <div key={label} className="rounded-xl bg-slate-50 dark:bg-slate-900/60 px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>
                    <Button onClick={exportRouteReport} className="mt-4">
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      {u('tracking.exportExcelReport', 'Export route report')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {rightTab === 'review' && (
          <Card title={u('Delivery Review', 'Delivery Review')}>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">
                  {u('Service Rating', 'Service Rating')}
                </p>
                <div className="flex items-center gap-1 mt-2 text-amber-500">
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4" />
                </div>
                <p className="text-sm mt-2 text-slate-600 dark:text-slate-300">
                  {u('Write a short comment about delivery speed and quality.', 'Write a short comment about delivery speed and quality.')}
                </p>
              </div>
              <Button variant="outline">{u('Write Review', 'Write Review')}</Button>
            </div>
          </Card>
        )}
      </TrackingItemDetails>
      </div>
    </div>
  );
};
