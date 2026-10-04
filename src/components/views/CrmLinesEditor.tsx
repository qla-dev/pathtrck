import { Button } from '../ui/Button';
import { Label, TextField } from '../modals/AddWarehouseModal/fields';
import { money, type Row } from './accounting/shared';

/*
 * Lines of a SmartFreight CRM offer/order. The item code and VAT code are PANTHEON codes
 * (tHE_SetItem.acIdent, tHE_SetTax.acVATCode): the CRM push waits until both exist there.
 * Totals are recomputed on the server; the preview here is only a guide.
 */
export const newCrmLine = (): Row => ({ item_code: '', name: '', quantity: '1', unit: 'KOM', unit_price: '0', discount_percent: '0', vat_percent: '17', vat_code: '' });

const FIELDS: Array<[string, string, string]> = [
  ['item_code', 'code', 'w-full sm:w-28'], ['name', 'name', 'min-w-0 flex-1'], ['quantity', 'quantity', 'w-24'], ['unit', 'ops_unit', 'w-20'],
  ['unit_price', 'unit_price', 'w-28'], ['discount_percent', 'crm_discount', 'w-20'], ['vat_percent', 'tax_rate', 'w-20'], ['vat_code', 'crm_vat_code', 'w-20'],
];

export function CrmLinesEditor({ t, lines, currency, onChange }: { t: (k: string) => string; lines: Row[]; currency: string; onChange: (lines: Row[]) => void }) {
  const set = (n: number, key: string, value: string) => onChange(lines.map((l, i) => (i === n ? { ...l, [key]: ['item_code', 'vat_code'].includes(key) ? value.toUpperCase() : value } : l)));
  const net = lines.reduce((sum, l) => sum + Number(l.quantity || 0) * Number(l.unit_price || 0) * (1 - Number(l.discount_percent || 0) / 100), 0);
  const vat = lines.reduce((sum, l) => sum + Number(l.quantity || 0) * Number(l.unit_price || 0) * (1 - Number(l.discount_percent || 0) / 100) * Number(l.vat_percent || 0) / 100, 0);
  return <div className="space-y-2">
    <p className="text-xs text-slate-500">{t('crm_lines_note')}</p>
    {lines.map((line, n) => <div key={n} className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 p-2 dark:border-slate-700">
      {FIELDS.map(([key, label, width]) => <label key={key} className={`block ${width}`}><Label>{t(label)}</Label>
        <TextField value={String(line[key] ?? '')} type={['quantity', 'unit_price', 'discount_percent', 'vat_percent'].includes(key) ? 'number' : 'text'} min="0"
          maxLength={key === 'vat_code' ? 2 : key === 'unit' ? 6 : undefined} onChange={e => set(n, key, e.target.value)} /></label>)}
      <Button type="button" size="sm" variant="ghost" onClick={() => onChange(lines.filter((_, i) => i !== n))}>{t('remove')}</Button>
    </div>)}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button type="button" size="sm" variant="outline" onClick={() => onChange([...lines, newCrmLine()])}>{t('addLine')}</Button>
      {lines.length > 0 && <p className="text-sm">{t('crm_net')}: {money(net, currency)} · {t('crm_vat')}: {money(vat, currency)} · <strong>{t('total')}: {money(net + vat, currency)}</strong></p>}
    </div>
  </div>;
}

export const crmLinesPayload = (lines: Row[]) => lines.map(l => ({ item_code: l.item_code || null, name: l.name, quantity: Number(l.quantity || 0), unit: l.unit || null,
  unit_price: Number(l.unit_price || 0), discount_percent: Number(l.discount_percent || 0), vat_percent: l.vat_percent === '' ? null : Number(l.vat_percent), vat_code: l.vat_code || null }));
