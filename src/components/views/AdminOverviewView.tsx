import { Activity, Boxes, Building2, Crown, PackageCheck, ReceiptText, ShieldCheck, Truck, Users, Warehouse } from 'lucide-react';
import { useApiList } from '../../hooks/useApiList';
import { api } from '../../services/api';
import { Language } from '../../types';
import { Card } from '../ui/Card';
import { HeaderStatCard, PageHeader } from '../ui/PageHeader';
import { InlineDataState } from '../ui/InlineDataState';

const page = { per_page: 100 };

export const AdminOverviewView = ({ lang: _lang }: { lang: Language }) => {
  const companies = useApiList(api.companies.list, page);
  const customers = useApiList(api.customers.list, { limit: 1 });
  const drivers = useApiList(api.drivers.list, page);
  const loads = useApiList(api.loads.list, page);
  const vehicles = useApiList(api.vehicles.list, page);
  const invoices = useApiList(api.invoices.list, page);
  const events = useApiList(api.trackingEvents.list, { per_page: 10 });
  const warehouses = useApiList(api.warehouses.list, page);
  const sources = [companies, customers, drivers, loads, vehicles, invoices, events, warehouses];
  const loading = sources.some((source) => source.loading);
  const error = sources.find((source) => source.error)?.error;
  const loadsInTransit = loads.items.filter((load) => String(load.status).toLowerCase() === 'in_delivery');
  const loadsInExchange = loads.items.filter((load) => String(load.status).toLowerCase() === 'posted');
  const openInvoices = invoices.items.filter((invoice) => String(invoice.status).toLowerCase() !== 'paid');
  const totalWarehouseCapacity = warehouses.items.reduce((total, warehouse) => total + Number(warehouse.total_capacity_pallets || 0), 0);
  const pendingWarehouses = warehouses.items.filter((warehouse) => String(warehouse.status).toLowerCase() === 'pending');

  const headerStats = [
    { label: 'Logistics companies', value: loading ? '—' : companies.total, icon: Building2, tone: 'bg-violet-500/10 text-violet-500' },
    { label: 'Warehouse companies', value: loading ? '—' : warehouses.total, icon: Warehouse, tone: 'bg-orange-500/10 text-orange-500' },
    { label: 'Drivers', value: loading ? '—' : drivers.total, icon: Users, tone: 'bg-sky-500/10 text-sky-500' },
    { label: 'Customers', value: loading ? '—' : customers.total, icon: Users, tone: 'bg-fuchsia-500/10 text-fuchsia-500' },
    { label: 'In transit', value: loading ? '—' : loadsInTransit.length, icon: PackageCheck, tone: 'bg-cyan-500/10 text-cyan-500' },
    { label: 'In exchange', value: loading ? '—' : loadsInExchange.length, icon: Boxes, tone: 'bg-emerald-500/10 text-emerald-500' },
    { label: 'Tracking events', value: loading ? '—' : events.total, icon: Activity, tone: 'bg-primary/10 text-primary' },
    { label: 'Open invoices', value: loading ? '—' : openInvoices.length, icon: ReceiptText, tone: 'bg-amber-500/10 text-amber-500' },
  ];

  const operationsStats = [
    { label: 'Warehouse capacity', value: loading ? '—' : `${totalWarehouseCapacity.toLocaleString()} pal.`, icon: Warehouse, tone: 'bg-orange-500/10 text-orange-500' },
    { label: 'Pending warehouses', value: loading ? '—' : pendingWarehouses.length, icon: ShieldCheck, tone: 'bg-amber-500/10 text-amber-500' },
    { label: 'Fleet vehicles', value: loading ? '—' : vehicles.total, icon: Truck, tone: 'bg-sky-500/10 text-sky-500' },
    { label: 'Database resources', value: loading ? '—' : sources.length, icon: ShieldCheck, tone: 'bg-emerald-500/10 text-emerald-500' },
  ];

  return <div className="space-y-3">
    <PageHeader
      icon={Crown}
      title="Platform Command Center"
      subtitle="Live visibility across logistics and warehouse operations stored in Freightbook.ai."
      badge={<span className="flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400"><ShieldCheck className="h-3.5 w-3.5" /> DATABASE CONNECTED</span>}
      stats={headerStats}
    />

    {error ? (
      <Card><InlineDataState loading={false} error={error} empty="" onRetry={() => sources.forEach((source) => void source.refresh())} /></Card>
    ) : <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {operationsStats.map((metric) => <HeaderStatCard key={metric.label} {...metric} />)}
      </section>

      <div className="grid gap-3 xl:grid-cols-12">
        <Card className="shadow-none xl:col-span-8" contentClassName="p-4">
          <p className="text-sm font-black dark:text-white">Company operations</p>
          {companies.loading || companies.items.length === 0 ? (
            <InlineDataState loading={companies.loading} error={companies.error} empty="No companies in the database yet." onRetry={companies.refresh} />
          ) : (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead><tr className="border-b border-slate-200 text-[11px] uppercase text-slate-500 dark:border-slate-800"><th className="p-2">Company</th><th className="p-2">Country</th><th className="p-2">Fleet</th><th className="p-2">Plan</th><th className="p-2">Status</th></tr></thead>
                <tbody>{companies.items.map((company) => <tr key={String(company.id)} className="border-b border-slate-100 dark:border-slate-800"><td className="p-2 text-sm font-bold dark:text-white">{String(company.name || '')}</td><td className="p-2 text-xs">{String(company.country_code || '—')}</td><td className="p-2 text-xs">{Array.isArray(company.vehicles) ? company.vehicles.length : 0}</td><td className="p-2 text-xs">{String(company.plan || '—')}</td><td className="p-2 text-xs">{String(company.status || '—')}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="shadow-none xl:col-span-4" contentClassName="p-4">
          <p className="text-sm font-black dark:text-white">Latest tracking events</p>
          {events.loading || events.items.length === 0 ? (
            <InlineDataState loading={events.loading} error={events.error} empty="No tracking events yet." onRetry={events.refresh} />
          ) : (
            <div className="mt-2 space-y-2">{events.items.map((event) => <div key={String(event.id)} className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950"><p className="text-xs font-bold dark:text-white">{String(event.title || event.status || 'Tracking event')}</p><p className="text-[11px] text-slate-500">{String(event.location || '')}</p></div>)}</div>
          )}
        </Card>
      </div>
    </>}
  </div>;
};
