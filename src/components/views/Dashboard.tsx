import { useState } from 'react';
import { Package as PackageIcon, CheckCircle2, Truck, BarChart3, Filter, Plus, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from 'recharts';
import { Role, Language } from '../../types';
import { MOCK_LOADS } from '../../mockData';
import { ui, trLoadStatus, trPackageStatus } from '../../i18n';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PostLoadModal } from '../modals/PostLoadModal';

export const Dashboard = ({ role, lang }: { role: Role, lang: Language }) => {
  const [isPostLoadOpen, setIsPostLoadOpen] = useState(false);
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const analyticsTitle = lang === 'bs' ? 'Pregled analitike' : lang === 'de' ? 'Analytics-Übersicht' : 'Analytics Overview';
  const stats = [
    { label: lang === 'bs' ? 'Aktivne pošiljke' : lang === 'de' ? 'Aktive Pakete' : 'Active Packages', value: '12', icon: PackageIcon, color: 'text-blue-500' },
    { label: lang === 'bs' ? 'Isporučeno' : lang === 'de' ? 'Zugestellt' : 'Delivered', value: '142', icon: CheckCircle2, color: 'text-emerald-500' },
    { label: trPackageStatus(lang, 'In Transit'), value: '8', icon: Truck, color: 'text-amber-500' },
    { label: lang === 'bs' ? 'Prosj. brzina' : lang === 'de' ? 'Ø Geschwindigkeit' : 'Avg. Speed', value: '64 km/h', icon: BarChart3, color: 'text-purple-500' },
  ];

  const chartData = [
    { name: 'Mon', packages: 40, efficiency: 85 },
    { name: 'Tue', packages: 30, efficiency: 88 },
    { name: 'Wed', packages: 65, efficiency: 92 },
    { name: 'Thu', packages: 45, efficiency: 90 },
    { name: 'Fri', packages: 90, efficiency: 95 },
    { name: 'Sat', packages: 20, efficiency: 80 },
    { name: 'Sun', packages: 15, efficiency: 75 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold dark:text-white">{analyticsTitle}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" /> {u('common.filter', 'Filter')}</Button>
          {role === 'user' ? (
            <Button size="sm" onClick={() => setIsPostLoadOpen(true)}><Plus className="w-4 h-4 mr-2" /> {u('common.postNewLoad', 'Post New Load')}</Button>
          ) : (
            <Button size="sm"><Plus className="w-4 h-4 mr-2" /> {u('common.newRoute', 'New Route')}</Button>
          )}
        </div>
      </div>

      <PostLoadModal isOpen={isPostLoadOpen} onClose={() => setIsPostLoadOpen(false)} lang={lang} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg bg-slate-50 dark:bg-slate-800", s.color)}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                <p className="text-xl font-bold dark:text-white">{s.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title={u('dashboard.deliveryPerformance', 'Delivery Performance')}>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPkgs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00AEEF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00AEEF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area type="monotone" dataKey="packages" stroke="#00AEEF" strokeWidth={3} fillOpacity={1} fill="url(#colorPkgs)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={u('dashboard.recentActivity', 'Recent Activity')}>
          <div className="space-y-6 mt-4">
            {[
              { title: 'Package Delivered', time: '2 mins ago', desc: 'ER217960271BA marked as delivered in Sarajevo.' },
              { title: 'New Load Posted', time: '1 hour ago', desc: 'Electronics Pallets (1.2 Tons) available from Vienna.' },
              { title: 'Route Completed', time: '3 hours ago', desc: 'Driver John Doe completed route R1 (420 km).' },
              { title: 'System Update', time: '5 hours ago', desc: 'Smart tracking algorithms have been optimized.' }
            ].map((a, i) => (
              <div key={i} className="flex gap-4">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                  {i !== 3 && <div className="absolute top-4 left-1 w-px h-full bg-slate-200 dark:bg-slate-800" />}
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold dark:text-white">{a.title}</p>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap">{a.time}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {role === 'user' && (
        <Card title={u('dashboard.myActiveLoads', 'My Active Loads')} className="mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{lang === 'bs' ? 'ID tereta' : lang === 'de' ? 'Ladungs-ID' : 'Load ID'}</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{lang === 'bs' ? 'Ruta' : lang === 'de' ? 'Route' : 'Route'}</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{lang === 'bs' ? 'Teret' : lang === 'de' ? 'Fracht' : 'Cargo'}</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">{lang === 'bs' ? 'Status' : lang === 'de' ? 'Status' : 'Status'}</th>
                  <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {MOCK_LOADS.slice(0, 3).map((load) => (
                  <tr key={load.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 text-sm font-bold dark:text-white">{load.id}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{load.pickup}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span>{load.delivery}</span>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-slate-500">{load.cargoType} ({load.weight}kg)</td>
                    <td className="p-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        load.status === 'Available' ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {trLoadStatus(lang, load.status)}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-slate-500">{load.eta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};


