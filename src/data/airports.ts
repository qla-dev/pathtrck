// Air freight's AOL/AOD equivalent of seaPorts.ts - a curated set of airports covering the
// corridors relevant to a BiH-based freight forwarder (BiH/Balkans, EU cargo hubs, Middle East
// transit points, and the major Asia-Pacific/Americas origins/destinations). Not the full ~4,000
// IATA-code list - just the ones a BLS-style operation actually books against.
export type Airport = {
  name: string;
  iata: string;
  city: string;
  country: string;
  countryCode: string;
  region: string;
  // 1 = Major Cargo Hub, 2 = Regional Cargo Gateway, 3 = Commercial Airport - ranked by cargo
  // throughput, not passenger traffic (a busy passenger airport with little freight stays Tier 3).
  cargoTier: 1 | 2 | 3;
  // Shortlisted for the BiH -> EU -> China -> Middle East corridors this system is built around.
  quickPick?: boolean;
  badge?: string;
};

export const AIRPORTS: Airport[] = [
  // Bosnia & Herzegovina
  { name: 'Sarajevo International Airport', iata: 'SJJ', city: 'Sarajevo', country: 'Bosnia and Herzegovina', countryCode: 'BA', region: 'Bosnia and Herzegovina', cargoTier: 3, quickPick: true, badge: 'Primary Bosnia Air Gateway' },
  { name: 'Banja Luka International Airport', iata: 'BNX', city: 'Banja Luka', country: 'Bosnia and Herzegovina', countryCode: 'BA', region: 'Bosnia and Herzegovina', cargoTier: 3 },
  { name: 'Tuzla International Airport', iata: 'TZL', city: 'Tuzla', country: 'Bosnia and Herzegovina', countryCode: 'BA', region: 'Bosnia and Herzegovina', cargoTier: 3 },
  { name: 'Mostar International Airport', iata: 'OMO', city: 'Mostar', country: 'Bosnia and Herzegovina', countryCode: 'BA', region: 'Bosnia and Herzegovina', cargoTier: 3 },

  // Balkans / Adriatic
  { name: 'Zagreb Franjo Tuđman Airport', iata: 'ZAG', city: 'Zagreb', country: 'Croatia', countryCode: 'HR', region: 'Balkans', cargoTier: 2 },
  { name: 'Belgrade Nikola Tesla Airport', iata: 'BEG', city: 'Belgrade', country: 'Serbia', countryCode: 'RS', region: 'Balkans', cargoTier: 2 },
  { name: 'Ljubljana Jože Pučnik Airport', iata: 'LJU', city: 'Ljubljana', country: 'Slovenia', countryCode: 'SI', region: 'Balkans', cargoTier: 2 },
  { name: 'Tirana International Airport', iata: 'TIA', city: 'Tirana', country: 'Albania', countryCode: 'AL', region: 'Balkans', cargoTier: 3 },
  { name: 'Podgorica Airport', iata: 'TGD', city: 'Podgorica', country: 'Montenegro', countryCode: 'ME', region: 'Balkans', cargoTier: 3 },
  { name: 'Skopje International Airport', iata: 'SKP', city: 'Skopje', country: 'North Macedonia', countryCode: 'MK', region: 'Balkans', cargoTier: 3 },
  { name: 'Pristina International Airport', iata: 'PRN', city: 'Pristina', country: 'Kosovo', countryCode: 'XK', region: 'Balkans', cargoTier: 3 },

  // Southeast Europe (Bulgaria, Romania, Greece, Turkey)
  { name: 'Sofia Airport', iata: 'SOF', city: 'Sofia', country: 'Bulgaria', countryCode: 'BG', region: 'Southeast Europe', cargoTier: 3 },
  { name: 'Burgas Airport', iata: 'BOJ', city: 'Burgas', country: 'Bulgaria', countryCode: 'BG', region: 'Southeast Europe', cargoTier: 3 },
  { name: 'Varna Airport', iata: 'VAR', city: 'Varna', country: 'Bulgaria', countryCode: 'BG', region: 'Southeast Europe', cargoTier: 3 },
  { name: 'Bucharest Otopeni Airport', iata: 'OTP', city: 'Bucharest', country: 'Romania', countryCode: 'RO', region: 'Southeast Europe', cargoTier: 3 },
  { name: 'Bucharest Băneasa Airport', iata: 'BBU', city: 'Bucharest', country: 'Romania', countryCode: 'RO', region: 'Southeast Europe', cargoTier: 3 },
  { name: 'Cluj-Napoca International Airport', iata: 'CLJ', city: 'Cluj-Napoca', country: 'Romania', countryCode: 'RO', region: 'Southeast Europe', cargoTier: 3 },
  { name: 'Timișoara Traian Vuia Airport', iata: 'TSR', city: 'Timișoara', country: 'Romania', countryCode: 'RO', region: 'Southeast Europe', cargoTier: 3 },
  { name: 'Athens International Airport', iata: 'ATH', city: 'Athens', country: 'Greece', countryCode: 'GR', region: 'Southeast Europe', cargoTier: 3 },
  { name: 'Thessaloniki Airport', iata: 'SKG', city: 'Thessaloniki', country: 'Greece', countryCode: 'GR', region: 'Southeast Europe', cargoTier: 3 },
  { name: 'Istanbul Airport', iata: 'IST', city: 'Istanbul', country: 'Türkiye', countryCode: 'TR', region: 'Southeast Europe', cargoTier: 1, quickPick: true, badge: 'Major Cargo Hub' },
  { name: 'Istanbul Sabiha Gökçen Airport', iata: 'SAW', city: 'Istanbul', country: 'Türkiye', countryCode: 'TR', region: 'Southeast Europe', cargoTier: 3 },
  { name: 'Ankara Esenboğa Airport', iata: 'ESB', city: 'Ankara', country: 'Türkiye', countryCode: 'TR', region: 'Southeast Europe', cargoTier: 3 },
  { name: 'Izmir Adnan Menderes Airport', iata: 'ADB', city: 'Izmir', country: 'Türkiye', countryCode: 'TR', region: 'Southeast Europe', cargoTier: 3 },

  // Central Europe (Austria, Hungary, Czechia, Slovakia, Poland, Switzerland)
  { name: 'Vienna International Airport', iata: 'VIE', city: 'Vienna', country: 'Austria', countryCode: 'AT', region: 'Central Europe', cargoTier: 2, quickPick: true, badge: 'Major Regional Gateway' },
  { name: 'Graz Airport', iata: 'GRZ', city: 'Graz', country: 'Austria', countryCode: 'AT', region: 'Central Europe', cargoTier: 3 },
  { name: 'Linz Airport', iata: 'LNZ', city: 'Linz', country: 'Austria', countryCode: 'AT', region: 'Central Europe', cargoTier: 3 },
  { name: 'Salzburg Airport', iata: 'SZG', city: 'Salzburg', country: 'Austria', countryCode: 'AT', region: 'Central Europe', cargoTier: 3 },
  { name: 'Budapest Ferenc Liszt International Airport', iata: 'BUD', city: 'Budapest', country: 'Hungary', countryCode: 'HU', region: 'Central Europe', cargoTier: 2, quickPick: true, badge: 'Major Central European Gateway' },
  { name: 'Prague Václav Havel Airport', iata: 'PRG', city: 'Prague', country: 'Czechia', countryCode: 'CZ', region: 'Central Europe', cargoTier: 2 },
  { name: 'Brno-Tuřany Airport', iata: 'BRQ', city: 'Brno', country: 'Czechia', countryCode: 'CZ', region: 'Central Europe', cargoTier: 3 },
  { name: 'Bratislava Airport', iata: 'BTS', city: 'Bratislava', country: 'Slovakia', countryCode: 'SK', region: 'Central Europe', cargoTier: 3 },
  { name: 'Košice International Airport', iata: 'KSC', city: 'Košice', country: 'Slovakia', countryCode: 'SK', region: 'Central Europe', cargoTier: 3 },
  { name: 'Warsaw Chopin Airport', iata: 'WAW', city: 'Warsaw', country: 'Poland', countryCode: 'PL', region: 'Central Europe', cargoTier: 2 },
  { name: 'Warsaw Modlin Airport', iata: 'WMI', city: 'Warsaw', country: 'Poland', countryCode: 'PL', region: 'Central Europe', cargoTier: 3 },
  { name: 'Katowice Airport', iata: 'KTW', city: 'Katowice', country: 'Poland', countryCode: 'PL', region: 'Central Europe', cargoTier: 3 },
  { name: 'Kraków John Paul II Airport', iata: 'KRK', city: 'Kraków', country: 'Poland', countryCode: 'PL', region: 'Central Europe', cargoTier: 3 },
  { name: 'Poznań-Ławica Airport', iata: 'POZ', city: 'Poznań', country: 'Poland', countryCode: 'PL', region: 'Central Europe', cargoTier: 3 },
  { name: 'Wrocław Airport', iata: 'WRO', city: 'Wrocław', country: 'Poland', countryCode: 'PL', region: 'Central Europe', cargoTier: 3 },
  { name: 'Gdańsk Lech Wałęsa Airport', iata: 'GDN', city: 'Gdańsk', country: 'Poland', countryCode: 'PL', region: 'Central Europe', cargoTier: 3 },
  { name: 'Zurich Airport', iata: 'ZRH', city: 'Zurich', country: 'Switzerland', countryCode: 'CH', region: 'Central Europe', cargoTier: 3 },
  { name: 'Basel EuroAirport', iata: 'BSL', city: 'Basel', country: 'Switzerland', countryCode: 'CH', region: 'Central Europe', cargoTier: 3 },
  { name: 'Geneva Airport', iata: 'GVA', city: 'Geneva', country: 'Switzerland', countryCode: 'CH', region: 'Central Europe', cargoTier: 3 },

  // Western Europe core cargo (Germany, Netherlands, Belgium, Luxembourg, France, UK)
  { name: 'Frankfurt Airport', iata: 'FRA', city: 'Frankfurt', country: 'Germany', countryCode: 'DE', region: 'Western Europe', cargoTier: 1, quickPick: true, badge: 'Major Cargo Hub' },
  { name: 'Leipzig/Halle Airport', iata: 'LEJ', city: 'Leipzig', country: 'Germany', countryCode: 'DE', region: 'Western Europe', cargoTier: 2, quickPick: true },
  { name: 'Cologne Bonn Airport', iata: 'CGN', city: 'Cologne', country: 'Germany', countryCode: 'DE', region: 'Western Europe', cargoTier: 2 },
  { name: 'Munich Airport', iata: 'MUC', city: 'Munich', country: 'Germany', countryCode: 'DE', region: 'Western Europe', cargoTier: 3 },
  { name: 'Frankfurt-Hahn Airport', iata: 'HHN', city: 'Hahn', country: 'Germany', countryCode: 'DE', region: 'Western Europe', cargoTier: 3 },
  { name: 'Berlin Brandenburg Airport', iata: 'BER', city: 'Berlin', country: 'Germany', countryCode: 'DE', region: 'Western Europe', cargoTier: 3 },
  { name: 'Düsseldorf Airport', iata: 'DUS', city: 'Düsseldorf', country: 'Germany', countryCode: 'DE', region: 'Western Europe', cargoTier: 3 },
  { name: 'Hamburg Airport', iata: 'HAM', city: 'Hamburg', country: 'Germany', countryCode: 'DE', region: 'Western Europe', cargoTier: 3 },
  { name: 'Stuttgart Airport', iata: 'STR', city: 'Stuttgart', country: 'Germany', countryCode: 'DE', region: 'Western Europe', cargoTier: 3 },
  { name: 'Hannover Airport', iata: 'HAJ', city: 'Hannover', country: 'Germany', countryCode: 'DE', region: 'Western Europe', cargoTier: 3 },
  { name: 'Nuremberg Airport', iata: 'NUE', city: 'Nuremberg', country: 'Germany', countryCode: 'DE', region: 'Western Europe', cargoTier: 3 },
  { name: 'Amsterdam Schiphol Airport', iata: 'AMS', city: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', region: 'Western Europe', cargoTier: 1, quickPick: true, badge: 'Major Cargo Hub' },
  { name: 'Maastricht Aachen Airport', iata: 'MST', city: 'Maastricht', country: 'Netherlands', countryCode: 'NL', region: 'Western Europe', cargoTier: 3 },
  { name: 'Liège Airport', iata: 'LGG', city: 'Liège', country: 'Belgium', countryCode: 'BE', region: 'Western Europe', cargoTier: 1, quickPick: true, badge: 'Major Cargo Hub' },
  { name: 'Brussels Airport', iata: 'BRU', city: 'Brussels', country: 'Belgium', countryCode: 'BE', region: 'Western Europe', cargoTier: 2 },
  { name: 'Luxembourg Airport', iata: 'LUX', city: 'Luxembourg', country: 'Luxembourg', countryCode: 'LU', region: 'Western Europe', cargoTier: 2 },
  { name: 'Paris Charles de Gaulle Airport', iata: 'CDG', city: 'Paris', country: 'France', countryCode: 'FR', region: 'Western Europe', cargoTier: 1, quickPick: true, badge: 'Major Cargo Hub' },
  { name: 'Paris Orly Airport', iata: 'ORY', city: 'Paris', country: 'France', countryCode: 'FR', region: 'Western Europe', cargoTier: 3 },
  { name: 'Lyon-Saint Exupéry Airport', iata: 'LYS', city: 'Lyon', country: 'France', countryCode: 'FR', region: 'Western Europe', cargoTier: 3 },
  { name: 'Marseille Provence Airport', iata: 'MRS', city: 'Marseille', country: 'France', countryCode: 'FR', region: 'Western Europe', cargoTier: 3 },
  { name: 'Toulouse-Blagnac Airport', iata: 'TLS', city: 'Toulouse', country: 'France', countryCode: 'FR', region: 'Western Europe', cargoTier: 3 },
  { name: 'Strasbourg Airport', iata: 'SXB', city: 'Strasbourg', country: 'France', countryCode: 'FR', region: 'Western Europe', cargoTier: 3 },
  { name: 'Lille Airport', iata: 'LIL', city: 'Lille', country: 'France', countryCode: 'FR', region: 'Western Europe', cargoTier: 3 },
  { name: 'London Heathrow Airport', iata: 'LHR', city: 'London', country: 'United Kingdom', countryCode: 'GB', region: 'Western Europe', cargoTier: 1 },
  { name: 'London Stansted Airport', iata: 'STN', city: 'London', country: 'United Kingdom', countryCode: 'GB', region: 'Western Europe', cargoTier: 3 },
  { name: 'East Midlands Airport', iata: 'EMA', city: 'East Midlands', country: 'United Kingdom', countryCode: 'GB', region: 'Western Europe', cargoTier: 3 },
  { name: 'London Gatwick Airport', iata: 'LGW', city: 'London', country: 'United Kingdom', countryCode: 'GB', region: 'Western Europe', cargoTier: 3 },
  { name: 'Manchester Airport', iata: 'MAN', city: 'Manchester', country: 'United Kingdom', countryCode: 'GB', region: 'Western Europe', cargoTier: 3 },

  // Southern Europe (Italy, Spain, Portugal)
  { name: 'Milan Malpensa Airport', iata: 'MXP', city: 'Milan', country: 'Italy', countryCode: 'IT', region: 'Southern Europe', cargoTier: 2, quickPick: true, badge: 'Major Italian Cargo Gateway' },
  { name: 'Milan Linate Airport', iata: 'LIN', city: 'Milan', country: 'Italy', countryCode: 'IT', region: 'Southern Europe', cargoTier: 3 },
  { name: 'Bergamo Orio al Serio Airport', iata: 'BGY', city: 'Bergamo', country: 'Italy', countryCode: 'IT', region: 'Southern Europe', cargoTier: 3 },
  { name: 'Rome Fiumicino Airport', iata: 'FCO', city: 'Rome', country: 'Italy', countryCode: 'IT', region: 'Southern Europe', cargoTier: 3 },
  { name: 'Bologna Guglielmo Marconi Airport', iata: 'BLQ', city: 'Bologna', country: 'Italy', countryCode: 'IT', region: 'Southern Europe', cargoTier: 3 },
  { name: 'Venice Marco Polo Airport', iata: 'VCE', city: 'Venice', country: 'Italy', countryCode: 'IT', region: 'Southern Europe', cargoTier: 3 },
  { name: 'Verona Villafranca Airport', iata: 'VRN', city: 'Verona', country: 'Italy', countryCode: 'IT', region: 'Southern Europe', cargoTier: 3 },
  { name: 'Turin Airport', iata: 'TRN', city: 'Turin', country: 'Italy', countryCode: 'IT', region: 'Southern Europe', cargoTier: 3 },
  { name: 'Pisa International Airport', iata: 'PSA', city: 'Pisa', country: 'Italy', countryCode: 'IT', region: 'Southern Europe', cargoTier: 3 },
  { name: 'Trieste Airport', iata: 'TRS', city: 'Trieste', country: 'Italy', countryCode: 'IT', region: 'Southern Europe', cargoTier: 3 },
  { name: 'Naples International Airport', iata: 'NAP', city: 'Naples', country: 'Italy', countryCode: 'IT', region: 'Southern Europe', cargoTier: 3 },
  { name: 'Madrid Barajas Airport', iata: 'MAD', city: 'Madrid', country: 'Spain', countryCode: 'ES', region: 'Southern Europe', cargoTier: 2 },
  { name: 'Barcelona El Prat Airport', iata: 'BCN', city: 'Barcelona', country: 'Spain', countryCode: 'ES', region: 'Southern Europe', cargoTier: 3 },
  { name: 'Vitoria Airport', iata: 'VIT', city: 'Vitoria-Gasteiz', country: 'Spain', countryCode: 'ES', region: 'Southern Europe', cargoTier: 3 },
  { name: 'Zaragoza Airport', iata: 'ZAZ', city: 'Zaragoza', country: 'Spain', countryCode: 'ES', region: 'Southern Europe', cargoTier: 3 },
  { name: 'Valencia Airport', iata: 'VLC', city: 'Valencia', country: 'Spain', countryCode: 'ES', region: 'Southern Europe', cargoTier: 3 },
  { name: 'Seville Airport', iata: 'SVQ', city: 'Seville', country: 'Spain', countryCode: 'ES', region: 'Southern Europe', cargoTier: 3 },
  { name: 'Lisbon Airport', iata: 'LIS', city: 'Lisbon', country: 'Portugal', countryCode: 'PT', region: 'Southern Europe', cargoTier: 3 },
  { name: 'Porto Airport', iata: 'OPO', city: 'Porto', country: 'Portugal', countryCode: 'PT', region: 'Southern Europe', cargoTier: 3 },

  // Northern Europe / Scandinavia
  { name: 'Copenhagen Airport', iata: 'CPH', city: 'Copenhagen', country: 'Denmark', countryCode: 'DK', region: 'Northern Europe', cargoTier: 3, quickPick: true },
  { name: 'Stockholm Arlanda Airport', iata: 'ARN', city: 'Stockholm', country: 'Sweden', countryCode: 'SE', region: 'Northern Europe', cargoTier: 3, quickPick: true },
  { name: 'Oslo Airport', iata: 'OSL', city: 'Oslo', country: 'Norway', countryCode: 'NO', region: 'Northern Europe', cargoTier: 3 },
  { name: 'Helsinki-Vantaa Airport', iata: 'HEL', city: 'Helsinki', country: 'Finland', countryCode: 'FI', region: 'Northern Europe', cargoTier: 3, quickPick: true },
  { name: 'Gothenburg Landvetter Airport', iata: 'GOT', city: 'Gothenburg', country: 'Sweden', countryCode: 'SE', region: 'Northern Europe', cargoTier: 3 },
  { name: 'Billund Airport', iata: 'BLL', city: 'Billund', country: 'Denmark', countryCode: 'DK', region: 'Northern Europe', cargoTier: 3, quickPick: true },

  // Middle East
  { name: 'Dubai International Airport', iata: 'DXB', city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', region: 'Middle East', cargoTier: 1, quickPick: true, badge: 'Major Cargo Hub' },
  { name: 'Al Maktoum International Airport', iata: 'DWC', city: 'Dubai', country: 'United Arab Emirates', countryCode: 'AE', region: 'Middle East', cargoTier: 3 },
  { name: 'Abu Dhabi International Airport', iata: 'AUH', city: 'Abu Dhabi', country: 'United Arab Emirates', countryCode: 'AE', region: 'Middle East', cargoTier: 3 },
  { name: 'Hamad International Airport', iata: 'DOH', city: 'Doha', country: 'Qatar', countryCode: 'QA', region: 'Middle East', cargoTier: 1, quickPick: true, badge: 'Major Cargo Hub' },
  { name: 'Bahrain International Airport', iata: 'BAH', city: 'Manama', country: 'Bahrain', countryCode: 'BH', region: 'Middle East', cargoTier: 3 },
  { name: 'King Khalid International Airport', iata: 'RUH', city: 'Riyadh', country: 'Saudi Arabia', countryCode: 'SA', region: 'Middle East', cargoTier: 3 },
  { name: 'King Abdulaziz International Airport', iata: 'JED', city: 'Jeddah', country: 'Saudi Arabia', countryCode: 'SA', region: 'Middle East', cargoTier: 3 },
  { name: 'Muscat International Airport', iata: 'MCT', city: 'Muscat', country: 'Oman', countryCode: 'OM', region: 'Middle East', cargoTier: 3 },

  // China
  { name: 'Hong Kong International Airport', iata: 'HKG', city: 'Hong Kong', country: 'Hong Kong', countryCode: 'HK', region: 'China', cargoTier: 1, quickPick: true, badge: 'Major Cargo Hub' },
  { name: 'Shanghai Pudong International Airport', iata: 'PVG', city: 'Shanghai', country: 'China', countryCode: 'CN', region: 'China', cargoTier: 1, quickPick: true, badge: 'Major Cargo Hub' },
  { name: 'Guangzhou Baiyun International Airport', iata: 'CAN', city: 'Guangzhou', country: 'China', countryCode: 'CN', region: 'China', cargoTier: 1, quickPick: true, badge: 'Major Cargo Hub' },
  { name: "Shenzhen Bao'an International Airport", iata: 'SZX', city: 'Shenzhen', country: 'China', countryCode: 'CN', region: 'China', cargoTier: 1, quickPick: true, badge: 'Major Cargo Hub' },
  { name: 'Beijing Capital International Airport', iata: 'PEK', city: 'Beijing', country: 'China', countryCode: 'CN', region: 'China', cargoTier: 2, quickPick: true },
  { name: 'Beijing Daxing International Airport', iata: 'PKX', city: 'Beijing', country: 'China', countryCode: 'CN', region: 'China', cargoTier: 3, quickPick: true },
  { name: 'Zhengzhou Xinzheng International Airport', iata: 'CGO', city: 'Zhengzhou', country: 'China', countryCode: 'CN', region: 'China', cargoTier: 3, quickPick: true },
  { name: 'Hangzhou Xiaoshan International Airport', iata: 'HGH', city: 'Hangzhou', country: 'China', countryCode: 'CN', region: 'China', cargoTier: 3, quickPick: true },
  { name: 'Xiamen Gaoqi International Airport', iata: 'XMN', city: 'Xiamen', country: 'China', countryCode: 'CN', region: 'China', cargoTier: 3, quickPick: true },
  { name: 'Chengdu Tianfu International Airport', iata: 'TFU', city: 'Chengdu', country: 'China', countryCode: 'CN', region: 'China', cargoTier: 3 },
  { name: 'Chengdu Shuangliu International Airport', iata: 'CTU', city: 'Chengdu', country: 'China', countryCode: 'CN', region: 'China', cargoTier: 3 },
  { name: "Xi'an Xianyang International Airport", iata: 'XIY', city: "Xi'an", country: 'China', countryCode: 'CN', region: 'China', cargoTier: 3 },
  { name: 'Chongqing Jiangbei International Airport', iata: 'CKG', city: 'Chongqing', country: 'China', countryCode: 'CN', region: 'China', cargoTier: 3 },
  { name: 'Nanjing Lukou International Airport', iata: 'NKG', city: 'Nanjing', country: 'China', countryCode: 'CN', region: 'China', cargoTier: 3 },
  { name: 'Qingdao Jiaodong International Airport', iata: 'TAO', city: 'Qingdao', country: 'China', countryCode: 'CN', region: 'China', cargoTier: 3, quickPick: true },
  { name: 'Ningbo Lishe International Airport', iata: 'NGB', city: 'Ningbo', country: 'China', countryCode: 'CN', region: 'China', cargoTier: 3, quickPick: true },
  { name: 'Wuhan Tianhe International Airport', iata: 'WUH', city: 'Wuhan', country: 'China', countryCode: 'CN', region: 'China', cargoTier: 3 },
  { name: 'Tianjin Binhai International Airport', iata: 'TSN', city: 'Tianjin', country: 'China', countryCode: 'CN', region: 'China', cargoTier: 3 },
  { name: 'Kunming Changshui International Airport', iata: 'KMG', city: 'Kunming', country: 'China', countryCode: 'CN', region: 'China', cargoTier: 3 },
  { name: 'Shenyang Taoxian International Airport', iata: 'SHE', city: 'Shenyang', country: 'China', countryCode: 'CN', region: 'China', cargoTier: 3 },

  // South Korea, Japan, Singapore, Taiwan
  { name: 'Incheon International Airport', iata: 'ICN', city: 'Seoul', country: 'South Korea', countryCode: 'KR', region: 'East Asia', cargoTier: 1, quickPick: true, badge: 'Major Cargo Hub' },
  { name: 'Gimpo International Airport', iata: 'GMP', city: 'Seoul', country: 'South Korea', countryCode: 'KR', region: 'East Asia', cargoTier: 3 },
  { name: 'Gimhae International Airport', iata: 'PUS', city: 'Busan', country: 'South Korea', countryCode: 'KR', region: 'East Asia', cargoTier: 3 },
  { name: 'Narita International Airport', iata: 'NRT', city: 'Tokyo', country: 'Japan', countryCode: 'JP', region: 'East Asia', cargoTier: 2 },
  { name: 'Haneda Airport', iata: 'HND', city: 'Tokyo', country: 'Japan', countryCode: 'JP', region: 'East Asia', cargoTier: 3 },
  { name: 'Kansai International Airport', iata: 'KIX', city: 'Osaka', country: 'Japan', countryCode: 'JP', region: 'East Asia', cargoTier: 3 },
  { name: 'Chubu Centrair International Airport', iata: 'NGO', city: 'Nagoya', country: 'Japan', countryCode: 'JP', region: 'East Asia', cargoTier: 3 },
  { name: 'Fukuoka Airport', iata: 'FUK', city: 'Fukuoka', country: 'Japan', countryCode: 'JP', region: 'East Asia', cargoTier: 3 },
  { name: 'Singapore Changi Airport', iata: 'SIN', city: 'Singapore', country: 'Singapore', countryCode: 'SG', region: 'Southeast Asia', cargoTier: 2, quickPick: true },
  { name: 'Taiwan Taoyuan International Airport', iata: 'TPE', city: 'Taipei', country: 'Taiwan', countryCode: 'TW', region: 'East Asia', cargoTier: 1 },
  { name: 'Kaohsiung International Airport', iata: 'KHH', city: 'Kaohsiung', country: 'Taiwan', countryCode: 'TW', region: 'East Asia', cargoTier: 3 },

  // India
  { name: 'Indira Gandhi International Airport', iata: 'DEL', city: 'Delhi', country: 'India', countryCode: 'IN', region: 'South Asia', cargoTier: 2, quickPick: true },
  { name: 'Chhatrapati Shivaji Maharaj International Airport', iata: 'BOM', city: 'Mumbai', country: 'India', countryCode: 'IN', region: 'South Asia', cargoTier: 2 },
  { name: 'Kempegowda International Airport', iata: 'BLR', city: 'Bengaluru', country: 'India', countryCode: 'IN', region: 'South Asia', cargoTier: 3 },
  { name: 'Chennai International Airport', iata: 'MAA', city: 'Chennai', country: 'India', countryCode: 'IN', region: 'South Asia', cargoTier: 3 },
  { name: 'Rajiv Gandhi International Airport', iata: 'HYD', city: 'Hyderabad', country: 'India', countryCode: 'IN', region: 'South Asia', cargoTier: 3 },
  { name: 'Sardar Vallabhbhai Patel International Airport', iata: 'AMD', city: 'Ahmedabad', country: 'India', countryCode: 'IN', region: 'South Asia', cargoTier: 3 },
  { name: 'Netaji Subhas Chandra Bose International Airport', iata: 'CCU', city: 'Kolkata', country: 'India', countryCode: 'IN', region: 'South Asia', cargoTier: 3 },
  { name: 'Cochin International Airport', iata: 'COK', city: 'Kochi', country: 'India', countryCode: 'IN', region: 'South Asia', cargoTier: 3 },

  // North America
  { name: "O'Hare International Airport", iata: 'ORD', city: 'Chicago', country: 'United States', countryCode: 'US', region: 'North America', cargoTier: 3 },
  { name: 'Los Angeles International Airport', iata: 'LAX', city: 'Los Angeles', country: 'United States', countryCode: 'US', region: 'North America', cargoTier: 3 },
  { name: 'Miami International Airport', iata: 'MIA', city: 'Miami', country: 'United States', countryCode: 'US', region: 'North America', cargoTier: 1 },
  { name: 'John F. Kennedy International Airport', iata: 'JFK', city: 'New York', country: 'United States', countryCode: 'US', region: 'North America', cargoTier: 3 },
  { name: 'Hartsfield-Jackson Atlanta International Airport', iata: 'ATL', city: 'Atlanta', country: 'United States', countryCode: 'US', region: 'North America', cargoTier: 3 },
  { name: 'Dallas/Fort Worth International Airport', iata: 'DFW', city: 'Dallas', country: 'United States', countryCode: 'US', region: 'North America', cargoTier: 3 },
  { name: 'George Bush Intercontinental Airport', iata: 'IAH', city: 'Houston', country: 'United States', countryCode: 'US', region: 'North America', cargoTier: 3 },
  { name: 'San Francisco International Airport', iata: 'SFO', city: 'San Francisco', country: 'United States', countryCode: 'US', region: 'North America', cargoTier: 3 },
  { name: 'Seattle-Tacoma International Airport', iata: 'SEA', city: 'Seattle', country: 'United States', countryCode: 'US', region: 'North America', cargoTier: 3 },
  { name: 'Newark Liberty International Airport', iata: 'EWR', city: 'Newark', country: 'United States', countryCode: 'US', region: 'North America', cargoTier: 3 },
  { name: 'Memphis International Airport', iata: 'MEM', city: 'Memphis', country: 'United States', countryCode: 'US', region: 'North America', cargoTier: 1 },
  { name: 'Louisville Muhammad Ali International Airport', iata: 'SDF', city: 'Louisville', country: 'United States', countryCode: 'US', region: 'North America', cargoTier: 1 },
  { name: 'Ted Stevens Anchorage International Airport', iata: 'ANC', city: 'Anchorage', country: 'United States', countryCode: 'US', region: 'North America', cargoTier: 3 },
  { name: 'Toronto Pearson International Airport', iata: 'YYZ', city: 'Toronto', country: 'Canada', countryCode: 'CA', region: 'North America', cargoTier: 3 },
  { name: 'Vancouver International Airport', iata: 'YVR', city: 'Vancouver', country: 'Canada', countryCode: 'CA', region: 'North America', cargoTier: 3 },
  { name: 'Montréal-Trudeau International Airport', iata: 'YUL', city: 'Montreal', country: 'Canada', countryCode: 'CA', region: 'North America', cargoTier: 3 },
  { name: 'Hamilton Airport', iata: 'YHM', city: 'Hamilton', country: 'Canada', countryCode: 'CA', region: 'North America', cargoTier: 3 },

  // Latin America
  { name: 'Mexico City International Airport', iata: 'MEX', city: 'Mexico City', country: 'Mexico', countryCode: 'MX', region: 'Latin America', cargoTier: 3 },
  { name: 'Felipe Ángeles International Airport', iata: 'NLU', city: 'Mexico City', country: 'Mexico', countryCode: 'MX', region: 'Latin America', cargoTier: 3 },
  { name: 'Guadalajara International Airport', iata: 'GDL', city: 'Guadalajara', country: 'Mexico', countryCode: 'MX', region: 'Latin America', cargoTier: 3 },
  { name: 'Monterrey International Airport', iata: 'MTY', city: 'Monterrey', country: 'Mexico', countryCode: 'MX', region: 'Latin America', cargoTier: 3 },
  { name: 'São Paulo-Guarulhos International Airport', iata: 'GRU', city: 'São Paulo', country: 'Brazil', countryCode: 'BR', region: 'Latin America', cargoTier: 3 },
  { name: 'Viracopos International Airport', iata: 'VCP', city: 'Campinas', country: 'Brazil', countryCode: 'BR', region: 'Latin America', cargoTier: 3 },
  { name: 'Rio de Janeiro-Galeão International Airport', iata: 'GIG', city: 'Rio de Janeiro', country: 'Brazil', countryCode: 'BR', region: 'Latin America', cargoTier: 3 },
  { name: 'El Dorado International Airport', iata: 'BOG', city: 'Bogotá', country: 'Colombia', countryCode: 'CO', region: 'Latin America', cargoTier: 3 },
  { name: 'José María Córdova International Airport', iata: 'MDE', city: 'Medellín', country: 'Colombia', countryCode: 'CO', region: 'Latin America', cargoTier: 3 },
  { name: 'Arturo Merino Benítez International Airport', iata: 'SCL', city: 'Santiago', country: 'Chile', countryCode: 'CL', region: 'Latin America', cargoTier: 3 },
  { name: 'Ezeiza International Airport', iata: 'EZE', city: 'Buenos Aires', country: 'Argentina', countryCode: 'AR', region: 'Latin America', cargoTier: 3 },

  // Africa
  { name: 'O.R. Tambo International Airport', iata: 'JNB', city: 'Johannesburg', country: 'South Africa', countryCode: 'ZA', region: 'Africa', cargoTier: 3 },
  { name: 'Cape Town International Airport', iata: 'CPT', city: 'Cape Town', country: 'South Africa', countryCode: 'ZA', region: 'Africa', cargoTier: 3 },
  { name: 'Cairo International Airport', iata: 'CAI', city: 'Cairo', country: 'Egypt', countryCode: 'EG', region: 'Africa', cargoTier: 3 },
  { name: 'Addis Ababa Bole International Airport', iata: 'ADD', city: 'Addis Ababa', country: 'Ethiopia', countryCode: 'ET', region: 'Africa', cargoTier: 3 },
  { name: 'Jomo Kenyatta International Airport', iata: 'NBO', city: 'Nairobi', country: 'Kenya', countryCode: 'KE', region: 'Africa', cargoTier: 3 },
  { name: 'Murtala Muhammed International Airport', iata: 'LOS', city: 'Lagos', country: 'Nigeria', countryCode: 'NG', region: 'Africa', cargoTier: 3 },
  { name: 'Mohammed V International Airport', iata: 'CMN', city: 'Casablanca', country: 'Morocco', countryCode: 'MA', region: 'Africa', cargoTier: 3 },

  // Oceania
  { name: 'Sydney Kingsford Smith Airport', iata: 'SYD', city: 'Sydney', country: 'Australia', countryCode: 'AU', region: 'Oceania', cargoTier: 3 },
  { name: 'Melbourne Airport', iata: 'MEL', city: 'Melbourne', country: 'Australia', countryCode: 'AU', region: 'Oceania', cargoTier: 3 },
  { name: 'Brisbane Airport', iata: 'BNE', city: 'Brisbane', country: 'Australia', countryCode: 'AU', region: 'Oceania', cargoTier: 3 },
  { name: 'Perth Airport', iata: 'PER', city: 'Perth', country: 'Australia', countryCode: 'AU', region: 'Oceania', cargoTier: 3 },
  { name: 'Auckland Airport', iata: 'AKL', city: 'Auckland', country: 'New Zealand', countryCode: 'NZ', region: 'Oceania', cargoTier: 3 },
];
