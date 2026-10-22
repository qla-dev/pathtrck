import { INITIAL_DRAFT, isContainerTransport, type LoadDraft } from './types';
import { SEA_PORTS } from '../../../data/seaPorts';
import { AIRPORTS } from '../../../data/airports';

/** Carry the physical cargo, not the main leg's freight price, route or commercial terms. */
export function roadCargo(source: LoadDraft): Partial<LoadDraft> {
  return structuredClone({
    goodsType: source.goodsType, hsCodes: source.hsCodes, customsDocuments: source.customsDocuments,
    weightKg: source.weightKg, weightUnit: source.weightUnit, pallets: source.pallets, quantityMeasure: source.quantityMeasure,
    lengthM: source.lengthM, lengthUnit: source.lengthUnit, widthM: source.widthM, widthUnit: source.widthUnit,
    heightM: source.heightM, heightUnit: source.heightUnit, volumeM3: source.volumeM3, dimensionScope: source.dimensionScope,
    extraPackaging: source.extraPackaging, declaredValue: source.declaredValue, shipmentValueCurrency: source.shipmentValueCurrency,
    temperatureControlled: source.temperatureControlled, temperatureMin: source.temperatureMin, temperatureMax: source.temperatureMax,
    insuranceRequired: source.insuranceRequired, certificationRequired: source.certificationRequired,
    customsRequired: source.customsRequired, inspectionServicesRequired: source.inspectionServicesRequired,
    requiresAdr: source.requiresAdr, urgent: source.urgent, bookingReference: source.bookingReference,
    notes: source.notes, additionalInfo: source.additionalInfo,
  });
}

/** The existing + last mile flow saves a second draft; publication still requires its own review. */
export function linkedLastMileDraft(source: LoadDraft, title: string, sourceLoadId?: string | number): LoadDraft {
  const container = isContainerTransport(source.transportType);
  const port = container ? SEA_PORTS.find(p => source.deliveryPort.includes(` - ${p.unlocode} - `)) : undefined;
  const airport = source.transportType === 'air' ? AIRPORTS.find(a => source.deliveryAirport.includes(`(${a.iata})`)) : undefined;
  const hub = port || airport;
  const hubName = container ? source.deliveryPort : source.deliveryAirport;
  const containers = source.containerSelections.filter(c => c.type).map(c => `${c.quantity || '1'} × ${c.type}`).join(', ');
  const handling = [source.dgUnNumber && `UN ${source.dgUnNumber}`, source.dgImoClass && `IMO ${source.dgImoClass}`, source.dgPackingGroup, source.dgProperShippingName,
    source.oogInGauge === 'out_of_gauge' && `OOG: ${source.oogLengthM} × ${source.oogWidthM} × ${source.oogHeightM} m; ${source.oogWeightKg} kg`].filter(Boolean).join(' · ');
  const notes = [source.notes, source.additionalInfo, containers ? `Container: ${containers}` : '', source.characteristics.join(', '), handling, sourceLoadId ? `FreightBook #${sourceLoadId}` : ''].filter(Boolean).join('\n');
  return {
    ...structuredClone(INITIAL_DRAFT), ...roadCargo(source), transportType: 'road', cargoType: 'FTL', loadTitle: title,
    // A container needs a matching vehicle, not the default curtain-sided trailer.
    bodyTypes: [], vehicleType: '', notes, additionalInfo: notes,
    pickupPlaceType: 'Terminal', pickupAddress: hubName,
    pickupCity: hub?.city || '', pickupCountry: hub?.countryCode || '',
    pickupLatitude: port ? String(port.latitude) : '', pickupLongitude: port ? String(port.longitude) : '',
    deliveryPlaceType: 'Warehouse', deliveryAddress: source.deliveryAddress, deliveryCity: source.deliveryCity,
    deliveryPostalCode: source.deliveryPostalCode, deliveryCountry: source.deliveryCountry,
    deliveryLatitude: source.deliveryLatitude, deliveryLongitude: source.deliveryLongitude,
    // The port/airport release and the road dates must be confirmed for the new service.
  };
}
