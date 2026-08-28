import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Award,
  BadgeCheck,
  Boxes,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Container,
  Cpu,
  DoorOpen,
  FileCheck2,
  FileText,
  Forklift,
  Gauge,
  Hash,
  Home,
  Layers,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  PackageCheck,
  Phone,
  Plus,
  Recycle,
  Ruler,
  ScanLine,
  Send,
  Settings2,
  ShieldCheck,
  Snowflake,
  StickyNote,
  Thermometer,
  Trash2,
  Truck,
  UploadCloud,
  UserRound,
  Users,
  Warehouse as WarehouseIcon,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { ApiError, api } from '../../../services/api';
import { Language } from '../../../types';
import { ui } from '../../../i18n';
import { cn } from '../../../lib/cn';
import { Button } from '../../ui/Button';
import { Toggle } from '../../ui/Toggle';
import { CountrySelect } from '../../location/CountrySelect';
import {
  CapabilityCard,
  CheckBox,
  CounterRow,
  Label,
  PhoneField,
  SectionCard,
  Segmented,
  SelectField,
  StatusPill,
  TextField,
  TextareaField,
  YesNo,
} from './fields';
import { buildWarehousePayload } from './payload';
import {
  BARCODE_OPTIONS,
  CAPABILITY_OPTIONS,
  CONTACT_METHOD_OPTIONS,
  CYCLE_COUNTING_OPTIONS,
  DEPARTMENT_OPTIONS,
  HANDLING_CAPABILITY_OPTIONS,
  INVENTORY_TRACKING_OPTIONS,
  LICENSE_TYPE_OPTIONS,
  OPERATING_HOURS_TEMPLATES,
  PICKING_METHOD_OPTIONS,
  RACKING_SYSTEM_OPTIONS,
  REQUIRED_DOCUMENTS,
  STANDARD_OPTIONS,
  STORAGE_TYPE_OPTIONS,
  StepId,
  TIME_ZONE_OPTIONS,
  TMS_OPTIONS,
  UOM_OPTIONS,
  WAREHOUSE_CALENDAR_OPTIONS,
  WAREHOUSE_STATUS_OPTIONS,
  WAREHOUSE_TYPE_OPTIONS,
  WMS_OPTIONS,
  WORKING_DAY_OPTIONS,
  WarehouseDraft,
  createWarehouseDraft,
  type RequiredDocumentId,
} from './types';

const STEPS: Array<{ id: StepId; icon: LucideIcon; label: string }> = [
  { id: 'general', icon: Building2, label: 'General Information' },
  { id: 'capacity', icon: Boxes, label: 'Capacity & Inventory' },
  { id: 'operations', icon: Settings2, label: 'Operations' },
  { id: 'documents', icon: FileCheck2, label: 'Documents & Compliance' },
  { id: 'review', icon: CheckCircle2, label: 'Review & Submit' },
];

const CONTACT_METHOD_ICONS = { Email: Mail, Phone, SMS: MessageSquare, WhatsApp: Phone } as const;

const CAPABILITY_ICONS: Record<string, LucideIcon> = {
  receiving: Package,
  cross_docking: Forklift,
  storage: WarehouseIcon,
  value_added: Layers,
  picking: PackageCheck,
  returns: Recycle,
  packing: Container,
  temperature_controlled: Snowflake,
};

// Fields that block the Next button, per step.
const REQUIRED_BY_STEP: Record<StepId, Array<keyof WarehouseDraft>> = {
  general: ['name', 'code', 'warehouseType', 'status', 'addressLine1', 'city', 'postalCode', 'countryCode', 'contactName', 'contactPhone', 'contactEmail'],
  capacity: ['totalCapacityPallets'],
  operations: ['operatingHoursTemplate', 'timeZone'],
  documents: [],
  review: [],
};

const formatBytes = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

const daysUntil = (value: string) => {
  const target = value ? new Date(value) : null;
  if (!target || Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / 86_400_000);
};

export const AddWarehouseModal = ({
  open,
  lang,
  onClose,
  onCreated,
}: {
  open: boolean;
  lang: Language;
  onClose: () => void;
  onCreated?: () => void;
}) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [step, setStep] = useState<StepId>('general');
  const [draft, setDraft] = useState<WarehouseDraft>(createWarehouseDraft);
  const [visited, setVisited] = useState<StepId[]>(['general']);
  const [invalid, setInvalid] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputs = useRef<Partial<Record<RequiredDocumentId, HTMLInputElement | null>>>({});

  const setField = <K extends keyof WarehouseDraft>(key: K, value: WarehouseDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const toggleIn = (key: 'capabilities' | 'handlingCapabilities' | 'standards' | 'workingDays', value: string) =>
    setDraft((current) => ({
      ...current,
      [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value],
    }));

  const stepIndex = STEPS.findIndex((item) => item.id === step);
  const bad = (field: keyof WarehouseDraft) => invalid.has(field as string);

  const missingOn = (target: StepId) =>
    REQUIRED_BY_STEP[target].filter((key) => String(draft[key] ?? '').trim() === '' || String(draft[key]) === '0');

  const goToStep = (next: StepId) => {
    setStep(next);
    setVisited((current) => (current.includes(next) ? current : [...current, next]));
    setError('');
  };


  const pickFile = (slot: RequiredDocumentId, file: File | null) =>
    setDraft((current) => ({
      ...current,
      documents: {
        ...current.documents,
        [slot]: { ...current.documents[slot], file, fileName: file?.name ?? '', fileSize: file?.size ?? 0, documentId: null },
      },
    }));

  const addZone = () =>
    setDraft((current) => {
      const id = `zone-${Date.now()}`;
      const zones = [...current.temperatureZones, { id, name: '', rangeMin: '', rangeMax: '', areaSqm: '' }];
      return { ...current, temperatureZones: zones, defaultTemperatureZoneId: current.defaultTemperatureZoneId || id };
    });
  const removeZone = (id: string) =>
    setDraft((current) => {
      const zones = current.temperatureZones.filter((zone) => zone.id !== id);
      return {
        ...current,
        temperatureZones: zones,
        defaultTemperatureZoneId: current.defaultTemperatureZoneId === id ? (zones[0]?.id ?? '') : current.defaultTemperatureZoneId,
      };
    });
  const patchZone = (id: string, patch: Partial<{ name: string; rangeMin: string; rangeMax: string; areaSqm: string }>) =>
    setDraft((current) => ({
      ...current,
      temperatureZones: current.temperatureZones.map((zone) => (zone.id === id ? { ...zone, ...patch } : zone)),
    }));

  const capacityPallets = Number(draft.totalCapacityPallets.replace(/[^0-9]/g, '')) || 0;
  const thresholdPallets = (percent: string) => Math.round((capacityPallets * (Number(percent) || 0)) / 100);

  // The summary tile shows the envelope of every configured zone, so it only reads as a range once
  // at least one zone has both ends filled in.
  const temperatureRange = useMemo(() => {
    const parse = (value: string) => (value.trim() === '' ? null : Number(value));
    const mins = draft.temperatureZones.map((zone) => parse(zone.rangeMin)).filter((value): value is number => value !== null && !Number.isNaN(value));
    const maxs = draft.temperatureZones.map((zone) => parse(zone.rangeMax)).filter((value): value is number => value !== null && !Number.isNaN(value));
    if (mins.length === 0 || maxs.length === 0) return null;
    return `${Math.min(...mins)}°C to ${Math.max(...maxs)}°C`;
  }, [draft.temperatureZones]);

  const submit = async () => {
    const missing = [...missingOn('general'), ...missingOn('capacity'), ...missingOn('operations')];
    if (missing.length > 0) {
      setInvalid(new Set(missing as string[]));
      setError(u('addWarehouse.missingFields', 'Fill in the highlighted required fields to continue.'));
      goToStep(missingOn('general').length > 0 ? 'general' : missingOn('capacity').length > 0 ? 'capacity' : 'operations');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // Files go up first so the warehouse row can carry the resulting document ids.
      const uploaded = { ...draft.documents };
      for (const entry of REQUIRED_DOCUMENTS) {
        const slot = uploaded[entry.id];
        if (!slot.file || slot.documentId) continue;
        try {
          const created = await api.documents.upload({ file: slot.file, type: entry.id, name: entry.label });
          uploaded[entry.id] = { ...slot, documentId: Number(created.id) || null };
        } catch {
          // A rejected attachment must not lose the whole form - the file name is still recorded
          // and the operator can re-upload it from the warehouse's document tab.
        }
      }
      await api.warehouses.create(buildWarehousePayload({ ...draft, documents: uploaded }));
      onCreated?.();
      setDraft(createWarehouseDraft());
      setStep('general');
      setVisited(['general']);
      onClose();
    } catch (caught) {
      const validation = caught instanceof ApiError ? Object.values(caught.errors).flat()[0] : null;
      setError(validation || (caught instanceof Error ? caught.message : 'Warehouse could not be created.'));
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------- step bodies

  const generalStep = (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <SectionCard icon={Building2} title={u('addWarehouse.warehouseInfo', 'Warehouse Information')} subtitle={u('addWarehouse.warehouseInfoSub', 'General information about the warehouse')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label required>{u('addWarehouse.warehouseName', 'Warehouse Name')}</Label>
              <TextField icon={Home} invalid={bad('name')} value={draft.name} onChange={(event) => setField('name', event.target.value)} placeholder="Enter warehouse name" />
            </div>
            <div>
              <Label required>{u('addWarehouse.warehouseCode', 'Warehouse Code')}</Label>
              <TextField icon={Hash} invalid={bad('code')} value={draft.code} onChange={(event) => setField('code', event.target.value.toUpperCase())} placeholder="e.g. WH001, MAIN-01" />
            </div>
            <div>
              <Label required>{u('addWarehouse.warehouseType', 'Warehouse Type')}</Label>
              <SelectField icon={WarehouseIcon} invalid={bad('warehouseType')} value={draft.warehouseType} onChange={(event) => setField('warehouseType', event.target.value)}>
                <option value="">{u('addWarehouse.selectWarehouseType', 'Select warehouse type')}</option>
                {WAREHOUSE_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </SelectField>
            </div>
            <div>
              <Label required>{u('addWarehouse.status', 'Status')}</Label>
              <SelectField icon={CheckCircle2} value={draft.status} onChange={(event) => setField('status', event.target.value)}>
                {WAREHOUSE_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </SelectField>
            </div>
            <div className="sm:col-span-2">
              <Label>{u('addWarehouse.description', 'Description')}</Label>
              <TextareaField value={draft.description} onChange={(value) => setField('description', value)} placeholder="Enter warehouse description..." />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={MapPin} title={u('addWarehouse.location', 'Warehouse Location')} subtitle={u('addWarehouse.locationSub', 'Where is your warehouse located?')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label required>{u('addWarehouse.addressLine1', 'Address Line 1')}</Label>
              <TextField icon={MapPin} invalid={bad('addressLine1')} value={draft.addressLine1} onChange={(event) => setField('addressLine1', event.target.value)} placeholder="Enter street address" />
            </div>
            <div className="sm:col-span-2">
              <Label>{u('addWarehouse.addressLine2', 'Address Line 2')}</Label>
              <TextField icon={MapPin} value={draft.addressLine2} onChange={(event) => setField('addressLine2', event.target.value)} placeholder="Apartment, suite, unit, building (optional)" />
            </div>
            <div>
              <Label required>{u('addWarehouse.city', 'City')}</Label>
              <TextField icon={Building2} invalid={bad('city')} value={draft.city} onChange={(event) => setField('city', event.target.value)} placeholder="Enter city" />
            </div>
            <div>
              <Label>{u('addWarehouse.stateProvince', 'State / Province')}</Label>
              <TextField icon={MapPin} value={draft.stateProvince} onChange={(event) => setField('stateProvince', event.target.value)} placeholder="Enter state / province" />
            </div>
            <div>
              <Label required>{u('addWarehouse.postalCode', 'Postal / ZIP Code')}</Label>
              <TextField icon={Hash} invalid={bad('postalCode')} value={draft.postalCode} onChange={(event) => setField('postalCode', event.target.value)} placeholder="Enter postal code" />
            </div>
            <div>
              <Label required>{u('addWarehouse.country', 'Country')}</Label>
              <div className={cn('[&_button]:h-10 [&_button]:rounded-xl', bad('countryCode') && '[&_button]:border-rose-400')}>
                <CountrySelect value={draft.countryCode} onChange={(value) => setField('countryCode', value)} placeholder={u('addWarehouse.selectCountry', 'Select country')} />
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
        <SectionCard icon={Users} title={u('addWarehouse.contactInfo', 'Contact Information')} subtitle={u('addWarehouse.contactInfoSub', 'Primary contacts for this warehouse')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label required>{u('addWarehouse.primaryContactName', 'Primary Contact Name')}</Label>
              <TextField icon={UserRound} invalid={bad('contactName')} value={draft.contactName} onChange={(event) => setField('contactName', event.target.value)} placeholder="Enter full name" />
            </div>
            <div>
              <Label required>{u('addWarehouse.contactPhone', 'Contact Phone')}</Label>
              <PhoneField dial={draft.contactPhoneDial} onDialChange={(value) => setField('contactPhoneDial', value)} value={draft.contactPhone} onChange={(value) => setField('contactPhone', value)} />
            </div>
            <div>
              <Label required>{u('addWarehouse.contactEmail', 'Contact Email')}</Label>
              <TextField icon={Mail} type="email" invalid={bad('contactEmail')} value={draft.contactEmail} onChange={(event) => setField('contactEmail', event.target.value)} placeholder="Enter email address" />
            </div>
            <div>
              <Label>{u('addWarehouse.alternatePhone', 'Alternate Phone')}</Label>
              <PhoneField dial={draft.alternatePhoneDial} onDialChange={(value) => setField('alternatePhoneDial', value)} value={draft.alternatePhone} onChange={(value) => setField('alternatePhone', value)} />
            </div>
            <div>
              <Label>{u('addWarehouse.department', 'Department')}</Label>
              <SelectField icon={ClipboardList} value={draft.department} onChange={(event) => setField('department', event.target.value)}>
                <option value="">{u('addWarehouse.selectDepartment', 'Select department')}</option>
                {DEPARTMENT_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </SelectField>
            </div>
            <div>
              <Label>{u('addWarehouse.preferredContactMethod', 'Preferred Contact Method')}</Label>
              <Segmented options={CONTACT_METHOD_OPTIONS} value={draft.preferredContactMethod as (typeof CONTACT_METHOD_OPTIONS)[number]} onChange={(value) => setField('preferredContactMethod', value)} icons={CONTACT_METHOD_ICONS} />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={BadgeCheck} title={u('addWarehouse.managementInfo', 'Management Information')} subtitle={u('addWarehouse.managementInfoSub', 'Warehouse management details')}>
          <div className="grid gap-3">
            <div>
              <Label>{u('addWarehouse.warehouseManager', 'Warehouse Manager')}</Label>
              <TextField icon={UserRound} value={draft.managerName} onChange={(event) => setField('managerName', event.target.value)} placeholder="Enter manager name" />
            </div>
            <div>
              <Label>{u('addWarehouse.managerEmail', 'Manager Email')}</Label>
              <TextField icon={Mail} type="email" value={draft.managerEmail} onChange={(event) => setField('managerEmail', event.target.value)} placeholder="Enter manager email" />
            </div>
            <div>
              <Label>{u('addWarehouse.managerPhone', 'Manager Phone')}</Label>
              <PhoneField dial={draft.managerPhoneDial} onDialChange={(value) => setField('managerPhoneDial', value)} value={draft.managerPhone} onChange={(value) => setField('managerPhone', value)} />
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        icon={ClipboardList}
        title={`${u('addWarehouse.summary', 'Warehouse Summary')} (${u('addWarehouse.autoPreview', 'auto-preview')})`}
        subtitle={u('addWarehouse.summarySub', 'Overview of key information (will be updated as you fill the form)')}
        className="bg-slate-50/60 dark:bg-slate-900/60"
      >
        <div className="grid gap-2 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {[
            { icon: WarehouseIcon, label: u('addWarehouse.warehouseType', 'Warehouse Type'), value: draft.warehouseType || u('addWarehouse.notSelected', 'Not selected'), hint: '', tone: 'bg-violet-500/10 text-violet-500' },
            { icon: Boxes, label: u('addWarehouse.totalCapacity', 'Total Capacity'), value: String(capacityPallets), hint: u('addWarehouse.palletPositions', 'Pallet Positions'), tone: 'bg-sky-500/10 text-sky-500' },
            { icon: Ruler, label: u('addWarehouse.storageArea', 'Storage Area'), value: `${draft.storageAreaSqm || 0} m²`, hint: u('addWarehouse.totalArea', 'Total Area'), tone: 'bg-emerald-500/10 text-emerald-500' },
            { icon: Thermometer, label: u('addWarehouse.temperatureRange', 'Temperature Range'), value: temperatureRange ?? 'N/A', hint: temperatureRange ? '' : u('addWarehouse.notSpecified', 'Not specified'), tone: 'bg-amber-500/10 text-amber-500' },
            { icon: Clock3, label: u('addWarehouse.operatingHours', 'Operating Hours'), value: draft.operatingHoursTemplate === 'Custom Schedule' ? u('addWarehouse.notSet', 'Not set') : draft.operatingHoursTemplate, hint: u('addWarehouse.setSchedule', 'Set schedule'), tone: 'bg-blue-500/10 text-blue-500' },
            { icon: DoorOpen, label: u('addWarehouse.dockDoors', 'Dock Doors'), value: String(draft.dockDoors), hint: u('addWarehouse.doors', 'Doors'), tone: 'bg-rose-500/10 text-rose-500' },
          ].map((tile) => (
            <div key={tile.label} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-950">
              <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', tile.tone)}>
                <tile.icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">{tile.label}</span>
                <span className="block truncate text-xs font-black text-slate-800 dark:text-white">{tile.value}</span>
                {tile.hint && <span className="block truncate text-[10px] text-slate-400">{tile.hint}</span>}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );

  const capacityStep = (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <SectionCard icon={Home} title={u('addWarehouse.warehouseCapacity', 'Warehouse Capacity')} subtitle={u('addWarehouse.warehouseCapacitySub', 'Set the total capacity and storage limits for this warehouse.')}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label required>{u('addWarehouse.totalCapacityPallets', 'Total Capacity (Pallets)')}</Label>
              <TextField icon={Boxes} invalid={bad('totalCapacityPallets')} value={draft.totalCapacityPallets} onChange={(event) => setField('totalCapacityPallets', event.target.value)} placeholder="1,000" />
            </div>
            <div>
              <Label>{u('addWarehouse.totalCapacityCbm', 'Total Capacity (CBM)')}</Label>
              <TextField icon={Container} value={draft.totalCapacityCbm} onChange={(event) => setField('totalCapacityCbm', event.target.value)} placeholder="5,000" />
            </div>
            <div>
              <Label>{u('addWarehouse.storageAreaSqm', 'Storage Area (m²)')}</Label>
              <TextField icon={Ruler} value={draft.storageAreaSqm} onChange={(event) => setField('storageAreaSqm', event.target.value)} placeholder="2,500" />
            </div>
          </div>
          <p className="mb-2 mt-4 text-[11px] font-semibold text-slate-500">{u('addWarehouse.utilizationThresholds', 'Utilization Thresholds')}</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { key: 'thresholdWarning' as const, label: u('addWarehouse.warning', 'Warning'), dot: 'bg-emerald-500' },
              { key: 'thresholdHigh' as const, label: u('addWarehouse.high', 'High'), dot: 'bg-amber-500' },
              { key: 'thresholdCritical' as const, label: u('addWarehouse.critical', 'Critical'), dot: 'bg-rose-500' },
            ].map((row) => (
              <div key={row.key} className="rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
                <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <span className={cn('h-2 w-2 rounded-full', row.dot)} />
                  {row.label} ({draft[row.key]}%)
                </span>
                <div className="flex items-center gap-2">
                  <TextField value={String(thresholdPallets(draft[row.key]))} readOnly className="h-9" />
                  <span className="shrink-0 text-[11px] text-slate-400">{u('addWarehouse.pallets', 'pallets')}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard icon={Layers} title={u('addWarehouse.storageConfiguration', 'Storage Configuration')} subtitle={u('addWarehouse.storageConfigurationSub', 'Configure storage types and temperature controlled zones.')}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>{u('addWarehouse.storageType', 'Storage Type')}</Label>
              <SelectField value={draft.storageType} onChange={(event) => setField('storageType', event.target.value)}>
                {STORAGE_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </SelectField>
            </div>
            <div>
              <Label>{u('addWarehouse.rackingSystem', 'Racking System')}</Label>
              <SelectField value={draft.rackingSystem} onChange={(event) => setField('rackingSystem', event.target.value)}>
                {RACKING_SYSTEM_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </SelectField>
            </div>
            <div>
              <Label>{u('addWarehouse.maximumHeight', 'Maximum Height (m)')}</Label>
              <TextField icon={Ruler} value={draft.maximumHeightM} onChange={(event) => setField('maximumHeightM', event.target.value)} placeholder="12.0" />
            </div>
          </div>

          <p className="mb-1.5 mt-4 text-[11px] font-semibold text-slate-500">{u('addWarehouse.temperatureZones', 'Temperature Zones')}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  <th className="pb-1.5 pr-2">{u('addWarehouse.zoneName', 'Zone Name')}</th>
                  <th className="pb-1.5 pr-2">{u('addWarehouse.temperatureRangeCol', 'Temperature Range')}</th>
                  <th className="pb-1.5 pr-2">{u('addWarehouse.areaSqm', 'Area (m²)')}</th>
                  <th className="pb-1.5 pr-2">{u('addWarehouse.default', 'Default')}</th>
                  <th className="pb-1.5" />
                </tr>
              </thead>
              <tbody>
                {draft.temperatureZones.length === 0 && (
                  <tr><td colSpan={5} className="py-3 text-center text-[11px] text-slate-400">{u('addWarehouse.noZones', 'No temperature zones yet.')}</td></tr>
                )}
                {draft.temperatureZones.map((zone) => (
                  <tr key={zone.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="py-1.5 pr-2">
                      <TextField className="h-9" value={zone.name} onChange={(event) => patchZone(zone.id, { name: event.target.value })} placeholder="Ambient" />
                    </td>
                    <td className="py-1.5 pr-2">
                      <div className="flex items-center gap-1">
                        <TextField className="h-9" value={zone.rangeMin} onChange={(event) => patchZone(zone.id, { rangeMin: event.target.value })} placeholder="15" />
                        <span className="text-[11px] text-slate-400">to</span>
                        <TextField className="h-9" value={zone.rangeMax} onChange={(event) => patchZone(zone.id, { rangeMax: event.target.value })} placeholder="25" />
                      </div>
                    </td>
                    <td className="py-1.5 pr-2">
                      <TextField className="h-9" value={zone.areaSqm} onChange={(event) => patchZone(zone.id, { areaSqm: event.target.value })} placeholder="1,800" />
                    </td>
                    <td className="py-1.5 pr-2">
                      <button type="button" onClick={() => setField('defaultTemperatureZoneId', zone.id)} className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border-2 border-slate-300 dark:border-slate-600">
                        {draft.defaultTemperatureZoneId === zone.id && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </button>
                    </td>
                    <td className="py-1.5">
                      <button type="button" onClick={() => removeZone(zone.id)} className="cursor-pointer rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addZone} className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-primary hover:bg-primary/10">
            <Plus className="h-3.5 w-3.5" />{u('addWarehouse.addTemperatureZone', 'Add Temperature Zone')}
          </button>
        </SectionCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <SectionCard icon={Package} title={u('addWarehouse.inventoryManagement', 'Inventory Management')} subtitle={u('addWarehouse.inventoryManagementSub', 'Configure inventory tracking and control settings.')}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>{u('addWarehouse.inventoryTracking', 'Inventory Tracking')}</Label>
              <SelectField value={draft.inventoryTracking} onChange={(event) => setField('inventoryTracking', event.target.value)}>
                {INVENTORY_TRACKING_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </SelectField>
            </div>
            <div>
              <Label>{u('addWarehouse.cycleCounting', 'Cycle Counting')}</Label>
              <SelectField value={draft.cycleCounting} onChange={(event) => setField('cycleCounting', event.target.value)}>
                {CYCLE_COUNTING_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </SelectField>
            </div>
            <div>
              <Label>{u('addWarehouse.replenishmentAlert', 'Stock Replenishment Alert')}</Label>
              <div className="flex items-center gap-2">
                <TextField value={draft.replenishmentAlertPercent} onChange={(event) => setField('replenishmentAlertPercent', event.target.value)} placeholder="20" />
                <span className="shrink-0 text-[11px] text-slate-400">%</span>
              </div>
            </div>
            <div>
              <Label>{u('addWarehouse.pickingMethod', 'Default Picking Method')}</Label>
              <SelectField value={draft.pickingMethod} onChange={(event) => setField('pickingMethod', event.target.value)}>
                {PICKING_METHOD_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </SelectField>
            </div>
            <div>
              <Label>{u('addWarehouse.accuracyTarget', 'Inventory Accuracy Target')}</Label>
              <div className="flex items-center gap-2">
                <TextField value={draft.accuracyTargetPercent} onChange={(event) => setField('accuracyTargetPercent', event.target.value)} placeholder="98.0" />
                <span className="shrink-0 text-[11px] text-slate-400">%</span>
              </div>
            </div>
            <div>
              <Label>{u('addWarehouse.overstockThreshold', 'Overstock Alert Threshold')}</Label>
              <div className="flex items-center gap-2">
                <TextField value={draft.overstockAlertPercent} onChange={(event) => setField('overstockAlertPercent', event.target.value)} placeholder="110" />
                <span className="shrink-0 text-[11px] text-slate-400">%</span>
              </div>
            </div>
            <div>
              <Label>{u('addWarehouse.defaultUom', 'Default UoM')}</Label>
              <SelectField value={draft.defaultUom} onChange={(event) => setField('defaultUom', event.target.value)}>
                {UOM_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </SelectField>
            </div>
            <div className="sm:col-span-2">
              <Label>{u('addWarehouse.allowNegativeInventory', 'Allow Negative Inventory')}</Label>
              <div className="flex h-10 items-center gap-2">
                <Toggle checked={draft.allowNegativeInventory} onClick={() => setField('allowNegativeInventory', !draft.allowNegativeInventory)} />
                <span className="text-xs font-semibold text-slate-500">{draft.allowNegativeInventory ? u('common.yes', 'Yes') : u('common.no', 'No')}</span>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Forklift} title={u('addWarehouse.handlingEquipmentTitle', 'Handling & Equipment')} subtitle={u('addWarehouse.handlingEquipmentSub', 'Define material handling equipment and capabilities.')}>
          <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
            <div>
              <p className="mb-2 text-[11px] font-semibold text-slate-500">{u('addWarehouse.equipmentAvailable', 'Equipment Available')}</p>
              <div className="space-y-2">
                <CounterRow icon={Forklift} label={u('addWarehouse.forklifts', 'Forklifts')} value={draft.forklifts} onChange={(value) => setField('forklifts', value)} />
                <CounterRow icon={Package} label={u('addWarehouse.palletJacks', 'Pallet Jacks')} value={draft.palletJacks} onChange={(value) => setField('palletJacks', value)} />
                <CounterRow icon={Truck} label={u('addWarehouse.reachTrucks', 'Reach Trucks')} value={draft.reachTrucks} onChange={(value) => setField('reachTrucks', value)} />
                <CounterRow icon={DoorOpen} label={u('addWarehouse.dockLevellers', 'Dock Levelers')} value={draft.dockLevellers} onChange={(value) => setField('dockLevellers', value)} />
                <CounterRow icon={Layers} label={u('addWarehouse.conveyors', 'Conveyors')} value={draft.conveyors} onChange={(value) => setField('conveyors', value)} unit="lines" />
                <CounterRow icon={DoorOpen} label={u('addWarehouse.dockDoors', 'Dock Doors')} value={draft.dockDoors} onChange={(value) => setField('dockDoors', value)} unit="doors" />
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-semibold text-slate-500">{u('addWarehouse.handlingCapabilities', 'Handling Capabilities')}</p>
              <div className="space-y-2">
                {HANDLING_CAPABILITY_OPTIONS.map((option) => (
                  <CheckBox
                    key={option.id}
                    label={option.label}
                    checked={draft.handlingCapabilities.includes(option.id)}
                    onChange={() => toggleIn('handlingCapabilities', option.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );

  const operationsStep = (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <SectionCard icon={Settings2} title={u('addWarehouse.operationalSettings', 'Operational Settings')} subtitle={u('addWarehouse.operationalSettingsSub', 'Define how the warehouse will operate.')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label required>{u('addWarehouse.operatingHoursTemplate', 'Operating Hours Template')}</Label>
              <SelectField icon={Clock3} value={draft.operatingHoursTemplate} onChange={(event) => setField('operatingHoursTemplate', event.target.value)}>
                {OPERATING_HOURS_TEMPLATES.map((option) => <option key={option} value={option}>{option}</option>)}
              </SelectField>
            </div>
            <div>
              <Label required>{u('addWarehouse.timeZone', 'Time Zone')}</Label>
              <SelectField icon={MapPin} value={draft.timeZone} onChange={(event) => setField('timeZone', event.target.value)}>
                {TIME_ZONE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </SelectField>
            </div>
            <div>
              <Label required>{u('addWarehouse.workingDays', 'Working Days')}</Label>
              <div className="flex flex-wrap gap-1">
                {WORKING_DAY_OPTIONS.map((day) => {
                  const active = draft.workingDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleIn('workingDays', day)}
                      className={cn(
                        'h-9 w-10 cursor-pointer rounded-lg border text-[11px] font-bold transition-colors',
                        active ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950',
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label>{u('addWarehouse.receivingCutoff', 'Receiving Cut-off Time')}</Label>
              <TextField icon={Clock3} type="time" value={draft.receivingCutoff} onChange={(event) => setField('receivingCutoff', event.target.value)} />
            </div>
            <div>
              <Label>{u('addWarehouse.shippingCutoff', 'Shipping Cut-off Time')}</Label>
              <TextField icon={Clock3} type="time" value={draft.shippingCutoff} onChange={(event) => setField('shippingCutoff', event.target.value)} />
            </div>
            <div>
              <Label>{u('addWarehouse.warehouseCalendar', 'Warehouse Calendar')}</Label>
              <SelectField icon={CalendarDays} value={draft.warehouseCalendar} onChange={(event) => setField('warehouseCalendar', event.target.value)}>
                {WAREHOUSE_CALENDAR_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </SelectField>
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={Forklift} title={u('addWarehouse.handlingEquipment', 'Handling Equipment')} subtitle={u('addWarehouse.handlingEquipmentAvailable', 'Equipment and resources available.')}>
          <div className="space-y-2">
            <CounterRow icon={Forklift} label={u('addWarehouse.forklifts', 'Forklifts')} value={draft.forklifts} onChange={(value) => setField('forklifts', value)} />
            <CounterRow icon={Package} label={u('addWarehouse.palletJacks', 'Pallet Jacks')} value={draft.palletJacks} onChange={(value) => setField('palletJacks', value)} />
            <CounterRow icon={DoorOpen} label={u('addWarehouse.dockLevellers', 'Dock Levelers')} value={draft.dockLevellers} onChange={(value) => setField('dockLevellers', value)} />
            <CounterRow icon={Layers} label={u('addWarehouse.conveyors', 'Conveyors')} value={draft.conveyors} onChange={(value) => setField('conveyors', value)} unit="lines" />
            <CounterRow icon={ScanLine} label={u('addWarehouse.handheldScanners', 'Handheld Scanners')} value={draft.handheldScanners} onChange={(value) => setField('handheldScanners', value)} />
          </div>
          <div className="mt-3">
            <Label>{u('addWarehouse.specialEquipment', 'Special Equipment / Notes')}</Label>
            <TextareaField value={draft.specialEquipmentNotes} onChange={(value) => setField('specialEquipmentNotes', value)} maxLength={300} rows={2} placeholder="Enter any special equipment or operational notes..." />
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <SectionCard icon={ShieldCheck} title={u('addWarehouse.warehouseCapabilities', 'Warehouse Capabilities')} subtitle={u('addWarehouse.warehouseCapabilitiesSub', 'Define the services and capabilities available at this warehouse.')}>
          <div className="grid gap-2 sm:grid-cols-2">
            {CAPABILITY_OPTIONS.map((option) => (
              <CapabilityCard
                key={option.id}
                icon={CAPABILITY_ICONS[option.id] ?? Package}
                title={option.label}
                description={option.description}
                checked={draft.capabilities.includes(option.id)}
                onChange={() => toggleIn('capabilities', option.id)}
              />
            ))}
          </div>
        </SectionCard>

        <SectionCard icon={Cpu} title={u('addWarehouse.technology', 'Technology & Systems')} subtitle={u('addWarehouse.technologySub', 'Systems and software used in operations.')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>{u('addWarehouse.wmsSystem', 'WMS System')}</Label>
              <SelectField value={draft.wmsSystem} onChange={(event) => setField('wmsSystem', event.target.value)}>
                <option value="">{u('addWarehouse.selectWms', 'Select WMS')}</option>
                {WMS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </SelectField>
            </div>
            <div>
              <Label>{u('addWarehouse.tmsIntegration', 'TMS Integration')}</Label>
              <SelectField value={draft.tmsIntegration} onChange={(event) => setField('tmsIntegration', event.target.value)}>
                {TMS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </SelectField>
            </div>
            <div>
              <Label>{u('addWarehouse.barcodeSystem', 'Barcode System')}</Label>
              <SelectField value={draft.barcodeSystem} onChange={(event) => setField('barcodeSystem', event.target.value)}>
                {BARCODE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </SelectField>
            </div>
            <div>
              <Label>{u('addWarehouse.rfidCapability', 'RFID Capability')}</Label>
              <Segmented options={['Yes', 'No', 'Planned'] as const} value={draft.rfidCapability as 'Yes' | 'No' | 'Planned'} onChange={(value) => setField('rfidCapability', value)} />
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard icon={StickyNote} title={u('addWarehouse.operationalNotes', 'Operational Notes')} subtitle={u('addWarehouse.operationalNotesSub', 'Additional operational information and procedures.')}>
        <TextareaField value={draft.operationalNotes} onChange={(value) => setField('operationalNotes', value)} placeholder="Enter any additional operational notes, procedures, or special instructions..." />
      </SectionCard>
    </div>
  );

  const documentsStep = (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="space-y-3">
        <SectionCard icon={FileCheck2} title={u('addWarehouse.requiredDocuments', 'Required Documents')} subtitle={u('addWarehouse.requiredDocumentsSub', 'Upload all mandatory documents for this warehouse.')}>
          <div className="space-y-2">
            {REQUIRED_DOCUMENTS.map((entry) => {
              const slot = draft.documents[entry.id];
              return (
                <div key={entry.id} className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-2.5 dark:border-slate-800">
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', slot.fileName ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 text-slate-400 dark:bg-slate-800')}>
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-slate-800 dark:text-white">
                      {entry.label}
                      {entry.required && <span className="ml-0.5 text-rose-500">*</span>}
                    </span>
                    <span className="block truncate text-[10px] text-slate-400">{slot.fileName ? `${slot.fileName} · ${formatBytes(slot.fileSize)}` : entry.hint}</span>
                  </span>
                  {slot.fileName ? (
                    <>
                      <StatusPill tone="ok"><CheckCircle2 className="h-2.5 w-2.5" />{u('addWarehouse.uploaded', 'Uploaded')}</StatusPill>
                      <button type="button" onClick={() => pickFile(entry.id, null)} className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <StatusPill tone={entry.required ? 'bad' : 'muted'}>{entry.required ? u('addWarehouse.notUploaded', 'Not Uploaded') : u('addWarehouse.optional', 'Optional')}</StatusPill>
                      <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={() => fileInputs.current[entry.id]?.click()}>
                        {u('addWarehouse.upload', 'Upload')}
                      </Button>
                    </>
                  )}
                  <input
                    ref={(node) => { fileInputs.current[entry.id] = node; }}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={(event) => pickFile(entry.id, event.target.files?.[0] ?? null)}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-center">
            <UploadCloud className="mx-auto h-5 w-5 text-primary" />
            <p className="mt-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">{u('addWarehouse.dragDrop', 'Drag & drop files here or use the Upload buttons above')}</p>
            <p className="mt-0.5 text-[10px] text-slate-400">{u('addWarehouse.fileHint', 'PDF, JPG, PNG up to 10MB each')}</p>
          </div>
          <p className="mt-2 text-[10px] text-slate-400">{u('addWarehouse.secureNote', 'Files are secure and accessible only to authorized users.')}</p>
        </SectionCard>

        <SectionCard icon={Award} title={u('addWarehouse.standards', 'Standards & Certifications')} subtitle={u('addWarehouse.standardsSub', 'Select the standards and certifications this warehouse complies with.')}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {STANDARD_OPTIONS.map((option) => (
              <CheckBox key={option} label={option} checked={draft.standards.includes(option)} onChange={() => toggleIn('standards', option)} />
            ))}
            <div className="flex min-w-[180px] flex-1 items-center gap-2">
              <span className="shrink-0 text-xs font-semibold text-slate-700 dark:text-slate-200">{u('addWarehouse.other', 'Other')}</span>
              <TextField className="h-9" value={draft.otherStandard} onChange={(event) => setField('otherStandard', event.target.value)} placeholder="Enter other standard" />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={StickyNote} title={u('addWarehouse.notesOptional', 'Notes (Optional)')} subtitle={u('addWarehouse.notesOptionalSub', 'Add any additional notes about documents or compliance.')}>
          <TextareaField value={draft.documentsNotes} onChange={(value) => setField('documentsNotes', value)} placeholder="Add any additional notes about documents or compliance..." />
        </SectionCard>
      </div>

      <div className="space-y-3">
        <SectionCard icon={ShieldCheck} title={u('addWarehouse.compliancePermits', 'Compliance & Permits')} subtitle={u('addWarehouse.compliancePermitsSub', 'Provide details about licenses and operational permits.')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label required>{u('addWarehouse.operatingLicense', 'Warehouse Operating License')}</Label>
              <div className="flex gap-1.5">
                <SelectField className="w-32 shrink-0" value={draft.operatingLicenseType} onChange={(event) => setField('operatingLicenseType', event.target.value)}>
                  {LICENSE_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </SelectField>
                <TextField value={draft.operatingLicenseNumber} onChange={(event) => setField('operatingLicenseNumber', event.target.value)} placeholder="WH-OP-2024-5567" />
              </div>
            </div>
            <div>
              <Label required>{u('addWarehouse.issuingAuthority', 'Issuing Authority')}</Label>
              <TextField icon={Building2} value={draft.issuingAuthority} onChange={(event) => setField('issuingAuthority', event.target.value)} placeholder="City Logistics Authority" />
            </div>
            <div>
              <Label required>{u('addWarehouse.issuedDate', 'Issued Date')}</Label>
              <TextField icon={CalendarDays} type="date" value={draft.licenseIssuedDate} onChange={(event) => setField('licenseIssuedDate', event.target.value)} />
            </div>
            <div>
              <Label required>{u('addWarehouse.expiryDate', 'Expiry Date')}</Label>
              <TextField icon={CalendarDays} type="date" value={draft.licenseExpiryDate} onChange={(event) => setField('licenseExpiryDate', event.target.value)} />
            </div>
            <div>
              <Label>{u('addWarehouse.customsBonded', 'Customs Bonded Warehouse')}</Label>
              <YesNo value={draft.customsBonded} onChange={(value) => setField('customsBonded', value)} />
            </div>
            <div>
              <Label>{u('addWarehouse.bondedCode', 'Bonded Warehouse Code')}</Label>
              <TextField value={draft.bondedCode} onChange={(event) => setField('bondedCode', event.target.value)} placeholder="BW-55789" />
            </div>
            <div>
              <Label>{u('addWarehouse.hazmatPermit', 'Hazardous Materials Handling Permit')}</Label>
              <YesNo value={draft.hazmatPermit} onChange={(value) => setField('hazmatPermit', value)} />
            </div>
            <div>
              <Label>{u('addWarehouse.permitNumber', 'Permit Number')}</Label>
              <TextField value={draft.hazmatPermitNumber} onChange={(event) => setField('hazmatPermitNumber', event.target.value)} placeholder="Enter permit number" />
            </div>
            <div>
              <Label>{u('addWarehouse.foodGrade', 'Food Grade Storage Certified')}</Label>
              <YesNo value={draft.foodGradeCertified} onChange={(value) => setField('foodGradeCertified', value)} />
            </div>
            <div>
              <Label>{u('addWarehouse.certificationNumber', 'Certification Number')}</Label>
              <TextField value={draft.foodGradeCertNumber} onChange={(event) => setField('foodGradeCertNumber', event.target.value)} placeholder="Enter certification number" />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={CalendarDays} title={u('addWarehouse.expiryOverview', 'Document Expiry Overview')} subtitle={u('addWarehouse.expiryOverviewSub', 'Keep track of document validity and renewals.')}>
          <table className="w-full text-left text-xs">
            <tbody>
              {[
                { label: u('addWarehouse.operatingLicense', 'Warehouse Operating License'), date: draft.licenseExpiryDate },
                ...REQUIRED_DOCUMENTS.filter((entry) => draft.documents[entry.id].fileName).map((entry) => ({ label: entry.label, date: draft.documents[entry.id].expiresOn })),
              ].map((row) => {
                const remaining = daysUntil(row.date);
                return (
                  <tr key={row.label} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                    <td className="py-2 pr-2">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{row.label}</span>
                      </span>
                    </td>
                    <td className="py-2 pr-2 text-slate-500">{row.date || '—'}</td>
                    <td className="py-2 text-right">
                      {remaining === null
                        ? <StatusPill tone="muted">{u('addWarehouse.noExpiry', 'No date')}</StatusPill>
                        : remaining < 0
                          ? <StatusPill tone="bad">{u('addWarehouse.expired', 'Expired')}</StatusPill>
                          : remaining <= 60
                            ? <StatusPill tone="warn">{u('addWarehouse.expiresIn', 'Expires in')} {remaining} {u('addWarehouse.days', 'days')}</StatusPill>
                            : <StatusPill tone="ok">{u('addWarehouse.valid', 'Valid')}</StatusPill>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </SectionCard>
      </div>
    </div>
  );

  const reviewRow = (label: string, value: string) => (
    <div key={label} className="flex items-start justify-between gap-3 border-b border-slate-100 py-1.5 last:border-b-0 dark:border-slate-800">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-right text-xs font-semibold text-slate-800 dark:text-white">{value || '—'}</span>
    </div>
  );

  const reviewStep = (
    <div className="grid gap-3 lg:grid-cols-2">
      <SectionCard icon={Building2} title={u('addWarehouse.warehouseInfo', 'Warehouse Information')}>
        {reviewRow(u('addWarehouse.warehouseName', 'Warehouse Name'), draft.name)}
        {reviewRow(u('addWarehouse.warehouseCode', 'Warehouse Code'), draft.code)}
        {reviewRow(u('addWarehouse.warehouseType', 'Warehouse Type'), draft.warehouseType)}
        {reviewRow(u('addWarehouse.status', 'Status'), draft.status)}
        {reviewRow(u('addWarehouse.location', 'Warehouse Location'), [draft.addressLine1, draft.city, draft.postalCode, draft.countryCode.toUpperCase()].filter(Boolean).join(', '))}
      </SectionCard>
      <SectionCard icon={Users} title={u('addWarehouse.contactInfo', 'Contact Information')}>
        {reviewRow(u('addWarehouse.primaryContactName', 'Primary Contact Name'), draft.contactName)}
        {reviewRow(u('addWarehouse.contactEmail', 'Contact Email'), draft.contactEmail)}
        {reviewRow(u('addWarehouse.contactPhone', 'Contact Phone'), draft.contactPhone ? `${draft.contactPhoneDial} ${draft.contactPhone}` : '')}
        {reviewRow(u('addWarehouse.warehouseManager', 'Warehouse Manager'), draft.managerName)}
        {reviewRow(u('addWarehouse.preferredContactMethod', 'Preferred Contact Method'), draft.preferredContactMethod)}
      </SectionCard>
      <SectionCard icon={Boxes} title={u('addWarehouse.warehouseCapacity', 'Warehouse Capacity')}>
        {reviewRow(u('addWarehouse.totalCapacityPallets', 'Total Capacity (Pallets)'), String(capacityPallets))}
        {reviewRow(u('addWarehouse.totalCapacityCbm', 'Total Capacity (CBM)'), draft.totalCapacityCbm)}
        {reviewRow(u('addWarehouse.storageAreaSqm', 'Storage Area (m²)'), draft.storageAreaSqm)}
        {reviewRow(u('addWarehouse.storageType', 'Storage Type'), draft.storageType)}
        {reviewRow(u('addWarehouse.temperatureZones', 'Temperature Zones'), draft.temperatureZones.map((zone) => zone.name).filter(Boolean).join(', '))}
      </SectionCard>
      <SectionCard icon={Settings2} title={u('addWarehouse.operationalSettings', 'Operational Settings')}>
        {reviewRow(u('addWarehouse.operatingHoursTemplate', 'Operating Hours Template'), draft.operatingHoursTemplate)}
        {reviewRow(u('addWarehouse.timeZone', 'Time Zone'), draft.timeZone)}
        {reviewRow(u('addWarehouse.workingDays', 'Working Days'), draft.workingDays.join(', '))}
        {reviewRow(u('addWarehouse.warehouseCapabilities', 'Warehouse Capabilities'), CAPABILITY_OPTIONS.filter((option) => draft.capabilities.includes(option.id)).map((option) => option.label).join(', '))}
        {reviewRow(u('addWarehouse.wmsSystem', 'WMS System'), draft.wmsSystem)}
      </SectionCard>
      <SectionCard icon={Gauge} title={u('addWarehouse.handlingEquipment', 'Handling Equipment')}>
        {reviewRow(u('addWarehouse.forklifts', 'Forklifts'), String(draft.forklifts))}
        {reviewRow(u('addWarehouse.palletJacks', 'Pallet Jacks'), String(draft.palletJacks))}
        {reviewRow(u('addWarehouse.dockLevellers', 'Dock Levelers'), String(draft.dockLevellers))}
        {reviewRow(u('addWarehouse.conveyors', 'Conveyors'), String(draft.conveyors))}
        {reviewRow(u('addWarehouse.dockDoors', 'Dock Doors'), String(draft.dockDoors))}
      </SectionCard>
      <SectionCard icon={FileCheck2} title={u('addWarehouse.documentsCompliance', 'Documents & Compliance')}>
        {reviewRow(u('addWarehouse.uploadedDocuments', 'Uploaded Documents'), String(REQUIRED_DOCUMENTS.filter((entry) => draft.documents[entry.id].fileName).length) + ' / ' + String(REQUIRED_DOCUMENTS.length))}
        {reviewRow(u('addWarehouse.operatingLicense', 'Warehouse Operating License'), draft.operatingLicenseNumber)}
        {reviewRow(u('addWarehouse.expiryDate', 'Expiry Date'), draft.licenseExpiryDate)}
        {reviewRow(u('addWarehouse.customsBonded', 'Customs Bonded Warehouse'), draft.customsBonded ? u('common.yes', 'Yes') : u('common.no', 'No'))}
        {reviewRow(u('addWarehouse.standards', 'Standards & Certifications'), [...draft.standards, draft.otherStandard].filter(Boolean).join(', '))}
      </SectionCard>
    </div>
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[210] flex items-stretch justify-center overflow-hidden bg-slate-950/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.992 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.996 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex h-[100dvh] max-h-[100dvh] w-full flex-col overflow-hidden bg-slate-50 shadow-2xl dark:bg-slate-950"
          >
            <div className="shrink-0 border-b border-slate-100 bg-white/96 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/96">
              <div className="flex h-16 items-center justify-between gap-3 px-5 md:px-7">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <WarehouseIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-base font-black leading-tight text-slate-900 dark:text-white md:text-lg">{u('warehouses.create', 'Create Warehouse')}</p>
                    <p className="hidden truncate text-xs text-slate-500 sm:block">{u('addWarehouse.subtitle', 'Register a storage facility with its capacity, operations and compliance profile')}</p>
                  </div>
                </div>
                <div className="hidden shrink-0 items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-bold text-slate-500 dark:border-slate-800 lg:inline-flex">
                  {u('postLoadModal.stepLabel', 'Step')} {stepIndex + 1} / {STEPS.length}
                </div>
                <button
                  onClick={onClose}
                  aria-label={u('common.cancel', 'Cancel')}
                  className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Same stepper as the post-load form: equal-width columns over one continuous rule. */}
            <div className="shrink-0 overflow-x-auto border-b border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60 sm:px-6">
              <div className="relative flex w-full items-start">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-3.5 z-0 h-px bg-slate-200 dark:bg-slate-700"
                  style={{ left: `${50 / STEPS.length}%`, right: `${50 / STEPS.length}%` }}
                />
                {STEPS.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.id === step;
                  // Every step is reachable at any time - the form only validates on save.
                  const isDone = !isActive && visited.includes(item.id) && missingOn(item.id).length === 0;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goToStep(item.id)}
                      className="relative z-10 flex min-w-[6.5rem] flex-1 basis-0 cursor-pointer flex-col items-center gap-1.5 px-1"
                    >
                      <span
                        className={cn(
                          'relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                          isDone ? 'bg-emerald-500 text-white' : isActive ? 'bg-primary text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800',
                        )}
                      >
                        {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </span>
                      <span className={cn('whitespace-nowrap text-[11px] font-bold', isActive ? 'text-primary' : isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400')}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
              <div className="mb-3 px-1">
                <h2 className="text-base font-black text-slate-900 dark:text-white">{STEPS[stepIndex].label}</h2>
                <p className="text-[11px] text-slate-500">
                  {step === 'general' && u('addWarehouse.generalSub', 'Basic details, location and contacts for this facility.')}
                  {step === 'capacity' && u('addWarehouse.capacitySub', 'Define storage capacity, inventory tracking and handling capabilities.')}
                  {step === 'operations' && u('addWarehouse.operationsSub', 'Configure operational settings and warehouse capabilities.')}
                  {step === 'documents' && u('addWarehouse.documentsSub', 'Upload and manage all required documents and ensure compliance with regulations.')}
                  {step === 'review' && u('addWarehouse.reviewSub', 'Check everything before the warehouse goes live.')}
                </p>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                >
                  {step === 'general' && generalStep}
                  {step === 'capacity' && capacityStep}
                  {step === 'operations' && operationsStep}
                  {step === 'documents' && documentsStep}
                  {step === 'review' && reviewStep}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white dark:border-slate-800 dark:bg-slate-900">
              {error && (
                <div className="mx-5 mt-3 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400 md:mx-7">
                  {error}
                </div>
              )}
              {/* One primary action on every step: save. Moving between steps is the stepper's job. */}
              <div className="flex items-center justify-end gap-2 px-5 py-3 md:px-7">
                <Button variant="ghost" className="h-10" onClick={onClose} disabled={submitting}>{u('common.cancel', 'Cancel')}</Button>
                <Button className="h-10 gap-2" onClick={() => void submit()} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? u('addWarehouse.creating', 'Creating...') : u('addWarehouse.save', 'Spasi')}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
