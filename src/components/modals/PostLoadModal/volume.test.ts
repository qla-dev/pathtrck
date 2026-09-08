import assert from 'node:assert/strict';
import { INITIAL_DRAFT } from './types';
import { calculateVolume } from './volume';

const draft = { ...INITIAL_DRAFT, lengthM: '13.6', widthM: '2.45', heightM: '2.7', pallets: '12' };
assert.equal(calculateVolume(draft), '1079.568');
assert.equal(calculateVolume({ ...draft, dimensionScope: 'per_unit' }), '89.964');
for (const [unit, multiplier] of [['cm', 100], ['mm', 1000]] as const) {
  assert.equal(calculateVolume({ ...draft,
    lengthM: String(13.6 * multiplier), widthM: String(2.45 * multiplier), heightM: String(2.7 * multiplier),
    lengthUnit: unit, widthUnit: unit, heightUnit: unit,
  }), '1079.568');
}
assert.equal(calculateVolume({ ...draft, lengthM: '' }), null);
assert.equal(calculateVolume({ ...draft, heightM: '-1' }), null);
assert.equal(calculateVolume({ ...draft, pallets: '' }), null);
assert.equal(calculateVolume({ ...draft, pallets: '1.5' }), null);
assert.equal(calculateVolume({ ...draft, dimensionScope: 'per_unit', pallets: '' }), '89.964');
assert.equal(calculateVolume({ ...draft, dimensionScope: 'per_unit', pallets: '20' }), '89.964');
assert.equal(calculateVolume({ ...draft, volumeM3: '100' }), '1079.568');
console.log('Volume calculation checks passed.');
