import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Archive, ArrowDownToLine, Clock3, Download, Ellipsis, FileText, Forklift, Landmark, MapPin, NotebookPen, PackageCheck, PackageOpen, Pin, Plus, Recycle, Route, Search, ShieldAlert, StickyNote, Trash2, Truck, UserRound, Warehouse, Wrench, type LucideIcon } from 'lucide-react';

import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { Language } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { DataTable } from '../ui/DataTable';
import { PageHeader } from '../ui/PageHeader';
import { ApiUser, api, type CustomsDocument } from '../../services/api';
import { ARCHIVE, DocumentRow, DocumentUploadCard, formatDocumentSize } from './LoadDocumentsPanel';
import { DOCUMENT_TYPES, documentTypeLabel, documentTypeTone } from './documentTypes';
import { CustomsDocumentList } from '../load/CustomsDocumentList';
import { LoadSelect } from '../load/LoadSelect';
import { RecordTypeSelect, type RecordTypeOption } from './RecordTypeSelect';
import { useApiList } from '../../hooks/useApiList';

type NotePriority = 'Low' | 'Medium' | 'High';

const NOTE_TYPES = [
  { value: 'LOADING_INSTRUCTIONS', en: 'Loading Instructions', bs: 'Instrukcije za utovar', de: 'Verladeanweisungen' },
  { value: 'UNLOADING_INSTRUCTIONS', en: 'Unloading Instructions', bs: 'Instrukcije za istovar', de: 'Entladeanweisungen' },
  { value: 'LOADING_CONTACT', en: 'Loading Contact', bs: 'Kontakt osobe na utovaru', de: 'Ladekontakt' },
  { value: 'UNLOADING_CONTACT', en: 'Unloading Contact', bs: 'Kontakt osobe na istovaru', de: 'Entladekontakt' },
  { value: 'DOCK_INSTRUCTIONS', en: 'Dock / Gate Instructions', bs: 'Rampe, gate, dock broj', de: 'Ramp-/Toranweisungen' },
  { value: 'PAPERWORK', en: 'Documents / Paperwork', bs: 'CMR, faktura, packing lista itd.', de: 'Dokumente / Unterlagen' },
  { value: 'CUSTOMS', en: 'Customs Instructions', bs: 'Carinske procedure i dokumenti', de: 'Zollanweisungen' },
  { value: 'ADR', en: 'ADR Instructions', bs: 'ADR zahtjevi', de: 'ADR-Anweisungen' },
  { value: 'PALLET_EXCHANGE', en: 'Pallet Exchange', bs: 'Razmjena paleta', de: 'Palettentausch' },
  { value: 'DRIVER_INSTRUCTIONS', en: 'Driver Instructions', bs: 'Instrukcije za vozača', de: 'Fahreranweisungen' },
  { value: 'DISPATCH_INSTRUCTIONS', en: 'Dispatch Instructions', bs: 'Interna Dispo napomena', de: 'Dispositionsanweisungen' },
  { value: 'ROUTE_REMARK', en: 'Route Remark', bs: 'Napomena vezana za rutu', de: 'Routenhinweis' },
  { value: 'CUSTOMER_NOTE', en: 'Customer Note', bs: 'Napomena klijenta', de: 'Kundenhinweis' },
  { value: 'DELIVERY_REQUIREMENT', en: 'Delivery Requirement', bs: 'Poseban zahtjev za isporuku', de: 'Lieferanforderung' },
  { value: 'PICKUP_REQUIREMENT', en: 'Pickup Requirement', bs: 'Poseban zahtjev za preuzimanje', de: 'Abholanforderung' },
  { value: 'WAITING_TIME', en: 'Waiting Time', bs: 'Napomena o čekanju', de: 'Wartezeit' },
  { value: 'DELAY', en: 'Delay', bs: 'Kašnjenje', de: 'Verzögerung' },
  { value: 'BREAKDOWN', en: 'Breakdown', bs: 'Kvar / problem sa vozilom', de: 'Panne' },
  { value: 'OTHER', en: 'Other', bs: 'Ostalo', de: 'Sonstiges' },
] as const;

type NoteType = typeof NOTE_TYPES[number]['value'];

const NOTE_TYPE_ICONS: Record<NoteType, LucideIcon> = {
  LOADING_INSTRUCTIONS: Forklift,
  UNLOADING_INSTRUCTIONS: ArrowDownToLine,
  LOADING_CONTACT: UserRound,
  UNLOADING_CONTACT: UserRound,
  DOCK_INSTRUCTIONS: Warehouse,
  PAPERWORK: FileText,
  CUSTOMS: Landmark,
  ADR: ShieldAlert,
  PALLET_EXCHANGE: Recycle,
  DRIVER_INSTRUCTIONS: Truck,
  DISPATCH_INSTRUCTIONS: Route,
  ROUTE_REMARK: MapPin,
  CUSTOMER_NOTE: StickyNote,
  DELIVERY_REQUIREMENT: PackageCheck,
  PICKUP_REQUIREMENT: PackageOpen,
  WAITING_TIME: Clock3,
  DELAY: AlertTriangle,
  BREAKDOWN: Wrench,
  OTHER: Ellipsis,
};

const NoteTypeIcon = ({ type, className = 'h-4 w-4' }: { type: NoteType; className?: string }) => {
  const Icon = NOTE_TYPE_ICONS[type];
  return <Icon className={className} />;
};

const noteTypeLabel = (lang: Language, value: string) => {
  const option = NOTE_TYPES.find((item) => item.value === value) || NOTE_TYPES[NOTE_TYPES.length - 1];
  return lang === 'bs' ? option.bs : lang === 'de' ? option.de : option.en;
};

type LoadNote = {
  id: string;
  loadId: string;
  title: string;
  text: string;
  type: NoteType;
  priority: NotePriority;
  pinned: boolean;
  author: string;
  updatedAt: string;
};

export const LoadNotesView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const notesResult = useApiList(api.notes.list, { per_page: 100 });
  const loadsResult = useApiList(api.loads.list, { per_page: 100 });
  const [user, setUser] = useState<ApiUser | null>(null);
  useEffect(() => { void api.auth.me().then(setUser); }, []);
  const documentsResult = useApiList(api.documents.list, { per_page: 100 });
  const documents = useMemo<DocumentRow[]>(() => documentsResult.items.map((row) => {
    const uploader = (row.uploader || {}) as Record<string, unknown>;
    return {
      id: String(row.id),
      name: String(row.name || '—'),
      type: String(row.type || 'OTHER'),
      loadId: row.load_id == null ? '' : String(row.load_id),
      draftId: row.load_draft_id == null ? '' : String(row.load_draft_id),
      uploadedBy: String(uploader.name || '—'),
      uploadedAt: String(row.created_at || '').replace('T', ' ').slice(0, 16) || '—',
      size: Number(row.size_bytes || 0),
    };
  }), [documentsResult.items]);
  const notes = useMemo<LoadNote[]>(() => notesResult.items.map((row) => {
    const lines = String(row.body || '').split('\n');
    const author = (row.author || {}) as Record<string, unknown>;
    const priority = String(row.priority || 'medium').toLowerCase();
    const rawType = String(row.note_type || 'OTHER');
    const type = NOTE_TYPES.some((option) => option.value === rawType) ? rawType as NoteType : 'OTHER';
    return { id: String(row.id), loadId: String(row.load_id), title: lines.length > 1 ? lines[0] : String(((row.freight_load || {}) as Record<string, unknown>).title || 'Note'), text: lines.length > 1 ? lines.slice(1).join('\n') : lines[0], type, priority: priority === 'high' ? 'High' : priority === 'low' ? 'Low' : 'Medium', pinned: priority === 'high', author: String(author.name || '—'), updatedAt: String(row.updated_at || row.created_at || '').replace('T', ' ').slice(0, 16) };
  }), [notesResult.items]);
  const loadOptions = useMemo(() => loadsResult.items.map((load) => { const stops = Array.isArray(load.stops) ? load.stops as Array<Record<string, unknown>> : []; return { id: String(load.id), title: String(load.title || `Load ${load.id}`), pickup: String(stops[0]?.city || '—'), delivery: String(stops[stops.length - 1]?.city || '—'), customsDocuments: Array.isArray(load.customs_documents) ? load.customs_documents as CustomsDocument[] : [] }; }), [loadsResult.items]);
  const [query, setQuery] = useState('');
  const [selectedLoadId, setSelectedLoadId] = useState<string>('all');
  const [recordTypeFilter, setRecordTypeFilter] = useState<string>('all');
  // Paperwork for loads that exist, or paperwork still sitting on an unfinished draft. Published is
  // the default because that is the working set; a draft's files are looked up deliberately.
  const [documentScope, setDocumentScope] = useState<'published' | 'draft'>('published');
  const [draftLoadId, setDraftLoadId] = useState<string>(ARCHIVE);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftText, setDraftText] = useState('');
  const [draftType, setDraftType] = useState<NoteType>('OTHER');
  const [draftPriority, setDraftPriority] = useState<NotePriority>('Medium');
  const [creatingNote, setCreatingNote] = useState(false);
  const [createError, setCreateError] = useState('');
  // Documents and notes share the page; the switch in the header decides which list is showing.
  const [mode, setMode] = useState<'all' | 'documents' | 'notes'>('all');
  const [composerMode, setComposerMode] = useState<'document' | 'note'>('document');

  useEffect(() => setRecordTypeFilter('all'), [mode]);

  const recordTypeOptions = useMemo<RecordTypeOption[]>(() => [
    { value: 'all', label: mode === 'documents' ? u('documents.allTypes', 'All document types') : mode === 'notes' ? u('notes.allNoteTypes', 'All note types') : u('documents.allRecordTypes', 'All types'), kind: 'all' },
    ...(mode === 'notes' ? [] : DOCUMENT_TYPES.map((option) => ({ value: `document:${option.value}`, label: documentTypeLabel(lang, option.value), kind: 'document' as const }))),
    ...(mode === 'documents' ? [] : NOTE_TYPES.map((option) => ({ value: `note:${option.value}`, label: noteTypeLabel(lang, option.value), kind: 'note' as const, icon: NOTE_TYPE_ICONS[option.value] }))),
  ], [lang, mode]);

  // The same loads the note form offers, in the label shape the documents table renders.
  const documentLoadOptions = useMemo(
    () => loadOptions.map((load) => ({ id: load.id, label: `${load.title} · ${load.pickup} → ${load.delivery}`, customsDocuments: load.customsDocuments })),
    [loadOptions]
  );

  const loadsById = useMemo(
    () =>
      Object.fromEntries(
        loadOptions.map((load) => [
          load.id,
          {
            id: load.id,
            label: `${load.title} · ${load.pickup} → ${load.delivery}`,
          },
        ])
      ),
    [loadOptions]
  );

  const unifiedRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const rows = [
      ...documents.map((document) => ({ kind: 'document' as const, sortAt: document.uploadedAt, document })),
      ...notes.map((note) => ({ kind: 'note' as const, sortAt: note.updatedAt, note })),
    ];

    return rows.filter((row) => {
      if (mode === 'documents' && row.kind !== 'document') return false;
      if (mode === 'notes' && row.kind !== 'note') return false;
      // Only a document can belong to a draft, so notes have nothing to show under that scope.
      if (documentScope === 'draft' && (row.kind !== 'document' || row.document.draftId === '')) return false;
      if (documentScope === 'published' && row.kind === 'document' && row.document.draftId !== '') return false;
      if (recordTypeFilter !== 'all') {
        const rowType = row.kind === 'document' ? `document:${row.document.type}` : `note:${row.note.type}`;
        if (rowType !== recordTypeFilter) return false;
      }
      const loadId = row.kind === 'document' ? row.document.loadId : row.note.loadId;
      const matchesLoad = selectedLoadId === 'all'
        || (selectedLoadId === ARCHIVE ? loadId === '' : loadId === selectedLoadId);
      if (!matchesLoad) return false;
      if (!normalizedQuery) return true;
      const searchable = row.kind === 'document'
        ? `${row.document.name} ${documentTypeLabel(lang, row.document.type)} ${loadsById[loadId]?.label || ''}`
        : `${row.note.title} ${row.note.text} ${noteTypeLabel(lang, row.note.type)} ${loadsById[loadId]?.label || ''}`;
      return searchable.toLowerCase().includes(normalizedQuery);
    }).sort((a, b) => b.sortAt.localeCompare(a.sortAt));
  }, [documentScope, documents, lang, loadsById, mode, notes, query, recordTypeFilter, selectedLoadId]);

  // One counter row for the whole page, so documents and notes are never counted in two places.
  const counters = useMemo(
    () => [
      { key: 'documents', label: u('documents.stat.total', 'Total documents'), value: documents.length, icon: FileText, tone: 'dark:text-white', chip: 'bg-sky-500/10 text-sky-500' },
      { key: 'onLoads', label: u('documents.stat.onLoads', 'On loads'), value: documents.filter((document) => document.loadId !== '').length, icon: Truck, tone: 'text-sky-500', chip: 'bg-sky-500/10 text-sky-500' },
      { key: 'archive', label: u('documents.stat.archived', 'In archive'), value: documents.filter((document) => document.loadId === '').length, icon: Archive, tone: 'text-amber-500', chip: 'bg-amber-500/10 text-amber-500' },
      { key: 'notes', label: u('notes.stat.total', 'Total notes'), value: notes.length, icon: StickyNote, tone: 'dark:text-white', chip: 'bg-emerald-500/10 text-emerald-500' },
      { key: 'high', label: u('notes.stat.highPriority', 'High priority'), value: notes.filter((note) => note.priority === 'High').length, icon: AlertTriangle, tone: 'text-rose-500', chip: 'bg-rose-500/10 text-rose-500' },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [documents, notes, lang]
  );

  const handleCreateNote = async () => {
    if (!draftLoadId || draftLoadId === ARCHIVE || !draftTitle.trim() || !draftText.trim() || !user || creatingNote) return;
    setCreatingNote(true);
    setCreateError('');
    try {
      await api.notes.create({ load_id: Number(draftLoadId), author_user_id: user.id, note_type: draftType, priority: draftPriority.toLowerCase(), body: `${draftTitle.trim()}\n${draftText.trim()}`, is_private: false });
      await notesResult.refresh();
      setDraftTitle('');
      setDraftText('');
      setDraftType('OTHER');
      setDraftPriority('Medium');
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : u('notes.createFailed', 'The note could not be created.'));
    } finally {
      setCreatingNote(false);
    }
  };

  const togglePin = async (id: string) => {
    const note = notes.find((item) => item.id === id);
    if (!note) return;
    await api.notes.update(id, { priority: note.pinned ? 'medium' : 'high' });
    await notesResult.refresh();
  };

  const priorityTone = (priority: NotePriority) =>
    priority === 'High'
      ? 'bg-rose-500/10 text-rose-600 border-rose-500/20'
      : priority === 'Medium'
        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';

  return (
    <div className="space-y-3">
      <PageHeader
        icon={NotebookPen}
        title={u('documents.title', 'Documents and notes')}
        subtitle={u('documents.subtitle', 'Manage load paperwork and dispatch notes in one place.')}
        filters={[
          { id: 'all', label: u('common.all', 'All'), count: documents.length + notes.length },
          { id: 'documents', label: u('documents.tab', 'Dokumenti'), count: documents.length },
          { id: 'notes', label: u('notes.tab', 'Napomene'), count: notes.length },
        ]}
        activeFilter={mode}
        onFilterChange={(id) => setMode(id as 'all' | 'documents' | 'notes')}
        stats={counters.map((counter) => ({ label: counter.label, value: counter.value, icon: counter.icon, tone: counter.chip }))}
      />

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="flex h-full min-w-0 flex-col gap-3 lg:col-span-8">
          <Card className="shadow-none" contentClassName="p-3.5">
            <label>
              <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">{u('documents.tableLoad', 'Table load')}</span>
              <LoadSelect value={selectedLoadId} onChange={setSelectedLoadId} options={documentLoadOptions} allLabel={u('documents.allLoads', 'All loads')} archiveLabel={u('documents.archiveOnly', 'Archive only (no load)')} searchPlaceholder={u('documents.searchLoads', 'Search loads by reference, company or route')} noResults={u('documents.noLoadsFound', 'No loads found.')} />
            </label>
          </Card>

          <Card className="shadow-none" contentClassName="p-3.5">
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(190px,0.55fr)_minmax(170px,0.45fr)]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={u('documents.searchAll', 'Search documents and notes...')}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[13px] text-slate-700 outline-none transition-colors focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>
              <RecordTypeSelect value={recordTypeFilter} onChange={setRecordTypeFilter} options={recordTypeOptions} searchPlaceholder={u('documents.searchTypes', 'Search document and note types')} noResults={u('documents.noTypesFound', 'No types found.')} />
              <select
                value={documentScope}
                onChange={(event) => setDocumentScope(event.target.value as 'published' | 'draft')}
                className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 outline-none transition-colors focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="published">{u('documents.scopePublished', 'Published only')}</option>
                <option value="draft">{u('documents.scopeDraft', 'Draft')}</option>
              </select>
            </div>
          </Card>

          {selectedLoadId !== 'all' && selectedLoadId !== ARCHIVE && (() => {
            const selected = documentLoadOptions.find((load) => load.id === selectedLoadId);
            return selected ? <Card className="shadow-none" contentClassName="p-3.5"><p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">{u('documents.matchingCustomsDocuments', 'Matching customs documents')}</p><CustomsDocumentList loadId={selected.id} documents={selected.customsDocuments} lang={lang} /></Card> : null;
          })()}

          <Card className="shadow-none" contentClassName="p-0">
            <div className="overflow-x-auto">
              <DataTable className="min-w-[760px] text-[13px]">
                <thead><tr className="border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-slate-800"><th className="px-3 py-2">{u('documents.column.name', 'Name')}</th><th className="px-3 py-2">{u('documents.column.type', 'Type')}</th><th className="px-3 py-2">{u('documents.column.load', 'Load')}</th><th className="px-3 py-2">{u('documents.column.uploadedBy', 'Created by')}</th><th className="px-3 py-2">{u('documents.column.uploadedAt', 'Date')}</th><th className="px-3 py-2 text-right">{u('documents.column.actions', 'Actions')}</th></tr></thead>
                <tbody>{unifiedRows.map((row) => row.kind === 'document' ? <tr key={`document-${row.document.id}`} className="border-b border-slate-50 dark:border-slate-800/60"><td className="px-3 py-2"><span className="flex items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-sky-500" /><span><span className="block font-bold text-slate-800 dark:text-white">{row.document.name}</span><span className="text-[10px] text-slate-400">{formatDocumentSize(row.document.size)}</span></span></span></td><td className="px-3 py-2"><span className={cn('inline-flex rounded border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider', documentTypeTone(row.document.type))}>{documentTypeLabel(lang, row.document.type)}</span></td><td className="px-3 py-2 text-xs font-semibold text-primary">{row.document.loadId ? loadsById[row.document.loadId]?.label : row.document.draftId ? `${u('documents.draft', 'Draft')} #${row.document.draftId}` : u('documents.archive', 'Archive')}</td><td className="px-3 py-2 text-slate-500">{row.document.uploadedBy}</td><td className="px-3 py-2 text-xs text-slate-500">{row.document.uploadedAt}</td><td className="px-3 py-2"><span className="flex justify-end gap-1"><button type="button" title={u('documents.download', 'Download')} onClick={() => void api.documents.open(row.document.id, row.document.name, false)} className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"><Download className="h-4 w-4" /></button><button type="button" title={u('common.delete', 'Delete')} onClick={() => void api.documents.remove(row.document.id).then(documentsResult.refresh)} className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-500 dark:hover:bg-slate-800"><Trash2 className="h-4 w-4" /></button></span></td></tr> : <tr key={`note-${row.note.id}`} className="border-b border-slate-50 dark:border-slate-800/60"><td className="px-3 py-2"><span className="flex items-start gap-2"><NoteTypeIcon type={row.note.type} className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /><span><span className="block font-bold text-slate-800 dark:text-white">{row.note.title}</span><span className="line-clamp-1 text-[11px] text-slate-500">{row.note.text}</span></span></span></td><td className="px-3 py-2"><span className={cn('inline-flex rounded border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider', priorityTone(row.note.priority))}>{noteTypeLabel(lang, row.note.type)}</span></td><td className="px-3 py-2 text-xs font-semibold text-primary">{loadsById[row.note.loadId]?.label}</td><td className="px-3 py-2 text-slate-500">{row.note.author}</td><td className="px-3 py-2 text-xs text-slate-500">{row.note.updatedAt}</td><td className="px-3 py-2 text-right"><button type="button" onClick={() => void togglePin(row.note.id)} className={cn('cursor-pointer rounded-lg border p-2', row.note.pinned ? 'border-primary bg-primary/10 text-primary' : 'border-slate-200 text-slate-400 dark:border-slate-700')}><Pin className={cn('h-4 w-4', row.note.pinned && 'fill-current')} /></button></td></tr>)}</tbody>
              </DataTable>
              {unifiedRows.length === 0 && <p className="py-8 text-center text-sm text-slate-500">{u('documents.emptyUnified', 'No documents or notes match this filter.')}</p>}
            </div>
          </Card>
        </div>

        <div className="min-w-0 lg:col-span-4">
          <div className="sticky top-4 space-y-3">
            <Card className="shadow-none" contentClassName="p-3.5">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                <button type="button" onClick={() => setComposerMode('document')} className={cn('cursor-pointer rounded-lg px-3 py-2 text-xs font-black transition-colors', composerMode === 'document' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-primary')}>{u('documents.newDocument', 'New document')}</button>
                <button type="button" onClick={() => setComposerMode('note')} className={cn('cursor-pointer rounded-lg px-3 py-2 text-xs font-black transition-colors', composerMode === 'note' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-primary')}>{u('notes.newNoteLabel', 'New note')}</button>
              </div>
              <label className="mt-3 block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">{u('notes.load', 'Load')}</span>
                <LoadSelect value={draftLoadId} onChange={setDraftLoadId} options={documentLoadOptions} archiveLabel={u('documents.noLoadArchive', 'No load — company archive')} searchPlaceholder={u('documents.searchLoads', 'Search loads by reference, company or route')} noResults={u('documents.noLoadsFound', 'No loads found.')} />
              </label>
            </Card>

            {composerMode === 'document' && <DocumentUploadCard lang={lang} attachTo={draftLoadId} onUploaded={documentsResult.refresh} />}

            {composerMode === 'note' && <Card className="shadow-none" contentClassName="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{u('notes.newNoteLabel', 'New note')}</p>
            <h2 className="mt-0.5 text-base font-bold dark:text-white">{u('notes.newNoteTitle', 'Add note for a load')}</h2>
            <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
              {u('notes.newNoteSubtitle', 'Write instructions for dispatch, handoff reminders or route-specific details.')}
            </p>

            <div className="mt-3 space-y-2.5">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {u('notes.noteType', 'Note type')}
                </label>
                <RecordTypeSelect
                  value={draftType}
                  onChange={(value) => setDraftType(value as NoteType)}
                  options={NOTE_TYPES.map((option) => ({ value: option.value, label: noteTypeLabel(lang, option.value), kind: 'note' as const, icon: NOTE_TYPE_ICONS[option.value] }))}
                  searchPlaceholder={u('notes.searchNoteTypes', 'Search note types')}
                  noResults={u('documents.noTypesFound', 'No types found.')}
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {u('notes.noteTitle', 'Title')}
                </label>
                <input
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  placeholder={u('notes.titlePlaceholder', 'Example: unloading contact or dock reminder')}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 outline-none transition-colors hover:border-primary/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {u('notes.priority', 'Priority')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Low', 'Medium', 'High'] as NotePriority[]).map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => setDraftPriority(priority)}
                      className={cn(
                        'rounded-lg border px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer',
                        draftPriority === priority
                          ? priorityTone(priority)
                          : 'border-slate-200 bg-white text-slate-500 hover:border-primary/40 dark:border-slate-700 dark:bg-slate-900'
                      )}
                    >
                      {priority}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {u('notes.noteText', 'Note')}
                </label>
                <textarea
                  value={draftText}
                  onChange={(event) => setDraftText(event.target.value)}
                  rows={4}
                  placeholder={u('notes.textPlaceholder', 'Add loading instructions, customer notes, pause reminders or route context...')}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[13px] text-slate-700 outline-none transition-colors hover:border-primary/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              {createError && <p className="text-[11px] font-semibold text-rose-600">{createError}</p>}

              <Button
                onClick={handleCreateNote}
                disabled={creatingNote || !draftLoadId || draftLoadId === ARCHIVE || !draftTitle.trim() || !draftText.trim() || !user}
                className="h-9 w-full text-[13px]"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {creatingNote ? u('notes.creating', 'Creating…') : u('notes.create', 'Create note')}
              </Button>
            </div>
            </Card>}
          </div>
        </div>
      </div>
    </div>
  );
};
