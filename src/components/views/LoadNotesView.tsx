import { useMemo, useState } from 'react';
import { NotebookPen, Pin, Plus, Search, StickyNote } from 'lucide-react';

import { ui } from '../../i18n';
import { MOCK_LOADS } from '../../mockData';
import { cn } from '../../lib/cn';
import { Language } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

type NotePriority = 'Low' | 'Medium' | 'High';

type LoadNote = {
  id: string;
  loadId: string;
  title: string;
  text: string;
  priority: NotePriority;
  pinned: boolean;
  author: string;
  updatedAt: string;
};

const INITIAL_NOTES: LoadNote[] = [
  {
    id: 'n1',
    loadId: 'L2',
    title: 'Cold-chain handoff',
    text: 'Driver must confirm reefer setpoint before leaving Zagreb. Customer requires photo proof at departure.',
    priority: 'High',
    pinned: true,
    author: 'Lena / Dispatch',
    updatedAt: 'Today, 08:40',
  },
  {
    id: 'n2',
    loadId: 'L5',
    title: 'Crane slot booked',
    text: 'Unload crane is reserved for 16:30. If arrival slips more than 20 min, call site manager before gate entry.',
    priority: 'Medium',
    pinned: false,
    author: 'Mark / Fleet Lead',
    updatedAt: 'Today, 07:15',
  },
  {
    id: 'n3',
    loadId: 'L13',
    title: 'High-value escort note',
    text: 'Keep vehicle parked only in monitored rest stops. Client wants ETA update at border crossing.',
    priority: 'High',
    pinned: true,
    author: 'Security Desk',
    updatedAt: 'Yesterday, 19:05',
  },
];

export const LoadNotesView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [notes, setNotes] = useState<LoadNote[]>(INITIAL_NOTES);
  const [query, setQuery] = useState('');
  const [selectedLoadId, setSelectedLoadId] = useState<string>('all');
  const [draftLoadId, setDraftLoadId] = useState<string>(MOCK_LOADS[0]?.id || 'L1');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftText, setDraftText] = useState('');
  const [draftPriority, setDraftPriority] = useState<NotePriority>('Medium');

  const loadsById = useMemo(
    () =>
      Object.fromEntries(
        MOCK_LOADS.map((load) => [
          load.id,
          {
            id: load.id,
            label: `${load.title} · ${load.pickup} -> ${load.delivery}`,
          },
        ])
      ),
    []
  );

  const filteredNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...notes]
      .filter((note) => {
        const noteLabel = loadsById[note.loadId]?.label.toLowerCase() || '';
        const matchesQuery =
          !normalizedQuery ||
          note.title.toLowerCase().includes(normalizedQuery) ||
          note.text.toLowerCase().includes(normalizedQuery) ||
          noteLabel.includes(normalizedQuery);
        const matchesLoad = selectedLoadId === 'all' || note.loadId === selectedLoadId;
        return matchesQuery && matchesLoad;
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [loadsById, notes, query, selectedLoadId]);

  const noteStats = useMemo(
    () => ({
      total: notes.length,
      pinned: notes.filter((note) => note.pinned).length,
      critical: notes.filter((note) => note.priority === 'High').length,
    }),
    [notes]
  );

  const handleCreateNote = () => {
    if (!draftTitle.trim() || !draftText.trim()) return;

    setNotes((prev) => [
      {
        id: `n${prev.length + 1}`,
        loadId: draftLoadId,
        title: draftTitle.trim(),
        text: draftText.trim(),
        priority: draftPriority,
        pinned: draftPriority === 'High',
        author: 'John Doe',
        updatedAt: u('notes.justNow', 'Just now'),
      },
      ...prev,
    ]);
    setDraftTitle('');
    setDraftText('');
    setDraftPriority('Medium');
  };

  const togglePin = (id: string) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, pinned: !note.pinned } : note))
    );
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
        <div className="lg:col-span-8 space-y-6">
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
            <div className="flex flex-col gap-3 md:flex-row">
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
                {MOCK_LOADS.map((load) => (
                  <option key={load.id} value={load.id}>
                    {load.title}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          <div className="space-y-4">
            {filteredNotes.map((note) => (
              <Card key={note.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider', priorityTone(note.priority))}>
                        {note.priority}
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
              <Card className="p-8 text-center">
                <StickyNote className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {u('notes.emptyTitle', 'No notes match this filter')}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {u('notes.emptySubtitle', 'Try another search or create a fresh note for one of your active loads.')}
                </p>
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
                  {MOCK_LOADS.map((load) => (
                    <option key={load.id} value={load.id}>
                      {load.title}
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

              <Button onClick={handleCreateNote} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                {u('notes.create', 'Create note')}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
