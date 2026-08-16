import { transliterateLocation } from '../lib/transliterateLocation';

export type LocationSearchResult = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  city: string;
  countryCode: string;
};

type NominatimResult = {
  place_id?: number | string;
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    country_code?: string;
  };
};

const normalizeResult = (result: NominatimResult): LocationSearchResult | null => {
  const latitude = Number(result.lat);
  const longitude = Number(result.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  const address = result.address || {};
  return {
    id: String(result.place_id || `${latitude}-${longitude}`),
    label: transliterateLocation(String(result.display_name || `${latitude}, ${longitude}`)),
    latitude,
    longitude,
    city: transliterateLocation(String(address.city || address.town || address.village || address.municipality || address.county || '')),
    countryCode: String(address.country_code || '').toUpperCase(),
  };
};

export const searchLocations = async (query: string, signal?: AbortSignal): Promise<LocationSearchResult[]> => {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&accept-language=bs-Latn,hr,sr-Latn,en&q=${encodeURIComponent(trimmed)}`,
    { signal, headers: { Accept: 'application/json' } },
  );
  if (!response.ok) throw new Error(`Location search failed (${response.status})`);
  const payload = await response.json() as NominatimResult[];
  return payload.map(normalizeResult).filter((result): result is LocationSearchResult => Boolean(result));
};

export const reverseLocation = async (latitude: number, longitude: number, signal?: AbortSignal): Promise<LocationSearchResult> => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=bs-Latn,hr,sr-Latn,en&lat=${latitude}&lon=${longitude}`,
    { signal, headers: { Accept: 'application/json' } },
  );
  if (!response.ok) throw new Error(`Reverse location search failed (${response.status})`);
  const normalized = normalizeResult(await response.json() as NominatimResult);
  if (!normalized) throw new Error('The selected location could not be resolved.');
  return normalized;
};
