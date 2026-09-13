import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Braces, BrainCircuit, Layers3, Network, RefreshCw, Search, Sparkles } from 'lucide-react';
import { api, type LenaSkillRow } from '../../services/api';
import type { Language } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { cn } from '../../lib/cn';

const words = {
  en: { subtitle: 'Explore the instructions behind Lena. See what each skill does and where it is used.', all: 'All', skills: 'Skills', instructions: 'Mode instructions', shared: 'Shared', modes: 'Modes', refresh: 'Refresh', search: 'Search skills, instructions or content…', name: 'Name & purpose', scope: 'Used in', file: 'Source file', open: 'View instructions', empty: 'No skills match these filters.', error: 'Could not load Lena skills.', loading: 'Loading skills…', scanner: 'Document & text scanning', detail: 'Instruction preview', hint: 'Select a row to explore its instructions.', readOnly: 'Read only', total: 'Files', clear: 'Clear filters' },
  de: { subtitle: 'Entdecken Sie Lenas Anweisungen, die Aufgaben ihrer Skills und ihre Einsatzbereiche.', all: 'Alle', skills: 'Skills', instructions: 'Modusanweisungen', shared: 'Gemeinsam genutzt', modes: 'Modi', refresh: 'Aktualisieren', search: 'Skills, Anweisungen oder Inhalte suchen…', name: 'Name und Zweck', scope: 'Verwendet in', file: 'Quelldatei', open: 'Anweisungen ansehen', empty: 'Keine Skills entsprechen diesen Filtern.', error: 'Lena-Skills konnten nicht geladen werden.', loading: 'Skills werden geladen…', scanner: 'Dokument- und Texterkennung', detail: 'Anweisungsvorschau', hint: 'Wählen Sie eine Zeile, um die Anweisungen zu lesen.', readOnly: 'Schreibgeschützt', total: 'Dateien', clear: 'Filter löschen' },
  bs: { subtitle: 'Pregledajte Lenine upute, zadatke pojedinih vještina i gdje se koriste.', all: 'Sve', skills: 'Vještine', instructions: 'Upute načina rada', shared: 'Zajedničke', modes: 'Načini rada', refresh: 'Osvježi', search: 'Pretraži vještine, upute ili sadržaj…', name: 'Naziv i namjena', scope: 'Koristi se u', file: 'Izvorna datoteka', open: 'Pogledaj upute', empty: 'Nema vještina za odabrane filtere.', error: 'Nije moguće učitati Lena vještine.', loading: 'Učitavanje vještina…', scanner: 'Skeniranje dokumenata i teksta', detail: 'Pregled uputa', hint: 'Odaberite red za pregled njegovih uputa.', readOnly: 'Samo za čitanje', total: 'Datoteke', clear: 'Ukloni filtere' },
};

export const LenaSkillsView = ({ lang }: { lang: Language }) => {
  const t = words[lang === 'bs' ? 'bs' : lang === 'de' ? 'de' : 'en'];
  const [rows, setRows] = useState<LenaSkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    api.lenaSkills.list().then(({ data }) => { if (active) setRows(data); })
      .catch(() => { if (active) { setError(true); setRows([]); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);
  const visible = useMemo(() => rows.filter(row => (filter === 'all' || (filter === 'shared' ? row.shared : row.kind === filter))
    && `${row.name} ${row.description} ${row.id} ${row.modes.join(' ')} ${row.content}`.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim())), [rows, search, filter]);
  const selected = visible.find(row => row.id === selectedId);
  const skillCount = rows.filter(row => row.kind === 'skill').length;
  const sharedCount = rows.filter(row => row.shared).length;
  return <div className="w-full min-w-0 space-y-5">
    <PageHeader icon={BrainCircuit} title="LenaAI skills" subtitle={t.subtitle} tone="violet"
      actions={<button type="button" onClick={() => setRefresh(v => v + 1)} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-xl border border-violet-200 px-3 text-xs font-bold text-violet-600 dark:border-violet-800 dark:text-violet-300"><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />{t.refresh}</button>}
      stats={[
        { label: t.total, value: String(rows.length), icon: BookOpen, tone: 'bg-sky-500/10 text-sky-500' },
        { label: t.skills, value: String(skillCount), icon: Sparkles, tone: 'bg-violet-500/10 text-violet-500' },
        { label: t.shared, value: String(sharedCount), icon: Network, tone: 'bg-emerald-500/10 text-emerald-500' },
        { label: t.modes, value: String(new Set(rows.flatMap(row => row.modes)).size), icon: Layers3, tone: 'bg-amber-500/10 text-amber-500' },
      ]} />
    <div className="flex flex-wrap items-center gap-2">
      {[['all', t.all, rows.length], ['skill', t.skills, skillCount], ['instructions', t.instructions, rows.length - skillCount], ['shared', t.shared, sharedCount]].map(([key, label, count]) => <button type="button" key={key} onClick={() => setFilter(String(key))} className={cn('rounded-xl border px-4 py-2 text-xs font-bold transition-colors', filter === key ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')}>{label} <span className="ml-2 opacity-60">{count}</span></button>)}
      <label className="ml-auto flex min-w-60 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"><Search className="h-4 w-4 text-slate-400" /><input aria-label={t.search} placeholder={t.search} value={search} onChange={event => setSearch(event.target.value)} className="w-full bg-transparent text-xs text-slate-700 outline-none dark:text-slate-200" /></label>
    </div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600 dark:bg-rose-950">{t.error}</p>}
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,1fr)]">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50"><tr><th className="p-4">{t.name}</th><th className="p-4">{t.scope}</th><th className="p-4">{t.file}</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{!loading && visible.map(row => <tr key={row.id} className={cn('transition-colors hover:bg-violet-50/50 dark:hover:bg-violet-950/20', selectedId === row.id && 'bg-violet-50 dark:bg-violet-950/30')}>
            <td className="min-w-60 p-4 align-top"><button type="button" onClick={() => setSelectedId(row.id)} aria-label={`${t.open}: ${row.name}`} className="text-left font-bold text-slate-800 hover:text-primary dark:text-slate-100">{row.name}</button><p className="mt-1 line-clamp-2 max-w-md leading-5 text-slate-500">{row.description}</p><span className="mt-2 inline-block rounded-md bg-violet-100 px-2 py-1 text-[9px] font-bold text-violet-600 dark:bg-violet-950 dark:text-violet-300">{row.kind === 'skill' ? t.skills : t.instructions}</span></td>
            <td className="p-4 align-top"><div className="flex max-w-60 flex-wrap gap-1">{row.shared ? <span className="rounded-md bg-emerald-100 px-2 py-1 font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{t.shared}</span> : row.modes.map(mode => <span key={mode} className="rounded-md bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{mode}</span>)}</div></td>
            <td className="p-4 align-top"><button type="button" onClick={() => setSelectedId(row.id)} className="max-w-48 break-all text-left font-mono text-[10px] text-primary hover:underline">{row.id}</button></td>
          </tr>)}</tbody></table></div>
        {loading && <p role="status" className="p-8 text-center text-sm text-slate-500">{t.loading}</p>}
        {!loading && !visible.length && !error && <div className="p-8 text-center text-sm text-slate-500">{t.empty}<button type="button" onClick={() => { setSearch(''); setFilter('all'); }} className="mx-auto mt-3 block text-primary underline">{t.clear}</button></div>}
      </section>
      <aside className="min-w-0 self-start rounded-2xl border border-violet-200 bg-white dark:border-violet-900 dark:bg-slate-900 xl:sticky xl:top-4">
        <div className="flex items-center justify-between border-b border-violet-100 p-4 dark:border-violet-900"><h2 className="flex items-center gap-2 text-xs font-black text-violet-600 dark:text-violet-300"><Braces className="h-4 w-4" />{t.detail}</h2><span className="text-[10px] text-slate-400">{t.readOnly}</span></div>
        {selected && !loading ? <div className="space-y-3 p-4"><h3 className="font-bold text-slate-900 dark:text-white">{selected.name}</h3><div className="flex flex-wrap gap-1">{selected.modes.map(mode => <span key={mode} className="rounded-md bg-violet-50 px-2 py-1 text-[10px] text-violet-600 dark:bg-violet-950 dark:text-violet-300">{mode}</span>)}</div>{selected.scanners && <p className="text-xs text-emerald-600">{t.scanner}</p>}<pre className="max-h-[65vh] overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 font-mono text-[11px] leading-6 text-slate-700 dark:bg-slate-950 dark:text-slate-300">{selected.content}</pre></div> : <div className="flex min-h-60 flex-col items-center justify-center gap-4 p-8 text-center text-sm text-slate-400"><Sparkles className="h-10 w-10 text-violet-300" />{t.hint}</div>}
      </aside>
    </div>
  </div>;
};
