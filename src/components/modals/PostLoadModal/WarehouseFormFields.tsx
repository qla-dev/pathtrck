import { Dispatch, ReactNode, SetStateAction } from 'react';
import {
  AlertTriangle,
  Boxes,
  Forklift,
  Layers,
  Loader2,
  Lock,
  Package,
  PackageCheck,
  PackageOpen,
  MapPin,
  Radar,
  Route,
  ShieldCheck,
  Snowflake,
  Tags,
  ThermometerSnowflake,
  Umbrella,
  Warehouse,
} from 'lucide-react';
import { Map as MapGlyphIcon } from 'lucide-react';

import { cn } from '../../../lib/cn';
import { Language } from '../../../types';
import { LoadDraft } from './types';
import { WAREHOUSE_STORAGE_TYPE_OPTIONS, WAREHOUSE_HANDLING_REQUIREMENT_OPTIONS, WAREHOUSE_RATE_UNIT_OPTIONS } from '../loadFormOptions';
import { FieldLabel } from './FieldLabel';
import { Input, Select } from './FormFields';
import { ChoiceCard } from './ChoiceCard';
import { CountrySelect } from '../../location/CountrySelect';
import { AddressAutocompleteField } from './AddressAutocompleteField';
import { DateInput } from './DateInput';
import { TimeInput } from './TimeInput';
import { WarehouseAutocompleteField } from './WarehouseAutocompleteField';
import { VerticalRoutePoint } from './VerticalRoutePoint';
import { Button } from '../../ui/Button';

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

const STORAGE_TYPE_DESCRIPTIONS: Record<(typeof WAREHOUSE_STORAGE_TYPE_OPTIONS)[number], string> = {
  Ambient: 'Room temperature, dry goods',
  Chilled: 'Cold store, +2 to +8 °C',
  Frozen: 'Deep freeze, below -18 °C',
  Hazmat: 'Certified dangerous goods',
  Bulk: 'Loose, non-palletised cargo',
  Bonded: 'Customs-bonded warehouse',
};

export const HANDLING_ICONS: Record<(typeof WAREHOUSE_HANDLING_REQUIREMENT_OPTIONS)[number], typeof Package> = {
  'Cross-docking': Forklift,
  'Pick & Pack': PackageCheck,
  Labeling: Tags,
  Kitting: Boxes,
  Palletizing: Layers,
  Repackaging: PackageOpen,
};

export const HANDLING_DESCRIPTIONS: Record<(typeof WAREHOUSE_HANDLING_REQUIREMENT_OPTIONS)[number], string> = {
  'Cross-docking': 'Straight from inbound to outbound',
  'Pick & Pack': 'Order picking and packing',
  Labeling: 'Barcode and label application',
  Kitting: 'Assemble items into sets',
  Palletizing: 'Stack and wrap onto pallets',
  Repackaging: 'Repack into new units',
};

/**
 * Storage type picker, shown inline under "Temperature controlled" on the Cargo step for
 * warehouse loads rather than as a step of its own.
 */
export const WarehouseStorageTypeField = ({
  draft,
  setField,
  u,
}: {
  draft: LoadDraft;
  setField: SetField;
  u: (key: string, fallback: string) => string;
}) => (
  <div className="space-y-1.5">
    <FieldLabel>{u('postLoadModal.warehouseStorageType', 'Storage type')}</FieldLabel>
    <div className="grid gap-2 sm:grid-cols-2">
      {WAREHOUSE_STORAGE_TYPE_OPTIONS.map((option) => (
        <ChoiceCard
          key={option}
          compact
          active={draft.warehouseStorageType === option}
          title={u(`postLoadModal.storageType.${option}`, option)}
          description={u(`postLoadModal.storageTypeDesc.${option}`, STORAGE_TYPE_DESCRIPTIONS[option])}
          icon={STORAGE_TYPE_ICONS[option]}
          onClick={() => setField('warehouseStorageType', option)}
        />
      ))}
    </div>
  </div>
);

/** Bordered section card matching the other steps of the post-load form. */
const SectionBox = ({
  icon: Icon,
  title,
  className,
  children,
}: {
  icon: typeof Package;
  title: string;
  className?: string;
  children: ReactNode;
}) => (
  <section className={cn('space-y-4 rounded-3xl border border-slate-200 p-4 dark:border-slate-800 md:p-5', className)}>
    <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
      <Icon className="h-4 w-4" />
      <span>{title}</span>
    </div>
    {children}
  </section>
);

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
    <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
      {/* Pallets / CBM / weight are captured on the Cargo step (warehouse now shares the full road
          form), so this step only carries what is specific to storing the goods. */}
      <SectionBox icon={Warehouse} title={u('postLoadModal.warehouseStorageType', 'Storage type')}>
        <div className="grid gap-3 sm:grid-cols-2">
          {WAREHOUSE_STORAGE_TYPE_OPTIONS.map((option) => (
            <ChoiceCard
              key={option}
              active={draft.warehouseStorageType === option}
              title={u(`postLoadModal.storageType.${option}`, option)}
              description={u(`postLoadModal.storageTypeDesc.${option}`, STORAGE_TYPE_DESCRIPTIONS[option])}
              icon={STORAGE_TYPE_ICONS[option]}
              onClick={() => setField('warehouseStorageType', option)}
            />
          ))}
        </div>

        {needsTemperature && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <FieldLabel>{u('postLoadModal.temperatureMin', 'Min. temperature (°C)')}</FieldLabel>
              <Input type="number" value={draft.warehouseTemperatureMin} onChange={(e) => setField('warehouseTemperatureMin', e.target.value)} placeholder="2" />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>{u('postLoadModal.temperatureMax', 'Max. temperature (°C)')}</FieldLabel>
              <Input type="number" value={draft.warehouseTemperatureMax} onChange={(e) => setField('warehouseTemperatureMax', e.target.value)} placeholder="8" />
            </div>
          </div>
        )}
      </SectionBox>

      <SectionBox icon={ShieldCheck} title={u('postLoadModal.handlingRequirements', 'Handling requirements')}>
        <div className="grid gap-3 sm:grid-cols-2">
          {WAREHOUSE_HANDLING_REQUIREMENT_OPTIONS.map((option) => (
            <ChoiceCard
              key={option}
              active={draft.loadingEquipment.includes(option)}
              title={u(`postLoadModal.handlingReq.${option}`, option)}
              description={u(`postLoadModal.handlingReqDesc.${option}`, HANDLING_DESCRIPTIONS[option])}
              icon={HANDLING_ICONS[option]}
              onClick={() => toggleHandling(option)}
            />
          ))}
        </div>
      </SectionBox>
    </div>
  );
};

export const WarehouseLocationFields = ({
  draft,
  setField,
  setDraft,
  u,
  lang,
  onOpenPickupMap,
  onOpenWarehouseArea,
  routeDistanceKm,
  recalculatingRoute,
  onShowRoute,
}: {
  draft: LoadDraft;
  setField: SetField;
  setDraft: Setter;
  u: (key: string, fallback: string) => string;
  lang: Language;
  onOpenPickupMap: () => void;
  onOpenWarehouseArea: () => void;
  routeDistanceKm: number | null;
  recalculatingRoute: boolean;
  onShowRoute: () => void;
}) => {
  // Warehouse requests posted before the area picker existed carry the old 'Address' place type -
  // they are area requests in all but name, so anything that is not one concrete warehouse counts
  // as one rather than leaving neither option selected.
  const isAreaRequest = draft.deliveryPlaceType !== 'Warehouse';
  const radiusKm = Number(draft.deliveryRadiusKm) || 25;
  const warehouseTarget = draft.deliveryCity || draft.deliveryAddress;
  const warehouseTargetValue = warehouseTarget
    ? isAreaRequest ? warehouseTarget + ' · ' + radiusKm + ' km' : warehouseTarget
    : '—';

  return (
  <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,5fr)_minmax(0,2fr)]">
    <section className="space-y-4 rounded-3xl border border-slate-200 p-4 dark:border-slate-800 md:p-5">
      <div className="flex items-center gap-2 text-emerald-500">
        <MapPin className="h-4 w-4" />
        <p className="text-xs font-black uppercase tracking-wider">{u('postLoadModal.pickupBlock', 'Pickup')}</p>
      </div>
      <div className="space-y-1.5">
        <FieldLabel>{u('postLoadModal.pickupPlaceType', 'Place type')}</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          <ChoiceCard compact active={draft.pickupPlaceType === 'Warehouse'} title={u('postLoadModal.warehouse', 'Warehouse')} icon={Warehouse} onClick={() => setField('pickupPlaceType', 'Warehouse')} />
          <ChoiceCard compact active={draft.pickupPlaceType === 'Address'} title={u('postLoadModal.address', 'Address')} icon={MapPin} onClick={() => setField('pickupPlaceType', 'Address')} />
        </div>
      </div>
      <div className="space-y-1.5">
        <FieldLabel>{draft.pickupPlaceType === 'Warehouse' ? u('postLoadModal.selectWarehouse', 'Warehouse') : u('postLoadModal.address', 'Address')}</FieldLabel>
        {draft.pickupPlaceType === 'Warehouse' ? (
          <WarehouseAutocompleteField
            value={draft.pickupAddress}
            onChange={(value) => setField('pickupAddress', value)}
            onSelectWarehouse={(warehouse) => setDraft((current) => ({ ...current, pickupAddress: [warehouse.name, warehouse.address].filter(Boolean).join(' — '), pickupCity: warehouse.city, pickupCountry: warehouse.countryCode || current.pickupCountry, pickupLatitude: warehouse.latitude, pickupLongitude: warehouse.longitude }))}
            placeholder={u('postLoadModal.warehouseSearchPlaceholder', 'Search warehouses')}
            loadingLabel={u('postLoadModal.loadingWarehouses', 'Loading warehouses...')}
            emptyLabel={u('postLoadModal.noWarehousesFound', 'No warehouses found')}
          />
        ) : (
          <AddressAutocompleteField
            value={draft.pickupAddress}
            onChange={(value) => setField('pickupAddress', value)}
            onSelectLocation={(location) => setDraft((current) => ({ ...current, pickupAddress: location.label, pickupCity: location.city || current.pickupCity, pickupCountry: location.countryCode || current.pickupCountry, pickupLatitude: String(location.latitude), pickupLongitude: String(location.longitude) }))}
            placeholder={u('postLoadModal.pickupAddressPlaceholder', 'Search places or click the map')}
            onOpenMap={onOpenPickupMap}
            mapButtonLabel={u('map.choosePickup', 'Choose pickup address on map')}
            mapButtonIcon={MapGlyphIcon}
            accentClassName="text-emerald-500"
          />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><FieldLabel>{u('postLoadModal.country', 'Country')}</FieldLabel><CountrySelect value={draft.pickupCountry} onChange={(value) => setField('pickupCountry', value)} /></div>
        <div className="space-y-1.5"><FieldLabel>{u('postLoadModal.pickupCity', 'City')}</FieldLabel><Input value={draft.pickupCity} onChange={(event) => setField('pickupCity', event.target.value)} placeholder={u('postLoadModal.cityCountry', 'City')} /></div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div className="space-y-1.5"><FieldLabel>{u('postLoadModal.pickupDate', 'Date from')}</FieldLabel><DateInput value={draft.pickupDate} onChange={(value) => setField('pickupDate', value)} placeholder="dd.mm.yyyy" lang={lang} /></div>
        <div className="space-y-1.5"><FieldLabel>{u('postLoadModal.pickupDateTo', 'Date to')}</FieldLabel><DateInput value={draft.pickupDateTo} onChange={(value) => setField('pickupDateTo', value)} placeholder="dd.mm.yyyy" lang={lang} /></div>
        <div className="space-y-1.5"><FieldLabel>{u('postLoadModal.pickupTimeFrom', 'Time from')}</FieldLabel><TimeInput value={draft.pickupTimeFrom} onChange={(value) => setField('pickupTimeFrom', value)} placeholder="hh:mm" /></div>
        <div className="space-y-1.5"><FieldLabel>{u('postLoadModal.pickupTimeTo', 'Time to')}</FieldLabel><TimeInput value={draft.pickupTimeTo} onChange={(value) => setField('pickupTimeTo', value)} placeholder="hh:mm" /></div>
      </div>
    </section>

    <section className="space-y-4 rounded-3xl border border-slate-200 p-4 dark:border-slate-800 md:p-5">
      <div className="flex items-center gap-2 text-orange-500">
        <Warehouse className="h-4 w-4" />
        <p className="text-xs font-black uppercase tracking-wider">{u('postLoadModal.warehousePreferredLocation', 'Preferred warehouse location')}</p>
      </div>
      <div className="space-y-1.5">
        <FieldLabel>{u('postLoadModal.deliveryPlaceType', 'Place type')}</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          <ChoiceCard compact active={!isAreaRequest} title={u('postLoadModal.warehouse', 'Warehouse')} icon={Warehouse} onClick={() => setField('deliveryPlaceType', 'Warehouse')} />
          <ChoiceCard compact active={isAreaRequest} title={u('postLoadModal.warehouseArea', 'Area')} icon={Radar} onClick={() => setField('deliveryPlaceType', 'Area')} />
        </div>
      </div>
      <div className="space-y-1.5">
        <FieldLabel>{isAreaRequest ? u('postLoadModal.warehousePreferredArea', 'Preferred area') : u('postLoadModal.selectWarehouse', 'Warehouse')}</FieldLabel>
        {!isAreaRequest ? (
          <WarehouseAutocompleteField
            value={draft.deliveryAddress}
            onChange={(value) => setField('deliveryAddress', value)}
            onSelectWarehouse={(warehouse) => setDraft((current) => ({ ...current, deliveryAddress: [warehouse.name, warehouse.address].filter(Boolean).join(' — '), deliveryCity: warehouse.city, deliveryCountry: warehouse.countryCode || current.deliveryCountry, deliveryLatitude: warehouse.latitude, deliveryLongitude: warehouse.longitude }))}
            placeholder={u('postLoadModal.warehouseSearchPlaceholder', 'Search warehouses')}
            loadingLabel={u('postLoadModal.loadingWarehouses', 'Loading warehouses...')}
            emptyLabel={u('postLoadModal.noWarehousesFound', 'No warehouses found')}
          />
        ) : (
          <div className="space-y-2">
            <AddressAutocompleteField
              value={draft.deliveryAddress}
              onChange={(value) => setField('deliveryAddress', value)}
              onSelectLocation={(location) => setDraft((current) => ({ ...current, deliveryAddress: location.label, deliveryCity: location.city || current.deliveryCity, deliveryCountry: location.countryCode || current.deliveryCountry, deliveryLatitude: String(location.latitude), deliveryLongitude: String(location.longitude) }))}
              placeholder={u('postLoadModal.warehouseAreaPlaceholder', 'Search a city or region')}
              onOpenMap={onOpenWarehouseArea}
              mapButtonLabel={u('map.chooseArea', 'Choose area')}
              mapButtonIcon={Radar}
              accentClassName="text-orange-500"
            />
            {/* The radius is what turns a searched point into an area, so it sits with the field
                itself rather than behind the map button - typing a city and dragging this is the
                fastest path, while the map is there when the region needs to be seen. */}
            <div className="rounded-xl border border-orange-200 bg-orange-50/60 px-3 py-2.5 dark:border-orange-900/50 dark:bg-orange-950/20">
              <div className="flex items-center justify-between gap-3">
                <p className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-orange-500">
                  <Radar className="h-3.5 w-3.5" />
                  {u('postLoadModal.areaRadius', 'Radius')}
                </p>
                <p className="text-xs font-black text-slate-900 dark:text-white">{radiusKm} km</p>
              </div>
              <input
                type="range"
                min={5}
                max={300}
                step={5}
                value={radiusKm}
                onChange={(event) => setField('deliveryRadiusKm', event.target.value)}
                className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-orange-200 accent-orange-500 dark:bg-orange-900/60"
              />
              <p className="mt-2 text-[10px] font-semibold text-slate-500">{u('postLoadModal.areaRadiusHint', 'Warehouses inside this area will see your request.')}</p>
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><FieldLabel>{u('postLoadModal.country', 'Country')}</FieldLabel><CountrySelect value={draft.deliveryCountry} onChange={(value) => setField('deliveryCountry', value)} /></div>
        <div className="space-y-1.5"><FieldLabel>{u('postLoadModal.deliveryCity', 'City')}</FieldLabel><Input value={draft.deliveryCity} onChange={(event) => setField('deliveryCity', event.target.value)} placeholder={u('postLoadModal.cityCountry', 'City')} /></div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div className="space-y-1.5"><FieldLabel>{u('postLoadModal.deliveryDate', 'Date from')}</FieldLabel><DateInput value={draft.deliveryDate} onChange={(value) => setDraft((current) => ({ ...current, deliveryDate: value, warehouseStartDate: value }))} placeholder="dd.mm.yyyy" lang={lang} /></div>
        <div className="space-y-1.5"><FieldLabel>{u('postLoadModal.deliveryDateTo', 'Date to')}</FieldLabel><DateInput value={draft.deliveryDateTo} onChange={(value) => setDraft((current) => ({ ...current, deliveryDateTo: value, warehouseEndDate: value }))} placeholder="dd.mm.yyyy" lang={lang} /></div>
        <div className="space-y-1.5"><FieldLabel>{u('postLoadModal.deliveryTimeFrom', 'Time from')}</FieldLabel><TimeInput value={draft.deliveryTimeFrom} onChange={(value) => setField('deliveryTimeFrom', value)} placeholder="hh:mm" /></div>
        <div className="space-y-1.5"><FieldLabel>{u('postLoadModal.deliveryTimeTo', 'Time to')}</FieldLabel><TimeInput value={draft.deliveryTimeTo} onChange={(value) => setField('deliveryTimeTo', value)} placeholder="hh:mm" /></div>
      </div>
    </section>

    <section className="flex h-full min-w-0 flex-col space-y-4 rounded-3xl border border-slate-200 p-4 dark:border-slate-800 md:p-5">
      <div className="flex items-center gap-2 text-primary"><Route className="h-4 w-4" /><p className="text-xs font-black uppercase tracking-wider">{u('postLoadModal.routeSummaryTitle', 'Route')}</p></div>
      <div className="flex min-w-0 flex-1 flex-col">
        <VerticalRoutePoint icon={MapPin} iconClassName="bg-emerald-500 shadow-emerald-500/20" label={u('postLoadModal.origin', 'Origin')} value={draft.pickupCity || draft.pickupAddress || '—'} />
        <VerticalRoutePoint icon={isAreaRequest ? Radar : Warehouse} iconClassName="bg-blue-500 shadow-blue-500/20" label={isAreaRequest ? u('postLoadModal.warehousePreferredArea', 'Preferred area') : u('postLoadModal.warehousePreferredLocation', 'Preferred warehouse location')} value={warehouseTargetValue} last />
      </div>
      <div className="flex items-center justify-between rounded-xl border border-sky-200 bg-sky-50/50 px-3 py-2 dark:border-sky-800 dark:bg-slate-900">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{u('landing.distance', 'Distance')}</p>
        <p className="flex items-center gap-1 text-sm font-black text-slate-900 dark:text-white">{recalculatingRoute ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : routeDistanceKm === null ? '—' : `${routeDistanceKm.toLocaleString()} km`}</p>
      </div>
      <Button type="button" disabled={!routeDistanceKm} onClick={onShowRoute} className="w-full gap-2 disabled:cursor-not-allowed disabled:bg-sky-300 disabled:text-white disabled:opacity-100 disabled:shadow-none dark:disabled:bg-sky-800"><MapGlyphIcon className="h-4 w-4" />{u('postLoadModal.showRouteMap', 'Show route')}</Button>
    </section>
  </div>
  );
};

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
