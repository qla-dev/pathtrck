import { Fragment, useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { Filter, Plus, Truck, ArrowRight, ChevronRight, List, LayoutGrid, Map as MapIcon, Layers } from 'lucide-react';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { Language, Load } from '../../types';
import { MOCK_LOADS } from '../../mockData';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type FeedLayoutMode = 'list' | 'grid' | 'map';
type MapSource = 'normal' | 'vector' | 'imagery';

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

const LoadsBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
  }, [map, points]);

  return null;
};

export const HomeFeed = ({ lang }: { lang: Language }) => {
  const [layout, setLayout] = useState<FeedLayoutMode>('map');
  const [mapSource, setMapSource] = useState<MapSource>('normal');
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  const loadsMapData = useMemo<LoadMapData[]>(
    () =>
      MOCK_LOADS.map((load) => ({
        load,
        pickupCoord: getPlaceCoord(load.pickup),
        deliveryCoord: getPlaceCoord(load.delivery),
      })),
    []
  );

  const allPoints = useMemo<[number, number][]>(
    () => loadsMapData.flatMap((entry) => [entry.pickupCoord, entry.deliveryCoord]),
    [loadsMapData]
  );

  const mapSourceLabels: Record<MapSource, string> = {
    normal: lang === 'bs' ? 'Normalna' : lang === 'de' ? 'Normal' : 'Normal',
    vector: lang === 'bs' ? 'Vektorska' : lang === 'de' ? 'Vektor' : 'Vector',
    imagery: lang === 'bs' ? 'Satelit' : lang === 'de' ? 'Satellit' : 'Imagery',
  };

  const layoutButtons: Array<{ id: FeedLayoutMode; icon: typeof List; title: string }> = [
    { id: 'list', icon: List, title: lang === 'bs' ? 'Lista' : lang === 'de' ? 'Liste' : 'List' },
    { id: 'grid', icon: LayoutGrid, title: lang === 'bs' ? 'Mreza' : lang === 'de' ? 'Raster' : 'Grid' },
    { id: 'map', icon: MapIcon, title: lang === 'bs' ? 'Mapa' : lang === 'de' ? 'Karte' : 'Map' },
  ];

  const renderLoadCard = (load: Load) => (
    <Card key={load.id} className="hover:border-primary/50 transition-all cursor-pointer group">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex gap-4">
          <div className="w-12 h-12 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <Truck className="text-slate-500 group-hover:text-primary transition-colors" />
          </div>
          <div>
            <h3 className="font-bold text-lg dark:text-white">{load.title}</h3>
            <p className="text-sm text-slate-500">{load.author} • {load.date}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4 shrink-0 whitespace-nowrap">
          <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold dark:text-slate-300 whitespace-nowrap">
            {load.weight}
          </div>
          <div className="text-xl font-black text-primary whitespace-nowrap text-right">
            {load.price}
          </div>
        </div>
      </div>
      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center gap-8">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-sm font-medium dark:text-slate-300">{load.pickup}</span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-sm font-medium dark:text-slate-300">{load.delivery}</span>
        </div>
        <div className="ml-auto">
          <Button size="sm" variant="ghost">{u('common.viewDetails', 'View Details')} <ChevronRight className="w-4 h-4 ml-1" /></Button>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold dark:text-white mr-2">{u('home.availableLoads', 'Available Loads')}</h1>
          <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" /> {u('common.filter', 'Filter')}</Button>
          <Button size="sm"><Plus className="w-4 h-4 mr-2" /> {u('common.postLoad', 'Post Load')}</Button>
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
          {MOCK_LOADS.map(renderLoadCard)}
        </div>
      )}

      {layout === 'grid' && (
        <div className="grid md:grid-cols-2 gap-4">
          {MOCK_LOADS.map(renderLoadCard)}
        </div>
      )}

      {layout === 'map' && (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4 max-h-[72vh] overflow-y-auto pr-1">
            {MOCK_LOADS.map(renderLoadCard)}
          </div>
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="h-[72vh] relative">
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
                    <CircleMarker center={entry.pickupCoord} radius={7} pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.95 }}>
                      <Popup>
                        <p className="font-bold">{entry.load.title}</p>
                        <p className="text-xs text-slate-500">{entry.load.pickup}</p>
                        <p className="text-xs text-emerald-600 font-semibold mt-1">
                          {lang === 'bs' ? 'Polazna tacka' : lang === 'de' ? 'Startpunkt' : 'Pickup Point'}
                        </p>
                      </Popup>
                    </CircleMarker>
                    <CircleMarker center={entry.deliveryCoord} radius={7} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.95 }}>
                      <Popup>
                        <p className="font-bold">{entry.load.title}</p>
                        <p className="text-xs text-slate-500">{entry.load.delivery}</p>
                        <p className="text-xs text-blue-600 font-semibold mt-1">
                          {lang === 'bs' ? 'Odredisna tacka' : lang === 'de' ? 'Zielpunkt' : 'Delivery Point'}
                        </p>
                      </Popup>
                    </CircleMarker>
                  </Fragment>
                ))}
              </MapContainer>

              <div className="absolute top-4 right-4 z-[1000] bg-white/95 dark:bg-slate-900/95 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-2">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {lang === 'bs' ? 'Izvor mape' : lang === 'de' ? 'Kartenstil' : 'Map Source'}
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
    </div>
  );
};
