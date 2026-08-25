import { Fragment, useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { ArrowDownWideNarrow, ChevronDown, ChevronLeft, ChevronRight, Filter, Gavel, List, LayoutGrid, Map as MapIcon, Layers, Table } from 'lucide-react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';

import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { getBidState } from '../../lib/offerBid';
import {
  estimateLoadTransitDays,
  getPlaceCoord,
  parseLoadDateValue,
  parseLoadPriceValue,
  parseLoadWeightValue,
} from '../../lib/loadGeo';
import { MOCK_LOADS } from '../../mockData';
import { Language, Load, Role } from '../../types';
import { FilterLoads, FilterLoadsProps } from '../load/FilterLoads';
import { LoadDetailsPrebook } from '../load/LoadDetailsPrebook';
import { LoadItem } from '../load/LoadItem';
import { LoadsTable } from '../load/LoadsTable';
import { EmptyState } from '../ui/EmptyState';

type FeedLayoutMode = 'list' | 'grid' | 'map' | 'table';
type MapSource = 'normal' | 'vector' | 'imagery';
export type FeedSortMode = 'price_desc' | 'price_asc' | 'date_desc' | 'date_asc';

const SORT_MODE_KEYS: Record<FeedSortMode, [string, string]> = {
  price_asc: ['legacy.sidebarSort.priceAscending', 'Price ascending'],
  price_desc: ['legacy.sidebarSort.priceDescending', 'Price descending'],
  date_desc: ['legacy.sidebarSort.dateDescending', 'Date descending'],
  date_asc: ['legacy.sidebarSort.dateAscending', 'Date ascending'],
};

const SortDropdown = ({
  lang,
  sortMode,
  onChange,
}: {
  lang: Language;
  sortMode: FeedSortMode;
  onChange?: (mode: FeedSortMode) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const options = (Object.keys(SORT_MODE_KEYS) as FeedSortMode[]).map((id) => ({
    id,
    label: u(SORT_MODE_KEYS[id][0], SORT_MODE_KEYS[id][1]),
  }));
  const activeLabel = u(SORT_MODE_KEYS[sortMode][0], SORT_MODE_KEYS[sortMode][1]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 transition-all hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
      >
        <ArrowDownWideNarrow className="h-3.5 w-3.5" />
        {u('feed.filterBar.sortBy', 'Sort by')} {activeLabel}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange?.(option.id);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full cursor-pointer rounded-lg px-3 py-2 text-left text-xs font-semibold transition-all',
                  sortMode === option.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

type LoadMapData = {
  load: Load;
  pickupCoord: [number, number];
  deliveryCoord: [number, number];
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
  role?: Role;
  userId?: number;
  companyIds?: number[];
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
  isLengthFilterActive?: boolean;
  minWidthFilter?: number;
  maxWidthFilter?: number;
  isWidthFilterActive?: boolean;
  minHeightFilter?: number;
  maxHeightFilter?: number;
  isHeightFilterActive?: boolean;
  minTemperatureFilter?: number;
  maxTemperatureFilter?: number;
  minCargoValueFilter?: number;
  maxCargoValueFilter?: number;
  isCargoValueFilterActive?: boolean;
  minTransitDaysFilter?: number;
  maxTransitDaysFilter?: number;
  selectedGoodsTypes?: string[];
  selectedPriceTerms?: string[];
  selectedPaymentTerms?: string[];
  selectedAdrClasses?: string[];
  selectedSensitivity?: string[];
  selectedUrgency?: string[];
  selectedLoadingMethods?: string[];
  filterBar?: FilterLoadsProps;
  onSortModeChange?: (mode: FeedSortMode) => void;
  onEditLoad?: (load: Load) => void;
  onLoadChanged?: () => void;
};

export const HomeFeed = ({
  lang,
  role,
  userId,
  companyIds = [],
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
  isLengthFilterActive = false,
  minWidthFilter = Number.NEGATIVE_INFINITY,
  maxWidthFilter = Number.POSITIVE_INFINITY,
  isWidthFilterActive = false,
  minHeightFilter = Number.NEGATIVE_INFINITY,
  maxHeightFilter = Number.POSITIVE_INFINITY,
  isHeightFilterActive = false,
  minTemperatureFilter = Number.NEGATIVE_INFINITY,
  maxTemperatureFilter = Number.POSITIVE_INFINITY,
  minCargoValueFilter = Number.NEGATIVE_INFINITY,
  maxCargoValueFilter = Number.POSITIVE_INFINITY,
  isCargoValueFilterActive = false,
  minTransitDaysFilter = Number.NEGATIVE_INFINITY,
  maxTransitDaysFilter = Number.POSITIVE_INFINITY,
  selectedGoodsTypes = [],
  selectedPriceTerms = [],
  selectedPaymentTerms = [],
  selectedAdrClasses = [],
  selectedSensitivity = [],
  selectedUrgency = [],
  selectedLoadingMethods = [],
  filterBar,
  onSortModeChange,
  onEditLoad,
  onLoadChanged,
}: HomeFeedProps) => {
  const [layout, setLayout] = useState<FeedLayoutMode>('table');
  const [mapSource, setMapSource] = useState<MapSource>('normal');
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(true);
  const [myBidsOnly, setMyBidsOnly] = useState(false);
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const bookLoadLabel = u('common.bookLoad', 'Reserve');
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
      if (load.status !== 'Posted') return false;

      const pickup = load.pickup.toLowerCase();
      const delivery = load.delivery.toLowerCase();
      const priceValue = parseLoadPriceValue(load.price);
      const weightValue = parseLoadWeightValue(load.weight);
      const lengthValue = load.length;
      const widthValue = load.width;
      const heightValue = load.height;
      const temperatureMinValue = load.temperatureMin ?? 15;
      const temperatureMaxValue = load.temperatureMax ?? 25;
      const cargoValue = load.cargoValue;
      const transitDays = load.transitDays ?? estimateLoadTransitDays(load.pickup, load.delivery);
      const startMatch = !startFilter || pickup.includes(startFilter);
      const endMatch = !endFilter || delivery.includes(endFilter);
      const priceMatch = priceValue >= minPriceFilter && priceValue <= maxPriceFilter;
      const weightMatch = weightValue >= minWeightFilter && weightValue <= maxWeightFilter;
      const lengthMatch = lengthValue === undefined
        ? !isLengthFilterActive
        : lengthValue >= minLengthFilter && lengthValue <= maxLengthFilter;
      const widthMatch = widthValue === undefined
        ? !isWidthFilterActive
        : widthValue >= minWidthFilter && widthValue <= maxWidthFilter;
      const heightMatch = heightValue === undefined
        ? !isHeightFilterActive
        : heightValue >= minHeightFilter && heightValue <= maxHeightFilter;
      const temperatureMatch = temperatureMaxValue >= minTemperatureFilter && temperatureMinValue <= maxTemperatureFilter;
      const cargoValueMatch = cargoValue === undefined
        ? !isCargoValueFilterActive
        : cargoValue >= minCargoValueFilter && cargoValue <= maxCargoValueFilter;
      const transitMatch = transitDays >= minTransitDaysFilter && transitDays <= maxTransitDaysFilter;
      const goodsMatch = !selectedGoodsTypes.length || selectedGoodsTypes.includes(load.goodsType);
      const priceTermsMatch = !selectedPriceTerms.length || selectedPriceTerms.includes(load.isNegotiable ? 'negotiable' : 'fixed');
      const paymentMatch = !selectedPaymentTerms.length || selectedPaymentTerms.includes(load.paymentTerms);
      const adrMatch = !selectedAdrClasses.length || selectedAdrClasses.includes(load.adrClass || 'None');
      const sensitivityMatch =
        !selectedSensitivity.length || (selectedSensitivity.includes('fragile') ? Boolean(load.isFragile) : true);
      const urgencyMatch = !selectedUrgency.length || selectedUrgency.includes(load.urgency || 'Standard');
      const loadingMethodMatch =
        !selectedLoadingMethods.length ||
        selectedLoadingMethods.some((method) => (load.loadingMethods || []).includes(method as 'Forklift' | 'Crane' | 'Manual'));
      const myBidsMatch = !myBidsOnly || Boolean(getBidState(load.offers, userId, load.budget).myOffer);
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
        priceTermsMatch &&
        paymentMatch &&
        adrMatch &&
        sensitivityMatch &&
        urgencyMatch &&
        loadingMethodMatch &&
        myBidsMatch
      );
    });
  }, [
    loads,
    startLocation,
    endLocation,
    myBidsOnly,
    userId,
    minPriceFilter,
    maxPriceFilter,
    minWeightFilter,
    maxWeightFilter,
    minLengthFilter,
    maxLengthFilter,
    isLengthFilterActive,
    minWidthFilter,
    maxWidthFilter,
    isWidthFilterActive,
    minHeightFilter,
    maxHeightFilter,
    isHeightFilterActive,
    minTemperatureFilter,
    maxTemperatureFilter,
    minCargoValueFilter,
    maxCargoValueFilter,
    isCargoValueFilterActive,
    minTransitDaysFilter,
    maxTransitDaysFilter,
    selectedGoodsTypes,
    selectedPriceTerms,
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
    { id: 'table', icon: Table, title: u('home.layout.table', 'Table') },
    { id: 'list', icon: List, title: u('home.layout.list', 'List') },
    { id: 'grid', icon: LayoutGrid, title: u('home.layout.grid', 'Grid') },
    { id: 'map', icon: MapIcon, title: u('home.layout.map', 'Map') },
  ];

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-2xl font-bold dark:text-white">{loadsTitle}</h1>
          <p className="text-sm font-semibold text-slate-500">
            {sortedLoads.length} {u('feed.filterBar.loadsLabel', 'loads')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {filterBar && (
            <button
              type="button"
              onClick={() => setIsFilterBarOpen((prev) => !prev)}
              className={cn(
                'inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border px-3 text-xs font-bold transition-all',
                isFilterBarOpen
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600'
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              {u('common.filter', 'Filter')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setMyBidsOnly((prev) => !prev)}
            className={cn(
              'inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border px-3 text-xs font-bold transition-all',
              myBidsOnly
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600'
            )}
          >
            <Gavel className="h-3.5 w-3.5" />
            {u('feed.filterBar.myBids', 'Moje ponude')}
          </button>
          <SortDropdown lang={lang} sortMode={sortMode} onChange={onSortModeChange} />
          <div className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-1">
            {layoutButtons.map((button) => (
              <button
                key={button.id}
                onClick={() => setLayout(button.id)}
                title={button.title}
                aria-label={button.title}
                className={cn(
                  'h-7 w-7 rounded-lg flex items-center justify-center transition-all cursor-pointer',
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
      </div>

      {filterBar && isFilterBarOpen && <FilterLoads {...filterBar} />}

      {sortedLoads.length === 0 ? (
        <EmptyState
          title={u('home.empty.title', 'No loads found')}
          description={
            loads.length === 0
              ? u('home.empty.noLoads', 'There are no available loads in the freight exchange yet.')
              : u('home.empty.noMatches', 'No loads match your current filters. Try adjusting your search criteria.')
          }
        />
      ) : layout === 'list' && (
        <div className="space-y-4">
          {sortedLoads.map((load) => (
            <LoadItem
              key={load.id}
              layout="list"
              load={load}
              lang={lang}
              userId={userId}
              onOpenDetails={setSelectedLoad}
              viewDetailsLabel={bookLoadLabel}
            />
          ))}
        </div>
      )}

      {sortedLoads.length > 0 && layout === 'grid' && (
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {sortedLoads.map((load) => (
            <LoadItem
              key={load.id}
              layout="grid"
              load={load}
              lang={lang}
              userId={userId}
              onOpenDetails={setSelectedLoad}
              viewDetailsLabel={bookLoadLabel}
            />
          ))}
        </div>
      )}

      {sortedLoads.length > 0 && layout === 'table' && (
        <LoadsTable lang={lang} loads={sortedLoads} userId={userId} onOpenDetails={setSelectedLoad} />
      )}

      {sortedLoads.length > 0 && layout === 'map' && (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4 max-h-[78vh] overflow-y-auto pr-1">
            {sortedLoads.map((load) => (
              <LoadItem
                key={load.id}
                layout="map"
                load={load}
                lang={lang}
                userId={userId}
                onOpenDetails={setSelectedLoad}
                viewDetailsLabel={bookLoadLabel}
              />
            ))}
          </div>
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
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

      <LoadDetailsPrebook
        open={Boolean(selectedLoad)}
        load={selectedLoad}
        lang={lang}
        role={role}
        userId={userId}
        companyIds={companyIds}
        onEdit={onEditLoad}
        onChanged={onLoadChanged}
        onClose={() => setSelectedLoad(null)}
      />
    </div>
  );
};
