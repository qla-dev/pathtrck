import { ArrowRight, Boxes, CalendarDays, ChevronRight, MapPin, Plane, Scale, Ship, Star, Train, Truck, Warehouse } from 'lucide-react';

import { cn } from '../../lib/cn';
import { countryFlagUrl, getCountryCode } from '../../lib/loadGeo';
import { formatShortDate } from '../../lib/loadDetails';
import { getBidState, getOfferLabel } from '../../lib/offerBid';
import { trGoodsType, trPaymentTerms, ui } from '../../i18n';
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
  userId?: number;
  ownerMode?: boolean;
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
  userId,
  ownerMode = false,
  onOpenDetails,
  onOpenSetup,
}: LoadItemProps) => {
  const isMap = layout === 'map';
  const isGrid = layout === 'grid';
  const displayDate = formatShortDate(load.date);
  const sourceLine = hideSource
    ? `${load.cargoType} - ${load.weight} kg - ${displayDate}`
    : `${load.author} - ${displayDate}`;
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
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const hasBudget = Boolean(load.budget && load.budget > 0);
  const offerCurrency = load.price.split(' ')[0] || 'EUR';
  const bidState = getBidState(load.offers, userId, load.budget);
  const actionLabel = ownerMode
    ? u('offers.view', 'View offers')
    : load.isNegotiable === false
    ? (hasBudget ? `${u('reservation.requestShort', 'Request reservation')} · ${load.price}` : u('reservation.requestShort', 'Request reservation'))
    : getOfferLabel(u, bidState, offerCurrency);
  const showChevron = load.isNegotiable === false || !bidState.myOffer;
  const isStorage = Boolean(load.forStorage || load.transportType === 'warehouse');
  const TransportIcon = isStorage ? Warehouse : load.transportType === 'air' ? Plane : load.transportType === 'sea' ? Ship : load.transportType === 'rail' ? Train : Truck;
  const pickupLabel = load.pickup || 'Nije definisano';
  const storageRadiusLabel = isStorage && load.storageRadiusKm ? `+${load.storageRadiusKm} km` : '';
  const deliveryLabel = load.delivery || 'Nije definisano';
  const pickupCountryCode = getCountryCode(load.pickup);
  const deliveryCountryCode = getCountryCode(load.delivery);

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
        'min-w-0 max-w-full overflow-hidden hover:border-primary/50 transition-all group',
        isInteractive ? 'cursor-pointer' : 'cursor-default',
        hideSource && '[&>div:last-child]:p-4'
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-2 sm:gap-4">
        <div className="flex min-w-0 gap-2 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <TransportIcon className="text-slate-500 group-hover:text-primary transition-colors" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-bold text-sm min-[400px]:text-base sm:text-lg dark:text-white">{load.title}</h3>
            <p className="text-sm text-slate-500 truncate">
              {sourceLine}
            </p>
          </div>
        </div>

        <div className="ml-auto max-w-[34%] shrink-0 whitespace-nowrap flex flex-col items-end gap-2">
          {!hideSource && (
            <>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/90 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-200 shadow-sm">
                {isStorage ? <Boxes className="w-3.5 h-3.5 text-primary" /> : <Scale className="w-3.5 h-3.5 text-primary" />}
                <span>{isStorage ? `${load.pallets || 0} pal.` : `${load.weight} kg`}</span>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-black text-slate-700 dark:text-slate-200" aria-label={`${u('profile.rating', 'Rating')} ${Number(load.providerRating || 0).toFixed(1)}`}>
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {Number(load.providerRating || 0).toFixed(1)}
              </span>
            </>
          )}
          {hideSource && (
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-wider',
                load.status === 'Posted'
                  ? 'text-emerald-500'
                  : load.status === 'Sent'
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
          {isStorage ? (load.storageType || u('feed.storage.anyType', 'Storage')) : trGoodsType(lang, load.goodsType)}
        </span>
        <span
          className={cn(
            'shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider',
            paymentTone
          )}
        >
          {isStorage ? (load.isStorageOngoing ? u('feed.storage.ongoing', 'Ongoing') : u('feed.storage.fixedTerm', 'Fixed term')) : trPaymentTerms(lang, load.paymentTerms)}
        </span>
      </div>

      {!hideSource && (
        <>
          <div className="mt-6 -mx-6 w-[calc(100%+3rem)] border-t border-slate-100 dark:border-slate-800" />
          <div className={cn('pt-6', isGrid ? 'space-y-6' : 'flex items-center gap-8')}>
            <div className={cn('flex min-w-0 items-center', isGrid ? 'w-full gap-2' : 'gap-8')}>
              {isStorage ? (
                <>
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <span className="truncate text-sm font-medium dark:text-slate-300">{load.delivery || pickupLabel}</span>
                    {storageRadiusLabel && (
                      <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary">{storageRadiusLabel}</span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-500"><CalendarDays className="h-4 w-4" />{load.storageStartDate || '—'}</div>
                </>
              ) : (
              <>
              <div className={cn('flex min-w-0 items-center gap-2', isGrid && 'flex-1')}>
                <div className="w-2 h-2 min-w-2 min-h-2 rounded-full bg-emerald-500" />
                {pickupCountryCode && <img src={countryFlagUrl(pickupCountryCode)} alt="" className="h-3 w-[18px] shrink-0 rounded-sm object-cover" />}
                <span className="truncate text-sm font-medium dark:text-slate-300">{pickupLabel}</span>
              </div>
              <ArrowRight className="w-4 h-4 shrink-0 text-slate-300" />
              <div className={cn('flex min-w-0 items-center gap-2', isGrid && 'flex-1 justify-end text-right')}>
                <div className="w-2 h-2 min-w-2 min-h-2 rounded-full bg-blue-500" />
                <span className="truncate text-sm font-medium dark:text-slate-300">{deliveryLabel}</span>
                {deliveryCountryCode && <img src={countryFlagUrl(deliveryCountryCode)} alt="" className="h-3 w-[18px] shrink-0 rounded-sm object-cover" />}
              </div>
              </>
              )}
            </div>
            {isGrid && (
              <div className="-mx-6 w-[calc(100%+3rem)] border-t border-slate-100 dark:border-slate-800" />
            )}
            <div className={cn(isGrid ? 'w-full' : 'ml-auto')}>
              <Button
                size="md"
                variant="primary"
                className={cn(
                  'h-11 min-w-[128px] px-5 font-semibold whitespace-nowrap flex-nowrap',
                  isGrid && 'w-full'
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  handleCardClick();
                }}
              >
                <span>{actionLabel}</span>
                {showChevron && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};
