import { ChangeEvent, DragEvent, useMemo, useRef, useState } from 'react';
import { Archive, Camera, Download, FileText, Search, Trash2, Upload } from 'lucide-react';

import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { Language } from '../../types';
import { api, type CustomsDocument } from '../../services/api';
import { Card } from '../ui/Card';
import { DataTable } from '../ui/DataTable';
import { DOCUMENT_TYPES, documentTypeLabel, documentTypeTone } from './documentTypes';
import { CustomsDocumentList } from '../load/CustomsDocumentList';
import { RecordTypeSelect } from './RecordTypeSelect';

/** The "no load" option in the attach-to picker: the company's own archive. */
export const ARCHIVE = 'archive';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export type LoadOption = { id: string; label: string; customsDocuments?: CustomsDocument[] };

export type DocumentRow = {
  id: string;
  name: string;
  type: string;
  loadId: string;
  uploadedBy: string;
  uploadedAt: string;
  size: number;
};

export const formatDocumentSize = (bytes: number): string => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const inputClass = 'h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 outline-none transition-colors focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100';
const labelClass = 'mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500';

/**
 * Load paperwork: drag in a file, take a photo of it, or scan it - then either pin it to a load or
 * file it in the company archive. The archive is a first-class choice rather than an afterthought,
 * because a company keeping its own records has documents that belong to no single load.
 *
 * This card is separate from the table below it because it stays on screen in both tabs: someone
 * reading notes still has a CMR in their hand to upload.
 */
export const DocumentUploadCard = ({
  lang,
  attachTo,
  onUploaded,
}: {
  lang: Language;
  attachTo: string;
  onUploaded: () => Promise<void>;
}) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [documentType, setDocumentType] = useState<string>('');
  const [pending, setPending] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const acceptFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(u('documents.tooLarge', 'The file is larger than 25 MB.'));
      return;
    }
    setUploadError('');
    setPending(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    acceptFile(event.dataTransfer.files?.[0]);
  };

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    acceptFile(event.target.files?.[0]);
    // Clearing lets the same file be chosen twice in a row, which otherwise fires no change event.
    event.target.value = '';
  };

  const upload = async () => {
    if (!pending || uploading || attachTo === 'all') return;
    setUploading(true);
    setUploadError('');
    try {
      await api.documents.upload({
        file: pending,
        loadId: attachTo === ARCHIVE ? null : attachTo,
        type: documentType || 'OTHER',
      });
      await onUploaded();
      setPending(null);
      setDocumentType('');
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : u('documents.uploadFailed', 'The document could not be uploaded.'));
    } finally {
      setUploading(false);
    }
  };

  return (
      <Card className="shadow-none" contentClassName="p-3.5">
        <div className="flex flex-col gap-3">
          {/* The drop zone stretches to whatever height the fields beside it need, so the row has
              no dead space under it. */}
          <div className="flex flex-col">
            <p className={labelClass}>{u('documents.uploadNew', 'Upload new document')}</p>
            <div
              onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                'flex min-h-[112px] flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed px-3 py-3 text-center transition-colors',
                dragging ? 'border-primary bg-primary/5' : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950'
              )}
            >
              <Upload className="mb-1 h-5 w-5 text-primary" />
              {pending ? (
                <>
                  <p className="max-w-full truncate text-[13px] font-bold text-slate-800 dark:text-white">{pending.name}</p>
                  <p className="text-[11px] text-slate-500">{formatDocumentSize(pending.size)}</p>
                  <button type="button" onClick={() => setPending(null)} className="mt-1 cursor-pointer text-[11px] font-bold text-slate-500 underline">
                    {u('documents.chooseAnother', 'Choose another file')}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">{u('documents.dragDrop', 'Drag & drop a file here')}</p>
                  <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="cursor-pointer rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/5 dark:border-slate-700">
                      {u('documents.browse', 'Browse files')}
                    </button>
                    {/* capture="environment" opens the rear camera on a phone, which is how a driver
                        photographs a CMR at the ramp instead of finding a scanner. */}
                    <button type="button" onClick={() => cameraInputRef.current?.click()} className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-primary hover:bg-primary/5 dark:border-slate-700">
                      <Camera className="h-3 w-3" />
                      {u('documents.scan', 'Scan / photo')}
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400">{u('documents.accepted', 'PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (max. 25 MB)')}</p>
                </>
              )}
              <input ref={fileInputRef} type="file" onChange={onPick} className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.heic" />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={onPick} className="hidden" />
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <div>
              <p className={labelClass}>{u('documents.documentType', 'Document type')}</p>
              <RecordTypeSelect
                value={documentType}
                onChange={setDocumentType}
                options={[
                  { value: '', label: u('documents.selectType', 'Select document type'), kind: 'all' },
                  ...DOCUMENT_TYPES.map((option) => ({ value: option.value, label: documentTypeLabel(lang, option.value), kind: 'document' as const })),
                ]}
                searchPlaceholder={u('documents.searchDocumentTypes', 'Search document types')}
                noResults={u('documents.noTypesFound', 'No types found.')}
              />
            </div>

            {uploadError && <p className="text-[11px] font-semibold text-rose-600">{uploadError}</p>}

            <button
              type="button"
              disabled={!pending || uploading || attachTo === 'all'}
              onClick={() => void upload()}
              className="mt-auto inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-primary text-[13px] font-bold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/40"
            >
              <Upload className="h-3.5 w-3.5" />
              {uploading ? u('documents.uploading', 'Uploading…') : u('documents.upload', 'Upload')}
            </button>
          </div>
        </div>

      </Card>
  );
};

/**
 * The document list itself. Its rows and their refresh are owned by the page, so the counters at
 * the top of it and this table never disagree about what exists.
 */
export const LoadDocumentsPanel = ({
  lang,
  loadOptions,
  documents,
  loading,
  loadFilter,
  onRefresh,
}: {
  lang: Language;
  loadOptions: LoadOption[];
  documents: DocumentRow[];
  loading: boolean;
  loadFilter: string;
  onRefresh: () => Promise<void>;
}) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const selectedLoad = loadFilter === 'all' || loadFilter === ARCHIVE
    ? undefined
    : loadOptions.find((load) => load.id === loadFilter);

  const loadLabelById = useMemo(
    () => Object.fromEntries(loadOptions.map((load) => [load.id, load.label])),
    [loadOptions]
  );

  const filteredDocuments = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return documents.filter((document) => {
      const loadLabel = document.loadId ? loadLabelById[document.loadId] || document.loadId : '';
      const matchesQuery =
        !needle ||
        document.name.toLowerCase().includes(needle) ||
        documentTypeLabel(lang, document.type).toLowerCase().includes(needle) ||
        loadLabel.toLowerCase().includes(needle);
      const matchesLoad =
        loadFilter === 'all' ||
        (loadFilter === ARCHIVE ? document.loadId === '' : document.loadId === loadFilter);
      const matchesType = typeFilter === 'all' || document.type === typeFilter;
      return matchesQuery && matchesLoad && matchesType;
    });
  }, [documents, lang, loadFilter, loadLabelById, query, typeFilter]);

  const remove = async (id: string) => {
    await api.documents.remove(id);
    await onRefresh();
  };

  return (
      <Card className="shadow-none" contentClassName="p-3.5">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(160px,0.7fr)]">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={u('documents.searchPlaceholder', 'Search documents by name, type or load...')}
              className={cn(inputClass, 'pl-8')}
            />
          </label>
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className={cn(inputClass, 'cursor-pointer')}>
            <option value="all">{u('documents.allTypes', 'All document types')}</option>
            {DOCUMENT_TYPES.map((option) => (
              <option key={option.value} value={option.value}>{documentTypeLabel(lang, option.value)}</option>
            ))}
          </select>
        </div>

        {selectedLoad && (
          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            <p className={labelClass}>{u('documents.matchingCustomsDocuments', 'Matching customs documents')}</p>
            <CustomsDocumentList loadId={selectedLoad.id} documents={selectedLoad.customsDocuments} lang={lang} />
          </div>
        )}

        <div className="mt-2.5 overflow-x-auto">
          <DataTable className="min-w-[680px] text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-slate-800">
                <th className="pb-1.5 pr-3">{u('documents.column.name', 'Document name')}</th>
                <th className="pb-1.5 pr-3">{u('documents.column.type', 'Type')}</th>
                <th className="pb-1.5 pr-3">{u('documents.column.load', 'Load')}</th>
                <th className="pb-1.5 pr-3">{u('documents.column.uploadedBy', 'Uploaded by')}</th>
                <th className="pb-1.5 pr-3">{u('documents.column.uploadedAt', 'Uploaded at')}</th>
                <th className="pb-1.5 text-right">{u('documents.column.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((document) => (
                <tr key={document.id} className="border-b border-slate-50 last:border-b-0 dark:border-slate-800/60">
                  <td className="py-1.5 pr-3">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                      <span className="truncate font-semibold text-slate-800 dark:text-white">{document.name}</span>
                      <span className="shrink-0 text-[10px] text-slate-400">{formatDocumentSize(document.size)}</span>
                    </span>
                  </td>
                  <td className="py-1.5 pr-3">
                    <span className={cn('inline-flex rounded border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider', documentTypeTone(document.type))}>
                      {documentTypeLabel(lang, document.type)}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3">
                    {document.loadId ? (
                      <span className="font-semibold text-primary">{loadLabelById[document.loadId] || `#${document.loadId}`}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                        <Archive className="h-3 w-3" />
                        {u('documents.archive', 'Archive')}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-3 text-slate-600 dark:text-slate-300">{document.uploadedBy}</td>
                  <td className="py-1.5 pr-3 text-[11px] text-slate-500">{document.uploadedAt}</td>
                  <td className="py-1.5">
                    <span className="flex items-center justify-end gap-0.5">
                      <button
                        type="button"
                        title={u('documents.download', 'Download')}
                        onClick={() => void api.documents.open(document.id, document.name, false)}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title={u('common.delete', 'Delete')}
                        onClick={() => void remove(document.id)}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>

          {filteredDocuments.length === 0 && (
            <p className="py-5 text-center text-[13px] text-slate-500">
              {loading ? u('common.loading', 'Loading') : u('documents.empty', 'No documents yet.')}
            </p>
          )}
        </div>
      </Card>
  );
};
