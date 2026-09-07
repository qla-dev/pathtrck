import assert from 'node:assert/strict';
import test from 'node:test';
import { checklistCategory, checklistCategoryLabel } from '../src/lib/shipmentChecklist';
import { mapLoadToPackage } from '../src/lib/loadDetails';

test('legacy checklist items default to the appropriate status', () => {
  assert.equal(checklistCategory({ key: 'flight_details' }), 'in_delivery');
  assert.equal(checklistCategory({ key: 'proof_of_delivery' }), 'received');
  assert.equal(checklistCategory({ key: 'arrival_and_release_documents' }), 'received');
});

test('every item can move in either direction', () => {
  assert.equal(checklistCategory({ key: 'proof_of_delivery', required_for_status: 'in_delivery' }), 'in_delivery');
  assert.equal(checklistCategory({ key: 'flight_details', required_for_status: 'received' }), 'received');
  assert.equal(checklistCategoryLabel('bs', 'received'), 'Primljeno');
});

const load = {
  id: 12, transport_type: 'road', status: 'in_delivery',
  shipment: { current_latitude: 43, current_longitude: 18 },
  vehicle: { id: 8, latest_location: { latitude: '45.5', longitude: '16.2', recorded_at: '2026-09-07T10:00:00Z' } },
};

test('in-delivery loads use their connected vehicle GPS and its observation time', () => {
  const pkg = mapLoadToPackage(load, 'en');
  assert.deepEqual(pkg.currentLocation, [45.5, 16.2]);
  assert.equal(pkg.trackingUpdatedAt, '2026-09-07T10:00:00Z');
  assert.equal(pkg.hasCurrentLocation, true);
});

test('road vehicle GPS is not substituted for aircraft or ship locations', () => {
  for (const transport_type of ['air', 'sea']) {
    assert.deepEqual(mapLoadToPackage({ ...load, transport_type }, 'en').currentLocation, [43, 18]);
  }
});

test('vehicle movements after delivery do not move the delivered load', () => {
  assert.deepEqual(mapLoadToPackage({ ...load, status: 'received' }, 'en').currentLocation, [43, 18]);
});

test('missing and invalid coordinates never become a current location', () => {
  const pkg = mapLoadToPackage({ ...load, shipment: {}, vehicle: { latest_location: { latitude: null, longitude: 18 } } }, 'en');
  assert.equal(pkg.hasCurrentLocation, false);
  assert.equal(mapLoadToPackage({ ...load, vehicle: {}, shipment: { current_latitude: 'bad', current_longitude: 18 } }, 'en').hasCurrentLocation, false);
});

test('zero coordinates are valid GPS readings', () => {
  const pkg = mapLoadToPackage({ ...load, vehicle: { latest_location: { latitude: 0, longitude: 0 } } }, 'en');
  assert.deepEqual(pkg.currentLocation, [0, 0]);
  assert.equal(pkg.hasCurrentLocation, true);
});
