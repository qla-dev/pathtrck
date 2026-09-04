import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, BadgeDollarSign, Boxes, CalendarDays, ChevronRight, CreditCard, Handshake, Layers3, MapPin, Plane, Scale, Ship, Star, Timer, Train, Truck, Warehouse, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../../lib/cn';
import { countryFlagUrl, getCountryCode } from '../../lib/loadGeo';
import { formatShortDate } from '../../lib/loadDetails';
import { getBidState, getOfferLabel } from '../../lib/offerBid';
import { trGoodsType, trPaymentTerms, ui } from '../../i18n';
import type { TariffCategory } from '../../services/api';
import { Language, Load } from '../../types';
import { hsSectionIconByIndex, hsSectionIndex, hsSectionToneByIndex } from '../modals/scanFieldRows';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

export type LoadItemLayout = 'list' | 'grid' | 'map';

type MainCategoryBadgeProps = {
  label: string;
  sectionIndex: number;
  codes: string[];
  lang: Language;
};

export const MainCategoryBadge = ({ label, sectionIndex, codes, lang }: MainCategoryBadgeProps) => {
  const badgeRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const [tooltip, setTooltip] = useState<{ left: number; top: number; placement: 'above' | 'below' } | null>(null);
  const CategoryIcon = hsSectionIconByIndex(sectionIndex);
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  const showTooltip = () => {
    const rect = badgeRef.current?.getBoundingClientRect();
    if (!rect) return;
    const halfWidth = 144;
    const viewportPadding = 12;
    const placement = rect.top >= 165 ? 'above' : 'below';
    setTooltip({
      left: Math.min(window.innerWidth - halfWidth - viewportPadding, Math.max(halfWidth + viewportPadding, rect.left + rect.width / 2)),
      top: placement === 'above' ? rect.top - 8 : rect.bottom + 8,
      placement,
    });
  };

  return (
    <>
      <span
        ref={badgeRef}
        role="button"
        tabIndex={0}
        aria-describedby={tooltipId}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setTooltip(null)}
        onFocus={showTooltip}
        onBlur={() => setTooltip(null)}
        onClick={(event) => { event.stopPropagation(); setTooltip((current) => current ? null : current); if (!tooltip) showTooltip(); }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            if (tooltip) setTooltip(null); else showTooltip();
          }
        }}
        className={cn(
          'flex min-w-0 max-w-full cursor-pointer items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold outline-none transition-all hover:-translate-y-px hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40',
          hsSectionToneByIndex(sectionIndex)
        )}
      >
        <CategoryIcon className="h-3 w-3 shrink-0" />
        <span className="min-w-0 truncate">{label}</span>
      </span>

      {tooltip && createPortal(
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none fixed z-[500] w-72 rounded-xl bg-slate-950 px-3 py-2.5 text-left text-white shadow-xl dark:border dark:border-slate-700 dark:bg-slate-800"
          style={{ left: tooltip.left, top: tooltip.top, transform: tooltip.placement === 'above' ? 'translate(-50%, -100%)' : 'translateX(-50%)' }}
        >
          {tooltip.placement === 'above'
            ? <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-950 dark:border-t-slate-800" />
            : <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-950 dark:border-b-slate-800" />}
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-400/15 text-sky-300"><CategoryIcon className="h-4 w-4" /></span>
            <span className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-wider text-sky-300">{u('tariffs.categories', 'Main category')}</span>
              <span className="mt-0.5 block text-xs font-semibold leading-4 text-slate-100">{label}</span>
            </span>
          </span>
          <span className="my-2.5 block h-px bg-white/10" />
          <span className="flex items-start gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-400/15 text-violet-300"><Layers3 className="h-3.5 w-3.5" /></span>
            <span className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500">{u('HS codes', 'HS codes')}</span>
              <span className="mt-1 flex flex-wrap gap-1">{codes.map((code) => <span key={code} className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-200">{code}</span>)}</span>
            </span>
          </span>
        </span>,
        document.body
      )}
    </>
  );
};

type DetailBadgeProps = {
  label: string;
  tooltipLabel: string;
  icon: LucideIcon;
  tone: string;
  stretch?: boolean;
};

const DetailBadge = ({ label, tooltipLabel, icon: Icon, tone, stretch = false }: DetailBadgeProps) => {
  const badgeRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const [tooltip, setTooltip] = useState<{ left: number; top: number; placement: 'above' | 'below' } | null>(null);

  const showTooltip = () => {
    const rect = badgeRef.current?.getBoundingClientRect();
    if (!rect) return;
    const halfWidth = 144;
    const viewportPadding = 12;
    const placement = rect.top >= 125 ? 'above' : 'below';
    setTooltip({
      left: Math.min(window.innerWidth - halfWidth - viewportPadding, Math.max(halfWidth + viewportPadding, rect.left + rect.width / 2)),
      top: placement === 'above' ? rect.top - 8 : rect.bottom + 8,
      placement,
    });
  };

  return (
    <>
      <span
        ref={badgeRef}
        role="button"
        tabIndex={0}
        aria-describedby={tooltipId}
        onMouseEnter={showTooltip}
        onMouseLeave={() => setTooltip(null)}
        onFocus={showTooltip}
        onBlur={() => setTooltip(null)}
        onClick={(event) => {
          event.stopPropagation();
          if (tooltip) setTooltip(null); else showTooltip();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            if (tooltip) setTooltip(null); else showTooltip();
          }
        }}
        className={cn(
          'flex cursor-pointer items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider outline-none transition-all hover:-translate-y-px hover:shadow-sm focus-visible:ring-2 focus-visible:ring-primary/40',
          stretch ? 'w-full min-w-0' : 'w-auto max-w-full shrink-0',
          tone
        )}
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span className="min-w-0 truncate">{label}</span>
      </span>

      {tooltip && createPortal(
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none fixed z-[500] w-max max-w-[calc(100vw-1.5rem)] rounded-xl bg-slate-950 px-3 py-2.5 text-left text-white shadow-xl dark:border dark:border-slate-700 dark:bg-slate-800"
          style={{ left: tooltip.left, top: tooltip.top, transform: tooltip.placement === 'above' ? 'translate(-50%, -100%)' : 'translateX(-50%)' }}
        >
          {tooltip.placement === 'above'
            ? <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-950 dark:border-t-slate-800" />
            : <span className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-950 dark:border-b-slate-800" />}
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-400/15 text-sky-300"><Icon className="h-4 w-4" /></span>
            <span className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-wider text-sky-300">{tooltipLabel}</span>
              <span className="mt-0.5 block break-words text-xs font-semibold leading-4 text-slate-100">{label}</span>
            </span>
          </span>
        </span>,
        document.body
      )}
    </>
  );
};

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
  tariffCategories?: TariffCategory[];
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
  tariffCategories = [],
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
  const isInteractive = hideSource ? Boolean(onOpenSetup) : Boolean(onOpenDetails);
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const hasBudget = Boolean(load.budget && load.budget > 0);
  const offerCurrency = load.price.split(' ')[0] || 'EUR';
  const bidState = getBidState(load.offers, userId, load.budget);
  const reservationPending = load.isNegotiable === false && Boolean(load.offers?.some((offer) =>
    offer.request_type === 'reservation_request'
      && offer.status === 'pending'
      && Number(offer.created_by_user_id) === Number(userId)
  ));
  const actionLabel = reservationPending
    ? u('reservation.pending', 'Waiting for customer confirmation')
    : ownerMode
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
  const hasHsCodes = !isStorage && Boolean(load.hsCodes?.length);
  const mainCategories = Array.from(
    (load.hsCodes || []).reduce((categories, item) => {
      const sectionIndex = hsSectionIndex(item.chapterCode || item.code);
      if (sectionIndex < 0) return categories;
      const existingCategory = categories.get(sectionIndex);
      if (existingCategory) {
        if (!existingCategory.codes.includes(item.code)) existingCategory.codes.push(item.code);
        return categories;
      }
      const catalogCategory = tariffCategories[sectionIndex];
      if (catalogCategory || item.section) {
        categories.set(sectionIndex, {
          id: catalogCategory?.id || String(sectionIndex),
          label: catalogCategory?.label || item.section || '',
          codes: [item.code],
        });
      }
      return categories;
    }, new Map<number, { id: string; label: string; codes: string[] }>()).entries()
  ).slice(0, 3).map(([sectionIndex, category]) => ({ ...category, sectionIndex }));
  const PriceTermsIcon = load.isNegotiable === false ? BadgeDollarSign : Handshake;
  const priceTermsLabel = load.isNegotiable === false
    ? u('postLoadModal.termsFixed', 'Fixed price')
    : u('postLoadModal.termsNegotiable', 'Negotiable');
  const priceTermsTone = load.isNegotiable === false
    ? 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400'
    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  const paymentTermsLabel = trPaymentTerms(lang, load.paymentTerms);
  const paymentTermsTone = load.paymentTerms === 'In Advance'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    : load.paymentTerms === 'On Delivery'
      ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400'
      : 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400';
  const isUrgent = load.urgency === 'Express';
  const UrgencyIcon = isUrgent ? Zap : Timer;
  const urgencyLabel = isUrgent ? u('feed.urgency.express', 'Express') : u('feed.urgency.standard', 'Standard');

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
              {isStorage && <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/90 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-200 shadow-sm">
                <Boxes className="w-3.5 h-3.5 text-primary" />
                <span>{load.pallets || 0} pal.</span>
              </div>}
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

      <div className="mt-3 min-w-0 border-y border-slate-100 dark:border-slate-800">
        <div className="flex min-h-14 items-center py-3">
          {hasHsCodes ? (
            <div className={cn('w-full gap-2', isGrid ? 'grid grid-cols-2' : 'flex flex-nowrap items-center')}>
              {mainCategories.length > 0
                ? mainCategories.slice(0, isGrid ? 2 : 3).map((category) => <MainCategoryBadge key={category.id} label={category.label} sectionIndex={category.sectionIndex} codes={category.codes} lang={lang} />)
                : Array.from({ length: Math.min(isGrid ? 2 : 3, load.hsCodes?.length || 1) }, (_, index) => (
                  <span key={index} className="h-6 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />
                ))}
            </div>
          ) : (
            <span
              className={cn(
                'inline-flex max-w-full px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider',
                goodsTone
              )}
            >
              <span className="truncate">{isStorage ? (load.storageType || u('feed.storage.anyType', 'Storage')) : trGoodsType(lang, load.goodsType)}</span>
            </span>
          )}
        </div>
        <div className="h-px w-full bg-slate-100 dark:bg-slate-800" />
        <div className={cn(
          'min-h-14 min-w-0 items-center gap-2 py-3',
          isGrid ? cn('grid', isStorage ? 'grid-cols-1' : 'grid-cols-3') : 'flex flex-wrap'
        )}>
          <DetailBadge
            icon={isStorage ? CalendarDays : PriceTermsIcon}
            label={isStorage ? (load.isStorageOngoing ? u('feed.storage.ongoing', 'Ongoing') : u('feed.storage.fixedTerm', 'Fixed term')) : priceTermsLabel}
            tooltipLabel={u('home.table.priceTerms', 'Price terms')}
            tone={priceTermsTone}
            stretch={isGrid}
          />
          {!isStorage && <>
            <DetailBadge
              icon={Scale}
              label={`${load.weight} kg`}
              tooltipLabel={u('home.table.weight', 'Weight')}
              tone="border-slate-300 bg-slate-500/10 text-slate-600 dark:border-slate-600 dark:text-slate-300"
              stretch={isGrid}
            />
            <DetailBadge
              icon={CreditCard}
              label={paymentTermsLabel}
              tooltipLabel={u('legacy.sidebarFilter.paymentTerms', 'Payment terms')}
              tone={paymentTermsTone}
              stretch={isGrid}
            />
            {!isGrid && (
              <DetailBadge
                icon={UrgencyIcon}
                label={urgencyLabel}
                tooltipLabel={u('feed.filters.urgency', 'Urgency')}
                tone={isUrgent ? 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'border-slate-300 bg-slate-500/10 text-slate-600 dark:border-slate-600 dark:text-slate-300'}
              />
            )}
          </>}
        </div>
      </div>

      {!hideSource && (
        <>
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
