import { useState } from 'react';
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Eye,
  Gavel,
  History,
  Inbox,
  Percent,
  Repeat,
  Route,
  Truck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Language, Load, Offer } from '../../types';
import { ui } from '../../i18n';
import { formatShortDate } from '../../lib/loadDetails';
import { PAYMENT_TERMS_OPTIONS, PRICE_BASIS_OPTIONS, buildCounterOfferPayload, chargeLabel, getLatestOfferPerThread, offerDraftFromRecord } from '../../lib/offerBid';
import { Button } from '../ui/Button';
import { BiddingHistoryModal } from './BiddingHistoryModal';
import { LoadBidModal } from './LoadBidModal';
import { QuickCounterModal } from './QuickCounterModal';

type DriverOption = {
  id: number;
  label: string;
};

const optionLabel = (options: Array<{ value: string; label: string }>, value: unknown): string =>
  options.find((option) => option.value === value)?.label || String(value || '—');

const StatChip = ({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) => (
  <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
    <div className="min-w-0">
      <p className="truncate text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
      <p className="truncate text-xs font-bold text-slate-800 dark:text-white">{value}</p>
    </div>
  </div>
);

type LoadOffersPanelProps = {
  lang: Language;
  load: Load;
  offers: Array<Record<string, unknown>>;
  drivers: DriverOption[];
  selectedDrivers: Record<string, number>;
  loading: boolean;
  actionMessage?: string;
  userId?: number;
  onDriverChange: (offerId: string, driverId: number) => void;
  onApprove: (offer: Record<string, unknown>) => void;
  onReject: (offer: Record<string, unknown>) => void;
  onSendCounter: (payload: Record<string, unknown>) => Promise<void>;
};

export const LoadOffersPanel = ({
  lang,
  load,
  offers,
  drivers,
  selectedDrivers,
  loading,
  actionMessage,
  userId,
  onDriverChange,
  onApprove,
  onReject,
  onSendCounter,
}: LoadOffersPanelProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [viewingOffer, setViewingOffer] = useState<Record<string, unknown> | null>(null);
  const [historyOfferId, setHistoryOfferId] = useState<string | null>(null);
  const [quickCounterOffer, setQuickCounterOffer] = useState<Record<string, unknown> | null>(null);
  const [counterOffer, setCounterOffer] = useState<Record<string, unknown> | null>(null);
  const [counterDraft, setCounterDraft] = useState<Offer | null>(null);
  const [sendingCounter, setSendingCounter] = useState(false);

  const sendQuickCounter = async (amount: number) => {
    if (!quickCounterOffer) return;
    setSendingCounter(true);
    try {
      const draft = { ...offerDraftFromRecord(quickCounterOffer), amount: String(amount) };
      await onSendCounter(buildCounterOfferPayload(quickCounterOffer, draft, userId));
      setQuickCounterOffer(null);
    } catch {
      // already surfaced to the user by the parent; keep the modal open so they can retry
    } finally {
      setSendingCounter(false);
    }
  };

  const sendFullCounter = async () => {
    if (!counterOffer || !counterDraft) return;
    setSendingCounter(true);
    try {
      await onSendCounter(buildCounterOfferPayload(counterOffer, counterDraft, userId));
      setCounterOffer(null);
      setCounterDraft(null);
    } catch {
      // already surfaced to the user by the parent; keep the modal open so they can retry
    } finally {
      setSendingCounter(false);
    }
  };

  const visibleOffers = getLatestOfferPerThread(offers);

  return (
    <div>
      {actionMessage && (
        <div className="mb-4 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
          {actionMessage}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-56 items-center justify-center text-sm font-semibold text-slate-500">
          {u('common.loading', 'Loading')}
        </div>
      ) : visibleOffers.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center dark:border-slate-700 dark:bg-slate-950/50">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"><Inbox className="h-6 w-6" /></div>
          <p className="mt-4 font-black text-slate-800 dark:text-white">{u('No offers for this load yet.', 'No offers for this load yet.')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {visibleOffers.map((offer) => {
            const company = offer.company as { name?: string } | undefined;
            const creator = offer.creator as { name?: string; email?: string } | undefined;
            const driver = offer.driver as { id?: number; name?: string } | undefined;
            const offerId = String(offer.id);
            const status = String(offer.status || 'pending').toLowerCase();
            const accepted = status === 'accepted';
            const rejected = status === 'rejected';
            const decided = accepted || rejected;
            const isCounter = Boolean(offer.is_counter);
            const hasExceptions = Boolean(offer.has_exceptions);
            const canPerform = offer.can_perform_as_required !== false;
            const includedCharges = Array.isArray(offer.included_charges) ? (offer.included_charges as string[]) : [];
            const excludedCharges = Array.isArray(offer.excluded_charges) ? (offer.excluded_charges as string[]) : [];

            return (
              <article key={offerId} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-stretch">
                <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-lg font-black text-slate-900 dark:text-white">{company?.name || creator?.name || u('Independent offer', 'Independent offer')}</p>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${accepted ? 'bg-emerald-500/10 text-emerald-600' : rejected ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'}`}>{status}</span>
                        {isCounter && (
                          <span className="flex shrink-0 items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-violet-600">
                            <Repeat className="h-3 w-3" />{u('Counter offer', 'Counter offer')}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{u('Offered by', 'Offered by')} {creator?.name || creator?.email || '—'}</p>
                    </div>

                    <p className="shrink-0 text-2xl font-black text-primary">{String(offer.currency || 'EUR')} {Number(offer.amount || 0).toLocaleString()}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800 sm:grid-cols-3 xl:grid-cols-6">
                    <StatChip icon={CreditCard} label={u('Payment', 'Payment')} value={optionLabel(PAYMENT_TERMS_OPTIONS, offer.payment_terms)} />
                    <StatChip icon={Clock} label={u('Valid until', 'Valid until')} value={formatShortDate(offer.valid_until)} />
                    <StatChip icon={Truck} label={u('Equipment', 'Equipment')} value={offer.equipment_type ? String(offer.equipment_type) : '—'} />
                    <StatChip icon={Route} label={u('Transit', 'Transit')} value={offer.estimated_transit_days != null ? `${offer.estimated_transit_days} ${u('common.days', 'days')}` : '—'} />
                    <StatChip icon={CalendarClock} label={u('Delivery ETA', 'Delivery ETA')} value={formatShortDate(offer.estimated_delivery_date)} />
                    <StatChip icon={canPerform ? CheckCircle2 : Ban} label={u('Can perform', 'Can perform')} value={canPerform ? u('common.yes', 'Yes') : u('common.no', 'No')} />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary"><Coins className="h-3 w-3" />{optionLabel(PRICE_BASIS_OPTIONS, offer.price_basis)}</span>
                    <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400"><Percent className="h-3 w-3" />VAT {offer.vat ? String(offer.vat) : '—'}</span>
                    {includedCharges.map((key) => (
                      <span key={`inc-${key}`} className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-600">+ {chargeLabel(key)}</span>
                    ))}
                    {excludedCharges.map((key) => (
                      <span key={`exc-${key}`} className="rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-bold text-red-600">− {chargeLabel(key)}</span>
                    ))}
                  </div>

                  {hasExceptions && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:border-amber-900/40 dark:bg-amber-500/10 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4 shrink-0" />{u('Submitted with exceptions', 'Submitted with exceptions')}
                    </div>
                  )}

                  {Boolean(offer.message) && <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">{String(offer.message)}</p>}
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  {driver?.id ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950">
                      <span className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500"><UserCheck className="h-3.5 w-3.5 text-primary" />{u('Driver', 'Driver')}</span>
                      <span className="text-sm font-bold text-slate-800 dark:text-white">{driver.name || `Driver #${driver.id}`}</span>
                    </div>
                  ) : (
                    <label className="block">
                      <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500"><UserCheck className="h-3.5 w-3.5 text-primary" />{u('Driver', 'Driver')}</span>
                      <select
                        value={selectedDrivers[offerId] || ''}
                        onChange={(event) => onDriverChange(offerId, Number(event.target.value))}
                        disabled={decided}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-primary disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="">{u('legacy.loadDetails.selectDriver', 'Select a driver')}</option>
                        {drivers.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                      </select>
                    </label>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingOffer(offer)}
                      className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 text-sm font-bold text-primary transition-colors hover:bg-primary/15 dark:border-primary/30 dark:bg-primary/15"
                    >
                      <Eye className="h-4 w-4" /> {u('See full bid', 'See full bid')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryOfferId(offerId)}
                      className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 text-sm font-bold text-primary transition-colors hover:bg-primary/15 dark:border-primary/30 dark:bg-primary/15"
                    >
                      <History className="h-4 w-4" /> {u('Bidding history', 'Bidding history')}
                    </button>
                  </div>

                  {!decided && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setQuickCounterOffer(offer)}
                        className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 text-sm font-bold text-primary transition-colors hover:bg-primary/15 dark:border-primary/30 dark:bg-primary/15"
                      >
                        <Gavel className="h-4 w-4" /> {u('Quick counter', 'Quick counter')}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setCounterOffer(offer); setCounterDraft(offerDraftFromRecord(offer)); }}
                        className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 text-sm font-bold text-primary transition-colors hover:bg-primary/15 dark:border-primary/30 dark:bg-primary/15"
                      >
                        <Repeat className="h-4 w-4" /> {u('Counter', 'Counter')}
                      </button>
                    </div>
                  )}

                  <div className="mt-auto flex items-center gap-2">
                    <Button className="h-11 flex-1 shadow-lg shadow-primary/20" disabled={decided} onClick={() => onApprove(offer)}>
                      {accepted ? <><CheckCircle2 className="mr-2 h-4 w-4" />{u('Approved', 'Approved')}</> : u('Approve', 'Approve')}
                    </Button>
                    {!accepted && (
                      <Button variant="outline" className="h-11 flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50" disabled={decided} onClick={() => onReject(offer)}>
                        {rejected ? <><XCircle className="mr-2 h-4 w-4" />{u('Rejected', 'Rejected')}</> : u('Reject', 'Reject')}
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {viewingOffer && (
        <LoadBidModal
          open
          lang={lang}
          load={load}
          draft={offerDraftFromRecord(viewingOffer, { loadId: String(load.id) })}
          onDraftChange={() => undefined}
          editing
          loading={false}
          readOnly
          role="superadmin"
          onClose={() => setViewingOffer(null)}
          onSubmit={() => undefined}
        />
      )}

      <BiddingHistoryModal
        open={Boolean(historyOfferId)}
        lang={lang}
        load={load}
        offerId={historyOfferId}
        offers={offers}
        onClose={() => setHistoryOfferId(null)}
      />

      <QuickCounterModal
        open={Boolean(quickCounterOffer)}
        lang={lang}
        currentAmount={Number(quickCounterOffer?.amount || 0)}
        currency={String(quickCounterOffer?.currency || 'EUR')}
        loading={sendingCounter}
        onClose={() => setQuickCounterOffer(null)}
        onSend={(amount) => void sendQuickCounter(amount)}
      />

      {counterOffer && counterDraft && (
        <LoadBidModal
          open
          lang={lang}
          load={load}
          draft={counterDraft}
          onDraftChange={(patch) => setCounterDraft((current) => (current ? { ...current, ...patch } : current))}
          editing={false}
          readOnly={false}
          variant="counter"
          loading={sendingCounter}
          role="superadmin"
          onClose={() => { setCounterOffer(null); setCounterDraft(null); }}
          onSubmit={() => void sendFullCounter()}
        />
      )}
    </div>
  );
};
