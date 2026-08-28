import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

import { WORLD_COUNTRIES } from '../../data/countries';
import { cn } from '../../lib/cn';

type CountrySelectProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const countries = [...WORLD_COUNTRIES]
  .map((country) => ({ code: country.code.toUpperCase(), name: country.name }))
  .sort((left, right) => left.name.localeCompare(right.name, 'bs'));

const flagUrl = (code: string) => `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

export const CountrySelect = ({ value, onChange, placeholder = 'Select country' }: CountrySelectProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 256 });
  const selected = countries.find((country) => country.code === value.toUpperCase());
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('bs');
    if (!normalized) return countries;
    return countries.filter((country) => `${country.code} ${country.name}`.toLocaleLowerCase('bs').includes(normalized));
  }, [query]);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const updateMenuPosition = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;
    const viewportPadding = 16;
    const gap = 8;
    const desiredHeight = 330;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openAbove = spaceBelow < 240 && spaceAbove > spaceBelow;
    const availableHeight = Math.max(150, (openAbove ? spaceAbove : spaceBelow) - gap);
    const menuHeight = Math.min(desiredHeight, availableHeight);
    setMenuPosition({
      left: Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - rect.width - viewportPadding)),
      top: openAbove ? Math.max(viewportPadding, rect.top - menuHeight - gap) : rect.bottom + gap,
      width: rect.width,
      maxHeight: Math.max(90, menuHeight - 58),
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    window.setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    document.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      document.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  return (
    <div ref={rootRef} className="relative">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-left text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white">
        {selected ? <img src={flagUrl(selected.code)} alt="" className="h-4 w-6 rounded-sm object-cover" /> : null}
        <span className="min-w-0 flex-1 truncate">{selected ? `${selected.code} - ${selected.name}` : placeholder}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[260] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          style={{ left: menuPosition.left, top: menuPosition.top, width: menuPosition.width }}
        >
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search country or code" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: menuPosition.maxHeight }}>
            {filtered.map((country) => (
              <button key={country.code} type="button" onClick={() => { onChange(country.code); setOpen(false); }} className={cn('flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-slate-100 dark:text-white dark:hover:bg-slate-800', country.code === value.toUpperCase() && 'bg-primary/10 text-primary')}>
                <img src={flagUrl(country.code)} alt="" className="h-4 w-6 rounded-sm object-cover" loading="lazy" />
                <span className="min-w-0 flex-1 truncate"><strong>{country.code}</strong> - {country.name}</span>
                {country.code === value.toUpperCase() && <Check className="h-4 w-4 shrink-0" />}
              </button>
            ))}
            {filtered.length === 0 && <p className="p-4 text-center text-sm text-slate-500">No results</p>}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};
