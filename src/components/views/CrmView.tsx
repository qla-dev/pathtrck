import { useCallback, useEffect, useMemo, useState } from 'react';
import { BellRing, Building2, CalendarClock, CheckCheck, Handshake, Link2, Plus, RefreshCw, Target, TrendingUp, Trophy, Truck, UserRound } from 'lucide-react';

import type { Language } from '../../types';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Dialog } from '../ui/Dialog';
import { IconSelect } from '../ui/IconSelect';
import { InlineDataState } from '../ui/InlineDataState';
import { Notice } from '../ui/Notice';
import { PageHeader, type PageHeaderStat } from '../ui/PageHeader';
import { RecordTable, type RecordColumn } from '../ui/RecordTable';
import { StatusBadge, type StatusTone } from '../ui/StatusBadge';
import { Tabs } from '../ui/Tabs';
import { Label, TextField } from '../modals/AddWarehouseModal/fields';
import { money, type Row, shortDate, today, useAccounting } from './accounting/shared';

// CRM = offers and orders. PANTHEON documents are read-only (pulled through the PANTHEON connector);
// leads, follow-ups, owners and lost reasons live only in SmartFreight.
const STAGES = ['lead', 'offer', 'order', 'in_delivery', 'delivered', 'invoiced', 'closed', 'lost'] as const;
const BOARD = ['lead', 'offer', 'order', 'in_delivery', 'delivered', 'invoiced'] as const;
const stageTone = (stage: string): StatusTone => ({ lead: 'muted', offer: 'info', order: 'warn', in_delivery: 'warn', delivered: 'ok', invoiced: 'ok', closed: 'muted', lost: 'bad' } as Record<string, StatusTone>)[stage] ?? 'muted';
const startOfYear = () => `${today().slice(0, 4)}-01-01`;

// onSendToTracking opens the normal Post load form prefilled from the CRM document; the created load keeps
// crm_document_id, the booked shipment becomes a work order, and the CRM stage then follows the shipment.
export function CrmView({ lang, onSendToTracking }: { lang: Language; onSendToTracking?: (document: Row) => void }) {
  const acc = useAccounting(lang);
  const { t, companies, company, setCompany, context, loading, can, fail } = acc;
  const [tab, setTab] = useState('pipeline');
  const [data, setData] = useState<Row | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [filters, setFilters] = useState<Row>({ stage: '', search: '', from: startOfYear(), to: today() });
  const [report, setReport] = useState<Row | null>(null);
  const [detail, setDetail] = useState<Row | null>(null); const [lead, setLead] = useState<Row | null>(null);
  const [syncResult, setSyncResult] = useState<Row | null>(null);
  const allowed = can('crm');
  const query = useMemo(() => new URLSearchParams(Object.entries(filters).filter(([, v]) => v).map(([k, v]) => [k, String(v)])).toString(), [filters]);
  const load = useCallback(async () => {
    if (!company || !allowed) return;
    setData((await api.accounting.get<Row>(company, `crm?${query}`)).data);
  }, [company, allowed, query]);
  useEffect(() => { setError(''); load().catch(e => setError(e instanceof Error ? e.message : String(e))); }, [load]);
  useEffect(() => { if (tab === 'crm_report' && company && allowed) api.accounting.get<Row>(company, `crm/report?from=${filters.from}&to=${filters.to}`).then(r => setReport(r.data)).catch(fail); }, [tab, company, allowed, filters.from, filters.to, fail]);
  const run = async (fn: () => Promise<unknown>) => { if (busy) return false; setBusy(true); setError(''); try { await fn(); await load(); return true; } catch (e) { setError(e instanceof Error ? e.message : String(e)); return false; } finally { setBusy(false); } };
  const send = (path: string, payload: unknown, method = 'POST') => api.accounting.send<Row>(company, path, payload, method);
  const openDetail = (doc: Row) => void api.accounting.get<Row>(company, `crm/documents/${doc.id}`).then(r => setDetail(r.data)).catch(e => setError(e instanceof Error ? e.message : String(e)));
  const documents: Row[] = data?.documents ?? [];
  const counts: Record<string, number> = data?.stage_counts ?? {};
  const members: Row[] = data?.members ?? [];

  const stats = useMemo<PageHeaderStat[]>(() => {
    const open = (counts.lead ?? 0) + (counts.offer ?? 0);
    const converted = ['order', 'in_delivery', 'delivered', 'invoiced'].reduce((s, k) => s + (counts[k] ?? 0), 0);
    const due = (data?.follow_ups ?? []).filter((f: Row) => String(f.due_on) <= today()).length;
    return [
      { label: t('crm_open'), value: open, icon: Target, tone: 'bg-sky-500/10 text-sky-500' },
      { label: t('crm_converted'), value: converted, icon: Trophy, tone: 'bg-emerald-500/10 text-emerald-500' },
      { label: t('stage_in_delivery'), value: counts.in_delivery ?? 0, icon: TrendingUp, tone: 'bg-amber-500/10 text-amber-500' },
      { label: t('crm_due'), value: due, icon: BellRing, tone: 'bg-rose-500/10 text-rose-500' },
    ];
  }, [counts, data?.follow_ups, t]);

  const columns: RecordColumn<Row>[] = [
    { key: 'number', header: t('number'), render: d => <span className="font-semibold">{d.number || t('crm_source_smartfreight')}</span> },
    { key: 'customer_name', header: t('crm_customer'), render: d => <span className="inline-flex items-center gap-1.5">{d.customer_name}{(d.partner_id || d.customer_id) && <Link2 className="h-3 w-3 text-emerald-500" aria-label={t('crm_linked_client')} />}</span> },
    { key: 'title', header: t('crm_title') },
    { key: 'issued_on', header: t('issued_at'), render: d => shortDate(d.issued_on) },
    { key: 'stage', header: t('status'), render: d => <StatusBadge tone={stageTone(d.stage)}>{t(`stage_${d.stage}`)}</StatusBadge> },
    { key: 'delivery', header: t('crm_delivered_qty'), align: 'right', render: d => Number(d.ordered_quantity) > 0 ? `${Math.round(100 * Number(d.delivered_quantity) / Number(d.ordered_quantity))}%` : '—' },
    { key: 'total_amount', header: t('total'), align: 'right', render: d => money(d.total_amount, d.currency) },
    { key: 'next_follow_up_on', header: t('crm_next_follow_up'), render: d => d.next_follow_up_on ? <span className={String(d.next_follow_up_on) <= today() ? 'font-bold text-rose-600' : ''}>{shortDate(d.next_follow_up_on)}</span> : '—' },
  ];

  const actions = <>
    {companies.length > 1 && <div className="w-56"><IconSelect value={String(company)} onChange={v => setCompany(Number(v))} icon={Building2} ariaLabel={t('company')} placeholder={t('company')} disabled={busy}
      options={companies.map(c => ({ value: String(c.id), label: c.name, icon: Building2 }))} /></div>}
    {allowed && data?.pantheon && <Button size="sm" variant="outline" disabled={busy} className="gap-1.5" onClick={() => void run(async () => setSyncResult((await send('crm/sync', {})).data))}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />{t('crm_sync')}</Button>}
    {allowed && <Button size="sm" className="gap-1.5" onClick={() => setLead({ stage: 'lead', currency: 'BAM', issued_on: today() })}><Plus className="h-4 w-4" />{t('crm_new_lead')}</Button>}
  </>;

  return <div className="space-y-3">
    <PageHeader icon={Handshake} tone="primary" title={t('crm')} subtitle={context?.company?.name ? `${context.company.name} · ${t('crmSubtitle')}` : t('crmSubtitle')}
      actions={actions} filters={['pipeline', 'crm_documents', 'crm_report', 'crm_follow_ups'].map(k => ({ id: k, label: t(k) }))} activeFilter={tab} onFilterChange={id => setTab(String(id))}
      stats={allowed && data ? stats : undefined} />
    {(error || acc.error) && <Notice tone="bad">{error || acc.error}</Notice>}
    {syncResult && <Notice tone="info">{t('crm_synced')}: {syncResult.documents} (+{syncResult.created}) · {t('crm_contacts')}: {syncResult.contacts}{syncResult.unmatched_customers ? ` · ${t('crm_unmatched')}: ${syncResult.unmatched_customers}` : ''}</Notice>}
    {loading ? <Card className="shadow-none" contentClassName="p-0"><InlineDataState loading empty="" /></Card>
      : !company ? <Notice tone="warn">{t('noCompany')}</Notice>
      : !allowed ? <Notice tone="warn">{t('crm_no_access')}</Notice>
      : <>
        {data && !data.pantheon && <Notice tone="info">{t('crm_no_connector')}</Notice>}
        {data?.pantheon && <p className="text-xs text-slate-500">{t('crm_pantheon_readonly')} · {t('crm_last_sync')}: {data.pantheon.last_crm_sync_at ? String(data.pantheon.last_crm_sync_at).slice(0, 16).replace('T', ' ') : '—'}</p>}

        {tab === 'pipeline' && <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {BOARD.map(stage => <Card key={stage} className="shadow-none" contentClassName="space-y-2 p-3">
            <div className="flex items-center justify-between"><StatusBadge tone={stageTone(stage)}>{t(`stage_${stage}`)}</StatusBadge><span className="text-xs font-bold text-slate-500">{counts[stage] ?? 0}</span></div>
            {documents.filter(d => d.stage === stage).slice(0, 25).map(d => <button key={d.id} type="button" onClick={() => openDetail(d)} className="block w-full cursor-pointer rounded-xl border border-slate-200 p-2.5 text-left transition hover:border-primary dark:border-slate-700">
              <p className="truncate text-sm font-semibold">{d.customer_name}</p>
              <p className="truncate text-xs text-slate-500">{d.number || d.title || '—'} · {shortDate(d.issued_on)}</p>
              <p className="mt-1 text-xs font-bold">{money(d.total_amount, d.currency)}</p>
              {d.next_follow_up_on && <p className={`mt-1 inline-flex items-center gap-1 text-[11px] ${String(d.next_follow_up_on) <= today() ? 'font-bold text-rose-600' : 'text-slate-500'}`}><CalendarClock className="h-3 w-3" />{shortDate(d.next_follow_up_on)}</p>}
            </button>)}
            {!documents.some(d => d.stage === stage) && <p className="py-4 text-center text-xs text-slate-400">{t('empty')}</p>}
          </Card>)}
        </div>}

        {(tab === 'crm_documents' || tab === 'crm_report') && <Card className="shadow-none" contentClassName="flex flex-wrap items-end gap-3 p-3">
          {tab === 'crm_documents' && <label className="block w-64"><Label>{t('search')}</Label><TextField value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} /></label>}
          {tab === 'crm_documents' && <label className="block w-48"><Label>{t('status')}</Label><IconSelect value={filters.stage} onChange={v => setFilters({ ...filters, stage: v })} icon={Target} ariaLabel={t('status')} placeholder="—"
            options={[{ value: '', label: '—', icon: Target }, ...STAGES.map(s => ({ value: s, label: t(`stage_${s}`), icon: Target }))]} /></label>}
          {(['from', 'to'] as const).map(k => <label key={k} className="block w-44"><Label>{t(k)}</Label><TextField type="date" value={filters[k]} onChange={e => setFilters({ ...filters, [k]: e.target.value })} /></label>)}
        </Card>}

        {tab === 'crm_documents' && <Card className="shadow-none" contentClassName="p-0"><RecordTable columns={columns} rows={documents} empty={t('empty')} onRowClick={openDetail} minWidth="min-w-[900px]" /></Card>}

        {tab === 'crm_report' && (report ? <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[['crm_documents_count', report.documents], ['crm_converted', report.converted], ['crm_conversion', report.conversion_rate === null ? '—' : `${report.conversion_rate}%`], ['crm_converted_share', report.converted_share === null ? '—' : `${report.converted_share}%`]].map(([k, v]) =>
              <Card key={k} className="shadow-none" contentClassName="px-3 py-2.5"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t(String(k))}</p><p className="mt-0.5 text-lg font-black">{v}</p></Card>)}
          </div>
          <Notice tone="info">{t('crm_report_note')}</Notice>
          <Card className="shadow-none" contentClassName="p-0"><RecordTable minWidth="min-w-[900px]" empty={t('empty')} rows={report.customers} rowKey={(r: Row) => `${r.partner_id ?? r.customer_key}|${r.currency}`} columns={[
            { key: 'customer_name', header: t('crm_customer'), render: r => <span className="font-semibold">{r.customer_name}</span> },
            { key: 'documents', header: t('crm_documents_count'), align: 'right' },
            { key: 'converted', header: t('crm_converted'), align: 'right' },
            { key: 'open', header: t('crm_open'), align: 'right' },
            { key: 'lost', header: t('crm_lost'), align: 'right' },
            { key: 'converted_share', header: t('crm_converted_share'), align: 'right', render: r => `${r.converted_share}%` },
            { key: 'converted_value', header: t('crm_converted_value'), align: 'right', render: r => money(r.converted_value, r.currency) },
            { key: 'open_value', header: t('crm_open_value'), align: 'right', render: r => money(r.open_value, r.currency) },
            { key: 'last_issued_on', header: t('crm_last_offer'), render: r => shortDate(r.last_issued_on) },
          ]} /></Card>
          <Card className="shadow-none" contentClassName="p-0"><RecordTable dense empty={t('empty')} rows={report.months} rowKey={(r: Row) => `${r.month}|${r.currency}`} columns={[
            { key: 'month', header: t('crm_month') }, { key: 'documents', header: t('crm_documents_count'), align: 'right' }, { key: 'converted', header: t('crm_converted'), align: 'right' },
            { key: 'value', header: t('crm_value'), align: 'right', render: r => money(r.value, r.currency) },
          ]} /></Card>
        </div> : <Card className="shadow-none" contentClassName="p-0"><InlineDataState loading empty="" /></Card>)}

        {tab === 'crm_follow_ups' && <Card className="shadow-none" contentClassName="p-0"><RecordTable empty={t('empty')} rows={data?.follow_ups ?? []} columns={[
          { key: 'due_on', header: t('crm_due_on'), render: f => <span className={String(f.due_on) <= today() ? 'font-bold text-rose-600' : ''}>{shortDate(f.due_on)}</span> },
          { key: 'customer_name', header: t('crm_customer') }, { key: 'number', header: t('number') }, { key: 'note', header: t('crm_note') },
          { key: 'owner_user_id', header: t('crm_owner'), render: f => members.find(m => m.id === f.owner_user_id)?.name ?? '—' },
          { key: 'done', header: '', render: f => <Button size="sm" variant="outline" disabled={busy} className="gap-1" onClick={e => { e.stopPropagation(); void run(() => send(`crm/follow-ups/${f.id}/done`, {})); }}><CheckCheck className="h-3.5 w-3.5" />{t('crm_done')}</Button> },
        ]} /></Card>}
      </>}

    {detail && <CrmDetail t={t} detail={detail} members={members} busy={busy} onClose={() => setDetail(null)}
      onSendToTracking={onSendToTracking ? () => { onSendToTracking(detail.document); setDetail(null); } : undefined}
      onUpdate={payload => void run(async () => { await send(`crm/documents/${detail.document.id}`, payload, 'PATCH'); setDetail((await api.accounting.get<Row>(company, `crm/documents/${detail.document.id}`)).data); })}
      onFollowUp={payload => void run(async () => { await send('crm/follow-ups', { ...payload, crm_document_id: detail.document.id, partner_id: detail.document.partner_id }); setDetail((await api.accounting.get<Row>(company, `crm/documents/${detail.document.id}`)).data); })} />}

    {lead && <Dialog title={t('crm_new_lead')} icon={Plus} onClose={() => setLead(null)} closeLabel={t('close')} closeDisabled={busy}
      footer={<Button disabled={busy || !lead.title || !(lead.partner_id || lead.customer_name)} onClick={() => void run(async () => { await send('crm/documents', { ...lead, partner_id: lead.partner_id ? Number(lead.partner_id) : null, owner_user_id: lead.owner_user_id ? Number(lead.owner_user_id) : null, total_amount: lead.total_amount || 0 }); setLead(null); })}>{t('save')}</Button>}>
      {error && <Notice tone="bad" className="mb-3">{error}</Notice>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2"><Label>{t('crm_existing_client')}</Label><IconSelect value={String(lead.partner_id ?? '')} onChange={v => setLead({ ...lead, partner_id: v })} icon={UserRound} ariaLabel={t('crm_existing_client')} placeholder="—" searchable searchPlaceholder={t('search')} noResults={t('empty')}
          options={[{ value: '', label: '—', icon: UserRound }, ...(data?.partners ?? []).map((p: Row) => ({ value: String(p.id), label: `${p.name}${p.tax_number ? ` · ${p.tax_number}` : ''}`, icon: UserRound }))]} /></label>
        {!lead.partner_id && <label className="block sm:col-span-2"><Label required>{t('crm_new_client_name')}</Label><TextField value={lead.customer_name ?? ''} onChange={e => setLead({ ...lead, customer_name: e.target.value })} /></label>}
        <label className="block sm:col-span-2"><Label required>{t('crm_title')}</Label><TextField value={lead.title ?? ''} onChange={e => setLead({ ...lead, title: e.target.value })} /></label>
        <label className="block"><Label>{t('status')}</Label><IconSelect value={lead.stage} onChange={v => setLead({ ...lead, stage: v })} icon={Target} ariaLabel={t('status')} placeholder="—" options={['lead', 'offer'].map(s => ({ value: s, label: t(`stage_${s}`), icon: Target }))} /></label>
        <label className="block"><Label>{t('crm_contact')}</Label><TextField value={lead.contact_name ?? ''} onChange={e => setLead({ ...lead, contact_name: e.target.value })} /></label>
        <label className="block"><Label>{t('crm_value')}</Label><TextField type="number" min="0" step="0.01" value={lead.total_amount ?? ''} onChange={e => setLead({ ...lead, total_amount: e.target.value })} /></label>
        <label className="block"><Label>{t('currency')}</Label><TextField value={lead.currency} maxLength={3} onChange={e => setLead({ ...lead, currency: e.target.value.toUpperCase() })} /></label>
        <label className="block"><Label>{t('crm_next_follow_up')}</Label><TextField type="date" value={lead.next_follow_up_on ?? ''} onChange={e => setLead({ ...lead, next_follow_up_on: e.target.value })} /></label>
        <label className="block"><Label>{t('crm_owner')}</Label><IconSelect value={String(lead.owner_user_id ?? '')} onChange={v => setLead({ ...lead, owner_user_id: v })} icon={UserRound} ariaLabel={t('crm_owner')} placeholder="—"
          options={[{ value: '', label: '—', icon: UserRound }, ...members.map(m => ({ value: String(m.id), label: m.name, icon: UserRound }))]} /></label>
      </div>
    </Dialog>}
  </div>;
}

function CrmDetail({ t, detail, members, busy, onClose, onUpdate, onFollowUp, onSendToTracking }: { t: (k: string) => string; detail: Row; members: Row[]; busy: boolean; onClose: () => void; onUpdate: (payload: Row) => void; onFollowUp: (payload: Row) => void; onSendToTracking?: () => void }) {
  const d = detail.document;
  const [section, setSection] = useState<string>('items');
  const [lost, setLost] = useState(d.lost_reason ?? ''); const [followUp, setFollowUp] = useState<Row>({ due_on: today(), note: '' });
  const pantheon = d.source === 'pantheon';
  return <Dialog size="xl" title={`${d.number || t('crm_source_smartfreight')} · ${d.customer_name}`} subtitle={`${t(pantheon ? 'crm_source_pantheon' : 'crm_source_smartfreight')} · ${shortDate(d.issued_on)}`} icon={Handshake} onClose={onClose} closeLabel={t('close')} closeDisabled={busy}>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><StatusBadge tone={stageTone(d.stage)}>{t(`stage_${d.stage}`)}</StatusBadge>{d.pantheon_status && <StatusBadge tone="muted">PANTHEON: {d.pantheon_status}</StatusBadge>}{(d.partner_id || d.customer_id) && <StatusBadge tone="ok" icon={Link2}>{t('crm_linked_client')}</StatusBadge>}
        {d.load_id ? <StatusBadge tone="info" icon={Truck}>{t('crm_in_tracking')}</StatusBadge>
          : onSendToTracking && ['lead', 'offer', 'order'].includes(d.stage) && <Button size="sm" className="ml-auto gap-1.5" disabled={busy} onClick={onSendToTracking}><Truck className="h-4 w-4" />{t('crm_send_to_tracking')}</Button>}</div>
      <div className="grid gap-3 text-sm sm:grid-cols-4">
        {[['crm_title', d.title], ['crm_contact', d.contact_name], ['crm_valid_until', shortDate(d.valid_until)], ['crm_delivery_deadline', shortDate(d.delivery_deadline)], ['crm_net', money(d.net_amount, d.currency)], ['crm_vat', money(d.vat_amount, d.currency)], ['total', money(d.total_amount, d.currency)],
          ['crm_delivered_qty', Number(d.ordered_quantity) > 0 ? `${Number(d.delivered_quantity)} / ${Number(d.ordered_quantity)}` : '—']].map(([k, v]) => <div key={k}><p className="text-xs text-slate-500">{t(String(k))}</p><p className="font-medium">{v || '—'}</p></div>)}
      </div>
      {d.note && <p className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">{d.note}</p>}
      <Card className="shadow-none" contentClassName="grid gap-3 p-3 sm:grid-cols-3">
        <label className="block"><Label>{t('crm_owner')}</Label><IconSelect value={String(d.owner_user_id ?? '')} disabled={busy} onChange={v => onUpdate({ owner_user_id: v ? Number(v) : null })} icon={UserRound} ariaLabel={t('crm_owner')} placeholder="—"
          options={[{ value: '', label: '—', icon: UserRound }, ...members.map(m => ({ value: String(m.id), label: m.name, icon: UserRound }))]} /></label>
        {(d.stage === 'offer' || d.stage === 'lead' || !pantheon) && d.stage !== 'lost' && <div className="sm:col-span-2"><Label>{t('crm_lost_reason')}</Label><div className="flex gap-2"><TextField value={lost} onChange={e => setLost(e.target.value)} /><Button size="sm" variant="outline" disabled={busy || !lost} onClick={() => onUpdate({ stage: 'lost', lost_reason: lost })}>{t('crm_mark_lost')}</Button></div></div>}
        {d.stage === 'lost' && <div className="sm:col-span-2"><p className="text-xs text-slate-500">{t('crm_lost_reason')}</p><p className="text-sm">{d.lost_reason}</p><Button size="sm" variant="outline" className="mt-2" disabled={busy} onClick={() => onUpdate({ stage: pantheon ? 'offer' : 'lead' })}>{t('crm_reopen')}</Button></div>}
        {!pantheon && !['lost'].includes(d.stage) && <div className="flex flex-wrap gap-2 sm:col-span-3">{['lead', 'offer', 'order', 'closed'].filter(s => s !== d.stage).map(s => <Button key={s} size="sm" variant="outline" disabled={busy} onClick={() => onUpdate({ stage: s })}>{t(`stage_${s}`)}</Button>)}</div>}
      </Card>
      <Tabs label={t('crm')} value={section} onChange={setSection} items={[{ value: 'items', label: t('crm_items'), count: detail.items.length }, { value: 'linked', label: t('crm_linked'), count: d.linked_documents.length },
        { value: 'contacts', label: t('crm_contacts'), count: detail.contacts.length }, { value: 'follow_ups', label: t('crm_follow_ups'), count: detail.follow_ups.length }]} />
      {section === 'items' && <RecordTable dense empty={t('empty')} rows={detail.items} columns={[{ key: 'line_no', header: '#' }, { key: 'item_code', header: t('code') }, { key: 'name', header: t('name') },
        { key: 'quantity', header: t('quantity'), align: 'right', render: i => `${Number(i.quantity)} ${i.unit ?? ''}` }, { key: 'delivered_quantity', header: t('crm_delivered_qty'), align: 'right', render: i => Number(i.delivered_quantity) },
        { key: 'unit_price', header: t('unit_price'), align: 'right', render: i => money(i.unit_price) }, { key: 'discount_percent', header: '%', align: 'right', render: i => Number(i.discount_percent) || '—' }]} />}
      {section === 'linked' && <RecordTable dense empty={t('empty')} rows={d.linked_documents} rowKey={(l: Row) => l.key} columns={[{ key: 'number', header: t('number') }, { key: 'doc_type', header: t('pantheon_doc_type') },
        { key: 'kind', header: t('status'), render: l => <StatusBadge tone={l.kind === 'invoice' ? 'ok' : 'warn'}>{t(l.kind === 'invoice' ? 'stage_invoiced' : 'stage_in_delivery')}</StatusBadge> }, { key: 'date', header: t('issued_at') }]} />}
      {section === 'contacts' && <RecordTable dense empty={t('empty')} rows={detail.contacts} columns={[{ key: 'name', header: t('name') }, { key: 'function', header: t('crm_function') }, { key: 'email', header: t('email'), render: c => c.email ? <a className="text-primary underline" href={`mailto:${c.email}`}>{c.email}</a> : '—' },
        { key: 'phone', header: t('crm_phone'), render: c => c.phone ? <a className="text-primary underline" href={`tel:${c.phone}`}>{c.phone}</a> : '—' }]} />}
      {section === 'follow_ups' && <div className="space-y-3">
        <RecordTable dense empty={t('empty')} rows={detail.follow_ups} columns={[{ key: 'due_on', header: t('crm_due_on'), render: f => shortDate(f.due_on) }, { key: 'note', header: t('crm_note') },
          { key: 'done_at', header: t('status'), render: f => f.done_at ? <StatusBadge tone="ok">{t('crm_done')}</StatusBadge> : <StatusBadge tone={String(f.due_on) <= today() ? 'bad' : 'info'}>{t('crm_due')}</StatusBadge> }]} />
        <div className="flex flex-wrap items-end gap-2"><label className="block w-44"><Label>{t('crm_due_on')}</Label><TextField type="date" value={followUp.due_on} onChange={e => setFollowUp({ ...followUp, due_on: e.target.value })} /></label>
          <label className="block min-w-48 flex-1"><Label>{t('crm_note')}</Label><TextField value={followUp.note} onChange={e => setFollowUp({ ...followUp, note: e.target.value })} /></label>
          <Button size="sm" disabled={busy || !followUp.note} onClick={() => { onFollowUp(followUp); setFollowUp({ due_on: today(), note: '' }); }}>{t('crm_add_follow_up')}</Button></div>
      </div>}
    </div>
  </Dialog>;
}
