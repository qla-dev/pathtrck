import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  Box,
  Building2,
  CalendarDays,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Coins,
  FileText,
  Handshake,
  Hash,
  Map as MapIcon,
  MapPin,
  Package,
  Repeat,
  Route as RouteIcon,
  Ruler,
  Warehouse,
  Weight,
  Zap,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Truck,
  Pencil,
  UsersRound,
  X,
} from 'lucide-react';

import { RouteMapModal } from '../maps/RouteMapModal';
import { cn } from '../../lib/cn';
import { estimateLoadDistanceKm } from '../../lib/loadGeo';
import {
  createEmptyOfferDraft,
  getBidState,
  getLatestCounter,
  getOfferLabel,
  offerDraftFromRecord,
  offerDraftToPayload,
  toFlatpickrDate,
  validateOfferDraft,
  validateWarehouseOfferDraft,
  warehouseOfferDraftToPayload,
  warehousePriceBasisFromRateUnit,
} from '../../lib/offerBid';
import { confirmAction, showError, showSuccess } from '../../lib/swal';
import { Language, Load, Offer } from '../../types';
import { Role } from '../../types';
import { isCompanyOperationsRole } from '../../lib/roles';
import { api, ApiError } from '../../services/api';
import { ui } from '../../i18n';
import { Button } from '../ui/Button';
import { LoadStatusPicker } from './LoadStatusPicker';
import { LenaAI } from '../lena/LenaAI';
import { CounterOfferReviewModal } from './CounterOfferReviewModal';
import { LoadAssignmentModal } from './LoadAssignmentModal';
import { LoadBidModal } from './LoadBidModal';
import { WarehouseBidModal, seedWarehouseDraft } from './WarehouseBidModal';
import { LoadOffersPanel } from './LoadOffersPanel';
import { CustomsDocumentList } from './CustomsDocumentList';

type LoadDetailsPrebookProps = {
  open: boolean;
  load: Load | null;
  onClose: () => void;
  lang: Language;
  role?: Role;
  userId?: number;
  companyIds?: number[];
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

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const getCountryCode = (location: string) => {
  const countryCode = location.split(',').at(-1)?.trim().toUpperCase() || '';
  return /^[A-Z]{2}$/.test(countryCode) ? countryCode : '';
};

const countryFlagUrl = (countryCode: string) => `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;

// One stop on the vertical route timeline, the same shape the post-load form uses for its route
// column - icon rail on the left, dashed line running down to the next stop.
const RouteStop = ({ icon: Icon, tone, label, value, countryCode, note, last = false }: {
  icon: typeof MapPin;
  tone: string;
  label: string;
  value: string;
  countryCode?: string;
  note?: string;
  last?: boolean;
}) => (
  <div className={cn('flex min-w-0 gap-3', !last && 'flex-1')}>
    <div className="flex flex-col items-center self-stretch">
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-white shadow-lg', tone)}>
        <Icon className="h-4 w-4" />
      </span>
      {!last && <span className="my-1 min-h-6 w-0 flex-1 border-l-2 border-dashed border-sky-300/80 dark:border-sky-700/80" />}
    </div>
    <div className={cn('min-w-0', !last && 'pb-3')}>
      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="flex items-center gap-1.5 truncate text-sm font-bold text-slate-900 dark:text-white">
        {countryCode && <img src={countryFlagUrl(countryCode)} alt="" className="h-3 w-[18px] shrink-0 rounded-sm object-cover" />}
        <span className="truncate">{value}</span>
      </p>
      {note && <p className="mt-0.5 truncate text-[10px] text-slate-400">{note}</p>}
    </div>
  </div>
);

// Compact key/value tile shared by the snapshot, financial and cargo blocks - one padding scale
// for the whole modal instead of every block picking its own.
const InfoTile = ({ icon: Icon, label, value, tone = 'text-primary', surface = 'bg-primary/10' }: {
  icon?: typeof MapPin;
  label: string;
  value: string;
  tone?: string;
  surface?: string;
}) => (
  <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
    {Icon && (
      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', surface, tone)}>
        <Icon className="h-4 w-4" />
      </span>
    )}
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{value}</p>
    </div>
  </div>
);

export const LoadDetailsPrebook = ({ open, load, onClose, lang, role, userId, companyIds = [], onEdit, onChanged }: LoadDetailsPrebookProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [offers, setOffers] = useState<Array<Record<string, unknown>>>([]);
  const [drivers, setDrivers] = useState<Array<Record<string, unknown>>>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [routeMapOpen, setRouteMapOpen] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [currentStatus, setCurrentStatus] = useState<Load['status']>(load?.status || 'Pending');
  const [statusChanging, setStatusChanging] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerDraft, setOfferDraft] = useState<Offer>(() => createEmptyOfferDraft());
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [lenaOpen, setLenaOpen] = useState(false);
  const [companies, setCompanies] = useState<Array<Record<string, unknown>>>([]);
  const [assignDriverNow, setAssignDriverNow] = useState(false);
  const [viewingCounter, setViewingCounter] = useState<Record<string, unknown> | null>(null);
  const [acceptingCounter, setAcceptingCounter] = useState(false);
  const [bookingDriverId, setBookingDriverId] = useState('');
  const [bookingCompanyId, setBookingCompanyId] = useState('');
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [bodyView, setBodyView] = useState<'details' | 'offers'>('details');
  const [isClosing, setIsClosing] = useState(false);
  // A storage request is bid on with capacity rather than with a truck, so it gets its own form
  // and its own payload - everything below that touches offers branches on this.
  const isStorage = Boolean(load?.forStorage || load?.transportType === 'warehouse');

  const requestClose = () => setIsClosing(true);

  useEffect(() => {
    setShowOfferForm(false);
    if (open) setIsClosing(false);
  }, [open, load?.id]);

  useEffect(() => {
    if (open && load) setCurrentStatus(load.status);
  }, [open, load?.id, load?.status]);

  useEffect(() => {
    if (!open) return undefined;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') requestClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open]);

  useEffect(() => {
    setAssignDriverNow(false);
    setBookingDriverId('');
    setBookingCompanyId('');
    setAssignmentOpen(false);
    setBodyView('details');
    setOffers(load?.offers ?? []);
  }, [open, load?.id]);

  useEffect(() => {
    if (!open || !load || (role !== 'superadmin' && role !== 'user' && role !== 'driver' && !isCompanyOperationsRole(role))) return undefined;
    let active = true;
    setOffersLoading(true);
    setActionMessage('');
    (async () => {
      try {
        if (role === 'superadmin' || role === 'user' || role === 'driver' || isCompanyOperationsRole(role)) {
          const offerResponse = await api.offers.list({ per_page: 100 });
          const loadOffers = offerResponse.data.filter((offer) => String(offer.load_id) === String(load.id));
          if (!active) return;
          setOffers(loadOffers);
        }
        if (role === 'superadmin' || isCompanyOperationsRole(role)) {
          // Backend already scopes this: superadmin sees every driver, a company sees only its own.
          const driverResponse = await api.drivers.list({ per_page: 100 });
          if (!active) return;
          setDrivers(driverResponse.data);
        }
        if (role === 'superadmin') {
          const companyResponse = await api.companies.list({ per_page: 100 });
          if (!active) return;
          setCompanies(companyResponse.data);
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
    const offerDriverId = Number(offer.driver_user_id || 0);
    const confirmed = await confirmAction({
      title: u('reservation.acceptTitle', 'Accept this reservation request?'),
      text: u('reservation.acceptText', 'The selected carrier will be assigned and the booking will be confirmed.'),
      confirmText: u('reservation.accept', 'Accept request'),
      cancelText: u('common.cancel', 'Cancel'),
      icon: 'warning',
    });
    if (!confirmed) return;
    setActionMessage('Approving offer...');
    try {
      await api.offers.approve(String(offer.id), offerDriverId || undefined);
      setOffers((current) => current.map((item) => ({ ...item, status: item.id === offer.id ? 'accepted' : item.status === 'pending' ? 'rejected' : item.status })));
      setActionMessage(u('reservation.accepted', 'Reservation accepted and booking confirmed.'));
      void showSuccess(u('reservation.acceptedTitle', 'Booking confirmed'), u('reservation.accepted', 'Reservation accepted and booking confirmed.'));
      onChanged?.();
    } catch (error) { setActionMessage(error instanceof Error ? error.message : 'Offer could not be approved.'); }
  };

  const rejectOffer = async (offer: Record<string, unknown>) => {
    const confirmed = await confirmAction({
      title: 'Reject this offer?',
      text: 'The carrier will be notified that their offer was not accepted.',
      confirmText: 'Reject',
      icon: 'warning',
    });
    if (!confirmed) return;
    setActionMessage('Rejecting offer...');
    try {
      await api.offers.update(String(offer.id), { status: 'rejected' });
      setOffers((current) => current.map((item) => (item.id === offer.id ? { ...item, status: 'rejected' } : item)));
      setActionMessage('Offer rejected.');
      void showSuccess('Offer rejected', 'The offer has been marked as rejected.');
    } catch (error) { setActionMessage(error instanceof Error ? error.message : 'Offer could not be rejected.'); }
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

  const bookLoad = async (options?: { companyId?: number; driverUserId?: number }, confirmedInAssignmentModal = false) => {
    if (!load || isBooking) return;
    if (!confirmedInAssignmentModal) {
      const pickupWindow = [load.pickupWindowStart, load.pickupWindowEnd]
        .filter(Boolean).map((value) => formatLoadDate(String(value))).join(' – ') || '—';
      const deliveryWindow = [load.deliveryWindowStart, load.deliveryWindowEnd]
        .filter(Boolean).map((value) => formatLoadDate(String(value))).join(' – ') || '—';
      const equipment = load.bodyTypes?.join(', ') || load.truckType || '—';
      const payment = load.paymentDueDays ? `${load.paymentDueDays} ${u('common.days', 'days')}` : load.paymentTerms;
      const confirmed = await confirmAction({
        title: u('reservation.requestTitle', 'Request booking'),
        html: `<div style="text-align:left;line-height:1.75"><p>${escapeHtml(u('reservation.confirmIntro', 'By submitting this request, you confirm:'))}</p><ul style="margin:.5rem 0 0 1.25rem;list-style:disc"><li><strong>${escapeHtml(u('reservation.fixedPrice', 'Fixed price'))}:</strong> ${escapeHtml(load.price)}</li><li><strong>${escapeHtml(u('reservation.pickup', 'Pickup'))}:</strong> ${escapeHtml(pickupWindow)}</li><li><strong>${escapeHtml(u('reservation.delivery', 'Delivery'))}:</strong> ${escapeHtml(deliveryWindow)}</li><li><strong>${escapeHtml(u('reservation.equipment', 'Equipment'))}:</strong> ${escapeHtml(equipment)}</li><li><strong>${escapeHtml(u('reservation.payment', 'Payment'))}:</strong> ${escapeHtml(payment)}</li><li>${escapeHtml(u('reservation.available', 'Vehicle and driver are available'))}</li><li>${escapeHtml(u('reservation.requirements', 'Listed requirements are accepted'))}</li></ul></div>`,
        confirmText: u('reservation.submit', 'Submit reservation request'),
        cancelText: u('common.cancel', 'Cancel'),
      });
      if (!confirmed) return;
    }

    setIsBooking(true);
    try {
      await api.loads.book(load.id, options);
      void showSuccess(u('reservation.submittedTitle', 'Reservation request sent'), u('reservation.submittedText', 'The customer must approve it before the load is assigned.'));
      onChanged?.();
      requestClose();
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
    if (!Number.isFinite(amount) || amount <= 0 || (offerDraft.priceBasis === 'best_bid' && amount < minimumAmount)) {
      void showError(
        u('Offer amount too low', 'Offer amount too low'),
        u('Offer minimum amount', 'Your offer must be at least {amount}.').replace('{amount}', `${offerCurrency} ${minimumAmount.toLocaleString()}`)
      );
      return;
    }

    const validationError = isStorage ? validateWarehouseOfferDraft(offerDraft, u) : validateOfferDraft(offerDraft, u);
    if (validationError) {
      void showError(u('Incomplete offer', 'Incomplete offer'), validationError);
      return;
    }

    setIsSubmittingOffer(true);
    try {
      const payload = isStorage ? warehouseOfferDraftToPayload(offerDraft) : offerDraftToPayload(offerDraft);
      if (myOffer) {
        await api.offers.update(String(myOffer.id), payload);
      } else {
        await api.offers.create({
          load_id: Number(load.id),
          company_id: isCompanyOperationsRole(role) ? companyIds[0] : undefined,
          driver_user_id: role === 'driver' ? userId : undefined,
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

  const sendCounterOffer = async (payload: Record<string, unknown>) => {
    if (!load) return;
    try {
      await api.offers.create(payload);
      void showSuccess(u('Counter offer sent', 'Counter offer sent'), u('The carrier will see your counter offer.', 'The carrier will see your counter offer.'));
      const refreshed = await api.offers.list({ per_page: 100 });
      setOffers(refreshed.data.filter((offer) => String(offer.load_id) === String(load.id)));
      onChanged?.();
    } catch (error) {
      void showError(u('Counter offer failed', 'Counter offer failed'), error instanceof ApiError ? error.message : undefined);
      throw error;
    }
  };

  if (!load) return null;

  const goodsNote = getGoodsNote(load.goodsType, u);
  const pickupLabel = load.pickup || 'Nije definisano';
  const deliveryLabel = load.delivery || 'Nije definisano';
  const routeDistanceKm = load.pickup && load.delivery ? estimateLoadDistanceKm(load.pickup, load.delivery) : 0;
  const canShowRouteMap = Boolean(load.pickupPosition && load.deliveryPosition);
  const trackingLabel = load.trackingNumber || '—';
  const loadCurrency = load.price.split(' ')[0] || 'EUR';
  const cargoValueLabel = load.cargoValue ? `${loadCurrency} ${load.cargoValue.toLocaleString()}` : '—';
  const pickupCountryCode = getCountryCode(load.pickup);
  const deliveryCountryCode = getCountryCode(load.delivery);
  const preDeliveryLabel = load.preDeliveryStatus
    ? u(`load.preDelivery.${load.preDeliveryStatus}`, load.preDeliveryStatus.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()))
    : null;
  const bookingStatusLabel = load.bookingStatus
    ? u(`booking.status.${load.bookingStatus}`, load.bookingStatus.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()))
    : null;

  const offerCurrency = load.price.split(' ')[0] || 'EUR';
  const bidState = getBidState(offers, userId, load.budget);
  const myOffer = bidState.myOffer;
  const knownOffers = [...(load.offers ?? []), ...offers];
  const myReservation = knownOffers.find((offer) =>
    offer.request_type === 'reservation_request'
      && Number(offer.created_by_user_id) === Number(userId)
      && offer.status === 'pending'
  );
  const reservationPending = Boolean(myReservation);
  const offerLabel = getOfferLabel(u, bidState, offerCurrency);
  const latestCounter = myOffer ? getLatestCounter(offers, String(myOffer.id), userId) : null;

  const acceptCounterOffer = async () => {
    if (!viewingCounter || !myOffer) return;
    setAcceptingCounter(true);
    try {
      const draft = offerDraftFromRecord(viewingCounter);
      await api.offers.update(String(myOffer.id), { ...offerDraftToPayload(draft), is_counter: false });
      void showSuccess(u('Counter accepted', 'Counter accepted'), u('Your offer has been updated with the new terms.', 'Your offer has been updated with the new terms.'));
      setViewingCounter(null);
      const refreshed = await api.offers.list({ per_page: 100 });
      setOffers(refreshed.data.filter((offer) => String(offer.load_id) === String(load.id)));
      onChanged?.();
    } catch (error) {
      void showError(u('Could not accept the counter offer', 'Could not accept the counter offer'), error instanceof ApiError ? error.message : undefined);
    } finally {
      setAcceptingCounter(false);
    }
  };

  const bookLabel = `${u('reservation.requestPrefix', 'Request booking at')} ${load.price}`;
  const paymentTermsLabel = load.paymentDueDays
    ? `${load.paymentDueDays} ${u('common.days', 'days')}`
    : load.paymentTerms || '—';
  const actionPriceLabel = load.isNegotiable === true
    ? u('Highest offer', 'Highest offer')
    : u('reservation.fixedTargetPrice', 'Fixed target price');
  const actionPriceValue = load.isNegotiable === true && bidState.highestBidAmount != null
    ? `${offerCurrency} ${bidState.highestBidAmount.toLocaleString()}`
    : load.price;
  const bookingSummary = (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-xl border border-primary/15 bg-primary/5 p-3">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500"><Coins className="h-3.5 w-3.5 text-primary" />{actionPriceLabel}</div>
        <p className="mt-1 truncate text-base font-black text-primary">{actionPriceValue}</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500"><CalendarClock className="h-3.5 w-3.5 text-primary" />{u('reservation.payment', 'Payment')}</div>
        <p className="mt-1 truncate text-sm font-bold text-slate-800 dark:text-white">{paymentTermsLabel}</p>
      </div>
    </div>
  );
  const openBidModal = () => {
    if (myOffer) {
      setOfferDraft(offerDraftFromRecord(myOffer, { loadId: String(load.id), currency: offerCurrency }));
    } else {
      const defaultValidUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const base = createEmptyOfferDraft({
        loadId: String(load.id),
        amount: bidState.displayAmount == null ? '' : String(bidState.displayAmount),
        currency: offerCurrency,
        validUntil: `${toFlatpickrDate(defaultValidUntil.toISOString())} 18:00`,
        ...(isStorage
          // The bid opens on the request's own terms: the customer's pricing unit, the day the
          // goods are due to arrive, and the quantity they asked to store.
          ? {
              priceBasis: warehousePriceBasisFromRateUnit(load.storageRateUnit),
              availableFrom: toFlatpickrDate(load.storageStartDate),
              availableCapacity: load.pallets != null ? String(load.pallets) : '',
            }
          : {
              availableDate: toFlatpickrDate(load.pickupWindowStart),
              exactLoadingDate: toFlatpickrDate(load.pickupWindowStart),
              estimatedDeliveryDate: toFlatpickrDate(load.deliveryWindowEnd),
              estimatedTransitDays: load.transitDays ? String(load.transitDays) : '',
            }),
      });
      setOfferDraft(isStorage ? seedWarehouseDraft(load, base) : base);
    }
    setShowOfferForm(true);
  };

  return (
    <AnimatePresence onExitComplete={() => { if (isClosing) onClose(); }}>
    {open && !isClosing && (
    <motion.div
      className="fixed inset-0 z-140 bg-white dark:bg-slate-950"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="absolute inset-0">
        <motion.div
          className="flex h-[100dvh] w-full min-h-0 flex-col overflow-hidden bg-white dark:bg-slate-950"
          initial={{ opacity: 0, y: 24, scale: 0.992 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.996 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="h-16 shrink-0 px-5 md:px-7 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-primary leading-none">
                {u('legacy.loadDetails.loadDetails', 'Load Details')}
              </p>
              <h2 className="mt-0.5 flex min-w-0 items-baseline gap-1.5 text-base font-black leading-tight dark:text-white md:text-lg">
                <span className="shrink-0 font-mono text-primary">{trackingLabel}</span>
                <span className="shrink-0 text-slate-300 dark:text-slate-600">·</span>
                <span className="truncate">{load.title}</span>
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {role === 'superadmin' && (
                <>
                  <button
                    type="button"
                    onClick={() => setBodyView((current) => current === 'details' ? 'offers' : 'details')}
                    className="relative hidden h-10 w-40 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 text-xs font-bold text-primary transition-all hover:bg-primary/10 sm:inline-flex"
                  >
                    {bodyView === 'offers' ? <FileText className="h-4 w-4 shrink-0" /> : <UsersRound className="h-4 w-4 shrink-0" />}
                    <span>{bodyView === 'offers' ? u('View details', 'View details') : u('View offers', 'View offers')}</span>
                    {bodyView === 'details' && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-black text-white">{offers.length}</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBodyView((current) => current === 'details' ? 'offers' : 'details')}
                    aria-label={bodyView === 'offers' ? u('View details', 'View details') : u('View offers', 'View offers')}
                    className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-primary/30 bg-primary/5 text-primary transition-all hover:bg-primary/10 sm:hidden"
                  >
                    {bodyView === 'offers' ? <FileText className="h-5 w-5" /> : <UsersRound className="h-5 w-5" />}
                    {bodyView === 'details' && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-white">{offers.length}</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit?.(load)}
                    className="hidden h-10 w-40 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 text-xs font-bold text-primary transition-all hover:bg-primary/10 lg:inline-flex"
                  >
                    <Pencil className="h-4 w-4 shrink-0" />
                    <span>{u('Edit load', 'Edit load')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit?.(load)}
                    aria-label={u('Edit load', 'Edit load')}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-primary/30 bg-primary/5 text-primary transition-all hover:bg-primary/10 lg:hidden"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setLenaOpen(true)}
                className="hidden sm:inline-flex h-10 items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 text-xs font-bold text-primary transition-all hover:bg-primary/10 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                {u('Ask LenaAI about this Load', 'Ask LenaAI about this Load')}
              </button>
              <button
                type="button"
                onClick={() => setLenaOpen(true)}
                aria-label={u('Ask LenaAI about this Load', 'Ask LenaAI about this Load')}
                className="sm:hidden h-10 w-10 rounded-xl border border-primary/30 bg-primary/5 text-primary flex items-center justify-center hover:bg-primary/10 transition-all cursor-pointer"
              >
                <Sparkles className="w-5 h-5" />
              </button>
              {role === 'superadmin' && (
                <>
                  <LoadStatusPicker
                    lang={lang}
                    status={currentStatus}
                    isChanging={statusChanging}
                    onChange={(status) => void changeStatus(status)}
                    availableStatuses={['Posted', 'Opened', 'Sent', 'In delivery', 'Pending', 'Cancelled']}
                    className="hidden w-44 lg:block [&_button]:h-10"
                  />
                  <LoadStatusPicker
                    compact
                    lang={lang}
                    status={currentStatus}
                    isChanging={statusChanging}
                    onChange={(status) => void changeStatus(status)}
                    availableStatuses={['Posted', 'Opened', 'Sent', 'In delivery', 'Pending', 'Cancelled']}
                    className="lg:hidden"
                  />
                </>
              )}
              <button
                type="button"
                onClick={requestClose}
                className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:border-primary hover:text-primary transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            {(role === 'superadmin' || (role === 'user' && load.customerUserId === userId)) && bodyView === 'offers' ? (
              <LoadOffersPanel
                lang={lang}
                load={load}
                offers={offers}
                loading={offersLoading}
                actionMessage={actionMessage}
                userId={userId}
                onApprove={(offer) => void approveOffer(offer)}
                onReject={(offer) => void rejectOffer(offer)}
                onSendCounter={sendCounterOffer}
                onBack={role === 'user' ? () => setBodyView('details') : undefined}
              />
            ) : (
            <div className="space-y-4">
              <div className="grid xl:grid-cols-12 gap-4">
                <div className="xl:col-span-8">
                  <div className="grid h-full content-between gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <InfoTile icon={Building2} label={u('legacy.loadDetails.postedBy', 'Posted by')} value={load.author || '—'} />
                    <InfoTile icon={CalendarDays} label={u('legacy.loadDetails.postedDate', 'Posted date')} value={formatLoadDate(load.date)} />
                    <InfoTile icon={Box} label={u('legacy.loadDetails.goodsType', 'Goods type')} value={load.goodsType || 'General'} />
                    <InfoTile icon={CalendarClock} label={u('legacy.loadDetails.latestEta', 'Latest ETA')} value={formatLoadDate(load.eta)} />
                    <InfoTile icon={Weight} label={u('legacy.loadDetails.cargoWeight', 'Cargo Weight')} value={`${load.weight} kg`} />
                    <InfoTile icon={Ruler} label={u('legacy.loadDetails.dimensions', 'Dimensions')} value={[load.length, load.width, load.height].every((value) => value != null) ? `${load.length} × ${load.width} × ${load.height} m` : u('legacy.loadDetails.notSpecified', 'Not specified')} />
                    <InfoTile icon={Package} label={u('postLoadModal.unitCount', 'Quantity')} value={load.pallets ? String(load.pallets) : u('legacy.loadDetails.notSpecified', 'Not specified')} />
                    <InfoTile icon={Box} label={u('postLoadModal.volume', 'Volume')} value={load.volume ? `${load.volume} m³` : u('legacy.loadDetails.notSpecified', 'Not specified')} />
                    <InfoTile icon={Thermometer} label={u('legacy.loadDetails.temperature', 'Temperature')} value={load.temperatureMin != null || load.temperatureMax != null ? `${load.temperatureMin ?? '—'}° to ${load.temperatureMax ?? '—'}°C` : 'Ambient'} />
                    <InfoTile icon={ShieldCheck} label={u('legacy.loadDetails.handling', 'Handling')} value={load.loadingMethods?.length ? load.loadingMethods.join(', ') : load.isFragile ? 'Fragile cargo' : 'Standard handling'} />
                    <InfoTile icon={Zap} label={u('legacy.loadDetails.priority', 'Priority')} value={`${load.urgency || 'Standard'}${load.adrClass ? ` · ADR ${load.adrClass}` : ''}`} />
                    <InfoTile
                      icon={Handshake}
                      label={u('home.table.priceTerms', 'Price terms')}
                      value={load.isNegotiable === false
                        ? u('postLoadModal.termsFixed', 'Fixed price')
                        : u('postLoadModal.termsNegotiable', 'Negotiable')}
                    />
                  </div>
                </div>

                <div className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 xl:col-span-4">
                  <div className="flex flex-1 items-center gap-2 text-primary">
                    <CheckCircle2 className="w-4 h-4" />
                    <p className="text-[11px] font-black uppercase tracking-wider">
                      {u('legacy.loadDetails.readyActions', 'Ready Actions')}
                    </p>
                  </div>
                  {role === 'superadmin' ? <>
                    {currentStatus === 'Posted' && load.isNegotiable !== true && (
                      <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                        {bookingSummary}
                        <Button
                          className="h-11 w-full rounded-xl shadow-lg shadow-primary/20"
                          disabled={isBooking || reservationPending}
                          onClick={() => setAssignmentOpen(true)}
                        >
                          {reservationPending
                            ? u('reservation.pending', 'Waiting for customer confirmation')
                            : isBooking
                              ? u('reservation.submitting', 'Submitting…')
                              : bookLabel}
                        </Button>
                      </div>
                    )}
                    {currentStatus === 'Posted' && load.isNegotiable === true && (
                      <div className="space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                        {bookingSummary}
                        <div className="flex items-center gap-2">
                          <Button
                            className="h-11 flex-1 rounded-xl shadow-lg shadow-primary/20"
                            disabled={isSubmittingOffer}
                            onClick={openBidModal}
                          >
                            {offerLabel}
                            {!myOffer && <ChevronRight className="ml-1 h-4 w-4" />}
                          </Button>
                          {latestCounter && (
                            <Button
                              variant="outline"
                              className="h-11 flex-1 rounded-xl border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 dark:border-primary/30 dark:bg-primary/15"
                              onClick={() => setViewingCounter(latestCounter)}
                            >
                              <Repeat className="mr-2 h-4 w-4" />{u('Vidi povratnu ponudu', 'Vidi povratnu ponudu')}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </> : role === 'user' && load.customerUserId === userId ? (
                    <div className="grid gap-2 border-t border-slate-100 pt-3 dark:border-slate-800 sm:grid-cols-2 xl:grid-cols-1">
                      <Button
                        variant="outline"
                        className="h-11 w-full rounded-xl"
                        onClick={() => onEdit?.(load)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        {u('Edit load', 'Edit load')}
                      </Button>
                      <Button
                        className="h-11 w-full rounded-xl shadow-lg shadow-primary/20"
                        onClick={() => setBodyView('offers')}
                      >
                        <UsersRound className="mr-2 h-4 w-4" />
                        {u('offers.view', 'View offers')}
                        <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-black">{offers.length}</span>
                      </Button>
                    </div>
                  ) : isCompanyOperationsRole(role) ? (
                    currentStatus === 'Posted' ? (
                      <div className="space-y-3">
                        {bookingSummary}
                        <div className="flex items-center gap-2">
                          <Button
                            className="h-11 flex-1 rounded-xl shadow-lg shadow-primary/20"
                            disabled={isBooking || isSubmittingOffer || (load.isNegotiable !== true && reservationPending)}
                            onClick={load.isNegotiable === true ? openBidModal : () => setAssignmentOpen(true)}
                          >
                            {load.isNegotiable === true ? offerLabel : reservationPending ? u('reservation.pending', 'Pending customer approval') : (isBooking ? u('reservation.submitting', 'Submitting…') : bookLabel)}
                            {load.isNegotiable === true && !myOffer && <ChevronRight className="ml-1 h-4 w-4" />}
                          </Button>
                          {load.isNegotiable === true && latestCounter && (
                            <Button
                              variant="outline"
                              className="h-11 flex-1 rounded-xl border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 dark:border-primary/30 dark:bg-primary/15"
                              onClick={() => setViewingCounter(latestCounter)}
                            >
                              <Repeat className="mr-2 h-4 w-4" />{u('Vidi povratnu ponudu', 'Vidi povratnu ponudu')}
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">{u('legacy.loadDetails.alreadyBooked', 'Already booked')}</p>
                    )
                  ) : role === 'driver' ? (
                    <div className="space-y-3">
                    {bookingSummary}
                    {load.isNegotiable !== true ? (
                      <Button
                        className="h-11 w-full rounded-xl shadow-lg shadow-primary/20"
                        disabled={isBooking || currentStatus !== 'Posted' || reservationPending}
                        onClick={() => void bookLoad()}
                      >
                        {isBooking
                          ? u('legacy.loadDetails.booking', 'Booking…')
                          : currentStatus === 'Posted'
                            ? reservationPending ? u('reservation.pending', 'Pending customer approval') : bookLabel
                            : u('legacy.loadDetails.alreadyBooked', 'Already booked')}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          className="h-11 flex-1 rounded-xl shadow-lg shadow-primary/20"
                          disabled={currentStatus !== 'Posted'}
                          onClick={openBidModal}
                        >
                          {offerLabel}
                          {!myOffer && <ChevronRight className="ml-1 h-4 w-4" />}
                        </Button>
                        {latestCounter && (
                          <Button
                            variant="outline"
                            className="h-11 flex-1 rounded-xl border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 dark:border-primary/30 dark:bg-primary/15"
                            onClick={() => setViewingCounter(latestCounter)}
                          >
                            <Repeat className="mr-2 h-4 w-4" />{u('Vidi povratnu ponudu', 'Vidi povratnu ponudu')}
                          </Button>
                        )}
                      </div>
                    )}
                    </div>
                  ) : role === 'warehouse' && isStorage ? (
                    // A storage request is answered by the warehouses it was posted to, so this is
                    // the one role that bids on it - and only ever with the warehousing form.
                    <div className="space-y-3">
                      {bookingSummary}
                      <div className="flex items-center gap-2">
                        <Button
                          className="h-11 flex-1 rounded-xl shadow-lg shadow-primary/20"
                          disabled={isSubmittingOffer || currentStatus !== 'Posted'}
                          onClick={openBidModal}
                        >
                          {currentStatus === 'Posted' ? offerLabel : u('legacy.loadDetails.alreadyBooked', 'Already booked')}
                          {currentStatus === 'Posted' && !myOffer && <ChevronRight className="ml-1 h-4 w-4" />}
                        </Button>
                        {latestCounter && (
                          <Button
                            variant="outline"
                            className="h-11 flex-1 rounded-xl border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 dark:border-primary/30 dark:bg-primary/15"
                            onClick={() => setViewingCounter(latestCounter)}
                          >
                            <Repeat className="mr-2 h-4 w-4" />{u('Vidi povratnu ponudu', 'Vidi povratnu ponudu')}
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-12">
                {/* Route column, same shape as the post-load form's - the two stops on a timeline,
                    the distance between them, and the map that draws the actual driving route. */}
                <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 xl:col-span-3">
                  <div className="mb-3 flex items-center gap-2 text-primary">
                    <RouteIcon className="h-4 w-4" />
                    <p className="text-[10px] font-black uppercase tracking-wider">{u('postLoadModal.routeSummaryTitle', 'Route')}</p>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <RouteStop
                      icon={MapPin}
                      tone="bg-emerald-500 shadow-emerald-500/20"
                      label={u('legacy.loadDetails.pickup', 'Pickup')}
                      value={pickupLabel}
                      countryCode={pickupCountryCode}
                      note={load.pickupAt ? formatLoadDate(load.pickupAt) : undefined}
                    />
                    <RouteStop
                      last
                      icon={isStorage ? Warehouse : MapPin}
                      tone="bg-blue-500 shadow-blue-500/20"
                      label={isStorage ? u('postLoadModal.warehousePreferredLocation', 'Preferred warehouse location') : u('legacy.loadDetails.delivery', 'Delivery')}
                      value={isStorage && load.storageRadiusKm ? `${deliveryLabel} · +${load.storageRadiusKm} km` : deliveryLabel}
                      countryCode={deliveryCountryCode}
                      note={isStorage ? (load.storageStartDate || undefined) : (load.eta ? formatLoadDate(load.eta) : undefined)}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-sky-200 bg-sky-50/60 px-3 py-2 dark:border-sky-900/60 dark:bg-slate-950">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{u('landing.distance', 'Distance')}</p>
                    <p className="text-sm font-black text-slate-900 dark:text-white">{isStorage || !routeDistanceKm ? '—' : `${routeDistanceKm.toLocaleString()} km`}</p>
                  </div>
                  <Button
                    type="button"
                    disabled={!canShowRouteMap}
                    onClick={() => setRouteMapOpen(true)}
                    className="mt-2 h-10 w-full gap-2 rounded-xl disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <MapIcon className="h-4 w-4" />
                    {u('postLoadModal.showRouteMap', 'Show route')}
                  </Button>
                </div>

              <section className="overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-cyan-100 text-slate-900 shadow-lg shadow-sky-950/5 dark:border-slate-800 dark:bg-slate-950 dark:text-white xl:col-span-5">
                <div className="relative isolate flex h-full flex-col p-4">
                  <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-primary/20 blur-3xl dark:bg-primary/25" />
                  <div className="absolute -bottom-24 left-1/3 h-44 w-44 rounded-full bg-cyan-400/25 blur-3xl dark:bg-cyan-400/15" />
                  <div className="relative flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">{u('legacy.loadDetails.routePlan', 'Route overview')}</p>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-500/50 bg-white/70 text-cyan-600 dark:bg-cyan-300/15 dark:text-cyan-200"><Truck className="h-4 w-4" /></span>
                  </div>

                  <div className="relative mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider', getStatusTone(currentStatus))}>{preDeliveryLabel || currentStatus}</span>
                    {bookingStatusLabel && <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-sky-600">{bookingStatusLabel}</span>}
                    <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider', getGoodsTone(load.goodsType))}>{load.goodsType}</span>
                    <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider', getPaymentTone(load.paymentTerms))}>{paymentTermsLabel}</span>
                  </div>

                  <div className="relative mt-3 grid flex-1 grid-cols-2 items-stretch gap-2 border-t border-sky-200/80 pt-3 dark:border-white/10">
                    <div className="flex items-center gap-2.5 rounded-xl border border-white/80 bg-white/70 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-white/8">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-300"><Hash className="h-4 w-4" /></div>
                      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Load ID</p><p className="truncate text-sm font-bold">#{load.id}</p></div>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-xl border border-white/80 bg-white/70 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-white/8">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-300"><CalendarClock className="h-4 w-4" /></div>
                      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Transit</p><p className="truncate text-sm font-bold">{load.transitDays ? `${load.transitDays} days` : 'To be confirmed'}</p></div>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-xl border border-white/80 bg-white/70 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-white/8">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-300"><Box className="h-4 w-4" /></div>
                      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cargo</p><p className="truncate text-sm font-bold">{load.cargoType || 'General cargo'}</p></div>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-xl border border-white/80 bg-white/70 px-3 py-2.5 shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-white/8">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"><CalendarDays className="h-4 w-4" /></div>
                      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">ETA</p><p className="truncate text-sm font-bold">{formatLoadDate(load.eta)}</p></div>
                    </div>
                  </div>
                </div>
              </section>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 xl:col-span-4">
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-primary">
                      {u('legacy.loadDetails.financialTerms', 'Financial Terms')}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{u('legacy.loadDetails.price', 'Price')}</p>
                        <p className="truncate text-xl font-black leading-tight text-primary">{load.price}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-800">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{u('legacy.loadDetails.cargoValueLabel', 'Cargo value')}</p>
                        <p className="truncate text-xl font-black leading-tight text-slate-900 dark:text-white">{cargoValueLabel}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <InfoTile label={u('legacy.loadDetails.terms', 'Terms')} value={paymentTermsLabel} />
                      <InfoTile label={u('legacy.loadDetails.incoterms', 'Incoterms')} value={load.incoterms || '—'} />
                      <InfoTile label={u('legacy.loadDetails.insurance', 'Insurance')} value={load.insurance || '—'} />
                      <InfoTile label={u('legacy.loadDetails.shipper', 'Shipper')} value={load.shipperName || '—'} />
                      <InfoTile label={u('legacy.loadDetails.mediator', 'Mediator')} value={load.mediator || '—'} />
                      <InfoTile label={u('legacy.loadDetails.bookingReference', 'Booking Reference')} value={load.bookingReference || '—'} />
                    </div>
                    <div className="flex items-start gap-2 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-800">
                      <Coins className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <p className="text-[11px] leading-snug text-slate-600 dark:text-slate-300">
                        {u(
                          'legacy.loadDetails.smartSplitPayoutAvailable',
                          'Smart split payout available after automated POD confirmation.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-12">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 xl:col-span-6">
                  <p className="mb-2.5 text-[10px] font-black uppercase tracking-wider text-primary">
                    {u('legacy.loadDetails.handlingCompliance', 'Handling & Compliance')}
                  </p>
                  <div className="grid gap-2 md:grid-cols-2">
                    <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-800">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p className="text-[13px] leading-snug text-slate-700 dark:text-slate-300">{goodsNote}</p>
                    </div>
                    <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-800">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <p className="text-[13px] leading-snug text-slate-700 dark:text-slate-300">
                        {u(
                          'legacy.loadDetails.liveRouteAlertsEnabled',
                          'Live route alerts are enabled for risk, congestion, and checkpoint delay anomalies.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 xl:col-span-6">
                  <p className="mb-2.5 text-[10px] font-black uppercase tracking-wider text-primary">
                    {u('tracking.attachedDocuments', 'Attached documents')}
                  </p>
                  <CustomsDocumentList loadId={load.id} documents={load.customsDocuments} lang={lang} />
                </div>
              </div>
            </div>
            )}
          </div>
        </motion.div>
      </div>

      {(isCompanyOperationsRole(role) || role === 'superadmin') && (
        <LoadAssignmentModal
          open={assignmentOpen}
          lang={lang}
          mode={role === 'superadmin' ? 'superadmin' : 'company'}
          companies={companies.map((company) => ({
            id: String(company.id),
            label: String(company.name || `Company ${company.id}`),
          }))}
          drivers={drivers.flatMap((driver) => {
            const driverUser = driver.user as { id?: number; name?: string } | undefined;
            return driverUser?.id ? [{ id: String(driverUser.id), label: driverUser.name || `Driver ${driverUser.id}` }] : [];
          })}
          companyId={bookingCompanyId}
          driverId={bookingDriverId}
          assignDriver={assignDriverNow}
          loading={isBooking}
          onCompanyChange={setBookingCompanyId}
          onDriverChange={setBookingDriverId}
          onAssignDriverChange={(value) => {
            setAssignDriverNow(value);
            if (!value) setBookingDriverId('');
          }}
          onClose={() => setAssignmentOpen(false)}
          onConfirm={() => void bookLoad({
            companyId: role === 'superadmin' && bookingCompanyId ? Number(bookingCompanyId) : undefined,
            driverUserId: (role === 'superadmin' || assignDriverNow) && bookingDriverId ? Number(bookingDriverId) : undefined,
          }, false)}
        />
      )}

      {(isCompanyOperationsRole(role) || role === 'driver' || role === 'superadmin' || role === 'warehouse') && (
        isStorage ? (
          <WarehouseBidModal
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
        ) : (
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
            companyIds={companyIds}
            onClose={() => setShowOfferForm(false)}
            onSubmit={() => void submitOffer()}
          />
        )
      )}

      <LenaAI
        open={lenaOpen}
        onClose={() => setLenaOpen(false)}
        lang={lang}
        userId={userId}
        loadId={load.id}
        loadLabel={load.title}
        onBookLoad={currentStatus === 'Posted' ? () => bookLoad() : undefined}
      />

      {load.pickupPosition && load.deliveryPosition && (
        <RouteMapModal
          open={routeMapOpen}
          lang={lang}
          pickup={{ label: pickupLabel, position: load.pickupPosition }}
          delivery={{ label: deliveryLabel, position: load.deliveryPosition }}
          onClose={() => setRouteMapOpen(false)}
        />
      )}

      <CounterOfferReviewModal
        open={Boolean(viewingCounter)}
        lang={lang}
        load={load}
        originalOffer={myOffer}
        counterOffer={viewingCounter}
        loading={acceptingCounter}
        onClose={() => setViewingCounter(null)}
        onAccept={() => void acceptCounterOffer()}
      />
    </motion.div>
    )}
    </AnimatePresence>
  );
};
