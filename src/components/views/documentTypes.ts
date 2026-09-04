import { Language } from '../../types';

/**
 * The document type code list.
 *
 * PROVISIONAL: derived from the types visible in the Documentations design (CMR, Invoice, Packing
 * List, SDS, Customs Declaration) plus the paperwork the rest of the app already talks about.
 * Replace the entries with the agreed codebook - the `value` is what lands in `documents.type`,
 * so changing a value is a data migration, while changing a label is not.
 */
export const DOCUMENT_TYPES = [
  { value: 'CMR', en: 'CMR', bs: 'CMR', de: 'CMR' },
  { value: 'INVOICE', en: 'Invoice', bs: 'Faktura', de: 'Rechnung' },
  { value: 'PACKING_LIST', en: 'Packing List', bs: 'Packing lista', de: 'Packliste' },
  { value: 'DELIVERY_NOTE', en: 'Delivery Note', bs: 'Otpremnica', de: 'Lieferschein' },
  { value: 'PROOF_OF_DELIVERY', en: 'Proof of Delivery (POD)', bs: 'Potvrda o isporuci (POD)', de: 'Ablieferbeleg (POD)' },
  { value: 'CUSTOMS', en: 'Customs Declaration', bs: 'Carinska deklaracija', de: 'Zollanmeldung' },
  { value: 'T1', en: 'T1 / Transit Document', bs: 'T1 / tranzitni dokument', de: 'T1 / Versanddokument' },
  { value: 'SDS', en: 'Safety Data Sheet (SDS)', bs: 'Sigurnosni list (SDS)', de: 'Sicherheitsdatenblatt (SDS)' },
  { value: 'ADR', en: 'ADR Document', bs: 'ADR dokument', de: 'ADR-Dokument' },
  { value: 'BILL_OF_LADING', en: 'Bill of Lading (B/L)', bs: 'Teretnica (B/L)', de: 'Konnossement (B/L)' },
  { value: 'AWB', en: 'Air Waybill (AWB)', bs: 'Avio tovarni list (AWB)', de: 'Luftfrachtbrief (AWB)' },
  { value: 'RAIL_CONSIGNMENT_NOTE', en: 'Rail Consignment Note (CIM/SMGS)', bs: 'Željeznički tovarni list (CIM/SMGS)', de: 'Eisenbahnfrachtbrief (CIM/SMGS)' },
  { value: 'CERTIFICATE_OF_ORIGIN', en: 'Certificate of Origin', bs: 'Uvjerenje o porijeklu', de: 'Ursprungszeugnis' },
  { value: 'INSURANCE', en: 'Insurance Policy', bs: 'Polica osiguranja', de: 'Versicherungspolice' },
  { value: 'WEIGHT_TICKET', en: 'Weight Ticket', bs: 'Vagarska potvrda', de: 'Wiegeschein' },
  { value: 'INSPECTION_REPORT', en: 'Inspection Report', bs: 'Zapisnik o kontroli', de: 'Prüfbericht' },
  { value: 'DAMAGE_REPORT', en: 'Damage Report', bs: 'Zapisnik o šteti', de: 'Schadensbericht' },
  { value: 'CONTRACT', en: 'Contract / Agreement', bs: 'Ugovor', de: 'Vertrag' },
  { value: 'ORDER_CONFIRMATION', en: 'Order Confirmation', bs: 'Potvrda narudžbe', de: 'Auftragsbestätigung' },
  { value: 'VEHICLE_REGISTRATION', en: 'Vehicle registration certificate', bs: 'Saobraćajna dozvola', de: 'Fahrzeugschein' },
  { value: 'TRAILER_REGISTRATION', en: 'Trailer registration certificate', bs: 'Saobraćajna dozvola prikolice', de: 'Anhängerzulassung' },
  { value: 'INSURANCE_POLICY', en: 'Vehicle insurance policy', bs: 'Polica osiguranja vozila', de: 'Kfz-Versicherungspolice' },
  { value: 'COMMUNITY_LICENCE', en: 'Community Licence', bs: 'Licenca Zajednice', de: 'Gemeinschaftslizenz' },
  { value: 'TECHNICAL_INSPECTION', en: 'Technical inspection certificate', bs: 'Potvrda tehničkog pregleda', de: 'Hauptuntersuchungsnachweis' },
  { value: 'ATP_CERTIFICATE', en: 'ATP certificate', bs: 'ATP certifikat', de: 'ATP-Zertifikat' },
  { value: 'ADR_CERTIFICATE', en: 'Vehicle ADR certificate', bs: 'ADR certifikat vozila', de: 'ADR-Bescheinigung des Fahrzeugs' },
  { value: 'OWNERSHIP_CERTIFICATE', en: 'Proof of ownership', bs: 'Vlasnički list', de: 'Eigentumsnachweis' },
  { value: 'FINANCING_AGREEMENT', en: 'Financing agreement', bs: 'Ugovor finansiranja', de: 'Finanzierungsvertrag' },
  { value: 'LEASING_AGREEMENT', en: 'Leasing agreement', bs: 'Leasing ugovor', de: 'Leasingvertrag' },
  { value: 'RENTAL_AGREEMENT', en: 'Rental agreement', bs: 'Ugovor o najmu', de: 'Mietvertrag' },
  { value: 'OTHER_OWNERSHIP_DOCUMENT', en: 'Other ownership document', bs: 'Ostali dokumenti vlasništva', de: 'Sonstiger Eigentumsnachweis' },
  { value: 'VEHICLE_SERVICE_RECORD', en: 'Service record', bs: 'Servisni zapis', de: 'Servicenachweis' },
  { value: 'VEHICLE_REPAIR_INVOICE', en: 'Service / repair invoice', bs: 'Račun servisa / popravke', de: 'Service- / Reparaturrechnung' },
  { value: 'VEHICLE_EXPENSE_RECEIPT', en: 'Vehicle expense receipt', bs: 'Račun troška vozila', de: 'Fahrzeugkostenbeleg' },
  { value: 'OTHER_PERMIT', en: 'Other vehicle permit', bs: 'Ostale dozvole vozila', de: 'Sonstige Fahrzeuggenehmigung' },
  { value: 'OTHER', en: 'Other', bs: 'Ostalo', de: 'Ostalo' },
] as const;

export type DocumentType = typeof DOCUMENT_TYPES[number]['value'];

export const documentTypeLabel = (lang: Language, value: string): string => {
  const option = DOCUMENT_TYPES.find((item) => item.value === value);
  if (!option) return value;
  return lang === 'bs' ? option.bs : lang === 'de' ? option.de : option.en;
};

/** A stable colour per type, so the same paperwork reads the same everywhere in the table. */
export const documentTypeTone = (value: string): string => {
  switch (value) {
    case 'CMR': return 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400';
    case 'INVOICE': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'VEHICLE_SERVICE_RECORD':
    case 'VEHICLE_REPAIR_INVOICE':
    case 'VEHICLE_EXPENSE_RECEIPT': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    case 'PACKING_LIST': return 'border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400';
    case 'CUSTOMS':
    case 'T1': return 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400';
    case 'SDS':
    case 'ADR':
    case 'DAMAGE_REPORT': return 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400';
    case 'OWNERSHIP_CERTIFICATE':
    case 'FINANCING_AGREEMENT':
    case 'LEASING_AGREEMENT':
    case 'RENTAL_AGREEMENT':
    case 'OTHER_OWNERSHIP_DOCUMENT': return 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400';
    default: return 'border-slate-300 bg-slate-500/10 text-slate-600 dark:border-slate-600 dark:text-slate-300';
  }
};
