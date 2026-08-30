import { useEffect, useMemo, useRef, useState } from 'react';
import { FileCheck2, FilePlus2, Loader2, LockKeyhole, Search, X } from 'lucide-react';
import type { Language } from '../../../types';
import { api, type CustomsDocument } from '../../../services/api';
import { cn } from '../../../lib/cn';
import { Button } from '../../ui/Button';
import { Input } from './FormFields';

type Props = {
  hsCodes: string[];
  documents: CustomsDocument[];
  onChange: (documents: CustomsDocument[]) => void;
  lang: Language;
};

const COPY = {
  en: {
    title: 'Attached documents', subtitle: 'Required documents are matched from the selected HS codes.',
    add: 'Add from list', empty: 'No documents selected.', matched: 'Matched', manual: 'Added',
    all: 'All documents', search: 'Search by code or description', close: 'Close', remove: 'Remove',
    loading: 'Matching documents…', error: 'Documents could not be loaded.',
  },
  bs: {
    title: 'Priloženi dokumenti', subtitle: 'Neophodni dokumenti se povezuju prema odabranim HS šiframa.',
    add: 'Dodaj sa liste', empty: 'Nema odabranih dokumenata.', matched: 'Povezano', manual: 'Dodano',
    all: 'Svi dokumenti', search: 'Pretraži po šifri ili opisu', close: 'Zatvori', remove: 'Ukloni',
    loading: 'Povezivanje dokumenata…', error: 'Dokumenti se nisu mogli učitati.',
  },
  de: {
    title: 'Beigefügte Dokumente', subtitle: 'Erforderliche Dokumente werden anhand der ausgewählten HS-Codes zugeordnet.',
    add: 'Aus Liste hinzufügen', empty: 'Keine Dokumente ausgewählt.', matched: 'Zugeordnet', manual: 'Hinzugefügt',
    all: 'Alle Dokumente', search: 'Nach Code oder Beschreibung suchen', close: 'Schließen', remove: 'Entfernen',
    loading: 'Dokumente werden zugeordnet…', error: 'Dokumente konnten nicht geladen werden.',
  },
} as const;

export function CustomsDocumentsPanel({ hsCodes, documents, onChange, lang }: Props) {
  const text = COPY[lang === 'bs' || lang === 'de' ? lang : 'en'];
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalog, setCatalog] = useState<CustomsDocument[]>([]);
  const [search, setSearch] = useState('');
  const [matching, setMatching] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [error, setError] = useState('');
  const documentsRef = useRef(documents);
  useEffect(() => { documentsRef.current = documents; }, [documents]);
  const codeSignature = hsCodes.join('|');

  useEffect(() => {
    let cancelled = false;
    setMatching(true);
    setError('');
    api.customsDocuments.match(hsCodes)
      .then((response) => {
        if (cancelled) return;
        const currentDocuments = documentsRef.current;
        const manual = currentDocuments.filter((document) => document.source === 'manual');
        const matchedCodes = new Set(response.data.map((document) => document.code));
        const next = [
          ...response.data.map((document) => ({ ...document, source: 'matched' as const })),
          ...manual.filter((document) => !matchedCodes.has(document.code)),
        ];
        const currentSignature = currentDocuments.map(({ code, source }) => `${code}:${source}`).join('|');
        const nextSignature = next.map(({ code, source }) => `${code}:${source}`).join('|');
        if (currentSignature !== nextSignature) onChange(next);
      })
      .catch(() => !cancelled && setError(text.error))
      .finally(() => !cancelled && setMatching(false));

    return () => { cancelled = true; };
    // Re-match only when HS selections change. The manual list is deliberately preserved above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeSignature]);

  useEffect(() => {
    if (!catalogOpen || catalog.length > 0 || catalogLoading) return;
    setCatalogLoading(true);
    api.customsDocuments.catalog()
      .then((response) => setCatalog(response.data))
      .catch(() => setError(text.error))
      .finally(() => setCatalogLoading(false));
  }, [catalog.length, catalogLoading, catalogOpen, text.error]);

  const selectedCodes = useMemo(() => new Set(documents.map((document) => document.code)), [documents]);
  const filteredCatalog = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return catalog;
    return catalog.filter((document) => document.code.toLocaleLowerCase().includes(needle)
      || document.label.toLocaleLowerCase().includes(needle));
  }, [catalog, search]);

  const addDocument = (document: CustomsDocument) => {
    if (selectedCodes.has(document.code)) return;
    onChange([...documents, { ...document, source: 'manual' }]);
  };

  const removeDocument = (code: string) => {
    onChange(documents.filter((document) => document.code !== code || document.source === 'matched'));
  };

  return (
    <>
      <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
              <FileCheck2 className="h-4 w-4" />
              <span>{text.title}</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">{text.subtitle}</p>
          </div>
          <Button type="button" size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => setCatalogOpen(true)}>
            <FilePlus2 className="h-3.5 w-3.5" />
            {text.add}
          </Button>
        </div>

        {matching && <p className="mt-3 inline-flex items-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" />{text.loading}</p>}
        {error && <p className="mt-3 text-xs font-semibold text-red-500">{error}</p>}

        <div className="mt-3 max-h-[430px] space-y-2 overflow-y-auto pr-1">
          {!matching && documents.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center text-xs text-slate-500 dark:border-slate-700">{text.empty}</div>
          )}
          {documents.map((document) => (
            <div key={document.code} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
              <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 font-mono text-[11px] font-black text-primary">{document.code}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold leading-4 text-slate-800 dark:text-slate-100">{document.label}</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {document.source === 'matched' && <LockKeyhole className="h-3 w-3" />}
                  {document.source === 'matched' ? text.matched : text.manual}
                </p>
              </div>
              {document.source === 'manual' && (
                <button type="button" title={text.remove} onClick={() => removeDocument(document.code)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {catalogOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setCatalogOpen(false)}>
          <div className="flex max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="inline-flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white"><FilePlus2 className="h-5 w-5 text-primary" />{text.all}</div>
              <button type="button" title={text.close} onClick={() => setCatalogOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="border-b border-slate-200 p-4 dark:border-slate-800">
              <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={text.search} className="pl-10" /></div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {catalogLoading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />{text.loading}</div>
              ) : filteredCatalog.map((document) => {
                const selected = selectedCodes.has(document.code);
                return (
                  <div key={document.code} className="flex items-center gap-3 border-b border-slate-100 px-2 py-3 last:border-0 dark:border-slate-800">
                    <span className="w-20 shrink-0 font-mono text-xs font-black text-primary">{document.code}</span>
                    <span className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-200">{document.label}</span>
                    <Button type="button" size="sm" variant={selected ? 'secondary' : 'outline'} disabled={selected} className={cn('min-w-24', selected && 'opacity-70')} onClick={() => addDocument(document)}>{selected ? text.manual : text.add}</Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
