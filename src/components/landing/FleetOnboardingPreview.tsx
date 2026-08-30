import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BarChart3, Blinds, Box, Bus, Caravan, CheckCircle2, Container, Maximize2, PanelBottom, Plane, Settings, Ship, ThermometerSnowflake, Truck, type LucideIcon } from 'lucide-react';
import { BODY_TYPE_OPTIONS } from '../modals/loadFormOptions';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { ChoiceCard } from '../modals/PostLoadModal/ChoiceCard';
import { HeaderStatCard } from '../ui/PageHeader';

type VehicleType = 'truck' | 'van' | 'aircraft' | 'ship';

// The same registry the Register-a-vehicle modal drives its type picker from, trimmed to what the
// landing preview needs. Kept here rather than imported so the marketing page never pulls the
// whole modal (and its API layer) into the initial bundle.
const VEHICLE_TYPES: { id: VehicleType; label: string; categories: number; icon: typeof Truck }[] = [
  { id: 'truck', label: 'Truck', categories: 4, icon: Truck },
  { id: 'van', label: 'Van', categories: 4, icon: Bus },
  { id: 'aircraft', label: 'Cargo aircraft', categories: 4, icon: Plane },
  { id: 'ship', label: 'Cargo ship', categories: 5, icon: Ship },
];

// The same six body types the Post a load modal offers, with its glyphs.
const BODY_TYPE_ICONS: Record<(typeof BODY_TYPE_OPTIONS)[number], LucideIcon> = {
  Curtain: Blinds,
  Box: Box,
  Reefer: ThermometerSnowflake,
  Mega: Maximize2,
  Tautliner: Container,
  Flatbed: PanelBottom,
};

const TRAILERS = [
  { id: 'none', trailers: 0, labelKey: 'fleet.noTrailer', label: 'No trailer', hintKey: 'fleet.noTrailerHelp', hint: 'Register only the powered vehicle.' },
  { id: 'one', trailers: 1, labelKey: 'fleet.oneTrailer', label: '1 trailer', hintKey: 'fleet.trailerInlineHelp', hint: 'Trailer fields are added to the cards beside this one.' },
  { id: 'two', trailers: 2, labelKey: 'fleet.twoTrailers', label: '2 trailers', hintKey: 'fleet.trailerInlineHelp', hint: 'Trailer fields are added to the cards beside this one.' },
];

/**
 * The "How it works" illustration, built from the real fleet screens rather than a stock photo:
 * the KPI tiles from the page header, the vehicle-type picker and the trailer step from the
 * Register-a-vehicle modal. It is interactive on purpose - a visitor can click through the same
 * choices a driver would, and the counters above react.
 */
export const FleetOnboardingPreview = ({ lang, className }: { lang: Language; className?: string }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [vehicleType, setVehicleType] = useState<VehicleType>('truck');
  const [trailerId, setTrailerId] = useState('none');
  const [bodyTypes, setBodyTypes] = useState<string[]>(['Curtain']);

  const toggleBodyType = (value: string) =>
    setBodyTypes((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));

  const trailers = TRAILERS.find((option) => option.id === trailerId)?.trailers ?? 0;
  // Units on the road = the powered vehicle plus whatever it tows.
  const units = 1 + trailers;

  const stats = useMemo(
    () => [
      { label: u('fleet.stats.totalVehicles', 'Total Vehicles'), value: units, icon: Truck, tone: 'bg-sky-500/10 text-sky-500' },
      { label: u('fleet.stats.activeNow', 'Active Now'), value: units, icon: CheckCircle2, tone: 'bg-emerald-500/10 text-emerald-500' },
      { label: u('fleet.stats.inMaintenance', 'In Maintenance'), value: 0, icon: Settings, tone: 'bg-amber-500/10 text-amber-500' },
      { label: u('fleet.stats.avgEfficiency', 'Avg Efficiency'), value: '100%', icon: BarChart3, tone: 'bg-violet-500/10 text-violet-500' },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [units, lang]
  );

  return (
    <div className={cn('relative', className)}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-3 rounded-[2rem] border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900 sm:p-5"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((stat) => (
            <HeaderStatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} />
          ))}
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2 text-primary">
            <Truck className="h-4 w-4" />
            <p className="text-xs font-black uppercase tracking-wider">{u('fleet.vehicleTypeBlock', 'Vehicle type')}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {VEHICLE_TYPES.map((option) => (
              <ChoiceCard
                key={option.id}
                compact
                truncate
                active={vehicleType === option.id}
                title={option.label}
                description={`${option.categories} ${u('fleet.registryCategories', 'registry categories')}`}
                icon={option.icon}
                onClick={() => setVehicleType(option.id)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-2 text-emerald-500">
            <Caravan className="h-4 w-4" />
            <p className="text-xs font-black uppercase tracking-wider">{u('fleet.trailerWizardLabel', 'Trailer registration')}</p>
          </div>
          <div className="space-y-1">
            <p className="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {u('fleet.trailerWizardLabel', 'Trailer registration')}
            </p>
            <div className="flex min-h-10 items-center rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap gap-2">
                {TRAILERS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setTrailerId(option.id)}
                    className={cn(
                      'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold leading-none transition-colors',
                      trailerId === option.id
                        ? 'border-primary bg-primary text-white'
                        : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                    )}
                  >
                    <Caravan className="h-3.5 w-3.5 shrink-0" />
                    <span className="leading-none">{u(option.labelKey, option.label)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {u('postLoadModal.bodyTypes', 'Body types')}
            </p>
            <div className="flex min-h-10 items-center rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-wrap gap-2">
                {BODY_TYPE_OPTIONS.map((option) => {
                  const BodyTypeIcon = BODY_TYPE_ICONS[option];
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleBodyType(option)}
                      className={cn(
                        'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold leading-none transition-colors',
                        bodyTypes.includes(option)
                          ? 'border-primary bg-primary text-white'
                          : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                      )}
                    >
                      <BodyTypeIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="leading-none">{u(`postLoadModal.bodyType.${option}`, option)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-none absolute -bottom-8 -right-4 max-w-[16rem] rounded-3xl border border-slate-100 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-800 sm:-right-8"
      >
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-sm font-bold dark:text-white">{u('landing.fleetReady', 'Fleet ready')}</p>
        </div>
        <p className="text-xs text-slate-500">
          {u('landing.fleetReadyDesc', 'Vehicle registered and tracking in under two minutes.')}
        </p>
      </motion.div>
    </div>
  );
};
