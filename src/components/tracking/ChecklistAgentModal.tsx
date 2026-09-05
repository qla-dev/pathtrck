import { useState } from 'react';
import { SmallModal } from '../ui/SmallModal';
import type { Language } from '../../types';
import { Map } from 'lucide-react';
import { ui } from '../../i18n';
import type { LocationSearchResult } from '../../services/locationSearch';
import { AddressAutocompleteField } from '../modals/PostLoadModal/AddressAutocompleteField';
import { Input } from '../modals/PostLoadModal/FormFields';
import { FieldLabel } from '../modals/PostLoadModal/FieldLabel';
import { CountrySelect } from '../location/CountrySelect';
import { AddressMapModal } from '../maps/AddressMapModal';

const COPY = {
  en: { title: 'Agent information', company: 'Company name', jobTitle: 'Job title', email: 'Email', phone: 'Phone number', name: 'Agent name', save: 'Save', cancel: 'Cancel', failed: 'The data could not be saved.' },
  bs: { title: 'Podaci agenta', company: 'Naziv kompanije', jobTitle: 'Radno mjesto', email: 'E-mail', phone: 'Broj telefona', name: 'Ime agenta', save: 'Spremi', cancel: 'Odustani', failed: 'Podaci nisu spremljeni.' },
  de: { title: 'Agenteninformationen', company: 'Firmenname', jobTitle: 'Position', email: 'E-Mail', phone: 'Telefonnummer', name: 'Name des Agenten', save: 'Speichern', cancel: 'Abbrechen', failed: 'Die Daten konnten nicht gespeichert werden.' },
};
const FIELDS = ['company', 'jobTitle', 'email', 'phone', 'name'] as const;
const ALL_FIELDS = [...FIELDS, 'address', 'country', 'postalCode', 'city', 'latitude', 'longitude'] as const;
type AgentData = Record<typeof ALL_FIELDS[number], string>;

const parseAgent = (value: unknown): AgentData => {
  let saved: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(String(value || '{}'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) saved = parsed;
  } catch {
    // Keep the previous free-text entry available when upgrading an existing task.
    saved.company = String(value || '');
  }
  return Object.fromEntries(ALL_FIELDS.map((key) => [key, String(saved[key] || '')])) as AgentData;
};

export const ChecklistAgentModal = ({ lang, value, onSave, onClose }: {
  lang: Language;
  value: unknown;
  onSave: (value: string) => Promise<void>;
  onClose: () => void;
}) => {
  const text = COPY[lang === 'bs' || lang === 'de' ? lang : 'en'];
  const [data, setData] = useState(() => parseAgent(value));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const addressLabel = lang === 'bs' ? 'Adresa agenta' : lang === 'de' ? 'Adresse des Agenten' : 'Agent address';
  const selectLocation = (location: LocationSearchResult) => setData((current) => ({
    ...current, address: location.label.slice(0, 300), city: location.city.slice(0, 100),
    country: location.countryCode.toUpperCase(), postalCode: '',
    latitude: String(location.latitude), longitude: String(location.longitude),
  }));
  return <SmallModal labelledBy="checklist-agent-title" onClose={onClose} closeDisabled={saving}
    onEscape={mapOpen ? () => setMapOpen(false) : undefined} className="max-w-xl">
    <form onSubmit={async (event) => {
      event.preventDefault();
      if (saving) return;
      setSaving(true);
      setError('');
      try {
        await onSave(JSON.stringify(Object.fromEntries(ALL_FIELDS.map((key) => [key, data[key].trim()]))));
        onClose();
      } catch {
        setError(text.failed);
        setSaving(false);
      }
    }}>
      <h3 id="checklist-agent-title" className="mb-4 text-base font-black">{text.title}</h3>
      <fieldset disabled={saving} className="space-y-3">
        {FIELDS.map((key) => <label key={key} className="block text-xs font-bold">
          {text[key]}
          <input required maxLength={key === 'email' ? 254 : 160} type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
            value={data[key]} onChange={(event) => setData((current) => ({ ...current, [key]: event.target.value }))}
            className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950" />
        </label>)}
        <div className="space-y-1 pt-2">
          <FieldLabel>{addressLabel}</FieldLabel>
          <AddressAutocompleteField value={data.address}
            onChange={(address) => setData((current) => ({ ...current, address: address.slice(0, 300), latitude: '', longitude: '' }))}
            onSelectLocation={selectLocation}
            placeholder={u('postLoadModal.pickupAddressPlaceholder', 'Search places or click the map')}
            onOpenMap={() => setMapOpen(true)} mapButtonLabel={addressLabel} mapButtonIcon={Map} accentClassName="text-primary" />
        </div>
        <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr_1.3fr]">
          <div className="space-y-1">
            <FieldLabel>{lang === 'bs' ? 'Država' : lang === 'de' ? 'Land' : 'Country'}</FieldLabel>
            <CountrySelect value={data.country} onChange={(country) => setData((current) => ({ ...current, country }))}
              placeholder={u('postLoadModal.selectCountry', 'Select country')} />
          </div>
          <div className="space-y-1">
            <FieldLabel>{u('postLoadModal.postalCodePlaceholder', 'Postal code')}</FieldLabel>
            <Input aria-label={u('postLoadModal.postalCodePlaceholder', 'Postal code')} value={data.postalCode} maxLength={20} onChange={(event) => setData((current) => ({ ...current, postalCode: event.target.value }))}
              placeholder={u('postLoadModal.postalCodePlaceholder', 'Postal code')} />
          </div>
          <div className="space-y-1">
            <FieldLabel>{u('postLoadModal.pickupCity', 'City')}</FieldLabel>
            <Input aria-label={u('postLoadModal.cityCountry', 'City')} value={data.city} maxLength={100} onChange={(event) => setData((current) => ({ ...current, city: event.target.value }))}
              placeholder={u('postLoadModal.cityCountry', 'City')} />
          </div>
        </div>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-xs text-rose-500">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" disabled={saving} onClick={onClose} className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:cursor-wait dark:border-slate-700">{text.cancel}</button>
        <button type="submit" disabled={saving} aria-busy={saving} className="cursor-pointer rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-60">{text.save}</button>
      </div>
    </form>
    <AddressMapModal open={mapOpen} lang={lang} title={addressLabel} initialQuery={data.address}
      initialPosition={data.latitude && data.longitude ? [Number(data.latitude), Number(data.longitude)] : null}
      onClose={() => setMapOpen(false)} onSelect={(location) => { selectLocation(location); setMapOpen(false); }} />
  </SmallModal>;
};
