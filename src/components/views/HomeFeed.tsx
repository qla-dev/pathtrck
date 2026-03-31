import { Fragment, useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { ArrowDownWideNarrow, Filter, List, LayoutGrid, Map as MapIcon, Layers } from 'lucide-react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';

import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { MOCK_LOADS } from '../../mockData';
import { Language, Load } from '../../types';
import { LoadDetails } from '../load/LoadDetails';
import { LoadItem } from '../load/LoadItem';
import { Button } from '../ui/Button';

type FeedLayoutMode = 'list' | 'grid' | 'map';
type MapSource = 'normal' | 'vector' | 'imagery';
type FeedSortMode = 'price_desc' | 'price_asc' | 'date_desc' | 'date_asc';

type LoadMapData = {
  load: Load;
  pickupCoord: [number, number];
  deliveryCoord: [number, number];
};

const CITY_COORDINATES: Record<string, [number, number]> = {
  'Vienna, AT': [48.2082, 16.3738],
  'Prague, CZ': [50.0755, 14.4378],
  'Zagreb, HR': [45.815, 15.9819],
  'Berlin, DE': [52.52, 13.405],
  'Sarajevo, BA': [43.8563, 18.4131],
  'Banja Luka, BA': [44.7722, 17.191],
  'Shanghai, CN': [31.2304, 121.4737],
  'Odesa, UA': [46.4825, 30.7233],
  'Ningbo, CN': [29.8683, 121.544],
  'Hamburg, DE': [53.5511, 9.9937],
  'Shenzhen, CN': [22.5431, 114.0579],
  'Rotterdam, NL': [51.9244, 4.4777],
  'Qingdao, CN': [36.0671, 120.3826],
  'Gdansk, PL': [54.352, 18.6466],
};

const MAP_SOURCE_CONFIG: Record<MapSource, { url: string; attribution: string; subdomains?: string[] }> = {
  normal: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    subdomains: ['a', 'b', 'c'],
  },
  vector: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: ['a', 'b', 'c', 'd'],
  },
  imagery: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
  },
};

const getPlaceCoord = (place: string): [number, number] => {
  if (CITY_COORDINATES[place]) return CITY_COORDINATES[place];
  const city = place.split(',')[0]?.trim() || '';
  const match = Object.entries(CITY_COORDINATES).find(([label]) => label.startsWith(city));
  return match ? match[1] : [48.1351, 11.582];
};

const parseLoadPriceValue = (price: string) => {
  const digits = price.replace(/[^0-9]/g, '');
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseLoadWeightValue = (weight: string) => {
  const digits = weight.replace(/[^0-9]/g, '');
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseLoadDateValue = (date: string) => {
  const parsed = Date.parse(date);
  return Number.isFinite(parsed) ? parsed : 0;
};

const estimateLoadTransitDays = (pickup: string, delivery: string) => {
  const [lat1, lon1] = getPlaceCoord(pickup);
  const [lat2, lon2] = getPlaceCoord(delivery);
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distanceKm = 6371 * c;
  return Math.max(1, Math.ceil(distanceKm / 700));
};

const LoadsBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
  }, [map, points]);

  return null;
};

type HomeFeedProps = {
  lang: Language;
  dataMode?: 'all' | 'organic' | 'global';
  loads?: Load[];
  sortMode?: FeedSortMode;
  startLocation?: string;
  endLocation?: string;
  minPriceFilter?: number;
  maxPriceFilter?: number;
  minWeightFilter?: number;
  maxWeightFilter?: number;
  minLengthFilter?: number;
  maxLengthFilter?: number;
  minWidthFilter?: number;
  maxWidthFilter?: number;
  minHeightFilter?: number;
  maxHeightFilter?: number;
  minTemperatureFilter?: number;
  maxTemperatureFilter?: number;
  minCargoValueFilter?: number;
  maxCargoValueFilter?: number;
  minTransitDaysFilter?: number;
  maxTransitDaysFilter?: number;
  selectedGoodsTypes?: string[];
  selectedPaymentTerms?: string[];
  selectedAdrClasses?: string[];
  selectedSensitivity?: string[];
  selectedUrgency?: string[];
  selectedLoadingMethods?: string[];
  isFilterSidebarOpen?: boolean;
  isSortSidebarOpen?: boolean;
  onToggleFilterSidebar?: () => void;
  onToggleSortSidebar?: () => void;
};

export const HomeFeed = ({
  lang,
  dataMode = 'all',
  loads = MOCK_LOADS,
  sortMode = 'price_asc',
  startLocation = '',
  endLocation = '',
  minPriceFilter = Number.NEGATIVE_INFINITY,
  maxPriceFilter = Number.POSITIVE_INFINITY,
  minWeightFilter = Number.NEGATIVE_INFINITY,
  maxWeightFilter = Number.POSITIVE_INFINITY,
  minLengthFilter = Number.NEGATIVE_INFINITY,
  maxLengthFilter = Number.POSITIVE_INFINITY,
  minWidthFilter = Number.NEGATIVE_INFINITY,
  maxWidthFilter = Number.POSITIVE_INFINITY,
  minHeightFilter = Number.NEGATIVE_INFINITY,
  maxHeightFilter = Number.POSITIVE_INFINITY,
  minTemperatureFilter = Number.NEGATIVE_INFINITY,
  maxTemperatureFilter = Number.POSITIVE_INFINITY,
  minCargoValueFilter = Number.NEGATIVE_INFINITY,
  maxCargoValueFilter = Number.POSITIVE_INFINITY,
  minTransitDaysFilter = Number.NEGATIVE_INFINITY,
  maxTransitDaysFilter = Number.POSITIVE_INFINITY,
  selectedGoodsTypes = [],
  selectedPaymentTerms = [],
  selectedAdrClasses = [],
  selectedSensitivity = [],
  selectedUrgency = [],
  selectedLoadingMethods = [],
  isFilterSidebarOpen = false,
  isSortSidebarOpen = false,
  onToggleFilterSidebar,
  onToggleSortSidebar,
}: HomeFeedProps) => {
  const [layout, setLayout] = useState<FeedLayoutMode>('map');
  const [mapSource, setMapSource] = useState<MapSource>('normal');
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const bookLoadLabel = u('common.bookLoad', 'Book Load');
  const loadsTitle =
    dataMode === 'all'
      ? u('home.loadsTitle.all', 'All Organic and Global Loads')
      : dataMode === 'organic'
        ? u('home.loadsTitle.organic', 'All Organic Available Loads')
        : u('home.loadsTitle.global', 'All Global Available Loads');

  const filteredLoads = useMemo(() => {
    const startFilter = startLocation.trim().toLowerCase();
    const endFilter = endLocation.trim().toLowerCase();

    return loads.filter((load) => {
      const pickup = load.pickup.toLowerCase();
      const delivery = load.delivery.toLowerCase();
      const priceValue = parseLoadPriceValue(load.price);
      const weightValue = parseLoadWeightValue(load.weight);
      const lengthValue = load.length ?? 0;
      const widthValue = load.width ?? 0;
      const heightValue = load.height ?? 0;
      const temperatureMinValue = load.temperatureMin ?? 15;
      const temperatureMaxValue = load.temperatureMax ?? 25;
      const cargoValue = load.cargoValue ?? 0;
      const transitDays = estimateLoadTransitDays(load.pickup, load.delivery);
      const startMatch = !startFilter || pickup.includes(startFilter);
      const endMatch = !endFilter || delivery.includes(endFilter);
      const priceMatch = priceValue >= minPriceFilter && priceValue <= maxPriceFilter;
      const weightMatch = weightValue >= minWeightFilter && weightValue <= maxWeightFilter;
      const lengthMatch = lengthValue >= minLengthFilter && lengthValue <= maxLengthFilter;
      const widthMatch = widthValue >= minWidthFilter && widthValue <= maxWidthFilter;
      const heightMatch = heightValue >= minHeightFilter && heightValue <= maxHeightFilter;
      const temperatureMatch = temperatureMaxValue >= minTemperatureFilter && temperatureMinValue <= maxTemperatureFilter;
      const cargoValueMatch = cargoValue >= minCargoValueFilter && cargoValue <= maxCargoValueFilter;
      const transitMatch = transitDays >= minTransitDaysFilter && transitDays <= maxTransitDaysFilter;
      const goodsMatch = !selectedGoodsTypes.length || selectedGoodsTypes.includes(load.goodsType);
      const paymentMatch = !selectedPaymentTerms.length || selectedPaymentTerms.includes(load.paymentTerms);
      const adrMatch = !selectedAdrClasses.length || selectedAdrClasses.includes(load.adrClass || 'None');
      const sensitivityMatch =
        !selectedSensitivity.length || (selectedSensitivity.includes('fragile') ? Boolean(load.isFragile) : true);
      const urgencyMatch = !selectedUrgency.length || selectedUrgency.includes(load.urgency || 'Standard');
      const loadingMethodMatch =
        !selectedLoadingMethods.length ||
        selectedLoadingMethods.some((method) => (load.loadingMethods || []).includes(method as 'Forklift' | 'Crane' | 'Manual'));
      return (
        startMatch &&
        endMatch &&
        priceMatch &&
        weightMatch &&
        lengthMatch &&
        widthMatch &&
        heightMatch &&
        temperatureMatch &&
        cargoValueMatch &&
        transitMatch &&
        goodsMatch &&
        paymentMatch &&
        adrMatch &&
        sensitivityMatch &&
        urgencyMatch &&
        loadingMethodMatch
      );
    });
  }, [
    loads,
    startLocation,
    endLocation,
    minPriceFilter,
    maxPriceFilter,
    minWeightFilter,
    maxWeightFilter,
    minLengthFilter,
    maxLengthFilter,
    minWidthFilter,
    maxWidthFilter,
    minHeightFilter,
    maxHeightFilter,
    minTemperatureFilter,
    maxTemperatureFilter,
    minCargoValueFilter,
    maxCargoValueFilter,
    minTransitDaysFilter,
    maxTransitDaysFilter,
    selectedGoodsTypes,
    selectedPaymentTerms,
    selectedAdrClasses,
    selectedSensitivity,
    selectedUrgency,
    selectedLoadingMethods,
  ]);

  const sortedLoads = useMemo(() => {
    const items = [...filteredLoads];
    if (sortMode === 'price_desc') {
      items.sort((a, b) => parseLoadPriceValue(b.price) - parseLoadPriceValue(a.price));
      return items;
    }
    if (sortMode === 'price_asc') {
      items.sort((a, b) => parseLoadPriceValue(a.price) - parseLoadPriceValue(b.price));
      return items;
    }
    if (sortMode === 'date_desc') {
      items.sort((a, b) => parseLoadDateValue(b.date) - parseLoadDateValue(a.date));
      return items;
    }
    items.sort((a, b) => parseLoadDateValue(a.date) - parseLoadDateValue(b.date));
    return items;
  }, [filteredLoads, sortMode]);

  const loadsMapData = useMemo<LoadMapData[]>(
    () =>
      sortedLoads.map((load) => ({
        load,
        pickupCoord: getPlaceCoord(load.pickup),
        deliveryCoord: getPlaceCoord(load.delivery),
      })),
    [sortedLoads]
  );

  const allPoints = useMemo<[number, number][]>(
    () => loadsMapData.flatMap((entry) => [entry.pickupCoord, entry.deliveryCoord]),
    [loadsMapData]
  );

  const mapSourceLabels: Record<MapSource, string> = {
    normal: u('home.mapSource.normal', 'Normal'),
    vector: u('home.mapSource.vector', 'Vector'),
    imagery: u('home.mapSource.imagery', 'Imagery'),
  };

  const layoutButtons: Array<{ id: FeedLayoutMode; icon: typeof List; title: string }> = [
    { id: 'list', icon: List, title: u('home.layout.list', 'List') },
    { id: 'grid', icon: LayoutGrid, title: u('home.layout.grid', 'Grid') },
    { id: 'map', icon: MapIcon, title: u('home.layout.map', 'Map') },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold dark:text-white mr-2">{loadsTitle}</h1>
          <Button
            variant={isFilterSidebarOpen ? 'primary' : 'outline'}
            size="sm"
            onClick={onToggleFilterSidebar}
          >
            <Filter className="w-4 h-4 mr-2" /> {u('common.filter', 'Filter')}
          </Button>
          <Button
            variant={isSortSidebarOpen ? 'primary' : 'outline'}
            size="sm"
            onClick={onToggleSortSidebar}
          >
            <ArrowDownWideNarrow className="w-4 h-4 mr-2" /> {u('common.sort', 'Sort')}
          </Button>
        </div>
        <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 self-start md:self-auto">
          {layoutButtons.map((button) => (
            <button
              key={button.id}
              onClick={() => setLayout(button.id)}
              title={button.title}
              aria-label={button.title}
              className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer',
                layout === button.id
                  ? 'bg-primary text-white'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <button.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      </div>

      {layout === 'list' && (
        <div className="space-y-4">
          {sortedLoads.map((load) => (
            <LoadItem
              key={load.id}
              layout="list"
              load={load}
              lang={lang}
              onOpenDetails={setSelectedLoad}
              viewDetailsLabel={bookLoadLabel}
            />
          ))}
        </div>
      )}

      {layout === 'grid' && (
        <div className="grid md:grid-cols-2 gap-4">
          {sortedLoads.map((load) => (
            <LoadItem
              key={load.id}
              layout="grid"
              load={load}
              lang={lang}
              onOpenDetails={setSelectedLoad}
              viewDetailsLabel={bookLoadLabel}
            />
          ))}
        </div>
      )}

      {layout === 'map' && (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4 max-h-[78vh] overflow-y-auto pr-1">
            {sortedLoads.map((load) => (
              <LoadItem
                key={load.id}
                layout="map"
                load={load}
                lang={lang}
                onOpenDetails={setSelectedLoad}
                viewDetailsLabel={bookLoadLabel}
              />
            ))}
          </div>
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="h-[78vh] relative">
              <MapContainer key={`loads-map-${layout}`} center={[48.5, 14.8]} zoom={5} className="h-full w-full">
                <TileLayer
                  url={MAP_SOURCE_CONFIG[mapSource].url}
                  attribution={MAP_SOURCE_CONFIG[mapSource].attribution}
                  subdomains={MAP_SOURCE_CONFIG[mapSource].subdomains ?? ['a', 'b', 'c']}
                />
                <LoadsBounds points={allPoints} />

                {loadsMapData.map((entry) => (
                  <Fragment key={entry.load.id}>
                    <Polyline
                      positions={[entry.pickupCoord, entry.deliveryCoord]}
                      color="#00AEEF"
                      weight={3}
                      opacity={0.8}
                    />
                    <CircleMarker
                      center={entry.pickupCoord}
                      radius={7}
                      pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.95 }}
                    >
                      <Popup>
                        <p className="font-bold">{entry.load.title}</p>
                        <p className="text-xs text-slate-500">{entry.load.pickup}</p>
                        <p className="text-xs text-emerald-600 font-semibold mt-1">
                          {u('home.pickupPoint', 'Pickup Point')}
                        </p>
                      </Popup>
                    </CircleMarker>
                    <CircleMarker
                      center={entry.deliveryCoord}
                      radius={7}
                      pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.95 }}
                    >
                      <Popup>
                        <p className="font-bold">{entry.load.title}</p>
                        <p className="text-xs text-slate-500">{entry.load.delivery}</p>
                        <p className="text-xs text-blue-600 font-semibold mt-1">
                          {u('home.deliveryPoint', 'Delivery Point')}
                        </p>
                      </Popup>
                    </CircleMarker>
                  </Fragment>
                ))}
              </MapContainer>

              <div className="absolute top-4 right-4 z-20 bg-white/95 dark:bg-slate-900/95 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-2">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {u('home.mapSource.title', 'Map Source')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {(['normal', 'vector', 'imagery'] as MapSource[]).map((source) => (
                    <button
                      key={source}
                      onClick={() => setMapSource(source)}
                      className={cn(
                        'px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer',
                        mapSource === source
                          ? 'bg-primary text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      )}
                    >
                      {mapSourceLabels[source]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <LoadDetails
        open={Boolean(selectedLoad)}
        load={selectedLoad}
        lang={lang}
        onClose={() => setSelectedLoad(null)}
      />
    </div>
  );
};
