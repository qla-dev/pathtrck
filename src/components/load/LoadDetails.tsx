import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Coins,
  MapPin,
  ShieldCheck,
  Truck,
  Pencil,
  UserCheck,
  X,
} from 'lucide-react';

import { cn } from '../../lib/cn';
import { confirmAction, showSuccess } from '../../lib/swal';
import { Language, Load } from '../../types';
import { Role } from '../../types';
import { api } from '../../services/api';
import { ui } from '../../i18n';
import { Button } from '../ui/Button';

type LoadDetailsProps = {
  open: boolean;
  load: Load | null;
  onClose: () => void;
  lang: Language;
  role?: Role;
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

export const LoadDetails = ({ open, load, onClose, lang, role, onEdit, onChanged }: LoadDetailsProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [offers, setOffers] = useState<Array<Record<string, unknown>>>([]);
  const [drivers, setDrivers] = useState<Array<Record<string, unknown>>>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<Record<string, number>>({});
  const [offersLoading, setOffersLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  useEffect(() => {
    if (!open) return undefined;
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !load || role !== 'superadmin') return;
    setOffersLoading(true);
    setActionMessage('');
    Promise.all([api.offers.list({ per_page: 100 }), api.drivers.list({ per_page: 100 })])
      .then(([offerResponse, driverResponse]) => {
        const loadOffers = offerResponse.data.filter((offer) => String(offer.load_id) === String(load.id));
        setOffers(loadOffers);
        setDrivers(driverResponse.data);
        setSelectedDrivers(Object.fromEntries(loadOffers.flatMap((offer) => offer.driver_user_id ? [[String(offer.id), Number(offer.driver_user_id)]] : [])));
      })
      .catch((error) => setActionMessage(error instanceof Error ? error.message : 'Offers could not be loaded.'))
      .finally(() => setOffersLoading(false));
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

  if (!open || !load) return null;

  const goodsNote = getGoodsNote(load.goodsType, u);

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
          <div className="px-5 md:px-7 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wider text-primary">
                {u('legacy.loadDetails.loadDetails', 'Load Details')}
              </p>
              <h2 className="text-xl md:text-2xl font-black dark:text-white truncate">{load.title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:border-primary hover:text-primary transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 md:p-7">
            <div className="space-y-6">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
                <p className="text-xs font-black uppercase tracking-wider text-primary mb-4">
                  {u('legacy.loadDetails.routePlan', 'Route Plan')}
                </p>
                <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase text-slate-500">{u('legacy.loadDetails.pickup', 'Pickup')}</p>
                      <p className="font-bold dark:text-white truncate">{load.pickup}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 hidden md:block" />
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase text-slate-500">{u('legacy.loadDetails.delivery', 'Delivery')}</p>
                      <p className="font-bold dark:text-white truncate">{load.delivery}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid xl:grid-cols-12 gap-6">
                <div className="xl:col-span-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-5 space-y-4">
                  <p className="text-xs font-black uppercase tracking-wider text-primary">
                    {u('legacy.loadDetails.postingInfo', 'Posting Info')}
                  </p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">{u('legacy.loadDetails.postedBy', 'Posted by')}</p>
                        <p className="font-bold dark:text-white">{load.author}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <CalendarDays className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">{u('legacy.loadDetails.postedDate', 'Posted date')}</p>
                        <p className="font-bold dark:text-white">{load.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock3 className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">{u('legacy.loadDetails.latestEta', 'Latest ETA')}</p>
                        <p className="font-bold dark:text-white">{load.eta}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Truck className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="text-xs text-slate-500">{u('legacy.loadDetails.cargoCategory', 'Cargo category')}</p>
                        <p className="font-bold dark:text-white">{load.cargoType}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle2 className="w-5 h-5" />
                    <p className="text-xs font-black uppercase tracking-wider">
                      {u('legacy.loadDetails.readyActions', 'Ready Actions')}
                    </p>
                  </div>
                  {role === 'superadmin' ? <Button className="w-full" onClick={() => onEdit?.(load)}><Pencil className="mr-2 h-4 w-4" />Edit load</Button> : <>
                    <Button className="w-full">{u('legacy.loadDetails.requestAssignment', 'Request Assignment')}</Button>
                    <Button variant="outline" className="w-full">{u('legacy.loadDetails.negotiateTerms', 'Negotiate Terms')}</Button>
                  </>}
                </div>
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
                <div className="xl:col-span-8 space-y-6">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <span className={cn('px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider', getStatusTone(load.status))}>
                        {load.status}
                      </span>
                      <span className={cn('px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider', getGoodsTone(load.goodsType))}>
                        {load.goodsType}
                      </span>
                      <span className={cn('px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider', getPaymentTone(load.paymentTerms))}>
                        {load.paymentTerms}
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

                <div className="xl:col-span-4 space-y-6">
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
                    <p className="text-xs font-black uppercase tracking-wider text-primary">
                      {u('legacy.loadDetails.financialTerms', 'Financial Terms')}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                        <p className="text-xs text-slate-500">{u('legacy.loadDetails.price', 'Price')}</p>
                        <p className="text-xl font-black text-primary mt-1">{load.price}</p>
                      </div>
                      <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                        <p className="text-xs text-slate-500">{u('legacy.loadDetails.terms', 'Terms')}</p>
                        <p className="text-sm font-bold dark:text-white mt-1">{load.paymentTerms}</p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-start gap-2">
                      <Coins className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {u(
                          'legacy.loadDetails.smartSplitPayoutAvailable',
                          'Smart split payout available after automated POD confirmation.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
