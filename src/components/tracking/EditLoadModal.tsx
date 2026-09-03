import { ArrowLeft, Pencil, X } from 'lucide-react';

import type { Language, Role, ShipmentDetail } from '../../types';
import type { LocationSearchResult } from '../../services/locationSearch';
import { ui } from '../../i18n';
import { TrackingShipmentDetails } from './TrackingShipmentDetails';

type Props = {
  open: boolean;
  lang: Language;
  role: Role;
  title: string;
  details: ShipmentDetail[];
  /** Opens the form on a single field, focused, with the rest of the form locked. */
  focusKey?: string | null;
  /** Heading for that single-field mode — the checklist task the viewer came from. */
  actionTitle?: string | null;
  consigneeRecord?: Record<string, unknown>;
  stops?: Array<Record<string, unknown>>;
  savingKey?: string | null;
  onClose: () => void;
  onSave: (detail: ShipmentDetail, value: string | number | null) => Promise<boolean>;
  onSaveLocation: (detail: ShipmentDetail, location: LocationSearchResult) => Promise<boolean>;
};

export const EditLoadModal = ({ open, lang, role, title, details, focusKey, actionTitle, consigneeRecord, stops, savingKey, onClose, onSave, onSaveLocation }: Props) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1800] flex min-h-0 flex-col bg-slate-50 dark:bg-slate-950">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-950 md:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-primary"><Pencil className="h-3.5 w-3.5" />{actionTitle || u('shipmentDetails.editLoad', 'Edit load')}</p>
            <h2 className="truncate text-lg font-black text-slate-900 dark:text-white">{title}</h2>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label={u('common.close', 'Close')} className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:text-primary dark:bg-slate-900 dark:text-slate-300">
          <X className="h-5 w-5" />
        </button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-3 md:px-7 md:pb-7">
        <section className="mx-auto max-w-[1500px] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-7">
          <TrackingShipmentDetails
            details={details}
            focusKey={focusKey}
            lang={lang}
            role={role}
            consigneeRecord={consigneeRecord}
            stops={stops}
            savingKey={savingKey}
            onSave={onSave}
            onSaveLocation={onSaveLocation}
          />
        </section>
      </main>
    </div>
  );
};
