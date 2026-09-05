import type { Language } from '../types';

// Operational checklist tasks come from the backend as bare keys (see ShipmentWorkspaceCreator).
// Each one belongs to exactly one side of the booking: the customer never assigns a driver, and the
// provider never approves the customer's own draft. The owner decides what the shipment workspace
// offers the viewer — the responsible party gets the action itself, the other side gets a reminder.

type Locale = 'en' | 'bs' | 'de';

export type ChecklistOwner = 'provider' | 'customer';

type Phrase = {
  /** Noun phrase used in the checklist table. */
  label: string;
  /** Verb phrase completing "<owner> must ..." in the next-required-action card. */
  action: string;
};

const CUSTOMER_TASKS = new Set(['shipping_instructions', 'approve_draft', 'approve_awb']);

const TASKS: Record<string, Record<Locale, Phrase>> = {
  confirm_storage_arrival: {
    en: { label: 'Confirm arrival time', action: 'confirm the warehouse arrival time' },
    bs: { label: 'Potvrda termina prijema', action: 'potvrditi termin prijema u skladište' },
    de: { label: 'Anliefertermin bestätigen', action: 'den Anliefertermin bestätigen' },
  },
  check_storage_documents: {
    en: { label: 'Check goods and documents', action: 'check the goods against the accompanying documents' },
    bs: { label: 'Provjera robe i dokumentacije', action: 'provjeriti robu prema pratećoj dokumentaciji' },
    de: { label: 'Ware und Dokumente prüfen', action: 'die Ware mit den Begleitdokumenten abgleichen' },
  },
  record_storage_receipt: {
    en: { label: 'Record received quantities and condition', action: 'record received quantities, condition and any discrepancies' },
    bs: { label: 'Evidencija količine i stanja robe', action: 'evidentirati primljene količine, stanje robe i eventualna odstupanja' },
    de: { label: 'Menge und Warenzustand erfassen', action: 'Mengen, Warenzustand und Abweichungen erfassen' },
  },
  assign_storage_location: {
    en: { label: 'Assign storage location', action: 'record the storage zone or rack and required storage conditions' },
    bs: { label: 'Dodjela skladišne lokacije', action: 'evidentirati zonu ili regal i potrebne uslove skladištenja' },
    de: { label: 'Lagerplatz zuweisen', action: 'Lagerzone oder Regal und erforderliche Lagerbedingungen erfassen' },
  },
  confirm_storage_dispatch: {
    en: { label: 'Confirm dispatch and handover', action: 'record dispatched quantities and attach the handover confirmation' },
    bs: { label: 'Potvrda otpreme i predaje robe', action: 'evidentirati otpremljene količine i priložiti potvrdu o predaji' },
    de: { label: 'Versand und Übergabe bestätigen', action: 'versandte Mengen erfassen und die Übergabebestätigung beifügen' },
  },
  // Road
  assign_driver_and_vehicle: {
    en: { label: 'Assign driver & vehicle', action: 'assign a driver and vehicle' },
    bs: { label: 'Dodjela vozača i vozila', action: 'dodijeliti vozača i vozilo' },
    de: { label: 'Fahrer & Fahrzeug zuweisen', action: 'einen Fahrer und ein Fahrzeug zuweisen' },
  },
  confirm_pickup_time: {
    en: { label: 'Confirm pickup time', action: 'confirm the pickup time' },
    bs: { label: 'Potvrda termina preuzimanja', action: 'potvrditi termin preuzimanja' },
    de: { label: 'Abholzeit bestätigen', action: 'die Abholzeit bestätigen' },
  },
  vehicle_registrations: {
    en: { label: 'Vehicle registrations', action: 'upload the vehicle registrations' },
    bs: { label: 'Registracije vozila', action: 'dostaviti registracije vozila' },
    de: { label: 'Fahrzeugpapiere', action: 'die Fahrzeugpapiere hochladen' },
  },
  cmr_and_documents: {
    en: { label: 'CMR & documents', action: 'prepare the CMR and transport documents' },
    bs: { label: 'CMR i dokumenti', action: 'pripremiti CMR i transportne dokumente' },
    de: { label: 'CMR & Dokumente', action: 'den CMR und die Transportdokumente vorbereiten' },
  },
  confirm_pickup: {
    en: { label: 'Confirm pickup', action: 'confirm the pickup' },
    bs: { label: 'Potvrda preuzimanja', action: 'potvrditi preuzimanje' },
    de: { label: 'Abholung bestätigen', action: 'die Abholung bestätigen' },
  },
  tracking_and_status_updates: {
    en: { label: 'Tracking & status updates', action: 'start tracking and status updates' },
    bs: { label: 'Praćenje i statusi', action: 'pokrenuti praćenje i slanje statusa' },
    de: { label: 'Tracking & Statusmeldungen', action: 'das Tracking und die Statusmeldungen starten' },
  },
  proof_of_delivery: {
    en: { label: 'Proof of delivery', action: 'upload the proof of delivery' },
    bs: { label: 'Potvrda o isporuci', action: 'dostaviti potvrdu o isporuci' },
    de: { label: 'Ablieferbeleg', action: 'den Ablieferbeleg hochladen' },
  },
  // Sea
  booking_confirmation: {
    en: { label: 'Booking confirmation', action: 'confirm the booking' },
    bs: { label: 'Potvrda bookinga', action: 'potvrditi booking' },
    de: { label: 'Buchungsbestätigung', action: 'die Buchung bestätigen' },
  },
  shipping_line_and_agent: {
    en: { label: 'Shipping line & agent', action: 'name the shipping line and agent' },
    bs: { label: 'Brodar i agent', action: 'odrediti brodara i agenta' },
    de: { label: 'Reederei & Agent', action: 'die Reederei und den Agenten benennen' },
  },
  vessel_and_voyage: {
    en: { label: 'Vessel & voyage', action: 'confirm the vessel and voyage' },
    bs: { label: 'Brod i plovidba', action: 'potvrditi brod i plovidbu' },
    de: { label: 'Schiff & Reise', action: 'Schiff und Reise bestätigen' },
  },
  container_details: {
    en: { label: 'Container details', action: 'provide the container details' },
    bs: { label: 'Podaci o kontejneru', action: 'dostaviti podatke o kontejneru' },
    de: { label: 'Containerdaten', action: 'die Containerdaten angeben' },
  },
  shipping_instructions: {
    en: { label: 'Shipping instructions', action: 'submit the shipping instructions' },
    bs: { label: 'Otpremne instrukcije', action: 'dostaviti otpremne instrukcije' },
    de: { label: 'Versandanweisungen', action: 'die Versandanweisungen übermitteln' },
  },
  vgm: {
    en: { label: 'VGM', action: 'submit the VGM' },
    bs: { label: 'VGM', action: 'dostaviti VGM' },
    de: { label: 'VGM', action: 'das VGM übermitteln' },
  },
  draft_bill_of_lading: {
    en: { label: 'Draft bill of lading', action: 'issue the draft bill of lading' },
    bs: { label: 'Nacrt teretnice', action: 'izdati nacrt teretnice' },
    de: { label: 'B/L-Entwurf', action: 'den B/L-Entwurf ausstellen' },
  },
  approve_draft: {
    en: { label: 'Approve draft', action: 'approve the draft bill of lading' },
    bs: { label: 'Odobrenje nacrta', action: 'odobriti nacrt teretnice' },
    de: { label: 'Entwurf freigeben', action: 'den B/L-Entwurf freigeben' },
  },
  final_bill_of_lading: {
    en: { label: 'Final bill of lading', action: 'issue the final bill of lading' },
    bs: { label: 'Konačna teretnica', action: 'izdati konačnu teretnicu' },
    de: { label: 'Endgültiges B/L', action: 'das endgültige B/L ausstellen' },
  },
  terminal_and_cutoff: {
    en: { label: 'Terminal & cut-off', action: 'confirm the terminal and cut-off' },
    bs: { label: 'Terminal i cut-off', action: 'potvrditi terminal i cut-off' },
    de: { label: 'Terminal & Cut-off', action: 'Terminal und Cut-off bestätigen' },
  },
  // Air
  airline_and_agent: {
    en: { label: 'Airline & agent', action: 'name the airline and agent' },
    bs: { label: 'Avioprevoznik i agent', action: 'odrediti avioprevoznika i agenta' },
    de: { label: 'Airline & Agent', action: 'die Airline und den Agenten benennen' },
  },
  flight_details: {
    en: { label: 'Flight details', action: 'confirm the flight details' },
    bs: { label: 'Podaci o letu', action: 'potvrditi podatke o letu' },
    de: { label: 'Flugdaten', action: 'die Flugdaten bestätigen' },
  },
  mawb_hawb: {
    en: { label: 'MAWB / HAWB', action: 'issue the MAWB and HAWB' },
    bs: { label: 'MAWB / HAWB', action: 'izdati MAWB i HAWB' },
    de: { label: 'MAWB / HAWB', action: 'MAWB und HAWB ausstellen' },
  },
  cargo_acceptance: {
    en: { label: 'Cargo acceptance', action: 'arrange cargo acceptance' },
    bs: { label: 'Prijem robe', action: 'organizovati prijem robe' },
    de: { label: 'Warenannahme', action: 'die Warenannahme organisieren' },
  },
  security_and_customs_documents: {
    en: { label: 'Security & customs documents', action: 'file the security and customs documents' },
    bs: { label: 'Sigurnosni i carinski dokumenti', action: 'dostaviti sigurnosne i carinske dokumente' },
    de: { label: 'Sicherheits- & Zolldokumente', action: 'die Sicherheits- und Zolldokumente einreichen' },
  },
  draft_awb: {
    en: { label: 'Draft AWB', action: 'issue the draft AWB' },
    bs: { label: 'Nacrt AWB-a', action: 'izdati nacrt AWB-a' },
    de: { label: 'AWB-Entwurf', action: 'den AWB-Entwurf ausstellen' },
  },
  approve_awb: {
    en: { label: 'Approve AWB', action: 'approve the draft AWB' },
    bs: { label: 'Odobrenje AWB-a', action: 'odobriti nacrt AWB-a' },
    de: { label: 'AWB freigeben', action: 'den AWB-Entwurf freigeben' },
  },
  departure_status: {
    en: { label: 'Departure status', action: 'report the departure status' },
    bs: { label: 'Status polaska', action: 'javiti status polaska' },
    de: { label: 'Abflugstatus', action: 'den Abflugstatus melden' },
  },
  arrival_status: {
    en: { label: 'Arrival status', action: 'report the arrival status' },
    bs: { label: 'Status dolaska', action: 'javiti status dolaska' },
    de: { label: 'Ankunftsstatus', action: 'den Ankunftsstatus melden' },
  },
  // Rail
  rail_operator: {
    en: { label: 'Rail operator', action: 'name the rail operator' },
    bs: { label: 'Željeznički operater', action: 'odrediti željezničkog operatera' },
    de: { label: 'Bahnbetreiber', action: 'den Bahnbetreiber benennen' },
  },
  terminals: {
    en: { label: 'Terminals', action: 'confirm the terminals' },
    bs: { label: 'Terminali', action: 'potvrditi terminale' },
    de: { label: 'Terminals', action: 'die Terminals bestätigen' },
  },
  wagon_or_container: {
    en: { label: 'Wagon or container', action: 'confirm the wagon or container' },
    bs: { label: 'Vagon ili kontejner', action: 'potvrditi vagon ili kontejner' },
    de: { label: 'Waggon oder Container', action: 'Waggon oder Container bestätigen' },
  },
  rail_booking_confirmation: {
    en: { label: 'Rail booking confirmation', action: 'confirm the rail booking' },
    bs: { label: 'Potvrda željezničkog bookinga', action: 'potvrditi željeznički booking' },
    de: { label: 'Bahnbuchungsbestätigung', action: 'die Bahnbuchung bestätigen' },
  },
  departure_schedule: {
    en: { label: 'Departure schedule', action: 'confirm the departure schedule' },
    bs: { label: 'Raspored polaska', action: 'potvrditi raspored polaska' },
    de: { label: 'Abfahrtsplan', action: 'den Abfahrtsplan bestätigen' },
  },
  transit_status: {
    en: { label: 'Transit status', action: 'report the transit status' },
    bs: { label: 'Status u tranzitu', action: 'javiti status u tranzitu' },
    de: { label: 'Transitstatus', action: 'den Transitstatus melden' },
  },
  arrival_and_release_documents: {
    en: { label: 'Arrival & release documents', action: 'provide the arrival and release documents' },
    bs: { label: 'Dolazak i dokumenti za preuzimanje', action: 'dostaviti dokumente o dolasku i preuzimanju' },
    de: { label: 'Ankunfts- & Freigabedokumente', action: 'die Ankunfts- und Freigabedokumente bereitstellen' },
  },
};

// Tasks whose outcome is a value on the load itself open the load form on exactly that field.
// Everything else (driver assignment, document uploads, approvals) has no field to type into and
// keeps sending the viewer to the checklist instead.
const TASK_FIELDS: Record<string, string> = {
  assign_driver_and_vehicle: 'assigned_driver_user_id',
  vehicle_registrations: 'vehicle_id',
  confirm_pickup_time: 'etd_at',
  confirm_pickup: 'atd_at',
  booking_confirmation: 'booking_reference',
  shipping_line_and_agent: 'mediator',
  container_details: 'container_number',
  vessel_and_voyage: 'container_types',
  vgm: 'weight_kg',
  terminal_and_cutoff: 'departure',
  airline_and_agent: 'mediator',
  mawb_hawb: 'booking_reference',
  departure_status: 'atd_at',
  rail_operator: 'mediator',
  terminals: 'departure',
  wagon_or_container: 'container_number',
  rail_booking_confirmation: 'booking_reference',
  departure_schedule: 'etd_at',
};

// One plain sentence per task, the way a dispatcher would explain it to a new colleague.
const HINTS: Record<string, Record<Locale, string>> = {
  assign_driver_and_vehicle: {
    en: 'Pick the driver who will run this load.',
    bs: 'Izaberi vozača koji vozi ovaj teret.',
    de: 'Wähle den Fahrer, der diese Ladung fährt.',
  },
  confirm_pickup_time: {
    en: 'Set the date the cargo gets picked up.',
    bs: 'Postavi datum kada se roba preuzima.',
    de: 'Lege das Datum der Abholung fest.',
  },
  vehicle_registrations: {
    en: 'Pick the vehicle so its papers are on file.',
    bs: 'Izaberi vozilo da mu dokumenti budu u dosjeu.',
    de: 'Wähle das Fahrzeug, damit seine Papiere hinterlegt sind.',
  },
  cmr_and_documents: {
    en: 'Attach the CMR and the transport papers.',
    bs: 'Priloži CMR i prateće transportne dokumente.',
    de: 'Lade den CMR und die Transportpapiere hoch.',
  },
  confirm_pickup: {
    en: 'Set the date the cargo actually left.',
    bs: 'Upiši datum kada je roba stvarno preuzeta.',
    de: 'Trage ein, wann die Ware tatsächlich abgeholt wurde.',
  },
  tracking_and_status_updates: {
    en: 'Start tracking so the customer can follow the trip.',
    bs: 'Pokreni praćenje da kupac vidi gdje je teret.',
    de: 'Starte das Tracking, damit der Kunde die Fahrt verfolgen kann.',
  },
  proof_of_delivery: {
    en: 'Attach the signed delivery note.',
    bs: 'Priloži potpisanu potvrdu o isporuci.',
    de: 'Lade den unterschriebenen Ablieferbeleg hoch.',
  },
  booking_confirmation: {
    en: 'Confirm the booking with the carrier.',
    bs: 'Potvrdi booking kod brodara.',
    de: 'Bestätige die Buchung bei der Reederei.',
  },
  shipping_line_and_agent: {
    en: 'Name the line and the agent handling it.',
    bs: 'Upiši brodara i agenta koji vodi posao.',
    de: 'Nenne die Reederei und den zuständigen Agenten.',
  },
  vessel_and_voyage: {
    en: 'Confirm which vessel and voyage carries it.',
    bs: 'Potvrdi brod i broj plovidbe.',
    de: 'Bestätige Schiff und Reisenummer.',
  },
  container_details: {
    en: 'Enter the container number and type.',
    bs: 'Upiši broj i tip kontejnera.',
    de: 'Trage Containernummer und -typ ein.',
  },
  shipping_instructions: {
    en: 'Send the carrier your shipping instructions.',
    bs: 'Pošalji brodaru otpremne instrukcije.',
    de: 'Sende der Reederei deine Versandanweisungen.',
  },
  vgm: {
    en: 'Submit the verified gross mass.',
    bs: 'Dostavi ovjerenu bruto masu (VGM).',
    de: 'Übermittle die verifizierte Bruttomasse.',
  },
  draft_bill_of_lading: {
    en: 'Issue the draft B/L for review.',
    bs: 'Izdaj nacrt teretnice na pregled.',
    de: 'Stelle den B/L-Entwurf zur Prüfung aus.',
  },
  approve_draft: {
    en: 'Check the draft B/L and approve it.',
    bs: 'Provjeri nacrt teretnice i odobri ga.',
    de: 'Prüfe den B/L-Entwurf und gib ihn frei.',
  },
  final_bill_of_lading: {
    en: 'Issue the final bill of lading.',
    bs: 'Izdaj konačnu teretnicu.',
    de: 'Stelle das endgültige Konnossement aus.',
  },
  terminal_and_cutoff: {
    en: 'Confirm the terminal and the cut-off time.',
    bs: 'Potvrdi terminal i cut-off vrijeme.',
    de: 'Bestätige Terminal und Cut-off-Zeit.',
  },
  airline_and_agent: {
    en: 'Name the airline and the handling agent.',
    bs: 'Upiši avioprevoznika i agenta.',
    de: 'Nenne die Airline und den Abfertigungsagenten.',
  },
  flight_details: {
    en: 'Confirm the flight and its schedule.',
    bs: 'Potvrdi let i njegov raspored.',
    de: 'Bestätige den Flug und seinen Zeitplan.',
  },
  mawb_hawb: {
    en: 'Issue the master and house air waybills.',
    bs: 'Izdaj MAWB i HAWB.',
    de: 'Stelle MAWB und HAWB aus.',
  },
  cargo_acceptance: {
    en: 'Arrange for the cargo to be accepted at the terminal.',
    bs: 'Dogovori prijem robe na terminalu.',
    de: 'Organisiere die Warenannahme am Terminal.',
  },
  security_and_customs_documents: {
    en: 'Attach the security and customs paperwork.',
    bs: 'Priloži sigurnosne i carinske dokumente.',
    de: 'Lade die Sicherheits- und Zollpapiere hoch.',
  },
  draft_awb: {
    en: 'Issue the draft air waybill.',
    bs: 'Izdaj nacrt AWB-a.',
    de: 'Stelle den AWB-Entwurf aus.',
  },
  approve_awb: {
    en: 'Check the draft AWB and approve it.',
    bs: 'Provjeri nacrt AWB-a i odobri ga.',
    de: 'Prüfe den AWB-Entwurf und gib ihn frei.',
  },
  departure_status: {
    en: 'Report the shipment as departed.',
    bs: 'Javi da je pošiljka krenula.',
    de: 'Melde den Abflug der Sendung.',
  },
  arrival_status: {
    en: 'Report the shipment as arrived.',
    bs: 'Javi da je pošiljka stigla.',
    de: 'Melde die Ankunft der Sendung.',
  },
  rail_operator: {
    en: 'Name the rail operator running the leg.',
    bs: 'Upiši željezničkog operatera koji vozi dionicu.',
    de: 'Nenne den Bahnbetreiber für diesen Abschnitt.',
  },
  terminals: {
    en: 'Confirm the loading and unloading terminals.',
    bs: 'Potvrdi terminale utovara i istovara.',
    de: 'Bestätige Verlade- und Entladeterminal.',
  },
  wagon_or_container: {
    en: 'Confirm the wagon or container used.',
    bs: 'Potvrdi vagon ili kontejner koji se koristi.',
    de: 'Bestätige den verwendeten Waggon oder Container.',
  },
  rail_booking_confirmation: {
    en: 'Confirm the rail booking.',
    bs: 'Potvrdi željeznički booking.',
    de: 'Bestätige die Bahnbuchung.',
  },
  departure_schedule: {
    en: 'Set the departure date.',
    bs: 'Postavi datum polaska.',
    de: 'Lege das Abfahrtsdatum fest.',
  },
  transit_status: {
    en: 'Report where the train is now.',
    bs: 'Javi gdje je voz trenutno.',
    de: 'Melde, wo der Zug gerade ist.',
  },
  arrival_and_release_documents: {
    en: 'Provide the arrival and release papers.',
    bs: 'Dostavi dokumente o dolasku i preuzimanju.',
    de: 'Stelle die Ankunfts- und Freigabepapiere bereit.',
  },
};

const STATUSES: Record<string, Record<Locale, string>> = {
  pending: { en: 'Pending', bs: 'Na čekanju', de: 'Ausstehend' },
  in_progress: { en: 'In progress', bs: 'U toku', de: 'In Arbeit' },
  completed: { en: 'Completed', bs: 'Završeno', de: 'Abgeschlossen' },
  blocked: { en: 'Blocked', bs: 'Blokirano', de: 'Blockiert' },
};

const MUST = { en: 'must', bs: 'mora', de: 'muss' } as const;

const localeOf = (lang: Language): Locale => (lang === 'bs' || lang === 'de' ? lang : 'en');
const humanize = (key: string) => key.replaceAll('_', ' ').replace(/^\w/, (letter) => letter.toUpperCase());

export const checklistOwner = (key: unknown): ChecklistOwner =>
  CUSTOMER_TASKS.has(String(key)) ? 'customer' : 'provider';

const OPEN_STATUSES = (status: unknown) => !['completed', 'approved', 'done'].includes(String(status || '').toLowerCase());

/**
 * How many checklist tasks are still waiting. `side` narrows it to the tasks that side owes, so a
 * customer is never told to go assign a driver.
 */
export const countPendingActions = (
  checklist: Array<{ key?: unknown; status?: unknown }> | undefined,
  side: ChecklistOwner | 'all' = 'all',
) => (checklist || []).filter((item) => OPEN_STATUSES(item.status)
  && (side === 'all' || checklistOwner(item.key) === side)).length;

/** The load field this task is completed in, if the task maps to one. */
export const checklistField = (key: unknown): string | null => TASK_FIELDS[String(key)] ?? null;

/** A one-line, plain-language explanation of what the task actually asks for. */
export const checklistHint = (lang: Language, key: unknown) => HINTS[String(key)]?.[localeOf(lang)] ?? '';

export const checklistStatusLabel = (lang: Language, status: unknown) =>
  STATUSES[String(status || '').toLowerCase()]?.[localeOf(lang)] ?? humanize(String(status || '—'));

export const checklistLabel = (lang: Language, key: unknown) =>
  TASKS[String(key)]?.[localeOf(lang)].label ?? humanize(String(key || ''));

/** "Provider must assign a driver and vehicle" — who owes the task, stated as a sentence. */
export const checklistSentence = (lang: Language, key: unknown, ownerLabel: string) => {
  const phrase = TASKS[String(key)]?.[localeOf(lang)].action;
  if (!phrase) return `${ownerLabel}: ${checklistLabel(lang, key)}`;
  return `${ownerLabel} ${MUST[localeOf(lang)]} ${phrase}`;
};
