import { useMemo, useState } from 'react';

import { FrightHeader } from '../frights/FrightHeader';
import { FrightList } from '../frights/FrightList';
import { SidebarFilter } from '../frights/SidebarFilter';
import { Offer, ServiceFilters, ServiceItem, SortMode } from '../frights/FrightTypes';
import { useCitySuggestions } from '../frights/useCitySuggestions';
import { Language } from '../../types';

const OFFERS: Offer[] = [
  {
    id: 'one',
    carrier: 'One',
    badge: 'ONE',
    origin: 'Shanghai, CN',
    destination: 'Odesa, UA',
    originPort: 'Shanghai',
    transitDays: 96,
    freeDays: 40,
    priceUsd: 1120,
  },
  {
    id: 'cmacgm',
    carrier: 'CMA CGM',
    badge: 'CMA',
    origin: 'Shanghai, CN',
    destination: 'Odesa, UA',
    originPort: 'Shanghai',
    transitDays: 72,
    freeDays: 40,
    priceUsd: 1310,
  },
  {
    id: 'maersk',
    carrier: 'Maersk',
    badge: 'M',
    origin: 'Ningbo, CN',
    destination: 'Hamburg, DE',
    originPort: 'Ningbo',
    transitDays: 84,
    freeDays: 40,
    priceUsd: 1320,
  },
  {
    id: 'msc',
    carrier: 'MSC',
    badge: 'MSC',
    origin: 'Shenzhen, CN',
    destination: 'Rotterdam, NL',
    originPort: 'Yantian',
    transitDays: 76,
    freeDays: 35,
    priceUsd: 1240,
  },
  {
    id: 'hapag',
    carrier: 'Hapag-Lloyd',
    badge: 'HL',
    origin: 'Qingdao, CN',
    destination: 'Gdansk, PL',
    originPort: 'Qingdao',
    transitDays: 88,
    freeDays: 42,
    priceUsd: 1295,
  },
];

const tr = (lang: Language, en: string, bs: string, de: string) => {
  if (lang === 'bs') return bs;
  if (lang === 'de') return de;
  return en;
};

const DEFAULT_SERVICE_FILTERS: ServiceFilters = {
  place_of_loading: true,
  port_of_origin: true,
  ocean_freight: true,
  port_of_discharge: true,
  place_of_discharge: false,
};

export const FrightsView = ({ lang }: { lang: Language }) => {
  const [priceAlerts, setPriceAlerts] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('cheapest');
  const [serviceFilters, setServiceFilters] = useState<ServiceFilters>(DEFAULT_SERVICE_FILTERS);

  const seedCities = useMemo(() => {
    const offerCities = OFFERS.flatMap((offer) => [
      offer.origin.split(',')[0]?.trim() || '',
      offer.destination.split(',')[0]?.trim() || '',
    ]);

    return [
      ...offerCities,
      'Antwerp',
      'Trieste',
      'Barcelona',
      'Piraeus',
      'Istanbul',
    ];
  }, []);

  const {
    startLocation,
    setStartLocation,
    endLocation,
    setEndLocation,
    startSuggestions,
    endSuggestions,
    isGooglePlacesReady,
    hasGooglePlacesKey,
    clearLocations,
  } = useCitySuggestions({ seedCities });

  const sortedOffers = useMemo(() => {
    const items = [...OFFERS];
    if (sortMode === 'cheapest') {
      return items.sort((a, b) => a.priceUsd - b.priceUsd);
    }
    return items.sort((a, b) => a.transitDays - b.transitDays);
  }, [sortMode]);

  const filteredOffers = useMemo(() => {
    const startFilter = startLocation.trim().toLowerCase();
    const endFilter = endLocation.trim().toLowerCase();

    return sortedOffers.filter((offer) => {
      const startValue = `${offer.origin} ${offer.originPort}`.toLowerCase();
      const endValue = offer.destination.toLowerCase();
      const startMatch = !startFilter || startValue.includes(startFilter);
      const endMatch = !endFilter || endValue.includes(endFilter);
      return startMatch && endMatch;
    });
  }, [sortedOffers, startLocation, endLocation]);

  const serviceItems: ServiceItem[] = [
    {
      key: 'place_of_loading',
      label: tr(lang, 'Place of loading', 'Mjesto utovara', 'Beladestelle'),
      disabled: false,
    },
    {
      key: 'port_of_origin',
      label: tr(lang, 'Port of origin', 'Luka porijekla', 'Abgangshafen'),
      disabled: false,
    },
    {
      key: 'ocean_freight',
      label: tr(lang, 'Ocean freight', 'Pomorski transport', 'Seefracht'),
      disabled: true,
    },
    {
      key: 'port_of_discharge',
      label: tr(lang, 'Port of discharge', 'Luka istovara', 'Entladehafen'),
      disabled: false,
    },
    {
      key: 'place_of_discharge',
      label: tr(lang, 'Place of discharge', 'Mjesto istovara', 'Entladestelle'),
      disabled: false,
    },
  ];

  const clearFilters = () => {
    setServiceFilters(DEFAULT_SERVICE_FILTERS);
    clearLocations();
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <FrightHeader
        lang={lang}
        priceAlerts={priceAlerts}
        sortMode={sortMode}
        onTogglePriceAlerts={() => setPriceAlerts((prev) => !prev)}
        onSortChange={setSortMode}
      />

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <SidebarFilter
          lang={lang}
          serviceItems={serviceItems}
          serviceFilters={serviceFilters}
          startLocation={startLocation}
          endLocation={endLocation}
          startSuggestions={startSuggestions}
          endSuggestions={endSuggestions}
          isGooglePlacesReady={isGooglePlacesReady}
          hasGooglePlacesKey={hasGooglePlacesKey}
          onStartLocationChange={setStartLocation}
          onEndLocationChange={setEndLocation}
          onServiceFilterChange={(key, value) => {
            setServiceFilters((prev) => ({ ...prev, [key]: value }));
          }}
          onClear={clearFilters}
        />

        <FrightList offers={filteredOffers} lang={lang} />
      </div>
    </div>
  );
};
