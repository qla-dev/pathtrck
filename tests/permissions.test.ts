import assert from 'node:assert/strict';
import test from 'node:test';
import { accessLevel, canOpenView, resolvePermissionRole } from '../src/lib/permissions';

const warehouseCompany = { warehouseCompany: true };
const ownsWarehouse = { hasWarehouse: true, verified: true };
const ownsFleet = { hasFleet: true, verified: true };

test('the API roles map onto the roles the access table names', () => {
  assert.equal(resolvePermissionRole('superadmin'), 'superadmin');
  assert.equal(resolvePermissionRole('master'), 'superadmin');
  // Špediter in the table, customs_officer in the API.
  assert.equal(resolvePermissionRole('customs_officer'), 'forwarder');
  // One API role, two rows in the table - the company is what tells them apart.
  assert.equal(resolvePermissionRole('manager'), 'manager');
  assert.equal(resolvePermissionRole('manager', warehouseCompany), 'warehouse_manager');
  assert.equal(resolvePermissionRole(null), null);
});

test('superadmin has everything and finance has the command centre nowhere near it', () => {
  for (const feature of ['commandCenter', 'emailStudio', 'docks', 'fleet'] as const) {
    assert.equal(accessLevel('superadmin', feature), 'full');
  }
  assert.equal(accessLevel('finance', 'commandCenter'), 'none');
  assert.equal(accessLevel('finance', 'freightExchange'), 'none');
  assert.equal(accessLevel('finance', 'globalTracking'), 'none');
  assert.equal(accessLevel('finance', 'finance'), 'full');
  assert.equal(accessLevel('finance', 'fleet'), 'full');
});

test('email studio belongs to the superadmin alone', () => {
  for (const role of ['company', 'manager', 'dispatcher', 'warehouse', 'user', 'driver', 'customs_officer', 'finance'] as const) {
    assert.equal(accessLevel(role, 'emailStudio'), 'none', role);
  }
});

test('every role keeps its documents', () => {
  for (const role of ['superadmin', 'company', 'manager', 'dispatcher', 'warehouse', 'user', 'driver', 'customs_officer', 'finance'] as const) {
    assert.equal(accessLevel(role, 'documents'), 'full', role);
  }
});

test('a driver carries loads and nothing administrative', () => {
  assert.equal(accessLevel('driver', 'freightExchange'), 'full');
  assert.equal(accessLevel('driver', 'globalTracking'), 'full');
  assert.equal(accessLevel('driver', 'commandCenter'), 'view');
  for (const feature of ['customers', 'carriers', 'warehouse', 'docks', 'fleet', 'finance', 'tariffs'] as const) {
    assert.equal(accessLevel('driver', feature), 'none', feature);
  }
});

test('a customer reads rather than acts, except where nothing is theirs', () => {
  assert.equal(accessLevel('user', 'globalTracking'), 'full');
  assert.equal(accessLevel('user', 'freightExchange'), 'view');
  assert.equal(accessLevel('user', 'commandCenter'), 'view');
  assert.equal(accessLevel('user', 'finance'), 'view');
  assert.equal(accessLevel('user', 'carriers'), 'none');
  assert.equal(accessLevel('user', 'docks'), 'none');
});

test('the two managers differ exactly where the table says they do', () => {
  // Logistics manager runs the commercial side; warehouse manager runs the building.
  assert.equal(accessLevel('manager', 'customers', ownsWarehouse), 'full');
  assert.equal(accessLevel('manager', 'customers', { ...ownsWarehouse, ...warehouseCompany }), 'none');
  assert.equal(accessLevel('manager', 'fleet', { ...ownsFleet }), 'full');
  assert.equal(accessLevel('manager', 'fleet', { ...ownsFleet, ...warehouseCompany }), 'none');
  assert.equal(accessLevel('manager', 'tariffs'), 'full');
  assert.equal(accessLevel('manager', 'tariffs', warehouseCompany), 'view');
  // The docks are the warehouse manager's own ground, and only a readout for the haulier's.
  assert.equal(accessLevel('manager', 'docks', warehouseCompany), 'full');
  assert.equal(accessLevel('manager', 'docks', ownsWarehouse), 'view');
});

test('the fleet follows the same switch the warehouse does', () => {
  assert.equal(accessLevel('company', 'fleet', ownsFleet), 'full');
  // Declared but unverified, and not declared at all - neither reaches the fleet.
  assert.equal(accessLevel('company', 'fleet', { hasFleet: true }), 'none');
  assert.equal(accessLevel('company', 'fleet'), 'none');
  assert.equal(accessLevel('manager', 'fleet'), 'none');
  assert.equal(accessLevel('customs_officer', 'fleet'), 'none');
  // Oversight of everyone's fleet is not ownership of one, so these are never switched off.
  assert.equal(accessLevel('superadmin', 'fleet'), 'full');
  assert.equal(accessLevel('finance', 'fleet'), 'full');
  // The warehouse switch does not open the fleet, nor the other way round.
  assert.equal(accessLevel('company', 'fleet', ownsWarehouse), 'none');
  assert.equal(accessLevel('company', 'warehouse', ownsFleet), 'none');
});

test('a haulier reaches the warehouse pages only by owning warehouses and being verified', () => {
  // Declared and verified: the table applies as written.
  assert.equal(accessLevel('company', 'warehouse', ownsWarehouse), 'full');
  assert.equal(accessLevel('company', 'docks', ownsWarehouse), 'view');
  // Declared but not yet verified - the flag is self-asserted, so on its own it is not enough.
  assert.equal(accessLevel('company', 'warehouse', { hasWarehouse: true }), 'none');
  // Not declared at all: the warehouse side of the app is not theirs.
  assert.equal(accessLevel('company', 'warehouse'), 'none');
  assert.equal(accessLevel('company', 'docks'), 'none');
  assert.equal(accessLevel('manager', 'warehouse'), 'none');
  assert.equal(accessLevel('dispatcher', 'docks', ownsWarehouse), 'none', 'the table denies a dispatcher the docks outright');
  // A warehouse company never needs the flag - the warehouse is what it is.
  assert.equal(accessLevel('warehouse', 'warehouse'), 'full');
  assert.equal(accessLevel('warehouse', 'docks'), 'full');
  assert.equal(accessLevel('manager', 'docks', warehouseCompany), 'full');
});

test('a warehouse company has no fleet and no customer book', () => {
  assert.equal(accessLevel('warehouse', 'fleet'), 'none');
  assert.equal(accessLevel('warehouse', 'customers'), 'none');
  assert.equal(accessLevel('warehouse', 'carriers'), 'view');
  assert.equal(accessLevel('warehouse', 'warehouseCompanies'), 'full');
});

test('a forwarder sees widely and edits the commercial side', () => {
  for (const feature of ['commandCenter', 'customers', 'logisticsCompanies', 'carriers', 'tariffs'] as const) {
    assert.equal(accessLevel('customs_officer', feature), 'full', feature);
  }
  // The fleet is theirs to run only once they have declared one, like any other operator.
  assert.equal(accessLevel('customs_officer', 'fleet', ownsFleet), 'full');
  assert.equal(accessLevel('customs_officer', 'fleet'), 'none');
  assert.equal(accessLevel('customs_officer', 'finance'), 'view');
  assert.equal(accessLevel('customs_officer', 'emailStudio'), 'none');
  // Warehouse pages are read-only for them, and still need the ownership flag.
  assert.equal(accessLevel('customs_officer', 'warehouse', ownsWarehouse), 'view');
  assert.equal(accessLevel('customs_officer', 'warehouse'), 'none');
});

test('navigation ids resolve through the same table, and unlisted views stay open', () => {
  assert.equal(canOpenView('driver', 'tariffs-hs'), false);
  assert.equal(canOpenView('driver', 'notes'), true);
  assert.equal(canOpenView('finance', 'email-studio'), false);
  assert.equal(canOpenView('company', 'docks'), false);
  assert.equal(canOpenView('company', 'docks', ownsWarehouse), true);
  // Company overview, Team & Permissions and the profile are not features the table governs.
  assert.equal(canOpenView('driver', 'profile'), true);
  assert.equal(canOpenView('company', 'company-team'), true);
});
