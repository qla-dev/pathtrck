
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import Flatpickr from 'react-flatpickr';
import type { Instance as FlatpickrInstance } from 'flatpickr/dist/types/instance';
import { Check, LoaderCircle, RotateCcw, Upload } from 'lucide-react';

import type { Language } from '../../types';
import { flatpickrI18n } from '../../i18n';
import { datePlaceholder, formatDate } from '../../lib/dates';
import { api } from '../../services/api';
import { showError } from '../../lib/swal';
import { ShipmentChecklistTable } from './ShipmentChecklistTable';

type Props = {
  workspace: Record<string, unknown>;
  lang: Language;
  onUpdated: (workspace: Record<string, unknown>) => void;
  /** Refreshes the load after an inline edit writes to it. */
  onLoadChanged?: () => Promise<void> | void;
};

const COPY = {
  en: {
    title: 'Operational checklist', offerStatus: 'Offer status', empty: 'No operational tasks yet.', saving: 'Saving...',
    selectDriver: 'Select driver', selectVehicle: 'Select vehicle', upload: 'Upload', uploaded: 'Uploaded',
    saveFailed: 'The change could not be saved', complete: 'Complete', reopen: 'Reopen', enterValue: 'Enter value',
    pending: 'Pending', inProgress: 'In progress', completed: 'Completed', blocked: 'Blocked',
    terminalCutoff: 'Terminal / cut-off', flightDetails: 'Flight / schedule', cargoAcceptance: 'Acceptance date and time', arrival: 'Arrival date and time',
  },
  bs: {
    title: 'Operativna checklist', offerStatus: 'Status ponude', empty: 'Još nema operativnih zadataka.', saving: 'Spremanje...',
    selectDriver: 'Izaberi vozača', selectVehicle: 'Izaberi vozilo', upload: 'Priloži', uploaded: 'Priloženo',
    saveFailed: 'Izmjena nije spremljena', complete: 'Završi', reopen: 'Ponovo otvori', enterValue: 'Unesi podatak',
    pending: 'Na čekanju', inProgress: 'U toku', completed: 'Završeno', blocked: 'Blokirano',
    terminalCutoff: 'Terminal / cut-off', flightDetails: 'Let / raspored', cargoAcceptance: 'Datum i vrijeme prijema', arrival: 'Datum i vrijeme dolaska',
  },
  de: {
    title: 'Operative Checkliste', offerStatus: 'Angebotsstatus', empty: 'Noch keine operativen Aufgaben.', saving: 'Speichern...',
    selectDriver: 'Fahrer wählen', selectVehicle: 'Fahrzeug wählen', upload: 'Hochladen', uploaded: 'Hochgeladen',
    saveFailed: 'Die Änderung konnte nicht gespeichert werden', complete: 'Abschließen', reopen: 'Wieder öffnen', enterValue: 'Wert eingeben',
    pending: 'Ausstehend', inProgress: 'In Bearbeitung', completed: 'Abgeschlossen', blocked: 'Blockiert',
    terminalCutoff: 'Terminal / Cut-off', flightDetails: 'Flug / Flugplan', cargoAcceptance: 'Annahmedatum und -zeit', arrival: 'Ankunftsdatum und -zeit',
  },
} as const;

type FleetOption = { id: string; label: string };

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const array = (value: unknown): Array<Record<string, unknown>> => Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
const dateValue = (value: unknown) => String(value || '').slice(0, 10);

const CONTROL_CLASS = 'h-9 min-w-0 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-primary disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200';

// Dates are picked the way the rest of the app picks them: the value stays ISO for the API while
// flatpickr shows it in the viewer's own locale, with that locale's month and weekday names.
const ChecklistDatePicker = memo(({ fieldKey, value, disabled, lang, onChange }: {
  fieldKey: string;
  value: string;
  disabled: boolean;
  lang: Language;
  onChange: (value: string) => void;
}) => {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const pickerRef = useRef<FlatpickrInstance | null>(null);

  // The calendar is appended to the body, so a click anywhere else in the page has to close it.
  // The listener runs in the capture phase to survive handlers that stop propagation on the way up.
  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      const picker = pickerRef.current;
      if (!picker?.isOpen) return;
      const target = event.target as Node;
      if (picker.calendarContainer?.contains(target)) return;
      if (picker.altInput?.contains(target) || picker.input?.contains(target)) return;
      picker.close();
    };
    document.addEventListener('mousedown', closeOnOutsideClick, true);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick, true);
  }, []);

  const options = useMemo(() => ({
    dateFormat: 'Y-m-d',
    altInput: true,
    altInputClass: `${CONTROL_CLASS} w-[140px] cursor-pointer`,
    altFormat: lang === 'de' ? 'd.m.Y' : lang === 'bs' ? 'd.m.Y.' : 'd M Y',
    allowInput: true,
    locale: flatpickrI18n(lang),
    onReady: (_dates: Date[], _dateStr: string, picker: FlatpickrInstance) => { pickerRef.current = picker; },
    onChange: (_dates: Date[], dateStr: string) => onChangeRef.current(dateStr),
  }), [lang]);

  return (
    <Flatpickr
      key={fieldKey}
      value={value}
      disabled={disabled}
      options={options}
      placeholder={datePlaceholder(lang)}
      className="hidden"
    />
  );
});

export const ShipmentOperationsTab = ({ workspace, lang, onUpdated, onLoadChanged }: Props) => {
  const text = COPY[lang === 'bs' || lang === 'de' ? lang : 'en'];
  const checklist = array(workspace.operational_checklist);
  const freightLoad = record(workspace.freight_load);
  const loadId = String(workspace.load_id || freightLoad.id || '');
  const dueDate = formatDate(freightLoad.etd_at || workspace.booked_at, lang);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [driverOptions, setDriverOptions] = useState<FleetOption[]>([]);
  const [vehicleOptions, setVehicleOptions] = useState<FleetOption[]>([]);

  // The inline pickers choose from the fleet, so their options are fetched once for the whole table.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [driverResponse, vehicleResponse] = await Promise.all([
          api.drivers.list({ per_page: 100 }),
          api.vehicles.list({ per_page: 100 }),
        ]);
        if (!active) return;
        setDriverOptions(driverResponse.data.flatMap((driver) => {
          const user = record(driver.user);
          return user.id ? [{ id: String(user.id), label: String(user.name || `Driver ${user.id}`) }] : [];
        }));
        setVehicleOptions(vehicleResponse.data.map((vehicle) => ({
          id: String(vehicle.id),
          label: String(vehicle.registration_number || [vehicle.make, vehicle.model].filter(Boolean).join(' ') || `Vehicle ${vehicle.id}`),
        })));
      } catch {
        // An empty picker is the only consequence; the checklist itself still works.
      }
    })();
    return () => { active = false; };
  }, []);

  // The checklist is stored as one array, so any change to a single task rewrites the whole list
  // with only that entry's fields replaced.
  const patchTask = async (taskKey: string, changes: Record<string, unknown>) => {
    const response = await api.shipmentWorkspaces.update(Number(workspace.id), {
      operational_checklist: checklist.map((item) => {
        const base = {
          key: String(item.key),
          status: String(item.status || 'pending'),
          due_date: item.due_date ?? null,
          action_value: item.action_value ?? null,
          completed_at: item.completed_at ?? null,
          completed_by_user_id: item.completed_by_user_id ?? null,
        };
        return String(item.key) === taskKey ? { ...base, ...changes } : base;
      }),
    });
    onUpdated(response.data);
  };

  // Filling a task's field is what completes it, so the checklist entry follows the value: set it
  // and the task is done, clear it and the task is waiting again.
  const markTask = async (taskKey: string, done: boolean) => {
    const current = checklist.find((item) => String(item.key) === taskKey);
    if (!current || (String(current.status) === 'completed') === done) return;
    await patchTask(taskKey, {
      status: done ? 'completed' : 'pending',
      completed_at: done ? new Date().toISOString() : null,
    });
  };

  const saveDueDate = async (taskKey: string, value: string) => {
    setBusyKey(taskKey);
    try {
      await patchTask(taskKey, { due_date: value || null });
    } catch (error) {
      void showError(text.saveFailed, error instanceof Error ? error.message : undefined);
    } finally {
      setBusyKey(null);
    }
  };

  const saveLoadField = async (taskKey: string, field: string, value: string | number | null) => {
    if (!loadId) return;
    setBusyKey(taskKey);
    try {
      await api.loads.update(loadId, { [field]: value });
      await markTask(taskKey, Boolean(value));
      await onLoadChanged?.();
    } catch (error) {
      void showError(text.saveFailed, error instanceof Error ? error.message : undefined);
    } finally {
      setBusyKey(null);
    }
  };

  const uploadDocument = async (taskKey: string, file: File, type: string) => {
    if (!loadId) return;
    setBusyKey(taskKey);
    try {
      await api.documents.upload({ file, loadId, type, name: file.name });
      await patchTask(taskKey, {
        action_value: file.name,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      await onLoadChanged?.();
    } catch (error) {
      void showError(text.saveFailed, error instanceof Error ? error.message : undefined);
    } finally {
      setBusyKey(null);
    }
  };

  const fleetSelect = (taskKey: string, field: 'assigned_driver_user_id' | 'vehicle_id', options: FleetOption[], placeholder: string) => (
    <select
      value={String(freightLoad[field] || '')}
      disabled={busyKey === taskKey || !loadId}
      onChange={(event) => void saveLoadField(taskKey, field, event.target.value ? Number(event.target.value) : null)}
      className={`${CONTROL_CLASS} w-full max-w-[180px] cursor-pointer`}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
    </select>
  );

  const dateField = (taskKey: string, field: 'etd_at' | 'atd_at') => (
    <ChecklistDatePicker
      fieldKey={`${taskKey}-${field}`}
      value={dateValue(freightLoad[field])}
      disabled={busyKey === taskKey || !loadId}
      lang={lang}
      onChange={(value) => void saveLoadField(taskKey, field, value || null)}
    />
  );

  const uploadField = (taskKey: string, type: string) => (
    <label
      className={`${CONTROL_CLASS} inline-flex max-w-[190px] cursor-pointer items-center gap-2 hover:border-primary`}
      title={String(checklist.find((item) => String(item.key) === taskKey)?.action_value || '')}
    >
      {busyKey === taskKey ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
      <span className="truncate">{checklist.find((item) => String(item.key) === taskKey)?.action_value ? text.uploaded : text.upload}</span>
      <input
        type="file"
        className="hidden"
        disabled={busyKey === taskKey || !loadId}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void uploadDocument(taskKey, file, type);
        }}
      />
    </label>
  );

  const saveTaskValue = async (taskKey: string, value: string) => {
    setBusyKey(taskKey);
    try {
      const normalized = value.trim();
      await patchTask(taskKey, {
        action_value: normalized || null,
        status: normalized ? 'completed' : 'pending',
        completed_at: normalized ? new Date().toISOString() : null,
      });
    } catch (error) {
      void showError(text.saveFailed, error instanceof Error ? error.message : undefined);
    } finally {
      setBusyKey(null);
    }
  };

  const valueField = (
    item: Record<string, unknown>,
    type: 'text' | 'number' | 'datetime-local' = 'text',
    placeholder: string = text.enterValue,
  ) => {
    const taskKey = String(item.key);
    return (
      <input
        key={`${taskKey}-${String(item.action_value || '')}`}
        type={type}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? '0.01' : undefined}
        defaultValue={String(item.action_value || '')}
        placeholder={placeholder}
        disabled={busyKey === taskKey}
        onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
        onBlur={(event) => {
          if (event.target.value !== String(item.action_value || '')) void saveTaskValue(taskKey, event.target.value);
        }}
        className={`${CONTROL_CLASS} w-full max-w-[190px]`}
      />
    );
  };

  const completionButton = (item: Record<string, unknown>) => {
    const taskKey = String(item.key);
    const done = String(item.status) === 'completed';
    return (
      <button
        type="button"
        disabled={busyKey === taskKey}
        onClick={() => void markTask(taskKey, !done)}
        className={`${CONTROL_CLASS} inline-flex cursor-pointer items-center gap-1.5 hover:border-primary`}
      >
        {busyKey === taskKey
          ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          : done ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
        {done ? text.reopen : text.complete}
      </button>
    );
  };

  const statusField = (item: Record<string, unknown>) => {
    const taskKey = String(item.key);
    return (
      <select
        value={String(item.status || 'pending')}
        disabled={busyKey === taskKey}
        onChange={async (event) => {
          const status = event.target.value;
          setBusyKey(taskKey);
          try {
            await patchTask(taskKey, {
              status,
              completed_at: status === 'completed' ? new Date().toISOString() : null,
            });
          } catch (error) {
            void showError(text.saveFailed, error instanceof Error ? error.message : undefined);
          } finally {
            setBusyKey(null);
          }
        }}
        className={`${CONTROL_CLASS} w-full max-w-[160px] cursor-pointer`}
      >
        <option value="pending">{text.pending}</option>
        <option value="in_progress">{text.inProgress}</option>
        <option value="completed">{text.completed}</option>
        <option value="blocked">{text.blocked}</option>
      </select>
    );
  };

  // Every task can carry its own deadline, whether or not it also writes a date onto the load.
  const renderDueDate = (item: Record<string, unknown>) => {
    const taskKey = String(item.key);
    return (
      <ChecklistDatePicker
        fieldKey={`${taskKey}-due`}
        value={dateValue(item.due_date)}
        disabled={busyKey === taskKey}
        lang={lang}
        onChange={(value) => void saveDueDate(taskKey, value)}
      />
    );
  };

  // Each task is completed where it lives: a driver is picked, a date is set, a document is filed.
  const renderAction = (item: Record<string, unknown>) => {
    const taskKey = String(item.key);
    switch (taskKey) {
      case 'confirm_storage_arrival':
        return valueField(item, 'datetime-local');
      case 'check_storage_documents':
        return completionButton(item);
      case 'record_storage_receipt':
      case 'assign_storage_location':
        return valueField(item);
      case 'confirm_storage_dispatch':
        return uploadField(taskKey, 'pod');
      case 'assign_driver_and_vehicle':
        // The vehicle belongs to its own row further down; this one only picks the driver.
        return fleetSelect(taskKey, 'assigned_driver_user_id', driverOptions, text.selectDriver);
      case 'vehicle_registrations':
        return fleetSelect(taskKey, 'vehicle_id', vehicleOptions, text.selectVehicle);
      case 'confirm_pickup_time':
      case 'departure_schedule':
        return dateField(taskKey, 'etd_at');
      case 'confirm_pickup':
      case 'departure_status':
        return dateField(taskKey, 'atd_at');
      case 'cmr_and_documents':
        return uploadField(taskKey, 'cmr');
      case 'proof_of_delivery':
        return uploadField(taskKey, 'pod');
      case 'security_and_customs_documents':
        return uploadField(taskKey, 'customs');
      case 'shipping_instructions':
        return uploadField(taskKey, 'shipping_instructions');
      case 'draft_bill_of_lading':
        return uploadField(taskKey, 'draft_bill_of_lading');
      case 'final_bill_of_lading':
        return uploadField(taskKey, 'bill_of_lading');
      case 'draft_awb':
        return uploadField(taskKey, 'draft_awb');
      case 'arrival_and_release_documents':
        return uploadField(taskKey, 'arrival_release');
      case 'booking_confirmation':
      case 'shipping_line_and_agent':
      case 'vessel_and_voyage':
      case 'container_details':
      case 'airline_and_agent':
      case 'mawb_hawb':
      case 'rail_operator':
      case 'terminals':
      case 'wagon_or_container':
      case 'rail_booking_confirmation':
        return valueField(item);
      case 'vgm':
        return valueField(item, 'number', 'kg');
      case 'terminal_and_cutoff':
        return valueField(item, 'text', text.terminalCutoff);
      case 'flight_details':
        return valueField(item, 'text', text.flightDetails);
      case 'cargo_acceptance':
        return valueField(item, 'datetime-local', text.cargoAcceptance);
      case 'arrival_status':
        return valueField(item, 'datetime-local', text.arrival);
      case 'tracking_and_status_updates':
      case 'transit_status':
        return statusField(item);
      case 'approve_draft':
      case 'approve_awb':
        return completionButton(item);
      default:
        return completionButton(item);
    }
  };

  return (
    <ShipmentChecklistTable
      checklist={checklist}
      lang={lang}
      dueDate={dueDate}
      renderAction={renderAction}
      renderDueDate={renderDueDate}
      showInstruction
    />
  );
};
