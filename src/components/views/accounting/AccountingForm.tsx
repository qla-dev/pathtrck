import { FileSignature, Plus, Upload } from 'lucide-react';

import { api } from '../../../services/api';
import { Button } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';
import { Notice } from '../../ui/Notice';
import { Label } from '../../modals/AddWarehouseModal/fields';
import { type Accounting, FieldGrid, type Row } from './shared';

const KEYS: Record<string, string[]> = {
  settings: ['jurisdiction', 'base_currency', 'invoice_prefix'], accounts: ['code', 'name', 'kind'], periods: ['name', 'starts_on', 'ends_on'],
  partners: ['name', 'country_code', 'tax_number', 'vat_number', 'address', 'email'], fromJob: ['workspace_id'],
  rules: ['name', 'jurisdiction', 'treatment', 'conditions', 'rate', 'deductible_percent', 'effective_from', 'applies_from', 'source_url', 'article', 'version'],
  bank: ['reference', 'bank_account', 'partner_id', 'direction', 'transaction_date', 'amount', 'currency', 'exchange_rate', 'exchange_source'],
  allocations: ['bank_transaction_id', 'invoice_id', 'amount', 'posting_date', 'bank_account_id', 'fx_gain_account_id', 'fx_loss_account_id'],
  advances: ['bank_transaction_id', 'bank_account_id', 'control_account_id'], periodStatus: ['reason'], approveRule: ['review_note'], reverse: ['posting_date', 'reason'],
  corrective: ['posting_date', 'reason'], deliver: ['recipient'], fiscalise: ['payment_method'], refund: ['reason'], confirmFiscal: ['fiscal_number'],
  importAccounts: ['review_note'], estimates: ['workspace_id', 'description', 'amount', 'currency'], journal: ['posting_date', 'description'],
};
const OPTIONAL: Record<string, string[]> = { partners: ['tax_number', 'vat_number', 'address', 'email'], allocations: KEYS.allocations };
const PATHS: Record<string, (form: Row) => string> = {
  periodStatus: f => `periods/${f.id}/status`, approveRule: f => `rules/${f.id}/approve`, reverse: f => `entries/${f.id}/reverse`,
  corrective: f => `invoices/${f.id}/corrective`, deliver: f => `invoices/${f.id}/deliver`, importAccounts: () => 'accounts/import', fromJob: () => 'jobs/invoice',
  fiscalise: f => `pos/invoices/${f.id}/fiscalise`, refund: f => `pos/invoices/${f.id}/refund`, confirmFiscal: f => `pos/invoices/${f.id}/confirm`,
};

/** Every small accounting action (settings, accounts, bank, allocations, fiscal actions, ...) as one titled dialog form. */
export function AccountingForm({ acc, name, form, setForm, onClose }: { acc: Accounting; name: string; form: Row; setForm: (next: Row) => void; onClose: () => void }) {
  const { t, data, busy, run, send, error } = acc;
  const keys = KEYS[name] || ['posting_date', 'description'];
  const required = keys.filter(k => !(OPTIONAL[name] || []).includes(k));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form };
    if (['allocations', 'deliver', 'fiscalise', 'refund', 'confirmFiscal'].includes(name)) payload.request_key ||= crypto.randomUUID();
    if (name === 'deliver') payload.document_ids ||= [];
    if (name === 'importAccounts') payload.accounts = String(form.csv || '').trim().split(/\r?\n/).filter(Boolean).filter((row, i) => i !== 0 || !/^code[,;]/i.test(row)).map(row => { const [code, title, kind] = row.split(/[,;]/).map(v => v.trim()); return { code, name: title, kind }; });
    void run(() => send((PATHS[name] || (() => name))(form), payload)).then(ok => { if (ok) onClose(); });
  };

  return (
    <Dialog size={['rules', 'bank', 'allocations', 'journal', 'importAccounts'].includes(name) ? 'lg' : 'md'} icon={FileSignature} title={t(name)} onClose={onClose} closeDisabled={busy} closeLabel={t('close')}>
      <form className="space-y-4" onSubmit={submit}>
        {error && <Notice tone="bad">{error}</Notice>}
        <FieldGrid acc={acc} keys={keys} object={form} onChange={setForm} required={required} columns="sm:grid-cols-2" rulesJurisdiction={name === 'rules'} />
        {name === 'importAccounts' && <label className="block"><Label required>{t('chartCsv')}</Label><textarea className="min-h-48 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-xs outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-950" value={form.csv || ''} onChange={e => setForm({ ...form, csv: e.target.value })} required /></label>}
        {name === 'deliver' && <div className="space-y-2">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 p-3 text-sm font-semibold text-slate-500 hover:border-primary hover:text-primary dark:border-slate-700"><Upload className="h-4 w-4" />{t('upload')}
            <input className="sr-only" type="file" disabled={busy} onChange={e => { const file = e.target.files?.[0]; if (file) void run(async () => { const doc = await api.documents.upload({ file, type: 'OTHER' }); await send(`invoices/${form.id}/documents`, { document_ids: [doc.id] }); setForm({ ...form, document_ids: [...(form.document_ids || []), doc.id] }); }); }} /></label>
          {data.invoices.find(i => i.id === form.id)?.documents.map((d: Row) => <label className="flex items-center gap-2 text-sm" key={d.id}><input type="checkbox" checked={(form.document_ids || []).includes(d.id)} onChange={e => setForm({ ...form, document_ids: e.target.checked ? [...form.document_ids, d.id] : form.document_ids.filter((id: number) => id !== d.id) })} />{d.name}</label>)}
        </div>}
        {name === 'journal' && <div className="space-y-2">
          {(form.lines || []).map((line: Row, n: number) => <FieldGrid key={n} acc={acc} keys={['account_id', 'debit', 'credit']} object={line} required onChange={next => setForm({ ...form, lines: form.lines.map((l: Row, i: number) => i === n ? next : l) })} />)}
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setForm({ ...form, lines: [...form.lines, { account_id: '', debit: '0', credit: '0' }] })}><Plus className="h-3.5 w-3.5" />{t('addLine')}</Button>
        </div>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>{t('close')}</Button>
          <Button disabled={busy}>{t(name === 'approveRule' ? 'approve' : 'save')}</Button>
        </div>
      </form>
    </Dialog>
  );
}
