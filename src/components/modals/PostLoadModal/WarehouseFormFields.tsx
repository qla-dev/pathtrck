import { Dispatch, SetStateAction } from 'react';
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  Infinity as InfinityIcon,
  Layers,
  Lock,
  Package,
  ShieldCheck,
  Snowflake,
  ThermometerSnowflake,
  Umbrella,
  Warehouse,
} from 'lucide-react';
import { Map as MapGlyphIcon } from 'lucide-react';

import { Language } from '../../../types';
import { LoadDraft } from './types';
import { WAREHOUSE_STORAGE_TYPE_OPTIONS, WAREHOUSE_HANDLING_REQUIREMENT_OPTIONS, WAREHOUSE_RATE_UNIT_OPTIONS } from '../loadFormOptions';
import { FieldLabel } from './FieldLabel';
import { Input, Select } from './FormFields';
import { ChoiceCard } from './ChoiceCard';
import { CountrySelect } from '../../location/CountrySelect';
import { AddressAutocompleteField } from './AddressAutocompleteField';
import { DateInput } from './DateInput';

type SetField = <K extends keyof LoadDraft>(key: K, value: LoadDraft[K]) => void;
type Setter = Dispatch<SetStateAction<LoadDraft>>;

const STORAGE_TYPE_ICONS: Record<(typeof WAREHOUSE_STORAGE_TYPE_OPTIONS)[number], typeof Package> = {
  Ambient: Package,
  Chilled: Snowflake,
  Frozen: ThermometerSnowflake,
  Hazmat: AlertTriangle,
  Bulk: Layers,
  Bonded: Lock,
};

export const WarehouseCargoFields = ({ draft, setField, setDraft, u }: { draft: LoadDraft; setField: SetField; setDraft: Setter; u: (key: string, fallback: string) => string }) => {
  const toggleHandling = (value: string) => {
    setDraft((prev) => ({
      ...prev,
      loadingEquipment: prev.loadingEquipment.includes(value)
        ? prev.loadingEquipment.filter((item) => item !== value)
        : [...prev.loadingEquipment, value],
    }));
  };
  const needsTemperature = draft.warehouseStorageType === 'Chilled' || draft.warehouseStorageType === 'Frozen';

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <FieldLabel>{u('postLoadModal.warehouseStorageType', 'Vrsta skladištenja')}</FieldLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {WAREHOUSE_STORAGE_TYPE_OPTIONS.map((option) => (
            <ChoiceCard
              key={option}
              compact
              active={draft.warehouseStorageType === option}
              title={u(`postLoadModal.storageType.${option}`, option)}
              icon={STORAGE_TYPE_ICONS[option]}
              onClick={() => setField('warehouseStorageType', option)}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <FieldLabel>{u('postLoadModal.pallets', 'Palete')}</FieldLabel>
          <Input type="number" min="0" value={draft.pallets} onChange={(e) => setField('pallets', e.target.value)} placeholder="20" />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>{u('postLoadModal.cbm', 'CBM (m³)')}</FieldLabel>
          <Input type="number" min="0" value={draft.volumeM3} onChange={(e) => setField('volumeM3', e.target.value)} placeholder="30" />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>{u('postLoadModal.weight', 'Težina (t)')}</FieldLabel>
          <Input type="number" min="0" value={draft.weightKg} onChange={(e) => setField('weightKg', e.target.value)} placeholder="5" />
        </div>
      </div>

      {needsTemperature && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <FieldLabel>{u('postLoadModal.temperatureMin', 'Min. temperatura (°C)')}</FieldLabel>
            <Input type="number" value={draft.warehouseTemperatureMin} onChange={(e) => setField('warehouseTemperatureMin', e.target.value)} placeholder="2" />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>{u('postLoadModal.temperatureMax', 'Max. temperatura (°C)')}</FieldLabel>
            <Input type="number" value={draft.warehouseTemperatureMax} onChange={(e) => setField('warehouseTemperatureMax', e.target.value)} placeholder="8" />
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <FieldLabel>{u('postLoadModal.handlingRequirements', 'Zahtjevi za rukovanje')}</FieldLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {WAREHOUSE_HANDLING_REQUIREMENT_OPTIONS.map((option) => (
            <ChoiceCard
              key={option}
              compact
              active={draft.loadingEquipment.includes(option)}
              title={u(`postLoadModal.handlingReq.${option}`, option)}
              icon={Boxes}
              onClick={() => toggleHandling(option)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export const WarehouseLocationFields = ({
  draft,
  setField,
  setDraft,
  u,
  lang,
  onOpenMap,
}: {
  draft: LoadDraft;
  setField: SetField;
  setDraft: Setter;
  u: (key: string, fallback: string) => string;
  lang: Language;
  onOpenMap: () => void;
}) => (
  <div className="space-y-5 rounded-3xl border border-slate-200 p-4 dark:border-slate-800 md:p-5">
    <div className="flex items-center gap-2 text-orange-500">
      <Warehouse className="w-4 h-4" />
      <p className="text-xs font-black uppercase tracking-wider">{u('postLoadModal.warehousePreferredLocation', 'Željena lokacija skladišta')}</p>
    </div>

    <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
      <div className="space-y-1.5">
        <FieldLabel>{u('postLoadModal.address', 'Address')}</FieldLabel>
        <AddressAutocompleteField
          value={draft.pickupAddress}
          onChange={(value) => setField('pickupAddress', value)}
          onSelectLocation={(location) => setDraft((current) => ({
            ...current,
            pickupAddress: location.label,
            pickupCity: location.city || current.pickupCity,
            pickupCountry: location.countryCode || current.pickupCountry,
            pickupLatitude: String(location.latitude),
            pickupLongitude: String(location.longitude),
          }))}
          placeholder={u('postLoadModal.warehouseLocationPlaceholder', 'Search city or address')}
          onOpenMap={onOpenMap}
          mapButtonLabel={u('map.choosePickup', 'Choose pickup address on map')}
          mapButtonIcon={MapGlyphIcon}
          accentClassName="text-orange-500"
        />
      </div>
      <div className="space-y-1.5">
        <FieldLabel>{u('postLoadModal.country', 'Country')}</FieldLabel>
        <CountrySelect value={draft.pickupCountry} onChange={(value) => setField('pickupCountry', value)} />
      </div>
    </div>

    <div className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-1.5">
        <FieldLabel>{u('postLoadModal.warehouseStartDate', 'Datum početka')}</FieldLabel>
        <DateInput value={draft.warehouseStartDate} onChange={(value) => setField('warehouseStartDate', value)} placeholder="dd.mm.yyyy" lang={lang} />
      </div>
      <div className="space-y-1.5">
        <FieldLabel>{u('postLoadModal.warehouseEndDate', 'Datum završetka')}</FieldLabel>
        {draft.warehouseIsOngoing ? (
          <div className="flex h-[54px] items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 text-sm text-slate-500 dark:border-slate-700">
            <InfinityIcon className="h-4 w-4" /> {u('postLoadModal.warehouseOngoing', 'Neograničeno')}
          </div>
        ) : (
          <DateInput value={draft.warehouseEndDate} onChange={(value) => setField('warehouseEndDate', value)} placeholder="dd.mm.yyyy" lang={lang} />
        )}
      </div>
      <div className="space-y-1.5">
        <FieldLabel>{u('postLoadModal.warehouseDuration', 'Trajanje')}</FieldLabel>
        <ChoiceCard
          compact
          active={draft.warehouseIsOngoing}
          title={u('postLoadModal.warehouseOngoingToggle', 'Neograničeno trajanje')}
          icon={CalendarClock}
          onClick={() => setDraft((current) => ({ ...current, warehouseIsOngoing: !current.warehouseIsOngoing, warehouseEndDate: !current.warehouseIsOngoing ? '' : current.warehouseEndDate }))}
        />
      </div>
    </div>
  </div>
);

type WarehouseRequirementKey = 'warehouseRequiresCustomsBonded' | 'warehouseRequiresRacking' | 'warehouseRequiresInsurance' | 'warehouseRequiresSecurity';

export const WarehouseTermsFields = ({ draft, setField, u }: { draft: LoadDraft; setField: SetField; u: (key: string, fallback: string) => string }) => {
  const requirementToggles: Array<{ key: WarehouseRequirementKey; label: string; icon: typeof ShieldCheck }> = [
    { key: 'warehouseRequiresCustomsBonded', label: u('postLoadModal.warehouseCustomsBonded', 'Carinsko skladište (bonded)'), icon: Lock },
    { key: 'warehouseRequiresRacking', label: u('postLoadModal.warehouseRacking', 'Regalno skladištenje'), icon: Layers },
    { key: 'warehouseRequiresInsurance', label: u('postLoadModal.warehouseInsurance', 'Osiguranje robe'), icon: Umbrella },
    { key: 'warehouseRequiresSecurity', label: u('postLoadModal.warehouseSecurity', 'Obezbjeđenje / video nadzor'), icon: ShieldCheck },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="space-y-1.5">
          <FieldLabel>{u('postLoadModal.targetPrice', 'Vaša očekivana cijena (nije vidljiva javno)')}</FieldLabel>
          <Input type="number" min="0" value={draft.budget} onChange={(e) => setField('budget', e.target.value)} placeholder="450" />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>{u('postLoadModal.currency', 'Currency')}</FieldLabel>
          <Select value={draft.freightCurrency} onChange={(e) => setField('freightCurrency', e.target.value)}>
            <option value="EUR">EUR</option>
            <option value="BAM">BAM</option>
            <option value="USD">USD</option>
          </Select>
        </div>
        <div className="col-span-2 space-y-1.5">
          <FieldLabel>{u('postLoadModal.warehouseRateUnit', 'Jedinica cijene')}</FieldLabel>
          <Select value={draft.warehouseRateUnit} onChange={(e) => setField('warehouseRateUnit', e.target.value)}>
            {WAREHOUSE_RATE_UNIT_OPTIONS.map((option) => (
              <option key={option} value={option}>{u(`postLoadModal.rateUnit.${option}`, option)}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <FieldLabel>{u('postLoadModal.requirements', 'Zahtjevi')}</FieldLabel>
        <div className="grid grid-cols-2 gap-3">
          {requirementToggles.map((toggle) => (
            <ChoiceCard
              key={String(toggle.key)}
              compact
              active={draft[toggle.key]}
              title={toggle.label}
              icon={toggle.icon}
              onClick={() => setField(toggle.key, !draft[toggle.key])}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
