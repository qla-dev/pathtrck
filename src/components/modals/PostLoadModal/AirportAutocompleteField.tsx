import { useEffect, useRef, useState } from 'react';
import { PlaneTakeoff } from 'lucide-react';
import { cn } from '../../../lib/cn';
import { useOutsideClick } from '../../../hooks/useOutsideClick';
import { AIRPORTS, Airport } from '../../../data/airports';
import { Input } from './FormFields';

const normalize = (value: string) => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export const formatAirportLabel = (airport: Airport) => `${airport.name} (${airport.iata}) — ${airport.city}, ${airport.country}`;

// Air's AOL/AOD equivalent of PortAutocompleteField - same shell backed by the static AIRPORTS
// list instead of a geocoder. Bosnia airports and the IATA-tagged corridor shortlist are ranked
// first so the handful of airports this platform's users actually book against surface before the
// rest of the ~150-airport list.
export const AirportAutocompleteField = ({
  value,
  onChange,
  onSelectAirport,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelectAirport: (airport: Airport) => void;
  placeholder: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  useOutsideClick(containerRef, () => setIsOpen(false), isOpen);

  const queryWords = normalize(value).split(' ').filter(Boolean);
  const results = queryWords.length === 0
    ? []
    : AIRPORTS.filter((airport) => {
        const haystack = normalize(`${airport.name} ${airport.city} ${airport.country} ${airport.iata}`);
        return queryWords.every((word) => haystack.includes(word));
      }).sort((a, b) => {
        const normalizedQuery = normalize(value);
        const aIataMatch = a.iata.toLowerCase() === normalizedQuery ? 0 : 1;
        const bIataMatch = b.iata.toLowerCase() === normalizedQuery ? 0 : 1;
        if (aIataMatch !== bIataMatch) return aIataMatch - bIataMatch;
        const aBosnia = a.countryCode === 'BA' ? 0 : 1;
        const bBosnia = b.countryCode === 'BA' ? 0 : 1;
        if (aBosnia !== bBosnia) return aBosnia - bBosnia;
        if (a.cargoTier !== b.cargoTier) return a.cargoTier - b.cargoTier;
        return a.name.localeCompare(b.name);
      });
  const showDropdown = isOpen && results.length > 0;

  useEffect(() => {
    setHighlightedIndex(0);
  }, [value]);

  const selectAirport = (airport: Airport) => {
    onSelectAirport(airport);
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
            const airport = results[highlightedIndex];
            if (airport) selectAirport(airport);
          } else if (event.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        placeholder={placeholder}
      />
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {results.map((airport, index) => (
            <button
              key={airport.iata}
              type="button"
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => selectAirport(airport)}
              className={cn(
                'flex w-full cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-left text-sm dark:text-slate-200',
                index === highlightedIndex ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <PlaneTakeoff className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block truncate">{airport.name} ({airport.iata}) — {airport.city}, {airport.country}</span>
                {airport.badge && (
                  <span className="mt-0.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">{airport.badge}</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
