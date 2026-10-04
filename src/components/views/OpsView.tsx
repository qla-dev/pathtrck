import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, CheckCheck, ClipboardList, Clock3, Flag, Layers, Plus, RefreshCw, Truck } from 'lucide-react';

import type { Language } from '../../types';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Dialog } from '../ui/Dialog';
import { IconSelect } from '../ui/IconSelect';
import { InlineDataState } from '../ui/InlineDataState';
import { Notice } from '../ui/Notice';
import { PageHeader, type PageHeaderStat } from '../ui/PageHeader';
import { RecordTable } from '../ui/RecordTable';
import { StatusBadge, type StatusTone } from '../ui/StatusBadge';
import { Tabs } from '../ui/Tabs';
import { Label, TextField } from '../modals/AddWarehouseModal/fields';
import { money, type Row, shortDate, today, useAccounting } from './accounting/shared';

/*
 * FreightBook Ops: a booked shipment is a work order (špediterski nalog). Spec:
 * docs/pantheon-proizvodnja/freightbook_ops_prijedlog.sql. Everything here edits SmartFreight data;
 * PANTHEON receives it only through the Ops sync (company details -> Integracije).
 */
const statusTone = (s: string): StatusTone => ({ open: 'info', dispatched: 'info', in_progress: 'warn', partially_closed: 'warn', closed: 'ok', cancelled: 'muted' } as Record<string, StatusTone>)[s] ?? 'muted';
const EVENTS = ['dispatched', 'loaded', 'border', 'customs_cleared', 'delivered', 'pod', 'damage', 'note'];
const ITEM_TYPES = ['cost', 'operation', 'revenue'];

export function OpsView({ lang }: { lang: Language }) {
  const acc = useAccounting(lang);
  const { t, companies, company, setCompany, context, loading, can } = acc;
  const [tab, setTab] = useState('ops_orders');
  const [data, setData] = useState<Row | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [filter, setFilter] = useState<Row>({ status: '', search: '' });
  const [detail, setDetail] = useState<Row | null>(null); const [creating, setCreating] = useState<Row | null>(null); const [template, setTemplate] = useState<Row | null>(null);
  const allowed = can('ops');
  const load = useCallback(async () => {
    if (!company || !allowed) return;
    const q = new URLSearchParams(Object.entries(filter).filter(([, v]) => v).map(([k, v]) => [k, String(v)])).toString();
    setData((await api.accounting.get<Row>(company, `ops?${q}`)).data);
  }, [company, allowed, filter]);
  useEffect(() => { setError(''); load().catch(e => setError(e instanceof Error ? e.message : String(e))); }, [load]);
  const message = (e: unknown) => setError(e instanceof Error ? e.message : String(e));
  const run = async (fn: () => Promise<unknown>) => { if (busy) return false; setBusy(true); setError(''); try { await fn(); await load(); return true; } catch (e) { message(e); return false; } finally { setBusy(false); } };
  const send = (path: string, payload: unknown, method = 'POST') => api.accounting.send<Row>(company, path, payload, method);
  const open = (id: number) => void api.accounting.get<Row>(company, `ops/orders/${id}`).then(r => setDetail(r.data)).catch(message);
  const reopen = async (id: number) => setDetail((await api.accounting.get<Row>(company, `ops/orders/${id}`)).data);
  const counts: Record<string, number> = data?.status_counts ?? {};
  const orders: Row[] = data?.orders ?? [];
  const members: Row[] = data?.members ?? [];
  const partners: Row[] = data?.partners ?? [];
  const templates: Row[] = data?.templates ?? [];

  const stats = useMemo<PageHeaderStat[]>(() => [
    { label: t('ops_status_open'), value: (counts.open ?? 0) + (counts.dispatched ?? 0), icon: Flag, tone: 'bg-sky-500/10 text-sky-500' },
    { label: t('ops_status_in_progress'), value: counts.in_progress ?? 0, icon: Truck, tone: 'bg-amber-500/10 text-amber-500' },
    { label: t('ops_status_partially_closed'), value: counts.partially_closed ?? 0, icon: Clock3, tone: 'bg-rose-500/10 text-rose-500' },
    { label: t('ops_status_closed'), value: counts.closed ?? 0, icon: CheckCheck, tone: 'bg-emerald-500/10 text-emerald-500' },
  ], [counts, t]);

  const actions = <>
    {companies.length > 1 && <div className="w-56"><IconSelect value={String(company)} onChange={v => setCompany(Number(v))} icon={Building2} ariaLabel={t('company')} placeholder={t('company')} disabled={busy}
      options={companies.map(c => ({ value: String(c.id), label: c.name, icon: Building2 }))} /></div>}
    <Button size="sm" variant="outline" disabled={busy || !company} onClick={() => void run(load)} aria-label={t('refresh')}><RefreshCw className="h-4 w-4" /></Button>
    {allowed && tab === 'ops_orders' && <Button size="sm" className="gap-1.5" onClick={() => setCreating({ currency: 'BAM' })}><Plus className="h-4 w-4" />{t('ops_new_order')}</Button>}
    {allowed && tab === 'ops_templates' && can('setup') && <Button size="sm" className="gap-1.5" onClick={() => setTemplate({ active: true, items: [] })}><Plus className="h-4 w-4" />{t('ops_new_template')}</Button>}
  </>;

  return <div className="space-y-3">
    <PageHeader icon={ClipboardList} tone="amber" title={t('ops')} subtitle={context?.company?.name ? `${context.company.name} · ${t('ops_subtitle')}` : t('ops_subtitle')}
      actions={actions} filters={['ops_orders', 'ops_templates'].map(k => ({ id: k, label: t(k) }))} activeFilter={tab} onFilterChange={id => setTab(String(id))} stats={allowed && data && tab === 'ops_orders' ? stats : undefined} />
    {(error || acc.error) && <Notice tone="bad">{error || acc.error}</Notice>}
    {loading ? <Card className="shadow-none" contentClassName="p-0"><InlineDataState loading empty="" /></Card>
      : !company ? <Notice tone="warn">{t('noCompany')}</Notice>
      : !allowed ? <Notice tone="warn">{t('ops_no_access')}</Notice>
      : <>
        {tab === 'ops_orders' && <>
          <Card className="shadow-none" contentClassName="flex flex-wrap items-end gap-3 p-3">
            <label className="block w-64"><Label>{t('search')}</Label><TextField value={filter.search} onChange={e => setFilter({ ...filter, search: e.target.value })} /></label>
            <label className="block w-52"><Label>{t('status')}</Label><IconSelect value={filter.status} onChange={v => setFilter({ ...filter, status: v })} icon={Flag} ariaLabel={t('status')} placeholder="—"
              options={[{ value: '', label: '—', icon: Flag }, ...['open', 'dispatched', 'in_progress', 'partially_closed', 'closed', 'cancelled'].map(s => ({ value: s, label: t(`ops_status_${s}`), icon: Flag }))]} /></label>
          </Card>
          <p className="text-xs text-slate-500">{t('ops_auto_note')}</p>
          <Card className="shadow-none" contentClassName="p-0"><RecordTable minWidth="min-w-[900px]" empty={t('empty')} rows={orders} onRowClick={o => open(o.id)} columns={[
            { key: 'reference', header: t('ops_number'), render: o => <span className="font-semibold">{o.reference}</span> },
            { key: 'title', header: t('crm_title') }, { key: 'customer_name', header: t('crm_customer') },
            { key: 'status', header: t('status'), render: o => <StatusBadge tone={statusTone(o.status)}>{t(`ops_status_${o.status}`)}</StatusBadge> },
            { key: 'planned_start_at', header: t('ops_planned'), render: o => `${shortDate(o.planned_start_at)} → ${shortDate(o.planned_end_at)}` },
            { key: 'agreed_revenue', header: t('revenue'), align: 'right', render: o => o.agreed_revenue === null ? '—' : money(o.agreed_revenue, o.currency) },
            { key: 'pantheon', header: 'PANTHEON', render: o => data?.pantheon?.sync_enabled ? (o.pantheon_pending ? <StatusBadge tone="warn">{t('ops_sync_pending')}</StatusBadge> : <span className="font-mono text-xs">{o.pantheon_key}</span>) : '—' },
          ]} /></Card>
        </>}
        {tab === 'ops_templates' && <div className="grid gap-3 lg:grid-cols-2">
          {templates.map(tp => <Card key={tp.id} className="shadow-none" contentClassName="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2"><div><p className="font-black">{tp.name}</p><p className="font-mono text-xs text-slate-500">{tp.code} · {tp.transport_type || t('ops_any_transport')}</p></div>
              <div className="flex items-center gap-2">{!tp.active && <StatusBadge tone="muted">{t('ops_inactive')}</StatusBadge>}{can('setup') && <Button size="sm" variant="outline" onClick={() => setTemplate({ ...tp, items: tp.items.map((i: Row) => ({ ...i })) })}>{t('save')}</Button>}</div></div>
            <RecordTable dense empty={t('empty')} rows={tp.items} columns={[{ key: 'item_type', header: t('ops_line_type'), render: i => t(`ops_item_${i.item_type}`) }, { key: 'description', header: t('description') },
              { key: 'planned_qty', header: t('quantity'), align: 'right', render: i => `${Number(i.planned_qty)} ${i.unit}` }, { key: 'planned_price', header: t('unit_price'), align: 'right', render: i => i.planned_price === null ? '—' : money(i.planned_price) }]} />
          </Card>)}
          {!templates.length && <Notice tone="info">{t('ops_no_templates')}</Notice>}
        </div>}
      </>}

    {detail && <OpsDetail t={t} detail={detail} members={members} busy={busy} onClose={() => setDetail(null)}
      act={(path, payload, method) => void run(async () => { await send(`ops/orders/${detail.order.id}${path}`, payload, method); await reopen(detail.order.id); })} />}

    {creating && <Dialog title={t('ops_new_order')} icon={Plus} onClose={() => setCreating(null)} closeLabel={t('close')} closeDisabled={busy}
      footer={<Button disabled={busy || !creating.title} onClick={() => void run(async () => { const r = await send('ops/orders', { ...creating, template_id: creating.template_id ? Number(creating.template_id) : null,
        customer_partner_id: creating.customer_partner_id ? Number(creating.customer_partner_id) : null, agreed_revenue: creating.agreed_revenue || null }); setCreating(null); open(Number(r.data.id)); })}>{t('save')}</Button>}>
      {error && <Notice tone="bad" className="mb-3">{error}</Notice>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2"><Label required>{t('crm_title')}</Label><TextField value={creating.title ?? ''} onChange={e => setCreating({ ...creating, title: e.target.value })} /></label>
        <label className="block"><Label>{t('ops_template')}</Label><IconSelect value={String(creating.template_id ?? '')} onChange={v => setCreating({ ...creating, template_id: v })} icon={Layers} ariaLabel={t('ops_template')} placeholder="—"
          options={[{ value: '', label: '—', icon: Layers }, ...templates.filter(tp => tp.active).map(tp => ({ value: String(tp.id), label: `${tp.code} · ${tp.name}`, icon: Layers }))]} /></label>
        <label className="block"><Label>{t('crm_customer')}</Label><IconSelect value={String(creating.customer_partner_id ?? '')} onChange={v => setCreating({ ...creating, customer_partner_id: v })} icon={Building2} ariaLabel={t('crm_customer')} placeholder="—" searchable searchPlaceholder={t('search')} noResults={t('empty')}
          options={[{ value: '', label: '—', icon: Building2 }, ...partners.map(p => ({ value: String(p.id), label: p.name, icon: Building2 }))]} /></label>
        <label className="block"><Label>{t('revenue')}</Label><TextField type="number" min="0" step="0.01" value={creating.agreed_revenue ?? ''} onChange={e => setCreating({ ...creating, agreed_revenue: e.target.value })} /></label>
        <label className="block"><Label>{t('currency')}</Label><TextField value={creating.currency} maxLength={3} onChange={e => setCreating({ ...creating, currency: e.target.value.toUpperCase() })} /></label>
        <label className="block"><Label>{t('ops_planned_start')}</Label><TextField type="date" value={creating.planned_start_at ?? ''} onChange={e => setCreating({ ...creating, planned_start_at: e.target.value })} /></label>
        <label className="block"><Label>{t('ops_planned_end')}</Label><TextField type="date" value={creating.planned_end_at ?? ''} onChange={e => setCreating({ ...creating, planned_end_at: e.target.value })} /></label>
      </div>
    </Dialog>}

    {template && <Dialog size="xl" title={t(template.id ? 'ops_templates' : 'ops_new_template')} icon={Layers} onClose={() => setTemplate(null)} closeLabel={t('close')} closeDisabled={busy}
      footer={<Button disabled={busy || !template.code || !template.name} onClick={() => void run(async () => { await send('ops/templates', { ...template, transport_type: template.transport_type || null,
        items: template.items.map((i: Row) => ({ ...i, planned_qty: Number(i.planned_qty || 0), planned_price: i.planned_price === '' || i.planned_price === null || i.planned_price === undefined ? null : Number(i.planned_price) })) }); setTemplate(null); })}>{t('save')}</Button>}>
      {error && <Notice tone="bad" className="mb-3">{error}</Notice>}
      <p className="mb-3 text-sm text-slate-500">{t('ops_template_note')}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block"><Label required>{t('code')}</Label><TextField value={template.code ?? ''} onChange={e => setTemplate({ ...template, code: e.target.value.toUpperCase() })} /></label>
        <label className="block"><Label required>{t('name')}</Label><TextField value={template.name ?? ''} onChange={e => setTemplate({ ...template, name: e.target.value })} /></label>
        <label className="block"><Label>{t('ops_transport_type')}</Label><IconSelect value={template.transport_type ?? ''} onChange={v => setTemplate({ ...template, transport_type: v })} icon={Truck} ariaLabel={t('ops_transport_type')} placeholder="—"
          options={[{ value: '', label: t('ops_any_transport'), icon: Truck }, ...['road', 'air', 'sea', 'rail', 'warehouse'].map(v => ({ value: v, label: v, icon: Truck }))]} /></label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={!!template.active} onChange={e => setTemplate({ ...template, active: e.target.checked })} />{t('ops_active')}</label>
      <div className="mt-4 space-y-2">
        {template.items.map((item: Row, n: number) => <div key={n} className="grid items-end gap-2 rounded-xl border border-slate-200 p-2 sm:grid-cols-[130px_120px_minmax(0,1fr)_80px_90px_110px_auto] dark:border-slate-700">
          <label className="block"><Label>{t('ops_line_type')}</Label><IconSelect value={item.item_type ?? 'cost'} onChange={v => setTemplate({ ...template, items: template.items.map((x: Row, i: number) => i === n ? { ...x, item_type: v } : x) })} icon={Layers} ariaLabel={t('kind')} placeholder="—"
            options={ITEM_TYPES.map(k => ({ value: k, label: t(`ops_item_${k}`), icon: Layers }))} /></label>
          {(['item_code', 'description', 'unit', 'planned_qty', 'planned_price'] as const).map(k => <label key={k} className="block min-w-0"><Label>{t(k === 'item_code' ? 'code' : k === 'planned_qty' ? 'quantity' : k === 'planned_price' ? 'unit_price' : k === 'unit' ? 'ops_unit' : 'description')}</Label>
            <TextField value={item[k] ?? ''} type={k.startsWith('planned') ? 'number' : 'text'} onChange={e => setTemplate({ ...template, items: template.items.map((x: Row, i: number) => i === n ? { ...x, [k]: k === 'item_code' ? e.target.value.toUpperCase() : e.target.value } : x) })} /></label>)}
          <Button size="sm" variant="ghost" onClick={() => setTemplate({ ...template, items: template.items.filter((_: Row, i: number) => i !== n) })}>{t('remove')}</Button>
        </div>)}
        <Button size="sm" variant="outline" onClick={() => setTemplate({ ...template, items: [...template.items, { item_type: 'operation', item_code: '', description: '', unit: 'H', planned_qty: '1', planned_price: '' }] })}>{t('addLine')}</Button>
      </div>
    </Dialog>}
  </div>;
}

function OpsDetail({ t, detail, members, busy, onClose, act }: { t: (k: string) => string; detail: Row; members: Row[]; busy: boolean; onClose: () => void; act: (path: string, payload: unknown, method?: string) => void }) {
  const o = detail.order;
  const editable = !['closed', 'cancelled'].includes(o.status);
  const [section, setSection] = useState<string>('items');
  const [edit, setEdit] = useState<Row | null>(null);
  const [work, setWork] = useState<Row>({ order_item_id: '', work_date: today(), minutes: '', downtime_minutes: '' });
  const [event, setEvent] = useState<Row>({ event_type: 'loaded', note: '' });
  const operations: Row[] = detail.items.filter((i: Row) => i.item_type === 'operation');
  const m = detail.margin;
  return <Dialog size="xl" title={`${o.reference} · ${o.title ?? ''}`} subtitle={`${o.customer_name ?? '—'}${detail.workspace ? ` · ${t('ops_shipment')} ${detail.workspace.reference}` : ''}`} icon={ClipboardList} onClose={onClose} closeLabel={t('close')} closeDisabled={busy}
    footer={editable ? <>{o.status === 'open' && <Button size="sm" variant="outline" disabled={busy} onClick={() => act('', { status: 'dispatched' }, 'PATCH')}>{t('ops_status_dispatched')}</Button>}
      <Button size="sm" disabled={busy} className="gap-1.5" onClick={() => act('/close', {})}><CheckCheck className="h-4 w-4" />{t('ops_close')}</Button></> : undefined}>
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2"><StatusBadge tone={statusTone(o.status)}>{t(`ops_status_${o.status}`)}</StatusBadge>
        {detail.workspace && <StatusBadge tone="info" icon={Truck}>{t('ops_shipment')}: {t(({ booked: 'ops_event_booked', in_execution: 'ops_status_in_progress', completed: 'ops_event_delivered', cancelled: 'ops_status_cancelled' } as Record<string, string>)[detail.workspace.status] ?? 'ops_shipment')}</StatusBadge>}
        {detail.pantheon ? <StatusBadge tone={Number(detail.pantheon.local_revision) >= Number(o.revision) ? 'ok' : 'warn'}>PANTHEON {detail.pantheon.pantheon_key}</StatusBadge> : null}</div>
      {o.close_problems && <Notice tone="warn">{String(o.close_problems).split('\n').map(p => t(`ops_problem_${p.split(':')[0]}`) + (p.includes(':') ? p.slice(p.indexOf(':')) : '')).join(' · ')}</Notice>}
      <div className="grid gap-3 sm:grid-cols-3">{(['plan', 'actual'] as const).map(k => <Card key={k} className="shadow-none" contentClassName="space-y-1 p-3 text-sm">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t(`ops_${k}`)}</p>
        <p>{t('revenue')}: {money(m[k].revenue, o.currency)}</p><p>{t('cost')}: {money(m[k].cost, o.currency)}</p><p>{t('ops_item_operation')}: {money(m[k].operation, o.currency)}</p>
        <p className="font-black">{t('margin')}: {money(m[k].margin, o.currency)}</p></Card>)}
        <Card className="shadow-none" contentClassName="space-y-1 p-3 text-sm"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('ops_planned')}</p>
          <p>{shortDate(o.planned_start_at)} → {shortDate(o.planned_end_at)}</p><p>{t('crm_owner')}: {members.find(u => u.id === o.responsible_user_id)?.name ?? '—'}</p></Card></div>
      <Tabs label={t('ops')} value={section} onChange={setSection} items={[{ value: 'items', label: t('crm_items'), count: detail.items.length }, { value: 'work', label: t('ops_work'), count: detail.work_logs.length },
        { value: 'events', label: t('ops_events'), count: detail.events.length }, { value: 'documents', label: t('ops_documents'), count: detail.documents.length }]} />
      {section === 'items' && <div className="space-y-2">
        <RecordTable dense empty={t('empty')} rows={detail.items} onRowClick={editable ? i => setEdit({ id: i.id, actual_qty: i.actual_qty ?? '', actual_price: i.actual_price ?? '', description: i.description }) : undefined} columns={[
          { key: 'position', header: '#' }, { key: 'item_type', header: t('ops_line_type'), render: i => t(`ops_item_${i.item_type}`) }, { key: 'item_code', header: t('code') }, { key: 'description', header: t('description') },
          { key: 'planned', header: t('ops_plan'), align: 'right', render: i => `${Number(i.planned_qty)} ${i.unit} × ${i.planned_price === null ? '—' : money(i.planned_price)}` },
          { key: 'actual', header: t('ops_actual'), align: 'right', render: i => i.actual_qty === null && i.actual_price === null ? '—' : `${i.actual_qty === null ? '—' : Number(i.actual_qty)} × ${i.actual_price === null ? '—' : money(i.actual_price)}` }]} />
        {edit && <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="w-full text-sm font-semibold">{edit.description}</p>
          <label className="block w-32"><Label>{t('ops_actual_qty')}</Label><TextField type="number" min="0" value={edit.actual_qty} onChange={e => setEdit({ ...edit, actual_qty: e.target.value })} /></label>
          <label className="block w-36"><Label>{t('ops_actual_price')}</Label><TextField type="number" min="0" step="0.01" value={edit.actual_price} onChange={e => setEdit({ ...edit, actual_price: e.target.value })} /></label>
          <Button size="sm" disabled={busy} onClick={() => { act('/items', { id: edit.id, actual_qty: edit.actual_qty === '' ? null : Number(edit.actual_qty), actual_price: edit.actual_price === '' ? null : Number(edit.actual_price) }); setEdit(null); }}>{t('save')}</Button>
          <Button size="sm" variant="ghost" onClick={() => setEdit(null)}>{t('close')}</Button></div>}
      </div>}
      {section === 'work' && <div className="space-y-2">
        <RecordTable dense empty={t('empty')} rows={detail.work_logs} columns={[{ key: 'work_date', header: t('ops_work_date'), render: w => shortDate(w.work_date) }, { key: 'user_name', header: t('user_name') },
          { key: 'item', header: t('ops_item_operation'), render: w => detail.items.find((i: Row) => i.id === w.order_item_id)?.description ?? '—' }, { key: 'minutes', header: t('ops_minutes'), align: 'right', render: w => Number(w.minutes) },
          { key: 'downtime_minutes', header: t('ops_downtime'), align: 'right', render: w => Number(w.downtime_minutes) || '—' }]} />
        {editable && operations.length > 0 && <div className="flex flex-wrap items-end gap-2">
          <label className="block w-56"><Label>{t('ops_item_operation')}</Label><IconSelect value={String(work.order_item_id)} onChange={v => setWork({ ...work, order_item_id: v })} icon={Clock3} ariaLabel={t('ops_item_operation')} placeholder="—"
            options={operations.map(i => ({ value: String(i.id), label: i.description, icon: Clock3 }))} /></label>
          <label className="block w-40"><Label>{t('ops_work_date')}</Label><TextField type="date" value={work.work_date} onChange={e => setWork({ ...work, work_date: e.target.value })} /></label>
          <label className="block w-28"><Label>{t('ops_minutes')}</Label><TextField type="number" min="0" value={work.minutes} onChange={e => setWork({ ...work, minutes: e.target.value })} /></label>
          <label className="block w-28"><Label>{t('ops_downtime')}</Label><TextField type="number" min="0" value={work.downtime_minutes} onChange={e => setWork({ ...work, downtime_minutes: e.target.value })} /></label>
          <Button size="sm" disabled={busy || !work.order_item_id || !work.minutes} onClick={() => { act('/work', { ...work, order_item_id: Number(work.order_item_id), minutes: Number(work.minutes), downtime_minutes: Number(work.downtime_minutes || 0) }); setWork({ ...work, minutes: '', downtime_minutes: '' }); }}>{t('ops_log_work')}</Button>
        </div>}
      </div>}
      {section === 'events' && <div className="space-y-2">
        <RecordTable dense empty={t('empty')} rows={detail.events} columns={[{ key: 'occurred_at', header: t('created_at'), render: e => String(e.occurred_at).slice(0, 16).replace('T', ' ') },
          { key: 'event_type', header: t('ops_event'), render: e => t(`ops_event_${e.event_type}`) }, { key: 'user_name', header: t('user_name') }, { key: 'note', header: t('crm_note') }]} />
        {editable && <div className="flex flex-wrap items-end gap-2">
          <label className="block w-52"><Label>{t('ops_event')}</Label><IconSelect value={event.event_type} onChange={v => setEvent({ ...event, event_type: v })} icon={Flag} ariaLabel={t('ops_event')} placeholder="—" options={EVENTS.map(k => ({ value: k, label: t(`ops_event_${k}`), icon: Flag }))} /></label>
          <label className="block min-w-48 flex-1"><Label>{t('crm_note')}</Label><TextField value={event.note} onChange={e => setEvent({ ...event, note: e.target.value })} /></label>
          <Button size="sm" disabled={busy} onClick={() => { act('/events', { event_type: event.event_type, note: event.note || null }); setEvent({ ...event, note: '' }); }}>{t('save')}</Button>
        </div>}
      </div>}
      {section === 'documents' && <RecordTable dense empty={t('ops_documents_empty')} rows={detail.documents} columns={[{ key: 'role', header: t('ops_line_type'), render: d => t(`ops_doc_${d.role}`) },
        { key: 'invoice_number', header: t('invoice_id'), render: d => d.invoice_number ? `${d.invoice_number} · ${money(d.invoice_total, d.invoice_currency)}` : '—' }, { key: 'document_name', header: t('document') }]} />}
    </div>
  </Dialog>;
}
