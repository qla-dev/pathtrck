import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Clock, MapPin, Sparkles, Truck } from 'lucide-react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';

const ROUTE_MODELS_BY_VEHICLE: Record<string, string[]> = {
  'Cargo Van': ['Mercedes Sprinter', 'Ford Transit', 'Renault Master'],
  'Box Truck': ['MAN TGL 12.250', 'Volvo FL 250', 'DAF LF 260'],
  'Reefer Truck': ['Scania R450', 'DAF XF 480', 'Volvo FH 500'],
};

export const AiRouteCalculatorCard = ({
  lang,
  className,
}: {
  lang: Language;
  className?: string;
}) => {
  const [routeVehicle, setRouteVehicle] = useState<keyof typeof ROUTE_MODELS_BY_VEHICLE>('Cargo Van');
  const [routeModel, setRouteModel] = useState('Mercedes Sprinter');
  const [routeMaxLoad, setRouteMaxLoad] = useState(1800);
  const [routePriority, setRoutePriority] = useState<'fastest' | 'balanced' | 'eco'>('balanced');

  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  const routeModelOptions = useMemo(() => ROUTE_MODELS_BY_VEHICLE[routeVehicle], [routeVehicle]);

  useEffect(() => {
    if (!routeModelOptions.includes(routeModel)) {
      setRouteModel(routeModelOptions[0]);
    }
  }, [routeModelOptions, routeModel]);

  const routeEstimate = useMemo(() => {
    const baseDistance = 1391;
    const baseHours = routePriority === 'fastest' ? 20 : routePriority === 'eco' ? 23 : 21;
    const baseFuel = routePriority === 'fastest' ? 470 : routePriority === 'eco' ? 410 : 440;
    const baseCost = routePriority === 'fastest' ? 1490 : routePriority === 'eco' ? 1360 : 1425;
    const loadFactor = routeMaxLoad / 2500;
    const etaHours = Math.round(baseHours + loadFactor * 2);
    const fuelLiters = Math.round(baseFuel + loadFactor * 20);
    const totalCost = Math.round(baseCost + loadFactor * 80);

    return {
      distance: baseDistance,
      eta: `${etaHours}h`,
      fuel: `${fuelLiters} L`,
      cost: `€${totalCost}`,
    };
  }, [routePriority, routeMaxLoad]);

  const routePriorityLabel = routePriority === 'fastest'
    ? u('landing.fast', 'Fast')
    : routePriority === 'eco'
      ? u('landing.eco', 'Eco')
      : u('landing.smart', 'Smart');

  return (
    <div className={cn('bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 md:p-10 border border-slate-100 dark:border-slate-800 transition-all', className)}>
      <div className="flex flex-col xl:flex-row gap-6 xl:gap-8">
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {u('landing.aiRouteCalculator', 'AI Route Calculator')}
              </p>
              <p className="text-2xl font-black dark:text-white">{u('landing.optimizePrefs', 'Optimize for vehicle and load preferences')}</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-wider">{u('landing.aiScore', 'AI Score 97')}</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-500">{u('landing.vehicle', 'Vehicle')}</label>
              <select
                value={routeVehicle}
                onChange={(e) => setRouteVehicle(e.target.value as keyof typeof ROUTE_MODELS_BY_VEHICLE)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {Object.keys(ROUTE_MODELS_BY_VEHICLE).map((vehicle) => (
                  <option key={vehicle} value={vehicle}>{vehicle}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-500">{u('landing.model', 'Model')}</label>
              <select
                value={routeModel}
                onChange={(e) => setRouteModel(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 dark:text-white text-sm outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {routeModelOptions.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-500">{u('landing.maxLoad', 'Max Load')}</label>
              <div className="h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center gap-3">
                <input
                  type="range"
                  min={400}
                  max={2500}
                  step={50}
                  value={routeMaxLoad}
                  onChange={(e) => setRouteMaxLoad(Number(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
                <span className="text-xs font-black text-primary whitespace-nowrap">{routeMaxLoad} kg</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase text-slate-500">{u('landing.priority', 'Priority')}</label>
              <div className="h-11 grid grid-cols-3 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-900">
                {[
                  { id: 'fastest', label: u('landing.fast', 'Fast') },
                  { id: 'balanced', label: u('landing.smart', 'Smart') },
                  { id: 'eco', label: u('landing.eco', 'Eco') },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setRoutePriority(option.id as 'fastest' | 'balanced' | 'eco')}
                    className={cn(
                      'text-[11px] font-black transition-colors cursor-pointer',
                      routePriority === option.id
                        ? 'bg-primary text-white'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-4 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                <MapPin className="w-4 h-4" />
              </div>
              <p className="text-[10px] uppercase text-slate-500">{u('landing.distance', 'Distance')}</p>
              <p className="text-2xl leading-none font-black dark:text-white mt-1">{routeEstimate.distance} km</p>
            </div>
            <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-4 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-[10px] uppercase text-slate-500">{u('landing.eta', 'ETA')}</p>
              <p className="text-2xl leading-none font-black dark:text-white mt-1">{routeEstimate.eta}</p>
            </div>
            <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-4 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                <Truck className="w-4 h-4" />
              </div>
              <p className="text-[10px] uppercase text-slate-500">{u('landing.fuel', 'Fuel')}</p>
              <p className="text-2xl leading-none font-black dark:text-white mt-1">{routeEstimate.fuel}</p>
            </div>
            <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-4 flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
                <BarChart3 className="w-4 h-4" />
              </div>
              <p className="text-[10px] uppercase text-slate-500">{u('landing.projectedCost', 'Projected Cost')}</p>
              <p className="text-2xl leading-none font-black dark:text-white mt-1">{routeEstimate.cost}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-2">{u('landing.aiRecommendation', 'AI Recommendation')}</p>
            <p className="text-sm font-bold dark:text-white mb-1">Zagreb → Munich → Frankfurt → Cologne → Amsterdam</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {u('routeCalc.bestFitFor', 'Best fit for')} {routeModel}, {routeMaxLoad} kg load, {routePriorityLabel} {u('routeCalc.priority', 'priority')}.
            </p>
          </div>
        </div>

        <div className="xl:w-56 rounded-3xl bg-primary text-white p-6 flex flex-col justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] font-black text-white/80 mb-2">{u('landing.aiConfidence', 'AI Confidence')}</p>
            <p className="text-4xl font-black mb-4">98%</p>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>{u('landing.trafficPrediction', 'Traffic Prediction')}</span>
                  <span>{u('routeCalc.high', 'High')}</span>
                </div>
                <div className="h-2 rounded-full bg-white/20 overflow-hidden"><div className="h-full w-[88%] bg-white rounded-full" /></div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>{u('landing.fuelEfficiency', 'Fuel Efficiency')}</span>
                  <span>{u('routeCalc.optimized', 'Optimized')}</span>
                </div>
                <div className="h-2 rounded-full bg-white/20 overflow-hidden"><div className="h-full w-[81%] bg-white rounded-full" /></div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>{u('landing.etaStability', 'ETA Stability')}</span>
                  <span>{u('routeCalc.strong', 'Strong')}</span>
                </div>
                <div className="h-2 rounded-full bg-white/20 overflow-hidden"><div className="h-full w-[86%] bg-white rounded-full" /></div>
              </div>
            </div>
          </div>
          <div className="mt-6 text-xs text-white/80">
            {u('routeCalc.recalculatesNote', 'Recalculates every 3 min using live road events and fleet constraints.')}
          </div>
        </div>
      </div>
    </div>
  );
};
