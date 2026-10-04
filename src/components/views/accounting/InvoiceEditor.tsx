import { CalendarDays, FilePlus2, ListChecks, Paperclip, Plus, Trash2, Upload, UserRound } from 'lucide-react';

import { api } from '../../../services/api';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { DataTable } from '../../ui/DataTable';
import { Notice } from '../../ui/Notice';
import { SectionCard, TextField } from '../../modals/AddWarehouseModal/fields';
import { type Accounting, FieldGrid, KeyField, money, newLine, type Row } from './shared';

/** Draft editor for an incoming or outgoing invoice: partner, dates, line items with cost allocation, documents. */
export function InvoiceEditor({ acc, draft, setDraft, onSave, onClose }: { acc: Accounting; draft: Row; setDraft: (next: Row | ((current: Row) => Row)) => void; onSave: () => void; onClose: () => void }) {
  const { t, data, busy, run, error } = acc;
  const incoming = draft.direction === 'incoming';
  const setLine = (index: number, next: Row) => setDraft({ ...draft, items: draft.items.map((l: Row, n: number) => n === index ? next : l) });
  const lineNet = (l: Row) => Number(l.quantity || 0) * Number(l.unit_price || 0);
  const lineVat = (l: Row) => { const rate = data.rules.find(r => String(r.id) === String(l.tax_rule_id))?.rate; return rate == null ? null : lineNet(l) * Number(rate) / 100; };
  const net = draft.items.reduce((s: number, l: Row) => s + lineNet(l), 0);
  const vats = draft.items.map(lineVat);
  const vat = vats.includes(null) ? null : vats.reduce((s: number, v: number | null) => s + (v ?? 0), 0);

  return (
    <Dialog size="xl" icon={FilePlus2} title={`${t(draft.direction)} · ${draft.id ? draft.supplier_number || draft.number : t('draft')}`} subtitle={t('noTaxAssumption')} onClose={onClose} closeDisabled={busy} closeLabel={t('close')}
      footer={<>
        <div className="mr-auto flex flex-wrap gap-4 text-sm"><span className="text-slate-500">{t('net')}: <strong className="text-slate-900 dark:text-white">{money(net, draft.currency)}</strong></span><span className="text-slate-500">{t('tax')}: <strong className="text-slate-900 dark:text-white">{vat == null ? '?' : money(vat, draft.currency)}</strong></span><span className="text-slate-500">{t('total')}: <strong className="text-primary">{vat == null ? '—' : money(net + vat, draft.currency)}</strong></span></div>
        <Button variant="outline" disabled={busy} onClick={onClose}>{t('close')}</Button>
        <Button disabled={busy} onClick={onSave}>{t('save')} · {t('draft')}</Button>
      </>}>
      <div className="space-y-3">
        {error && <Notice tone="bad">{error}</Notice>}
        <SectionCard icon={UserRound} title={t('partnerDocument')}>
          <FieldGrid acc={acc} keys={['partner_id', ...(incoming ? ['supplier_number'] : [])]} object={draft} onChange={setDraft} columns="sm:grid-cols-2" />
        </SectionCard>
        <SectionCard icon={CalendarDays} title={t('datesCurrency')}>
          <FieldGrid acc={acc} keys={['issued_at', 'due_at', 'event_date', 'tax_date', 'posting_date', 'currency', 'exchange_rate', 'exchange_date', 'exchange_source', 'exchange_reason']} object={draft} onChange={setDraft} columns="sm:grid-cols-2 lg:grid-cols-5" />
        </SectionCard>
        <SectionCard icon={ListChecks} title={t(incoming ? 'items_costs' : 'lines')} action={<Button size="sm" variant="outline" onClick={() => setDraft({ ...draft, items: [...draft.items, newLine()] })} className="gap-1.5"><Plus className="h-3.5 w-3.5" />{t('addLine')}</Button>}>
          {!draft.items.length ? <p className="py-6 text-center text-sm text-slate-500">{t('empty')}</p> : <div className="space-y-3">{draft.items.map((line: Row, index: number) => (
            <div key={index} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="grid gap-3 lg:grid-cols-12">
                <label className="lg:col-span-4"><span className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">{t('description')}</span><TextField value={line.description} onChange={e => setLine(index, { ...line, description: e.target.value })} /></label>
                <label className="lg:col-span-1"><span className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">{t('quantity')}</span><TextField inputMode="decimal" value={line.quantity} onChange={e => setLine(index, { ...line, quantity: e.target.value })} /></label>
                <label className="lg:col-span-2"><span className="mb-1 block text-[11px] font-semibold text-slate-600 dark:text-slate-400">{t('unit_price')}</span><TextField inputMode="decimal" value={line.unit_price} onChange={e => setLine(index, { ...line, unit_price: e.target.value })} /></label>
                <div className="lg:col-span-2"><KeyField acc={acc} name="account_id" value={line.account_id} onChange={v => setLine(index, { ...line, account_id: v })} /></div>
                <div className="lg:col-span-2"><KeyField acc={acc} name="tax_rule_id" value={line.tax_rule_id} onChange={v => setLine(index, { ...line, tax_rule_id: v })} /></div>
                <div className="flex items-end justify-between gap-2 lg:col-span-1"><strong className="pb-2 text-sm tabular-nums">{money(lineNet(line))}</strong><Button size="sm" variant="ghost" aria-label={t('remove')} onClick={() => setDraft({ ...draft, items: draft.items.filter((_: Row, n: number) => n !== index) })}><Trash2 className="h-4 w-4 text-rose-500" /></Button></div>
                {!incoming && <div className="lg:col-span-4"><KeyField acc={acc} name="workspace_id" value={line.workspace_id} onChange={v => setLine(index, { ...line, workspace_id: v })} /></div>}
              </div>
              {incoming && <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-slate-600 dark:text-slate-300">{t('costAllocation')} <span className="font-normal text-slate-400">· {t('replacement')}</span></p><Button size="sm" variant="ghost" onClick={() => setLine(index, { ...line, allocations: [...(line.allocations || []), { workspace_id: '', amount: String(lineNet(line).toFixed(2)), estimate_id: '' }] })} className="gap-1"><Plus className="h-3.5 w-3.5" />{t('costs')}</Button></div>
                {(line.allocations || []).length ? <DataTable className="text-xs"><tbody>{line.allocations.map((allocation: Row, n: number) => {
                  const setAllocation = (next: Row) => { const list = [...line.allocations]; list[n] = next; setLine(index, { ...line, allocations: list }); };
                  return <tr key={n}><td className="w-1/2"><KeyField acc={acc} name="workspace_id" value={allocation.workspace_id} onChange={v => setAllocation({ ...allocation, workspace_id: v, estimate_id: '' })} /></td><td><KeyField acc={acc} name="amount" value={allocation.amount} onChange={v => setAllocation({ ...allocation, amount: v })} /></td><td><KeyField acc={acc} name="estimate_id" value={allocation.estimate_id} onChange={v => setAllocation({ ...allocation, estimate_id: v })} options={data.estimates.filter(a => String(a.workspace_id) === String(allocation.workspace_id)).map(a => [String(a.id), `${a.description} · ${a.amount} ${a.currency}`])} /></td><td className="w-10 align-bottom"><Button size="sm" variant="ghost" aria-label={t('remove')} onClick={() => setLine(index, { ...line, allocations: line.allocations.filter((_: Row, i: number) => i !== n) })}><Trash2 className="h-4 w-4 text-slate-400" /></Button></td></tr>;
                })}</tbody></DataTable> : <p className="text-xs text-slate-400">{t('overhead')}</p>}
              </div>}
            </div>
          ))}</div>}
        </SectionCard>
        <SectionCard icon={Paperclip} title={t('documents')}>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-4 text-sm font-semibold text-slate-500 hover:border-primary hover:text-primary dark:border-slate-700">
            <Upload className="h-4 w-4" />{t('upload')} · {draft.document_ids.length} {t('document')}
            <input className="sr-only" type="file" accept=".pdf,.png,.jpg,.jpeg" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) void run(async () => { const doc = await api.documents.upload({ file, type: 'INVOICE' }); setDraft(current => ({ ...current, document_ids: [...current.document_ids, doc.id] })); }); }} />
          </label>
        </SectionCard>
      </div>
    </Dialog>
  );
}
