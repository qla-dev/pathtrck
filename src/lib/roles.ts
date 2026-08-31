import { Role } from '../types';

export const isCompanyOperationsRole = (role?: Role): boolean =>
  role === 'company' || role === 'manager' || role === 'dispatcher' || role === 'customs_officer';

export const canManageCompany = (role?: Role): boolean => role === 'company' || role === 'manager';

export const canViewCompanyFinance = (role?: Role): boolean =>
  role === 'company' || role === 'manager' || role === 'finance' || role === 'superadmin' || role === 'master';
