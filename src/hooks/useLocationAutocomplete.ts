import { useEffect, useRef, useState } from 'react';
import { LocationSearchResult, searchLocations } from '../services/locationSearch';

export const useLocationAutocomplete = (query: string) => {
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const skipNextQueryRef = useRef<string | null>(null);

  useEffect(() => {
    if (skipNextQueryRef.current === query) {
      skipNextQueryRef.current = null;
      return undefined;
    }
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      void searchLocations(query, controller.signal)
        .then(setResults)
        .catch((error) => {
          if ((error as Error).name !== 'AbortError') setResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const clear = () => setResults([]);
  const open = () => setIsFocused(true);
  const close = () => setIsFocused(false);

  /** Call when the user picks a suggestion, passing the exact value it will be set to. Prevents the value change from re-triggering a search. */
  const select = (nextValue: string) => {
    skipNextQueryRef.current = nextValue;
    setResults([]);
    setIsFocused(false);
  };

  return {
    results,
    loading,
    isOpen: isFocused && results.length > 0,
    open,
    close,
    clear,
    select,
  };
};
