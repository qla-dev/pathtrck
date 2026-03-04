import { ArrowRight, ChevronRight, Scale, Truck } from 'lucide-react';

import { cn } from '../../lib/cn';
import { trGoodsType, trPaymentTerms } from '../../i18n';
import { Language, Load } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export type LoadItemLayout = 'list' | 'grid' | 'map';

type LoadItemProps = {
  key?: string;
  layout: LoadItemLayout;
  load: Load;
  lang?: Language;
  viewDetailsLabel: string;
  hideSource?: boolean;
  statusLabel?: string;
  onOpenDetails?: (load: Load) => void;
  onOpenSetup?: () => void;
};

export const LoadItem = ({
  layout,
  load,
  lang = 'en',
  viewDetailsLabel,
  hideSource = false,
  statusLabel,
  onOpenDetails,
  onOpenSetup,
}: LoadItemProps) => {
  const isMap = layout === 'map';
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
  const isInteractive = hideSource ? Boolean(onOpenSetup) : Boolean(onOpenDetails);

  const handleCardClick = () => {
    if (hideSource) {
      onOpenSetup?.();
      return;
    }

    onOpenDetails?.(load);
  };

  return (
    <Card
      onClick={isInteractive ? handleCardClick : undefined}
      className={cn(
        'hover:border-primary/50 transition-all group',
        isInteractive ? 'cursor-pointer' : 'cursor-default',
        hideSource && '[&>div:last-child]:p-4'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-4 min-w-0">
          <div className="w-12 h-12 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <Truck className="text-slate-500 group-hover:text-primary transition-colors" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-lg dark:text-white">{load.title}</h3>
            <p className="text-sm text-slate-500 truncate">
              {sourceLine}
            </p>
          </div>
        </div>

        <div className="ml-auto shrink-0 whitespace-nowrap flex flex-col items-end gap-2">
          <div className="text-xl font-black text-primary whitespace-nowrap text-right">
            {load.price}
          </div>
          {!hideSource && (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/90 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-200 shadow-sm">
              <Scale className="w-3.5 h-3.5 text-primary" />
              <span>{load.weight} kg</span>
            </div>
          )}
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

      <div
        className={cn(
          'mt-3 flex items-center gap-2',
          isMap ? 'flex-nowrap overflow-x-auto' : 'flex-wrap'
        )}
      >
        <span
          className={cn(
            'shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider',
            goodsTone
          )}
        >
          {trGoodsType(lang, load.goodsType)}
        </span>
        <span
          className={cn(
            'shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider',
            paymentTone
          )}
        >
          {trPaymentTerms(lang, load.paymentTerms)}
        </span>
      </div>

      {!hideSource && (
        <>
          <div className="mt-6 -mx-6 w-[calc(100%+3rem)] border-t border-slate-100 dark:border-slate-800" />
          <div className="pt-6 flex items-center gap-8">
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
                size="md"
                variant="primary"
                className="h-11 min-w-[128px] px-5 font-semibold whitespace-nowrap flex-nowrap"
                onClick={(event) => {
                  event.stopPropagation();
                  handleCardClick();
                }}
              >
                {viewDetailsLabel}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};
