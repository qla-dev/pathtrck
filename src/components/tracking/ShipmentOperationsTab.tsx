import { useState } from 'react';
import { LoaderCircle } from 'lucide-react';

import type { Language } from '../../types';
import { api } from '../../services/api';
import { ShipmentChecklistTable } from './ShipmentChecklistTable';

type Props = {
  workspace: Record<string, unknown>;
  lang: Language;
  onUpdated: (workspace: Record<string, unknown>) => void;
};

const COPY = {
  en: { title: 'Operational checklist', offerStatus: 'Offer status', checklist: 'Checklist', empty: 'No operational tasks yet.', saving: 'Saving...' },
  bs: { title: 'Operativna checklist', offerStatus: 'Status ponude', checklist: 'Checklist', empty: 'Još nema operativnih zadataka.', saving: 'Spremanje...' },
  de: { title: 'Operative Checkliste', offerStatus: 'Angebotsstatus', checklist: 'Checkliste', empty: 'Noch keine operativen Aufgaben.', saving: 'Speichern...' },
} as const;

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const array = (value: unknown): Array<Record<string, unknown>> => Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
const titleCase = (value: unknown) => String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const displayDate = (value: unknown, lang: Language) => {
  const date = new Date(String(value || ''));
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(lang === 'bs' ? 'bs-BA' : lang === 'de' ? 'de-DE' : 'en-GB', { dateStyle: 'medium' }).format(date);
};

export const ShipmentOperationsTab = ({ workspace, lang, onUpdated }: Props) => {
  const text = COPY[lang === 'bs' || lang === 'de' ? lang : 'en'];
  const checklist = array(workspace.operational_checklist);
  const freightLoad = record(workspace.freight_load);
  const dueDate = displayDate(freightLoad.etd_at || workspace.booked_at, lang);
  const acceptedOffer = record(workspace.accepted_offer);
  const offerSnapshot = record(workspace.offer_snapshot);
  const requestType = String(acceptedOffer.request_type || offerSnapshot.request_type || 'price_offer');
  const offerStatuses = requestType === 'reservation_request'
    ? ['pending_customer_approval', 'accepted', 'rejected', 'withdrawn', 'expired', 'cancelled']
    : ['published', 'open_for_reservations', 'reservation_selected', 'booking_confirmed', 'preparation', 'ready_for_pickup', 'in_execution', 'completed', 'cancelled', 'expired'];
  const [savingStatus, setSavingStatus] = useState(false);

  const updateOfferStatus = async (status: string) => {
    setSavingStatus(true);
    try {
      const response = await api.shipmentWorkspaces.update(Number(workspace.id), { offer_status: status });
      onUpdated(response.data);
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <ShipmentChecklistTable
      checklist={checklist}
      lang={lang}
      dueDate={dueDate}
      toolbar={(
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <label htmlFor={`offer-status-${workspace.id}`} className="mb-2 block text-[10px] font-black uppercase tracking-wider text-primary">{text.offerStatus}</label>
          <div className="flex items-center gap-3">
            <select
              id={`offer-status-${workspace.id}`}
              value={String(acceptedOffer.status || 'accepted')}
              disabled={savingStatus}
              onChange={(event) => void updateOfferStatus(event.target.value)}
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-primary disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {!offerStatuses.includes(String(acceptedOffer.status)) && <option value={String(acceptedOffer.status || 'accepted')}>{titleCase(acceptedOffer.status || 'accepted')}</option>}
              {offerStatuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
            </select>
            {savingStatus && <span className="flex items-center gap-2 text-xs font-bold text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />{text.saving}</span>}
          </div>
        </div>
      )}
    />
  );
};
