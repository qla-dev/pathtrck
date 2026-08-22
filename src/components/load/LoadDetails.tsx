import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Box,
  Building2,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Coins,
  Hash,
  MapPin,
  ShieldCheck,
  Thermometer,
  Truck,
  Pencil,
  UserCheck,
  X,
} from 'lucide-react';

import { cn } from '../../lib/cn';
import {
  createEmptyOfferDraft,
  getBidState,
  getOfferLabel,
  offerDraftFromRecord,
  offerDraftToPayload,
  toFlatpickrDate,
  validateOfferDraft,
} from '../../lib/offerBid';
import { confirmAction, showError, showSuccess } from '../../lib/swal';
import { Language, Load, Offer } from '../../types';
import { Role } from '../../types';
import { api, ApiError } from '../../services/api';
import { ui } from '../../i18n';
import { Button } from '../ui/Button';
import { LoadStatusPicker } from './LoadStatusPicker';
import { LoadBidModal } from './LoadBidModal';

type LoadDetailsProps = {
  open: boolean;
  load: Load | null;
  onClose: () => void;
  lang: Language;
  role?: Role;
  userId?: number;
  onEdit?: (load: Load) => void;
  onChanged?: () => void;
};

type UiFn = (key: string, fallback: string) => string;

const getGoodsNote = (goodsType: string, u: UiFn) => {
  if (goodsType === 'Flammable') {
    return u(
      'legacy.loadDetails.goodsNoteFlammable',
      'UN-compliant packaging, no open heat sources, and ADR route preference required.'
    );
  }
  if (goodsType === 'Fragile') {
    return u(
      'legacy.loadDetails.goodsNoteFragile',
      'Shock-safe loading, anti-vibration support, and double handling checkpoints.'
    );
  }
  if (goodsType === 'High Value') {
    return u(
      'legacy.loadDetails.goodsNoteHighValue',
      'Sealed loading bay, signed chain of custody, and insured transfer protocol.'
    );
  }
  return u(
    'legacy.loadDetails.goodsNoteStandard',
    'Standard handling with route optimization and live checkpoint visibility.'
  );
};

const getStatusTone = (status: Load['status']) =>
  status === 'Posted'
    ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30'
    : status === 'Sent'
      ? 'text-amber-500 bg-amber-500/10 border-amber-500/30'
      : status === 'In delivery'
        ? 'text-sky-500 bg-sky-500/10 border-sky-500/30'
        : 'text-slate-500 bg-slate-500/10 border-slate-500/30';

const getGoodsTone = (goodsType: string) =>
  goodsType === 'Flammable'
    ? 'text-amber-500 bg-amber-500/10 border-amber-500/30'
    : goodsType === 'Fragile'
      ? 'text-cyan-500 bg-cyan-500/10 border-cyan-500/30'
      : goodsType === 'High Value'
        ? 'text-violet-500 bg-violet-500/10 border-violet-500/30'
        : 'text-slate-500 bg-slate-500/10 border-slate-500/30';

const getPaymentTone = (terms: Load['paymentTerms']) =>
  terms === 'In Advance'
    ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30'
    : terms === 'On Delivery'
      ? 'text-sky-500 bg-sky-500/10 border-sky-500/30'
      : 'text-blue-500 bg-blue-500/10 border-blue-500/30';

const apiLoadStatus = (status: Load['status']) => status.toLowerCase().replace(/\s+/g, '_');

const formatLoadDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value || '—'
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const getCountryCode = (location: string) => {
  const countryCode = location.split(',').at(-1)?.trim().toUpperCase() || '';
  return /^[A-Z]{2}$/.test(countryCode) ? countryCode : '';
};

const countryFlagUrl = (countryCode: string) => `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

export const LoadDetails = ({ open, load, onClose, lang, role, userId, onEdit, onChanged }: LoadDetailsProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [offers, setOffers] = useState<Array<Record<string, unknown>>>([]);
  const [drivers, setDrivers] = useState<Array<Record<string, unknown>>>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<Record<string, number>>({});
  const [offersLoading, setOffersLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [currentStatus, setCurrentStatus] = useState<Load['status']>(load?.status || 'Pending');
  const [statusChanging, setStatusChanging] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerDraft, setOfferDraft] = useState<Offer>(() => createEmptyOfferDraft());
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);

  useEffect(() => {
    setShowOfferForm(false);
  }, [open, load?.id]);

  useEffect(() => {
    if (open && load) setCurrentStatus(load.status);
  }, [open, load?.id, load?.status]);

  useEffect(() => {
    if (!open) return undefined;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !load || (role !== 'superadmin' && role !== 'driver')) return undefined;
    let active = true;
    setOffersLoading(true);
    setActionMessage('');
    (async () => {
      try {
        const offerResponse = await api.offers.list({ per_page: 100 });
        const loadOffers = offerResponse.data.filter((offer) => String(offer.load_id) === String(load.id));
        if (!active) return;
        setOffers(loadOffers);
        if (role === 'superadmin') {
          const driverResponse = await api.drivers.list({ per_page: 100 });
          if (!active) return;
          setDrivers(driverResponse.data);
          setSelectedDrivers(Object.fromEntries(loadOffers.flatMap((offer) => offer.driver_user_id ? [[String(offer.id), Number(offer.driver_user_id)]] : [])));
        }
      } catch (error) {
        if (active) setActionMessage(error instanceof Error ? error.message : 'Offers could not be loaded.');
      } finally {
        if (active) setOffersLoading(false);
      }
    })();
    return () => { active = false; };
  }, [open, load, role]);

  const approveOffer = async (offer: Record<string, unknown>) => {
    const driverId = selectedDrivers[String(offer.id)] || Number(offer.driver_user_id || 0);
    if (!driverId) { setActionMessage('Select a driver before approving the offer.'); return; }
    const confirmed = await confirmAction({
      title: 'Approve this offer?',
      text: 'The offer will be accepted, the selected driver assigned, and other pending offers rejected.',
      confirmText: 'Approve & assign',
      icon: 'warning',
    });
    if (!confirmed) return;
    setActionMessage('Approving offer...');
    try {
      await api.offers.approve(String(offer.id), driverId);
      setOffers((current) => current.map((item) => ({ ...item, status: item.id === offer.id ? 'accepted' : item.status === 'pending' ? 'rejected' : item.status })));
      setActionMessage('Offer approved and driver assigned.');
      void showSuccess('Offer approved', 'The driver has been assigned to this load.');
      onChanged?.();
    } catch (error) { setActionMessage(error instanceof Error ? error.message : 'Offer could not be approved.'); }
  };

  const changeStatus = async (nextStatus: Load['status']) => {
    if (!load || statusChanging || nextStatus === currentStatus) return;
    const confirmed = await confirmAction({
      title: `Change status to ${nextStatus}?`,
      text: 'The new status and exact change time will be saved immediately.',
      confirmText: 'Change status',
    });
    if (!confirmed) return;

    setStatusChanging(true);
    try {
      await api.loads.updateStatus(load.id, apiLoadStatus(nextStatus));
      setCurrentStatus(nextStatus);
      setActionMessage(`Status changed to ${nextStatus}.`);
      void showSuccess('Status changed', nextStatus);
      onChanged?.();
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : 'Status could not be changed.');
    } finally {
      setStatusChanging(false);
    }
  };

  const bookLoad = async () => {
    if (!load || isBooking) return;
    const confirmed = await confirmAction({
      title: u('legacy.loadDetails.bookConfirmTitle', 'Book this load?'),
      text: u('legacy.loadDetails.bookConfirmText', 'You will be assigned as the driver for this load right away.'),
      confirmText: u('legacy.loadDetails.bookConfirm', 'Book now'),
    });
    if (!confirmed) return;

    setIsBooking(true);
    try {
      await api.loads.book(load.id);
      setCurrentStatus('Sent');
      void showSuccess(u('legacy.loadDetails.bookedTitle', 'Load booked'), u('legacy.loadDetails.bookedText', 'You have been assigned to this load.'));
      onChanged?.();
      onClose();
    } catch (error) {
      void showError(
        u('legacy.loadDetails.bookFailedTitle', 'Could not book this load'),
        error instanceof ApiError ? error.message : undefined
      );
    } finally {
      setIsBooking(false);
    }
  };

  const submitOffer = async () => {
    if (!load || isSubmittingOffer) return;
    const amount = Number(offerDraft.amount);
    const minimumAmount = getBidState(offers, userId, load.budget).displayAmount ?? 0;
    if (!Number.isFinite(amount) || amount <= 0 || amount < minimumAmount) {
      void showError(
        u('Offer amount too low', 'Offer amount too low'),
        u('Offer minimum amount', 'Your offer must be at least {amount}.').replace('{amount}', `${offerCurrency} ${minimumAmount.toLocaleString()}`)
      );
      return;
    }

    const validationError = validateOfferDraft(offerDraft, u);
    if (validationError) {
      void showError(u('Incomplete offer', 'Incomplete offer'), validationError);
      return;
    }

    setIsSubmittingOffer(true);
    try {
      const payload = offerDraftToPayload(offerDraft);
      if (myOffer) {
        await api.offers.update(String(myOffer.id), payload);
      } else {
        await api.offers.create({
          load_id: Number(load.id),
          driver_user_id: userId,
          created_by_user_id: userId,
          ...payload,
        });
      }
      void showSuccess(
        myOffer ? u('legacy.loadDetails.offerUpdatedTitle', 'Offer updated') : u('legacy.loadDetails.offerSentTitle', 'Offer sent'),
        myOffer ? u('legacy.loadDetails.offerUpdatedText', 'Your updated offer has been sent to the customer.') : u('legacy.loadDetails.offerSentText', 'The customer will review your offer.')
      );
      setShowOfferForm(false);
      const refreshed = await api.offers.list({ per_page: 100 });
      setOffers(refreshed.data.filter((offer) => String(offer.load_id) === String(load.id)));
      onChanged?.();
    } catch (error) {
      void showError(
        u('legacy.loadDetails.offerFailedTitle', 'Could not send the offer'),
        error instanceof ApiError ? error.message : undefined
      );
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  if (!open || !load) return null;

  const goodsNote = getGoodsNote(load.goodsType, u);
  const pickupLabel = load.pickup || 'Nije definisano';
  const deliveryLabel = load.delivery || 'Nije definisano';
  const pickupCountryCode = getCountryCode(load.pickup);
  const deliveryCountryCode = getCountryCode(load.delivery);

  const offerCurrency = load.price.split(' ')[0] || 'EUR';
  const bidState = getBidState(offers, userId, load.budget);
  const myOffer = bidState.myOffer;
  const offerLabel = getOfferLabel(u, bidState, offerCurrency);
  const paymentTermsLabel = load.paymentTerms === 'Deferred' && load.paymentDueDays
    ? `${load.paymentTerms} · ${load.paymentDueDays} days`
    : load.paymentTerms || '—';
  const bookLabel = load.budget && load.budget > 0
    ? `${u('legacy.loadDetails.bookNow', 'Book now')} · ${offerCurrency} ${load.budget.toLocaleString()}`
    : u('legacy.loadDetails.bookNow', 'Book now');
  const openBidModal = () => {
    if (myOffer) {
      setOfferDraft(offerDraftFromRecord(myOffer, { loadId: String(load.id), currency: offerCurrency }));
    } else {
      const defaultValidUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      setOfferDraft(createEmptyOfferDraft({
        loadId: String(load.id),
        amount: bidState.displayAmount == null ? '' : String(bidState.displayAmount),
        currency: offerCurrency,
        validUntil: `${toFlatpickrDate(defaultValidUntil.toISOString())} 18:00`,
        availableDate: toFlatpickrDate(load.pickupWindowStart),
        exactLoadingDate: toFlatpickrDate(load.pickupWindowStart),
        estimatedDeliveryDate: toFlatpickrDate(load.deliveryWindowEnd),
        estimatedTransitDays: load.transitDays ? String(load.transitDays) : '',
      }));
    }
    setShowOfferForm(true);
  };

  return (
    <motion.div
      className="fixed inset-0 z-140 bg-white dark:bg-slate-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="absolute inset-0">
        <motion.div
          className="flex h-[100dvh] w-full min-h-0 flex-col overflow-hidden bg-white dark:bg-slate-950"
          initial={{ opacity: 0, y: 24, scale: 0.992 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="h-16 shrink-0 px-5 md:px-7 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-primary leading-none">
                {u('legacy.loadDetails.loadDetails', 'Load Details')}
              </p>
              <h2 className="text-base md:text-lg font-black dark:text-white truncate leading-tight mt-0.5">{load.title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:border-primary hover:text-primary transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 md:p-7">
            <div className="space-y-6">
              <div className="grid xl:grid-cols-12 gap-6">
                <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 xl:col-span-8">
                  <p className="mb-4 text-xs font-black uppercase tracking-wider text-primary">Load snapshot</p>
                  <div className="grid flex-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="flex h-full min-h-32 flex-col justify-center rounded-xl bg-slate-50 p-4 dark:bg-slate-950"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Building2 className="h-6 w-6" /></div><p className="mt-4 text-xs text-slate-500">{u('legacy.loadDetails.postedBy', 'Posted by')}</p><p className="mt-1 truncate text-sm font-bold dark:text-white">{load.author || '—'}</p></div>
                    <div className="flex h-full min-h-32 flex-col justify-center rounded-xl bg-slate-50 p-4 dark:bg-slate-950"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><CalendarDays className="h-6 w-6" /></div><p className="mt-4 text-xs text-slate-500">{u('legacy.loadDetails.postedDate', 'Posted date')}</p><p className="mt-1 text-sm font-bold dark:text-white">{formatLoadDate(load.date)}</p></div>
                    <div className="flex h-full min-h-32 flex-col justify-center rounded-xl bg-slate-50 p-4 dark:bg-slate-950"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Box className="h-6 w-6" /></div><p className="mt-4 text-xs text-slate-500">Goods type</p><p className="mt-1 truncate text-sm font-bold dark:text-white">{load.goodsType || 'General'}</p></div>
                    <div className="flex h-full min-h-32 flex-col justify-center rounded-xl bg-slate-50 p-4 dark:bg-slate-950"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><CalendarClock className="h-6 w-6" /></div><p className="mt-4 text-xs text-slate-500">{u('legacy.loadDetails.latestEta', 'Latest ETA')}</p><p className="mt-1 text-sm font-bold dark:text-white">{formatLoadDate(load.eta)}</p></div>
                  </div>
                </div>

                <div className="xl:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle2 className="w-5 h-5" />
                    <p className="text-xs font-black uppercase tracking-wider">
                      {u('legacy.loadDetails.readyActions', 'Ready Actions')}
                    </p>
                  </div>
                  {role === 'superadmin' ? <>
                    <Button className="w-full" onClick={() => onEdit?.(load)}><Pencil className="mr-2 h-4 w-4" />Edit load</Button>
                    <LoadStatusPicker lang={lang} status={currentStatus} isChanging={statusChanging} onChange={(status) => void changeStatus(status)} />
                  </> : role === 'driver' ? (
                    load.isNegotiable !== true ? (
                      <Button
                        className="w-full"
                        disabled={isBooking || currentStatus !== 'Posted'}
                        onClick={() => void bookLoad()}
                      >
                        {isBooking
                          ? u('legacy.loadDetails.booking', 'Booking…')
                          : currentStatus === 'Posted'
                            ? bookLabel
                            : u('legacy.loadDetails.alreadyBooked', 'Already booked')}
                      </Button>
                    ) : (
                      <Button
                        className="h-11 w-full rounded-xl shadow-lg shadow-primary/20"
                        disabled={currentStatus !== 'Posted'}
                        onClick={openBidModal}
                      >
                        {offerLabel}
                        {!myOffer && <ChevronRight className="ml-1 h-4 w-4" />}
                      </Button>
                    )
                  ) : null}
                </div>
              </div>

              <div className="grid gap-6 xl:grid-cols-12">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 xl:col-span-4">
                  <div className="space-y-4">
                    <p className="text-xs font-black uppercase tracking-wider text-primary">
                      {u('legacy.loadDetails.financialTerms', 'Financial Terms')}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                        <p className="text-xs text-slate-500">{u('legacy.loadDetails.price', 'Price')}</p>
                        <p className="mt-1 text-xl font-black text-primary">{load.price}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                        <p className="text-xs text-slate-500">{u('legacy.loadDetails.terms', 'Terms')}</p>
                        <p className="mt-1 text-sm font-bold dark:text-white">{paymentTermsLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                      <Coins className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {u(
                          'legacy.loadDetails.smartSplitPayoutAvailable',
                          'Smart split payout available after automated POD confirmation.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

              <section className="overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-cyan-100 text-slate-900 shadow-xl shadow-sky-950/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white xl:col-span-8">
                <div className="relative isolate flex h-full flex-col px-5 py-6 md:px-7 md:py-7">
                  <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl dark:bg-primary/25" />
                  <div className="absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-cyan-400/25 blur-3xl dark:bg-cyan-400/15" />
                  <div className="relative flex flex-wrap items-start justify-between gap-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">{u('legacy.loadDetails.routePlan', 'Route overview')}</p>
                    <span className={cn('rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-wider', getStatusTone(currentStatus))}>{currentStatus}</span>
                  </div>

                  <div className="relative mt-7 grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
                    <div className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-white/8 dark:shadow-none">
                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-300"><MapPin className="h-4 w-4" /><span className="text-[11px] font-black uppercase tracking-wider">{u('legacy.loadDetails.pickup', 'Pickup')}</span></div>
                      <p className="mt-3 flex items-center gap-2 text-lg font-bold">{pickupCountryCode && <img src={countryFlagUrl(pickupCountryCode)} alt="" className="h-4 w-6 rounded-sm object-cover" />}{pickupLabel}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Collection point</p>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-cyan-600 dark:text-cyan-200 md:flex-col">
                      <span className="h-px w-10 bg-cyan-500/60 md:h-8 md:w-px" />
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-500/50 bg-white/70 shadow-sm dark:bg-cyan-300/15 dark:shadow-none"><Truck className="h-5 w-5" /></div>
                      <span className="h-px w-10 bg-cyan-500/60 md:h-8 md:w-px" />
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-white/8 dark:shadow-none">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-300"><MapPin className="h-4 w-4" /><span className="text-[11px] font-black uppercase tracking-wider">{u('legacy.loadDetails.delivery', 'Delivery')}</span></div>
                      <p className="mt-3 flex items-center gap-2 text-lg font-bold">{deliveryCountryCode && <img src={countryFlagUrl(deliveryCountryCode)} alt="" className="h-4 w-6 rounded-sm object-cover" />}{deliveryLabel}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">Final delivery point</p>
                    </div>
                  </div>

                  <div className="relative mt-5 grid flex-1 grid-cols-2 items-stretch gap-3 border-t border-sky-200/80 pt-5 dark:border-white/10 md:grid-cols-4">
                    <div className="flex h-full min-h-24 items-center gap-3 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-white/8">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-300"><Hash className="h-5 w-5" /></div>
                      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Load ID</p><p className="mt-1 truncate font-bold">#{load.id}</p></div>
                    </div>
                    <div className="flex h-full min-h-24 items-center gap-3 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-white/8">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 dark:text-violet-300"><CalendarClock className="h-5 w-5" /></div>
                      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Transit</p><p className="mt-1 font-bold">{load.transitDays ? `${load.transitDays} days` : 'To be confirmed'}</p></div>
                    </div>
                    <div className="flex h-full min-h-24 items-center gap-3 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-white/8">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-300"><Box className="h-5 w-5" /></div>
                      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cargo</p><p className="mt-1 truncate font-bold">{load.cargoType || 'General cargo'}</p></div>
                    </div>
                    <div className="flex h-full min-h-24 items-center gap-3 rounded-2xl border border-white/80 bg-white/70 p-4 shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-white/8">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"><CalendarDays className="h-5 w-5" /></div>
                      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">ETA</p><p className="mt-1 truncate font-bold">{formatLoadDate(load.eta)}</p></div>
                    </div>
                  </div>
                </div>
              </section>
              </div>

              {role === 'superadmin' && <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4 flex items-center gap-2 text-primary"><UserCheck className="h-5 w-5" /><p className="text-xs font-black uppercase tracking-wider">Offers & driver assignment</p></div>
                {actionMessage && <p className="mb-3 text-sm font-semibold text-slate-500">{actionMessage}</p>}
                {offersLoading ? <p className="py-6 text-center text-sm text-slate-500">Loading offers...</p> : offers.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No offers for this load yet.</p> : <div className="space-y-3">{offers.map((offer) => {
                  const company = offer.company as { name?: string } | undefined;
                  const creator = offer.creator as { name?: string; email?: string } | undefined;
                  const driver = offer.driver as { id?: number; name?: string } | undefined;
                  return <div key={String(offer.id)} className="grid gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="font-black text-slate-900 dark:text-white">{company?.name || creator?.name || 'Independent offer'}</p><p className="text-xs text-slate-500">Offered by {creator?.name || creator?.email || '—'} · {String(offer.currency || 'EUR')} {Number(offer.amount || 0).toLocaleString()}</p>{offer.message && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{String(offer.message)}</p>}<span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-bold uppercase text-slate-500 dark:bg-slate-800">{String(offer.status || 'pending')}</span></div><div className="flex min-w-64 flex-col gap-2"><select value={selectedDrivers[String(offer.id)] || driver?.id || ''} onChange={(event) => setSelectedDrivers((current) => ({ ...current, [String(offer.id)]: Number(event.target.value) }))} disabled={offer.status === 'accepted'} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"><option value="">Select driver</option>{drivers.map((profile) => { const user = profile.user as { id?: number; name?: string } | undefined; return user?.id ? <option key={user.id} value={user.id}>{user.name || `Driver ${user.id}`}</option> : null; })}</select><Button disabled={offer.status !== 'pending'} onClick={() => void approveOffer(offer)}>{offer.status === 'accepted' ? 'Approved' : 'Approve & assign'}</Button></div></div>;
                })}</div>}
              </div>}

              <div className="grid xl:grid-cols-12 gap-6">
                <div className="space-y-6 xl:col-span-12">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className={cn('px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider', getStatusTone(currentStatus))}>
                        {currentStatus}
                      </span>
                      <span className={cn('px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider', getGoodsTone(load.goodsType))}>
                        {load.goodsType}
                      </span>
                      <span className={cn('px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider', getPaymentTone(load.paymentTerms))}>
                        {paymentTermsLabel}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {u('legacy.loadDetails.cargoWeight', 'Cargo Weight')}
                        </p>
                        <p className="mt-2 text-2xl font-black dark:text-white">{load.weight} kg</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {u('legacy.loadDetails.priceOffer', 'Price Offer')}
                        </p>
                        <p className="mt-2 text-2xl font-black text-primary">{load.price}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          {u('legacy.loadDetails.eta', 'ETA')}
                        </p>
                        <p className="mt-2 text-2xl font-black dark:text-white">{load.eta}</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="mb-3 flex items-center gap-2"><Hash className="h-4 w-4 text-primary" /><p className="text-xs font-black uppercase tracking-wider text-primary">Shipment requirements</p></div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Dimensions</p><p className="mt-1 text-sm font-bold dark:text-white">{[load.length, load.width, load.height].every((value) => value != null) ? `${load.length} × ${load.width} × ${load.height} m` : 'Not specified'}</p></div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"><p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500"><Thermometer className="h-3.5 w-3.5" /> Temperature</p><p className="mt-1 text-sm font-bold dark:text-white">{load.temperatureMin != null || load.temperatureMax != null ? `${load.temperatureMin ?? '—'}° to ${load.temperatureMax ?? '—'}°C` : 'Ambient'}</p></div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Handling</p><p className="mt-1 text-sm font-bold dark:text-white">{load.loadingMethods?.length ? load.loadingMethods.join(', ') : load.isFragile ? 'Fragile cargo' : 'Standard handling'}</p></div>
                        <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Priority</p><p className="mt-1 text-sm font-bold dark:text-white">{load.urgency || 'Standard'}{load.adrClass ? ` · ADR ${load.adrClass}` : ''}</p></div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-primary mb-4">
                      {u('legacy.loadDetails.handlingCompliance', 'Handling & Compliance')}
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                        <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-slate-700 dark:text-slate-300">{goodsNote}</p>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {u(
                            'legacy.loadDetails.liveRouteAlertsEnabled',
                            'Live route alerts are enabled for risk, congestion, and checkpoint delay anomalies.'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </motion.div>
      </div>
      {role === 'driver' && (
        <LoadBidModal
          open={showOfferForm}
          lang={lang}
          load={load}
          draft={offerDraft}
          onDraftChange={(patch) => setOfferDraft((current) => ({ ...current, ...patch }))}
          editing={Boolean(myOffer)}
          loading={isSubmittingOffer}
          role={role}
          userId={userId}
          onClose={() => setShowOfferForm(false)}
          onSubmit={() => void submitOffer()}
        />
      )}
    </motion.div>
  );
};
