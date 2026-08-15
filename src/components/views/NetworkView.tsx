import { Globe, Truck, Map as MapIcon, Clock } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, PieChart, Pie } from 'recharts';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { api } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';

export const NetworkView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const companies = useApiList(api.companies.list, { per_page: 100 });
  const vehicles = useApiList(api.vehicles.list, { per_page: 100 });
  const routes = useApiList(api.routes.list, { per_page: 100 });
  const countryCounts = Object.entries(companies.items.reduce<Record<string, number>>((result, company) => { const key = String(company.country_code || '—'); result[key] = (result[key] || 0) + 1; return result; }, {}));
  const avgDeliveryMinutes = routes.items.length ? routes.items.reduce((sum, route) => sum + Number(route.duration_minutes || 0), 0) / routes.items.length : 0;
  const vehicleMarkers = vehicles.items.flatMap((vehicle) => { const locations = Array.isArray(vehicle.locations) ? vehicle.locations as Array<Record<string, unknown>> : []; const location = locations[locations.length - 1]; return location ? [{ pos: [Number(location.latitude), Number(location.longitude)] as [number, number], name: String(vehicle.registration_number || `Vehicle ${vehicle.id}`) }] : []; });
  const utilization = [
    { name: u('Active', 'Active'), value: vehicles.items.filter((item) => ['active', 'available'].includes(String(item.status).toLowerCase())).length, fill: '#00AEEF' },
    { name: u('Maintenance', 'Maintenance'), value: vehicles.items.filter((item) => String(item.status).toLowerCase() === 'maintenance').length, fill: '#f59e0b' },
    { name: u('Idle', 'Idle'), value: vehicles.items.filter((item) => ['idle', 'unavailable'].includes(String(item.status).toLowerCase())).length, fill: '#ef4444' },
  ];
  const stats = [
    { label: u('Active Hubs', 'Companies'), value: String(companies.total), icon: Globe, color: 'text-blue-500' },
    { label: u('Fleet Capacity', 'Fleet Assets'), value: String(vehicles.total), icon: Truck, color: 'text-emerald-500' },
    { label: u('Global Reach', 'Countries'), icon: MapIcon, value: String(countryCounts.length), color: 'text-amber-500' },
    { label: u('Avg Delivery', 'Avg Delivery'), value: `${Math.round(avgDeliveryMinutes / 60)} h`, icon: Clock, color: 'text-primary' }
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-black dark:text-white">{u('network.title', 'Global Network')}</h1>
          <p className="text-slate-500">{u('network.subtitle', 'Real-time overview of our logistics infrastructure')}</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" size="sm">{u('common.downloadReport', 'Download Report')}</Button>
          <Button size="sm">{u('common.manageHubs', 'Manage Hubs')}</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-4">
              <div className={cn("p-3 rounded-2xl bg-slate-50 dark:bg-slate-800", s.color)}>
                <s.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">{s.label}</p>
                <p className="text-2xl font-black dark:text-white">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden" title={u('network.liveFleetDistribution', 'Live Fleet Distribution')}>
          <div className="h-[500px] w-full mt-4 relative">
            <MapContainer center={[20, 0]} zoom={2} className="h-full w-full">
              <TileLayer 
                url="https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
                attribution="&copy; Google Maps"
              />
              {vehicleMarkers.map((hub, i) => (
                <Marker key={i} position={hub.pos as [number, number]}>
                  <Popup>{hub.name}</Popup>
                </Marker>
              ))}
            </MapContainer>
            <div className="absolute top-4 right-4 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur p-4 rounded-2xl shadow-xl border border-white/20">
              <p className="text-xs font-bold uppercase tracking-wider mb-2">{u('network.liveStatus', 'Live Status')}</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 min-w-2 min-h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-medium">{u('network.operational', 'All systems operational')}</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title={u('Regional Performance', 'Regional Performance')}>
            <div className="h-[250px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={countryCounts.map(([name, val]) => ({ name, val }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <Tooltip />
                  <Bar dataKey="val" fill="#00AEEF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title={u('Fleet Utilization', 'Fleet Utilization')}>
             <div className="h-[200px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={utilization}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
             </div>
             <div className="flex justify-center gap-4 text-xs font-bold uppercase">
               <div className="flex items-center gap-1"><div className="w-2 h-2 min-w-2 min-h-2 rounded-full bg-primary" /> {u('Active', 'Active')}</div>
               <div className="flex items-center gap-1"><div className="w-2 h-2 min-w-2 min-h-2 rounded-full bg-amber-500" /> {u('Maint.', 'Maint.')}</div>
               <div className="flex items-center gap-1"><div className="w-2 h-2 min-w-2 min-h-2 rounded-full bg-red-500" /> {u('Idle', 'Idle')}</div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
