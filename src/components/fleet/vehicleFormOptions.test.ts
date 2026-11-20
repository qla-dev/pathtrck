import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {ISO_COUNTRY_CODES,FUEL_TYPES,fuelCode,tonnesToKg} from './vehicleFormOptions';
test('all 249 ISO alpha-2 countries are unique and agree with backend validation',()=>{assert.equal(ISO_COUNTRY_CODES.length,249);assert.equal(new Set(ISO_COUNTRY_CODES).size,249);assert.ok(ISO_COUNTRY_CODES.every(c=>/^[A-Z]{2}$/.test(c)));const php=readFileSync(new URL('../../../../backend/app/Services/VehicleRegistry.php',import.meta.url),'utf8');assert.deepEqual(php.match(/COUNTRIES = '([^']+)'/)![1].split(' '),ISO_COUNTRY_CODES);});
test('nineteen stable propulsion codes preserve known legacy aliases and unknown stored values',()=>{assert.equal(FUEL_TYPES.length,19);assert.equal(new Set(FUEL_TYPES.map(r=>r[0])).size,19);assert.equal(fuelCode('Diesel'),'diesel');assert.equal(fuelCode('electric'),'bev');assert.equal(fuelCode('legacy custom'),'legacy custom');});
test('the supplied Actros masses round trip without confusing gross mass and payload',()=>{assert.equal(tonnesToKg('18'),18000);assert.equal(tonnesToKg('9,481'),9481);assert.equal(tonnesToKg('44'),44000);assert.equal(tonnesToKg(''),null);for(const value of ['-1','3 - 40 t','18t','Infinity','1001','0'])assert.throws(()=>tonnesToKg(value));});
