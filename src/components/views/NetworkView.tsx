import { Globe, Truck, Map as MapIcon, Clock } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, PieChart, Pie } from 'recharts';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export const NetworkView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const stats = [
    { label: u('Active Hubs', 'Active Hubs'), value: '142', icon: Globe, color: 'text-blue-500' },
    { label: u('Fleet Capacity', 'Fleet Capacity'), value: u('4.2M Tons', '4.2M Tons'), icon: Truck, color: 'text-emerald-500' },
    { label: u('Global Reach', 'Global Reach'), icon: MapIcon, value: u('192 Countries', '192 Countries'), color: 'text-amber-500' },
    { label: u('Avg Delivery', 'Avg Delivery'), value: u('1.8 Days', '1.8 Days'), icon: Clock, color: 'text-primary' }
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
              {[
                { pos: [40.7128, -74.0060], name: 'New York Hub' },
                { pos: [51.5074, -0.1278], name: 'London Hub' },
                { pos: [35.6895, 139.6917], name: 'Tokyo Hub' },
                { pos: [43.8563, 18.4131], name: 'Sarajevo Hub' },
                { pos: [-33.8688, 151.2093], name: 'Sydney Hub' }
              ].map((hub, i) => (
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
                <BarChart data={[
                  { name: u('Europe', 'Europe'), val: 94 },
                  { name: u('N. America', 'N. America'), val: 88 },
                  { name: u('Asia', 'Asia'), val: 91 },
                  { name: u('Africa', 'Africa'), val: 76 }
                ]}>
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
                      data={[
                        { name: u('Active', 'Active'), value: 75, fill: '#00AEEF' },
                        { name: u('Maintenance', 'Maintenance'), value: 15, fill: '#f59e0b' },
                        { name: u('Idle', 'Idle'), value: 10, fill: '#ef4444' }
                      ]}
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
