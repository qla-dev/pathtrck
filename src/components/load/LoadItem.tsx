import { ArrowRight, ChevronRight, Truck } from 'lucide-react';

import { cn } from '../../lib/cn';
import { Load } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export type LoadItemLayout = 'list' | 'grid' | 'map';

type LoadItemProps = {
  layout: LoadItemLayout;
  load: Load;
  viewDetailsLabel: string;
  hideSource?: boolean;
  statusLabel?: string;
  onOpenDetails?: (load: Load) => void;
};

export const LoadItem = ({
  layout,
  load,
  viewDetailsLabel,
  hideSource = false,
  statusLabel,
  onOpenDetails,
}: LoadItemProps) => {
  const isGrid = layout === 'grid';
  const sourceLine = hideSource
    ? `${load.cargoType} - ${load.weight} kg - ${load.date}`
    : `${load.author} - ${load.date}`;
  const goodsTone =
    load.goodsType === 'Flammable'
      ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
      : load.goodsType === 'Fragile'
        ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30'
        : load.goodsType === 'High Value'
          ? 'bg-violet-500/10 text-violet-500 border-violet-500/30'
          : 'bg-slate-500/10 text-slate-500 border-slate-500/30';
  const paymentTone =
    load.paymentTerms === 'In Advance'
      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
      : load.paymentTerms === 'On Delivery'
        ? 'bg-sky-500/10 text-sky-500 border-sky-500/30'
        : 'bg-blue-500/10 text-blue-500 border-blue-500/30';
  const openDetails = () => {
    onOpenDetails?.(load);
  };

  return (
    <Card
      onClick={openDetails}
      className={cn(
        'hover:border-primary/50 transition-all cursor-pointer group',
        hideSource && '[&>div:last-child]:p-4'
      )}
    >
      <div
        className={cn(
          'flex justify-between gap-6',
          isGrid ? 'flex-col' : 'flex-col md:flex-row md:items-center'
        )}
      >
        <div className="flex gap-4 min-w-0">
          <div className="w-12 h-12 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <Truck className="text-slate-500 group-hover:text-primary transition-colors" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-lg dark:text-white">{load.title}</h3>
            <p className="text-sm text-slate-500 truncate">
              {sourceLine}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className={cn('px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider', goodsTone)}>
                {load.goodsType}
              </span>
              <span className={cn('px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider', paymentTone)}>
                {load.paymentTerms}
              </span>
            </div>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4 shrink-0 whitespace-nowrap">
          {!hideSource && (
            <div className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold dark:text-slate-300 whitespace-nowrap">
              {load.weight}
            </div>
          )}
          <div className="text-xl font-black text-primary whitespace-nowrap text-right">
            {load.price}
          </div>
          {hideSource && (
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-wider',
                load.status === 'Available'
                  ? 'text-emerald-500'
                  : load.status === 'Assigned'
                    ? 'text-amber-500'
                    : 'text-slate-400'
              )}
            >
              {statusLabel || load.status}
            </span>
          )}
        </div>
      </div>

      {!hideSource && (
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
            <Button
              size="sm"
              variant="ghost"
              onClick={(event) => {
                event.stopPropagation();
                openDetails();
              }}
            >
              {viewDetailsLabel} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
