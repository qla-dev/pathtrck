import { useMemo, useState } from 'react';

import { FrightHeader } from '../frights/FrightHeader';
import { FrightList } from '../frights/FrightList';
import { SidebarFilter } from '../frights/SidebarFilter';
import { ServiceFilters, ServiceItem, SortMode } from '../frights/FrightTypes';
import { GLOBAL_OFFERS } from '../frights/globalOffers';
import { useCitySuggestions } from '../frights/useCitySuggestions';
import { Language } from '../../types';
import { ui } from '../../i18n';

const DEFAULT_SERVICE_FILTERS: ServiceFilters = {
  place_of_loading: true,
  port_of_origin: true,
  ocean_freight: true,
  port_of_discharge: true,
  place_of_discharge: false,
};

export const FrightsView = ({ lang }: { lang: Language }) => {
  const u = (key: string, fallback: string) => ui(lang, key, fallback);
  const [priceAlerts, setPriceAlerts] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('cheapest');
  const [serviceFilters, setServiceFilters] = useState<ServiceFilters>(DEFAULT_SERVICE_FILTERS);

  const seedCities = useMemo(() => {
    const offerCities = GLOBAL_OFFERS.flatMap((offer) => [
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
    isCityApiReady,
    hasCityApiKey,
    clearLocations,
  } = useCitySuggestions({ seedCities });

  const sortedOffers = useMemo(() => {
    const items = [...GLOBAL_OFFERS];
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
      label: u('Place of loading', 'Place of loading'),
      disabled: false,
    },
    {
      key: 'port_of_origin',
      label: u('Port of origin', 'Port of origin'),
      disabled: false,
    },
    {
      key: 'ocean_freight',
      label: u('Ocean freight', 'Ocean freight'),
      disabled: true,
    },
    {
      key: 'port_of_discharge',
      label: u('Port of discharge', 'Port of discharge'),
      disabled: false,
    },
    {
      key: 'place_of_discharge',
      label: u('Place of discharge', 'Place of discharge'),
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
          isCityApiReady={isCityApiReady}
          hasCityApiKey={hasCityApiKey}
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
