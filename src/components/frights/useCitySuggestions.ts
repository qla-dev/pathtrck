import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';

type SuggestionSetter = Dispatch<SetStateAction<string[]>>;

const GOOGLE_PLACES_SCRIPT_ID = 'google-places-script';
const GOOGLE_PLACES_API_KEY = (import.meta.env.VITE_GOOGLE_PLACES_API_KEY as string | undefined)?.trim();
const googleWindow = () => window as Window & { google?: any };

type UseCitySuggestionsParams = {
  seedCities: string[];
};

export const useCitySuggestions = ({ seedCities }: UseCitySuggestionsParams) => {
  const [startLocation, setStartLocation] = useState('');
  const [endLocation, setEndLocation] = useState('');
  const [startSuggestions, setStartSuggestions] = useState<string[]>([]);
  const [endSuggestions, setEndSuggestions] = useState<string[]>([]);
  const [isGooglePlacesReady, setIsGooglePlacesReady] = useState(false);
  const autocompleteServiceRef = useRef<any>(null);

  const hasGooglePlacesKey = Boolean(GOOGLE_PLACES_API_KEY);

  useEffect(() => {
    if (!GOOGLE_PLACES_API_KEY) return;

    const bindGooglePlaces = () => {
      const placesApi = googleWindow().google?.maps?.places;
      if (!placesApi) return;
      autocompleteServiceRef.current = new placesApi.AutocompleteService();
      setIsGooglePlacesReady(true);
    };

    if (googleWindow().google?.maps?.places) {
      bindGooglePlaces();
      return;
    }

    let script = document.getElementById(GOOGLE_PLACES_SCRIPT_ID) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = GOOGLE_PLACES_SCRIPT_ID;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_PLACES_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    script.addEventListener('load', bindGooglePlaces);

    return () => {
      script?.removeEventListener('load', bindGooglePlaces);
    };
  }, []);

  const fallbackCitySuggestions = useMemo(
    () =>
      Array.from(
        new Set(
          seedCities
            .map((city) => city.trim())
            .filter(Boolean)
        )
      ),
    [seedCities]
  );

  const queryCitySuggestions = useCallback(
    (input: string, setSuggestions: SuggestionSetter) => {
      const trimmedInput = input.trim();

      if (!trimmedInput) {
        setSuggestions([]);
        return;
      }

      if (autocompleteServiceRef.current) {
        autocompleteServiceRef.current.getPlacePredictions(
          { input: trimmedInput, types: ['(cities)'] },
          (predictions: Array<{ description?: string }> | null) => {
            const cityPredictions =
              predictions
                ?.map((prediction) => prediction.description || '')
                .filter(Boolean)
                .slice(0, 8) || [];
            setSuggestions(cityPredictions);
          }
        );
        return;
      }

      const normalizedInput = trimmedInput.toLowerCase();
      const localMatches = fallbackCitySuggestions
        .filter((city) => city.toLowerCase().includes(normalizedInput))
        .slice(0, 8);
      setSuggestions(localMatches);
    },
    [fallbackCitySuggestions]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      queryCitySuggestions(startLocation, setStartSuggestions);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [startLocation, queryCitySuggestions, isGooglePlacesReady]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      queryCitySuggestions(endLocation, setEndSuggestions);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [endLocation, queryCitySuggestions, isGooglePlacesReady]);

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
    isGooglePlacesReady,
    hasGooglePlacesKey,
    clearLocations,
  };
};
