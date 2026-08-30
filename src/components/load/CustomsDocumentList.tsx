import { FormEvent, useState } from 'react';
import { Download, FileCheck2, Loader2, X } from 'lucide-react';
import type { Language } from '../../types';
import { api, type CustomsDocument } from '../../services/api';

type Props = { loadId: string | number; documents?: CustomsDocument[]; lang: Language; className?: string };
type FormValues = Record<string, string | boolean>;

const COPY = {
  en: { empty: 'No attached documents.', download: 'Download', error: 'The document could not be generated.', title: 'Complete document data', cancel: 'Cancel', generate: 'Generate and download', yes: 'Yes', no: 'No' },
  bs: { empty: 'Nema priloženih dokumenata.', download: 'Preuzmi', error: 'Dokument se nije mogao generisati.', title: 'Dopunite podatke dokumenta', cancel: 'Odustani', generate: 'Generiši i preuzmi', yes: 'Da', no: 'Ne' },
  de: { empty: 'Keine beigefügten Dokumente.', download: 'Herunterladen', error: 'Das Dokument konnte nicht erstellt werden.', title: 'Dokumentdaten ergänzen', cancel: 'Abbrechen', generate: 'Erstellen und herunterladen', yes: 'Ja', no: 'Nein' },
} as const;

const DEFAULTS: Record<string, FormValues> = {
  dis: { broj_disp: 'GENERALNA DISPOZICIJA ', text_before: 'U skladu sa odredbama člana 5. ZOCP-a (Sl.Glasnik BiH broj 58/15) ovlašćujemo Vas:', text_after: 'da u naše ime i za naš račun, poduzmete sve radnje i postupke kod carinskih, inspekcijskih i drugih organa, koje su potrebne za provođenje postupka carinjenja robe naslovljene na našu firmu.', signature_person: '' },
  osi: { osiguranje_text: 'Izjavljujemo pod punom odgovornošću da uvezenu robu nismo osigurali u transportu a prevozni troškovi iznose: ', signature_person: '' },
  dv1: { section7a_da: false, section7b_da: false, section7c_da: false, section8a_da: false, section8b_da: false, section9a_da: false, section9b_da: false, currency_tariff: '', place: '' },
  znp: { broj: '', roba: '', rok: '', nedost_dok: '', odgovorna_osoba: '', razlog_np: '', broj_odobrenja: '', rok_do_ci: '', moguci_car_dug: '', banka: '', broj_banke: '', datum_od_banka: '', datum_do_banka: '', iznos_garancije: '', valuta: 'BAM', vazi_od: '', vazi_do: '', broj_rc: '' },
};

const LABELS: Record<string, { en: string; bs: string; de: string }> = {
  broj_disp: { en: 'Dispatch number', bs: 'Broj dispozicije', de: 'Dispositionsnummer' }, text_before: { en: 'Opening text', bs: 'Tekst 1', de: 'Einleitungstext' }, text_after: { en: 'Closing text', bs: 'Tekst 2', de: 'Schlusstext' }, signature_person: { en: 'Responsible person', bs: 'Odgovorna osoba', de: 'Verantwortliche Person' }, osiguranje_text: { en: 'Insurance statement', bs: 'Izjava o osiguranju', de: 'Versicherungserklärung' },
  currency_tariff: { en: 'Currency rate to BAM', bs: 'Kurs valute u BAM', de: 'Wechselkurs zu BAM' }, place: { en: 'Place of signature', bs: 'Mjesto potpisa', de: 'Ort der Unterschrift' }, broj: { en: 'Number', bs: 'Broj', de: 'Nummer' }, roba: { en: 'Goods', bs: 'Roba', de: 'Ware' }, rok: { en: 'Deadline (days)', bs: 'Rok (dana)', de: 'Frist (Tage)' }, nedost_dok: { en: 'Missing documents', bs: 'Nedostajući dokumenti', de: 'Fehlende Dokumente' }, odgovorna_osoba: { en: 'Responsible person and phone', bs: 'Odgovorna osoba i telefon', de: 'Verantwortliche Person und Telefon' }, razlog_np: { en: 'Reason', bs: 'Razlog', de: 'Grund' },
  broj_odobrenja: { en: 'Approval number', bs: 'Broj odobrenja', de: 'Genehmigungsnummer' }, rok_do_ci: { en: 'Customs office deadline', bs: 'Rok do (CI)', de: 'Frist der Zollstelle' }, moguci_car_dug: { en: 'Possible customs debt', bs: 'Mogući carinski dug', de: 'Mögliche Zollschuld' }, banka: { en: 'Bank', bs: 'Banka', de: 'Bank' }, broj_banke: { en: 'Bank reference', bs: 'Broj banke', de: 'Bankreferenz' }, datum_od_banka: { en: 'Bank date from', bs: 'Datum od (banka)', de: 'Bankdatum von' }, datum_do_banka: { en: 'Bank date to', bs: 'Datum do (banka)', de: 'Bankdatum bis' }, iznos_garancije: { en: 'Guarantee amount', bs: 'Iznos garancije', de: 'Garantiebetrag' }, valuta: { en: 'Currency', bs: 'Valuta', de: 'Währung' }, vazi_od: { en: 'Valid from', bs: 'Važi od', de: 'Gültig von' }, vazi_do: { en: 'Valid until', bs: 'Važi do', de: 'Gültig bis' }, broj_rc: { en: 'RC number', bs: 'Broj RC', de: 'RC-Nummer' },
};

const TEXTAREAS = new Set(['text_before', 'text_after', 'osiguranje_text']);
const DATES = new Set(['datum_od_banka', 'datum_do_banka', 'vazi_od', 'vazi_do']);

function DocumentForm({ document, lang, busy, onClose, onSubmit }: { document: CustomsDocument; lang: 'en' | 'bs' | 'de'; busy: boolean; onClose: () => void; onSubmit: (values: FormValues) => void }) {
  const text = COPY[lang];
  const type = document.formType || '';
  const [values, setValues] = useState<FormValues>({ ...(DEFAULTS[type] || {}) });
  const submit = (event: FormEvent) => { event.preventDefault(); onSubmit(values) };

  return <div className="fixed inset-0 z-[320] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form onSubmit={submit} className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" role="dialog" aria-modal="true">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700"><div><h2 className="font-black text-slate-900 dark:text-white">{text.title}</h2><p className="mt-1 text-xs text-slate-500">{document.code} · {document.label}</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div>
      <div className="max-h-[65vh] overflow-y-auto p-5">
        {type === 'dv1' && <div className="mb-5 grid gap-3 sm:grid-cols-3">{['7a', '7b', '7c', '8a', '8b', '9a', '9b'].map((section) => <label key={section} className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold dark:border-slate-700"><span>{section.toUpperCase()}</span><span className="flex items-center gap-2 text-xs"><span>{values[`section${section}_da`] ? text.yes : text.no}</span><input type="checkbox" checked={Boolean(values[`section${section}_da`])} onChange={(event) => setValues((current) => ({ ...current, [`section${section}_da`]: event.target.checked }))} /></span></label>)}</div>}
        <div className="grid gap-4 sm:grid-cols-2">{Object.keys(values).filter((key) => !key.startsWith('section')).map((key) => <label key={key} className={TEXTAREAS.has(key) ? 'sm:col-span-2' : ''}><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{LABELS[key]?.[lang] || key}</span>{TEXTAREAS.has(key) ? <textarea rows={4} value={String(values[key])} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950" /> : <input required={key === 'currency_tariff'} type={DATES.has(key) ? 'date' : key === 'rok' ? 'number' : 'text'} value={String(values[key])} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950" />}</label>)}</div>
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-slate-700"><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold dark:border-slate-700">{text.cancel}</button><button type="submit" disabled={busy} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{text.generate}</button></div>
    </form>
  </div>;
}

export function CustomsDocumentList({ loadId, documents = [], lang, className = '' }: Props) {
  const activeLang = lang === 'bs' || lang === 'de' ? lang : 'en';
  const text = COPY[activeLang];
  const [downloading, setDownloading] = useState<string | null>(null);
  const [configuredDocument, setConfiguredDocument] = useState<CustomsDocument | null>(null);
  const [error, setError] = useState('');

  const download = async (document: CustomsDocument, formData: FormValues = {}) => {
    setDownloading(document.code); setError('');
    try { await api.customsDocuments.download(loadId, document.code, formData); setConfiguredDocument(null) }
    catch { setError(text.error) }
    finally { setDownloading(null) }
  };

  if (documents.length === 0) return <div className={`rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center text-xs text-slate-500 dark:border-slate-700 ${className}`}>{text.empty}</div>;

  return <div className={className}><div className="space-y-2">{documents.map((document) => <div key={document.code} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950"><FileCheck2 className="h-4 w-4 shrink-0 text-primary" /><span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 font-mono text-[11px] font-black text-primary">{document.code}</span><p className="min-w-0 flex-1 text-xs font-bold leading-4 text-slate-800 dark:text-slate-100">{document.label}</p>{document.downloadable && <button type="button" title={text.download} disabled={downloading !== null} onClick={() => document.formType ? setConfiguredDocument(document) : void download(document)} className="cursor-pointer rounded-lg p-2 text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50">{downloading === document.code ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}</button>}</div>)}</div>{error && <p className="mt-2 text-xs font-semibold text-red-500">{error}</p>}{configuredDocument && <DocumentForm document={configuredDocument} lang={activeLang} busy={downloading === configuredDocument.code} onClose={() => setConfiguredDocument(null)} onSubmit={(values) => void download(configuredDocument, values)} />}</div>;
}
