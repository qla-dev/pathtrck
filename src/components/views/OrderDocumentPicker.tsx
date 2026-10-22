import { useId, useRef, useState } from 'react';
import { FileText, UploadCloud } from 'lucide-react';
import { api } from '../../services/api';
import { useOpsCopy } from './opsCopy';
import { Button } from '../ui/Button';

type Document = {id:number;name:string};
type Props = {company:number;order:number;documents:Array<Record<string,any>>;value:number[];onChange:(ids:number[])=>void;onDocuments:(docs:Array<Record<string,any>>)=>void;disabled?:boolean;onBusy?:(busy:boolean)=>void;selectable?:boolean};

/** Upload once, attach to this order, then select as evidence. Failed links can be retried. */
export function OrderDocumentPicker({company,order,documents,value,onChange,onDocuments,disabled=false,onBusy,selectable=true}:Props) {
 const {t}=useOpsCopy(), id=useId(), input=useRef<HTMLInputElement>(null), locked=useRef(false);
 const [uploading,setUploading]=useState(false),[drag,setDrag]=useState(false),[message,setMessage]=useState('');
 const [failed,setFailed]=useState<Array<{doc:Document;error:string}>>([]);
 const update=(doc:Document,docs=documents,ids=value)=>{const next=docs.some(x=>Number(x.id)===doc.id)?docs:[...docs,doc];onDocuments(next);onChange([...new Set([...ids,doc.id])]);return next;};
 const attach=async(doc:Document)=>{if(!order)return;await api.accounting.send(company,`ops/orders/${order}/compliance-documents`,{document_id:doc.id});};
 const select=async(doc:Record<string,any>,checked:boolean)=>{
  if(disabled||locked.current)return;
  if(!checked){onChange(value.filter(id=>id!==Number(doc.id)));return;}
  if(doc.linked!==false){onChange([...new Set([...value,Number(doc.id)])]);return;}
  locked.current=true;setUploading(true);onBusy?.(true);setMessage('');
  try{await attach({id:Number(doc.id),name:doc.name});onDocuments(documents.map(d=>d.id===doc.id?{...d,linked:true}:d));onChange([...new Set([...value,Number(doc.id)])]);}
  catch(error){setMessage(error instanceof Error?error.message:String(error));}
  finally{locked.current=false;setUploading(false);onBusy?.(false);}
 };
 const upload=async(files:File[])=>{
  if(disabled||locked.current||!files.length)return;
  locked.current=true;setUploading(true);onBusy?.(true);setMessage('');
  let docs=documents,ids=value;const errors:string[]=[];
  try {
   const unique=files.filter((f,i)=>files.findIndex(x=>x.name===f.name&&x.size===f.size&&x.lastModified===f.lastModified)===i);
   for(const file of unique){
    if(file.size>25*1024*1024){errors.push(`${file.name}: ${t('Datoteka je prevelika (najviše 25 MB).')}`);continue;}
    try {
     const result=await api.documents.upload({file,type:'transport_document'});
     const doc={id:Number(result.id),name:String(result.name||file.name)};
     try {await attach(doc);docs=update(doc,docs,ids);ids=[...new Set([...ids,doc.id])];}
     catch(error){const message=error instanceof Error?error.message:String(error);errors.push(`${file.name}: ${message}`);setFailed(old=>[...old,{doc,error:message}]);}
    }catch(error){errors.push(`${file.name}: ${error instanceof Error?error.message:String(error)}`);}
   }
   setMessage(errors.join(' · ')||(order?t('Dokument je učitan i povezan s nalogom. Izbor dokaza potvrdite čuvanjem zadatka.'):t('Dokument je učitan. Pregledajte podatke prije kreiranja naloga.')));
  }finally{locked.current=false;setUploading(false);onBusy?.(false);if(input.current)input.current.value='';}
 };
 return <section className="space-y-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700" aria-label={t('Dokumenti naloga')}>
  <div onDragOver={e=>{e.preventDefault();if(!disabled)setDrag(true);}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);void upload(Array.from(e.dataTransfer.files));}}
   className={`rounded-xl border-2 border-dashed p-4 text-center transition-colors ${drag?'border-sky-500 bg-sky-50 dark:bg-sky-950':'border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-900'} ${disabled?'opacity-60':''}`}>
   <UploadCloud className="mx-auto mb-2 h-7 w-7 text-sky-500"/><p className="font-semibold">{t('Učitaj ili ispusti dokumente')}</p><p className="mt-1 text-xs text-slate-500">{t('PDF, slike i uredski dokumenti · do 25 MB po datoteci')}</p>
   <input ref={input} id={id} type="file" multiple className="sr-only" disabled={disabled||uploading} onChange={e=>void upload(Array.from(e.target.files||[]))}/>
   <Button type="button" size="sm" variant="outline" className="mt-3" disabled={disabled||uploading} onClick={()=>input.current?.click()}>{t(uploading?'Učitavanje dokumenata…':'Izaberi datoteke')}</Button>
  </div>
  <p className="text-xs font-semibold text-slate-500">{t('Postojeći dokumenti naloga')}</p>
  {!documents.length&&<p className="text-xs text-slate-500">{t('Još nema dokumenata. Dodajte prvi dokument iznad.')}</p>}
  <div className="max-h-40 space-y-1 overflow-y-auto">{documents.map(doc=><label key={doc.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-800">{selectable&&<input type="checkbox" disabled={disabled||uploading} checked={value.includes(Number(doc.id))} onChange={e=>void select(doc,e.target.checked)}/>}<FileText className="h-4 w-4 shrink-0 text-sky-600"/><span className="break-all">{doc.name}</span></label>)}</div>
  {message&&<p role="status" className="text-xs text-slate-600 dark:text-slate-300">{message}</p>}
  {failed.map(({doc,error})=><div key={doc.id} role="alert" className="text-xs text-rose-600">{doc.name}: {error}<Button type="button" size="sm" variant="outline" disabled={disabled||uploading} onClick={async()=>{if(locked.current)return;locked.current=true;setUploading(true);onBusy?.(true);try{await attach(doc);update(doc);setFailed(items=>items.filter(x=>x.doc.id!==doc.id));}catch(e){setFailed(items=>items.map(x=>x.doc.id===doc.id?{doc,error:String(e)}:x));}finally{locked.current=false;setUploading(false);onBusy?.(false);}}}>{t('Pokušaj ponovo povezati')}</Button></div>)}
 </section>;
}
