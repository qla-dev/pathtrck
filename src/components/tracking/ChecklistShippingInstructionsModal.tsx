import { useState, type ReactNode } from 'react';
import { SmallModal } from '../ui/SmallModal';
import type { Language } from '../../types';
import { Input, Textarea } from '../modals/PostLoadModal/FormFields';
import { FieldLabel } from '../modals/PostLoadModal/FieldLabel';
import { CountrySelect } from '../location/CountrySelect';

// The shipping instructions are what the carrier types onto the bill of lading, so they are entered
// as the B/L's own parties rather than uploaded as a file: shipper, consignee, the party to notify
// on arrival, and whatever wording the customer wants carried over verbatim.

const COPY = {
  en: {
    title: 'Shipping instructions', shipper: 'Shipper', consignee: 'Consignee', notify: 'Notify party',
    sameAsConsignee: 'Same as consignee', additional: 'Additional instructions',
    blWording: 'Special wording or references to appear on B/L', reference: 'Customer reference / PO number',
    remarks: 'Additional remarks', save: 'Save', cancel: 'Cancel', failed: 'The data could not be saved.',
    fields: {
      company: 'Company name', address: 'Full address', cityPostal: 'City / Postal code', country: 'Country',
      vatEori: 'VAT/EORI or Registration number', contact: 'Contact person', phone: 'Phone', email: 'Email',
    },
  },
  bs: {
    title: 'Otpremne instrukcije', shipper: 'Pošiljalac', consignee: 'Primalac', notify: 'Strana za obavještenje',
    sameAsConsignee: 'Isto kao primalac', additional: 'Dodatne instrukcije',
    blWording: 'Poseban tekst ili reference na teretnici', reference: 'Referenca kupca / broj narudžbe',
    remarks: 'Dodatne napomene', save: 'Spremi', cancel: 'Odustani', failed: 'Podaci nisu spremljeni.',
    fields: {
      company: 'Naziv kompanije', address: 'Puna adresa', cityPostal: 'Grad / Poštanski broj', country: 'Država',
      vatEori: 'PDV/EORI ili matični broj', contact: 'Kontakt osoba', phone: 'Telefon', email: 'E-mail',
    },
  },
  de: {
    title: 'Versandanweisungen', shipper: 'Versender', consignee: 'Empfänger', notify: 'Benachrichtigungsadresse',
    sameAsConsignee: 'Wie Empfänger', additional: 'Zusätzliche Anweisungen',
    blWording: 'Besonderer Wortlaut oder Referenzen auf dem B/L', reference: 'Kundenreferenz / Bestellnummer',
    remarks: 'Weitere Anmerkungen', save: 'Speichern', cancel: 'Abbrechen', failed: 'Die Daten konnten nicht gespeichert werden.',
    fields: {
      company: 'Firmenname', address: 'Vollständige Adresse', cityPostal: 'Stadt / Postleitzahl', country: 'Land',
      vatEori: 'USt-IdNr./EORI oder Registernummer', contact: 'Ansprechpartner', phone: 'Telefon', email: 'E-Mail',
    },
  },
};

const PARTY_FIELDS = ['company', 'address', 'cityPostal', 'country', 'vatEori', 'contact', 'phone', 'email'] as const;
// The notify party is only ever an address to write to, so it carries no tax registration.
const NOTIFY_FIELDS = PARTY_FIELDS.filter((field) => field !== 'vatEori');
const REQUIRED_FIELDS = ['company', 'address'] as const;
const NOTES_FIELDS = ['blWording', 'reference', 'remarks'] as const;
const MAX_FIELD = 160;
const MAX_NOTE = 600;

type PartyField = typeof PARTY_FIELDS[number];
type Party = Record<PartyField, string>;
type PartyKey = 'shipper' | 'consignee' | 'notify';
type Instructions = Record<PartyKey, Party> & Record<typeof NOTES_FIELDS[number], string> & { notifySameAsConsignee: boolean };

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const emptyParty = (): Party => Object.fromEntries(PARTY_FIELDS.map((field) => [field, ''])) as Party;
const parseParty = (value: unknown): Party => {
  const saved = record(value);
  return Object.fromEntries(PARTY_FIELDS.map((field) => [field, String(saved[field] ?? '')])) as Party;
};

const parseInstructions = (value: unknown): Instructions => {
  let saved: Record<string, unknown> = {};
  try {
    saved = record(JSON.parse(String(value || '{}')));
  } catch {
    // An earlier free-text or uploaded-file entry has nothing to map onto, so the form starts empty.
  }
  return {
    shipper: parseParty(saved.shipper),
    consignee: parseParty(saved.consignee),
    notify: parseParty(saved.notify),
    notifySameAsConsignee: saved.notifySameAsConsignee === true,
    ...Object.fromEntries(NOTES_FIELDS.map((field) => [field, String(saved[field] ?? '')])) as Record<typeof NOTES_FIELDS[number], string>,
  };
};

export const ChecklistShippingInstructionsModal = ({ lang, value, onSave, onClose }: {
  lang: Language;
  value: unknown;
  onSave: (value: string) => Promise<void>;
  onClose: () => void;
}) => {
  const text = COPY[lang === 'bs' || lang === 'de' ? lang : lang === 'hr' || lang === 'sr' ? 'bs' : 'en'];
  const [data, setData] = useState(() => parseInstructions(value));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setParty = (party: PartyKey, field: PartyField, fieldValue: string) =>
    setData((current) => ({ ...current, [party]: { ...current[party], [field]: fieldValue } }));

  const partySection = (party: PartyKey, title: string, fields: readonly PartyField[], extra?: ReactNode) => (
    <fieldset className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
      <legend className="px-1 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</legend>
      {extra}
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field} className={field === 'address' ? 'space-y-1 sm:col-span-2' : 'space-y-1'}>
            <FieldLabel>{text.fields[field]}</FieldLabel>
            {field === 'country'
              ? <CountrySelect value={data[party].country} onChange={(country) => setParty(party, 'country', country)} placeholder={text.fields.country} />
              : <Input
                  required={(REQUIRED_FIELDS as readonly string[]).includes(field)}
                  type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                  maxLength={MAX_FIELD}
                  aria-label={`${title} — ${text.fields[field]}`}
                  value={data[party][field]}
                  onChange={(event) => setParty(party, field, event.target.value)}
                  placeholder={text.fields[field]}
                />}
          </div>
        ))}
      </div>
    </fieldset>
  );

  return <SmallModal labelledBy="checklist-si-title" onClose={onClose} closeDisabled={saving} className="max-w-2xl">
    <form onSubmit={async (event) => {
      event.preventDefault();
      if (saving) return;
      setSaving(true);
      setError('');
      try {
        // A notify party that mirrors the consignee is stored as the flag alone, so the two can
        // never drift apart once the consignee is edited later.
        await onSave(JSON.stringify({
          shipper: data.shipper,
          consignee: data.consignee,
          notifySameAsConsignee: data.notifySameAsConsignee,
          notify: data.notifySameAsConsignee ? emptyParty() : data.notify,
          ...Object.fromEntries(NOTES_FIELDS.map((field) => [field, data[field].trim()])),
        }));
        onClose();
      } catch {
        setError(text.failed);
        setSaving(false);
      }
    }}>
      <h3 id="checklist-si-title" className="mb-4 text-base font-black">{text.title}</h3>
      <fieldset disabled={saving} className="space-y-4">
        {partySection('shipper', text.shipper, PARTY_FIELDS)}
        {partySection('consignee', text.consignee, PARTY_FIELDS)}
        {partySection('notify', text.notify, data.notifySameAsConsignee ? [] : NOTIFY_FIELDS, (
          <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs font-bold">
            <input type="checkbox" checked={data.notifySameAsConsignee} className="h-4 w-4 cursor-pointer accent-primary"
              onChange={(event) => setData((current) => ({ ...current, notifySameAsConsignee: event.target.checked }))} />
            {text.sameAsConsignee}
          </label>
        ))}
        <fieldset className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700">
          <legend className="px-1 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">{text.additional}</legend>
          <div className="space-y-3">
            <div className="space-y-1">
              <FieldLabel>{text.blWording}</FieldLabel>
              <Textarea rows={2} maxLength={MAX_NOTE} value={data.blWording} aria-label={text.blWording}
                onChange={(event) => setData((current) => ({ ...current, blWording: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <FieldLabel>{text.reference}</FieldLabel>
              <Input maxLength={MAX_FIELD} value={data.reference} aria-label={text.reference}
                onChange={(event) => setData((current) => ({ ...current, reference: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <FieldLabel>{text.remarks}</FieldLabel>
              <Textarea rows={3} maxLength={MAX_NOTE} value={data.remarks} aria-label={text.remarks}
                onChange={(event) => setData((current) => ({ ...current, remarks: event.target.value }))} />
            </div>
          </div>
        </fieldset>
      </fieldset>
      {error && <p role="alert" className="mt-3 text-xs text-rose-500">{error}</p>}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" disabled={saving} onClick={onClose} className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:cursor-wait dark:border-slate-700">{text.cancel}</button>
        <button type="submit" disabled={saving} aria-busy={saving} className="cursor-pointer rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-60">{text.save}</button>
      </div>
    </form>
  </SmallModal>;
};
