import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Archive, FileText, NotebookPen, Pin, Plus, Search, StickyNote, Truck } from 'lucide-react';

import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { Language } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ApiUser, api } from '../../services/api';
import { DocumentRow, DocumentUploadCard, LoadDocumentsPanel } from './LoadDocumentsPanel';
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
  const loadOptions = useMemo(() => loadsResult.items.map((load) => { const stops = Array.isArray(load.stops) ? load.stops as Array<Record<string, unknown>> : []; return { id: String(load.id), title: String(load.title || `Load ${load.id}`), pickup: String(stops[0]?.city || '—'), delivery: String(stops[stops.length - 1]?.city || '—') }; }), [loadsResult.items]);
  const [query, setQuery] = useState('');
  const [selectedLoadId, setSelectedLoadId] = useState<string>('all');
  const [selectedNoteType, setSelectedNoteType] = useState<NoteType | 'all'>('all');
  const [draftLoadId, setDraftLoadId] = useState<string>('');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftText, setDraftText] = useState('');
  const [draftType, setDraftType] = useState<NoteType>('OTHER');
  const [draftPriority, setDraftPriority] = useState<NotePriority>('Medium');
  const [creatingNote, setCreatingNote] = useState(false);
  const [createError, setCreateError] = useState('');
  // Documents and notes share the page; the switch in the header decides which list is showing.
  const [mode, setMode] = useState<'documents' | 'notes'>('documents');

  // The same loads the note form offers, in the label shape the documents table renders.
  const documentLoadOptions = useMemo(
    () => loadOptions.map((load) => ({ id: load.id, label: `${load.title} · ${load.pickup} → ${load.delivery}` })),
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

  useEffect(() => {
    if (!draftLoadId && loadOptions.length > 0) setDraftLoadId(loadOptions[0].id);
  }, [draftLoadId, loadOptions]);

  const filteredNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...notes]
      .filter((note) => {
        const noteLabel = loadsById[note.loadId]?.label.toLowerCase() || '';
        const matchesQuery =
          !normalizedQuery ||
          note.title.toLowerCase().includes(normalizedQuery) ||
          note.text.toLowerCase().includes(normalizedQuery) ||
          noteTypeLabel(lang, note.type).toLowerCase().includes(normalizedQuery) ||
          noteLabel.includes(normalizedQuery);
        const matchesLoad = selectedLoadId === 'all' || note.loadId === selectedLoadId;
        const matchesType = selectedNoteType === 'all' || note.type === selectedNoteType;
        return matchesQuery && matchesLoad && matchesType;
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [lang, loadsById, notes, query, selectedLoadId, selectedNoteType]);

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
    if (!draftLoadId || !draftTitle.trim() || !draftText.trim() || !user || creatingNote) return;
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
      {/* Same header and counter shape the Drivers page uses, so the two read as one product. */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500">
              <NotebookPen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black dark:text-white">{u('documents.title', 'Documents and notes')}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {mode === 'documents'
                  ? u('documents.subtitle', 'Manage load paperwork and dispatch notes in one place.')
                  : u('notes.subtitle', 'Keep dispatch notes, handoff instructions and route remarks tied to every active load.')}
              </p>
            </div>
          </div>

          {/* Same switch the freight exchange uses for Prevoz / Skladište - one list underneath,
              two things to look at. */}
          <div className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-transparent px-1 dark:border-slate-800">
            {([
              { id: 'documents' as const, icon: FileText, label: u('documents.tab', 'Dokumenti'), count: documents.length },
              { id: 'notes' as const, icon: StickyNote, label: u('notes.tab', 'Napomene'), count: notes.length },
            ]).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMode(tab.id)}
                className={cn(
                  'flex h-7 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-bold transition-all',
                  mode === tab.id ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
                <span className={cn('rounded px-1 text-[10px]', mode === tab.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800')}>{tab.count}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {/* min-w-0 + truncate: a grid item defaults to min-width:auto, so a long label like
            "UKUPNO DOKUMENATA" would widen its track and push the whole row past the viewport. */}
        {counters.map((counter) => (
          <Card key={counter.key} className="min-w-0 shadow-none" contentClassName="flex items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="truncate text-xs uppercase text-slate-500">{counter.label}</p>
              <p className={cn('mt-1 text-2xl font-black', counter.tone)}>{counter.value}</p>
            </div>
            <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', counter.chip)}>
              <counter.icon className="h-6 w-6" />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="flex h-full min-w-0 flex-col gap-3 lg:col-span-8">
          {/* Uploading stays available in both tabs - someone reading notes still has paperwork in
              hand, and switching tabs to file it would be busywork. */}
          <DocumentUploadCard lang={lang} loadOptions={documentLoadOptions} onUploaded={documentsResult.refresh} />

          {mode === 'documents' ? (
          <LoadDocumentsPanel
            lang={lang}
            loadOptions={documentLoadOptions}
            documents={documents}
            loading={documentsResult.loading}
            onRefresh={documentsResult.refresh}
          />
          ) : (
          <>
          <Card className="shadow-none" contentClassName="p-3.5">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(160px,0.7fr)_minmax(160px,0.7fr)]">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={u('notes.searchPlaceholder', 'Search notes, load title or route...')}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[13px] text-slate-700 outline-none transition-colors focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>

              <select
                value={selectedLoadId}
                onChange={(event) => setSelectedLoadId(event.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 outline-none transition-colors hover:border-primary/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="all">{u('notes.allLoads', 'All loads')}</option>
                {loadOptions.map((load) => (
                  <option key={load.id} value={load.id}>
                    {load.title}
                  </option>
                ))}
              </select>

              <select
                value={selectedNoteType}
                onChange={(event) => setSelectedNoteType(event.target.value as NoteType | 'all')}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 outline-none transition-colors hover:border-primary/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="all">{u('notes.allNoteTypes', 'All note types')}</option>
                {NOTE_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {noteTypeLabel(lang, option.value)}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          <div className="flex flex-1 flex-col gap-2">
            {filteredNotes.map((note) => (
              <Card key={note.id} className="shadow-none" contentClassName="p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider', priorityTone(note.priority))}>
                        {note.priority}
                      </span>
                      <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-bold text-primary">
                        {noteTypeLabel(lang, note.type)}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">{loadsById[note.loadId]?.label}</span>
                    </div>
                    <h3 className="mt-1.5 text-[15px] font-bold dark:text-white">{note.title}</h3>
                    <p className="mt-0.5 text-[13px] leading-5 text-slate-600 dark:text-slate-300">{note.text}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => togglePin(note.id)}
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors cursor-pointer',
                      note.pinned
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-slate-200 bg-white text-slate-400 hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-900'
                    )}
                  >
                    <Pin className={cn('h-4 w-4', note.pinned && 'fill-current')} />
                  </button>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-500">
                  <span>{note.author}</span>
                  <span>{note.updatedAt}</span>
                </div>
              </Card>
            ))}

            {filteredNotes.length === 0 && (
              <Card className="flex min-h-40 flex-1 shadow-none" contentClassName="flex flex-1 items-center justify-center p-5 text-center">
                <div>
                  <StickyNote className="mx-auto h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                    {u('notes.emptyTitle', 'No notes match this filter')}
                  </p>
                  <p className="mt-0.5 text-[12px] text-slate-500">
                    {u('notes.emptySubtitle', 'Try another search or create a fresh note for one of your active loads.')}
                  </p>
                </div>
              </Card>
            )}
          </div>
          </>
          )}
        </div>

        <div className="min-w-0 lg:col-span-4">
          <Card className="sticky top-4 shadow-none" contentClassName="p-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{u('notes.newNoteLabel', 'New note')}</p>
            <h2 className="mt-0.5 text-base font-bold dark:text-white">{u('notes.newNoteTitle', 'Add note for a load')}</h2>
            <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
              {u('notes.newNoteSubtitle', 'Write instructions for dispatch, handoff reminders or route-specific details.')}
            </p>

            <div className="mt-3 space-y-2.5">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {u('notes.load', 'Load')}
                </label>
                <select
                  value={draftLoadId}
                  onChange={(event) => setDraftLoadId(event.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 outline-none transition-colors hover:border-primary/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                >
                  {loadOptions.map((load) => (
                    <option key={load.id} value={load.id}>
                      {load.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {u('notes.noteType', 'Note type')}
                </label>
                <select
                  value={draftType}
                  onChange={(event) => setDraftType(event.target.value as NoteType)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-700 outline-none transition-colors hover:border-primary/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                >
                  {NOTE_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {noteTypeLabel(lang, option.value)}
                    </option>
                  ))}
                </select>
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
                disabled={creatingNote || !draftLoadId || !draftTitle.trim() || !draftText.trim() || !user}
                className="h-9 w-full text-[13px]"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {creatingNote ? u('notes.creating', 'Creating…') : u('notes.create', 'Create note')}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
