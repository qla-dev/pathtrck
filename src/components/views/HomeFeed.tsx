import { Fragment, useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { ArrowDownWideNarrow, ArrowDown, ArrowUp, CalendarArrowDown, CalendarArrowUp, ChevronDown, ChevronLeft, ChevronRight, Filter, Gavel, List, LayoutGrid, Map as MapIcon, Layers, Table, Truck, Warehouse } from 'lucide-react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';

import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import {
  getPlaceCoord,
} from '../../lib/loadGeo';
import { MOCK_LOADS } from '../../mockData';
import { Language, Load, Role } from '../../types';
import { FilterLoads, FilterLoadsProps } from '../load/FilterLoads';
import { LoadDetailsPrebook } from '../load/LoadDetailsPrebook';
import { LoadItem } from '../load/LoadItem';
import { LoadsTable } from '../load/LoadsTable';
import { EmptyState } from '../ui/EmptyState';
import { PageHeader } from '../ui/PageHeader';

type FeedLayoutMode = 'list' | 'grid' | 'map' | 'table';
type MapSource = 'normal' | 'vector' | 'imagery';
export type FeedSortMode = 'price_desc' | 'price_asc' | 'date_desc' | 'date_asc';

const SORT_MODE_KEYS: Record<FeedSortMode, [string, string]> = {
  price_asc: ['legacy.sidebarSort.priceAscending', 'Price ascending'],
  price_desc: ['legacy.sidebarSort.priceDescending', 'Price descending'],
  date_desc: ['legacy.sidebarSort.dateDescending', 'Date descending'],
  date_asc: ['legacy.sidebarSort.dateAscending', 'Date ascending'],
};

const SORT_MODE_ICONS = {
  price_asc: ArrowUp,
  price_desc: ArrowDown,
  date_desc: CalendarArrowDown,
  date_asc: CalendarArrowUp,
} satisfies Record<FeedSortMode, typeof ArrowUp>;

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
    icon: SORT_MODE_ICONS[id],
  }));
  const activeLabel = u(SORT_MODE_KEYS[sortMode][0], SORT_MODE_KEYS[sortMode][1]);

  return (
    <div className={cn('relative', isOpen && 'z-[100]')}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title={`${u('feed.filterBar.sortBy', 'Sort by')} ${activeLabel}`}
        aria-label={`${u('feed.filterBar.sortBy', 'Sort by')} ${activeLabel}`}
        className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 transition-all hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600"
      >
        <ArrowDownWideNarrow className="h-4 w-4" />
        {u('common.sort', 'Sort')}
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-[90]" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 z-[110] mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange?.(option.id);
                  setIsOpen(false);
                }}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition-all',
                  sortMode === option.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                )}
              >
                <option.icon className="h-4 w-4 shrink-0" />
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const FilterSkeleton = () => (
  <div
    aria-label="Loading filters"
    className="animate-pulse space-y-5"
  >
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 lg:h-16 dark:border-slate-800 dark:bg-slate-900">
      <div className="grid h-full items-center gap-3 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-6 rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    </div>

    <div className="flex flex-wrap gap-2 py-1">
      {[72, 96, 84, 108, 76].map((width, index) => (
        <div
          key={index}
          className="flex h-9 items-center rounded-full border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
          style={{ width: width + 24 }}
        >
          <div className="h-3 rounded bg-slate-200 dark:bg-slate-700" style={{ width }} />
        </div>
      ))}
    </div>
  </div>
);

const ResultSkeletons = ({ layout }: { layout: FeedLayoutMode }) => {
  if (layout === 'table') {
    return (
      <div aria-label="Loading loads" className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="h-12 bg-slate-100 dark:bg-slate-800" />
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="grid grid-cols-5 gap-5 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
            {[80, 65, 90, 55, 70].map((width, cell) => (
              <div key={cell} className="h-4 rounded bg-slate-100 dark:bg-slate-800" style={{ width: `${width}%` }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  const isGrid = layout === 'grid';
  return (
    <div
      aria-label="Loading loads"
      className={cn('animate-pulse gap-4', isGrid ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4' : 'flex flex-col')}
    >
      {Array.from({ length: isGrid ? 4 : 5 }, (_, index) => (
        <div key={index} className={cn('rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900', isGrid ? 'min-h-64' : 'min-h-36')}>
          <div className="flex items-center justify-between gap-4">
            <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-8 w-16 rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="mt-5 h-4 w-4/5 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="mt-3 h-4 w-3/5 rounded bg-slate-100 dark:bg-slate-800" />
          <div className="mt-7 flex gap-2">
            <div className="h-7 w-20 rounded-full bg-slate-100 dark:bg-slate-800" />
            <div className="h-7 w-24 rounded-full bg-slate-100 dark:bg-slate-800" />
          </div>
        </div>
      ))}
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
  loading?: boolean;
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
  filterBarLoading?: boolean;
  exchangeMode?: 'transport' | 'storage';
  onExchangeModeChange?: (mode: 'transport' | 'storage') => void;
  storageOnly?: boolean;
  ownerMode?: boolean;
  myBidsOnly?: boolean;
  onMyBidsOnlyChange?: (value: boolean) => void;
  onSortModeChange?: (mode: FeedSortMode) => void;
  onEditLoad?: (load: Load) => void;
  onLoadChanged?: () => void;
  onWorkspaceCreated?: (workspaceId: number, loadId: string) => void;
};

export const HomeFeed = ({
  lang,
  role,
  userId,
  companyIds = [],
  dataMode = 'all',
  loads = MOCK_LOADS,
  loading = false,
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
  filterBarLoading = false,
  exchangeMode = 'transport',
  onExchangeModeChange,
  storageOnly = false,
  ownerMode = false,
  myBidsOnly = false,
  onMyBidsOnlyChange,
  onSortModeChange,
  onEditLoad,
  onLoadChanged,
  onWorkspaceCreated,
}: HomeFeedProps) => {
  const [layout, setLayout] = useState<FeedLayoutMode>('table');
  const [mapSource, setMapSource] = useState<MapSource>('normal');
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(true);
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const bookLoadLabel = u('common.bookLoad', 'Reserve');
  const loadsTitle = ownerMode
    ? u('nav.myOffers', 'My offers')
    : exchangeMode === 'storage'
    ? u('home.loadsTitle.storage', 'Warehouse Exchange')
    : u('home.loadsTitle.transport', 'Freight Exchange');

  /* Filtering and ordering are deliberately performed by GET /loads. The exchange renders the
     server result verbatim so pagination/counts cannot disagree with locally filtered data. */
  const sortedLoads = loads;

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

  const layoutButtons = [
    { id: 'table', icon: Table, title: u('home.layout.table', 'Table') },
    { id: 'list', icon: List, title: u('home.layout.list', 'List') },
    { id: 'grid', icon: LayoutGrid, title: u('home.layout.grid', 'Grid') },
    { id: 'map', icon: MapIcon, title: u('home.layout.map', 'Map') },
  ] satisfies Array<{ id: FeedLayoutMode; icon: typeof List; title: string }>;

  return (
    <div className="w-full min-w-0 space-y-6">
      <PageHeader
        icon={Truck}
        title={loadsTitle}
        subtitle={`${sortedLoads.length} ${u('feed.filterBar.loadsLabel', 'loads')}`}
        actions={<div className="flex flex-wrap items-center justify-end gap-2">
          {!ownerMode && <button
            type="button"
            onClick={() => onMyBidsOnlyChange?.(!myBidsOnly)}
            className={cn(
              'inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border px-3 text-xs font-bold transition-all',
              myBidsOnly
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600'
            )}
          >
            <Gavel className="h-3.5 w-3.5" />
            {u('feed.filterBar.myBids', 'Moje ponude')}
          </button>}
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
          <SortDropdown lang={lang} sortMode={sortMode} onChange={onSortModeChange} />
          {!storageOnly && <div className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-transparent px-1 dark:border-slate-800">
            {([
              { id: 'transport' as const, icon: Truck, label: u('feed.exchange.transport', 'Prevoz') },
              { id: 'storage' as const, icon: Warehouse, label: u('feed.exchange.storage', 'Skladište') },
            ]).map((mode) => (
              <button
                key={mode.id}
                type="button"
                title={mode.label}
                aria-label={mode.label}
                onClick={() => onExchangeModeChange?.(mode.id)}
                className={cn(
                  'flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition-all',
                  exchangeMode === mode.id ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <mode.icon className="h-4 w-4" />
                <span>{mode.label}</span>
              </button>
            ))}
          </div>}
          <div className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-transparent px-1 dark:border-slate-800">
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
        </div>}
      />

      {filterBar && isFilterBarOpen && (
        <div className="relative">
          <div
            aria-hidden={filterBarLoading || undefined}
            className={cn(
              'transition-opacity duration-200 ease-out motion-reduce:transition-none',
              filterBarLoading ? 'pointer-events-none opacity-0' : 'opacity-100',
            )}
          >
            <FilterLoads {...filterBar} />
          </div>
          <div
            aria-hidden="true"
            className={cn(
              'pointer-events-none absolute inset-0 z-10 overflow-hidden transition-opacity duration-200 ease-out motion-reduce:transition-none',
              filterBarLoading ? 'opacity-100' : 'opacity-0',
            )}
          >
            <FilterSkeleton />
          </div>
        </div>
      )}

      {loading ? (
        <ResultSkeletons layout={layout} />
      ) : sortedLoads.length === 0 ? (
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
              ownerMode={ownerMode}
              onOpenDetails={setSelectedLoad}
              viewDetailsLabel={bookLoadLabel}
            />
          ))}
        </div>
      )}

      {!loading && sortedLoads.length > 0 && layout === 'grid' && (
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {sortedLoads.map((load) => (
            <LoadItem
              key={load.id}
              layout="grid"
              load={load}
              lang={lang}
              userId={userId}
              ownerMode={ownerMode}
              onOpenDetails={setSelectedLoad}
              viewDetailsLabel={bookLoadLabel}
            />
          ))}
        </div>
      )}

      {!loading && sortedLoads.length > 0 && layout === 'table' && (
        <LoadsTable lang={lang} loads={sortedLoads} userId={userId} ownerMode={ownerMode} onOpenDetails={setSelectedLoad} />
      )}

      {!loading && sortedLoads.length > 0 && layout === 'map' && (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4 max-h-[78vh] overflow-y-auto pr-1">
            {sortedLoads.map((load) => (
              <LoadItem
                key={load.id}
                layout="map"
                load={load}
                lang={lang}
                userId={userId}
                ownerMode={ownerMode}
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
        onWorkspaceCreated={onWorkspaceCreated}
        onClose={() => setSelectedLoad(null)}
      />
    </div>
  );
};
