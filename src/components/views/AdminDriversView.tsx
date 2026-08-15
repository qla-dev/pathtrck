import { UserRoundSearch } from 'lucide-react';
import { api } from '../../services/api';
import { Language } from '../../types';
import { ApiRegistryView } from './ApiRegistryView';
export const AdminDriversView = ({ lang: _lang }: { lang: Language }) => <ApiRegistryView eyebrow="Global workforce" title="All Drivers" description="Driver profiles and company relations loaded from Laravel." icon={UserRoundSearch} request={api.drivers.list} empty="No driver profiles in the database." columns={[{ label: 'Driver', value: (row) => (row.user as { name?: string } | undefined)?.name }, { label: 'Company', value: (row) => (row.primary_company as { name?: string } | undefined)?.name }, { label: 'License', value: (row) => row.license_number }, { label: 'Country', value: (row) => row.license_country_code }, { label: 'Availability', value: (row) => row.availability_status }, { label: 'Trips', value: (row) => row.completed_trips }]} />;
