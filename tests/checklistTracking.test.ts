import assert from 'node:assert/strict';
import test from 'node:test';
import { checklistCategory, checklistCategoryLabel, pendingForCategory } from '../src/lib/shipmentChecklist';
import { mapLoadToPackage } from '../src/lib/loadDetails';
import { connectedCraft } from '../src/lib/connectedTransport';

test('legacy checklist items default to the appropriate status', () => {
  assert.equal(checklistCategory({ key: 'flight_details' }), 'in_delivery');
  // The handover documents gate the recipient's review, not the carrier's own receipt.
  assert.equal(checklistCategory({ key: 'proof_of_delivery' }), 'review');
  assert.equal(checklistCategory({ key: 'arrival_and_release_documents' }), 'review');
  assert.equal(checklistCategory({ key: 'vehicle_return' }), 'finished');
});

test('categories stay fixed despite previously saved overrides', () => {
  assert.equal(checklistCategory({ key: 'proof_of_delivery', required_for_status: 'in_delivery' }), 'review');
  assert.equal(checklistCategory({ key: 'flight_details', required_for_status: 'received' }), 'in_delivery');
  assert.equal(checklistCategoryLabel('bs', 'received'), 'Primljeno');
  assert.equal(checklistCategoryLabel('bs', 'review'), 'Recenzija');
});

test('the status gate is cumulative, so receipt does not wait on the paperwork', () => {
  const items = [
    { key: 'assign_driver_and_vehicle', status: 'completed' },
    { key: 'proof_of_delivery', status: 'pending' },
    { key: 'vehicle_return', status: 'pending' },
  ];
  assert.deepEqual(pendingForCategory(items, 'in_delivery'), []);
  assert.deepEqual(pendingForCategory(items, 'received'), []);
  assert.deepEqual(pendingForCategory(items, 'review').map((item) => item.key), ['proof_of_delivery']);
  assert.deepEqual(pendingForCategory(items, 'finished').map((item) => item.key), ['proof_of_delivery', 'vehicle_return']);
  // A departure item left open blocks every status above it, receipt included.
  const unstarted = [{ key: 'assign_driver_and_vehicle', status: 'pending' }];
  assert.deepEqual(pendingForCategory(unstarted, 'received').map((item) => item.key), ['assign_driver_and_vehicle']);
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

test('linked aircraft is selected even when the load still says road', () => {
  const pkg = mapLoadToPackage(load, 'en');
  pkg.operationalChecklist = [{ key: 'flight_details', action_value: JSON.stringify({ hex: 'ABC123', matched: true }) }];
  assert.deepEqual(connectedCraft(pkg), { mode: 'air', identifier: 'abc123' });
});

test('linked ship is selected and unmatched text is not a connection', () => {
  const pkg = mapLoadToPackage(load, 'en');
  pkg.operationalChecklist = [{ key: 'vessel_and_voyage', action_value: JSON.stringify({ mmsi: '249533000', matched: true }) }];
  assert.deepEqual(connectedCraft(pkg), { mode: 'sea', identifier: '249533000' });
  pkg.operationalChecklist[0].action_value = 'a ship name';
  assert.equal(connectedCraft(pkg), null);
});

test('sent loads also use connected vehicle GPS', () => {
  assert.deepEqual(mapLoadToPackage({ ...load, status: 'sent' }, 'en').currentLocation, [45.5, 16.2]);
});
