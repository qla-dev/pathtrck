import { useEffect, useRef, useState } from 'react';
import Flatpickr from 'react-flatpickr';
import { Pencil } from 'lucide-react';

import { cn } from '../../lib/cn';
import { flatpickrI18n } from '../../i18n';
import { Language, Role, ShipmentDetail } from '../../types';
import { CustomerSelect, customerOptionFromRecord } from '../customer/CustomerSelect';

type TrackingShipmentDetailsProps = {
  details: ShipmentDetail[];
  lang: Language;
  role: Role;
  consigneeRecord?: Record<string, unknown>;
  savingKey?: string | null;
  onSave: (detail: ShipmentDetail, value: string | number | null) => Promise<boolean>;
};

const STATUS_OPTIONS = [
  ['posted', 'Posted'],
  ['opened', 'Opened'],
  ['sent', 'Sent'],
  ['in_delivery', 'In delivery'],
  ['received', 'Received'],
  ['finished', 'Finished'],
  ['pending', 'Pending'],
  ['cancelled', 'Cancelled'],
] as const;

export const TrackingShipmentDetails = ({ details, lang, role, consigneeRecord, savingKey, onSave }: TrackingShipmentDetailsProps) => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const committingKey = useRef<string | null>(null);
  const cancelledKey = useRef<string | null>(null);
  const canEdit = role === 'superadmin';

  useEffect(() => {
    if (editingKey && !details.some((detail) => detail.key === editingKey)) setEditingKey(null);
  }, [details, editingKey]);

  const beginEdit = (detail: ShipmentDetail) => {
    if (!canEdit || savingKey) return;
    setEditingKey(detail.key);
    setDraft(detail.rawValue ?? (detail.value === '—' ? '' : detail.value));
  };

  const cancel = () => {
    if (savingKey) return;
    cancelledKey.current = editingKey;
    setEditingKey(null);
    setDraft('');
  };

  const save = async (detail: ShipmentDetail, value: string | number | null = draft) => {
    if (committingKey.current === detail.key) return;
    committingKey.current = detail.key;
    try {
      if (await onSave(detail, value)) {
        setEditingKey(null);
        setDraft('');
      }
    } finally {
      committingKey.current = null;
    }
  };

  const saveOnBlur = (detail: ShipmentDetail) => {
    if (cancelledKey.current === detail.key) {
      cancelledKey.current = null;
      return;
    }
    const originalValue = detail.rawValue ?? (detail.value === 'â€”' ? '' : detail.value);
    if (draft === originalValue) {
      setEditingKey(null);
      setDraft('');
      return;
    }
    void save(detail);
  };

  const saveDate = (detail: ShipmentDetail, value: string) => {
    if (value === (detail.rawValue ?? '')) {
      setEditingKey(null);
      setDraft('');
      return;
    }
    void save(detail, value);
  };

  return (
    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
      {details.map((detail) => {
        const editing = editingKey === detail.key;
        const saving = savingKey === detail.key;

        return (
          <div
            key={detail.key}
            onClick={() => beginEdit(detail)}
            title={canEdit && !editing ? 'Click to edit' : undefined}
            className={cn(
              'group h-16 min-w-0 rounded-xl border border-transparent p-2 transition-colors',
              canEdit && !editing && 'cursor-text hover:border-primary/25 hover:bg-primary/[0.03]',
              editing && 'border-primary/30 bg-primary/[0.04]'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{detail.label}</p>
              {canEdit && !editing && <Pencil className="h-3 w-3 text-primary opacity-0 transition-opacity group-hover:opacity-100" />}
            </div>

            {!editing ? (
              <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{detail.value}</p>
            ) : detail.input === 'customer' ? (
              <div className="mt-1" onClick={(event) => event.stopPropagation()}>
                <CustomerSelect
                  value={consigneeRecord?.id ? customerOptionFromRecord(consigneeRecord) : null}
                  onChange={(option) => {
                    if (option) void save(detail, option.id);
                  }}
                  disabled={saving}
                  placeholder="Select consignee"
                  compact
                />
              </div>
            ) : (
              <div className="mt-1" onClick={(event) => event.stopPropagation()}>
                {detail.input === 'status' ? (
                  <select
                    autoFocus
                    value={draft}
                    onChange={(event) => {
                      setDraft(event.target.value);
                      void save(detail, event.target.value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void save(detail);
                      if (event.key === 'Escape') cancel();
                    }}
                    disabled={saving}
                    className="h-8 w-full min-w-0 rounded-lg border border-primary/40 bg-white px-2 text-sm outline-none dark:bg-slate-950 dark:text-white"
                  >
                    {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                ) : detail.input === 'date' ? (
                  <Flatpickr
                    value={draft}
                    options={{
                      dateFormat: 'Y-m-d',
                      altInput: true,
                      altFormat: 'd.m.Y',
                      allowInput: true,
                      locale: flatpickrI18n(lang),
                    }}
                    onChange={(_, dateStr) => setDraft(dateStr)}
                    onReady={(_, __, instance) => instance.open()}
                    onClose={(_, dateStr) => saveDate(detail, dateStr)}
                    className="h-8 w-full min-w-0 rounded-lg border border-primary/40 bg-white px-2 text-sm outline-none dark:bg-slate-950 dark:text-white"
                  />
                ) : (
                  <input
                    autoFocus
                    type={detail.input === 'number' ? 'number' : 'text'}
                    step={detail.key === 'weight_kg' || detail.key === 'volume_m3' ? '0.01' : undefined}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onBlur={() => saveOnBlur(detail)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void save(detail);
                      if (event.key === 'Escape') cancel();
                    }}
                    disabled={saving}
                    className="h-8 w-full min-w-0 rounded-lg border border-primary/40 bg-white px-2 text-sm outline-none dark:bg-slate-950 dark:text-white"
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
