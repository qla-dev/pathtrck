import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet';
import { ChevronRight, Package as PackageIcon, RotateCcw, Share2, Star, Route, Lock, Coins, Loader2, Sparkles, FileBarChart2, Upload, FileSpreadsheet, Fuel, BedDouble, ParkingCircle, Landmark, ReceiptText, FileText, FileCheck2, Printer, Play, Pause } from 'lucide-react';
import { Language, Package as PackageData, Role, ShipmentDetail } from '../../types';
import { api, type FuelStation } from '../../services/api';
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
import { TrackingMapCard } from './TrackingMapCard';
import { trackingMarkerIcon } from './trackingMapMarker';
import { VehicleReturnModal } from './VehicleReturnModal';
import { CustomsDocumentList } from '../load/CustomsDocumentList';

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

const haversineDistanceKm = (from: [number, number], to: [number, number]) => {
  const radians = (value: number) => (value * Math.PI) / 180;
  const latitudeDelta = radians(to[0] - from[0]);
  const longitudeDelta = radians(to[1] - from[1]);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from[0])) * Math.cos(radians(to[0])) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Leaflet needs actual points for an air lane. Sampling the great-circle arc keeps long-haul
// flights accurate instead of drawing or briefly flashing a road route.
const greatCirclePoints = (from: [number, number], to: [number, number], segments = 80): [number, number][] => {
  const radians = (value: number) => (value * Math.PI) / 180;
  const degrees = (value: number) => (value * 180) / Math.PI;
  const vector = ([latitude, longitude]: [number, number]) => {
    const lat = radians(latitude);
    const lng = radians(longitude);
    return [Math.cos(lat) * Math.cos(lng), Math.cos(lat) * Math.sin(lng), Math.sin(lat)];
  };
  const start = vector(from);
  const end = vector(to);
  const angle = Math.acos(Math.min(1, Math.max(-1, start.reduce((sum, value, index) => sum + value * end[index], 0))));
  if (!angle) return [from, to];
  const sinAngle = Math.sin(angle);
  return Array.from({ length: segments + 1 }, (_, index) => {
    const fraction = index / segments;
    const startWeight = Math.sin((1 - fraction) * angle) / sinAngle;
    const endWeight = Math.sin(fraction * angle) / sinAngle;
    const x = startWeight * start[0] + endWeight * end[0];
    const y = startWeight * start[1] + endWeight * end[1];
    const z = startWeight * start[2] + endWeight * end[2];
    return [degrees(Math.atan2(z, Math.sqrt(x * x + y * y))), degrees(Math.atan2(y, x))];
  });
};

const FitTrackingRoute = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(points, {
      paddingTopLeft: [48, 125],
      paddingBottomRight: [48, 90],
      maxZoom: 11,
    });
  }, [map, points]);
  return null;
};

const FuelStationViewportLoader = ({ enabled, onBoundsChange }: { enabled: boolean; onBoundsChange: (bounds: L.LatLngBounds) => void }) => {
  const map = useMap();
  useEffect(() => {
    if (!enabled) return undefined;
    let timer: number | undefined;
    const refresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => onBoundsChange(map.getBounds()), 250);
    };
    refresh();
    map.on('moveend zoomend', refresh);
    return () => {
      window.clearTimeout(timer);
      map.off('moveend zoomend', refresh);
    };
  }, [enabled, map, onBoundsChange]);
  return null;
};

const routeEndpointIcon = (countryCode: string | undefined, color: string) => L.divIcon({
  className: 'tracking-route-endpoint',
  html: `<div style="position:relative;width:32px;height:38px">
    <div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;overflow:hidden;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 2px 9px rgba(15,23,42,.45)">
      ${countryCode ? `<img src="https://flagcdn.com/w80/${countryCode.toLowerCase()}.png" alt="" style="width:100%;height:100%;object-fit:cover" />` : ''}
    </div>
    <div style="position:absolute;left:50%;top:29px;transform:translateX(-50%);border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid white"></div>
  </div>`,
  iconSize: [32, 38],
  iconAnchor: [16, 38],
  popupAnchor: [0, -38],
});

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

  const [rightTab, setRightTab] = useState<'tracker' | 'details' | 'return' | 'returnRoutes' | 'reports' | 'share' | 'documents' | 'invoice' | 'review'>('tracker');
  const [lenaOpen, setLenaOpen] = useState(false);
  const [returnTokens, setReturnTokens] = useState(0);
  const [returnRoutesUnlocked, setReturnRoutesUnlocked] = useState(false);
  const [isUnlockingReturnRoutes, setIsUnlockingReturnRoutes] = useState(false);
  const [unlockStep, setUnlockStep] = useState(0);
  const [tachographFile, setTachographFile] = useState<File | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState<'predracun' | 'a4-faktura' | null>(null);
  const [invoiceError, setInvoiceError] = useState('');
  const [statusChanging, setStatusChanging] = useState<PackageData['status'] | null>(null);
  const [carDropOpen, setCarDropOpen] = useState(false);
  const [receiveReviewPending, setReceiveReviewPending] = useState(false);
  const [savingDetailKey, setSavingDetailKey] = useState<string | null>(null);
  const [mapFilters, setMapFilters] = useState<Record<AmenityCategory, boolean>>({
    toll: true,
    fuel: false,
    rest: false,
    parking: false,
  });
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);
  const [remainingDistanceKm, setRemainingDistanceKm] = useState<number | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const trackerMapRef = useRef<L.Map | null>(null);
  const [trackerCardOpen, setTrackerCardOpen] = useState(false);
  const [trackerCardPoint, setTrackerCardPoint] = useState<L.Point | null>(null);
  const [liveTrackingEnabled, setLiveTrackingEnabled] = useState(false);
  const [liveTrackingUpdatedAt, setLiveTrackingUpdatedAt] = useState<string>('');
  const [fuelStations, setFuelStations] = useState<FuelStation[]>([]);
  const [fuelStationsLoading, setFuelStationsLoading] = useState(false);

  useEffect(() => {
    setRightTab('tracker');
    setTrackerCardOpen(false);
    setReceiveReviewPending(false);
  }, [loadId]);

  useEffect(() => {
    if (!selectedPackage.id) return;
    setLiveTrackingEnabled(false);
    setLiveTrackingUpdatedAt(selectedPackage.trackingUpdatedAt || '');
  }, [selectedPackage.id, selectedPackage.trackingUpdatedAt]);

  useEffect(() => {
    const map = trackerMapRef.current;
    if (!map || !trackerCardOpen || !selectedPackage.hasCurrentLocation || rightTab !== 'tracker') {
      setTrackerCardPoint(null);
      return undefined;
    }
    const updateCardPoint = () => setTrackerCardPoint(map.latLngToContainerPoint(selectedPackage.currentLocation));
    updateCardPoint();
    map.on('move zoom resize', updateCardPoint);
    return () => { map.off('move zoom resize', updateCardPoint); };
  }, [rightTab, selectedPackage.currentLocation, selectedPackage.hasCurrentLocation, trackerCardOpen]);

  const loadFuelStations = useCallback((bounds: L.LatLngBounds) => {
    setFuelStationsLoading(true);
    void api.fuelStations.list({
      south: bounds.getSouth(),
      west: bounds.getWest(),
      north: bounds.getNorth(),
      east: bounds.getEast(),
      limit: 1000,
    }).then((response) => {
      setFuelStations(response.data);
    }).catch(() => {
      setFuelStations([]);
    }).finally(() => {
      setFuelStationsLoading(false);
    });
  }, []);
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

  const canManageStatuses = role === 'driver' || role === 'company' || role === 'superadmin' || role === 'master';
  const canCustomerReceive = role === 'user' && selectedPackage.status === 'In delivery';
  const canChangeStatus = canManageStatuses || canCustomerReceive;
  const visibleStatus = role === 'user' && selectedPackage.status === 'Finished' ? 'Received' : selectedPackage.status;
  const trackingFlow = role === 'user' ? TRACKING_FLOW.filter((status) => status !== 'Finished') : TRACKING_FLOW;
  const trackingStage = trackingFlow.indexOf(visibleStatus);
  const trackingProgress = visibleStatus === trackingFlow[trackingFlow.length - 1]
    ? 100
    : trackingStage >= 0
      ? (trackingStage / (trackingFlow.length - 1)) * 100
      : 0;
  const canSelectStatus = (status: PackageData['status']) => (canManageStatuses && status !== 'Received') || (role === 'user' && status === 'Received');
  const receivedActionLabel = lang === 'bs'
    ? 'Označi kao primljeno i ocijeni'
    : lang === 'de'
      ? 'Als empfangen markieren und bewerten'
      : 'Mark as received and review';

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

  const trackingRouteEndpoints = useMemo(() => {
    const stops = selectedPackage.stops || [];
    const pickup = stops.find((stop) => String(stop.type) === 'pickup') || stops[0];
    const delivery = stops.find((stop) => String(stop.type) === 'delivery') || stops[stops.length - 1];
    const toPosition = (stop?: Record<string, unknown>): [number, number] | null => {
      if (!stop || stop.latitude === null || stop.latitude === undefined || stop.longitude === null || stop.longitude === undefined) return null;
      const latitude = Number(stop.latitude);
      const longitude = Number(stop.longitude);
      return Number.isFinite(latitude) && Number.isFinite(longitude) ? [latitude, longitude] : null;
    };
    return { pickup: toPosition(pickup), delivery: toPosition(delivery) };
  }, [selectedPackage.stops]);

  useEffect(() => {
    const { pickup, delivery } = trackingRouteEndpoints;
    if (!pickup || !delivery) {
      setRoutePoints([]);
      setRouteDistanceKm(null);
      setRemainingDistanceKm(null);
      setRouteLoading(false);
      return undefined;
    }

    if (selectedPackage.transportType === 'air') {
      setRouteLoading(false);
      const hasCurrent = Boolean(selectedPackage.hasCurrentLocation);
      const points = hasCurrent
        ? [...greatCirclePoints(pickup, selectedPackage.currentLocation), ...greatCirclePoints(selectedPackage.currentLocation, delivery).slice(1)]
        : greatCirclePoints(pickup, delivery);
      const totalDistance = hasCurrent
        ? haversineDistanceKm(pickup, selectedPackage.currentLocation) + haversineDistanceKm(selectedPackage.currentLocation, delivery)
        : haversineDistanceKm(pickup, delivery);
      setRoutePoints(points);
      setRouteDistanceKm(Math.round(totalDistance * 10) / 10);
      setRemainingDistanceKm(selectedPackage.hasCurrentLocation
        ? Math.round(haversineDistanceKm(selectedPackage.currentLocation, delivery) * 10) / 10
        : null);
      return undefined;
    }

    const controller = new AbortController();
    const fetchRoute = async (positions: [number, number][], geometry: boolean) => {
      const coordinates = positions.map(([latitude, longitude]) => `${longitude},${latitude}`).join(';');
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=${geometry ? 'full' : 'false'}&geometries=geojson`,
        { signal: controller.signal },
      );
      if (!response.ok) throw new Error('Route unavailable');
      return response.json() as Promise<{ routes?: Array<{ distance?: number; geometry?: { coordinates?: [number, number][] } }> }>;
    };

    setRoutePoints([]);
    setRouteDistanceKm(null);
    setRemainingDistanceKm(null);
    setRouteLoading(true);
    const remainingRouteRequest = selectedPackage.hasCurrentLocation
      ? fetchRoute([selectedPackage.currentLocation, delivery], false)
      : Promise.resolve(null);
    const fullRoutePositions: [number, number][] = selectedPackage.hasCurrentLocation
      ? [pickup, selectedPackage.currentLocation, delivery]
      : [pickup, delivery];
    void Promise.all([
      fetchRoute(fullRoutePositions, true),
      remainingRouteRequest,
    ])
      .then(([fullRouteData, remainingRouteData]) => {
        const fullRoute = fullRouteData.routes?.[0];
        const remainingRoute = remainingRouteData?.routes?.[0];
        if (fullRoute?.geometry?.coordinates?.length) {
          setRoutePoints(fullRoute.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]));
        }
        setRouteDistanceKm(fullRoute?.distance ? Math.round(fullRoute.distance / 100) / 10 : null);
        setRemainingDistanceKm(remainingRoute?.distance ? Math.round(remainingRoute.distance / 100) / 10 : null);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setRouteDistanceKm(null);
        setRemainingDistanceKm(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setRouteLoading(false);
      });

    return () => controller.abort();
  }, [selectedPackage.currentLocation, selectedPackage.hasCurrentLocation, selectedPackage.transportType, trackingRouteEndpoints]);

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
    if (!canChangeStatus || !canSelectStatus(status) || !selectedPackage.id || statusChanging || status === selectedPackage.status) return;
    if (status === 'Finished') {
      setCarDropOpen(true);
      return;
    }

    if (status === 'Received') {
      setReceiveReviewPending(true);
      setRightTab('review');
      return;
    }

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

  const canControlLiveTracking = role === 'driver' || role === 'company' || role === 'superadmin' || role === 'master';
  const handleLiveTrackingToggle = async () => {
    if (!canControlLiveTracking) return;
    const nextEnabled = !liveTrackingEnabled;
    const sendsDriverRequest = role === 'company' || role === 'superadmin' || role === 'master';
    const confirmed = await confirmAction({
      title: nextEnabled
        ? sendsDriverRequest
          ? u('tracking.requestLiveTrackingTitle', "Send request to driver's app?")
          : u('tracking.startLiveTrackingTitle', 'Start tracking in app?')
        : u('tracking.pauseLiveTrackingTitle', 'Pause live tracking?'),
      text: nextEnabled
        ? sendsDriverRequest
          ? u('tracking.requestLiveTrackingText', "A request will be sent to the driver's app to start sharing live location.")
          : u('tracking.startLiveTrackingText', 'Your live location will be shared for this load.')
        : u('tracking.pauseLiveTrackingText', 'Live location sharing will be paused for this load.'),
      confirmText: nextEnabled
        ? sendsDriverRequest
          ? u('tracking.sendRequest', 'Send request')
          : u('tracking.startTracking', 'Start tracking')
        : u('tracking.pauseTracking', 'Pause tracking'),
    });
    if (!confirmed) return;
    setLiveTrackingEnabled(nextEnabled);
    setLiveTrackingUpdatedAt(new Date().toISOString());
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
        rightTab === 'tracker'
          ? 'relative overflow-hidden p-0 md:p-0'
          : rightTab === 'returnRoutes' && !returnRoutesUnlocked
            ? 'overflow-hidden'
            : undefined
      }
      headerAction={(
        <>
          <button
            type="button"
            onClick={() => setRightTab('invoice')}
            className="hidden sm:inline-flex h-10 items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 text-xs font-bold text-primary transition-all hover:bg-primary/10 cursor-pointer"
          >
            <ReceiptText className="h-4 w-4" />
            {u('Invoice', 'Invoice')}
          </button>
          <button
            type="button"
            onClick={() => setRightTab('invoice')}
            aria-label={u('Invoice', 'Invoice')}
            className="sm:hidden h-10 w-10 rounded-xl border border-primary/30 bg-primary/5 text-primary flex items-center justify-center hover:bg-primary/10 transition-all cursor-pointer"
          >
            <ReceiptText className="h-5 w-5" />
          </button>
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
          {canChangeStatus && (
            <LoadStatusPicker
              lang={lang}
              status={visibleStatus}
              isChanging={statusChanging !== null}
              onChange={(status) => void changeLoadStatus(status)}
              className="[&_button]:h-10"
              availableStatuses={role === 'user'
                ? ['Received']
                : ['Posted', 'Opened', 'Sent', 'In delivery', 'Finished', 'Pending', 'Cancelled']}
              actionLabels={{ Received: receivedActionLabel }}
            />
          )}
        </>
      )}
    >
      <div className="overflow-x-auto [scrollbar-width:thin] [scrollbar-color:rgb(148_163_184/0.72)_transparent] dark:[scrollbar-color:rgb(71_85_105/0.8)_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-400/70 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600/80 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-slate-500/90 dark:[&::-webkit-scrollbar-thumb:hover]:bg-slate-500/95">
        <div className="inline-flex h-10 min-w-full w-max items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
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
          onClick={() => setRightTab('documents')}
          className={cn(
            'h-full px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5',
            rightTab === 'documents' ? 'bg-primary text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          )}
        >
          <FileCheck2 className="w-4 h-4" />
          {u('tracking.attachedDocuments', 'Attached documents')}
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
        <div className="absolute inset-x-0 top-0 z-[1000] border-b border-slate-200 bg-white/85 shadow-lg backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
          <div className="grid items-center gap-5 bg-white/40 px-5 py-2 text-sm font-medium dark:bg-slate-900/40 xl:grid-cols-[minmax(520px,1fr)_auto_auto]">
            <div className="order-2 flex gap-6">
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

            <div className="order-1 min-w-0 pt-1">
              <div className="relative h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={cn('absolute left-0 top-0 h-full rounded-full', selectedPackage.status === 'Cancelled' ? 'bg-rose-500' : 'bg-emerald-500')}
                  style={{ width: `${trackingProgress}%` }}
                />
                {trackingFlow.map((status, index) => {
                  const position = (index / (trackingFlow.length - 1)) * 100;
                  const active = trackingStage >= index && !['Pending', 'Cancelled'].includes(selectedPackage.status);
                  return (
                    <button
                      type="button"
                      key={status}
                      disabled={!canChangeStatus || !canSelectStatus(status) || statusChanging !== null}
                      onClick={() => void changeLoadStatus(status)}
                      aria-label={`${u('tracking.changeStatusConfirm', 'Change status')}: ${trPackageStatus(lang, status)}`}
                      className={cn(
                        'absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white dark:border-slate-900',
                        canChangeStatus && canSelectStatus(status) && 'cursor-pointer transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-primary/40',
                        active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                      )}
                      style={{ left: `${position}%` }}
                    />
                  );
                })}
              </div>
              <div className="relative mt-1.5 h-7 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                {trackingFlow.map((status, index) => {
                  const position = (index / (trackingFlow.length - 1)) * 100;
                  return (
                  <span
                    key={status}
                    className={cn(
                      'absolute top-0 w-1/6',
                      index === 0
                        ? 'left-0 text-left'
                        : index === trackingFlow.length - 1
                          ? 'right-0 text-right'
                          : '-translate-x-1/2 text-center',
                      index === trackingStage && 'text-emerald-600 dark:text-emerald-400',
                    )}
                    style={index > 0 && index < TRACKING_FLOW.length - 1 ? { left: `${position}%` } : undefined}
                  >
                    <span className="block">{trPackageStatus(lang, status)}</span>
                    {selectedPackage.statusChange?.[apiLoadStatus(status)] && (
                      <span className={cn(
                        'mt-px block text-[8px] font-semibold normal-case leading-tight tracking-normal',
                        index === trackingStage ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500',
                      )}>
                        {new Date(selectedPackage.statusChange[apiLoadStatus(status)]).toLocaleString()}
                      </span>
                    )}
                  </span>
                  );
                })}
              </div>
            </div>

            <div className="order-3 text-right">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Order #</p>
              <p className="whitespace-nowrap font-mono text-sm font-black text-primary">{selectedPackage.trackingNumber}</p>
            </div>
          </div>

          <div className="pointer-events-none absolute right-4 top-full mt-3 flex max-w-[calc(100%_-_2rem)] flex-wrap items-center justify-end gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-100/90 px-3 py-1.5 text-xs font-bold text-sky-700 shadow-sm backdrop-blur dark:bg-sky-950/80 dark:text-sky-300">
              {routeLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {u('tracking.totalDistance', 'Total distance')}: {routeDistanceKm === null ? '—' : `${routeDistanceKm.toLocaleString()} km`}
            </div>
            <div className="inline-flex items-center rounded-full bg-emerald-100/90 px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm backdrop-blur dark:bg-emerald-950/80 dark:text-emerald-300">
              {u('tracking.remainingDistance', 'Remaining')}: {remainingDistanceKm === null ? '—' : `${remainingDistanceKm.toLocaleString()} km`}
            </div>
            <div className={cn(
              'pointer-events-auto inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm backdrop-blur',
              liveTrackingEnabled
                ? 'bg-emerald-100/90 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                : 'bg-slate-100/90 text-slate-600 dark:bg-slate-900/80 dark:text-slate-300',
            )}>
              <span>
                {u('tracking.liveTracking', 'Live tracking')}: {liveTrackingEnabled ? u('tracking.active', 'Active') : u('tracking.paused', 'Paused')}
              </span>
              {canControlLiveTracking ? (
                <button
                  type="button"
                  onClick={() => void handleLiveTrackingToggle()}
                  title={liveTrackingEnabled ? u('tracking.pauseTracking', 'Pause tracking') : u('tracking.startTrackingInApp', 'Start tracking in app')}
                  aria-label={liveTrackingEnabled ? u('tracking.pauseTracking', 'Pause tracking') : u('tracking.startTrackingInApp', 'Start tracking in app')}
                  className="flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-white/90 text-current shadow-sm transition-transform hover:scale-110 dark:bg-slate-800"
                >
                  {liveTrackingEnabled ? <Pause className="h-3 w-3 fill-current" /> : <Play className="h-3 w-3 fill-current" />}
                </button>
              ) : role === 'user' && liveTrackingUpdatedAt ? (
                <span className="border-l border-current/20 pl-2 text-[10px] font-semibold opacity-75">
                  {u('tracking.lastUpdated', 'Last updated')}: {new Date(liveTrackingUpdatedAt).toLocaleString(lang === 'bs' ? 'bs-BA' : lang === 'de' ? 'de-DE' : 'en-GB')}
                </span>
              ) : null}
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

      {rightTab === 'tracker' && (
        <div className="absolute inset-0 overflow-hidden">
             <MapContainer ref={trackerMapRef} center={selectedPackage.hasCurrentLocation ? selectedPackage.currentLocation : (trackingRouteEndpoints.pickup || selectedPackage.currentLocation)} zoom={13} className="h-full w-full">
                <TileLayer
                  url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                  subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                  attribution="&copy; Google Maps"
                />
                <FuelStationViewportLoader enabled={mapFilters.fuel} onBoundsChange={loadFuelStations} />
                {routePoints.length >= 2 && (
                  <>
                    <FitTrackingRoute points={routePoints} />
                    <Polyline positions={routePoints} pathOptions={{ color: '#0ea5e9', weight: 5, opacity: 0.92 }} />
                  </>
                )}
                {trackingRouteEndpoints.pickup && (
                  <Marker position={trackingRouteEndpoints.pickup} icon={routeEndpointIcon(selectedPackage.originCountryCode, '#10b981')}>
                    <Popup><strong>{selectedPackage.origin}</strong><br />{u('home.pickupPoint', 'Pickup point')}</Popup>
                  </Marker>
                )}
                {trackingRouteEndpoints.delivery && (
                  <Marker position={trackingRouteEndpoints.delivery} icon={routeEndpointIcon(selectedPackage.destinationCountryCode, '#ef4444')}>
                    <Popup><strong>{selectedPackage.destination}</strong><br />{u('home.deliveryPoint', 'Delivery point')}</Popup>
                  </Marker>
                )}
                {selectedPackage.hasCurrentLocation && (
                  <Marker
                    position={selectedPackage.currentLocation}
                    icon={trackingMarkerIcon(selectedPackage.transportType || 'road', selectedPackage.status)}
                    eventHandlers={{ click: () => {
                      setTrackerCardOpen(true);
                      trackerMapRef.current?.panInside(L.latLng(selectedPackage.currentLocation), {
                        paddingTopLeft: [140, 340],
                        paddingBottomRight: [140, 60],
                      });
                    } }}
                  />
                )}

                {mapFilters.fuel && fuelStations.map((station) => (
                  <CircleMarker
                    key={`${station.source_type}-${station.source_id}`}
                    center={[Number(station.latitude), Number(station.longitude)]}
                    radius={6}
                    pathOptions={{ color: '#0369a1', fillColor: '#06b6d4', fillOpacity: 0.95, weight: 2 }}
                  >
                    <Tooltip direction="top" offset={[0, -5]} opacity={1}>
                      <div className="min-w-36 space-y-1">
                        <p className="text-xs font-black text-slate-900">{station.name || station.brand || station.operator || u('tracking.amenity.fuel', 'Fuel station')}</p>
                        {station.address && <p className="text-[10px] text-slate-500">{station.address}</p>}
                        {station.opening_hours && <p className="text-[10px] text-slate-500">{station.opening_hours}</p>}
                        {station.fuel_types?.length ? <p className="text-[10px] text-slate-500">{station.fuel_types.join(' · ')}</p> : null}
                        {station.hgv && <p className="text-[10px] font-bold text-emerald-600">HGV</p>}
                      </div>
                    </Tooltip>
                  </CircleMarker>
                ))}

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

          {trackerCardOpen && trackerCardPoint && (
            <div
              className="pointer-events-auto absolute z-[1400] -translate-x-1/2 -translate-y-full pb-1.5 after:absolute after:bottom-0 after:left-1/2 after:h-3 after:w-3 after:-translate-x-1/2 after:rotate-45 after:border-b after:border-r after:border-slate-200 after:bg-white dark:after:border-white/10 dark:after:bg-slate-950"
              style={{ left: trackerCardPoint.x, top: trackerCardPoint.y }}
            >
              <TrackingMapCard
                pkg={selectedPackage}
                lang={lang}
                onOpenDetails={() => { setTrackerCardOpen(false); setRightTab('details'); }}
                onClose={() => setTrackerCardOpen(false)}
              />
            </div>
          )}

          {mapFilters.fuel && (
            <a
              href="https://de.fuelo.net/"
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-20 right-3 z-[1000] rounded bg-white/85 px-2 py-1 text-[9px] font-semibold text-slate-600 shadow backdrop-blur hover:text-primary dark:bg-slate-900/85 dark:text-slate-300"
            >
              {fuelStationsLoading ? `${u('tracking.amenity.fuel', 'Fuel')}…` : `Fuelo.net · ${fuelStations.length}`}
            </a>
          )}

          <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[1000] flex justify-start">
            <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-start gap-2 rounded-2xl border border-white/60 bg-white/80 p-2 shadow-xl backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-900/80">
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
                        'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all',
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
          </div>
        </div>
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

      {rightTab === 'documents' && (
        <Card title={u('tracking.attachedDocuments', 'Attached documents')}>
          <CustomsDocumentList loadId={selectedPackage.id} documents={selectedPackage.customsDocuments} lang={lang} />
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
          submitLabel={receiveReviewPending ? (lang === 'bs' ? 'Označi kao primljeno i pošalji' : lang === 'de' ? 'Als empfangen markieren und senden' : 'Mark as received and send') : undefined}
          submittingLabel={receiveReviewPending ? (lang === 'bs' ? 'Slanje i označavanje…' : lang === 'de' ? 'Wird gesendet…' : 'Sending and marking…') : undefined}
          onSubmitted={receiveReviewPending ? async () => {
            setStatusChanging('Received');
            try {
              await api.loads.updateStatus(selectedPackage.id, 'received');
              await refreshPackage();
              onChanged?.();
              setReceiveReviewPending(false);
            } finally {
              setStatusChanging(null);
            }
          } : undefined}
        />
      )}
    </TrackingItemDetails>
    <VehicleReturnModal
      open={carDropOpen}
      loadId={selectedPackage.id}
      vehicleId={selectedPackage.vehicleId}
      vehicleName={selectedPackage.vehicleName}
      lang={lang}
      onClose={() => setCarDropOpen(false)}
      onCompleted={async () => {
        await refreshPackage();
        onChanged?.();
        setCarDropOpen(false);
      }}
    />
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
