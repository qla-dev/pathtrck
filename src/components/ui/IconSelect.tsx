import { ChevronDown, Check } from 'lucide-react';
import { useEffect, useRef, useState, type ComponentType, type KeyboardEvent } from 'react';

import { cn } from '../../lib/cn';

type SelectIcon = ComponentType<{ className?: string }>;

export type IconSelectOption = {
  value: string;
  label: string;
  icon: SelectIcon;
};

type IconSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: IconSelectOption[];
  placeholder: string;
  icon: SelectIcon;
  ariaLabel?: string;
  className?: string;
};

export const IconSelect = ({ value, onChange, options, placeholder, icon: FieldIcon, ariaLabel, className }: IconSelectProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [highlightedIndex, setHighlightedIndex] = useState(Math.max(0, selectedIndex));
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (open) setHighlightedIndex(Math.max(0, selectedIndex));
  }, [open, selectedIndex]);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
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
      setHighlightedIndex((current) => (current + direction + options.length) % options.length);
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      choose(options[highlightedIndex]?.value || '');
    }
  };

  return (
    <div ref={rootRef} className={cn('relative min-w-0', className)}>
      <button
        type="button"
        aria-label={ariaLabel || placeholder}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onKeyDown}
        className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-xs font-semibold text-slate-600 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
      >
        {selected ? <selected.icon className="h-3.5 w-3.5 shrink-0 text-primary" /> : <FieldIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-slate-400')}>{selected?.label || placeholder}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div role="listbox" className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {options.map((option, index) => (
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
              <option.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {option.value === value && <Check className="h-3.5 w-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
