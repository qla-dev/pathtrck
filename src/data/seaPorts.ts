// Major commercial cargo seaports (POL/POD candidates) for the Sea transport type's Origin /
// Destination port pickers. UN/LOCODEs follow the standard 5-letter UN/LOCODE format
// (2-letter country code + 3-letter location code). Coordinates are approximate (port/harbour
// area, a few km precision) - good enough for a map pin and a great-circle ETA estimate, not
// survey-grade.
export type SeaPort = {
  port: string;
  city: string;
  country: string;
  countryCode: string;
  unlocode: string;
  latitude: number;
  longitude: number;
};

export const SEA_PORTS: SeaPort[] = [
  { port: 'Shanghai', city: 'Shanghai', country: 'China', countryCode: 'CN', unlocode: 'CNSHA', latitude: 31.2304, longitude: 121.4737 },
  { port: 'Ningbo-Zhoushan', city: 'Ningbo', country: 'China', countryCode: 'CN', unlocode: 'CNNGB', latitude: 29.8683, longitude: 121.5440 },
  { port: 'Shenzhen', city: 'Shenzhen', country: 'China', countryCode: 'CN', unlocode: 'CNSZX', latitude: 22.5431, longitude: 114.0579 },
  { port: 'Qingdao', city: 'Qingdao', country: 'China', countryCode: 'CN', unlocode: 'CNTAO', latitude: 36.0671, longitude: 120.3826 },
  { port: 'Xiamen', city: 'Xiamen', country: 'China', countryCode: 'CN', unlocode: 'CNXMN', latitude: 24.4798, longitude: 118.0894 },
  { port: 'Guangzhou / Nansha', city: 'Guangzhou', country: 'China', countryCode: 'CN', unlocode: 'CNGUA', latitude: 22.7539, longitude: 113.5257 },
  { port: 'Yantian', city: 'Shenzhen', country: 'China', countryCode: 'CN', unlocode: 'CNYTN', latitude: 22.5875, longitude: 114.2664 },
  { port: 'Tianjin', city: 'Tianjin', country: 'China', countryCode: 'CN', unlocode: 'CNTXG', latitude: 39.0021, longitude: 117.7159 },
  { port: 'Hong Kong', city: 'Hong Kong', country: 'Hong Kong', countryCode: 'HK', unlocode: 'HKHKG', latitude: 22.3193, longitude: 114.1694 },
  { port: 'Singapore', city: 'Singapore', country: 'Singapore', countryCode: 'SG', unlocode: 'SGSIN', latitude: 1.2650, longitude: 103.8200 },
  { port: 'Port Klang', city: 'Port Klang', country: 'Malaysia', countryCode: 'MY', unlocode: 'MYPKG', latitude: 3.0000, longitude: 101.4000 },
  { port: 'Tanjung Pelepas', city: 'Johor', country: 'Malaysia', countryCode: 'MY', unlocode: 'MYTPP', latitude: 1.3626, longitude: 103.5500 },
  { port: 'Busan', city: 'Busan', country: 'South Korea', countryCode: 'KR', unlocode: 'KRPUS', latitude: 35.1796, longitude: 129.0756 },
  { port: 'Tokyo', city: 'Tokyo', country: 'Japan', countryCode: 'JP', unlocode: 'JPTYO', latitude: 35.6528, longitude: 139.8395 },
  { port: 'Yokohama', city: 'Yokohama', country: 'Japan', countryCode: 'JP', unlocode: 'JPYOK', latitude: 35.4437, longitude: 139.6380 },
  { port: 'Rotterdam', city: 'Rotterdam', country: 'Netherlands', countryCode: 'NL', unlocode: 'NLRTM', latitude: 51.9496, longitude: 4.1453 },
  { port: 'Antwerp-Bruges', city: 'Antwerp', country: 'Belgium', countryCode: 'BE', unlocode: 'BEANR', latitude: 51.2993, longitude: 4.2926 },
  { port: 'Hamburg', city: 'Hamburg', country: 'Germany', countryCode: 'DE', unlocode: 'DEHAM', latitude: 53.5459, longitude: 9.9662 },
  { port: 'Bremerhaven', city: 'Bremerhaven', country: 'Germany', countryCode: 'DE', unlocode: 'DEBRV', latitude: 53.5396, longitude: 8.5809 },
  { port: 'Gdansk', city: 'Gdansk', country: 'Poland', countryCode: 'PL', unlocode: 'PLGDN', latitude: 54.3520, longitude: 18.6466 },
  { port: 'Felixstowe', city: 'Felixstowe', country: 'United Kingdom', countryCode: 'GB', unlocode: 'GBFXT', latitude: 51.9540, longitude: 1.3510 },
  { port: 'Southampton', city: 'Southampton', country: 'United Kingdom', countryCode: 'GB', unlocode: 'GBSOU', latitude: 50.8973, longitude: -1.4043 },
  { port: 'Le Havre', city: 'Le Havre', country: 'France', countryCode: 'FR', unlocode: 'FRLEH', latitude: 49.4938, longitude: 0.1077 },
  { port: 'Genoa', city: 'Genoa', country: 'Italy', countryCode: 'IT', unlocode: 'ITGOA', latitude: 44.4056, longitude: 8.9463 },
  { port: 'La Spezia', city: 'La Spezia', country: 'Italy', countryCode: 'IT', unlocode: 'ITLSP', latitude: 44.1024, longitude: 9.8241 },
  { port: 'Trieste', city: 'Trieste', country: 'Italy', countryCode: 'IT', unlocode: 'ITTRS', latitude: 45.6495, longitude: 13.7768 },
  { port: 'Venice', city: 'Venice', country: 'Italy', countryCode: 'IT', unlocode: 'ITVCE', latitude: 45.4408, longitude: 12.3155 },
  { port: 'Koper', city: 'Koper', country: 'Slovenia', countryCode: 'SI', unlocode: 'SIKOP', latitude: 45.5469, longitude: 13.7294 },
  { port: 'Rijeka', city: 'Rijeka', country: 'Croatia', countryCode: 'HR', unlocode: 'HRRJK', latitude: 45.3271, longitude: 14.4422 },
  { port: 'Ploče', city: 'Ploče', country: 'Croatia', countryCode: 'HR', unlocode: 'HRPLE', latitude: 43.0561, longitude: 17.4342 },
  { port: 'Barcelona', city: 'Barcelona', country: 'Spain', countryCode: 'ES', unlocode: 'ESBCN', latitude: 41.3474, longitude: 2.1610 },
  { port: 'Valencia', city: 'Valencia', country: 'Spain', countryCode: 'ES', unlocode: 'ESVLC', latitude: 39.4460, longitude: -0.3200 },
  { port: 'Piraeus', city: 'Piraeus', country: 'Greece', countryCode: 'GR', unlocode: 'GRPIR', latitude: 37.9475, longitude: 23.6367 },
  { port: 'Thessaloniki', city: 'Thessaloniki', country: 'Greece', countryCode: 'GR', unlocode: 'GRSKG', latitude: 40.6260, longitude: 22.9450 },
  { port: 'Istanbul', city: 'Istanbul', country: 'Türkiye', countryCode: 'TR', unlocode: 'TRIST', latitude: 41.0082, longitude: 28.9784 },
  { port: 'Ambarli', city: 'Istanbul', country: 'Türkiye', countryCode: 'TR', unlocode: 'TRAMB', latitude: 40.9700, longitude: 28.6800 },
  { port: 'Mersin', city: 'Mersin', country: 'Türkiye', countryCode: 'TR', unlocode: 'TRMER', latitude: 36.8000, longitude: 34.6300 },
  { port: 'Port Said', city: 'Port Said', country: 'Egypt', countryCode: 'EG', unlocode: 'EGPSD', latitude: 31.2653, longitude: 32.3019 },
  { port: 'Alexandria', city: 'Alexandria', country: 'Egypt', countryCode: 'EG', unlocode: 'EGALY', latitude: 31.2001, longitude: 29.9187 },
  { port: 'Jebel Ali', city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', unlocode: 'AEJEA', latitude: 25.0118, longitude: 55.0617 },
  { port: 'Nhava Sheva / JNPT', city: 'Mumbai', country: 'India', countryCode: 'IN', unlocode: 'INNSA', latitude: 18.9490, longitude: 72.9525 },
  { port: 'Mundra', city: 'Mundra', country: 'India', countryCode: 'IN', unlocode: 'INMUN', latitude: 22.7395, longitude: 69.7018 },
  { port: 'Colombo', city: 'Colombo', country: 'Sri Lanka', countryCode: 'LK', unlocode: 'LKCMB', latitude: 6.9497, longitude: 79.8420 },
  { port: 'Durban', city: 'Durban', country: 'South Africa', countryCode: 'ZA', unlocode: 'ZADUR', latitude: -29.8587, longitude: 31.0218 },
  { port: 'Mombasa', city: 'Mombasa', country: 'Kenya', countryCode: 'KE', unlocode: 'KEMBA', latitude: -4.0435, longitude: 39.6682 },
  { port: 'Santos', city: 'Santos', country: 'Brazil', countryCode: 'BR', unlocode: 'BRSSZ', latitude: -23.9608, longitude: -46.3336 },
  { port: 'New York', city: 'New York', country: 'United States', countryCode: 'US', unlocode: 'USNYC', latitude: 40.6700, longitude: -74.0400 },
  { port: 'Los Angeles', city: 'Los Angeles', country: 'United States', countryCode: 'US', unlocode: 'USLAX', latitude: 33.7395, longitude: -118.2610 },
  { port: 'Long Beach', city: 'Long Beach', country: 'United States', countryCode: 'US', unlocode: 'USLGB', latitude: 33.7550, longitude: -118.2160 },
  { port: 'Savannah', city: 'Savannah', country: 'United States', countryCode: 'US', unlocode: 'USSAV', latitude: 32.1213, longitude: -81.1420 },
  { port: 'Houston', city: 'Houston', country: 'United States', countryCode: 'US', unlocode: 'USHOU', latitude: 29.7280, longitude: -95.0110 },
  { port: 'Vancouver', city: 'Vancouver', country: 'Canada', countryCode: 'CA', unlocode: 'CAVAN', latitude: 49.2900, longitude: -123.1100 },
  { port: 'Montreal', city: 'Montreal', country: 'Canada', countryCode: 'CA', unlocode: 'CAMTR', latitude: 45.5500, longitude: -73.5300 },
  { port: 'Sydney', city: 'Sydney', country: 'Australia', countryCode: 'AU', unlocode: 'AUSYD', latitude: -33.8600, longitude: 151.2100 },
  { port: 'Melbourne', city: 'Melbourne', country: 'Australia', countryCode: 'AU', unlocode: 'AUMEL', latitude: -37.8300, longitude: 144.9200 },
  // Balkan / Adriatic-Black Sea region - added for regional maritime transit relevance alongside
  // Koper/Rijeka/Ploče/Trieste/Venice above.
  { port: 'Bar', city: 'Bar', country: 'Montenegro', countryCode: 'ME', unlocode: 'MEBAR', latitude: 42.0930, longitude: 19.0870 },
  { port: 'Durrës', city: 'Durrës', country: 'Albania', countryCode: 'AL', unlocode: 'ALDUR', latitude: 41.3120, longitude: 19.4560 },
  { port: 'Constanța', city: 'Constanța', country: 'Romania', countryCode: 'RO', unlocode: 'ROCND', latitude: 44.1730, longitude: 28.6520 },
  { port: 'Varna', city: 'Varna', country: 'Bulgaria', countryCode: 'BG', unlocode: 'BGVAR', latitude: 43.2100, longitude: 27.9100 },
  { port: 'Burgas', city: 'Burgas', country: 'Bulgaria', countryCode: 'BG', unlocode: 'BGBOJ', latitude: 42.4800, longitude: 27.4700 },
];
