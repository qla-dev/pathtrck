import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { handoverCandidates, filterHandoverVehicles } from './handoverSelection';

const rows = [
  { id: 1, registration_number: 'FB-101', vin: 'VIN123', model: 'Model A', status: 'active', depot_id: 7, features: { resource_type: 'rigid_truck' } },
  { id: 2, registration_number: 'FB-204', status: 'maintenance', dispatch_blocked: true, depot_id: null, features: { resource_type: 'tractor_unit' } },
  { id: 3, registration_number: 'TR-1', status: 'depot', features: { resource_type: 'semi_trailer' } },
  { id: 4, registration_number: 'OLD-TR', vehicle_type: 'Trailer', status: 'active' },
  { id: 5, registration_number: 'SOLD', status: 'sold' },
  { id: 6, registration_number: 'BACK', status: 'returned' },
  { id: 7, registration_number: 'LOST', status: 'stolen' },
];
test('archived and standalone trailers are excluded, workshop return remains possible', () => {
  assert.deepEqual(handoverCandidates(rows).map(v => v.id), [1, 2]);
  assert.equal(handoverCandidates([{ vehicle_type: 'Truck + Trailer', status: 'active' }]).length, 1);
});
test('search matches plate, VIN and model without changing scope', () => {
  for (const term of ['fb-101', ' vin123 ', 'model a']) assert.deepEqual(filterHandoverVehicles(rows, term, '', '', '').map(v => v.id), [1]);
  assert.equal(filterHandoverVehicles(rows.slice(1), 'FB-101', '', '', '').length, 0);
});
test('depot, unassigned, resource and status filters compose', () => {
  assert.deepEqual(filterHandoverVehicles(rows, '', '7', 'rigid_truck', 'active').map(v => v.id), [1]);
  assert.deepEqual(filterHandoverVehicles(rows, '', 'unassigned', 'tractor_unit', 'maintenance').map(v => v.id), [2]);
  assert.equal(filterHandoverVehicles(rows, '', '7', '', 'maintenance').length, 0);
  assert.equal(filterHandoverVehicles([], '', '', '', '').length, 0);
});
