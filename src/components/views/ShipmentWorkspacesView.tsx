import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, Building2, CalendarDays, CheckCircle2, ClipboardCheck, FileText,
  LoaderCircle, MapPin, MessageSquare, Package, RefreshCw, Route, Truck, UserRound,
} from 'lucide-react';

import type { Language, Role } from '../../types';
import { api } from '../../services/api';

type Props = {
  lang: Language;
  role: Role;
  initialWorkspaceId?: number | null;
  onInitialWorkspaceHandled?: () => void;
  onOpenConversation?: (conversationId: number) => void;
};

const COPY = {
  en: { title: 'Shipment Workspaces', subtitle: 'Confirmed bookings shared with your transport partners.', empty: 'No confirmed shipment workspaces yet.', overview: 'Shipment overview', parties: 'Parties & contacts', operations: 'Operational checklist', documents: 'Documents', messages: 'Messages', customer: 'Customer', provider: 'Contracted provider', price: 'Agreed price', booked: 'Booking date', originalLoad: 'Original Load ID', transport: 'Transport', route: 'Route & schedule', cargo: 'Cargo', openMessages: 'Open shipment messages', noDocuments: 'No documents are attached to this load.', updated: 'Last updated', loading: 'Loading shipment workspaces…', retry: 'Try again', offerStatus: 'Offer status', saving: 'Saving…' },
  bs: { title: 'Shipment Workspaces', subtitle: 'Potvrđeni bookinzi koje dijelite s transportnim partnerima.', empty: 'Još nema potvrđenih shipment workspacea.', overview: 'Pregled shipmenta', parties: 'Strane i kontakti', operations: 'Operativna checklist-a', documents: 'Dokumenti', messages: 'Poruke', customer: 'Customer', provider: 'Ugovorni provider', price: 'Dogovorena cijena', booked: 'Datum bookinga', originalLoad: 'Originalni Load ID', transport: 'Transport', route: 'Ruta i termini', cargo: 'Teret', openMessages: 'Otvori poruke shipmenta', noDocuments: 'Za ovaj load nema priloženih dokumenata.', updated: 'Posljednja izmjena', loading: 'Učitavanje shipment workspacea…', retry: 'Pokušaj ponovo', offerStatus: 'Status ponude', saving: 'Spremanje…' },
  de: { title: 'Shipment Workspaces', subtitle: 'Bestätigte Buchungen mit Ihren Transportpartnern.', empty: 'Noch keine bestätigten Shipment Workspaces.', overview: 'Sendungsübersicht', parties: 'Parteien & Kontakte', operations: 'Operative Checkliste', documents: 'Dokumente', messages: 'Nachrichten', customer: 'Kunde', provider: 'Vertraglicher Anbieter', price: 'Vereinbarter Preis', booked: 'Buchungsdatum', originalLoad: 'Ursprüngliche Load-ID', transport: 'Transport', route: 'Route & Termine', cargo: 'Fracht', openMessages: 'Sendungsnachrichten öffnen', noDocuments: 'Dieser Ladung sind keine Dokumente beigefügt.', updated: 'Zuletzt aktualisiert', loading: 'Shipment Workspaces werden geladen…', retry: 'Erneut versuchen', offerStatus: 'Angebotsstatus', saving: 'Speichern…' },
} as const;

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const array = (value: unknown): Array<Record<string, unknown>> => Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
const displayDate = (value: unknown, lang: Language) => {
  const date = new Date(String(value || ''));
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat(lang, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};
const titleCase = (value: unknown) => String(value || '—').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export const ShipmentWorkspacesView = ({ lang, role, initialWorkspaceId, onInitialWorkspaceHandled, onOpenConversation }: Props) => {
  const text = COPY[lang === 'bs' || lang === 'de' ? lang : 'en'];
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [selectedId, setSelectedId] = useState<number | null>(initialWorkspaceId || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.shipmentWorkspaces.list({ per_page: 100 })
      .then((response) => {
        if (!active) return;
        setItems(response.data);
        setSelectedId((current) => {
          if (initialWorkspaceId && response.data.some((item) => Number(item.id) === initialWorkspaceId)) return initialWorkspaceId;
          if (current && response.data.some((item) => Number(item.id) === current)) return current;
          return response.data.length ? Number(response.data[0].id) : null;
        });
        onInitialWorkspaceHandled?.();
      })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : 'Shipment workspaces could not be loaded.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [initialWorkspaceId, onInitialWorkspaceHandled, refreshKey]);

  const selected = useMemo(() => items.find((item) => Number(item.id) === selectedId) || null, [items, selectedId]);

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm font-bold text-slate-500"><LoaderCircle className="h-5 w-5 animate-spin text-primary" />{text.loading}</div>;
  if (error) return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4"><p className="text-sm font-semibold text-red-600">{error}</p><button onClick={() => setRefreshKey((key) => key + 1)} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white">{text.retry}</button></div>;

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div><h1 className="text-2xl font-black text-slate-900 dark:text-white md:text-3xl">{text.title}</h1><p className="mt-1 text-sm text-slate-500">{text.subtitle}</p></div>
        <button type="button" onClick={() => setRefreshKey((key) => key + 1)} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-primary dark:border-slate-700 dark:bg-slate-900"><RefreshCw className="h-4 w-4" /></button>
      </div>

      {items.length === 0 ? (
        <div className="flex min-h-[55vh] flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-center dark:border-slate-700 dark:bg-slate-900"><Package className="h-12 w-12 text-slate-300" /><p className="mt-4 font-bold text-slate-600 dark:text-slate-300">{text.empty}</p></div>
      ) : (
        <div className="grid min-h-[70vh] gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <aside className="space-y-3">
            {items.map((workspace) => {
              const snapshot = record(workspace.load_snapshot);
              const parties = record(workspace.parties_snapshot);
              const provider = record(parties.provider);
              const stops = array(snapshot.stops);
              return <button key={String(workspace.id)} type="button" onClick={() => setSelectedId(Number(workspace.id))} className={`w-full cursor-pointer rounded-2xl border p-4 text-left transition ${Number(workspace.id) === selectedId ? 'border-primary bg-primary/5 shadow-md shadow-primary/10' : 'border-slate-200 bg-white hover:border-primary/40 dark:border-slate-800 dark:bg-slate-900'}`}>
                <div className="flex items-center justify-between gap-2"><span className="font-black text-primary">{String(workspace.reference)}</span><Status value={workspace.status} /></div>
                <p className="mt-3 truncate font-bold text-slate-900 dark:text-white">{String(provider.name || '—')}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{String(stops[0]?.city || '—')} <ArrowRight className="mx-1 inline h-3 w-3" /> {String(stops.at(-1)?.city || '—')}</p>
                <p className="mt-3 text-xs font-semibold text-slate-400">{text.updated}: {displayDate(workspace.updated_at, lang)}</p>
              </button>;
            })}
          </aside>
          {selected && <WorkspaceDetail workspace={selected} lang={lang} role={role} text={text} onOpenConversation={onOpenConversation} onUpdated={(updated) => setItems((current) => current.map((item) => Number(item.id) === Number(updated.id) ? updated : item))} />}
        </div>
      )}
    </div>
  );
};

const WorkspaceDetail = ({ workspace, lang, text, onOpenConversation, onUpdated }: { workspace: Record<string, unknown>; lang: Language; role: Role; text: typeof COPY.en | typeof COPY.bs | typeof COPY.de; onOpenConversation?: (id: number) => void; onUpdated: (workspace: Record<string, unknown>) => void }) => {
  const [savingStatus, setSavingStatus] = useState(false);
  const load = record(workspace.load_snapshot);
  const parties = record(workspace.parties_snapshot);
  const offer = record(workspace.offer_snapshot);
  const customer = record(parties.customer);
  const provider = record(parties.provider);
  const providerContact = record(parties.provider_contact);
  const driver = record(parties.driver);
  const vehicle = record(parties.vehicle);
  const freightLoad = record(workspace.freight_load);
  const stops = array(load.stops);
  const docs = array(freightLoad.documents);
  const checklist = array(workspace.operational_checklist);
  const conversationId = Number(workspace.conversation_id || 0);
  const acceptedOffer = record(workspace.accepted_offer);
  const requestType = String(acceptedOffer.request_type || offer.request_type || 'price_offer');
  const offerStatuses = requestType === 'reservation_request'
    ? ['pending_customer_approval', 'accepted', 'rejected', 'withdrawn', 'expired', 'cancelled']
    : ['published', 'open_for_reservations', 'reservation_selected', 'booking_confirmed', 'preparation', 'ready_for_pickup', 'in_execution', 'completed', 'cancelled', 'expired'];
  const updateOfferStatus = async (status: string) => {
    setSavingStatus(true);
    try {
      const response = await api.shipmentWorkspaces.update(Number(workspace.id), { offer_status: status });
      onUpdated(response.data);
    } finally {
      setSavingStatus(false);
    }
  };
  const pickup = stops[0] || {};
  const delivery = stops.at(-1) || {};
  return <main className="min-w-0 space-y-4">
    <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-primary">{String(workspace.reference)}</p><h2 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{String(load.title || load.public_id || `Shipment #${workspace.id}`)}</h2></div><Status value={workspace.status} /></div>
      <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <label htmlFor={`offer-status-${workspace.id}`} className="mb-2 block text-[10px] font-black uppercase tracking-wider text-primary">{text.offerStatus}</label>
        <div className="flex items-center gap-3">
          <select id={`offer-status-${workspace.id}`} value={String(acceptedOffer.status || 'accepted')} disabled={savingStatus} onChange={(event) => void updateOfferStatus(event.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-primary disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
            {!offerStatuses.includes(String(acceptedOffer.status)) && <option value={String(acceptedOffer.status || 'accepted')}>{titleCase(acceptedOffer.status || 'accepted')}</option>}
            {offerStatuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
          </select>
          {savingStatus && <span className="flex items-center gap-2 text-xs font-bold text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />{text.saving}</span>}
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Info icon={Package} label={text.originalLoad} value={String(load.public_id || load.id || '—')} />
        <Info icon={Truck} label={text.transport} value={titleCase(load.transport_type)} />
        <Info icon={CalendarDays} label={text.booked} value={displayDate(workspace.booked_at, lang)} />
        <Info icon={CheckCircle2} label={text.price} value={`${String(workspace.currency || '')} ${Number(workspace.agreed_amount || 0).toLocaleString()}`} />
      </div>
    </section>
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title={text.route} icon={Route}><div className="space-y-4"><Stop icon={MapPin} label="Pickup" stop={pickup} lang={lang} /><Stop icon={MapPin} label="Delivery" stop={delivery} lang={lang} /></div></Section>
      <Section title={text.cargo} icon={Package}><div className="grid grid-cols-2 gap-3"><Datum label="Type" value={String(load.goods_type || load.cargo_type || '—')} /><Datum label="Weight" value={load.weight_kg ? `${load.weight_kg} kg` : '—'} /><Datum label="Equipment" value={String(offer.equipment_type || '—')} /><Datum label="Transit" value={offer.estimated_transit_days != null ? `${offer.estimated_transit_days} days` : '—'} /></div></Section>
    </div>
    <Section title={text.parties} icon={Building2}><div className="grid gap-3 md:grid-cols-2"><Party icon={UserRound} title={text.customer} party={customer} /><Party icon={Building2} title={text.provider} party={provider} contact={providerContact} />{Object.keys(driver).length > 0 && <Party icon={Truck} title="Driver" party={driver} />}{Object.keys(vehicle).length > 0 && <Party icon={Truck} title="Vehicle" party={vehicle} />}</div></Section>
    <Section title={text.operations} icon={ClipboardCheck}><div className="grid gap-2 sm:grid-cols-2">{checklist.map((item) => <div key={String(item.key)} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3 dark:border-slate-700"><span className="text-sm font-bold text-slate-700 dark:text-slate-200">{titleCase(item.key)}</span><Status value={item.status} small /></div>)}</div></Section>
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title={text.documents} icon={FileText}>{docs.length ? <div className="space-y-2">{docs.map((doc) => <div key={String(doc.id)} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><FileText className="h-4 w-4 text-primary" /><span className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">{String(doc.name || doc.original_name || doc.type || `Document #${doc.id}`)}</span></div>)}</div> : <p className="text-sm text-slate-500">{text.noDocuments}</p>}</Section>
      <Section title={text.messages} icon={MessageSquare}><p className="text-sm text-slate-500">{String(record(workspace.conversation).subject || workspace.reference)}</p><button type="button" disabled={!conversationId} onClick={() => conversationId && onOpenConversation?.(conversationId)} className="mt-4 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><MessageSquare className="h-4 w-4" />{text.openMessages}</button></Section>
    </div>
  </main>;
};

const Section = ({ title, icon: Icon, children }: { title: string; icon: typeof Package; children: React.ReactNode }) => <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h3 className="mb-4 flex items-center gap-2 font-black text-slate-900 dark:text-white"><Icon className="h-5 w-5 text-primary" />{title}</h3>{children}</section>;
const Info = ({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: string }) => <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400"><Icon className="h-4 w-4 text-primary" />{label}</p><p className="mt-2 truncate font-bold text-slate-900 dark:text-white">{value}</p></div>;
const Datum = ({ label, value }: { label: string; value: string }) => <div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-800 dark:text-white">{value}</p></div>;
const Stop = ({ icon: Icon, label, stop, lang }: { icon: typeof MapPin; label: string; stop: Record<string, unknown>; lang: Language }) => <div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><div><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p><p className="font-bold text-slate-900 dark:text-white">{[stop.city, stop.country_code].filter(Boolean).join(', ') || '—'}</p><p className="text-xs text-slate-500">{displayDate(stop.window_starts_at, lang)}</p></div></div>;
const Party = ({ icon: Icon, title, party, contact }: { icon: typeof Building2; title: string; party: Record<string, unknown>; contact?: Record<string, unknown> }) => <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"><p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-primary"><Icon className="h-4 w-4" />{title}</p><p className="mt-2 font-black text-slate-900 dark:text-white">{String(party.name || party.registration_number || '—')}</p>{contact?.name && contact.name !== party.name && <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{String(contact.name)}</p>}<p className="mt-1 text-xs text-slate-500">{String(contact?.email || party.email || '')}</p><p className="text-xs text-slate-500">{String(contact?.phone || party.phone || '')}</p></div>;
const Status = ({ value, small = false }: { value: unknown; small?: boolean }) => { const status = String(value || 'booked'); const complete = ['completed', 'approved'].includes(status); return <span className={`shrink-0 rounded-full font-black uppercase tracking-wider ${small ? 'px-2 py-1 text-[9px]' : 'px-3 py-1.5 text-[10px]'} ${complete ? 'bg-emerald-500/10 text-emerald-600' : status === 'cancelled' ? 'bg-red-500/10 text-red-600' : 'bg-sky-500/10 text-sky-600'}`}>{titleCase(status)}</span>; };
