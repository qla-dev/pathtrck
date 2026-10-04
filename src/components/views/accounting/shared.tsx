import { useCallback, useEffect, useRef, useState } from 'react';
import { Hash, ListFilter } from 'lucide-react';

import type { Language } from '../../../types';
import { api, ApiError } from '../../../services/api';
import { IconSelect } from '../../ui/IconSelect';
import { type StatusTone } from '../../ui/StatusBadge';
import { Label, TextField } from '../../modals/AddWarehouseModal/fields';
import { accountingText } from '../accountingCopy';

export type Row = Record<string, any>;
export type Translate = (key: string) => string;
export type Context = { abilities: string[]; available_abilities: string[]; can_manage_permissions: boolean; configured: boolean; company: Row; user_id: number };
export type Data = { settings: Row | null; accounts: Row[]; periods: Row[]; rules: Row[]; jobs: Row[]; entries: Row[]; bank: Row[]; invoices: Row[]; allocations: Row[]; advances: Row[]; estimates: Row[]; audit: Row[]; balances: Row[]; deliveries: Row[]; job_margins: Row[]; partners: Row[] };
export const emptyData: Data = { settings: null, accounts: [], periods: [], rules: [], jobs: [], entries: [], bank: [], invoices: [], allocations: [], advances: [], estimates: [], audit: [], balances: [], deliveries: [], job_margins: [], partners: [] };

export const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Sarajevo' }).format(new Date());
export const newLine = (): Row => ({ description: '', quantity: '1', unit_price: '0', account_id: '', tax_rule_id: '', workspace_id: '', allocations: [] });
export const money = (value: unknown, currency = '') => {
  const n = Number(value);
  return Number.isFinite(n) ? `${new Intl.NumberFormat('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}${currency ? ` ${currency}` : ''}` : '—';
};
export const shortDate = (value: unknown) => String(value ?? '').slice(0, 10) || '—';

/** One colour vocabulary for every accounting status (approval, issuance, posting, payment, fiscal). */
export const statusTone = (status: string | null | undefined): StatusTone => {
  if (!status) return 'muted';
  if (['approved', 'issued', 'posted', 'paid', 'fiscal_fiscalised', 'open', 'ok', 'sent'].includes(status)) return 'ok';
  if (['pending', 'partial', 'fiscal_pending', 'fiscal_unconfirmed', 'fiscal_refund_pending', 'fiscal_refund_unconfirmed', 'sending', 'unverified'].includes(status)) return 'warn';
  if (['rejected', 'failed', 'fiscal_failed', 'delivery_failed', 'reversed', 'locked'].includes(status)) return 'bad';
  if (['fiscal_refunded', 'unpaid', 'unposted'].includes(status)) return 'info';
  return 'muted';
};

export const downloadCsv = (rows: Row[], name: string) => {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]).filter(k => typeof rows[0][k] !== 'object');
  const escaped = (v: unknown) => `"${String(v ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`;
  const blob = new Blob(['﻿' + [keys, ...rows.map(r => keys.map(k => r[k]))].map(r => r.map(escaped).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `accounting-${name}.csv`; a.click(); URL.revokeObjectURL(url);
};

/** Company, permissions and overview data of the accounting API, shared by Accounting and Smart POS. */
export function useAccounting(lang: Language) {
  const t: Translate = useCallback((key: string) => accountingText(lang, key), [lang]);
  const [companies, setCompanies] = useState<Row[]>([]); const [company, setCompany] = useState(0);
  const companyRef = useRef(company); companyRef.current = company;
  const [context, setContext] = useState<Context | null>(null); const [data, setData] = useState<Data>(emptyData);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true);
  const can = (ability: string) => context?.abilities.includes(ability) ?? false;
  const fail = useCallback((e: unknown) => setError(e instanceof ApiError ? [e.message, ...Object.values(e.errors).flat()].join(' · ') : e instanceof Error ? e.message : String(e)), []);
  const refresh = useCallback(async () => {
    if (!company) return;
    const ctx = (await api.accounting.get<Context>(company, 'context')).data; if (companyRef.current !== company) return; setContext(ctx);
    const overview = ctx.abilities.includes('view') ? (await api.accounting.get<Data>(company, 'overview')).data : emptyData;
    if (companyRef.current === company) setData(overview);
  }, [company]);
  useEffect(() => { let live = true; api.accounting.companies().then(r => { if (live) { setCompanies(r.data); setCompany(r.data[0]?.id ?? 0); setLoading(false); } }).catch(e => { if (live) { fail(e); setLoading(false); } }); return () => { live = false; }; }, [fail]);
  useEffect(() => { let live = true; setContext(null); setData(emptyData); setError(''); setLoading(true);
    if (company) refresh().catch(e => { if (live) fail(e); }).finally(() => { if (live) setLoading(false); }); else setLoading(false);
    return () => { live = false; };
  }, [company, refresh, fail]);
  /** Runs one mutation at a time, then reloads the overview. Returns false when it failed. */
  const run = async (fn: () => Promise<unknown>) => { if (busy) return false; setBusy(true); setError(''); try { await fn(); await refresh(); return true; } catch (e) { fail(e); return false; } finally { setBusy(false); } };
  const send = (path: string, payload: unknown, method = 'POST') => api.accounting.send<Row>(company, path, payload, method);

  return { t, companies, company, setCompany, context, data, error, setError, busy, loading, can, fail, refresh, run, send };
}
export type Accounting = ReturnType<typeof useAccounting>;

/** Select options for a field key, derived from the overview data. */
export const optionsFor = (acc: Accounting, key: string, extra?: { rulesJurisdiction?: boolean }): string[][] | undefined => {
  const { data, t } = acc;
  if (key.endsWith('account_id')) return data.accounts.map(a => [String(a.id), `${a.code} — ${a.name}`]);
  if (key === 'tax_rule_id') return data.rules.filter(r => r.verification_status === 'approved').map(r => [String(r.id), `${r.name} · ${r.version} · ${r.rate ?? '?'}%`]);
  if (key === 'workspace_id') return data.jobs.map(j => [String(j.id), `${j.reference || j.id} · ${j.agreed_amount} ${j.currency || ''}`]);
  if (key === 'partner_id') return data.partners.map(p => [String(p.id), `${p.name}${p.tax_number ? ` · ${p.tax_number}` : ''}`]);
  if (key === 'payment_method') return ['cash', 'card', 'cheque', 'transfer', 'voucher'].map(k => [k, t(`pay_${k}`)]);
  if (key === 'direction') return ['incoming', 'outgoing'].map(k => [k, t(k)]);
  if (key === 'kind') return ['asset', 'liability', 'equity', 'income', 'expense'].map(k => [k, t(k)]);
  if (key === 'jurisdiction') return ['FBiH', 'RS', 'BD', ...(extra?.rulesJurisdiction ? ['BA'] : [])].map(k => [k, k]);
  if (key === 'bank_transaction_id') return data.bank.map(b => [String(b.id), `${b.reference} · ${b.partner_name} · ${b.amount} ${b.currency}`]);
  if (key === 'invoice_id') return data.invoices.filter(i => i.posting_status === 'posted' && !i.corrects_invoice_id).map(i => [String(i.id), `${i.supplier_number || i.number} · ${i.partner_name} · ${i.remaining_amount} ${i.currency}`]);
  return undefined;
};

/** A labelled field for an accounting key: a searchable select when the key has options, otherwise a text or date input. */
export const KeyField = ({ acc, name, value, onChange, required = false, disabled = false, options, rulesJurisdiction }: {
  acc: Accounting; name: string; value: unknown; onChange: (value: string) => void; required?: boolean; disabled?: boolean; options?: string[][]; rulesJurisdiction?: boolean;
}) => {
  const opts = options || optionsFor(acc, name, { rulesJurisdiction });
  const type = /(_at|_date|_on|_from|_until)$/.test(name) || ['from', 'to'].includes(name) ? 'date' : name === 'source_url' ? 'url' : 'text';
  return (
    <label className="block min-w-0">
      <Label required={required}>{acc.t(name)}</Label>
      {opts
        ? <IconSelect value={String(value ?? '')} onChange={onChange} disabled={disabled} ariaLabel={acc.t(name)} icon={ListFilter} placeholder="—" searchable={opts.length > 8} searchPlaceholder={acc.t('search')} noResults={acc.t('empty')}
            options={[{ value: '', label: '—', icon: ListFilter }, ...opts.map(([id, label]) => ({ value: id, label, icon: Hash }))]} />
        : <TextField type={type} value={String(value ?? '')} onChange={e => onChange(e.target.value)} disabled={disabled} required={required} />}
    </label>
  );
};

/** A responsive grid of KeyFields bound to one object. */
export const FieldGrid = ({ acc, keys, object, onChange, required = [], columns = 'sm:grid-cols-2 lg:grid-cols-3', rulesJurisdiction }: {
  acc: Accounting; keys: string[]; object: Row; onChange: (next: Row) => void; required?: string[] | true; columns?: string; rulesJurisdiction?: boolean;
}) => (
  <div className={`grid gap-3 ${columns}`}>
    {keys.map(k => <KeyField key={k} acc={acc} name={k} value={object[k]} rulesJurisdiction={rulesJurisdiction}
      required={required === true || required.includes(k)} onChange={v => onChange({ ...object, [k]: v })} />)}
  </div>
);
