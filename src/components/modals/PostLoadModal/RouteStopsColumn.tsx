import { ReactNode } from 'react';
import { MapPin, PlaneLanding, Plus, Ship, Truck, Warehouse } from 'lucide-react';
import { Map as MapGlyphIcon } from 'lucide-react';

import { cn } from '../../../lib/cn';
import { Language } from '../../../types';
import { CountrySelect } from '../../location/CountrySelect';
import { AddressAutocompleteField } from './AddressAutocompleteField';
import { AirportAutocompleteField } from './AirportAutocompleteField';
import { ChoiceCard } from './ChoiceCard';
import { DateInput } from './DateInput';
import { FieldLabel } from './FieldLabel';
import { Input } from './FormFields';
import { PortAutocompleteField } from './PortAutocompleteField';
import { TimeInput } from './TimeInput';
import { StopSide } from './routeStops';
import { RouteStopDraft } from './types';

type Translate = (key: string, fallback: string) => string;

// The fields of one stop, named the way the stop itself is - so the same card can be driven by the
// flat draft fields (stop 1 of each side) or by an entry of extraPickups / extraDeliveries.
type StopFieldKey = keyof RouteStopDraft;

type StopCardProps = {
  side: StopSide;
  /** 0-based position within its own side, used for the "Pickup 2" heading. */
  index: number;
  total: number;
  value: RouteStopDraft;
  onChange: (patch: Partial<RouteStopDraft>) => void;
  onOpenMap: () => void;
  u: Translate;
  lang: Language;
  /** Red outlines and the AI-refill marker only exist for stop 1, which the draft fields back. */
  invalidClass: (field: StopFieldKey) => string;
  renderLabel: (field: StopFieldKey, labelKey: string, fallback: string) => ReactNode;
};

const SIDE_TONE: Record<StopSide, { text: string; icon: typeof MapPin; accent: string }> = {
  pickup: { text: 'text-emerald-500', icon: MapPin, accent: 'text-emerald-500' },
  delivery: { text: 'text-blue-500', icon: Truck, accent: 'text-blue-500' },
};

const StopCard = ({ side, index, total, value, onChange, onOpenMap, u, lang, invalidClass, renderLabel }: StopCardProps) => {
  const tone = SIDE_TONE[side];
  const HeadingIcon = tone.icon;
  const heading = side === 'pickup'
    ? u('postLoadModal.pickupBlock', 'Pickup')
    : u('postLoadModal.deliveryBlock', 'Delivery');
  // Numbering only appears once there is more than one stop on this side, so a plain A-to-B road
  // load reads exactly as it did before multi-stop existed.
  const title = total > 1 ? `${heading} ${index + 1}` : heading;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <div className={cn('flex items-center gap-2', tone.text)}>
        <HeadingIcon className="h-4 w-4 shrink-0" />
        <p className="truncate text-xs font-black uppercase tracking-wider">{title}</p>
      </div>

      <div className="space-y-1">
        <FieldLabel>{side === 'pickup' ? u('postLoadModal.pickupPlaceType', 'Place type') : u('postLoadModal.deliveryPlaceType', 'Place type')}</FieldLabel>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'Warehouse', label: u('postLoadModal.warehouse', 'Warehouse'), icon: Warehouse },
            { value: 'Port', label: u('postLoadModal.portToPort', 'Port'), icon: Ship },
            { value: 'Airport', label: u('postLoadModal.airportPlaceType', 'Airport'), icon: PlaneLanding },
          ].map((option) => (
            <ChoiceCard
              key={option.value}
              compact
              active={value.placeType === option.value}
              title={option.label}
              icon={option.icon}
              onClick={() => onChange({ placeType: option.value })}
            />
          ))}
        </div>
      </div>

      <div className={cn((value.placeType === 'Port' || value.placeType === 'Airport') && 'grid gap-3 sm:grid-cols-2')}>
        {value.placeType === 'Port' && (
          <div className={cn('space-y-1', invalidClass('port'))}>
            <FieldLabel>{u('postLoadModal.portToPort', 'Port')}</FieldLabel>
            <PortAutocompleteField
              value={value.port}
              onChange={(port) => onChange({ port })}
              onSelectPort={(port) => onChange({ port: `${port.port} - ${port.unlocode} - ${port.country}`, city: port.city, country: port.countryCode })}
              placeholder={u('postLoadModal.portSearchPlaceholder', 'Search ports')}
            />
          </div>
        )}
        {value.placeType === 'Airport' && (
          <div className={cn('space-y-1', invalidClass('airport'))}>
            <FieldLabel>{u('postLoadModal.airportPlaceType', 'Airport')}</FieldLabel>
            <AirportAutocompleteField
              value={value.airport}
              onChange={(airport) => onChange({ airport })}
              onSelectAirport={(airport) => onChange({ airport: `${airport.name} (${airport.iata}) — ${airport.city}, ${airport.country}`, city: airport.city, country: airport.countryCode })}
              placeholder={u('postLoadModal.airportSearchPlaceholder', 'Search airport, city or IATA code')}
            />
          </div>
        )}
        <div className={cn('space-y-1', invalidClass('address'))}>
          <FieldLabel>{side === 'pickup' ? u('postLoadModal.pickupAddress', 'Pickup address') : u('postLoadModal.deliveryAddress', 'Delivery address')}</FieldLabel>
          <AddressAutocompleteField
            value={value.address}
            onChange={(address) => onChange({ address })}
            onSelectLocation={(location) => onChange({
              address: location.label,
              city: location.city || value.city,
              country: location.countryCode || value.country,
              latitude: String(location.latitude),
              longitude: String(location.longitude),
            })}
            placeholder={side === 'pickup'
              ? u('postLoadModal.pickupAddressPlaceholder', 'Search places or click the map')
              : u('postLoadModal.deliveryAddressPlaceholder', 'Search places or click the map')}
            onOpenMap={onOpenMap}
            mapButtonLabel={side === 'pickup' ? u('map.choosePickup', 'Choose pickup address on map') : u('map.chooseDelivery', 'Choose delivery address on map')}
            mapButtonIcon={MapGlyphIcon}
            accentClassName={tone.accent}
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[200px_140px_minmax(0,1fr)]">
        <div className={cn('space-y-1', invalidClass('country'))}>
          {renderLabel('country', side === 'pickup' ? 'postLoadModal.pickupCountryShort' : 'postLoadModal.deliveryCountryShort', 'Country')}
          <CountrySelect value={value.country} onChange={(country) => onChange({ country })} placeholder={u('postLoadModal.selectCountry', 'Select country')} />
        </div>
        <div className={cn('space-y-1', invalidClass('postalCode'))}>
          {renderLabel('postalCode', side === 'pickup' ? 'postLoadModal.pickupPostalCode' : 'postLoadModal.deliveryPostalCode', 'Postal code')}
          <Input value={value.postalCode} onChange={(event) => onChange({ postalCode: event.target.value })} placeholder={u('postLoadModal.postalCodePlaceholder', 'Postal code')} />
        </div>
        <div className={cn('space-y-1', invalidClass('city'))}>
          {renderLabel('city', side === 'pickup' ? 'postLoadModal.pickupCity' : 'postLoadModal.deliveryCity', 'City')}
          <Input value={value.city} onChange={(event) => onChange({ city: event.target.value })} placeholder={u('postLoadModal.cityCountry', 'City')} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <div className={cn('flex h-full flex-col justify-between space-y-1', invalidClass('date'))}>
            {renderLabel('date', side === 'pickup' ? 'postLoadModal.pickupDate' : 'postLoadModal.deliveryDate', 'Date from')}
            <DateInput value={value.date} onChange={(date) => onChange({ date })} placeholder="dd.mm.yyyy" lang={lang} />
          </div>
          <div className={cn('flex h-full flex-col justify-between space-y-1', invalidClass('dateTo'))}>
            <FieldLabel>{side === 'pickup' ? u('postLoadModal.pickupDateTo', 'Date to') : u('postLoadModal.deliveryDateTo', 'Date to')}</FieldLabel>
            <DateInput value={value.dateTo} onChange={(dateTo) => onChange({ dateTo })} placeholder="dd.mm.yyyy" lang={lang} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className={cn('flex h-full flex-col justify-between space-y-1', invalidClass('timeFrom'))}>
            <FieldLabel>{side === 'pickup' ? u('postLoadModal.pickupTimeFrom', 'Time from') : u('postLoadModal.deliveryTimeFrom', 'Time from')}</FieldLabel>
            <TimeInput value={value.timeFrom} onChange={(timeFrom) => onChange({ timeFrom })} placeholder="hh:mm" />
          </div>
          <div className={cn('flex h-full flex-col justify-between space-y-1', invalidClass('timeTo'))}>
            <FieldLabel>{side === 'pickup' ? u('postLoadModal.pickupTimeTo', 'Time to') : u('postLoadModal.deliveryTimeTo', 'Time to')}</FieldLabel>
            <TimeInput value={value.timeTo} onChange={(timeTo) => onChange({ timeTo })} placeholder="hh:mm" />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * One side of a road route: its stops top to bottom, and the button that adds another.
 *
 * Stop 1 is backed by the draft's own flat fields; the rest live in extraPickups /
 * extraDeliveries. The column hands each card a plain value-and-patch pair either way, so the two
 * storage shapes look and behave identically. Removing and reordering are not here - they belong
 * to the route timeline in the summary column, beside the order they change.
 */
export const RouteStopsColumn = ({
  side,
  stops,
  onChangeStop,
  onAddStop,
  onOpenMap,
  u,
  lang,
  invalidClass,
  renderLabel,
}: {
  side: StopSide;
  stops: RouteStopDraft[];
  onChangeStop: (index: number, patch: Partial<RouteStopDraft>) => void;
  onAddStop: () => void;
  onOpenMap: (index: number) => void;
  u: Translate;
  lang: Language;
  invalidClass: (index: number, field: StopFieldKey) => string;
  renderLabel: (index: number, field: StopFieldKey, labelKey: string, fallback: string) => ReactNode;
}) => (
  <div className="space-y-3">
    {stops.map((stop, index) => (
      <StopCard
        key={index}
        side={side}
        index={index}
        total={stops.length}
        value={stop}
        onChange={(patch) => onChangeStop(index, patch)}
        onOpenMap={() => onOpenMap(index)}
        u={u}
        lang={lang}
        invalidClass={(field) => invalidClass(index, field)}
        renderLabel={(field, labelKey, fallback) => renderLabel(index, field, labelKey, fallback)}
      />
    ))}
    <button
      type="button"
      onClick={onAddStop}
      className={cn(
        'flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed py-3 text-xs font-black uppercase tracking-wider transition-colors',
        side === 'pickup'
          ? 'border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30'
          : 'border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30'
      )}
    >
      <Plus className="h-4 w-4" />
      {side === 'pickup'
        ? u('postLoadModal.addPickupStop', 'Add another pickup address')
        : u('postLoadModal.addDeliveryStop', 'Add another delivery address')}
    </button>
  </div>
);
