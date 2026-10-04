import { useMemo, useState } from 'react';
import { BookCheck, BookOpen, Building2, Clock3, FilePlus2, HandCoins, Plus, ReceiptText, RefreshCw, ShieldCheck, Truck, WalletCards } from 'lucide-react';

import type { Language } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { IconSelect } from '../ui/IconSelect';
import { InlineDataState } from '../ui/InlineDataState';
import { Notice } from '../ui/Notice';
import { PageHeader, type PageHeaderStat } from '../ui/PageHeader';
import { AccountingForm } from './accounting/AccountingForm';
import { InvoiceDetail } from './accounting/InvoiceDetail';
import { InvoiceEditor } from './accounting/InvoiceEditor';
import { InvoiceList } from './accounting/InvoiceList';
import { AccountsPanel, AdvancesPanel, BankPanel, JournalPanel, MarginsPanel, NotConfigured, PartnersPanel, PeriodsPanel, PermissionsPanel, ReportsPanel, RulesPanel, SettingsPanel, VatPanel } from './accounting/LedgerPanels';
import { PosTerminal } from './accounting/PosTerminal';
import { money, type Row, today, useAccounting } from './accounting/shared';
import { SmartPosReports } from './SmartPosReports';

const sumBy = (rows: Row[], pick: (r: Row) => unknown) => Object.entries(rows.reduce<Record<string, number>>((acc, r) => { acc[r.currency] = (acc[r.currency] || 0) + Number(pick(r) || 0); return acc; }, {})).map(([c, v]) => money(v, c)).join(' · ') || money(0);

// Smart POS (mode="pos") owns outgoing invoices and fiscalisation; Accounting keeps incoming invoices and the books.
export function AccountingView({ lang, mode = 'accounting' }: { lang: Language; mode?: 'accounting' | 'pos' }) {
  const pos = mode === 'pos';
  const acc = useAccounting(lang);
  const { t, companies, company, setCompany, context, data, loading, busy, error, can, run, refresh, send } = acc;
  const [tab, setTab] = useState(pos ? 'outgoing' : 'incoming');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formName, setFormName] = useState(''); const [form, setForm] = useState<Row>({});
  const [draft, setDraft] = useState<Row | null>(null);
  const [terminal, setTerminal] = useState(false);
  const selected = data.invoices.find(i => i.id === selectedId);
  const openForm = (name: string, defaults: Row = {}) => { acc.setError(''); setForm(defaults); setFormName(name); };
  const editInvoice = (invoice?: Row) => { acc.setError(''); setDraft(invoice
    ? { ...invoice, document_ids: invoice.documents.map((d: Row) => d.id), items: invoice.items.map((i: Row) => ({ ...i, allocations: invoice.allocations.filter((a: Row) => a.invoice_item_id === i.id) })) }
    : { direction: tab, currency: data.settings?.base_currency || 'BAM', document_ids: [], items: [], issued_at: today(), event_date: today(), tax_date: today(), posting_date: today() }); };
  const saveInvoice = () => draft && void run(async () => {
    const payload = { ...draft, items: draft.items.map((i: Row) => ({ ...i, account_id: i.account_id || null, tax_rule_id: i.tax_rule_id || null, workspace_id: i.workspace_id || null,
      ...(i.allocations?.length ? { allocations: i.allocations.map((a: Row) => ({ ...a, workspace_id: a.workspace_id || null, estimate_id: a.estimate_id || null })) } : { allocations: undefined }) })) };
    const r = await send(draft.id ? `invoices/${draft.id}` : 'invoices', payload, draft.id ? 'PUT' : 'POST'); setSelectedId(Number(r.data.id)); setDraft(null);
  });

  const tabs = pos
    ? [...(can('view') ? ['outgoing'] : []), ...(can('pos') ? ['fiscalReports'] : [])]
    : [...(can('view') ? ['incoming', 'journal', 'bank', 'advances', 'vat', 'accounts', 'periods', 'rules', 'margins', 'partners', 'reports'] : []), ...(can('setup') ? ['settings'] : [])];
  if (context?.can_manage_permissions) tabs.push('permissions');
  const activeTab = tabs.includes(tab) ? tab : tabs[0];

  const stats = useMemo<PageHeaderStat[]>(() => {
    const own = data.invoices.filter(i => i.direction === (pos ? 'outgoing' : 'incoming') && !i.corrects_invoice_id);
    if (pos) {
      const todays = own.filter(i => i.fiscal_status === 'fiscalised' && String(i.fiscalised_at ?? '').slice(0, 10) === today());
      return [
        { label: t('kpi_today'), value: sumBy(todays, i => i.total), icon: HandCoins, tone: 'bg-emerald-500/10 text-emerald-500' },
        { label: t('kpi_receipts'), value: todays.length, icon: ReceiptText, tone: 'bg-violet-500/10 text-violet-500' },
        { label: t('kpi_unfiscalised'), value: own.filter(i => i.issuance_status === 'issued' && ['none', 'failed', null, undefined].includes(i.fiscal_status)).length, icon: Clock3, tone: 'bg-amber-500/10 text-amber-500' },
        { label: t('kpi_receivable'), value: sumBy(own.filter(i => i.posting_status === 'posted'), i => i.remaining_amount), icon: WalletCards, tone: 'bg-sky-500/10 text-sky-500' },
      ];
    }
    return [
      { label: t('kpi_pending'), value: own.filter(i => i.approval_status === 'pending').length, icon: Clock3, tone: 'bg-amber-500/10 text-amber-500' },
      { label: t('kpi_unposted'), value: own.filter(i => i.approval_status === 'approved' && i.posting_status === 'unposted').length, icon: BookCheck, tone: 'bg-sky-500/10 text-sky-500' },
      { label: t('kpi_payable'), value: sumBy(own.filter(i => i.posting_status === 'posted'), i => i.remaining_amount), icon: WalletCards, tone: 'bg-rose-500/10 text-rose-500' },
      { label: t('kpi_receivable'), value: sumBy(data.invoices.filter(i => i.direction === 'outgoing' && i.posting_status === 'posted'), i => i.remaining_amount), icon: HandCoins, tone: 'bg-emerald-500/10 text-emerald-500' },
    ];
  }, [data.invoices, pos, t]);

  const invoiceTab = ['incoming', 'outgoing'].includes(activeTab);
  const canCreate = invoiceTab && can('prepare') && context?.configured;
  const actions = <>
    {companies.length > 1 && <div className="w-56"><IconSelect value={String(company)} onChange={v => { setCompany(Number(v)); setSelectedId(null); }} icon={Building2} ariaLabel={t('company')} placeholder={t('company')} disabled={busy}
      options={companies.map(c => ({ value: String(c.id), label: c.name, icon: Building2 }))} /></div>}
    <Button size="sm" variant="outline" disabled={busy || !company} onClick={() => void run(refresh)} aria-label={t('refresh')}><RefreshCw className="h-4 w-4" /></Button>
    {canCreate && activeTab === 'outgoing' && <Button size="sm" variant="outline" onClick={() => openForm('fromJob')} className="gap-1.5"><Truck className="h-4 w-4" />{t('fromJob')}</Button>}
    {canCreate && <Button size="sm" onClick={() => pos ? setTerminal(true) : editInvoice()} className="gap-1.5">{pos ? <Plus className="h-4 w-4" /> : <FilePlus2 className="h-4 w-4" />}{t(pos ? 'newReceipt' : 'newIncoming')}</Button>}
  </>;

  const panelProps = { acc, openForm };
  return <div className="space-y-3">
    <PageHeader icon={pos ? ReceiptText : BookOpen} tone={pos ? 'violet' : 'emerald'} title={t(pos ? 'smartPos' : 'title')} subtitle={context?.company?.name ? `${context.company.name} · ${t(pos ? 'smartPosSubtitle' : 'subtitle')}` : t(pos ? 'smartPosSubtitle' : 'subtitle')}
      badge={context ? <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400"><ShieldCheck className="h-3.5 w-3.5" />{context.abilities.length} {t('permissions')}</span> : undefined}
      actions={actions} filters={tabs.map(k => ({ id: k, label: t(k) }))} activeFilter={activeTab} onFilterChange={id => { setTab(String(id)); setSelectedId(null); }}
      stats={can('view') && invoiceTab && !selected ? stats : undefined} />

    {error && !formName && !draft && !terminal && <Notice tone="bad">{error}</Notice>}
    {loading ? <Card className="shadow-none" contentClassName="p-0"><InlineDataState loading empty="" /></Card>
      : !company ? <Notice tone="warn">{t('noCompany')}</Notice>
      : <>
        {!can('view') && !(pos && can('pos')) && <Notice tone="warn">{t('noAccess')}</Notice>}
        {can('view') && !context?.configured && <NotConfigured {...panelProps} />}
        {activeTab === 'permissions' && context?.can_manage_permissions && <PermissionsPanel acc={acc} />}
        {activeTab === 'fiscalReports' && pos && can('pos') && <SmartPosReports acc={acc} />}
        {/* The PANTHEON connection moved to company details -> Integracije (CompanyIntegrations). */}
        {activeTab === 'settings' && can('setup') && <SettingsPanel {...panelProps} />}
        {can('view') && invoiceTab && (selected
          ? <InvoiceDetail key={selected.id} acc={acc} invoice={selected} onBack={() => setSelectedId(null)} onEdit={editInvoice} openForm={openForm} />
          : <InvoiceList acc={acc} direction={activeTab as 'incoming' | 'outgoing'} onSelect={i => setSelectedId(i.id)} />)}
        {can('view') && activeTab === 'accounts' && <AccountsPanel {...panelProps} />}
        {can('view') && activeTab === 'journal' && <JournalPanel {...panelProps} />}
        {can('view') && activeTab === 'bank' && <BankPanel {...panelProps} />}
        {can('view') && activeTab === 'advances' && <AdvancesPanel {...panelProps} />}
        {can('view') && activeTab === 'vat' && <VatPanel acc={acc} />}
        {can('view') && activeTab === 'periods' && <PeriodsPanel {...panelProps} />}
        {can('view') && activeTab === 'rules' && <RulesPanel {...panelProps} />}
        {can('view') && activeTab === 'margins' && <MarginsPanel {...panelProps} />}
        {can('view') && activeTab === 'partners' && <PartnersPanel {...panelProps} />}
        {can('view') && activeTab === 'reports' && <ReportsPanel acc={acc} />}
      </>}

    {formName && <AccountingForm acc={acc} name={formName} form={form} setForm={setForm} onClose={() => setFormName('')} />}
    {draft && <InvoiceEditor acc={acc} draft={draft} setDraft={next => setDraft(current => current && (typeof next === 'function' ? next(current) : next))} onSave={saveInvoice} onClose={() => setDraft(null)} />}
    {terminal && <PosTerminal acc={acc} onClose={() => setTerminal(false)} />}
  </div>;
}
