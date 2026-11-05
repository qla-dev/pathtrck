import { useState } from 'react';
import type { Language } from '../../types';
import { api } from '../../services/api';
import { Button } from '../ui/Button';

const departments: Record<string, [string, string]> = {
  management: ['Uprava', 'Management'], sales: ['Prodaja / CRM', 'Sales / CRM'], operations: ['Operativa', 'Operations'],
  customs: ['Carina i špedicija', 'Customs and forwarding'], warehouse: ['Skladište', 'Warehouse'],
  finance: ['Finansije i računovodstvo', 'Finance and accounting'], procurement: ['Nabavka', 'Procurement'],
};
const subdepartments: Record<string, string> = { road: 'Road / Ground', air: 'Air', sea: 'Sea', rail: 'Rail', multimodal: 'Multimodal' };

export function CompanyOrganizationEditor({ lang, member, refresh }: {
  lang: Language;
  member: { databaseId: number; businessDepartments: string[]; subdepartments: string[]; canManage: boolean; status: string };
  refresh: () => Promise<void>;
}) {
  const bs = lang === 'bs';
  const [business, setBusiness] = useState(member.businessDepartments);
  const [sub, setSub] = useState(member.subdepartments);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const disabled = !member.canManage || member.status !== 'Active' || busy;
  const toggle = (values: string[], key: string, checked: boolean) => checked ? [...values, key] : values.filter(v => v !== key);
  const save = async () => {
    setBusy(true); setMessage('');
    try {
      await api.companyMemberships.update(member.databaseId, { business_departments: business, subdepartments: business.includes('operations') ? sub : [] });
      await refresh(); setMessage(bs ? 'Organizacija je sačuvana.' : 'Organization saved.');
    } catch (e) { setMessage(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  return <details className="w-full rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
    <summary className="cursor-pointer font-semibold">{bs ? 'Odjeli i pododjeli' : 'Departments and subdepartments'} · {member.businessDepartments.map(d => departments[d]?.[bs ? 0 : 1] ?? d).join(', ') || (bs ? 'Nisu dodijeljeni' : 'Unassigned')}{member.subdepartments.length > 0 && ` · ${member.subdepartments.map(d => subdepartments[d] ?? d).join(', ')}`}</summary>
    <fieldset disabled={disabled} className="mt-3"><legend className="font-semibold">{bs ? 'Poslovni odjeli' : 'Business departments'}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">{Object.entries(departments).map(([key, label]) => <label key={key} className="flex gap-2"><input type="checkbox" checked={business.includes(key)} onChange={e => { setBusiness(toggle(business, key, e.target.checked)); if (key === 'operations' && !e.target.checked) setSub([]); }} />{label[bs ? 0 : 1]}</label>)}</div>
    </fieldset>
    {business.includes('operations') && <fieldset disabled={disabled} className="mt-4"><legend className="font-semibold">{bs ? 'Operativni pododjeli (opcionalno)' : 'Operations subdepartments (optional)'}</legend><div className="mt-2 flex flex-wrap gap-4">{Object.entries(subdepartments).map(([key, label]) => <label key={key} className="flex gap-2"><input type="checkbox" checked={sub.includes(key)} onChange={e => setSub(toggle(sub, key, e.target.checked))} />{label}</label>)}</div></fieldset>}
    <p className="mt-3 text-xs text-slate-500">{bs ? 'Pododjeli služe raspodjeli rada. Finansije ne zahtijevaju transportni pododjel. Finansijske i druge radnje ovise o zasebnim ovlastima u ovoj firmi.' : 'Subdepartments organize work. Finance requires no transport subdepartment. Financial and other actions depend on separate permissions in this company.'}</p>
    {member.canManage && <Button size="sm" className="mt-3" disabled={disabled} onClick={() => void save()}>{bs ? 'Sačuvaj odjele i pododjele' : 'Save departments and subdepartments'}</Button>}
    {message && <p role="status" className="mt-2 text-xs">{message}</p>}
  </details>;
}
