import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Plus,
  Truck,
  Plane,
  Ship,
  CheckCircle2,
  Settings,
  BarChart3,
  ShieldCheck,
  ChevronRight,
  Map as MapIcon,
  Share2,
  Users,
  Gauge,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Area, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import { Language, Role } from '../../types';
import { isCompanyOperationsRole } from '../../lib/roles';
import { ui, trFuelType, trVehicleStatus } from '../../i18n';
import { cn } from '../../lib/cn';
import { confirmAction } from '../../lib/swal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { DataTable } from '../ui/DataTable';
import { api } from '../../services/api';
import { RegisterVehicleModal } from '../modals/RegisterVehicleModal';
import { AddressMapModal } from '../maps/AddressMapModal';

type TransportType = 'truck' | 'aircraft' | 'ship';

type FleetVehicle = {
  id: string;
  transportType: TransportType;
  systemName: string;
  model: string;
  plate: string;
  status: 'Active' | 'Maintenance' | 'Idle';
  fuel: string;
  fuelType: string;
  trailer: string;
  tailLift: string;
  nextService: string;
  location: [number, number];
  category: string;
  bodyType: string;
  capacity: string;
  volume: string;
  configuration: string;
  capacityKg: number;
  volumeM3: number;
  source?: Record<string, unknown>;
};

const INITIAL_VEHICLES: FleetVehicle[] = [
  {
    id: 'V1',
    transportType: 'truck',
    systemName: 'Sarajevo Sprinter',
    model: 'Mercedes Sprinter',
    plate: 'BA-123-XY',
    status: 'Active',
    fuel: '75%',
    fuelType: 'Diesel',
    trailer: 'No',
    tailLift: 'Yes',
    nextService: '12 May',
    location: [43.8563, 18.4131],
    category: 'Light trucks (up to 3.5t)',
    bodyType: 'Box truck',
    capacity: '3.5 t',
    volume: '20 m3',
    configuration: '4x2',
    capacityKg: 3500,
    volumeM3: 20,
  },
  {
    id: 'V2',
    transportType: 'truck',
    systemName: 'Crafter Cold Line',
    model: 'Volkswagen Crafter',
    plate: 'DE-992-AB',
    status: 'Maintenance',
    fuel: '20%',
    fuelType: 'Diesel',
    trailer: 'Yes (1)',
    tailLift: 'No',
    nextService: 'Tomorrow',
    location: [43.8463, 18.4031],
    category: 'Medium trucks (3.5-12t)',
    bodyType: 'Refrigerated truck',
    capacity: '7.5 t',
    volume: '35 m3',
    configuration: '4x2',
    capacityKg: 7500,
    volumeM3: 35,
  },
  {
    id: 'V3',
    transportType: 'truck',
    systemName: 'Daily Electric',
    model: 'Iveco Daily',
    plate: 'UK-881-ZZ',
    status: 'Idle',
    fuel: '95%',
    fuelType: 'Electric',
    trailer: 'No',
    tailLift: 'Yes',
    nextService: '28 June',
    location: [43.8663, 18.4231],
    category: 'Light trucks (up to 3.5t)',
    bodyType: 'Curtain sider',
    capacity: '3.2 t',
    volume: '22 m3',
    configuration: '4x2',
    capacityKg: 3200,
    volumeM3: 22,
  },
];

export const FleetView = ({ lang, role, userId, companyIds = [] }: { lang: Language; role?: Role; userId?: number; companyIds?: number[] }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sharedAccess, setSharedAccess] = useState<Record<string, boolean>>({});

  // Sharing exposes a vehicle to every dispatcher and driver and unsharing pulls it back out of
  // their view, so both directions confirm first.
  const toggleSharedAccess = async (vehicle: FleetVehicle) => {
    const shared = Boolean(sharedAccess[vehicle.id]);
    const confirmed = await confirmAction({
      title: shared
        ? u('fleet.confirmUnshareTitle', 'Stop sharing this vehicle?')
        : u('fleet.confirmShareTitle', 'Share this vehicle?'),
      text: `${vehicle.systemName} (${vehicle.plate}) ${shared
        ? u('fleet.confirmUnshareText', 'will be visible to admins only.')
        : u('fleet.confirmShareText', 'will be visible to dispatchers and drivers.')}`,
      confirmText: shared ? u('fleet.stopSharing', 'Stop sharing') : u('fleet.share', 'Share'),
      icon: shared ? 'warning' : 'question',
    });
    if (!confirmed) return;
    setSharedAccess((current) => ({ ...current, [vehicle.id]: !shared }));
  };
  const [fleetSection, setFleetSection] = useState<'vehicles' | 'statistics'>('vehicles');
  const [editingVehicle, setEditingVehicle] = useState<Record<string, unknown> | null>(null);
  const [mapVehicle, setMapVehicle] = useState<FleetVehicle | null>(null);

  // How full each vehicle is right now, taken from the loads it is currently carrying — the fleet
  // equivalent of a warehouse's occupancy against its capacity.
  const [vehicleLoads, setVehicleLoads] = useState<Record<string, { weightKg: number; loads: number }>>({});
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await api.loads.list({ per_page: 500, tracking: true, statuses: 'sent,in_delivery' });
        if (!active) return;
        const totals: Record<string, { weightKg: number; loads: number }> = {};
        response.data.forEach((load) => {
          const vehicleId = String(load.vehicle_id || '');
          if (!vehicleId) return;
          const current = totals[vehicleId] || { weightKg: 0, loads: 0 };
          totals[vehicleId] = { weightKg: current.weightKg + Number(load.weight_kg || 0), loads: current.loads + 1 };
        });
        setVehicleLoads(totals);
      } catch {
        // Without load data the column simply reads as empty; the fleet table still works.
      }
    })();
    return () => { active = false; };
  }, []);

  const loadVehicles = async () => {
    const response = await api.vehicles.list({ per_page: 100 });
    const scopedRows = response.data.filter((row) => {
      if (isCompanyOperationsRole(role) && companyIds.length > 0) return companyIds.includes(Number(row.company_id));
      if (role === 'driver' && userId) {
        const permittedUsers = Array.isArray(row.permitted_users)
          ? row.permitted_users as Array<Record<string, unknown>>
          : [];
        const hasViewGrant = permittedUsers.some((permittedUser) => {
          const pivot = permittedUser.pivot && typeof permittedUser.pivot === 'object'
            ? permittedUser.pivot as Record<string, unknown>
            : {};
          return Number(permittedUser.id) === userId && Boolean(pivot.can_view);
        });
        return Number(row.owner_user_id) === userId || hasViewGrant;
      }
      return true;
    });
    setVehicles(scopedRows.map((row) => {
      const locations = Array.isArray(row.locations) ? row.locations as Array<Record<string, unknown>> : [];
      const lastLocation = locations[locations.length - 1];
      const features = (row.features && typeof row.features === 'object' ? row.features : {}) as Record<string, unknown>;
      const status = String(row.status || 'idle').toLowerCase();
      return {
        id: String(row.id), transportType: row.transport_type === 'air' ? 'aircraft' : row.transport_type === 'sea' ? 'ship' : 'truck',
        systemName: String(features.system_name || row.registration_number || `Vehicle ${row.id}`),
        model: [row.make, row.model].filter(Boolean).join(' ') || String(row.vehicle_type || ''), plate: String(row.registration_number || ''),
        status: status === 'active' || status === 'available' ? 'Active' : status === 'maintenance' ? 'Maintenance' : 'Idle',
        fuel: '—', fuelType: String(features.fuel_type || '—'), trailer: String(features.trailer || '—'), tailLift: features.tail_lift ? 'Yes' : 'No',
        nextService: String(features.next_service || '—'),
        location: [Number(lastLocation?.latitude || 43.8563), Number(lastLocation?.longitude || 18.4131)] as [number, number],
        category: String(row.vehicle_type || '—'), bodyType: String(features.body_type || row.vehicle_type || '—'),
        capacity: row.capacity_kg ? `${Number(row.capacity_kg).toLocaleString()} kg` : '—', volume: row.capacity_m3 ? `${row.capacity_m3} m³` : '—',
        configuration: String(features.configuration || '—'), capacityKg: Number(row.capacity_kg || 0), volumeM3: Number(row.capacity_m3 || 0),
        source: row,
      };
    }));
  };
  useEffect(() => { void loadVehicles(); }, [role, userId, companyIds.join(',')]);

  const fleetData = vehicles.slice(0, 7).map((vehicle) => ({ name: vehicle.plate, fuel: vehicle.status === 'Active' ? 100 : 0, efficiency: vehicle.status === 'Maintenance' ? 0 : 100 }));
  const statusData = ['Active', 'Maintenance', 'Idle'].map((name) => ({ name, value: vehicles.filter((vehicle) => vehicle.status === name).length }));
  const typeData = (['truck', 'aircraft', 'ship'] as TransportType[]).map((name) => ({ name, value: vehicles.filter((vehicle) => vehicle.transportType === name).length })).filter((item) => item.value > 0);
  const capacityData = vehicles.slice(0, 8).map((vehicle) => ({ name: vehicle.plate || vehicle.systemName, capacity: vehicle.capacityKg, volume: vehicle.volumeM3 }));
  const chartTooltip = { borderRadius: '12px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '12px' };

  const vehicleTypeIcon = {
    truck: Truck,
    aircraft: Plane,
    ship: Ship,
  };

  const fleetStats = useMemo(
    () => [
      {
        label: u('fleet.stats.totalVehicles', 'Total Vehicles'),
        value: String(vehicles.length),
        icon: Truck,
        tone: 'bg-blue-500/10 text-blue-600',
      },
      {
        label: u('fleet.stats.activeNow', 'Active Now'),
        value: String(vehicles.filter((item) => item.status === 'Active').length),
        icon: CheckCircle2,
        tone: 'bg-emerald-500/10 text-emerald-600',
      },
      {
        label: u('fleet.stats.inMaintenance', 'In Maintenance'),
        value: String(vehicles.filter((item) => item.status === 'Maintenance').length),
        icon: Settings,
        tone: 'bg-amber-500/10 text-amber-600',
      },
      {
        label: u('fleet.stats.avgEfficiency', 'Registry Coverage'),
        value: `${vehicles.length ? Math.round((vehicles.filter((item) => item.systemName && item.category && item.bodyType).length / vehicles.length) * 100) : 0}%`,
        icon: BarChart3,
        tone: 'bg-purple-500/10 text-purple-600',
      },
    ],
    [vehicles, lang]
  );

  const openAddVehicle = () => {
    setEditingVehicle(null);
    setIsAddModalOpen(true);
  };
  const openEditVehicle = (vehicle: FleetVehicle) => {
    setEditingVehicle(vehicle.source || null);
    setIsAddModalOpen(true);
  };
  const closeAddVehicle = () => {
    setIsAddModalOpen(false);
    setEditingVehicle(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <PageHeader
        icon={Truck}
        title={u('fleet.title', 'My Fleet')}
        subtitle={u('fleet.subtitle', 'Manage and monitor your vehicle assets')}
        actions={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="inline-flex items-center rounded-full border border-sky-200/80 bg-sky-50/70 p-1 dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setFleetSection('vehicles')}
                className={cn(
                  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95',
                  fleetSection === 'vehicles'
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-slate-500 hover:text-primary dark:text-slate-300',
                )}
              >
                <Truck className="h-4 w-4" />
                {u('fleet.tabs.vehicles', 'Vehicles')}
              </button>
              <button
                type="button"
                onClick={() => setFleetSection('statistics')}
                className={cn(
                  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95',
                  fleetSection === 'statistics'
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-slate-500 hover:text-primary dark:text-slate-300',
                )}
              >
                <BarChart3 className="h-4 w-4" />
                {u('fleet.tabs.statistics', 'Statistics')}
              </button>
            </div>
            <Button className="rounded-full" onClick={openAddVehicle}>
              <Plus className="mr-2 h-4 w-4" /> {u('fleet.addVehicle', 'Add Vehicle')}
            </Button>
          </div>
        )}
        stats={fleetStats}
      />

      <AnimatePresence initial={false} mode="popLayout">
      <motion.div
        key={fleetSection}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-3"
      >
      {fleetSection === 'statistics' && <section className="grid gap-3 xl:grid-cols-12">
        <Card className="shadow-none xl:col-span-3" contentClassName="p-4">
          <div className="flex items-center gap-2"><Gauge className="h-4 w-4 text-emerald-500" /><div><p className="text-sm font-black dark:text-white">{u('fleet.statusMix', 'Fleet readiness')}</p><p className="text-[11px] text-slate-500">{u('fleet.statusMixSub', 'Vehicles grouped by live status')}</p></div></div>
          <div className="mt-2 h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={3}><Cell fill="#10b981" /><Cell fill="#f59e0b" /><Cell fill="#64748b" /></Pie><Tooltip contentStyle={chartTooltip} itemStyle={{ color: '#e2e8f0' }} labelStyle={{ color: '#e2e8f0' }} /><Legend iconType="circle" wrapperStyle={{ fontSize: '10px' }} /></PieChart></ResponsiveContainer></div>
        </Card>
        <Card className="shadow-none xl:col-span-3" contentClassName="p-4">
          <div className="flex items-center gap-2"><Truck className="h-4 w-4 text-sky-500" /><div><p className="text-sm font-black dark:text-white">{u('fleet.transportMix', 'Transport mix')}</p><p className="text-[11px] text-slate-500">{u('fleet.transportMixSub', 'Assets by transport category')}</p></div></div>
          <div className="mt-3 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={typeData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip cursor={false} contentStyle={chartTooltip} /><Bar dataKey="value" name="Vehicles" fill="#0ea5e9" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
        <Card className="shadow-none xl:col-span-6" contentClassName="p-4">
          <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-violet-500" /><div><p className="text-sm font-black dark:text-white">{u('fleet.capacityProfile', 'Fleet capacity profile')}</p><p className="text-[11px] text-slate-500">{u('fleet.capacityProfileSub', 'Registered payload and volume by vehicle')}</p></div></div>
          <div className="mt-3 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart data={capacityData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis yAxisId="kg" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis yAxisId="m3" orientation="right" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip cursor={false} contentStyle={chartTooltip} /><Legend wrapperStyle={{ fontSize: '11px' }} /><Bar yAxisId="kg" dataKey="capacity" name="Payload kg" fill="#8b5cf6" radius={[5, 5, 0, 0]} /><Bar yAxisId="m3" dataKey="volume" name="Volume m³" fill="#0ea5e9" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
      </section>}

      {fleetSection === 'vehicles' && (isCompanyOperationsRole(role) || role === 'driver' || role === 'superadmin' || role === 'master') && (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-500">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-lg font-black text-slate-900 dark:text-white">Company fleet access</p>
                <p className="text-sm text-slate-500">Control which vehicles are visible to dispatchers and drivers.</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-xs font-bold text-primary">
              <Users className="h-4 w-4" /> {Object.values(sharedAccess).filter(Boolean).length} shared
            </span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {vehicles.map((vehicle) => {
              const shared = Boolean(sharedAccess[vehicle.id]);
              const VehicleIcon = vehicleTypeIcon[vehicle.transportType];
              return (
                <div key={vehicle.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800"><VehicleIcon className="h-5 w-5" /></div>
                    <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900 dark:text-white">{vehicle.systemName}</p><p className="truncate text-xs text-slate-500">{vehicle.plate} · {shared ? 'Team access' : 'Admins only'}</p></div>
                  </div>
                  <button type="button" onClick={() => void toggleSharedAccess(vehicle)} className={cn('shrink-0 cursor-pointer rounded-xl px-3 py-2 text-xs font-bold transition-colors', shared ? 'bg-primary text-white hover:bg-primary/90' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700')}>
                    {shared ? u('fleet.shared', 'Shared') : u('fleet.share', 'Share')}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {fleetSection === 'statistics' && <div className="grid gap-3 lg:grid-cols-3">
        <Card title={u('fleet.fuelEfficiencyTitle', 'Fuel Consumption & Efficiency')} className="lg:col-span-2">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fleetData}>
                <defs>
                  <linearGradient id="colorFuel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00AEEF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00AEEF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
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
            {vehicles
              .filter((v) => v.status === 'Maintenance' || v.nextService === 'Tomorrow')
              .map((v) => (
                <div key={v.id} className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 flex items-start gap-4">
                  <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shrink-0 shadow-sm">
                    <Settings className="text-amber-600 w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold dark:text-white">{v.systemName}</p>
                    <p className="text-xs text-slate-500">
                      {u('fleet.serviceDue', 'Service due:')} <span className="font-bold text-amber-600">{v.nextService}</span>
                    </p>
                    <Button size="sm" variant="outline" className="mt-2 h-7 text-[10px] rounded-full">
                      {u('fleet.scheduleNow', 'Schedule Now')}
                    </Button>
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
      </div>}

      {fleetSection === 'vehicles' && <Card contentClassName="p-0">
        <div className="overflow-x-auto">
          <DataTable>
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800">
                <th className="p-3">{u('fleet.table.vehicle', 'Vehicle')}</th>
                <th className="p-3">{u('fleet.table.licensePlate', 'Registry / Plate')}</th>
                <th className="p-3">{u('fleet.table.fuelType', 'Fuel Type')}</th>
                <th className="p-3">{u('fleet.table.trailer', 'Trailer')}</th>
                <th className="p-3">{u('fleet.table.tailLift', 'Tail Lift')}</th>
                <th className="p-3">{u('fleet.table.status', 'Status')}</th>
                <th className="p-3">{u('tracking.capacity', 'Capacity')}</th>
                <th className="p-3">{u('tracking.utilisation', 'Utilisation')}</th>
                <th className="p-3">{u('fleet.table.fuelLevel', 'Fuel Level')}</th>
                <th className="p-3">{u('fleet.table.nextService', 'Next Service')}</th>
                <th className="p-3">{u('Action', 'Action')}</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => {
                const Icon = vehicleTypeIcon[v.transportType];
                return (
                  <tr key={v.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                          <Icon className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold dark:text-white">{v.systemName}</p>
                          <p className="truncate text-xs text-slate-500">{v.model}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-slate-500 font-mono">{v.plate}</td>
                    <td className="p-3 text-sm text-slate-500">{trFuelType(lang, v.fuelType)}</td>
                    <td className="p-3 text-sm text-slate-500">{v.trailer}</td>
                    <td className="p-3 text-sm text-slate-500">{v.tailLift}</td>
                    <td className="p-3">
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full text-[10px] font-bold uppercase',
                          v.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-600'
                            : v.status === 'Maintenance'
                              ? 'bg-amber-100 text-amber-600'
                              : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {trVehicleStatus(lang, v.status)}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-slate-500">
                      <p className="font-bold text-slate-700 dark:text-slate-200">{v.capacity}</p>
                      <p className="text-xs">{v.volume}</p>
                    </td>
                    <td className="p-3">
                      {(() => {
                        const carried = vehicleLoads[v.id] || { weightKg: 0, loads: 0 };
                        const percentage = v.capacityKg > 0
                          ? Math.min(100, Math.round((carried.weightKg / v.capacityKg) * 100))
                          : 0;
                        return (
                          <div className="min-w-[120px]">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 max-w-[70px] flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                <div
                                  className={cn('h-full rounded-full', percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-amber-500' : 'bg-primary')}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold dark:text-white">{v.capacityKg > 0 ? `${percentage}%` : '—'}</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              {carried.weightKg.toLocaleString()} kg · {carried.loads} {u('tracking.activeLoads', 'active loads')}
                            </p>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[60px]">
                          <div
                            className={cn('h-full rounded-full', parseInt(v.fuel, 10) < 30 ? 'bg-red-500' : 'bg-primary')}
                            style={{ width: v.fuel }}
                          />
                        </div>
                        <span className="text-xs font-bold dark:text-white">{v.fuel}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-slate-500">{v.nextService}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setMapVehicle(v)}
                          title={u('fleet.openVehicleMap', 'Open vehicle map')}
                          aria-label={u('fleet.openVehicleMap', 'Open vehicle map')}
                          className="cursor-pointer rounded-lg bg-slate-100 p-2 transition hover:text-primary dark:bg-slate-800"
                        >
                          <MapIcon className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditVehicle(v)}
                          title={u('fleet.editVehicleTitle', 'Edit vehicle')}
                          aria-label={u('fleet.editVehicleTitle', 'Edit vehicle')}
                          className="cursor-pointer rounded-lg bg-slate-100 p-2 transition hover:text-primary dark:bg-slate-800"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        </div>
      </Card>}
      </motion.div>
      </AnimatePresence>

      <RegisterVehicleModal
        open={isAddModalOpen}
        lang={lang}
        ownerUserId={role === 'driver' ? userId : undefined}
        assignedDriverUserId={role === 'driver' ? userId : undefined}
        companyId={isCompanyOperationsRole(role) ? companyIds[0] : undefined}
        initialVehicle={editingVehicle}
        onClose={closeAddVehicle}
        onCreated={() => {
          closeAddVehicle();
          void loadVehicles();
        }}
      />
      <AddressMapModal
        open={Boolean(mapVehicle)}
        lang={lang}
        title={mapVehicle ? `${mapVehicle.systemName} · ${mapVehicle.plate}` : u('fleet.vehicleLocation', 'Vehicle location')}
        initialPosition={mapVehicle?.location || null}
        viewOnly
        onClose={() => setMapVehicle(null)}
        onSelect={() => setMapVehicle(null)}
      />
    </motion.div>
  );
};
