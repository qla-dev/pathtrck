import { UserRound } from 'lucide-react';
import { api } from '../../services/api';
import { Language } from '../../types';
import { ApiRegistryView } from './ApiRegistryView';
const customer = (row: Record<string, unknown>) => (row.role as { name?: string } | undefined)?.name === 'user';
export const AdminCustomersView = ({ lang: _lang, onOpenEmailStudio }: { lang: Language; onOpenEmailStudio?: () => void }) => <ApiRegistryView eyebrow="Superadmin registry" title="All Customers" description="Customer accounts loaded from Laravel." icon={UserRound} request={api.users.list} filter={customer} empty="No customer accounts in the database." onEmail={onOpenEmailStudio} columns={[{ label: 'Customer', value: (row) => row.name }, { label: 'Username', value: (row) => row.username }, { label: 'Email', value: (row) => row.email }, { label: 'Country', value: (row) => row.country_code }, { label: 'Status', value: (row) => row.is_active ? 'Active' : 'Inactive' }]} />;
