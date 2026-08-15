import { Building2 } from 'lucide-react';
import { api } from '../../services/api';
import { Language } from '../../types';
import { ApiRegistryView } from './ApiRegistryView';
export const AdminCompaniesView = ({ lang: _lang, onOpenEmailStudio }: { lang: Language; onOpenEmailStudio?: () => void }) => <ApiRegistryView eyebrow="Superadmin registry" title="Logistics Companies" description="Company records and relations loaded from Laravel." icon={Building2} request={api.companies.list} empty="No companies in the database." onEmail={onOpenEmailStudio} columns={[{ label: 'Company', value: (row) => row.name }, { label: 'Email', value: (row) => row.email }, { label: 'Country', value: (row) => row.country_code }, { label: 'Fleet', value: (row) => Array.isArray(row.vehicles) ? row.vehicles.length : 0 }, { label: 'Plan', value: (row) => row.plan }, { label: 'Status', value: (row) => row.status }]} />;
