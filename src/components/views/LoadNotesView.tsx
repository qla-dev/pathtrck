import { useEffect, useMemo, useState } from 'react';
import { NotebookPen, Pin, Plus, Search, StickyNote } from 'lucide-react';

import { ui } from '../../i18n';
import { cn } from '../../lib/cn';
import { Language } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ApiUser, api } from '../../services/api';
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

  const loadsById = useMemo(
    () =>
      Object.fromEntries(
        loadOptions.map((load) => [
          load.id,
          {
            id: load.id,
            label: `${load.title} Â· ${load.pickup} -> ${load.delivery}`,
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

  const noteStats = useMemo(
    () => ({
      total: notes.length,
      pinned: notes.filter((note) => note.pinned).length,
      critical: notes.filter((note) => note.priority === 'High').length,
    }),
    [notes]
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
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">{u('notes.title', 'Load Notes')}</h1>
          <p className="text-slate-500 mt-1">
            {u('notes.subtitle', 'Keep dispatch notes, handoff instructions and route remarks tied to every active load.')}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-bold text-primary">
          <NotebookPen className="h-4 w-4" />
          {noteStats.total} {u('notes.totalNotes', 'notes')}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="flex h-full flex-col gap-6 lg:col-span-8">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{u('notes.stat.total', 'Total notes')}</p>
              <p className="mt-2 text-3xl font-black dark:text-white">{noteStats.total}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{u('notes.stat.pinned', 'Pinned')}</p>
              <p className="mt-2 text-3xl font-black text-primary">{noteStats.pinned}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{u('notes.stat.highPriority', 'High priority')}</p>
              <p className="mt-2 text-3xl font-black text-rose-600">{noteStats.critical}</p>
            </Card>
          </div>

          <Card className="p-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(180px,0.8fr)_minmax(180px,0.8fr)]">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={u('notes.searchPlaceholder', 'Search notes, load title or route...')}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition-colors focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </label>

              <select
                value={selectedLoadId}
                onChange={(event) => setSelectedLoadId(event.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition-colors hover:border-primary/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
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
                className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition-colors hover:border-primary/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
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

          <div className="flex flex-1 flex-col gap-4">
            {filteredNotes.map((note) => (
              <Card key={note.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider', priorityTone(note.priority))}>
                        {note.priority}
                      </span>
                      <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-bold text-primary">
                        {noteTypeLabel(lang, note.type)}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">{loadsById[note.loadId]?.label}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-bold dark:text-white">{note.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{note.text}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => togglePin(note.id)}
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors cursor-pointer',
                      note.pinned
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-slate-200 bg-white text-slate-400 hover:border-primary/40 hover:text-primary dark:border-slate-700 dark:bg-slate-900'
                    )}
                  >
                    <Pin className={cn('h-4 w-4', note.pinned && 'fill-current')} />
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                  <span>{note.author}</span>
                  <span>{note.updatedAt}</span>
                </div>
              </Card>
            ))}

            {filteredNotes.length === 0 && (
              <Card className="flex min-h-64 flex-1 items-center justify-center p-8 text-center">
                <div>
                  <StickyNote className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {u('notes.emptyTitle', 'No notes match this filter')}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {u('notes.emptySubtitle', 'Try another search or create a fresh note for one of your active loads.')}
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>

        <div className="lg:col-span-4">
          <Card className="p-5 sticky top-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{u('notes.newNoteLabel', 'New note')}</p>
            <h2 className="mt-2 text-xl font-bold dark:text-white">{u('notes.newNoteTitle', 'Add note for a load')}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {u('notes.newNoteSubtitle', 'Write instructions for dispatch, handoff reminders or route-specific details.')}
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  {u('notes.load', 'Load')}
                </label>
                <select
                  value={draftLoadId}
                  onChange={(event) => setDraftLoadId(event.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition-colors hover:border-primary/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                >
                  {loadOptions.map((load) => (
                    <option key={load.id} value={load.id}>
                      {load.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  {u('notes.noteType', 'Note type')}
                </label>
                <select
                  value={draftType}
                  onChange={(event) => setDraftType(event.target.value as NoteType)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition-colors hover:border-primary/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                >
                  {NOTE_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {noteTypeLabel(lang, option.value)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  {u('notes.noteTitle', 'Title')}
                </label>
                <input
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  placeholder={u('notes.titlePlaceholder', 'Example: unloading contact or dock reminder')}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition-colors hover:border-primary/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  {u('notes.priority', 'Priority')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Low', 'Medium', 'High'] as NotePriority[]).map((priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => setDraftPriority(priority)}
                      className={cn(
                        'rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer',
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
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  {u('notes.noteText', 'Note')}
                </label>
                <textarea
                  value={draftText}
                  onChange={(event) => setDraftText(event.target.value)}
                  rows={6}
                  placeholder={u('notes.textPlaceholder', 'Add loading instructions, customer notes, pause reminders or route context...')}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition-colors hover:border-primary/40 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              {createError && <p className="text-sm font-semibold text-rose-600">{createError}</p>}

              <Button
                onClick={handleCreateNote}
                disabled={creatingNote || !draftLoadId || !draftTitle.trim() || !draftText.trim() || !user}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                {creatingNote ? u('notes.creating', 'Creating…') : u('notes.create', 'Create note')}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
