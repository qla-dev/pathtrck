import { Role } from '../types';

/**
 * Who may see what, as one table.
 *
 * The app has ten kinds of user and fourteen features, and the answer for any pair is one of three
 * things. Scattering that across the navigation, the views and a dozen `role === 'x' ||` checks is
 * how the three drifted apart; this is the table itself, written once, so adjusting an access rule
 * means editing one cell rather than hunting for every place that asks.
 */

export type AccessLevel =
  /** Use it: create, edit, act. */
  | 'full'
  /** Read it, change nothing - the "SP / samo pregled" column. */
  | 'view'
  /** Not theirs at all: hidden from the navigation and refused if reached another way. */
  | 'none';

/**
 * The roles as the access table names them, which is not quite the roles the API issues.
 *
 * `manager` splits in two: the same API role means a logistics manager in a haulier and a warehouse
 * manager in a depot, and the two are trusted with different things - a warehouse manager runs the
 * docks but has no business in the customer book. The company they belong to is what tells them
 * apart, so `resolvePermissionRole` needs that context rather than the role alone.
 */
export type PermissionRole =
  | 'superadmin'
  | 'company'
  | 'manager'
  | 'dispatcher'
  | 'warehouse'
  | 'warehouse_manager'
  | 'user'
  | 'driver'
  | 'forwarder'
  | 'finance';

export type Feature =
  | 'commandCenter'
  | 'customers'
  | 'logisticsCompanies'
  | 'warehouseCompanies'
  | 'carriers'
  | 'freightExchange'
  | 'globalTracking'
  | 'warehouse'
  | 'docks'
  | 'fleet'
  | 'finance'
  | 'emailStudio'
  | 'documents'
  | 'tariffs';

const F: AccessLevel = 'full';
const V: AccessLevel = 'view';
const N: AccessLevel = 'none';

/**
 * The access table, one row per feature.
 *
 * Column order is fixed and shared by every row so the whole thing reads as the grid it is:
 * superadmin, company, manager, dispatcher, warehouse, warehouse manager, customer, driver,
 * forwarder, finance.
 */
const ORDER: PermissionRole[] = [
  'superadmin', 'company', 'manager', 'dispatcher', 'warehouse',
  'warehouse_manager', 'user', 'driver', 'forwarder', 'finance',
];

const MATRIX: Record<Feature, AccessLevel[]> = {
  //                    SA company manager dispatch warehouse whMgr customer driver forwarder finance
  commandCenter:      [ F, F, F, F, F, F, V, V, F, N ],
  customers:          [ F, F, F, V, N, N, V, N, F, V ],
  logisticsCompanies: [ F, V, V, V, V, V, V, N, F, V ],
  warehouseCompanies: [ F, V, V, V, F, F, V, N, F, V ],
  carriers:           [ F, F, F, F, V, V, N, N, F, V ],
  freightExchange:    [ F, F, F, F, V, V, V, F, F, N ],
  globalTracking:     [ F, F, F, F, F, F, F, F, F, N ],
  warehouse:          [ F, F, F, N, F, F, V, N, V, V ],
  docks:              [ F, V, V, N, F, F, N, N, V, N ],
  fleet:              [ F, F, F, F, N, N, N, N, F, F ],
  finance:            [ F, V, V, N, V, V, V, N, V, F ],
  emailStudio:        [ F, N, N, N, N, N, N, N, N, N ],
  documents:          [ F, F, F, F, F, F, F, F, F, F ],
  tariffs:            [ F, F, F, V, F, V, V, N, F, V ],
};

/**
 * Features an operator only reaches by owning the thing they are about.
 *
 * Warehouses and fleets are both declared in the profile, and both are self-asserted - so the table
 * applies only once the account has said it operates them AND its company has been verified. Without
 * the switch the pages are not theirs and are hidden entirely, whatever the table says. This is what
 * keeps a haulier that does not run warehouses out of the warehouse side of the app, and a company
 * with no trucks out of the fleet.
 *
 * The operators the switches belong to. A superadmin and finance see the global view regardless -
 * theirs is oversight of everyone's, not ownership of their own - and a warehouse company never
 * needs a warehouse switch, because the warehouse is what it is.
 */
const OWNED_FEATURES: Partial<Record<Feature, 'warehouse' | 'fleet'>> = {
  warehouse: 'warehouse',
  docks: 'warehouse',
  fleet: 'fleet',
};
const OWNERSHIP_GATED_ROLES: PermissionRole[] = ['company', 'manager', 'dispatcher', 'forwarder'];

export type AccessContext = {
  /** The profile switch: this account operates warehouses of its own. */
  hasWarehouse?: boolean;
  /** The profile switch: this account runs vehicles of its own. */
  hasFleet?: boolean;
  /** A company with `verified_at` set - self-declaring a warehouse or a fleet is not enough alone. */
  verified?: boolean;
  /** Their company is warehouse-first, which is what makes a manager a warehouse manager. */
  warehouseCompany?: boolean;
};

export const resolvePermissionRole = (
  role: Role | undefined,
  context: AccessContext = {},
): PermissionRole | null => {
  switch (role) {
    case 'superadmin':
    case 'master':
      return 'superadmin';
    case 'company':
      return 'company';
    case 'manager':
      return context.warehouseCompany ? 'warehouse_manager' : 'manager';
    case 'dispatcher':
      return 'dispatcher';
    case 'warehouse':
      return 'warehouse';
    case 'user':
      return 'user';
    case 'driver':
      return 'driver';
    // Špediter. The API calls the role `customs_officer`; the table, and the Bosnian UI, call the
    // same person a forwarder.
    case 'customs_officer':
      return 'forwarder';
    case 'finance':
      return 'finance';
    default:
      return null;
  }
};

/** What this role may do with this feature, once the warehouse condition is applied. */
export const accessLevel = (
  role: Role | undefined,
  feature: Feature,
  context: AccessContext = {},
): AccessLevel => {
  const permissionRole = resolvePermissionRole(role, context);
  if (!permissionRole) return 'none';
  const index = ORDER.indexOf(permissionRole);
  const level = MATRIX[feature]?.[index] ?? 'none';
  if (level === 'none') return 'none';
  const owned = OWNED_FEATURES[feature];
  if (owned && OWNERSHIP_GATED_ROLES.includes(permissionRole)) {
    const declared = owned === 'warehouse' ? context.hasWarehouse : context.hasFleet;
    if (!(declared && context.verified)) return 'none';
  }
  return level;
};

/** In the navigation and reachable - true for both full access and view-only. */
export const canAccess = (role: Role | undefined, feature: Feature, context: AccessContext = {}): boolean =>
  accessLevel(role, feature, context) !== 'none';

/** May change things here, rather than only read them. */
export const canEdit = (role: Role | undefined, feature: Feature, context: AccessContext = {}): boolean =>
  accessLevel(role, feature, context) === 'full';

/** Reachable, but read-only - what a screen checks to hide its buttons. */
export const isViewOnly = (role: Role | undefined, feature: Feature, context: AccessContext = {}): boolean =>
  accessLevel(role, feature, context) === 'view';

/** The navigation id each feature is reached by, so the table and the sidebar cannot drift apart. */
export const FEATURE_BY_VIEW: Record<string, Feature> = {
  admin: 'commandCenter',
  'admin-customers': 'customers',
  'admin-companies': 'logisticsCompanies',
  'admin-warehouse-companies': 'warehouseCompanies',
  'admin-drivers': 'carriers',
  feed: 'freightExchange',
  tracking: 'globalTracking',
  warehouses: 'warehouse',
  'warehouse-overview': 'warehouse',
  docks: 'docks',
  fleet: 'fleet',
  finance: 'finance',
  'email-studio': 'emailStudio',
  notes: 'documents',
  'tariffs-hs': 'tariffs',
};

/** Whether a navigation id may be opened at all. Views with no feature row are unrestricted. */
export const canOpenView = (role: Role | undefined, view: string, context: AccessContext = {}): boolean => {
  const feature = FEATURE_BY_VIEW[view];
  return feature ? canAccess(role, feature, context) : true;
};

/** The features in the order the access table lists them, for anything that renders the whole grid. */
export const FEATURE_ORDER: Feature[] = [
  'commandCenter', 'customers', 'logisticsCompanies', 'warehouseCompanies', 'carriers',
  'freightExchange', 'globalTracking', 'warehouse', 'docks', 'fleet',
  'finance', 'emailStudio', 'documents', 'tariffs',
];

/**
 * What each feature is called on screen. The same translation keys the sidebar uses, so a module
 * named in a permissions summary reads exactly as the menu entry it grants.
 */
export const FEATURE_LABELS: Record<Feature, { key: string; fallback: string }> = {
  commandCenter: { key: 'nav.commandCenter', fallback: 'Command Center' },
  customers: { key: 'nav.allCustomers', fallback: 'Customers' },
  logisticsCompanies: { key: 'nav.allCompanies', fallback: 'Logistics Companies' },
  warehouseCompanies: { key: 'nav.allWarehouseCompanies', fallback: 'Warehouse Companies' },
  carriers: { key: 'nav.allDrivers', fallback: 'Carriers' },
  freightExchange: { key: 'nav.freightExchange', fallback: 'Freight exchange' },
  globalTracking: { key: 'nav.globalTracking', fallback: 'Global Tracking' },
  warehouse: { key: 'nav.warehouse', fallback: 'Warehouse' },
  docks: { key: 'nav.myDocks', fallback: 'My docks' },
  fleet: { key: 'nav.globalFleet', fallback: 'Global Fleet' },
  finance: { key: 'nav.finance', fallback: 'Finance' },
  emailStudio: { key: 'nav.emailStudio', fallback: 'Email Studio' },
  documents: { key: 'documents.navLabel', fallback: 'Documents' },
  tariffs: { key: 'nav.tariffsHs', fallback: 'Tariffs & HS' },
};
