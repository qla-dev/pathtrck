import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Tooltip } from 'react-leaflet';
import { MapPin, ChevronRight, Package as PackageIcon, RotateCcw, Share2, Star, Route, Lock, Coins, Loader2, Sparkles, FileBarChart2, Upload, FileSpreadsheet, Fuel, BedDouble, ParkingCircle, Landmark, ReceiptText, FileText, Printer } from 'lucide-react';
import { Language, Package as PackageData, Role, ShipmentDetail } from '../../types';
import { api } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';
import { ui, trPackageStatus } from '../../i18n';
import { cn } from '../../lib/cn';
import { confirmAction, showError, showSuccess } from '../../lib/swal';
import { TRACKING_FLOW, apiLoadStatus, mapLoadToPackage } from '../../lib/loadDetails';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Toggle } from '../ui/Toggle';
import { TrackingItemDetails } from './TrackingItemDetails';
import { TrackingShipmentDetails } from './TrackingShipmentDetails';
import { LoadStatusPicker } from '../load/LoadStatusPicker';
import { LenaAI } from '../lena/LenaAI';
import { type LocationSearchResult } from '../../services/locationSearch';
import { ReviewComposer } from '../reviews/ReviewComposer';

type AmenityCategory = 'toll' | 'fuel' | 'rest' | 'parking';

type RouteAmenity = {
  id: string;
  category: AmenityCategory;
  labelKey: string;
  position: [number, number];
  costEur: number;
  valueKey: string;
};

const PACKAGE_ROUTE_AMENITIES: Record<string, RouteAmenity[]> = {};

const emptyPackage: PackageData = { id: '', trackingNumber: '', carrier: '', status: 'Pending', origin: '', destination: '', addedDate: '', transitDays: 0, currentLocation: [43.8563, 18.4131], history: [] };

type LoadDetailsModalProps = {
  loadId: string;
  lang: Language;
  role: Role;
  userId?: number;
  companyIds?: number[];
  onClose: () => void;
  onChanged?: () => void;
};

export const LoadDetailsModal = ({ loadId, lang, role, userId, companyIds = [], onClose, onChanged }: LoadDetailsModalProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [selectedPackage, setSelectedPackage] = useState<PackageData>(emptyPackage);
  const [detailsOpen, setDetailsOpen] = useState(true);

  const refreshPackage = async () => {
    const response = await api.loads.get(loadId);
    setSelectedPackage(mapLoadToPackage(response.data, lang));
  };

  useEffect(() => {
    let cancelled = false;
    setDetailsOpen(true);
    api.loads.get(loadId).then((response) => {
      if (!cancelled) setSelectedPackage(mapLoadToPackage(response.data, lang));
    });
    return () => { cancelled = true; };
  }, [loadId, lang]);

  const [rightTab, setRightTab] = useState<'tracker' | 'details' | 'map' | 'return' | 'returnRoutes' | 'reports' | 'share' | 'invoice' | 'review'>('details');
  const [lenaOpen, setLenaOpen] = useState(false);
  const [returnTokens, setReturnTokens] = useState(0);
  const [returnRoutesUnlocked, setReturnRoutesUnlocked] = useState(false);
  const [isUnlockingReturnRoutes, setIsUnlockingReturnRoutes] = useState(false);
  const [unlockStep, setUnlockStep] = useState(0);
  const [tachographFile, setTachographFile] = useState<File | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState<'predracun' | 'a4-faktura' | null>(null);
  const [invoiceError, setInvoiceError] = useState('');
  const [statusChanging, setStatusChanging] = useState<PackageData['status'] | null>(null);
  const [savingDetailKey, setSavingDetailKey] = useState<string | null>(null);
  const [mapFilters, setMapFilters] = useState<Record<AmenityCategory, boolean>>({
    toll: true,
    fuel: false,
    rest: false,
    parking: false,
  });
  const shipmentDetailsWithoutStatus = useMemo(
    () => (selectedPackage.details || []).filter((detail) => detail.key !== 'status'),
    [selectedPackage.details]
  );

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

  const suggestionLoadsResult = useApiList(api.loads.list, { per_page: 4 });
  const returnRouteSuggestions = useMemo(
    () => suggestionLoadsResult.items.filter((load) => String(load.id) !== selectedPackage.id).slice(0, 3).map((load) => {
      const stops = Array.isArray(load.stops) ? load.stops as Array<Record<string, unknown>> : [];
      return { id: String(load.id), title: `${String(stops[0]?.city || '—')} -> ${String(stops[stops.length - 1]?.city || '—')}`, deadhead: '—', cargo: String(load.cargo_type || load.title || '—'), payout: `${String(load.currency || 'EUR')} ${Number(load.budget || 0).toLocaleString()}`, eta: String(stops[stops.length - 1]?.window_ends_at || '—'), confidence: Number(((load.routes as Array<Record<string, unknown>> | undefined)?.[0]?.ai_confidence) || 0) };
    }),
    [suggestionLoadsResult.items, selectedPackage.id]
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
    if (!selectedPackage.id || invoiceLoading) return;
    setInvoiceError('');
    setInvoiceLoading(document);
    try {
      await api.loadInvoice(selectedPackage.id, document);
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
      await refreshPackage();
      onChanged?.();
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
        if (deliveryStop?.id) {
          await api.loadStops.update(String(deliveryStop.id), { window_starts_at: value || null });
        } else if (selectedPackage.shipmentId) {
          await api.shipments.update(selectedPackage.shipmentId, { estimated_delivery_at: value || null });
        } else {
          const destination = selectedPackage.destination.trim();
          if (!destination || destination === '—') throw new Error('Set the arrival location first.');
          await api.loadStops.create({
            load_id: Number(selectedPackage.id),
            type: 'delivery',
            position: 2,
            city: destination,
            country_code: 'XX',
            window_starts_at: value || null,
          });
        }
      } else {
        const normalizedValue = detail.input === 'number'
          ? (value === '' || value === null ? null : Number(value))
          : (value === '' ? null : value);
        await api.loads.update(selectedPackage.id, { [detail.key]: normalizedValue });
      }

      await refreshPackage();
      onChanged?.();
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

  const saveShipmentLocation = async (detail: ShipmentDetail, location: LocationSearchResult) => {
    if (role !== 'superadmin' || !selectedPackage.id || savingDetailKey) return false;

    const type = detail.key === 'departure' ? 'pickup' : 'delivery';
    const city = location.city.trim() || location.label.trim();
    const countryCode = location.countryCode.trim().toUpperCase();
    if (!city || !/^[A-Z]{2}$/.test(countryCode)) {
      void showError(
        u('tracking.detailUpdateFailed', 'Shipment detail could not be updated'),
        u('map.locationCountryRequired', 'Choose a location with a valid country.')
      );
      return false;
    }

    setSavingDetailKey(detail.key);
    try {
      const stop = selectedPackage.stops?.find((item) => String(item.type) === type);
      const payload = {
        city,
        country_code: countryCode,
        address: location.label,
        latitude: location.latitude,
        longitude: location.longitude,
      };
      if (stop?.id) {
        await api.loadStops.update(String(stop.id), payload);
      } else {
        await api.loadStops.create({
          load_id: Number(selectedPackage.id),
          type,
          position: type === 'pickup' ? 1 : 2,
          ...payload,
        });
      }
      await refreshPackage();
      onChanged?.();
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
    <>
    <TrackingItemDetails
      open={Boolean(selectedPackage.id) && detailsOpen}
      onClose={() => setDetailsOpen(false)}
      onExitComplete={onClose}
      bodyClassName={
        rightTab === 'map'
          ? 'overflow-hidden p-0 md:p-0'
          : rightTab === 'returnRoutes' && !returnRoutesUnlocked
            ? 'overflow-hidden'
          : undefined
      }
      headerAction={(
        <>
          <button
            type="button"
            onClick={() => setLenaOpen(true)}
            className="hidden sm:inline-flex h-10 items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 text-xs font-bold text-primary transition-all hover:bg-primary/10 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            {u('Ask LenaAI about this Load', 'Ask LenaAI about this Load')}
          </button>
          <button
            type="button"
            onClick={() => setLenaOpen(true)}
            aria-label={u('Ask LenaAI about this Load', 'Ask LenaAI about this Load')}
            className="sm:hidden h-10 w-10 rounded-xl border border-primary/30 bg-primary/5 text-primary flex items-center justify-center hover:bg-primary/10 transition-all cursor-pointer"
          >
            <Sparkles className="w-5 h-5" />
          </button>
          {role === 'superadmin' && (
            <LoadStatusPicker
              lang={lang}
              status={selectedPackage.status}
              isChanging={statusChanging !== null}
              onChange={(status) => void changeLoadStatus(status)}
              className="[&_button]:h-10"
            />
          )}
        </>
      )}
    >
      <div className="overflow-x-auto [scrollbar-width:thin] [scrollbar-color:rgb(148_163_184/0.72)_transparent] dark:[scrollbar-color:rgb(71_85_105/0.8)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-400/70 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600/80 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-slate-500/90 dark:[&::-webkit-scrollbar-thumb:hover]:bg-slate-500/95">
        <div className="inline-flex h-10 min-w-full w-max items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
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
        <Card title={(
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-primary">
              {u('tracking.shipmentDetails', 'Shipment details')}
            </p>
            <h2 className="flex min-w-0 items-baseline gap-2 text-xl font-black text-slate-900 dark:text-white md:text-2xl">
              {selectedPackage.trackingNumber && (
                <>
                  <span className="shrink-0 font-mono text-primary">{selectedPackage.trackingNumber}</span>
                  <span className="shrink-0 text-slate-300 dark:text-slate-600">·</span>
                </>
              )}
              <span className="truncate">{selectedPackage.recipient || selectedPackage.trackingNumber || 'Tracking item'}</span>
            </h2>
            <p className="mt-0.5 truncate text-xs font-normal text-slate-500">
              {selectedPackage.origin} → {selectedPackage.destination}
            </p>
          </div>
        )}>
          {role === 'superadmin' && (
            <p className="mb-3 text-xs text-slate-400">{u('tracking.clickEdit', 'Click any field to edit.')}</p>
          )}
          <TrackingShipmentDetails
            details={shipmentDetailsWithoutStatus}
            lang={lang}
            role={role}
            consigneeRecord={selectedPackage.consigneeRecord}
            stops={selectedPackage.stops}
            savingKey={savingDetailKey}
            onSave={saveShipmentDetail}
            onSaveLocation={saveShipmentLocation}
          />
        </Card>
      )}

      {rightTab === 'map' && (
        <Card
          className="flex h-full min-h-0 flex-col rounded-none border-0"
          contentClassName="min-h-0 flex-1 p-0"
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
          <div className="relative h-full min-h-0 overflow-hidden">
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
        <Card
          title={u('AI Return Route Suggestions', 'AI Return Route Suggestions')}
          className={cn(!returnRoutesUnlocked && 'flex h-full min-h-0 flex-col')}
          contentClassName={cn(!returnRoutesUnlocked && 'min-h-0 flex-1')}
        >
          <div className={cn('space-y-4', !returnRoutesUnlocked && 'flex h-full min-h-0 flex-col gap-4 space-y-0')}>
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

            <div className={cn('relative', !returnRoutesUnlocked && 'min-h-0 flex-1 overflow-hidden')}>
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
                https://freightbook.ai/t/{selectedPackage.trackingNumber}
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
                <Button className="mt-4 w-full gap-2" disabled={!selectedPackage.id || invoiceLoading !== null} onClick={() => openInvoice('predracun')}>
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
                <Button variant="outline" className="mt-4 w-full gap-2" disabled={!selectedPackage.id || invoiceLoading !== null} onClick={() => openInvoice('a4-faktura')}>
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
        <ReviewComposer
          mode="load"
          targetId={selectedPackage.id}
          targetName={selectedPackage.trackingNumber || selectedPackage.description || `Load #${selectedPackage.id}`}
          viewerRole={role}
          lang={lang}
        />
      )}
    </TrackingItemDetails>
    <LenaAI
      open={lenaOpen}
      onClose={() => setLenaOpen(false)}
      lang={lang}
      userId={userId}
      companyIds={companyIds}
      loadId={selectedPackage.id}
      loadLabel={selectedPackage.trackingNumber}
    />
    </>
  );
};
