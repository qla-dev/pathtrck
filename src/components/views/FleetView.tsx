import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
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
  X,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area, Line } from 'recharts';
import { Language } from '../../types';
import { ui, trFuelType, trVehicleStatus } from '../../i18n';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

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
};

type AddVehicleDraft = {
  transportType: TransportType;
  category: string;
  bodyType: string;
  make: string;
  model: string;
  customModel: string;
  capacity: string;
  volume: string;
  configuration: string;
  fuelType: string;
  systemName: string;
  plate: string;
  status: 'Active' | 'Maintenance' | 'Idle';
  trailer: string;
  trailerSystemName: string;
  trailerPlate: string;
  trailerBodyType: string;
  tailLift: string;
  nextService: string;
};

const FLEET_REGISTRY = {
  truck: {
    label: 'Truck',
    icon: Truck,
    categories: ['Light trucks (up to 3.5t)', 'Medium trucks (3.5-12t)', 'Heavy trucks (12t+)', 'Special trucks'],
    bodyTypes: ['Box truck', 'Curtain sider', 'Refrigerated truck', 'Tanker', 'Flatbed', 'Container truck', 'Dump truck', 'Car carrier'],
    makes: {
      'Mercedes-Benz': ['Actros'],
      Volvo: ['FH', 'FH16'],
      Scania: ['R', 'S'],
      MAN: ['TGX', 'TGS'],
      DAF: ['XF', 'CF'],
      Iveco: ['S-Way'],
    },
    specs: {
      capacity: '3 - 40 t',
      volume: '20 - 100 m3',
      configurations: ['4x2', '6x2', '6x4'],
      fuelTypes: ['Diesel', 'Electric'],
    },
  },
  aircraft: {
    label: 'Cargo aircraft',
    icon: Plane,
    categories: ['Narrow-body cargo', 'Wide-body cargo', 'Freighter (dedicated)', 'Passenger to Freighter (P2F)'],
    bodyTypes: ['ULD cargo deck', 'Main deck freighter', 'Temperature-controlled hold', 'Oversize cargo hold'],
    makes: {
      Boeing: ['747-8F', '777F', '767F'],
      Airbus: ['A330-200F'],
      Antonov: ['AN-124', 'AN-225'],
    },
    specs: {
      capacity: '20 - 150 t',
      volume: '100 - 800 m3',
      configurations: ['3,000 - 8,000 km', '800 - 900 km/h'],
      fuelTypes: ['Jet Fuel', 'Hybrid'],
    },
  },
  ship: {
    label: 'Cargo ship',
    icon: Ship,
    categories: ['Container ship', 'Bulk carrier', 'Tanker (oil, LNG)', 'Ro-Ro (vehicles)', 'General cargo ship'],
    bodyTypes: ['Container deck', 'Bulk hold', 'Liquid tank', 'Ro-Ro ramp', 'Mixed cargo deck'],
    makes: {
      Hyundai: ['Container class'],
      Maersk: ['Ro-Ro class'],
      Damen: ['General cargo class'],
      Samsung: ['Tanker class'],
    },
    specs: {
      capacity: 'TEU / tonnage',
      volume: '100 - 400 m length',
      configurations: ['15 - 25 knots', 'Ocean-going', 'Short sea'],
      fuelTypes: ['Marine Diesel', 'LNG', 'Hybrid'],
    },
  },
} as const;

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
  },
];

const INITIAL_DRAFT: AddVehicleDraft = {
  transportType: 'truck',
  category: 'Light trucks (up to 3.5t)',
  bodyType: 'Box truck',
  make: 'Mercedes-Benz',
  model: 'Actros',
  customModel: '',
  capacity: '3 - 40 t',
  volume: '20 - 100 m3',
  configuration: '4x2',
  fuelType: 'Diesel',
  systemName: '',
  plate: '',
  status: 'Active',
  trailer: 'No',
  trailerSystemName: '',
  trailerPlate: '',
  trailerBodyType: 'Box trailer',
  tailLift: 'No',
  nextService: '',
};

export const FleetView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>(INITIAL_VEHICLES);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<AddVehicleDraft>(INITIAL_DRAFT);
  const [trailerStep, setTrailerStep] = useState(0);

  const fleetData = [
    { name: 'Mon', fuel: 400, efficiency: 85 },
    { name: 'Tue', fuel: 300, efficiency: 88 },
    { name: 'Wed', fuel: 500, efficiency: 82 },
    { name: 'Thu', fuel: 280, efficiency: 91 },
    { name: 'Fri', fuel: 390, efficiency: 87 },
    { name: 'Sat', fuel: 200, efficiency: 94 },
    { name: 'Sun', fuel: 150, efficiency: 96 },
  ];

  const registry = FLEET_REGISTRY[draft.transportType];
  const makeOptions = Object.keys(registry.makes);
  const modelOptions = registry.makes[draft.make as keyof typeof registry.makes] || [];
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
        color: 'text-blue-600',
        bg: 'bg-blue-100',
      },
      {
        label: u('fleet.stats.activeNow', 'Active Now'),
        value: String(vehicles.filter((item) => item.status === 'Active').length),
        icon: CheckCircle2,
        color: 'text-emerald-600',
        bg: 'bg-emerald-100',
      },
      {
        label: u('fleet.stats.inMaintenance', 'In Maintenance'),
        value: String(vehicles.filter((item) => item.status === 'Maintenance').length),
        icon: Settings,
        color: 'text-amber-600',
        bg: 'bg-amber-100',
      },
      {
        label: u('fleet.stats.avgEfficiency', 'Registry Coverage'),
        value: `${Math.round((vehicles.filter((item) => item.systemName && item.category && item.bodyType).length / vehicles.length) * 100)}%`,
        icon: BarChart3,
        color: 'text-purple-600',
        bg: 'bg-purple-100',
      },
    ],
    [vehicles, lang]
  );

  const resetDraft = (transportType: TransportType = 'truck') => {
    const nextRegistry = FLEET_REGISTRY[transportType];
    const nextMake = Object.keys(nextRegistry.makes)[0];
    const nextModel = nextRegistry.makes[nextMake as keyof typeof nextRegistry.makes][0];
    setDraft({
      transportType,
      category: nextRegistry.categories[0],
      bodyType: nextRegistry.bodyTypes[0],
      make: nextMake,
      model: nextModel,
      customModel: '',
      capacity: nextRegistry.specs.capacity,
      volume: nextRegistry.specs.volume,
      configuration: nextRegistry.specs.configurations[0],
      fuelType: nextRegistry.specs.fuelTypes[0],
      systemName: '',
      plate: '',
      status: 'Active',
      trailer: transportType === 'truck' ? 'No' : 'N/A',
      trailerSystemName: '',
      trailerPlate: '',
      trailerBodyType: 'Box trailer',
      tailLift: transportType === 'truck' ? 'No' : 'N/A',
      nextService: '',
    });
    setStep(0);
    setTrailerStep(0);
  };

  const openAddVehicle = () => {
    resetDraft('truck');
    setIsAddModalOpen(true);
  };

  const closeAddVehicle = () => {
    setIsAddModalOpen(false);
    resetDraft('truck');
  };

  const setDraftField = <K extends keyof AddVehicleDraft>(key: K, value: AddVehicleDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleTransportTypeChange = (transportType: TransportType) => {
    const nextRegistry = FLEET_REGISTRY[transportType];
    const nextMake = Object.keys(nextRegistry.makes)[0];
    const nextModel = nextRegistry.makes[nextMake as keyof typeof nextRegistry.makes][0];
    setDraft({
      transportType,
      category: nextRegistry.categories[0],
      bodyType: nextRegistry.bodyTypes[0],
      make: nextMake,
      model: nextModel,
      customModel: '',
      capacity: nextRegistry.specs.capacity,
      volume: nextRegistry.specs.volume,
      configuration: nextRegistry.specs.configurations[0],
      fuelType: nextRegistry.specs.fuelTypes[0],
      systemName: '',
      plate: '',
      status: 'Active',
      trailer: transportType === 'truck' ? 'No' : 'N/A',
      trailerSystemName: '',
      trailerPlate: '',
      trailerBodyType: 'Box trailer',
      tailLift: transportType === 'truck' ? 'No' : 'N/A',
      nextService: '',
    });
    setTrailerStep(0);
  };

  const canContinue =
    (step === 0 && Boolean(draft.transportType && draft.category && draft.bodyType)) ||
    (step === 1 && Boolean(draft.make && (draft.model || draft.customModel) && draft.capacity && draft.fuelType)) ||
    (step === 2 &&
      Boolean(draft.systemName && draft.plate) &&
      (draft.transportType !== 'truck' ||
        draft.trailer === 'No' ||
        (trailerStep === 1 && draft.trailerSystemName && draft.trailerPlate && draft.trailerBodyType)));

  const submitVehicle = () => {
    const displayModel = draft.model === 'Other' ? draft.customModel : `${draft.make} ${draft.model}`.trim();
    const trailerLabel =
      draft.transportType !== 'truck' || draft.trailer === 'No'
        ? draft.transportType === 'truck'
          ? 'No'
          : 'N/A'
        : `${draft.trailer} • ${draft.trailerBodyType} • ${draft.trailerPlate}`;
    const nextVehicle: FleetVehicle = {
      id: `V${vehicles.length + 1}`,
      transportType: draft.transportType,
      systemName: draft.systemName,
      model: displayModel,
      plate: draft.plate,
      status: draft.status,
      fuel: draft.status === 'Maintenance' ? '20%' : draft.status === 'Idle' ? '88%' : '76%',
      fuelType: draft.fuelType,
      trailer: trailerLabel,
      tailLift: draft.transportType === 'truck' ? draft.tailLift : 'N/A',
      nextService: draft.nextService || u('fleet.noDateSet', 'Not scheduled'),
      location: [43.8563, 18.4131],
      category: draft.category,
      bodyType: draft.bodyType,
      capacity: draft.capacity,
      volume: draft.volume,
      configuration: draft.configuration,
    };

    setVehicles((prev) => [nextVehicle, ...prev]);
    closeAddVehicle();
  };

  const hasTrailer = draft.transportType === 'truck' && draft.trailer !== 'No';

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
        <Button className="rounded-full" onClick={openAddVehicle}>
          <Plus className="w-4 h-4 mr-2" /> {u('fleet.addVehicle', 'Add Vehicle')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {fleetStats.map((stat, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center gap-4">
              <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', stat.bg)}>
                <stat.icon className={cn('w-6 h-6', stat.color)} />
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
      </div>

      <Card title={u('fleet.vehicleStatus', 'Vehicle Status & Live Tracking')}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-100 dark:border-slate-800">
                <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">{u('fleet.table.vehicle', 'Vehicle')}</th>
                <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-widest">{u('fleet.table.licensePlate', 'Registry / Plate')}</th>
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
              {vehicles.map((v) => {
                const Icon = vehicleTypeIcon[v.transportType];
                return (
                  <tr key={v.id} className="border-b border-slate-50 dark:border-slate-900 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                          <Icon className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                          <span className="text-sm font-bold dark:text-white block">{v.systemName}</span>
                          <span className="text-xs text-slate-500">{v.model}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-500 font-mono">{v.plate}</td>
                    <td className="p-4 text-sm text-slate-500">{trFuelType(lang, v.fuelType)}</td>
                    <td className="p-4 text-sm text-slate-500">{v.trailer}</td>
                    <td className="p-4 text-sm text-slate-500">{v.tailLift}</td>
                    <td className="p-4">
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
                    <td className="p-4">
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
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[220] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="flex max-h-[calc(100dvh-80px)] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                  {u('fleet.registryLabel', 'Local transport registry')}
                </p>
                <h2 className="text-2xl font-black dark:text-white mt-2">
                  {u('fleet.registryTitle', 'Register a new vehicle')}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {u('fleet.registrySubtitle', 'Each level is separated into its own registration step for a clean fleet onboarding flow.')}
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddVehicle}
                className="h-11 w-11 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 flex items-center justify-center cursor-pointer transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 lg:grid-cols-[250px_minmax(0,1fr)]">
              <aside className="overflow-y-auto border-r border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-5 space-y-3">
                {[
                  u('fleet.stepRegistry', 'Base transport list'),
                  u('fleet.stepSpecs', 'Brand, model and specifications'),
                  u('fleet.stepNaming', 'System name and operating details'),
                ].map((label, index) => (
                  <div
                    key={label}
                    className={cn(
                      'rounded-2xl border p-4',
                      step === index
                        ? 'border-primary bg-primary/5'
                        : index < step
                          ? 'border-emerald-200 bg-emerald-50 dark:bg-emerald-900/10'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    )}
                  >
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      {u('fleet.step', 'Step')} {index + 1}
                    </p>
                    <p className="text-sm font-bold dark:text-white mt-1">{label}</p>
                  </div>
                ))}
              </aside>

              <div className="min-h-0 overflow-y-auto p-6 space-y-6">
                {step === 0 && (
                  <div className="space-y-6">
                    <div className="grid sm:grid-cols-3 gap-3">
                      {(Object.keys(FLEET_REGISTRY) as TransportType[]).map((type) => {
                        const item = FLEET_REGISTRY[type];
                        const Icon = item.icon;
                        return (
                          <button
                            key={type}
                            type="button"
                            onClick={() => handleTransportTypeChange(type)}
                            className={cn(
                              'rounded-2xl border p-4 text-left transition-all cursor-pointer hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-800/60',
                              draft.transportType === type
                                ? 'border-primary bg-primary/5'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                            )}
                          >
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                              <Icon className="w-5 h-5" />
                            </div>
                            <p className="mt-3 text-sm font-bold dark:text-white">{item.label}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.categories.length} {u('fleet.registryCategories', 'registry categories')}</p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                          {u('fleet.category', 'Category')}
                        </label>
                        <select
                          value={draft.category}
                          onChange={(e) => setDraftField('category', e.target.value)}
                          className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white cursor-pointer appearance-none transition-colors hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900"
                        >
                          {registry.categories.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                          {u('fleet.bodyType', 'Body type')}
                        </label>
                        <select
                          value={draft.bodyType}
                          onChange={(e) => setDraftField('bodyType', e.target.value)}
                          className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white cursor-pointer appearance-none transition-colors hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900"
                        >
                          {registry.bodyTypes.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                          {u('fleet.make', 'Brand / make')}
                        </label>
                        <select
                          value={draft.make}
                          onChange={(e) => {
                            const nextMake = e.target.value;
                            const nextModels = registry.makes[nextMake as keyof typeof registry.makes];
                            setDraft((prev) => ({
                              ...prev,
                              make: nextMake,
                              model: nextModels[0],
                              customModel: '',
                            }));
                          }}
                          className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white cursor-pointer appearance-none transition-colors hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900"
                        >
                          {makeOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                          {u('fleet.model', 'Model')}
                        </label>
                        <select
                          value={draft.model}
                          onChange={(e) => setDraftField('model', e.target.value)}
                          className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white cursor-pointer appearance-none transition-colors hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900"
                        >
                          {modelOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                          <option value="Other">{u('fleet.other', 'Other')}</option>
                        </select>
                      </div>
                    </div>

                    {draft.model === 'Other' && (
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                          {u('fleet.customModel', 'Custom model')}
                        </label>
                        <input
                          value={draft.customModel}
                          onChange={(e) => setDraftField('customModel', e.target.value)}
                          placeholder={u('fleet.customModelPlaceholder', 'Enter custom model')}
                          className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white cursor-pointer appearance-none transition-colors hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900"
                        />
                      </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                          {u('fleet.capacity', 'Capacity')}
                        </label>
                        <input
                          value={draft.capacity}
                          onChange={(e) => setDraftField('capacity', e.target.value)}
                          className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white cursor-pointer appearance-none transition-colors hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                          {u('fleet.volume', 'Volume')}
                        </label>
                        <input
                          value={draft.volume}
                          onChange={(e) => setDraftField('volume', e.target.value)}
                          className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white cursor-pointer appearance-none"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                          {u('fleet.configuration', 'Configuration')}
                        </label>
                        <select
                          value={draft.configuration}
                          onChange={(e) => setDraftField('configuration', e.target.value)}
                          className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white cursor-pointer appearance-none transition-colors hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900"
                        >
                          {registry.specs.configurations.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                          {u('fleet.fuelType', 'Fuel type')}
                        </label>
                        <select
                          value={draft.fuelType}
                          onChange={(e) => setDraftField('fuelType', e.target.value)}
                          className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white cursor-pointer appearance-none transition-colors hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900"
                        >
                          {registry.specs.fuelTypes.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                          {u('fleet.systemName', 'Vehicle name in system')}
                        </label>
                        <input
                          value={draft.systemName}
                          onChange={(e) => setDraftField('systemName', e.target.value)}
                          placeholder={u('fleet.systemNamePlaceholder', 'Example: Frozen Line 01')}
                          className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white transition-colors hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                          {u('fleet.plate', 'Registration / code')}
                        </label>
                        <input
                          value={draft.plate}
                          onChange={(e) => setDraftField('plate', e.target.value)}
                          placeholder={u('fleet.platePlaceholder', 'BA-123-XY / IMO-001 / AIR-77F')}
                          className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white transition-colors hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                          {u('fleet.status', 'Status')}
                        </label>
                        <select
                          value={draft.status}
                          onChange={(e) => setDraftField('status', e.target.value as AddVehicleDraft['status'])}
                          className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white cursor-pointer appearance-none transition-colors hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900"
                        >
                          <option value="Active">Active</option>
                          <option value="Maintenance">Maintenance</option>
                          <option value="Idle">Idle</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                          {u('fleet.nextService', 'Next service')}
                        </label>
                        <input
                          value={draft.nextService}
                          onChange={(e) => setDraftField('nextService', e.target.value)}
                          placeholder={u('fleet.nextServicePlaceholder', '12 May / Tomorrow / Dock inspection')}
                          className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white transition-colors hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900"
                        />
                      </div>
                    </div>

                    {draft.transportType === 'truck' && (
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                            {u('fleet.tailLift', 'Tail lift')}
                          </label>
                          <select
                            value={draft.tailLift}
                            onChange={(e) => setDraftField('tailLift', e.target.value)}
                            className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white cursor-pointer appearance-none transition-colors hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900"
                          >
                            <option value="No">No</option>
                            <option value="Yes">Yes</option>
                          </select>
                        </div>

                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-4 space-y-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                                {u('fleet.trailerWizardLabel', 'Trailer registration')}
                              </p>
                              <p className="text-sm text-slate-500 mt-1">
                                {u('fleet.trailerWizardHelp', 'Use a separate mini stepper to register the trailer together with the truck.')}
                              </p>
                            </div>
                            <div className="inline-flex rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1">
                              {[u('fleet.step', 'Step') + ' 1', u('fleet.step', 'Step') + ' 2'].map((item, index) => (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => {
                                    if (index === 0 || hasTrailer) setTrailerStep(index);
                                  }}
                                  className={cn(
                                    'px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer',
                                    trailerStep === index
                                      ? 'bg-primary text-white'
                                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                  )}
                                >
                                  {item}
                                </button>
                              ))}
                            </div>
                          </div>

                          {trailerStep === 0 && (
                            <div className="space-y-4">
                              <div className="grid sm:grid-cols-3 gap-3">
                                {[
                                  { value: 'No', label: u('fleet.noTrailer', 'No trailer') },
                                  { value: 'Yes (1)', label: u('fleet.oneTrailer', '1 trailer') },
                                  { value: 'Yes (2)', label: u('fleet.twoTrailers', '2 trailers') },
                                ].map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      setDraft((prev) => ({
                                        ...prev,
                                        trailer: option.value,
                                        trailerSystemName: option.value === 'No' ? '' : prev.trailerSystemName,
                                        trailerPlate: option.value === 'No' ? '' : prev.trailerPlate,
                                      }));
                                      setTrailerStep(option.value === 'No' ? 0 : 1);
                                    }}
                                    className={cn(
                                      'rounded-2xl border bg-white dark:bg-slate-900 p-4 text-left transition-all cursor-pointer hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-800/60',
                                      draft.trailer === option.value
                                        ? 'border-primary bg-primary/5'
                                        : 'border-slate-200 dark:border-slate-800'
                                    )}
                                  >
                                    <p className="text-sm font-bold dark:text-white">{option.label}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {option.value === 'No'
                                        ? u('fleet.noTrailerHelp', 'Register only the powered vehicle.')
                                        : u('fleet.trailerNextHelp', 'Continue to trailer details in the next mini step.')}
                                    </p>
                                  </button>
                                ))}
                              </div>

                              {hasTrailer && (
                                <div className="flex justify-end">
                                  <Button type="button" variant="outline" onClick={() => setTrailerStep(1)}>
                                    {u('fleet.continueTrailer', 'Continue trailer setup')}
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}

                          {trailerStep === 1 && hasTrailer && (
                            <div className="space-y-4">
                              <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                                    {u('fleet.trailerSystemName', 'Trailer name in system')}
                                  </label>
                                  <input
                                    value={draft.trailerSystemName}
                                    onChange={(e) => setDraftField('trailerSystemName', e.target.value)}
                                    placeholder={u('fleet.trailerSystemNamePlaceholder', 'Example: Reefer Trailer 01')}
                                    className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white transition-colors hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                                    {u('fleet.trailerPlate', 'Trailer registration')}
                                  </label>
                                  <input
                                    value={draft.trailerPlate}
                                    onChange={(e) => setDraftField('trailerPlate', e.target.value)}
                                    placeholder={u('fleet.trailerPlatePlaceholder', 'TR-908-KL')}
                                    className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white transition-colors hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                                  {u('fleet.trailerBodyType', 'Trailer body type')}
                                </label>
                                <select
                                  value={draft.trailerBodyType}
                                  onChange={(e) => setDraftField('trailerBodyType', e.target.value)}
                                  className="w-full h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-sm dark:text-white cursor-pointer appearance-none transition-colors hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-900"
                                >
                                  {['Box trailer', 'Curtain trailer', 'Reefer trailer', 'Flatbed trailer', 'Container chassis'].map((option) => (
                                    <option key={option} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex items-center justify-between gap-3">
                                <Button type="button" variant="outline" onClick={() => setTrailerStep(0)}>
                                  {u('common.back', 'Back')}
                                </Button>
                                <div className="text-xs text-slate-500">
                                  {draft.trailerSystemName && draft.trailerPlate
                                    ? u('fleet.trailerReady', 'Trailer mini registration is ready.')
                                    : u('fleet.trailerPending', 'Complete trailer details to finish this mini step.')}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 px-6 py-5 bg-slate-50 dark:bg-slate-950/40">
              <Button variant="outline" onClick={step === 0 ? closeAddVehicle : () => setStep((prev) => prev - 1)}>
                {step === 0 ? u('common.cancel', 'Cancel') : u('common.back', 'Back')}
              </Button>
              <div className="flex items-center gap-3">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  {u('fleet.step', 'Step')} {step + 1}/3
                </div>
                {step === 2 ? (
                  <Button onClick={submitVehicle} disabled={!canContinue}>
                    {u('fleet.saveVehicle', 'Save vehicle')}
                  </Button>
                ) : (
                  <Button onClick={() => setStep((prev) => prev + 1)} disabled={!canContinue}>
                    {u('common.continue', 'Continue')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
