import { useCallback, useEffect, useState } from 'react';
import type { Language } from '../../types';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Notice } from '../ui/Notice';
import { OrderDocumentPicker } from './OrderDocumentPicker';
import { OpsLanguage, useOpsCopy } from './opsCopy';

type Row=Record<string,any>;
const field='w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900';
const fields:Record<string,[string,string]>={goods_type:['Vrsta robe','Goods description'],cargo_type:['Tip tereta','Cargo type'],weight_kg:['Težina (kg)','Weight (kg)'],volume_m3:['Zapremina (m³)','Volume (m³)'],pallets:['Broj paleta','Pallet count'],quantity_measure:['Količina / pakovanje','Quantity / packaging'],length_m:['Dužina (m)','Length (m)'],width_m:['Širina (m)','Width (m)'],height_m:['Visina (m)','Height (m)']};

export function CargoReviewPanel(props:{company?:number;order?:number;workspace?:number;lang?:Language;onChange?:()=>void}) {
 const {lang}=useOpsCopy();
 return <OpsLanguage.Provider value={props.lang||lang}><CargoReviewContent {...props}/></OpsLanguage.Provider>;
}
function CargoReviewContent({company,order,workspace,onChange}:{company?:number;order?:number;workspace?:number;onChange?:()=>void}) {
 const {lang}=useOpsCopy(),regional=['bs','hr','sr'].includes(lang),c=(bs:string,en:string)=>regional?bs:en;
 const [data,setData]=useState<Row|null>(null),[actual,setActual]=useState<Row>({}),[total,setTotal]=useState(''),[basis,setBasis]=useState(''),[reason,setReason]=useState('');
 const [ci,setCi]=useState(''),[pl,setPl]=useState(''),[received,setReceived]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[expanded,setExpanded]=useState(false);
 const request=useCallback(async(body?:Row)=>{
  if(workspace)return api.shipmentWorkspaces.cargoReview(workspace,body);
  if(!company||!order)throw new Error('Missing shipment reference.');
  return body?api.accounting.send<Row>(company,`ops/orders/${order}/cargo-review`,body):api.accounting.get<Row>(company,`ops/orders/${order}/cargo-review`);
 },[company,order,workspace]);
 const apply=(next:Row)=>{setData(next);setActual(next.current||{});setTotal(next.agreed_total||'');};
 const load=useCallback(async()=>{setError('');try{apply((await request()).data);}catch(e){setError(e instanceof Error?e.message:String(e));}},[request]);
 useEffect(()=>{void load();},[load]);
 const run=async(action:string)=>{if(!data||busy)return;setBusy(true);setError('');try{
  const body:Row={action,revision:data.revision,load_fingerprint:data.load_fingerprint,reason};
  if(action==='report')Object.assign(body,{ci_document_id:Number(ci),pl_document_id:Number(pl),documents_received:received,actual:Object.fromEntries(Object.entries(actual).map(([key,value])=>[key,value===''?null:value])),proposed_total:total,pricing_basis:basis});
  apply((await request(body)).data);setReason('');setReceived(false);setExpanded(false);onChange?.();
 }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}};
 if(!data?.available)return error?<Notice tone="bad">{error}</Notice>:null;
 const review=data.review||{},pending=['pending_customer','rejected','review_required'].includes(review.status),docs:Row[]=data.documents||[];
 return <section className={`space-y-3 rounded-2xl border p-4 ${pending?'border-rose-300 bg-rose-50 dark:bg-rose-950/20':'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'}`}>
  <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-bold">{c('CI + PL · provjera robe i cijene','CI + PL · cargo and price review')}</h3><p className="text-xs text-slate-500">{c('Provjera prema dokumentima; izmjena ugovorenih uslova traži potvrdu kupca.','Review against the documents. Changes to agreed terms require customer acceptance.')}</p></div><Button type="button" size="sm" variant="outline" disabled={busy} onClick={()=>void load()}>{c('Osvježi','Refresh')}</Button></div>
  {error&&<Notice tone="bad">{error}</Notice>}
  {pending&&<Notice tone="bad">{c('HITNO: nastavak operacija je blokiran do prihvatanja podataka i cijene.','URGENT: operations are on hold until the customer accepts the cargo data and price.')}{review.status==='rejected'&&` ${c('Kupac je odbio prijedlog; pružalac treba dostaviti novi.','The customer rejected the proposal. The provider must submit a revised proposal.')}`}</Notice>}
  <p className="text-sm">{c('Trenutno ugovoreno','Current agreed total')}: <strong>{data.agreed_total} {data.currency}</strong></p>
  {review.revision>0&&<div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900"><p className="font-semibold">{c('Prijedlog','Proposal')} #{review.revision} · {({pending_customer:c('Čeka kupca','Awaiting customer'),accepted:c('Prihvaćeno','Accepted'),rejected:c('Odbijeno','Rejected'),verified:c('Dokumenti odgovaraju','Documents match'),review_required:c('Dokazi izmijenjeni — ponovni pregled','Evidence changed — new review required')} as Row)[review.status]}</p>
   <p>{c('Prethodna cijena → predložena ukupna cijena','Previous total → proposed total')}: <strong>{review.previous_total} → {review.proposed_total} {review.currency}</strong></p><p>{c('Osnov obračuna','Pricing basis')}: {review.pricing_basis}</p><p>{c('Razlog','Reason')}: {review.reason}</p>
   {Object.entries(review.changes||{}).map(([key,change])=><p key={key}>{fields[key]?.[regional?0:1]||key}: <strong>{String((change as Row).before??'—')} → {String((change as Row).after??'—')}</strong></p>)}
   <p className="text-xs text-slate-500">{c('CI / PL dokazi','CI / PL evidence')}: {(review.document_ids||[]).map((id:number)=>docs.find(doc=>Number(doc.id)===id)?.name||`#${id}`).join(' · ')}</p>
   <p className="text-xs text-slate-500">{c('Prijavio korisnik','Reported by user')} #{review.reported_by} · {review.reported_at}{review.decided_by&&` · ${c('Odluka korisnika','Decision by user')} #${review.decided_by} · ${review.decided_at}`}</p>
  </div>}
  {data.can_confirm&&<div className="space-y-2"><label className="grid gap-1 text-sm">{c('Napomena uz odluku','Decision note')}<textarea className={field} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="flex flex-wrap gap-2"><Button type="button" disabled={busy||reason.trim().length<5} onClick={()=>void run('approve')}>{c('Prihvati podatke i ukupnu cijenu','Accept cargo data and total price')}</Button><Button type="button" variant="outline" disabled={busy||reason.trim().length<5} onClick={()=>void run('reject')}>{c('Odbij prijedlog','Reject proposal')}</Button></div></div>}
  {data.can_report&&<><Button type="button" size="sm" variant="outline" disabled={busy} onClick={()=>setExpanded(!expanded)}>{c('Pregledaj CI/PL ili predloži korekciju','Review CI/PL or propose an amendment')}</Button>{expanded&&<div className="space-y-3">
   {company&&order&&<OrderDocumentPicker company={company} order={order} documents={docs} value={[]} selectable={false} onChange={()=>{}} onDocuments={documents=>setData({...data,documents})} onBusy={setBusy} disabled={busy}/>}
   <div className="grid gap-3 sm:grid-cols-2">{[['ci',c('Komercijalna faktura (CI)','Commercial invoice (CI)')],['pl',c('Pakirna lista (PL)','Packing list (PL)')]].map(([key,label])=><label key={key} className="grid gap-1 text-sm">{label}<select className={field} disabled={busy} value={key==='ci'?ci:pl} onChange={e=>key==='ci'?setCi(e.target.value):setPl(e.target.value)}><option value="">{c('Izaberi dokument','Select document')}</option>{docs.map(doc=><option key={doc.id} value={doc.id}>{doc.name}</option>)}</select></label>)}</div>
   <p className="text-xs text-slate-500">{c('Unesite stvarne podatke sa CI/PL. Dokumenti se ne čitaju automatski.','Enter the actual cargo details from CI/PL. Documents are not read automatically.')}</p>
   <div className="grid gap-3 sm:grid-cols-3">{Object.entries(fields).map(([key,labels])=><label key={key} className="grid gap-1 text-xs">{labels[regional?0:1]}<input className={field} disabled={busy} type={['goods_type','cargo_type','quantity_measure'].includes(key)?'text':'number'} min="0" step={key==='pallets'?'1':'any'} value={actual[key]??''} onChange={e=>setActual({...actual,[key]:e.target.value})}/></label>)}</div>
   <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm">{c('Predložena ukupna cijena','Proposed total price')} ({data.currency})<input className={field} type="number" min="0.01" step="0.01" value={total} onChange={e=>setTotal(e.target.value)}/></label><label className="grid gap-1 text-sm">{c('Osnov obračuna / promjene cijene','Pricing basis / reason for the price change')}<input className={field} value={basis} onChange={e=>setBasis(e.target.value)} placeholder={c('npr. stvarna težina × ugovorena tarifa','e.g., actual weight × agreed rate')}/></label></div>
   <label className="grid gap-1 text-sm">{c('Razlog provjere ili korekcije','Reason for the review or amendment')}<textarea className={field} value={reason} onChange={e=>setReason(e.target.value)}/></label>
   <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={received} onChange={e=>setReceived(e.target.checked)}/>{c('Potvrđujem prijem i provjeru CI + PL.','I confirm that CI + PL have been received and reviewed.')}</label>
   <Button type="button" disabled={busy||!received||!ci||!pl||ci===pl||reason.trim().length<5||basis.trim().length<3||Number(total)<=0} onClick={()=>void run('report')}>{c('Potvrdi provjeru / pošalji prijedlog kupcu','Confirm review / send proposal to customer')}</Button>
  </div>}</>}
  <p className="text-xs text-slate-500">{c('Izvorna ponuda ostaje u historiji. Prihvaćena korekcija mijenja ugovorenu cijenu posla; fakturisanje i knjiženje ostaju u Računovodstvu.','The original offer stays in the history. An accepted amendment changes the agreed job price; invoicing and posting remain in Accounting.')}</p>
 </section>;
}
