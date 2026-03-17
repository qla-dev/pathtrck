import { motion } from 'motion/react';
import { Plus, Truck, CheckCircle2, Settings, BarChart3, ShieldCheck, ChevronRight, Map as MapIcon } from 'lucide-react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, Line } from 'recharts';
import { Language } from '../../types';
import { ui, trFuelType, trVehicleStatus } from '../../i18n';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export const FleetView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const fleetStats = [
    { label: u('fleet.stats.totalVehicles', 'Total Vehicles'), value: '12', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: u('fleet.stats.activeNow', 'Active Now'), value: '8', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: u('fleet.stats.inMaintenance', 'In Maintenance'), value: '2', icon: Settings, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: u('fleet.stats.avgEfficiency', 'Avg Efficiency'), value: '89%', icon: BarChart3, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];
  const fleetData = [
    { name: 'Mon', fuel: 400, efficiency: 85 },
    { name: 'Tue', fuel: 300, efficiency: 88 },
    { name: 'Wed', fuel: 500, efficiency: 82 },
    { name: 'Thu', fuel: 280, efficiency: 91 },
    { name: 'Fri', fuel: 390, efficiency: 87 },
    { name: 'Sat', fuel: 200, efficiency: 94 },
    { name: 'Sun', fuel: 150, efficiency: 96 },
  ];

  const vehicles = [
	    { id: 'V1', model: 'Mercedes Sprinter', plate: 'BA-123-XY', status: 'Active', fuel: '75%', fuelType: 'Diesel', trailer: 'No', tailLift: 'Yes', nextService: '12 May', location: [43.8563, 18.4131] },
	    { id: 'V2', model: 'Volkswagen Crafter', plate: 'DE-992-AB', status: 'Maintenance', fuel: '20%', fuelType: 'Diesel', trailer: 'Yes (1)', tailLift: 'No', nextService: u('fleet.tomorrow', 'Tomorrow'), location: [43.8463, 18.4031] },
	    { id: 'V3', model: 'Iveco Daily', plate: 'UK-881-ZZ', status: 'Idle', fuel: '95%', fuelType: 'Electric', trailer: 'No', tailLift: 'Yes', nextService: '28 June', location: [43.8663, 18.4231] },
	  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold dark:text-white">{u('fleet.title', 'My Fleet')}</h1>
          <p className="text-slate-500">{u('fleet.subtitle', 'Manage and monitor your vehicle assets')}</p>
        </div>
        <Button className="rounded-full">
          <Plus className="w-4 h-4 mr-2" /> {u('fleet.addVehicle', 'Add Vehicle')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {fleetStats.map((stat, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <p className="text-2xl font-black dark:text-white">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title={u('fleet.fuelEfficiencyTitle', 'Fuel Consumption & Efficiency')} className="lg:col-span-2">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fleetData}>
                <defs>
                  <linearGradient id="colorFuel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00AEEF" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#00AEEF" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="fuel" stroke="#00AEEF" fillOpacity={1} fill="url(#colorFuel)" />
                <Line type="monotone" dataKey="efficiency" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={u('fleet.maintenanceAlerts', 'Maintenance Alerts')}>
          <div className="space-y-4">
            {vehicles.filter(v => v.status === 'Maintenance' || v.nextService === 'Tomorrow').map((v, i) => (
              <div key={i} className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 flex items-start gap-4">
                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                  <Settings className="text-amber-600 w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold dark:text-white">{v.model}</p>
                  <p className="text-xs text-slate-500">{u('fleet.serviceDue', 'Service due:')} <span className="font-bold text-amber-600">{v.nextService}</span></p>
                  <Button size="sm" variant="outline" className="mt-2 h-7 text-[10px] rounded-full">{u('fleet.scheduleNow', 'Schedule Now')}</Button>
                </div>
              </div>
            ))}
            <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-emerald-500 w-5 h-5" />
                <span className="text-sm font-medium dark:text-white">{u('fleet.allOtherVehiclesSafe', 'All other vehicles safe')}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </Card>
      </div>

      <Card title={u('fleet.vehicleStatus', 'Vehicle Status & Live Tracking')}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-100 dark:border-slate-800">
                <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">{u('fleet.table.vehicle', 'Vehicle')}</th>
                <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">{u('fleet.table.licensePlate', 'License Plate')}</th>
                <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">{u('fleet.table.fuelType', 'Fuel Type')}</th>
                <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">{u('fleet.table.trailer', 'Trailer')}</th>
                <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">{u('fleet.table.tailLift', 'Tail Lift')}</th>
                <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">{u('fleet.table.status', 'Status')}</th>
                <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">{u('fleet.table.fuelLevel', 'Fuel Level')}</th>
                <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">{u('fleet.table.nextService', 'Next Service')}</th>
                <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">{u('fleet.table.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id} className="border-b border-slate-50 dark:border-slate-900 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                        <Truck className="w-4 h-4 text-slate-500" />
                      </div>
                      <span className="text-sm font-bold dark:text-white">{v.model}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-500 font-mono">{v.plate}</td>
                  <td className="p-4 text-sm text-slate-500">{trFuelType(lang, v.fuelType)}</td>
                  <td className="p-4 text-sm text-slate-500">{v.trailer}</td>
                  <td className="p-4 text-sm text-slate-500">{v.tailLift}</td>
                  <td className="p-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                      v.status === 'Active' ? "bg-emerald-100 text-emerald-600" :
                      v.status === 'Maintenance' ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-600"
                    )}>{trVehicleStatus(lang, v.status)}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[60px]">
                        <div 
                          className={cn("h-full rounded-full", parseInt(v.fuel) < 30 ? "bg-red-500" : "bg-primary")} 
                          style={{ width: v.fuel }} 
                        />
                      </div>
                      <span className="text-xs font-bold dark:text-white">{v.fuel}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-500">{v.nextService}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button className="p-2 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors">
                        <MapIcon className="w-4 h-4" />
                      </button>
                      <button className="p-2 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors">
                        <Settings className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </motion.div>
  );
};

