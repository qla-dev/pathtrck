import assert from 'node:assert/strict';
import { INITIAL_DRAFT, type LoadDraft } from './types';
import { linkedLastMileDraft, roadCargo } from './linkedRoadDraft';
import { buildDraftPayload } from './payload';

const source: LoadDraft = {...structuredClone(INITIAL_DRAFT),transportType:'sea',cargoType:'FCL',loadTitle:'Nansha–Rijeka–Sarajevo',
  deliveryPort:'Rijeka - HRRJK - Croatia',deliveryCity:'Sarajevo',deliveryCountry:'BA',deliveryAddress:'Adresa primaoca',deliveryLatitude:'43.85',deliveryLongitude:'18.4',
  goodsType:'General',hsCodes:[{code:'850440',description:'Converters',confidence:0.99}],weightKg:'12.5',weightUnit:'t',pallets:'10',quantityMeasure:'Pallets',
  lengthM:'120',lengthUnit:'cm',widthM:'80',widthUnit:'cm',heightM:'100',heightUnit:'cm',volumeM3:'12',dimensionScope:'per_unit',
  extraPackaging:[{pallets:'2',quantityMeasure:'Boxes',lengthM:'1',lengthUnit:'m',widthM:'1',widthUnit:'m',heightM:'1',heightUnit:'m',weightKg:'50',weightUnit:'kg',volumeM3:'2',dimensionScope:'per_unit'}],
  containerSelections:[{type:'40HC',quantity:'2'}],temperatureControlled:true,temperatureMin:'2',temperatureMax:'8',declaredValue:'10000',shipmentValueCurrency:'USD',
  budget:'9000',notes:'Keep upright',additionalInfo:'Confirm release',bookingReference:'REF-001'};
const road=linkedLastMileDraft(source,'Last mile',123);
assert.equal(road.transportType,'road');assert.equal(road.cargoType,'FTL');
assert.equal(road.pickupCity,'Rijeka');assert.equal(road.pickupCountry,'HR');
assert.equal(road.deliveryCity,'Sarajevo');assert.equal(road.deliveryCountry,'BA');
assert.notEqual(road.pickupLatitude,road.deliveryLatitude);
assert.equal(road.weightKg,'12.5');assert.equal(road.weightUnit,'t');assert.deepEqual(road.hsCodes,source.hsCodes);
assert.deepEqual(road.extraPackaging,source.extraPackaging);assert.equal(road.shipmentValueCurrency,'USD');
assert.equal(road.budget,INITIAL_DRAFT.budget);assert.equal(road.pickupDate,INITIAL_DRAFT.pickupDate);
assert.deepEqual(road.bodyTypes,[]);assert.match(road.notes,/2 × 40HC/);assert.match(road.notes,/FreightBook #123/);
assert.match(road.notes,/Keep upright/);assert.match(road.notes,/Confirm release/);
road.hsCodes[0].description='Changed';road.extraPackaging[0].weightKg='99';
assert.equal(source.hsCodes[0].description,'Converters');assert.equal(source.extraPackaging[0].weightKg,'50');
const payload=buildDraftPayload(linkedLastMileDraft(source,'Last mile',123));
assert.equal(payload.weight_kg,12500);assert.equal(payload.length_m,1.2);assert.equal(payload.width_m,0.8);
assert.equal(payload.pickup_city,'Rijeka');assert.equal(payload.pickup_country_code,'HR');assert.equal(payload.delivery_city,'Sarajevo');
assert.match(payload.notes||'',/2 × 40HC/);assert.equal(payload.temperature_min,2);
const air=linkedLastMileDraft({...source,transportType:'air',containerSelections:[],deliveryAirport:'Sarajevo International Airport (SJJ) — Sarajevo, Bosnia and Herzegovina',deliveryCity:'Mostar'},'Air last mile');
assert.equal(air.pickupCity,'Sarajevo');assert.equal(air.deliveryCity,'Mostar');assert.equal(air.pickupLatitude,'');
const unknown=linkedLastMileDraft({...source,deliveryPort:'Unlisted terminal'},'Review pickup');
assert.equal(unknown.pickupAddress,'Unlisted terminal');assert.equal(unknown.pickupCity,'');assert.equal(unknown.pickupCountry,'');
assert.deepEqual(roadCargo(source).extraPackaging,source.extraPackaging);
console.log('Linked road cargo, route, units, containers and independent pricing checks passed.');
