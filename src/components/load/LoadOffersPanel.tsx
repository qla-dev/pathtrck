import { CheckCircle2, Inbox, UserCheck, UsersRound } from 'lucide-react';
import { Language } from '../../types';
import { ui } from '../../i18n';
import { Button } from '../ui/Button';

type DriverOption = {
  id: number;
  label: string;
};

type LoadOffersPanelProps = {
  lang: Language;
  offers: Array<Record<string, unknown>>;
  drivers: DriverOption[];
  selectedDrivers: Record<string, number>;
  loading: boolean;
  actionMessage?: string;
  onDriverChange: (offerId: string, driverId: number) => void;
  onApprove: (offer: Record<string, unknown>) => void;
};

export const LoadOffersPanel = ({
  lang,
  offers,
  drivers,
  selectedDrivers,
  loading,
  actionMessage,
  onDriverChange,
  onApprove,
}: LoadOffersPanelProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UsersRound className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
              {u('Offers & driver assignment', 'Offers & driver assignment')}
            </p>
            <p className="mt-0.5 text-sm text-slate-500">{offers.length} {u('Offers', 'Offers').toLowerCase()}</p>
          </div>
        </div>
        <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-black text-primary">{offers.length}</span>
      </div>

      {actionMessage && (
        <div className="mb-4 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
          {actionMessage}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-56 items-center justify-center text-sm font-semibold text-slate-500">
          {u('common.loading', 'Loading')}
        </div>
      ) : offers.length === 0 ? (
        <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center dark:border-slate-700 dark:bg-slate-950/50">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800"><Inbox className="h-6 w-6" /></div>
          <p className="mt-4 font-black text-slate-800 dark:text-white">{u('No offers for this load yet.', 'No offers for this load yet.')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {offers.map((offer) => {
            const company = offer.company as { name?: string } | undefined;
            const creator = offer.creator as { name?: string; email?: string } | undefined;
            const driver = offer.driver as { id?: number; name?: string } | undefined;
            const offerId = String(offer.id);
            const status = String(offer.status || 'pending').toLowerCase();
            const accepted = status === 'accepted';

            return (
              <article key={offerId} className="grid gap-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-950/40 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-lg font-black text-slate-900 dark:text-white">{company?.name || creator?.name || u('Independent offer', 'Independent offer')}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${accepted ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>{status}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{u('Offered by', 'Offered by')} {creator?.name || creator?.email || '—'}</p>
                  <p className="mt-4 text-2xl font-black text-primary">{String(offer.currency || 'EUR')} {Number(offer.amount || 0).toLocaleString()}</p>
                  {offer.message && <p className="mt-3 rounded-xl bg-white p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">{String(offer.message)}</p>}
                </div>

                <div className="space-y-3">
                  <label className="block">
                    <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500"><UserCheck className="h-3.5 w-3.5 text-primary" />{u('Driver', 'Driver')}</span>
                    <select
                      value={selectedDrivers[offerId] || driver?.id || ''}
                      onChange={(event) => onDriverChange(offerId, Number(event.target.value))}
                      disabled={accepted}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-primary disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    >
                      <option value="">{u('legacy.loadDetails.selectDriver', 'Select a driver')}</option>
                      {drivers.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                  </label>
                  <Button className="h-11 w-full shadow-lg shadow-primary/20" disabled={status !== 'pending'} onClick={() => onApprove(offer)}>
                    {accepted ? <><CheckCircle2 className="mr-2 h-4 w-4" />{u('Approved', 'Approved')}</> : u('Approve & assign', 'Approve & assign')}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
