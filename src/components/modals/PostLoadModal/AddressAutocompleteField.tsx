import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, type LucideIcon } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { useLocationAutocomplete } from '../../../hooks/useLocationAutocomplete';
import { useOutsideClick } from '../../../hooks/useOutsideClick';
import { LocationSearchResult } from '../../../services/locationSearch';
import { Input } from './FormFields';

export const AddressAutocompleteField = ({
  value,
  onChange,
  onSelectLocation,
  placeholder,
  onOpenMap,
  mapButtonLabel,
  mapButtonIcon: MapButtonIcon = MapPin,
  accentClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelectLocation: (location: LocationSearchResult) => void;
  placeholder: string;
  onOpenMap: () => void;
  mapButtonLabel: string;
  mapButtonIcon?: LucideIcon;
  accentClassName: string;
}) => {
  const { results, loading, isOpen, open, close, select } = useLocationAutocomplete(value);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  useOutsideClick(containerRef, close, isOpen);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [results]);

  const selectResult = (result: LocationSearchResult) => {
    select(result.label);
    onSelectLocation(result);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={open}
        onKeyDown={(event) => {
          if (!isOpen) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlightedIndex((current) => (current + 1) % results.length);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightedIndex((current) => (current - 1 + results.length) % results.length);
          } else if (event.key === 'Enter') {
            event.preventDefault();
            const result = results[highlightedIndex];
            if (result) selectResult(result);
          } else if (event.key === 'Escape') {
            close();
          }
        }}
        className="pr-12"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={onOpenMap}
        aria-label={mapButtonLabel}
        className={cn('absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg hover:bg-primary/10', accentClassName)}
      >
        <MapButtonIcon className="h-5 w-5" />
      </button>
      {loading && <Loader2 className="pointer-events-none absolute right-14 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {results.map((result, index) => (
            <button
              key={result.id}
              type="button"
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => selectResult(result)}
              className={cn(
                'flex w-full cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-left text-sm dark:text-slate-200',
                index === highlightedIndex ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{result.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

