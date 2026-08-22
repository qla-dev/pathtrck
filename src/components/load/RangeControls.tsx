import { cn } from '../../lib/cn';

export type RangeFilterConfig = {
  min: number;
  max: number;
  selectedMin: number;
  selectedMax: number;
  onChange: (nextMin: number, nextMax: number) => void;
  prefix?: string;
  suffix?: string;
  allowManualInput?: boolean;
  step?: number;
};

export type ChipFilterOption = {
  id: string;
  label: string;
  toneClass: string;
};

export type DimensionRangeConfig = {
  length: RangeFilterConfig;
  width: RangeFilterConfig;
  height: RangeFilterConfig;
};

type UiFn = (key: string, fallback: string) => string;

const formatRangeValue = (value: number, config: RangeFilterConfig) =>
  `${config.prefix || ''}${value}${config.suffix || ''}`;

export const formatCompactValue = (value: number) => new Intl.NumberFormat('en-US').format(Math.round(value));

export const DualRangeControl = ({ config }: { config: RangeFilterConfig }) => {
  const hasSpan = config.max > config.min;
  const span = Math.max(config.max - config.min, 1);
  const leftPct = hasSpan ? ((config.selectedMin - config.min) / span) * 100 : 0;
  const rightPct = hasSpan ? ((config.selectedMax - config.min) / span) * 100 : 100;
  const prefix = config.prefix?.trim();
  const suffix = config.suffix?.trim();
  const step = config.step && config.step > 0 ? config.step : 1;

  return (
    <>
      {config.allowManualInput ? (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <label className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-500 flex items-center gap-1 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition-colors">
            {prefix && <span className="text-slate-400">{prefix}</span>}
            <input
              type="number"
              min={config.min}
              max={config.selectedMax}
              step={step}
              value={config.selectedMin}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                if (!Number.isFinite(nextValue)) return;
                const nextMin = Math.max(config.min, Math.min(nextValue, config.selectedMax));
                config.onChange(nextMin, config.selectedMax);
              }}
              className="w-full bg-transparent border-0 outline-none text-xs text-slate-600 dark:text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            {suffix && <span className="text-slate-400">{suffix}</span>}
          </label>
          <label className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-500 flex items-center gap-1 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30 transition-colors">
            {prefix && <span className="text-slate-400">{prefix}</span>}
            <input
              type="number"
              min={config.selectedMin}
              max={config.max}
              step={step}
              value={config.selectedMax}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                if (!Number.isFinite(nextValue)) return;
                const nextMax = Math.min(config.max, Math.max(nextValue, config.selectedMin));
                config.onChange(config.selectedMin, nextMax);
              }}
              className="w-full bg-transparent border-0 outline-none text-xs text-slate-600 dark:text-slate-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            {suffix && <span className="text-slate-400">{suffix}</span>}
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-500">
            {formatRangeValue(config.selectedMin, config)}
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-500">
            {formatRangeValue(config.selectedMax, config)}
          </div>
        </div>
      )}

      <div className="relative h-5">
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 rounded-full" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />

        <input
          type="range"
          min={config.min}
          max={config.max}
          step={step}
          value={config.selectedMin}
          onChange={(event) => {
            const nextMin = Math.min(Number(event.target.value), config.selectedMax);
            config.onChange(nextMin, config.selectedMax);
          }}
          className="pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:appearance-none [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-900 dark:[&::-webkit-slider-thumb]:border-slate-100 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-slate-900 dark:[&::-moz-range-thumb]:border-slate-100 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer"
        />
        <input
          type="range"
          min={config.min}
          max={config.max}
          step={step}
          value={config.selectedMax}
          onChange={(event) => {
            const nextMax = Math.max(Number(event.target.value), config.selectedMin);
            config.onChange(config.selectedMin, nextMax);
          }}
          className="pointer-events-none absolute inset-0 h-5 w-full appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:appearance-none [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-slate-900 dark:[&::-webkit-slider-thumb]:border-slate-100 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-slate-900 dark:[&::-moz-range-thumb]:border-slate-100 [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:cursor-pointer"
        />
      </div>
    </>
  );
};

export const WeightRangeControl = ({ config, u }: { config: RangeFilterConfig; u: UiFn }) => {
  const span = Math.max(config.max - config.min, 1);
  const step = Math.max(1, config.step ?? 100);
  const selectedSpan = Math.max(config.selectedMax - config.selectedMin, 0);
  const segmentCount = 18;
  const snapToStep = (value: number) => Math.round(value / step) * step;
  const q1 = Math.max(config.min, Math.min(config.max, snapToStep(config.min + span * 0.25)));
  const q2 = Math.max(q1, Math.min(config.max, snapToStep(config.min + span * 0.5)));
  const q3 = Math.max(q2, Math.min(config.max, snapToStep(config.min + span * 0.75)));
  const quickRanges = [
    {
      id: 'all',
      label: u('legacy.sidebarFilter.all', 'All'),
      min: config.min,
      max: config.max,
    },
    {
      id: 'light',
      label: `${formatCompactValue(config.min)}-${formatCompactValue(q1)}`,
      min: config.min,
      max: q1,
    },
    {
      id: 'medium',
      label: `${formatCompactValue(q1)}-${formatCompactValue(q2)}`,
      min: q1,
      max: q2,
    },
    {
      id: 'heavy',
      label: `${formatCompactValue(q2)}-${formatCompactValue(q3)}`,
      min: q2,
      max: q3,
    },
    {
      id: 'xl',
      label: `${formatCompactValue(q3)}-${formatCompactValue(config.max)}`,
      min: q3,
      max: config.max,
    },
  ];

  const setMin = (rawValue: number) => {
    const rounded = snapToStep(rawValue);
    const nextMin = Math.max(config.min, Math.min(rounded, config.selectedMax));
    config.onChange(nextMin, config.selectedMax);
  };

  const setMax = (rawValue: number) => {
    const rounded = snapToStep(rawValue);
    const nextMax = Math.min(config.max, Math.max(rounded, config.selectedMin));
    config.onChange(config.selectedMin, nextMax);
  };

  const moveClosestBoundary = (rawValue: number) => {
    const rounded = snapToStep(rawValue);
    if (Math.abs(rounded - config.selectedMin) <= Math.abs(rounded - config.selectedMax)) {
      setMin(rounded);
      return;
    }
    setMax(rounded);
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-white/80 dark:bg-slate-950/60 px-2 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {u('legacy.sidebarFilter.minKg', 'Min kg')}
          </p>
          <div className="mt-1 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMin(config.selectedMin - step)}
              className="h-7 w-7 rounded-md bg-slate-100 dark:bg-slate-900/70 text-slate-500 hover:text-primary transition-colors cursor-pointer"
              aria-label={u('legacy.sidebarFilter.decreaseMinimumWeight', 'Decrease minimum weight')}
            >
              -
            </button>
            <input
              type="number"
              min={config.min}
              max={config.selectedMax}
              step={step}
              value={config.selectedMin}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                if (!Number.isFinite(nextValue)) return;
                setMin(nextValue);
              }}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => setMin(config.selectedMin + step)}
              className="h-7 w-7 rounded-md bg-slate-100 dark:bg-slate-900/70 text-slate-500 hover:text-primary transition-colors cursor-pointer"
              aria-label={u('legacy.sidebarFilter.increaseMinimumWeight', 'Increase minimum weight')}
            >
              +
            </button>
          </div>
        </div>

        <div className="rounded-lg bg-white/80 dark:bg-slate-950/60 px-2 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {u('legacy.sidebarFilter.maxKg', 'Max kg')}
          </p>
          <div className="mt-1 flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMax(config.selectedMax - step)}
              className="h-7 w-7 rounded-md bg-slate-100 dark:bg-slate-900/70 text-slate-500 hover:text-primary transition-colors cursor-pointer"
              aria-label={u('legacy.sidebarFilter.decreaseMaximumWeight', 'Decrease maximum weight')}
            >
              -
            </button>
            <input
              type="number"
              min={config.selectedMin}
              max={config.max}
              step={step}
              value={config.selectedMax}
              onChange={(event) => {
                const nextValue = Number(event.target.value);
                if (!Number.isFinite(nextValue)) return;
                setMax(nextValue);
              }}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => setMax(config.selectedMax + step)}
              className="h-7 w-7 rounded-md bg-slate-100 dark:bg-slate-900/70 text-slate-500 hover:text-primary transition-colors cursor-pointer"
              aria-label={u('legacy.sidebarFilter.increaseMaximumWeight', 'Increase maximum weight')}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {quickRanges.map((range) => {
          const isSelected = config.selectedMin === range.min && config.selectedMax === range.max;
          return (
            <button
              key={range.id}
              type="button"
              onClick={() => config.onChange(range.min, range.max)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer',
                isSelected
                  ? 'bg-primary text-white'
                  : 'bg-slate-200/80 dark:bg-slate-800/90 text-slate-500 hover:text-primary'
              )}
            >
              {range.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-lg bg-slate-50 dark:bg-slate-950 px-2 py-2">
        <div className="h-12 flex items-end gap-1">
          {Array.from({ length: segmentCount }).map((_, index) => {
            const segmentStartValue = config.min + (index / segmentCount) * span;
            const segmentEndValue = config.min + ((index + 1) / segmentCount) * span;
            const midpoint = (segmentStartValue + segmentEndValue) / 2;
            const isActive = segmentEndValue >= config.selectedMin && segmentStartValue <= config.selectedMax;
            const height = 30 + Math.round(Math.sin(((index + 1) / segmentCount) * Math.PI) * 55);

            return (
              <button
                key={`weight-segment-${index}`}
                type="button"
                onClick={() => moveClosestBoundary(midpoint)}
                className={cn(
                  'flex-1 rounded-sm transition-all cursor-pointer',
                  isActive
                    ? 'bg-linear-to-t from-primary to-cyan-300 dark:from-primary dark:to-cyan-400'
                    : 'bg-slate-300 dark:bg-slate-800 hover:bg-slate-400 dark:hover:bg-slate-700'
                )}
                style={{ height: `${height}%` }}
                aria-label={`${u('legacy.sidebarFilter.weightSegment', 'Weight segment')} ${index + 1}`}
              >
                <span className="sr-only">
                  {u('legacy.sidebarFilter.weightSegment', 'Weight segment')} {index + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        <span>{formatCompactValue(config.selectedMin)} kg</span>
        <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">
          {u('legacy.sidebarFilter.span', 'Span')}: {formatCompactValue(selectedSpan)} kg
        </span>
        <span>{formatCompactValue(config.selectedMax)} kg</span>
      </div>
    </div>
  );
};
