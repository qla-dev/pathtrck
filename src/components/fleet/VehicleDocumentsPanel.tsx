import {useEffect,useState} from 'react';
import type {Language} from '../../types';
import {api} from '../../services/api';
import {Button} from '../ui/Button';
import {Notice} from '../ui/Notice';
import {fleetField} from './fleetCopy';
import {guidanceDocuments} from './vehicleRegistry';
import {VEHICLE_DOCUMENT_TYPES} from './vehicleFormOptions';

export function VehicleDocumentsPanel({vehicle,lang,canManage}:{vehicle:Record<string,any>;lang:Language;canManage:boolean}) {
 const bs=['bs','hr','sr'].includes(lang),u=(a:string,b:string)=>bs?a:b;
 const [docs,setDocs]=useState<Record<string,any>[]>([]),[ready,setReady]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[type,setType]=useState('VEHICLE_REGISTRATION'),[revision,setRevision]=useState(0);
 useEffect(()=>{let live=true;setReady(false);api.documents.list({vehicle_id:vehicle.id,limit:500}).then(r=>{if(live){setDocs(r.data);setReady(true);}}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[vehicle.id,revision]);
 const label=(code:string)=>{const row=VEHICLE_DOCUMENT_TYPES.find(r=>r[0]===code);return row?row[bs?1:2]:code;};
 const replaced=new Set(docs.map(d=>/^Replaces document #(\d+)$/.exec(d.reference||'')?.[1]).filter(Boolean));
 const current=docs.filter(d=>!replaced.has(String(d.id)));
 const required=guidanceDocuments(vehicle.features||{}),missing=required.filter(code=>!current.some(d=>d.type===code&&(!d.expires_at||new Date(d.expires_at)>=new Date())));
 async function run(action:()=>Promise<unknown>){setBusy(true);setError('');try{await action();setRevision(n=>n+1);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const upload=(files:FileList|null,replaceId?:number)=>{const selected=Array.from(files||[]);if(!selected.length)return;void run(async()=>{const failures:string[]=[];for(const file of selected){try{if(replaceId)await api.documents.replace(replaceId,file);else await api.documents.upload({vehicleId:vehicle.id,type,file,name:file.name});}catch(e){failures.push(`${file.name}: ${(e as Error).message}`);}}setRevision(n=>n+1);if(failures.length)throw new Error(failures.join(' · '));});};
 return <section className="space-y-3">{error&&<Notice tone="bad">{error}</Notice>}{ready&&<Notice tone={missing.length?'warn':'info'}><b>{u('Dokumentacija','Documents')}: {required.length-missing.length}/{required.length}</b><p>{missing.length?`${u('Nedostaje ili je isteklo','Missing or expired')}: ${missing.map(label).join(', ')}`:u('Dokumenti su priloženi; provjera usklađenosti je zasebna.','Documents attached; compliance review is separate.')}</p></Notice>}
 {canManage&&<fieldset disabled={busy} className="grid gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-800"><select aria-label={u('Vrsta dokumenta','Document category')} className={fleetField} value={type} onChange={e=>setType(e.target.value)}>{VEHICLE_DOCUMENT_TYPES.map(([code,a,b])=><option key={code} value={code}>{bs?a:b}</option>)}</select><label className="cursor-pointer rounded-xl bg-primary px-3 py-2 text-center text-sm font-semibold text-white">+ {u('Dodaj dokument','Add document')}<input aria-label={u('Dodaj dokument','Add document')} className="sr-only" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" disabled={busy} onChange={e=>{upload(e.target.files);e.target.value='';}}/></label></fieldset>}
 {!ready&&<p role="status">{u('Učitavanje…','Loading…')}</p>}{busy&&<p role="status">{u('Čuvanje…','Saving…')}</p>}
 {docs.map(d=><article key={d.id} className="space-y-2 rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800"><b className="break-all">{d.name}</b><p>{label(d.type)} · {d.created_at?new Date(d.created_at).toLocaleDateString(bs?'hr-HR':lang==='de'?'de-DE':'en-GB'):'—'} · {replaced.has(String(d.id))?u('Zamijenjeno','Replaced'):u('Priloženo','Attached')}</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy} onClick={()=>void run(()=>api.documents.open(d.id,d.name,true))}>{u('Pregled','Preview')}</Button><Button size="sm" variant="outline" disabled={busy} onClick={()=>void run(()=>api.documents.open(d.id,d.name,false))}>{u('Preuzmi','Download')}</Button>{canManage&&<><label className="cursor-pointer rounded-lg border border-slate-200 p-2 dark:border-slate-800">{u('Zamijeni','Replace')}<input aria-label={`${u('Zamijeni','Replace')} ${d.name}`} type="file" className="sr-only" disabled={busy} accept=".pdf,.jpg,.jpeg,.png" onChange={e=>{upload(e.target.files,d.id);e.target.value='';}}/></label><Button size="sm" variant="outline" disabled={busy} onClick={()=>{if(window.confirm(u('Obrisati dokument?','Delete this document?')))void run(()=>api.documents.remove(String(d.id)));}}>{u('Obriši','Delete')}</Button></>}</div></article>)}
 </section>;
}
