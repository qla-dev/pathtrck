import { useEffect, useState } from 'react';
import { LocationSearchResult, searchLocations } from '../services/locationSearch';

export const useLocationAutocomplete = (query: string) => {
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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

  return { results, loading, clear };
};
