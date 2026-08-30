import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentType } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, FileText, ListFilter, Search, StickyNote } from 'lucide-react';
import { cn } from '../../lib/cn';

export type RecordTypeOption = { value: string; label: string; kind: 'all' | 'document' | 'note'; icon?: ComponentType<{ className?: string }> };

export function RecordTypeSelect({ value, onChange, options, searchPlaceholder, noResults }: { value: string; onChange: (value: string) => void; options: RecordTypeOption[]; searchPlaceholder: string; noResults: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 288 });
  const selected = options.find((option) => option.value === value) || options[0];
  const filtered = useMemo(() => { const needle = query.trim().toLowerCase(); return needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options }, [options, query]);

  const updatePosition = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 8; const padding = 16; const below = window.innerHeight - rect.bottom - padding; const above = rect.top - padding;
    const openAbove = below < 260 && above > below; const available = Math.max(160, (openAbove ? above : below) - gap); const height = Math.min(376, available);
    setPosition({ left: rect.left, top: openAbove ? Math.max(padding, rect.top - height - gap) : rect.bottom + gap, width: rect.width, maxHeight: Math.max(96, height - 70) });
  }, []);

  useEffect(() => { const close = (event: MouseEvent) => { const target = event.target as Node; if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false) }; document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close) }, []);
  useLayoutEffect(() => { if (!open) return; updatePosition(); window.addEventListener('resize', updatePosition); document.addEventListener('scroll', updatePosition, true); return () => { window.removeEventListener('resize', updatePosition); document.removeEventListener('scroll', updatePosition, true) } }, [open, updatePosition]);
  const choose = (next: string) => { onChange(next); setOpen(false); setQuery('') };

  return <div ref={rootRef} className="relative"><button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className={cn('flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border bg-white px-2.5 text-left text-[13px] outline-none transition dark:bg-slate-950 dark:text-white', open ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200 dark:border-slate-800')}><TypeIcon option={selected} /><span className="min-w-0 flex-1 truncate font-semibold">{selected.label}</span><ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition', open && 'rotate-180')} /></button>{open && createPortal(<div ref={menuRef} className="fixed z-[300] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" style={{ left: position.left, top: position.top, width: position.width }}><div className="border-b border-slate-100 p-3 dark:border-slate-800"><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-950"><Search className="h-4 w-4 text-slate-400" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder} className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none dark:text-white" /></div></div><div role="listbox" className="overflow-y-auto p-2" style={{ maxHeight: position.maxHeight }}>{filtered.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} onClick={() => choose(option.value)} className={cn('flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-sky-50 dark:hover:bg-slate-800', option.value === value && 'bg-sky-50 dark:bg-sky-950/40')}><TypeIcon option={option} /><span className="min-w-0 flex-1 truncate text-sm font-bold dark:text-white">{option.label}</span>{option.value === value && <Check className="h-4 w-4 text-emerald-500" />}</button>)}{filtered.length === 0 && <p className="px-3 py-8 text-center text-sm text-slate-500">{noResults}</p>}</div></div>, document.body)}</div>;
}

function TypeIcon({ option }: { option: RecordTypeOption }) {
  if (option.icon) { const Icon = option.icon; return <Icon className={cn('h-4 w-4 shrink-0', option.kind === 'note' ? 'text-amber-500' : option.kind === 'document' ? 'text-sky-500' : 'text-primary')} /> }
  if (option.kind === 'document') return <FileText className="h-4 w-4 shrink-0 text-sky-500" />;
  if (option.kind === 'note') return <StickyNote className="h-4 w-4 shrink-0 text-amber-500" />;
  return <ListFilter className="h-4 w-4 shrink-0 text-primary" />;
}
