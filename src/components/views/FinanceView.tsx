import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowDownToLine, Banknote, CheckCircle2, CircleDollarSign, Clock3, Eye, FilePlus2, Loader2, Plus, Printer, ReceiptText, Search, ShieldCheck, TriangleAlert, Upload, WalletCards, X } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { Language } from '../../types';
import { cn } from '../../lib/cn';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { DataTable } from '../ui/DataTable';
import { InlineDataState } from '../ui/InlineDataState';
import { api, type ApiUser } from '../../services/api';
import { useApiList } from '../../hooks/useApiList';
import { ARCHIVE, DocumentUploadCard } from './LoadDocumentsPanel';
import { LoadSelect, type LoadSelectOption } from '../load/LoadSelect';

type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
type Invoice = {
  databaseId: number; loadId: number | null; id: string; company: string; customer: string; route: string;
  issued: string; issuedRaw: string; paidRaw: string; due: string; dueRaw: string; amount: number; currency: string; status: InvoiceStatus;
};

const statusTone: Record<InvoiceStatus, string> = {
  Draft: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  Sent: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  Paid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  Overdue: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
  Cancelled: 'bg-slate-500/10 text-slate-400 line-through',
};

const COPY = {
  en: {
    title: 'Finance', subtitle: 'Live company invoices, balances and payment activity.', access: 'Finance access', newInvoice: 'New invoice', uploadInvoice: 'Upload invoice', export: 'Export',
    total: 'Total invoices', paid: 'Paid invoices', unpaid: 'Unpaid balance', overdue: 'Overdue balance', cashFlow: 'Cash flow (30 days)', uploaded: 'Uploaded invoices', linkedLoads: 'Linked loads',
    quick: 'Quick access', generate: 'Create invoice', generateSub: 'Generate an A4 invoice for a load', uploadSub: 'Add a received invoice to documents', reports: 'Reports', reportsSub: 'Download the current finance report', overview: 'Quick overview', allInvoices: 'All invoices',
    recent: 'Recent invoices', search: 'Search invoice, company or route…', all: 'All', invoice: 'Invoice', company: 'Company', customer: 'Customer / supplier', route: 'Route', due: 'Due date', amount: 'Amount', status: 'Status', action: 'Action',
    details: 'Invoice details', issueDate: 'Issue date', load: 'Load', download: 'Open A4 invoice', markPaid: 'Mark paid', reconciled: 'Reconciled', noInvoices: 'No invoices found.', nextDue: 'Next payment deadline', noUpcoming: 'No unpaid invoices with an upcoming deadline.', viewDetails: 'View details', selectLoad: 'Select a load', selectLoadSub: 'The existing A4 invoice method will open the invoice for this load.', openInvoice: 'Open A4 invoice', uploadTitle: 'Upload invoice', uploadTitleSub: 'Uses the same secure upload and archive as Documents.', archive: 'Company archive (no load)', close: 'Close', failed: 'The invoice could not be opened.',
    statuses: { Draft: 'Draft', Sent: 'Sent', Paid: 'Paid', Overdue: 'Overdue', Cancelled: 'Cancelled' },
  },
  bs: {
    title: 'Finansije', subtitle: 'Fakture, stanja i aktivnosti plaćanja kompanije uživo.', access: 'Pristup finansijama', newInvoice: 'Nova faktura', uploadInvoice: 'Upload fakture', export: 'Izvoz',
    total: 'Ukupne fakture', paid: 'Plaćene fakture', unpaid: 'Neplaćeni iznos', overdue: 'Dospjeli iznos', cashFlow: 'Cash flow (30 dana)', uploaded: 'Uploadovane fakture', linkedLoads: 'Povezani tereti',
    quick: 'Brzi pristup', generate: 'Kreiraj fakturu', generateSub: 'Generiši A4 fakturu za teret', uploadSub: 'Dodaj primljenu fakturu u dokumente', reports: 'Izvještaji', reportsSub: 'Preuzmi trenutni finansijski izvještaj', overview: 'Brzi pregled', allInvoices: 'Sve fakture',
    recent: 'Nedavne fakture', search: 'Pretraži fakturu, kompaniju ili rutu…', all: 'Sve', invoice: 'Faktura', company: 'Kompanija', customer: 'Kupac / dobavljač', route: 'Ruta', due: 'Rok plaćanja', amount: 'Iznos', status: 'Status', action: 'Akcija',
    details: 'Detalji fakture', issueDate: 'Datum izdavanja', load: 'Teret', download: 'Otvori A4 fakturu', markPaid: 'Označi plaćeno', reconciled: 'Usklađeno', noInvoices: 'Nema pronađenih faktura.', nextDue: 'Sljedeći rok plaćanja', noUpcoming: 'Nema neplaćenih faktura s predstojećim rokom.', viewDetails: 'Pogledaj detalje', selectLoad: 'Odaberi teret', selectLoadSub: 'Postojeća metoda za A4 fakturu će otvoriti račun za ovaj teret.', openInvoice: 'Otvori A4 fakturu', uploadTitle: 'Upload fakture', uploadTitleSub: 'Koristi isti sigurni upload i arhivu kao Dokumenti.', archive: 'Arhiva kompanije (bez tereta)', close: 'Zatvori', failed: 'Fakturu nije moguće otvoriti.',
    statuses: { Draft: 'Nacrt', Sent: 'Poslano', Paid: 'Plaćeno', Overdue: 'Dospjelo', Cancelled: 'Otkazano' },
  },
  de: {
    title: 'Finanzen', subtitle: 'Live-Unternehmensrechnungen, Salden und Zahlungsaktivitäten.', access: 'Finanzzugriff', newInvoice: 'Neue Rechnung', uploadInvoice: 'Rechnung hochladen', export: 'Exportieren',
    total: 'Rechnungen gesamt', paid: 'Bezahlte Rechnungen', unpaid: 'Offener Betrag', overdue: 'Überfälliger Betrag', cashFlow: 'Cashflow (30 Tage)', uploaded: 'Hochgeladene Rechnungen', linkedLoads: 'Verknüpfte Ladungen',
    quick: 'Schnellzugriff', generate: 'Rechnung erstellen', generateSub: 'A4-Rechnung für eine Ladung erzeugen', uploadSub: 'Eingangsrechnung in Dokumente ablegen', reports: 'Berichte', reportsSub: 'Aktuellen Finanzbericht herunterladen', overview: 'Schnellübersicht', allInvoices: 'Alle Rechnungen',
    recent: 'Letzte Rechnungen', search: 'Rechnung, Unternehmen oder Route suchen…', all: 'Alle', invoice: 'Rechnung', company: 'Unternehmen', customer: 'Kunde / Lieferant', route: 'Route', due: 'Fälligkeitsdatum', amount: 'Betrag', status: 'Status', action: 'Aktion',
    details: 'Rechnungsdetails', issueDate: 'Ausstellungsdatum', load: 'Ladung', download: 'A4-Rechnung öffnen', markPaid: 'Als bezahlt markieren', reconciled: 'Abgeglichen', noInvoices: 'Keine Rechnungen gefunden.', nextDue: 'Nächste Zahlungsfrist', noUpcoming: 'Keine unbezahlten Rechnungen mit anstehender Frist.', viewDetails: 'Details anzeigen', selectLoad: 'Ladung auswählen', selectLoadSub: 'Die vorhandene A4-Rechnungsmethode öffnet die Rechnung für diese Ladung.', openInvoice: 'A4-Rechnung öffnen', uploadTitle: 'Rechnung hochladen', uploadTitleSub: 'Verwendet denselben sicheren Upload und dasselbe Archiv wie Dokumente.', archive: 'Unternehmensarchiv (ohne Ladung)', close: 'Schließen', failed: 'Die Rechnung konnte nicht geöffnet werden.',
    statuses: { Draft: 'Entwurf', Sent: 'Gesendet', Paid: 'Bezahlt', Overdue: 'Überfällig', Cancelled: 'Storniert' },
  },
} as const;

const dateLocale = (lang: Language) => lang === 'bs' ? 'bs-BA' : lang === 'de' ? 'de-DE' : 'en-GB';
const formatMoney = (value: number, currency = 'EUR', lang: Language = 'en') => new Intl.NumberFormat(dateLocale(lang), { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
const parseDate = (value: unknown) => { const date = value ? new Date(String(value)) : null; return date && !Number.isNaN(date.getTime()) ? date : null; };

const FinanceModal = ({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) => (
  <div className="fixed inset-0 z-[220] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm">
    <button type="button" className="absolute inset-0 cursor-pointer" aria-label="Close" onClick={onClose} />
    <section role="dialog" aria-modal="true" className="relative my-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
      <header className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800"><div><h2 className="text-xl font-black dark:text-white">{title}</h2><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div><button type="button" onClick={onClose} className="cursor-pointer rounded-xl bg-slate-100 p-2 text-slate-500 dark:bg-slate-800"><X className="h-5 w-5" /></button></header>
      <div className="p-5">{children}</div>
    </section>
  </div>
);

export const FinanceView = ({ lang }: { lang: Language }) => {
  const copy = COPY[lang === 'bs' || lang === 'de' ? lang : 'en'];
  const result = useApiList(api.invoices.list, { per_page: 500 });
  const loadsResult = useApiList(api.loads.list, { per_page: 500 });
  const invoiceDocuments = useApiList(api.documents.list, { type: 'INVOICE', per_page: 500 });
  const [user, setUser] = useState<ApiUser | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'All' | InvoiceStatus>('All');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [uploadLoadId, setUploadLoadId] = useState<string>(ARCHIVE);
  const [invoiceLoadId, setInvoiceLoadId] = useState('');
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => { void api.auth.me().then(setUser); }, []);
  const isElevatedAdmin = user?.role?.name === 'superadmin' || user?.role?.name === 'master';
  const companyIds = useMemo(() => new Set((user?.companies || []).map((company) => Number(company.id))), [user?.companies]);
  const scopedInvoiceRows = useMemo(() => isElevatedAdmin ? result.items : result.items.filter((row) => companyIds.has(Number(row.company_id))), [companyIds, isElevatedAdmin, result.items]);
  const scopedLoadRows = useMemo(() => isElevatedAdmin ? loadsResult.items : loadsResult.items.filter((row) => companyIds.has(Number(row.company_id))), [companyIds, isElevatedAdmin, loadsResult.items]);

  const invoices = useMemo<Invoice[]>(() => scopedInvoiceRows.map((row) => {
    const load = (row.freight_load || {}) as Record<string, unknown>;
    const stops = Array.isArray(load.stops) ? load.stops as Array<Record<string, unknown>> : [];
    const rawStatus = String(row.status || 'draft').toLowerCase();
    const dueDate = parseDate(row.due_at); const issuedDate = parseDate(row.issued_at); const paidDate = parseDate(row.paid_at);
    const paid = rawStatus === 'paid' || paidDate !== null;
    const overdue = !paid && rawStatus !== 'cancelled' && dueDate !== null && dueDate.getTime() < new Date().setHours(0, 0, 0, 0);
    const mappedStatus: InvoiceStatus = paid ? 'Paid' : rawStatus === 'cancelled' ? 'Cancelled' : overdue || rawStatus === 'overdue' ? 'Overdue' : rawStatus === 'draft' ? 'Draft' : 'Sent';
    const company = (row.company || {}) as Record<string, unknown>; const customer = (row.customer || {}) as Record<string, unknown>;
    const route = [stops[0]?.city, stops.at(-1)?.city].filter(Boolean).map(String).join(' → ');
    return { databaseId: Number(row.id), loadId: row.load_id == null ? null : Number(row.load_id), id: String(row.number || row.id), company: String(company.name || '—'), customer: String(customer.name || customer.email || '—'), route: route || '—', issued: issuedDate ? new Intl.DateTimeFormat(dateLocale(lang)).format(issuedDate) : '—', issuedRaw: issuedDate?.toISOString() || '', paidRaw: paidDate?.toISOString() || '', due: dueDate ? new Intl.DateTimeFormat(dateLocale(lang)).format(dueDate) : '—', dueRaw: dueDate?.toISOString() || '', amount: Number(row.total || 0), currency: String(row.currency || 'EUR'), status: mappedStatus };
  }), [lang, scopedInvoiceRows]);

  const selected = invoices.find((invoice) => invoice.databaseId === selectedId) || invoices[0] || null;
  const filteredInvoices = useMemo(() => { const normalized = query.trim().toLowerCase(); return invoices.filter((invoice) => `${invoice.id} ${invoice.company} ${invoice.customer} ${invoice.route}`.toLowerCase().includes(normalized) && (status === 'All' || invoice.status === status)); }, [invoices, query, status]);
  const activeInvoices = invoices.filter((invoice) => invoice.status !== 'Cancelled');
  const paidInvoices = activeInvoices.filter((invoice) => invoice.status === 'Paid');
  const unpaidInvoices = activeInvoices.filter((invoice) => invoice.status !== 'Paid');
  const overdueInvoices = activeInvoices.filter((invoice) => invoice.status === 'Overdue');
  const nextDueInvoice = [...unpaidInvoices].filter((invoice) => invoice.dueRaw).sort((left, right) => left.dueRaw.localeCompare(right.dueRaw))[0] || null;
  const sum = (rows: Invoice[]) => rows.reduce((total, invoice) => total + invoice.amount, 0);
  const loadOptions = useMemo<LoadSelectOption[]>(() => scopedLoadRows.map((load) => { const stops = Array.isArray(load.stops) ? load.stops as Array<Record<string, unknown>> : []; const route = [stops[0]?.city, stops.at(-1)?.city].filter(Boolean).map(String).join(' → '); return { id: String(load.id), label: `${String(load.public_id || load.title || `Load ${load.id}`)}${route ? ` · ${route}` : ''}` }; }), [scopedLoadRows]);
  const scopedLoadIds = useMemo(() => new Set(scopedLoadRows.map((load) => Number(load.id))), [scopedLoadRows]);
  const uploadedInvoiceCount = isElevatedAdmin ? invoiceDocuments.total : invoiceDocuments.items.filter((document) => scopedLoadIds.has(Number(document.load_id)) || Number(document.uploaded_by_user_id) === Number(user?.id)).length;
  const cashFlowData = useMemo(() => Array.from({ length: 30 }, (_, offset) => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (29 - offset)); const key = date.toISOString().slice(0, 10); return { key, day: date.toLocaleDateString(dateLocale(lang), { day: '2-digit', month: '2-digit' }), value: paidInvoices.filter((invoice) => invoice.paidRaw.slice(0, 10) === key).reduce((total, invoice) => total + invoice.amount, 0) }; }), [lang, paidInvoices]);
  const cashFlow = cashFlowData.reduce((total, day) => total + day.value, 0);

  const exportInvoices = () => { const rows = [['Invoice', 'Company', 'Customer', 'Route', 'Issued', 'Due', 'Amount', 'Currency', 'Status'], ...filteredInvoices.map((invoice) => [invoice.id, invoice.company, invoice.customer, invoice.route, invoice.issued, invoice.due, String(invoice.amount), invoice.currency, copy.statuses[invoice.status]])]; const blob = new Blob([rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'freightbook-finance.csv'; link.click(); URL.revokeObjectURL(url); };
  const markPaid = async (invoice: Invoice) => { setActionError(''); try { await api.invoices.update(invoice.databaseId, { status: 'paid', paid_at: new Date().toISOString() }); await result.refresh(); } catch (error) { setActionError(error instanceof Error ? error.message : copy.failed); } };
  const openA4Invoice = async (loadId: number | string | null) => { if (!loadId || invoiceLoading) return; setInvoiceLoading(true); setActionError(''); try { await api.loadInvoice(loadId, 'a4-faktura'); setGeneratorOpen(false); } catch (error) { setActionError(error instanceof Error ? error.message : copy.failed); } finally { setInvoiceLoading(false); } };
  const showGenerator = () => { setInvoiceLoadId(selected?.loadId ? String(selected.loadId) : loadOptions[0]?.id || ''); setActionError(''); setGeneratorOpen(true); };
  const metrics = [
    { label: copy.total, value: formatMoney(sum(activeInvoices), 'EUR', lang), icon: ReceiptText, tone: 'text-sky-500 bg-sky-500/10' },
    { label: copy.paid, value: formatMoney(sum(paidInvoices), 'EUR', lang), icon: CheckCircle2, tone: 'text-emerald-500 bg-emerald-500/10' },
    { label: copy.unpaid, value: formatMoney(sum(unpaidInvoices), 'EUR', lang), icon: WalletCards, tone: 'text-rose-500 bg-rose-500/10' },
    { label: copy.overdue, value: formatMoney(sum(overdueInvoices), 'EUR', lang), icon: TriangleAlert, tone: 'text-amber-500 bg-amber-500/10' },
    { label: copy.cashFlow, value: formatMoney(cashFlow, 'EUR', lang), icon: Banknote, tone: 'text-violet-500 bg-violet-500/10' },
    { label: copy.uploaded, value: uploadedInvoiceCount, icon: Upload, tone: 'text-cyan-500 bg-cyan-500/10' },
  ];

  return <div className="space-y-3">
    <PageHeader icon={CircleDollarSign} title={copy.title} subtitle={copy.subtitle} badge={<span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400"><ShieldCheck className="h-3.5 w-3.5" />{copy.access}</span>} actions={<><Button size="sm" variant="outline" onClick={() => { setActionError(''); setUploadOpen(true); }} className="gap-1.5"><Upload className="h-4 w-4" />{copy.uploadInvoice}</Button><Button size="sm" onClick={showGenerator} className="gap-1.5"><Plus className="h-4 w-4" />{copy.newInvoice}</Button></>} stats={metrics} />

    <section className="grid gap-3 xl:grid-cols-12">
      <Card className="shadow-none xl:col-span-7" contentClassName="flex h-full flex-col p-4"><p className="text-sm font-black text-slate-900 dark:text-white">{copy.quick}</p><div className="mt-3 grid gap-3 md:grid-cols-3">
        <button type="button" onClick={() => setUploadOpen(true)} className="cursor-pointer rounded-xl border border-slate-200 p-4 text-left transition hover:border-primary hover:bg-primary/5 dark:border-slate-800"><Upload className="h-5 w-5 text-primary" /><p className="mt-3 text-sm font-black dark:text-white">{copy.uploadInvoice}</p><p className="mt-1 text-xs text-slate-500">{copy.uploadSub}</p></button>
        <button type="button" onClick={showGenerator} className="cursor-pointer rounded-xl border border-slate-200 p-4 text-left transition hover:border-primary hover:bg-primary/5 dark:border-slate-800"><FilePlus2 className="h-5 w-5 text-primary" /><p className="mt-3 text-sm font-black dark:text-white">{copy.generate}</p><p className="mt-1 text-xs text-slate-500">{copy.generateSub}</p></button>
        <button type="button" onClick={exportInvoices} className="cursor-pointer rounded-xl border border-slate-200 p-4 text-left transition hover:border-primary hover:bg-primary/5 dark:border-slate-800"><ArrowDownToLine className="h-5 w-5 text-primary" /><p className="mt-3 text-sm font-black dark:text-white">{copy.reports}</p><p className="mt-1 text-xs text-slate-500">{copy.reportsSub}</p></button>
      </div><div className="mt-auto border-t border-slate-100 pt-3 dark:border-slate-800">{nextDueInvoice ? <button type="button" onClick={() => setSelectedId(nextDueInvoice.databaseId)} className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-amber-500/10 px-3 py-2.5 text-left transition hover:bg-amber-500/15"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white"><Clock3 className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-slate-900 dark:text-white">{nextDueInvoice.id} · {nextDueInvoice.company}</span><span className="block text-[11px] font-semibold text-amber-700 dark:text-amber-400">{copy.due}: {nextDueInvoice.due}</span></span><span className="shrink-0 text-right"><strong className="block text-sm text-slate-900 dark:text-white">{formatMoney(nextDueInvoice.amount, nextDueInvoice.currency, lang)}</strong><span className="text-[10px] font-bold text-primary">{copy.viewDetails}</span></span></button> : <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="h-4 w-4" />{copy.noUpcoming}</div>}</div></Card>
      <Card className="shadow-none xl:col-span-5" contentClassName="p-4"><div className="flex items-center justify-between"><p className="text-sm font-black dark:text-white">{copy.overview}</p><span className="text-xs font-bold text-primary">{copy.cashFlow}</span></div><div className="mt-2 h-[132px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={cashFlowData} margin={{ top: 8, right: 5, left: -30, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.3} vertical={false} /><XAxis dataKey="day" minTickGap={28} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip formatter={(value) => formatMoney(Number(value), 'EUR', lang)} contentStyle={{ borderRadius: 10, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 11 }} /><Line type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={2.5} dot={false} /></LineChart></ResponsiveContainer></div><div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-3 text-center dark:border-slate-800">{[[activeInvoices.length, copy.allInvoices], [paidInvoices.length, copy.statuses.Paid], [unpaidInvoices.length, copy.unpaid], [overdueInvoices.length, copy.statuses.Overdue]].map(([value, label]) => <div key={String(label)}><p className="text-base font-black dark:text-white">{value}</p><p className="truncate text-[9px] font-bold uppercase text-slate-400">{label}</p></div>)}</div></Card>
    </section>

    <section className="grid min-w-0 gap-3 xl:grid-cols-12">
      <Card className="min-w-0 shadow-none xl:col-span-9" contentClassName="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800"><div><p className="text-sm font-black dark:text-white">{copy.recent}</p><p className="text-xs text-slate-500">{filteredInvoices.length} / {invoices.length}</p></div><div className="flex flex-wrap gap-1">{(['All', 'Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'] as const).map((option) => <button key={option} type="button" onClick={() => setStatus(option)} className={cn('cursor-pointer rounded-lg px-2.5 py-1.5 text-[11px] font-bold', status === option ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800')}>{option === 'All' ? copy.all : copy.statuses[option]}</button>)}</div></div>
        <div className="p-3"><label className="relative block max-w-md"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[13px] outline-none focus:border-primary dark:border-slate-800 dark:bg-slate-950 dark:text-white" /></label></div>
        {result.loading || result.error ? <InlineDataState loading={result.loading} error={result.error} empty={copy.noInvoices} onRetry={result.refresh} /> : <div className="overflow-x-auto"><DataTable className="min-w-[850px] text-[13px]"><thead><tr className="border-y border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-slate-800"><th className="px-3 py-2">{copy.invoice}</th><th className="px-3 py-2">{copy.company}</th><th className="px-3 py-2">{copy.customer}</th><th className="px-3 py-2">{copy.route}</th><th className="px-3 py-2">{copy.due}</th><th className="px-3 py-2">{copy.amount}</th><th className="px-3 py-2">{copy.status}</th><th className="px-3 py-2 text-right">{copy.action}</th></tr></thead><tbody>{filteredInvoices.map((invoice) => <tr key={invoice.databaseId} onClick={() => setSelectedId(invoice.databaseId)} className={cn('cursor-pointer border-b border-slate-50 transition hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40', selected?.databaseId === invoice.databaseId && 'bg-primary/5')}><td className="px-3 py-3 font-black text-primary">{invoice.id}<span className="mt-0.5 block text-[10px] font-normal text-slate-400">{invoice.issued}</span></td><td className="px-3 py-3 font-semibold dark:text-white">{invoice.company}</td><td className="px-3 py-3 text-slate-500">{invoice.customer}</td><td className="px-3 py-3 text-slate-500">{invoice.route}</td><td className="px-3 py-3 text-slate-500"><span className="flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{invoice.due}</span></td><td className="px-3 py-3 font-black dark:text-white">{formatMoney(invoice.amount, invoice.currency, lang)}</td><td className="px-3 py-3"><span className={cn('rounded-full px-2 py-1 text-[10px] font-bold', statusTone[invoice.status])}>{copy.statuses[invoice.status]}</span></td><td className="px-3 py-3 text-right"><button type="button" title={copy.details} onClick={(event) => { event.stopPropagation(); setSelectedId(invoice.databaseId); }} className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-primary dark:hover:bg-slate-800"><Eye className="h-4 w-4" /></button></td></tr>)}</tbody></DataTable>{filteredInvoices.length === 0 && <p className="py-8 text-center text-sm text-slate-500">{copy.noInvoices}</p>}</div>}
      </Card>
      <Card className="shadow-none xl:col-span-3" contentClassName="p-4"><p className="text-sm font-black dark:text-white">{copy.details}</p>{selected ? <div className="mt-4"><div className="flex items-start justify-between gap-2"><div><p className="font-black text-primary">{selected.id}</p><p className="mt-1 text-xs text-slate-500">{selected.route}</p></div><span className={cn('rounded-full px-2 py-1 text-[10px] font-bold', statusTone[selected.status])}>{copy.statuses[selected.status]}</span></div><dl className="mt-5 space-y-3">{[[copy.company, selected.company], [copy.customer, selected.customer], [copy.amount, formatMoney(selected.amount, selected.currency, lang)], [copy.issueDate, selected.issued], [copy.due, selected.due], [copy.load, selected.loadId ? String(selected.loadId) : '—']].map(([label, value]) => <div key={label} className="flex justify-between gap-3 text-xs"><dt className="text-slate-500">{label}</dt><dd className="text-right font-bold text-slate-800 dark:text-white">{value}</dd></div>)}</dl><div className="mt-5 space-y-2"><Button className="w-full gap-2" disabled={!selected.loadId || invoiceLoading} onClick={() => void openA4Invoice(selected.loadId)}>{invoiceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}{copy.download}</Button>{selected.status !== 'Paid' && selected.status !== 'Cancelled' && <Button variant="outline" className="w-full gap-2" onClick={() => void markPaid(selected)}><CheckCircle2 className="h-4 w-4" />{copy.markPaid}</Button>}{selected.status === 'Paid' && <p className="text-center text-xs font-bold text-emerald-600">{copy.reconciled}</p>}{actionError && !generatorOpen && <p className="rounded-lg bg-rose-500/10 p-2 text-xs font-semibold text-rose-600">{actionError}</p>}</div></div> : <p className="py-10 text-center text-sm text-slate-500">{copy.noInvoices}</p>}</Card>
    </section>

    {generatorOpen && <FinanceModal title={copy.selectLoad} subtitle={copy.selectLoadSub} onClose={() => setGeneratorOpen(false)}><div className="space-y-4"><LoadSelect value={invoiceLoadId} onChange={setInvoiceLoadId} options={loadOptions} searchPlaceholder={copy.search} noResults={copy.noInvoices} />{actionError && <p className="rounded-xl bg-rose-500/10 p-3 text-sm font-semibold text-rose-600">{actionError}</p>}<div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setGeneratorOpen(false)}>{copy.close}</Button><Button disabled={!invoiceLoadId || invoiceLoading} onClick={() => void openA4Invoice(invoiceLoadId)} className="gap-2">{invoiceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}{copy.openInvoice}</Button></div></div></FinanceModal>}
    {uploadOpen && <FinanceModal title={copy.uploadTitle} subtitle={copy.uploadTitleSub} onClose={() => setUploadOpen(false)}><div className="space-y-3"><LoadSelect value={uploadLoadId} onChange={setUploadLoadId} options={loadOptions} archiveLabel={copy.archive} searchPlaceholder={copy.search} noResults={copy.noInvoices} /><DocumentUploadCard lang={lang} attachTo={uploadLoadId} defaultType="INVOICE" lockType onUploaded={async () => { await invoiceDocuments.refresh(); setUploadOpen(false); }} /></div></FinanceModal>}
  </div>;
};
