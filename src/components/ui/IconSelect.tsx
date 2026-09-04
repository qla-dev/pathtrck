import { ChevronDown, Check, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ComponentType, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '../../lib/cn';

type SelectIcon = ComponentType<{ className?: string }>;

export type IconSelectOption = {
  value: string;
  label: string;
  icon: SelectIcon;
  logoUrl?: string;
  toneClass?: string;
};

type IconSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: IconSelectOption[];
  placeholder: string;
  icon: SelectIcon;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  noResults?: string;
};

export const IconSelect = ({ value, onChange, options, placeholder, icon: FieldIcon, ariaLabel, className, disabled = false, searchable = false, searchPlaceholder = 'Search...', noResults = 'No options found.' }: IconSelectProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [panelPosition, setPanelPosition] = useState<{ left: number; width: number; top?: number; bottom?: number; maxHeight: number } | null>(null);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [highlightedIndex, setHighlightedIndex] = useState(Math.max(0, selectedIndex));
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;
  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return searchable && needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options;
  }, [options, query, searchable]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 4;
      const viewportPadding = 8;
      const spaceBelow = window.innerHeight - rect.bottom - gap - viewportPadding;
      const spaceAbove = rect.top - gap - viewportPadding;
      const placeAbove = spaceBelow < 180 && spaceAbove > spaceBelow;
      setPanelPosition({
        left: Math.max(viewportPadding, Math.min(rect.left, window.innerWidth - rect.width - viewportPadding)),
        width: rect.width,
        maxHeight: Math.max(120, Math.min(240, placeAbove ? spaceAbove : spaceBelow)),
        ...(placeAbove ? { bottom: window.innerHeight - rect.top + gap } : { top: rect.bottom + gap }),
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) setHighlightedIndex(Math.max(0, selectedIndex));
  }, [open, selectedIndex]);

  const choose = (nextValue: string) => {
    if (disabled) return;
    onChange(nextValue);
    setOpen(false);
    setQuery('');
  };

  const optionGraphic = (option: IconSelectOption, selectedGraphic = false) => {
    const OptionIcon = option.icon;
    return (
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        <OptionIcon className={cn('h-3.5 w-3.5', option.toneClass || (selectedGraphic ? 'text-primary' : undefined))} />
        {option.logoUrl && (
          <img
            src={option.logoUrl}
            alt=""
            className="absolute inset-0 h-4 w-4 object-contain"
            onError={(event) => { event.currentTarget.style.display = 'none'; }}
          />
        )}
      </span>
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      if (filteredOptions.length) setHighlightedIndex((current) => (current + direction + filteredOptions.length) % filteredOptions.length);
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      choose(filteredOptions[highlightedIndex]?.value || '');
    }
  };

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel || placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => { if (!disabled) setOpen((current) => !current); }}
        onKeyDown={onKeyDown}
        className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-xs font-semibold text-slate-600 outline-none focus:border-primary disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
      >
        {selected ? optionGraphic(selected, true) : <FieldIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-slate-400')}>{selected?.label || placeholder}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && panelPosition && createPortal(
        <div ref={panelRef} role="listbox" style={panelPosition} className="fixed z-[320] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {searchable && <div className="sticky top-0 z-10 mb-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 dark:border-slate-700 dark:bg-slate-950"><Search className="h-3.5 w-3.5 text-slate-400" /><input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setHighlightedIndex(0) }} placeholder={searchPlaceholder} className="h-9 min-w-0 flex-1 bg-transparent text-xs outline-none dark:text-white" /></div>}
          {filteredOptions.map((option, index) => (
            <button
              type="button"
              role="option"
              aria-selected={option.value === value}
              key={`${option.value}-${index}`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => choose(option.value)}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-semibold',
                highlightedIndex === index ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/70',
                option.value === value && 'text-primary'
              )}
            >
              {optionGraphic(option)}
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.value === value && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>
          ))}
          {filteredOptions.length === 0 && <p className="px-3 py-6 text-center text-xs text-slate-500">{noResults}</p>}
        </div>,
        document.body,
      )}
    </div>
  );
};
