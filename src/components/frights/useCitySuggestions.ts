import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { transliterateLocation } from '../../lib/transliterateLocation';

type SuggestionSetter = Dispatch<SetStateAction<string[]>>;

const API_NINJAS_API_KEY = (import.meta.env.VITE_API_NINJAS_API_KEY as string | undefined)?.trim();
const API_NINJAS_CITY_ENDPOINT = 'https://api.api-ninjas.com/v1/city';

type UseCitySuggestionsParams = {
  seedCities: string[];
};

export const useCitySuggestions = ({ seedCities }: UseCitySuggestionsParams) => {
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [startSuggestions, setStartSuggestions] = useState<string[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<string[]>([]);
  const [isCityApiReady, setIsCityApiReady] = useState(Boolean(API_NINJAS_API_KEY));
  const lastQueryRef = useRef<{ start: string; end: string }>({ start: '', end: '' });

  const hasCityApiKey = Boolean(API_NINJAS_API_KEY);

  const fallbackCitySuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          seedCities
            .map((city) => transliterateLocation(city.trim()))
            .filter(Boolean)
        )
      ),
    [seedCities]
  );

  const fetchCitySuggestions = useCallback(
    async (input: string, signal: AbortSignal) => {
      if (!API_NINJAS_API_KEY) return [];

      const endpoint = `${API_NINJAS_CITY_ENDPOINT}?name=${encodeURIComponent(input)}`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'X-Api-Key': API_NINJAS_API_KEY,
        },
        signal,
      });

      if (!response.ok) {
        throw new Error(`City API request failed (${response.status})`);
      }

      const payload = (await response.json()) as Array<{ name?: string; country?: string }>;
      const normalized = payload
        .map((item) => {
          const city = transliterateLocation((item.name || '').trim());
          const country = (item.country || '').trim().toUpperCase();
          if (!city) return '';
          return country ? `${city}, ${country}` : city;
        })
        .filter(Boolean);

      return Array.from(new Set(normalized)).slice(0, 8);
    },
    []
  );

  const queryCitySuggestions = useCallback(
    async (input: string, setSuggestions: SuggestionSetter, signal: AbortSignal) => {
      const trimmedInput = input.trim();

      if (!trimmedInput) {
        setSuggestions([]);
        return;
      }

      const normalizedInput = transliterateLocation(trimmedInput).toLowerCase();
      const localMatches = fallbackCitySuggestions
        .filter((city) => city.toLowerCase().includes(normalizedInput))
        .slice(0, 8);

      if (!API_NINJAS_API_KEY) {
        setSuggestions(localMatches);
        return;
      }

      try {
        const remoteMatches = await fetchCitySuggestions(trimmedInput, signal);
        setIsCityApiReady(true);
        const mergedMatches = Array.from(new Set([...remoteMatches, ...localMatches])).slice(0, 8);
        setSuggestions(mergedMatches);
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        setIsCityApiReady(false);
        setSuggestions(localMatches);
      }
    },
    [fallbackCitySuggestions, fetchCitySuggestions]
  );

  useEffect(() => {
    if (lastQueryRef.current.start === startLocation) return;
    lastQueryRef.current.start = startLocation;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      queryCitySuggestions(startLocation, setStartSuggestions, controller.signal);
    }, 260);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [startLocation, queryCitySuggestions]);

  useEffect(() => {
    if (lastQueryRef.current.end === endLocation) return;
    lastQueryRef.current.end = endLocation;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      queryCitySuggestions(endLocation, setEndSuggestions, controller.signal);
    }, 260);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [endLocation, queryCitySuggestions]);

  const clearLocations = () => {
    setStartLocation('');
    setEndLocation('');
    setStartSuggestions([]);
    setEndSuggestions([]);
  };

  return {
    startLocation,
    setStartLocation,
    endLocation,
    setEndLocation,
    startSuggestions,
    endSuggestions,
    isCityApiReady,
    hasCityApiKey,
    clearLocations,
  };
};
