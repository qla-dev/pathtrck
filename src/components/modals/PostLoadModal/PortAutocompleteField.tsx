import { useEffect, useRef, useState } from 'react';
import { Ship } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { useOutsideClick } from '../../../hooks/useOutsideClick';
import { SEA_PORTS, SeaPort } from '../../../data/seaPorts';
import { Input } from './FormFields';

const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

// Sea's Origin/Destination equivalent of AddressAutocompleteField above - same visual shell (type
// to filter, click a suggestion, arrow keys to navigate) but backed by the static SEA_PORTS list
// instead of a Nominatim geocoder, since there is no reason to hit the network for a fixed set of
// ~60 commercial ports. Suggestions only render once the user has typed something, matching
// AddressAutocompleteField's behavior instead of dumping the full port list on focus.
export const PortAutocompleteField = ({
  value,
  onChange,
  onSelectPort,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelectPort: (port: SeaPort) => void;
  placeholder: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  useOutsideClick(containerRef, () => setIsOpen(false), isOpen);

  const queryWords = normalize(value).split(' ').filter(Boolean);
  const results = queryWords.length === 0
    ? []
    : SEA_PORTS.filter((port) => {
        const haystack = normalize(`${port.port} ${port.city} ${port.country} ${port.unlocode}`);
        return queryWords.every((word) => haystack.includes(word));
      });
  const showDropdown = isOpen && results.length > 0;

  useEffect(() => {
    setHighlightedIndex(0);
  }, [value]);

  const selectPort = (port: SeaPort) => {
    onSelectPort(port);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(event) => {
          if (!showDropdown) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlightedIndex((current) => (current + 1) % results.length);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlightedIndex((current) => (current - 1 + results.length) % results.length);
          } else if (event.key === 'Enter') {
            event.preventDefault();
            const port = results[highlightedIndex];
            if (port) selectPort(port);
          } else if (event.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        placeholder={placeholder}
      />
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {results.map((port, index) => (
            <button
              key={port.unlocode}
              type="button"
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => selectPort(port)}
              className={cn(
                'flex w-full cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-left text-sm dark:text-slate-200',
                index === highlightedIndex ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <Ship className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">{port.port} - {port.unlocode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
