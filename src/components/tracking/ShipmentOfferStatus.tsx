import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';

import type { Language } from '../../types';
import { api } from '../../services/api';
import { showError } from '../../lib/swal';

type Props = {
  workspace: Record<string, unknown>;
  lang: Language;
  onUpdated: (workspace: Record<string, unknown>) => void;
};

const COPY = {
  en: { offerStatus: 'Offer status', saving: 'Saving...', failed: 'The status could not be changed' },
  bs: { offerStatus: 'Status ponude', saving: 'Spremanje...', failed: 'Status nije promijenjen' },
  de: { offerStatus: 'Angebotsstatus', saving: 'Speichern...', failed: 'Der Status konnte nicht geändert werden' },
} as const;

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const titleCase = (value: unknown) => String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

/** The booking's own status, kept next to the shipment title so it reads from every sub-tab. */
export const ShipmentOfferStatus = ({ workspace, lang, onUpdated }: Props) => {
  const text = COPY[lang === 'bs' || lang === 'de' ? lang : 'en'];
  const acceptedOffer = record(workspace.accepted_offer);
  const offerSnapshot = record(workspace.offer_snapshot);
  const requestType = String(acceptedOffer.request_type || offerSnapshot.request_type || 'price_offer');
  const statuses = requestType === 'reservation_request'
    ? ['pending_customer_approval', 'accepted', 'rejected', 'withdrawn', 'expired', 'cancelled']
    : ['published', 'open_for_reservations', 'reservation_selected', 'booking_confirmed', 'preparation', 'ready_for_pickup', 'in_execution', 'completed', 'cancelled', 'expired'];
  const [saving, setSaving] = useState(false);

  const updateStatus = async (status: string) => {
    setSaving(true);
    try {
      const response = await api.shipmentWorkspaces.update(Number(workspace.id), { offer_status: status });
      onUpdated(response.data);
    } catch (error) {
      void showError(text.failed, error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-2.5">
      <label htmlFor={`offer-status-${workspace.id}`} className="shrink-0 text-[10px] font-black uppercase tracking-wider text-primary">
        {text.offerStatus}
      </label>
      <select
        id={`offer-status-${workspace.id}`}
        value={String(acceptedOffer.status || 'accepted')}
        disabled={saving}
        onChange={(event) => void updateStatus(event.target.value)}
        className="h-9 min-w-0 flex-1 cursor-pointer rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-800 outline-none focus:border-primary disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      >
        {!statuses.includes(String(acceptedOffer.status)) && (
          <option value={String(acceptedOffer.status || 'accepted')}>{titleCase(acceptedOffer.status || 'accepted')}</option>
        )}
        {statuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
      </select>
      {saving && <LoaderCircle className="h-4 w-4 shrink-0 animate-spin text-slate-400" />}
    </div>
  );
};
