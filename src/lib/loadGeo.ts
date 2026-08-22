const CITY_COORDINATES: Record<string, [number, number]> = {
  'Vienna, AT': [48.2082, 16.3738],
  'Prague, CZ': [50.0755, 14.4378],
  'Zagreb, HR': [45.815, 15.9819],
  'Berlin, DE': [52.52, 13.405],
  'Sarajevo, BA': [43.8563, 18.4131],
  'Banja Luka, BA': [44.7722, 17.191],
  'Shanghai, CN': [31.2304, 121.4737],
  'Odesa, UA': [46.4825, 30.7233],
  'Ningbo, CN': [29.8683, 121.544],
  'Hamburg, DE': [53.5511, 9.9937],
  'Shenzhen, CN': [22.5431, 114.0579],
  'Rotterdam, NL': [51.9244, 4.4777],
  'Qingdao, CN': [36.0671, 120.3826],
  'Gdansk, PL': [54.352, 18.6466],
};

export const getPlaceCoord = (place: string): [number, number] => {
  if (CITY_COORDINATES[place]) return CITY_COORDINATES[place];
  const city = place.split(',')[0]?.trim() || '';
  const match = Object.entries(CITY_COORDINATES).find(([label]) => label.startsWith(city));
  return match ? match[1] : [48.1351, 11.582];
};

export const parseLoadPriceValue = (price: string) => {
  const digits = price.replace(/[^0-9]/g, '');
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const parseLoadWeightValue = (weight: string) => {
  const digits = weight.replace(/[^0-9]/g, '');
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const parseLoadDateValue = (date: string) => {
  const parsed = Date.parse(date);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const estimateLoadDistanceKm = (pickup: string, delivery: string) => {
  const [lat1, lon1] = getPlaceCoord(pickup);
  const [lat2, lon2] = getPlaceCoord(delivery);
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
};

export const estimateLoadTransitDays = (pickup: string, delivery: string) =>
  Math.max(1, Math.ceil(estimateLoadDistanceKm(pickup, delivery) / 700));

export const estimateLoadDistanceMiles = (pickup: string, delivery: string) =>
  Math.round(estimateLoadDistanceKm(pickup, delivery) * 0.621371);

export const getCountryCode = (location: string) => {
  const countryCode = location.split(',').at(-1)?.trim().toUpperCase() || '';
  return /^[A-Z]{2}$/.test(countryCode) ? countryCode : '';
};

export const countryFlagUrl = (countryCode: string) => `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
