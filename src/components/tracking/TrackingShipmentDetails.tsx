import { useEffect, useMemo, useRef, useState } from 'react';
import Flatpickr from 'react-flatpickr';
import {
  Activity,
  Box,
  Boxes,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Container,
  FileText,
  Flag,
  Handshake,
  Hash,
  Info,
  MapPin,
  Network,
  Pencil,
  Scale,
  ShieldCheck,
  TrendingUp,
  Truck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

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

type ShipmentDatePickerProps = {
  fieldKey: string;
  value: string;
  disabled: boolean;
  lang: Language;
  onChange: (value: string) => void;
};

const detailIcons: Record<string, LucideIcon> = {
  published_at: CalendarDays,
  status: Activity,
  booking_reference: Hash,
  insurance: ShieldCheck,
  department: Building2,
  freight_mode: Truck,
  consignee_customer_id: UserRound,
  subdepartment: Network,
  weight_kg: Scale,
  quantity_measure: Boxes,
  volume_m3: Box,
  teu: Container,
  container_types: Boxes,
  container_number: Container,
  departure: MapPin,
  arrival: Flag,
  etd_at: CalendarDays,
  eta_at: Clock3,
  atd_at: CalendarDays,
  shipper_name: UserRound,
  mediator: Handshake,
  incoterms: FileText,
  price_insurance: CircleDollarSign,
  profit_loss: TrendingUp,
};

const ShipmentDatePicker = ({ fieldKey, value, disabled, lang, onChange }: ShipmentDatePickerProps) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const options = useMemo(() => ({
    dateFormat: 'Y-m-d',
    altInput: true,
    altInputClass: 'h-8 w-full min-w-0 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-slate-800 outline-none dark:text-slate-100',
    altFormat: 'd.m.Y',
    allowInput: true,
    locale: flatpickrI18n(lang),
    onChange: (_dates: Date[], dateStr: string) => {
      console.log('[tracking-date] flatpickr changed', { key: fieldKey, dateStr });
      onChangeRef.current(dateStr);
    },
  }), [fieldKey, lang]);

  return (
    <Flatpickr
      value={value}
      disabled={disabled}
      options={options}
      className="hidden"
    />
  );
};

export const TrackingShipmentDetails = ({ details, lang, role, consigneeRecord, savingKey, onSave }: TrackingShipmentDetailsProps) => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [dateValues, setDateValues] = useState<Record<string, string>>({});
  const committingKey = useRef<string | null>(null);
  const cancelledKey = useRef<string | null>(null);
  const canEdit = role === 'superadmin';

  useEffect(() => {
    if (editingKey && !details.some((detail) => detail.key === editingKey)) setEditingKey(null);
  }, [details, editingKey]);

  useEffect(() => {
    const nextDateValues = Object.fromEntries(
      details
        .filter((detail) => detail.input === 'date')
        .map((detail) => [detail.key, detail.rawValue ?? ''])
    );
    setDateValues((current) => {
      const currentKeys = Object.keys(current);
      const nextKeys = Object.keys(nextDateValues);
      const unchanged = currentKeys.length === nextKeys.length
        && nextKeys.every((key) => current[key] === nextDateValues[key]);
      return unchanged ? current : nextDateValues;
    });
  }, [details]);

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
    if (committingKey.current === detail.key) return false;
    committingKey.current = detail.key;
    try {
      const saved = await onSave(detail, value);
      if (saved) {
        setEditingKey(null);
        setDraft('');
      }
      return saved;
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

  const saveDate = async (detail: ShipmentDetail, value: string) => {
    const originalValue = detail.rawValue ?? '';
    console.log('[tracking-date] save requested', {
      key: detail.key,
      originalValue,
      nextValue: value,
    });
    setDateValues((current) => ({ ...current, [detail.key]: value }));
    if (value === (detail.rawValue ?? '')) {
      console.log('[tracking-date] save skipped: value unchanged', { key: detail.key, value });
      setEditingKey(null);
      setDraft('');
      return;
    }
    const saved = await save(detail, value);
    console.log('[tracking-date] save completed', { key: detail.key, value, saved });
    if (!saved) {
      setDateValues((current) => ({ ...current, [detail.key]: originalValue }));
    }
  };

  return (
    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
      {details.map((detail) => {
        const editing = editingKey === detail.key;
        const saving = savingKey === detail.key;
        const DetailIcon = detailIcons[detail.key] || Info;

        return (
          <div
            key={detail.key}
            onClick={() => {
              if (detail.input !== 'date') beginEdit(detail);
            }}
            title={canEdit && !editing ? 'Click to edit' : undefined}
            className={cn(
              'group h-16 min-w-0 rounded-xl border border-transparent p-2 transition-colors',
              canEdit && !editing && 'cursor-pointer hover:border-primary/25 hover:bg-primary/[0.03]',
              editing && 'border-primary/30 bg-primary/[0.04]'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <DetailIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{detail.label}</span>
              </p>
              {canEdit && !editing && <Pencil className="h-3 w-3 text-primary opacity-0 transition-opacity group-hover:opacity-100" />}
            </div>

            {detail.input === 'date' && canEdit ? (
              <div className="mt-1" onClick={(event) => event.stopPropagation()}>
                <ShipmentDatePicker
                  fieldKey={detail.key}
                  value={dateValues[detail.key] ?? detail.rawValue ?? ''}
                  disabled={Boolean(savingKey)}
                  lang={lang}
                  onChange={(nextValue) => void saveDate(detail, nextValue)}
                />
              </div>
            ) : !editing ? (
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
                  autoOpen
                  onOutsideClose={cancel}
                />
              </div>
            ) : (
              <div className="mt-1" onClick={(event) => event.stopPropagation()}>
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
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
