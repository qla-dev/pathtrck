import {useFormRecovery,restoreFormValue} from '../../hooks/useFormRecovery';
import { useEffect, useRef, useState } from 'react';
import type { Language } from '../../types';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Notice } from '../ui/Notice';
import { fleetCopy, fleetField } from './fleetCopy';
import { isTrailer } from './vehicleRegistry';

export function VehicleCouplingsPanel({lang,company,vehicle,candidates,canManage,onChanged}:{lang:Language;company:number;vehicle:Record<string,any>;candidates:Record<string,any>[];canManage:boolean;onChanged:()=>Promise<void>}) {
  const t=fleetCopy(lang),[rows,setRows]=useState<Record<string,any>[]>([]),[page,setPage]=useState(1),[last,setLast]=useState(1),[trailer,setTrailer]=useState(''),[position,setPosition]=useState(1),[reason,setReason]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),live=useRef(true);
  const recovery36=useFormRecovery({module:"vehicles",formKey:"VehicleCouplingsPanel",recordKey:String(vehicle.id),companyId:company||undefined,submitPaths:[`^/fleet-operations/${company}/vehicle-couplings/${vehicle.id}(?:/[^/]+/detach)?$`]},{trailer,position,reason},recovered=>{setTrailer((previous:any)=>restoreFormValue(previous,recovered.trailer));setPosition((previous:any)=>restoreFormValue(previous,recovered.position));setReason((previous:any)=>restoreFormValue(previous,recovered.reason));},{active:true,scopeReady:!!(company)});

  const load=async()=>{const r=await api.fleetOperations.get(company,`vehicle-couplings/${vehicle.id}?page=${page}`);if(live.current){setRows(r.data.data);setLast(r.data.last_page);}};
  useEffect(()=>{live.current=true;void load().catch(e=>{if(live.current)setError(e.message);});return()=>{live.current=false;};},[company,vehicle.id,page]);
  const mutate=async(path:string,body:unknown)=>{if(busy)return;setBusy(true);setError('');try{await api.fleetOperations.send(company,path,body);if(!live.current)return;await load();await onChanged();setReason('');setTrailer('');}catch(e){if(live.current)setError((e as Error).message);}finally{if(live.current)setBusy(false);}};
  const motor=['rigid_truck','tractor_unit','cargo_van'].includes(vehicle.features?.resource_type);
  return <div className="space-y-3">{error&&<Notice tone="bad">{error}</Notice>}<Notice>{t('Povezivanje vodi evidenciju sastava. Dopuštene mase, oprema i dozvole kombinacije provjeravaju se zasebno.')}</Notice>
    {canManage&&motor&&<div className="space-y-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800"><select aria-label={t('Poluprikolica ili prikolica')} className={fleetField} value={trailer} onChange={e=>setTrailer(e.target.value)}><option value="">{t('Izaberite zasebno evidentiranu prikolicu')}</option>{candidates.filter(v=>isTrailer(v)&&!['sold','returned','stolen','maintenance'].includes(v.status)&&!v.dispatch_blocked).map(v=><option key={v.id} value={v.id}>{v.registration_number}</option>)}</select><label className="grid gap-1 text-xs">{t('Pozicija u skupu')}<select className={fleetField} value={position} onChange={e=>setPosition(Number(e.target.value))}><option value="1">1</option><option value="2">2 · {t('Posebna kombinacija')}</option></select></label><textarea aria-label={t('Razlog promjene')} className={fleetField} value={reason} onChange={e=>setReason(e.target.value)} placeholder={t('Razlog promjene')}/><Button disabled={busy||!trailer||!reason.trim()} onClick={()=>void mutate(`vehicle-couplings/${vehicle.id}`,{trailer_id:Number(trailer),position,reason})}>{t('Poveži prikolicu')}</Button></div>}
    {canManage&&motor&&rows.some(r=>!r.ended_at)&&<label className="grid gap-1 text-xs">{t('Razlog odvajanja')}<textarea className={fleetField} value={reason} onChange={e=>setReason(e.target.value)}/></label>}
    {rows.map(r=><article key={r.id} className="space-y-1 rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800"><p className="font-semibold">{r.towing_plate} → {r.trailer_plate}</p><p>{t(r.ended_at?'Završena veza':'Aktivna veza')} · {r.position}</p><p className="text-slate-500">{r.started_at}{r.ended_at?` → ${r.ended_at}`:''}</p><p className="break-words text-slate-500">{r.attach_reason}{r.detach_reason?` · ${r.detach_reason}`:''}</p>{canManage&&motor&&!r.ended_at&&<Button size="sm" variant="outline" disabled={busy||!reason.trim()} onClick={()=>void mutate(`vehicle-couplings/${vehicle.id}/${r.id}/detach`,{reason})}>{t('Odvoji prikolicu')}</Button>}</article>)}
    {!rows.length&&<p className="text-sm text-slate-500">{t('Nema zapisa.')}</p>}
    <div className="flex items-center justify-end gap-2 text-xs"><Button size="sm" variant="outline" disabled={busy||page<=1} onClick={()=>setPage(p=>p-1)}>{t('Prethodna')}</Button>{page} / {last}<Button size="sm" variant="outline" disabled={busy||page>=last} onClick={()=>setPage(p=>p+1)}>{t('Sljedeća')}</Button></div>
  </div>;
}
