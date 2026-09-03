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
  Lock,
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
import { flatpickrI18n, ui } from '../../i18n';
import { Language, Role, ShipmentDetail } from '../../types';
import { type LocationSearchResult } from '../../services/locationSearch';
import { api } from '../../services/api';
import { CustomerSelect, customerOptionFromRecord } from '../customer/CustomerSelect';
import { AddressMapModal } from '../maps/AddressMapModal';

type TrackingShipmentDetailsProps = {
  details: ShipmentDetail[];
  /** When set, only this field is editable and it opens focused; every other field is locked. */
  focusKey?: string | null;
  lang: Language;
  role: Role;
  consigneeRecord?: Record<string, unknown>;
  stops?: Array<Record<string, unknown>>;
  savingKey?: string | null;
  onSave: (detail: ShipmentDetail, value: string | number | null) => Promise<boolean>;
  onSaveLocation: (detail: ShipmentDetail, location: LocationSearchResult) => Promise<boolean>;
};

type ShipmentDatePickerProps = {
  fieldKey: string;
  autoOpen?: boolean;
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
  assigned_driver_user_id: UserRound,
  vehicle_id: Truck,
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

type FleetOption = { id: string; label: string };

const INCOTERM_OPTIONS = ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF'];

const ShipmentDatePicker = ({ fieldKey, autoOpen, value, disabled, lang, onChange }: ShipmentDatePickerProps) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const options = useMemo(() => ({
    dateFormat: 'Y-m-d',
    altInput: true,
    altInputClass: 'h-8 w-full min-w-0 cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-slate-800 outline-none dark:text-slate-100',
    altFormat: 'd.m.Y',
    allowInput: true,
    locale: flatpickrI18n(lang),
    // The form can open on this field alone, in which case the calendar is what the user came for.
    onReady: (_dates: Date[], _dateStr: string, picker: { open: () => void }) => {
      if (autoOpen && !disabled) picker.open();
    },
    onChange: (_dates: Date[], dateStr: string) => {
      console.log('[tracking-date] flatpickr changed', { key: fieldKey, dateStr });
      onChangeRef.current(dateStr);
    },
  }), [autoOpen, disabled, fieldKey, lang]);

  return (
    <Flatpickr
      value={value}
      disabled={disabled}
      options={options}
      className="hidden"
    />
  );
};

export const TrackingShipmentDetails = ({ details, focusKey, lang, role, consigneeRecord, stops, savingKey, onSave, onSaveLocation }: TrackingShipmentDetailsProps) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [locationDetail, setLocationDetail] = useState<ShipmentDetail | null>(null);
  const [draft, setDraft] = useState('');
  const [dateValues, setDateValues] = useState<Record<string, string>>({});
  const committingKey = useRef<string | null>(null);
  const cancelledKey = useRef<string | null>(null);
  const canEdit = role === 'superadmin' || role === 'user';
  const [driverOptions, setDriverOptions] = useState<FleetOption[]>([]);
  const [vehicleOptions, setVehicleOptions] = useState<FleetOption[]>([]);
  const needsFleet = details.some((detail) => detail.input === 'driver' || detail.input === 'vehicle');

  // The driver and vehicle fields pick from the fleet, so their options come from the API once.
  useEffect(() => {
    if (!needsFleet || !canEdit) return undefined;
    let active = true;
    void (async () => {
      try {
        const [driverResponse, vehicleResponse] = await Promise.all([
          api.drivers.list({ per_page: 100 }),
          api.vehicles.list({ per_page: 100 }),
        ]);
        if (!active) return;
        setDriverOptions(driverResponse.data.flatMap((driver) => {
          const user = (driver.user || {}) as Record<string, unknown>;
          return user.id ? [{ id: String(user.id), label: String(user.name || `Driver ${user.id}`) }] : [];
        }));
        setVehicleOptions(vehicleResponse.data.map((vehicle) => ({
          id: String(vehicle.id),
          label: String(vehicle.registration_number || [vehicle.make, vehicle.model].filter(Boolean).join(' ') || `Vehicle ${vehicle.id}`),
        })));
      } catch {
        // A failed fleet lookup only means an empty picker; the rest of the form still works.
      }
    })();
    return () => { active = false; };
  }, [canEdit, needsFleet]);

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

  // Opening the form on a single field puts that field straight into edit mode, ready to type.
  useEffect(() => {
    if (!focusKey || !canEdit) return;
    const detail = details.find((item) => item.key === focusKey);
    if (!detail || detail.input === 'date') return;
    if (detail.key === 'departure' || detail.key === 'arrival') {
      setLocationDetail(detail);
      return;
    }
    setEditingKey(detail.key);
    setDraft(detail.rawValue ?? (detail.value === '—' ? '' : detail.value));
    // Only when the form opens on a field: re-running on every details refresh would fight the user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, canEdit]);

  const isLocked = (detail: ShipmentDetail) => Boolean(focusKey) && detail.key !== focusKey;

  const beginEdit = (detail: ShipmentDetail) => {
    if (!canEdit || savingKey || isLocked(detail)) return;
    if (detail.key === 'departure' || detail.key === 'arrival') {
      setLocationDetail(detail);
      return;
    }
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

  const locationStop = locationDetail
    ? stops?.find((stop) => String(stop.type) === (locationDetail.key === 'departure' ? 'pickup' : 'delivery'))
    : undefined;
  const initialLatitude = Number(locationStop?.latitude);
  const initialLongitude = Number(locationStop?.longitude);

  return (
    <>
    <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 xl:grid-cols-4">
      {details.map((detail) => {
        const editing = editingKey === detail.key;
        const saving = savingKey === detail.key;
        const locked = isLocked(detail);
        const DetailIcon = detailIcons[detail.key] || Info;

        return (
          <div
            key={detail.key}
            onClick={() => {
              if (detail.input !== 'date') beginEdit(detail);
            }}
            title={locked ? u('tracking.fieldLocked', 'Locked while completing this action') : canEdit && !editing ? 'Click to edit' : undefined}
            className={cn(
              'group h-16 min-w-0 rounded-xl border border-transparent p-2 transition-colors',
              canEdit && !editing && !locked && 'cursor-pointer hover:border-primary/25 hover:bg-primary/[0.03]',
              editing && 'border-primary/30 bg-primary/[0.04]',
              locked && 'pointer-events-none select-none opacity-45',
              // The field the form was opened on stays outlined, so it is obvious what to fill in.
              focusKey === detail.key && 'border-primary ring-2 ring-primary/30 bg-primary/[0.04]'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="flex min-w-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <DetailIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="truncate">{detail.label}</span>
              </p>
              {locked
                ? <Lock className="h-3 w-3 shrink-0 text-slate-400" />
                : canEdit && !editing && <Pencil className="h-3 w-3 text-primary opacity-0 transition-opacity group-hover:opacity-100" />}
            </div>

            {detail.input === 'date' && canEdit && !locked ? (
              <div className="mt-1" onClick={(event) => event.stopPropagation()}>
                <ShipmentDatePicker
                  fieldKey={detail.key}
                  autoOpen={focusKey === detail.key}
                  value={dateValues[detail.key] ?? detail.rawValue ?? ''}
                  disabled={Boolean(savingKey)}
                  lang={lang}
                  onChange={(nextValue) => void saveDate(detail, nextValue)}
                />
              </div>
            ) : !editing ? (
              <p className="mt-1 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{detail.value}</p>
            ) : detail.input === 'driver' || detail.input === 'vehicle' ? (
              <div className="mt-1" onClick={(event) => event.stopPropagation()}>
                <select
                  autoFocus
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    void save(detail, event.target.value ? Number(event.target.value) : null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') cancel();
                  }}
                  disabled={saving}
                  className="h-8 w-full min-w-0 cursor-pointer rounded-lg border border-primary/40 bg-white px-2 text-sm outline-none dark:bg-slate-950 dark:text-white"
                >
                  <option value="">
                    {detail.input === 'driver'
                      ? u('tracking.selectDriver', 'Select driver')
                      : u('tracking.selectVehicle', 'Select vehicle')}
                  </option>
                  {(detail.input === 'driver' ? driverOptions : vehicleOptions).map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </div>
            ) : detail.input === 'select' ? (
              <div className="mt-1" onClick={(event) => event.stopPropagation()}>
                <select
                  autoFocus
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onBlur={() => saveOnBlur(detail)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void save(detail);
                    if (event.key === 'Escape') cancel();
                  }}
                  disabled={saving}
                  className="h-8 w-full min-w-0 cursor-pointer rounded-lg border border-primary/40 bg-white px-2 text-sm outline-none dark:bg-slate-950 dark:text-white"
                >
                  <option value="">Select Incoterm</option>
                  {INCOTERM_OPTIONS.map((incoterm) => <option key={incoterm} value={incoterm}>{incoterm}</option>)}
                </select>
              </div>
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
    <AddressMapModal
      open={Boolean(locationDetail)}
      lang={lang}
      title={locationDetail?.key === 'arrival'
        ? u('postLoadModal.deliveryAddress', 'Delivery address')
        : u('postLoadModal.pickupAddress', 'Pickup address')}
      initialQuery={locationDetail?.value === '—' ? '' : locationDetail?.value}
      initialPosition={Number.isFinite(initialLatitude) && Number.isFinite(initialLongitude)
        ? [initialLatitude, initialLongitude]
        : null}
      onClose={() => {
        if (!savingKey) setLocationDetail(null);
      }}
      onSelect={(location) => {
        if (!locationDetail) return;
        void onSaveLocation(locationDetail, location).then((saved) => {
          if (saved) setLocationDetail(null);
        });
      }}
    />
    </>
  );
};
