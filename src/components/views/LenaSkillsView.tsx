import { Fragment, useEffect, useMemo, useState } from 'react';
import { BookOpen, Braces, BrainCircuit, ArrowRight, ChevronDown, CornerDownRight, Database, ExternalLink, FileJson, FileText, Globe, Layers3, Network, RefreshCw, Search, Sparkles } from 'lucide-react';
import { API_BASE_URL, api, type LenaSkillRow } from '../../services/api';
import type { Language } from '../../types';
import { PageHeader } from '../ui/PageHeader';
import { cn } from '../../lib/cn';

const words = {
  en: { subtitle: 'Explore the skills behind Lena. Open a skill to see its subskills and where they are used.', all: 'All', skills: 'Skills', subskills: 'Subskills', skill: 'Skill', subskill: 'Subskill', shared: 'Shared', modes: 'Modes', refresh: 'Refresh', search: 'Search skills, subskills or content…', name: 'Name & purpose', scope: 'Used in', file: 'Source file', open: 'View instructions', expand: 'Show subskills', collapse: 'Hide subskills', empty: 'No skills match these filters.', error: 'Could not load Lena skills.', loading: 'Loading skills…', scanner: 'Document & text scanning', detail: 'Instruction preview', hint: 'Select a row to explore its instructions.', readOnly: 'Read only', clear: 'Clear filters', overview: 'Overview', resources: 'Resources', noResources: 'This item lists no resources.', fileError: 'Could not open the file.' },
  de: { subtitle: 'Entdecken Sie Lenas Skills. Öffnen Sie einen Skill, um seine Sub-Skills und ihre Einsatzbereiche zu sehen.', all: 'Alle', skills: 'Skills', subskills: 'Sub-Skills', skill: 'Skill', subskill: 'Sub-Skill', shared: 'Gemeinsam genutzt', modes: 'Modi', refresh: 'Aktualisieren', search: 'Skills, Sub-Skills oder Inhalte suchen…', name: 'Name und Zweck', scope: 'Verwendet in', file: 'Quelldatei', open: 'Anweisungen ansehen', expand: 'Sub-Skills anzeigen', collapse: 'Sub-Skills ausblenden', empty: 'Keine Skills entsprechen diesen Filtern.', error: 'Lena-Skills konnten nicht geladen werden.', loading: 'Skills werden geladen…', scanner: 'Dokument- und Texterkennung', detail: 'Anweisungsvorschau', hint: 'Wählen Sie eine Zeile, um die Anweisungen zu lesen.', readOnly: 'Schreibgeschützt', clear: 'Filter löschen', overview: 'Übersicht', resources: 'Ressourcen', noResources: 'Für diesen Eintrag sind keine Ressourcen hinterlegt.', fileError: 'Die Datei konnte nicht geöffnet werden.' },
  bs: { subtitle: 'Pregledajte Lenine vještine. Otvorite vještinu da vidite njene podvještine i gdje se koriste.', all: 'Sve', skills: 'Vještine', subskills: 'Podvještine', skill: 'Vještina', subskill: 'Podvještina', shared: 'Zajedničke', modes: 'Načini rada', refresh: 'Osvježi', search: 'Pretraži vještine, podvještine ili sadržaj…', name: 'Naziv i namjena', scope: 'Koristi se u', file: 'Izvorna datoteka', open: 'Pogledaj upute', expand: 'Prikaži podvještine', collapse: 'Sakrij podvještine', empty: 'Nema vještina za odabrane filtere.', error: 'Nije moguće učitati Lena vještine.', loading: 'Učitavanje vještina…', scanner: 'Skeniranje dokumenata i teksta', detail: 'Pregled uputa', hint: 'Odaberite red za pregled njegovih uputa.', readOnly: 'Samo za čitanje', clear: 'Ukloni filtere', overview: 'Pregled', resources: 'Resursi', noResources: 'Ova stavka nema navedenih resursa.', fileError: 'Datoteku nije moguće otvoriti.' },
};

// A mode folder's AGENT.md is the skill, and everything below it (skills/*.md, legal's jurisdiction folders)
// is listed under it. agents/lena/skills has no AGENT.md: it is the group of skills every mode shares.
type SkillGroup = { folder: string; skill?: LenaSkillRow; subskills: LenaSkillRow[] };

export const LenaSkillsView = ({ lang, onOpenView }: { lang: Language; onOpenView?: (view: string) => void }) => {
  const langKey = lang === 'bs' ? 'bs' : lang === 'de' ? 'de' : 'en';
  const t = words[langKey];
  const nameOf = (item: LenaSkillRow) => item.names?.[langKey] || item.name;
  const [rows, setRows] = useState<LenaSkillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'resources'>('overview');
  // The data file expanded in the Resursi tab, and the contents loaded so far (by path).
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const toggleFile = (path: string) => {
    setOpenFile(current => current === path ? null : path);
    if (fileContents[path] !== undefined) return;
    api.lenaSkills.file(path)
      .then(({ data }) => setFileContents(current => ({ ...current, [path]: data.content })))
      .catch(() => setFileContents(current => ({ ...current, [path]: t.fileError })));
  };
  // Folders whose open state the user flipped with the arrow, relative to their default.
  const [toggled, setToggled] = useState<Set<string>>(new Set());
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    api.lenaSkills.list().then(({ data }) => { if (active) setRows(data); })
      .catch(() => { if (active) { setError(true); setRows([]); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);
  const query = search.toLocaleLowerCase().trim();
  const matches = (row: LenaSkillRow) => `${nameOf(row)} ${row.description} ${row.id} ${row.modes.join(' ')} ${row.content}`.toLocaleLowerCase().includes(query);
  // "All" shows the tree; a skill stays listed when one of its subskills matches the search, and opens by default then.
  const tree = useMemo(() => {
    const byFolder = new Map<string, SkillGroup>();
    for (const row of rows) {
      const key = row.folder.split('/')[0];
      const group = byFolder.get(key) ?? { folder: key, subskills: [] };
      if (row.id === `${key}/AGENT.md`) group.skill = row; else group.subskills.push(row);
      byFolder.set(key, group);
    }
    // The shared skills lead the tree; the other groups keep their order.
    return [...byFolder.values()].sort((a, b) => Number(b.folder === 'skills') - Number(a.folder === 'skills')).flatMap(group => {
      const skillMatches = group.skill ? matches(group.skill) : group.folder.includes(query);
      const subskills = group.subskills.filter(matches);
      if (!skillMatches && !subskills.length) return [];
      const showAll = skillMatches && !query;
      return [{ ...group, subskills: showAll ? group.subskills : subskills, defaultOpen: !showAll && subskills.length > 0 }];
    });
  }, [rows, query]);
  // A filter lists only the rows of that kind, without the tree.
  const flat = useMemo(() => rows.filter(row => (filter === 'skill' ? row.kind === 'instructions' : filter === 'subskill' ? row.kind === 'skill' : row.shared) && matches(row)), [rows, filter, query]);
  const listed = filter === 'all' ? tree.flatMap(group => [...(group.skill ? [group.skill] : []), ...group.subskills]) : flat;
  const selected = listed.find(row => row.id === selectedId);
  const skillCount = rows.filter(row => row.kind === 'instructions').length;
  const subskillCount = rows.length - skillCount;
  const sharedCount = rows.filter(row => row.shared).length;
  const toggle = (folder: string) => setToggled(current => {
    const next = new Set(current);
    if (next.has(folder)) next.delete(folder); else next.add(folder);
    return next;
  });
  // A folder with no prompt of its own: the whole row opens and closes it.
  const renderGroup = (group: SkillGroup, open: boolean) => <tr key={`group-${group.folder}`} onClick={() => toggle(group.folder)} aria-expanded={open} className="cursor-pointer transition-colors hover:bg-violet-50/50 dark:hover:bg-violet-950/20">
    <td colSpan={3} className="p-4">
      <div className="flex items-center gap-2">
        <span aria-label={open ? t.collapse : t.expand} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 dark:border-slate-700"><ChevronDown className={cn('h-4 w-4 transition-transform', !open && '-rotate-90')} /></span>
        <Layers3 className="h-4 w-4 shrink-0 text-violet-500" />
        <span className="font-bold capitalize text-slate-800 dark:text-slate-100">{group.folder === 'skills' ? t.shared : group.folder}</span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{group.subskills.length}</span>
      </div>
    </td>
  </tr>;
  const renderRow = (row: LenaSkillRow, options: { nested?: boolean; group?: SkillGroup; open?: boolean } = {}) => {
    const { nested = false, group, open = false } = options;
    const isSkill = row.kind === 'instructions';
    return <tr key={row.id} onClick={() => setSelectedId(row.id)} className={cn('cursor-pointer transition-colors hover:bg-violet-50/50 dark:hover:bg-violet-950/20', nested && 'bg-slate-50/60 dark:bg-slate-950/40', selectedId === row.id && 'bg-violet-50 dark:bg-violet-950/30')}>
      <td className="min-w-60 p-4 align-top">
        <div className={cn('flex items-start gap-2', nested && 'pl-8')}>
          {group && (group.subskills.length
            ? <button type="button" onClick={(event) => { event.stopPropagation(); toggle(group.folder); }} aria-expanded={open} aria-label={open ? t.collapse : t.expand} title={open ? t.collapse : t.expand} className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-violet-300 hover:bg-violet-100 hover:text-violet-600 dark:border-slate-700 dark:hover:border-violet-700 dark:hover:bg-violet-950"><ChevronDown className={cn('h-4 w-4 transition-transform', !open && '-rotate-90')} /></button>
            : <span className="h-6 w-6 shrink-0" />)}
          {nested && <CornerDownRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />}
          <div className="min-w-0">
            <button type="button" aria-label={`${t.open}: ${nameOf(row)}`} className="cursor-pointer text-left font-bold text-slate-800 hover:text-primary dark:text-slate-100">{nameOf(row)}</button>
            <p className="mt-1 line-clamp-2 max-w-md leading-5 text-slate-500">{row.description}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <span className={cn('inline-block rounded-md px-2 py-1 text-[9px] font-bold', isSkill ? 'bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-300' : 'bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-300')}>{isSkill ? t.skill : t.subskill}</span>
              {group && group.subskills.length > 0 && <span className="inline-block rounded-md bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-300">{t.subskills} {group.subskills.length}</span>}
            </div>
          </div>
        </div>
      </td>
      <td className="p-4 align-top"><div className="flex max-w-60 flex-wrap gap-1">{row.shared ? <span className="rounded-md bg-emerald-100 px-2 py-1 font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{t.shared}</span> : row.modes.map(mode => <span key={mode} className="rounded-md bg-slate-100 px-2 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{mode}</span>)}</div></td>
      <td className="p-4 align-top"><span className="block max-w-48 break-all font-mono text-[10px] text-primary">{row.id}</span></td>
    </tr>;
  };
  return <div className="w-full min-w-0 space-y-5">
    <PageHeader icon={BrainCircuit} title="LenaAI skills" subtitle={t.subtitle} tone="violet"
      actions={<button type="button" onClick={() => setRefresh(v => v + 1)} disabled={loading} className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-violet-200 px-3 text-xs font-bold text-violet-600 disabled:cursor-default dark:border-violet-800 dark:text-violet-300"><RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />{t.refresh}</button>}
      stats={[
        { label: t.skills, value: String(skillCount), icon: Sparkles, tone: 'bg-violet-500/10 text-violet-500' },
        { label: t.subskills, value: String(subskillCount), icon: BookOpen, tone: 'bg-sky-500/10 text-sky-500' },
        { label: t.shared, value: String(sharedCount), icon: Network, tone: 'bg-emerald-500/10 text-emerald-500' },
        { label: t.modes, value: String(new Set(rows.flatMap(row => row.modes)).size), icon: Layers3, tone: 'bg-amber-500/10 text-amber-500' },
      ]} />
    <div className="flex flex-wrap items-center gap-2">
      {[['all', t.all, rows.length], ['skill', t.skills, skillCount], ['subskill', t.subskills, subskillCount], ['shared', t.shared, sharedCount]].map(([key, label, count]) => <button type="button" key={key} onClick={() => setFilter(String(key))} className={cn('cursor-pointer rounded-xl border px-4 py-2 text-xs font-bold transition-colors', filter === key ? 'border-primary bg-primary text-white' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300')}>{label} <span className="ml-2 opacity-60">{count}</span></button>)}
      <label className="ml-auto flex min-w-60 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"><Search className="h-4 w-4 text-slate-400" /><input aria-label={t.search} placeholder={t.search} value={search} onChange={event => setSearch(event.target.value)} className="w-full bg-transparent text-xs text-slate-700 outline-none dark:text-slate-200" /></label>
    </div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-600 dark:bg-rose-950">{t.error}</p>}
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,1fr)]">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50"><tr><th className="p-4">{t.name}</th><th className="p-4">{t.scope}</th><th className="p-4">{t.file}</th></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{!loading && (filter === 'all'
            ? tree.map(group => {
              const open = group.defaultOpen !== toggled.has(group.folder);
              return <Fragment key={group.folder}>
                {group.skill ? renderRow(group.skill, { group, open }) : renderGroup(group, open)}
                {open && group.subskills.map(row => renderRow(row, { nested: true }))}
              </Fragment>;
            })
            : flat.map(row => renderRow(row)))}</tbody></table></div>
        {loading && <p role="status" className="p-8 text-center text-sm text-slate-500">{t.loading}</p>}
        {!loading && !listed.length && !error && <div className="p-8 text-center text-sm text-slate-500">{t.empty}<button type="button" onClick={() => { setSearch(''); setFilter('all'); }} className="mx-auto mt-3 block cursor-pointer text-primary underline">{t.clear}</button></div>}
      </section>
      <aside className="min-w-0 self-start rounded-2xl border border-violet-200 bg-white dark:border-violet-900 dark:bg-slate-900 xl:sticky xl:top-4">
        <div className="flex items-center justify-between border-b border-violet-100 p-4 dark:border-violet-900"><h2 className="flex items-center gap-2 text-xs font-black text-violet-600 dark:text-violet-300"><Braces className="h-4 w-4" />{t.detail}</h2><span className="text-[10px] text-slate-400">{t.readOnly}</span></div>
        {selected && !loading ? <div className="space-y-3 p-4"><h3 className="font-bold text-slate-900 dark:text-white">{nameOf(selected)}</h3><div className="flex flex-wrap gap-1"><span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{selected.kind === 'instructions' ? t.skill : t.subskill}</span>{selected.modes.map(mode => <span key={mode} className="rounded-md bg-violet-50 px-2 py-1 text-[10px] text-violet-600 dark:bg-violet-950 dark:text-violet-300">{mode}</span>)}</div>{selected.scanners && <p className="text-xs text-emerald-600">{t.scanner}</p>}
          <div role="tablist" className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {(['overview', 'resources'] as const).map(key => <button type="button" role="tab" key={key} aria-selected={tab === key} onClick={() => setTab(key)} className={cn('flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition-colors', tab === key ? 'bg-white text-violet-600 shadow-sm dark:bg-slate-900 dark:text-violet-300' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-200')}>{key === 'overview' ? t.overview : t.resources}{key === 'resources' && <span className="ml-1.5 opacity-60">{(selected.sources ?? []).length}</span>}</button>)}
          </div>
          {tab === 'overview'
            ? <pre className="max-h-[65vh] overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 font-mono text-[11px] leading-6 text-slate-700 dark:bg-slate-950 dark:text-slate-300">{selected.content}</pre>
            : (selected.sources ?? []).length
              // Same link as the source cards under Lena's chat answers, one document per row.
              ? <ul className="max-h-[65vh] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100 dark:divide-slate-800 dark:border-slate-800">{(selected.sources ?? []).map((source, index) => {
                const rowClass = 'flex w-full min-w-0 cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-xs font-semibold text-primary hover:bg-violet-50 hover:underline dark:hover:bg-violet-950/30';
                // A data file expands here; an app screen (the internal tariff catalogue) opens in place; documents and web pages open in a new tab.
                if (source.type === 'file') {
                  const fileOpen = openFile === source.path;
                  return <li key={`file-${source.path}`}>
                    <button type="button" onClick={() => toggleFile(source.path)} title={source.path} aria-expanded={fileOpen} className={rowClass}><FileJson className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 flex-1 truncate">{source.title}</span><span className="shrink-0 text-[10px] font-normal text-slate-400">{Math.max(1, Math.round(source.bytes / 1024))} KB</span><ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', !fileOpen && '-rotate-90')} /></button>
                    {fileOpen && <pre className="max-h-[50vh] overflow-auto border-t border-slate-100 bg-slate-50 p-3 font-mono text-[10px] leading-5 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">{fileContents[source.path] ?? t.loading}</pre>}
                  </li>;
                }
                if (source.type === 'app') return <li key={`app-${source.view}-${index}`}><button type="button" onClick={() => onOpenView?.(source.view)} title={source.title} className={rowClass}><Database className="h-3.5 w-3.5 shrink-0" /><span className="min-w-0 flex-1 truncate">{source.title}</span><ArrowRight className="h-3.5 w-3.5 shrink-0" /></button></li>;
                const link = source.type === 'link';
                return <li key={link ? source.url : source.id}><a href={link ? source.url : `${API_BASE_URL}/legal-sources/${encodeURIComponent(source.id)}`} target="_blank" rel="noreferrer" title={source.title} className={rowClass}>{link ? <Globe className="h-3.5 w-3.5 shrink-0" /> : <FileText className="h-3.5 w-3.5 shrink-0" />}<span className="min-w-0 flex-1 truncate">{link ? source.title : source.file}</span><ExternalLink className="h-3.5 w-3.5 shrink-0" /></a></li>;
              })}</ul>
              : <p className="rounded-xl bg-slate-50 p-6 text-center text-xs text-slate-400 dark:bg-slate-950">{t.noResources}</p>}
        </div> : <div className="flex min-h-60 flex-col items-center justify-center gap-4 p-8 text-center text-sm text-slate-400"><Sparkles className="h-10 w-10 text-violet-300" />{t.hint}</div>}
      </aside>
    </div>
  </div>;
};
