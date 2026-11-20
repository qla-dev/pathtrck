import {draftFiles} from '../lib/vehicleDraftStorage';

export type DraftContext={module:string;formKey:string;companyId?:number;recordKey?:string;resource?:string;resourceId?:number;baseVersion?:string;submitPaths?:string[];submitFields?:Record<string,string|number|null>;deferCompletion?:boolean};
type Transport=<T=any>(path:string,options?:RequestInit)=>Promise<{data:T}>;
type Saved={id:string;revision:number;payload:any;state?:string;resource?:string;resource_id?:number;base_version?:string;record_changed?:boolean;current_record_hash?:string};
export type DraftEntry={key:string;context:DraftContext;owner:number;id:string;revision:number;payload:any;signature:string;initial:string;ready:boolean;dirty:boolean;status:string;conflict:boolean;recordChanged:boolean;restore:(value:any)=>void;chain:Promise<any>;timer?:ReturnType<typeof setTimeout>;changed:number;active:boolean;closed:boolean;filesMissing:boolean;recovery?:any;restoring:boolean;gesture:number;submitted?:boolean;fileSignature?:string;retryCount?:number};
let transport:Transport,session=0,version=0,gesture=0;const entries=new Map<string,DraftEntry>(),listeners=new Set<()=>void>();
export const draftSubscribe=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
export const draftVersion=()=>version;
const notify=()=>{version++;for(const fn of listeners)fn();};
export const setDraftTransport=(next:Transport)=>{transport=next;};
export function setDraftSession(user:number){if(session===user)return;for(const entry of entries.values())if(entry.timer)clearTimeout(entry.timer);entries.clear();session=user;notify();}
export const draftSession=()=>session;
export const draftEntries=()=>[...new Map([...entries.values()].filter(e=>e.owner===session&&!e.closed&&(e.dirty||e.revision>0)).map(e=>[e.id,e])).values()];
const keyFor=(context:DraftContext)=>`freightbook:form-draft:${session}:${context.companyId||0}:${context.module}:${context.formKey}:${context.recordKey||'new'}`;
const query=(c:DraftContext)=>new URLSearchParams({module:c.module,form_key:c.formKey,record_key:c.recordKey||'new',...c.companyId?{company_id:String(c.companyId)}:{}});
const secret=/password|passphrase|secret|token|card.?number|card.?expiry|card.?cvc|cvv|cvc|api.?key|authorization/i;
/** Plain form values and file references only. Never persist credentials, card data or DOM objects. */
export function encodeDraft(value:any,files:{type:string;file:File}[]=[],key='root'):any {
 if(value instanceof File){const id=`${key}:${value.name}:${value.size}:${value.lastModified}`;files.push({type:id,file:value});return {__draftFile:id,name:value.name,size:value.size};}
 if(value instanceof Date)return {__draftDate:value.toISOString()};
 if(value instanceof Set)return {__draftSet:[...value].map((v,i)=>encodeDraft(v,files,`${key}.${i}`))};
 if(Array.isArray(value))return value.map((v,i)=>encodeDraft(v,files,`${key}.${i}`));
 if(value&&typeof value==='object'){if(typeof Node!=='undefined'&&value instanceof Node)return null;return Object.fromEntries(Object.entries(value).filter(([k,v])=>!secret.test(k)&&typeof v!=='function').map(([k,v])=>[k,encodeDraft(v,files,`${key}.${k}`)]));}
 return value;
}
export function decodeDraft(value:any,files:{type:string;file:File}[]=[],missing={value:false}):any {
 if(value?.__draftFile){const file=files.find(f=>f.type===value.__draftFile)?.file;if(!file)missing.value=true;return file||null;}
 if(value?.__draftDate)return new Date(value.__draftDate);
 if(value?.__draftSet)return new Set(value.__draftSet.map((v:any)=>decodeDraft(v,files,missing)));
 if(Array.isArray(value))return value.map(v=>({raw:v,value:decodeDraft(v,files,missing)})).filter(item=>!(item.raw?.__draftFile&&item.value===null)&&!(item.raw?.file?.__draftFile&&item.value?.file===null)).map(item=>item.value);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,decodeDraft(v,files,missing)]));
 return value;
}
const persist=(e:DraftEntry)=>{if(e.owner!==session)return;try{localStorage.setItem(e.key,JSON.stringify({id:e.id,revision:e.revision,payload:e.payload,dirty:e.dirty,context:e.context}));}catch{e.status='Save failed';}notify();};
export function attachDraft(context:DraftContext,initial:any,restore:(value:any)=>void):DraftEntry {
 const key=keyFor(context);let e=entries.get(key);if(e&&!e.closed){e.restore=restore;if(!e.active&&e.revision>0){const current=e;e.restoring=true;void draftFiles(e.key).catch(()=>[]).then(files=>{if(current.owner===session)current.restore(decodeDraft(current.payload,files));});}e.active=true;return e;}
 const payload=encodeDraft(initial);e={key,context,owner:session,id:crypto.randomUUID(),revision:0,payload,signature:JSON.stringify(payload),initial:JSON.stringify(payload),ready:false,dirty:false,status:'Loading…',conflict:false,recordChanged:false,restore,chain:Promise.resolve(),changed:0,active:true,closed:false,filesMissing:false,restoring:false,gesture};entries.set(key,e);void loadDraft(e);return e;
}
async function loadDraft(e:DraftEntry,force=false){
 const owner=e.owner;let local:any=null;try{local=JSON.parse(localStorage.getItem(e.key)||'null');}catch{}
 let remote:Saved|null=null;let failed=false;
 try{remote=(await transport(`/form-drafts/current?${query(e.context)}${!e.context.recordKey||e.context.recordKey==='new'?'&latest_for_form=1':''}${local?.id?`&recovery_id=${local.id}`:''}`)).data;}catch{failed=true;}
 if(owner!==session||e.closed)return;
 if(remote?.state&&remote.state!=='in_progress'){
   if(remote.state==='completed'&&e.context.deferCompletion&&local?.payload?.form?.savedVehicle){e.submitted=true;remote=null;}
   else {localStorage.removeItem(e.key);local=null;remote=null;}
 }
 if(!force&&e.changed>0){e.ready=true;e.status=failed?'Save failed':'Saving…';notify();scheduleDraft(e);return;}
 const chosen=remote&&(!local||remote.id!==local.id||remote.revision!==local.revision)?remote:local||remote;
 if(local?.dirty&&remote&&(remote.id!==local.id||remote.revision!==local.revision)){e.recovery=local.payload;localStorage.setItem(`${e.key}:recovery`,JSON.stringify(local));}
 if(chosen){e.id=chosen.id;e.revision=chosen.revision;e.payload=chosen.payload;e.signature=JSON.stringify(chosen.payload);e.dirty=!!chosen.dirty;e.recordChanged=!!remote?.record_changed;e.conflict=e.recordChanged;e.status=e.conflict?'Record changed — review recovery':failed?'Save failed':e.dirty?'Saving…':'Saved';
   if(!e.conflict){const actualKey=remote&&(remote as any).record_key?keyFor({...e.context,recordKey:(remote as any).record_key}):e.key;const files=await draftFiles(actualKey).catch(()=>[]);if(owner!==session||e.closed)return;const missing={value:false};const value=decodeDraft(e.payload,files,missing);e.filesMissing=missing.value;if(missing.value)e.signature=JSON.stringify(encodeDraft(value));e.restoring=true;e.restore(value);}
 }else e.status=failed?'Save failed':'Draft';
 e.ready=true;notify();if(e.dirty&&!e.conflict)scheduleDraft(e);
}
export function observeDraft(e:DraftEntry,value:any,active:boolean,context:DraftContext){
 e.active=active;if(e.closed||e.owner!==session||!active)return;
 if(!e.ready&&gesture===e.gesture)return;
 const files:{type:string;file:File}[]=[];const payload=encodeDraft(value,files);if(e.submitted&&e.payload?.form?.savedVehicle&&payload?.form&&!payload.form.savedVehicle)payload.form.savedVehicle=e.payload.form.savedVehicle;const signature=JSON.stringify(payload);
 if(e.restoring){if(signature===e.signature)e.restoring=false;return;}
 if(signature===e.signature)return;
 e.context={...context};e.payload=payload;e.signature=signature;e.dirty=!e.submitted;e.changed++;e.retryCount=0;if(files.length)e.filesMissing=false;e.status=e.submitted?'Vehicle saved — documents pending':e.conflict?'Conflict — draft retained':'Saving…';persist(e);
 // IndexedDB stores selected files on this device, independently of backend synchronisation.
 const fileSignature=JSON.stringify(files.map(f=>f.type));
 if(e.fileSignature!==fileSignature){const needsStorage=files.length>0||(e.fileSignature!==undefined&&e.fileSignature!=='[]');e.fileSignature=fileSignature;if(needsStorage)e.chain=e.chain.catch(()=>{}).then(async()=>{if(e.owner===session)await draftFiles(e.key,files);}).catch(()=>{e.filesMissing=true;notify();});}
 if(!e.submitted)scheduleDraft(e);
}
function scheduleDraft(e:DraftEntry){if(e.timer)clearTimeout(e.timer);e.timer=setTimeout(()=>void flushDraft(e).catch(()=>{}),700);}
export async function flushDraft(e:DraftEntry){
 if(e.timer)clearTimeout(e.timer);
 e.chain=e.chain.catch(()=>{}).then(async()=>{
  if(e.owner!==session||e.closed||!e.dirty)return;if(e.conflict)throw new Error('Review the conflicting draft before submitting.');
  const payload=e.payload,signature=e.signature,revision=e.revision;e.status='Saving…';notify();
  try{const r=await transport(`/form-drafts/${e.id}`,{method:'PUT',body:JSON.stringify({company_id:e.context.companyId||null,module:e.context.module,form_key:e.context.formKey,record_key:e.context.recordKey||'new',resource:e.context.resource||null,resource_id:e.context.resourceId||null,base_version:e.context.baseVersion||null,payload,revision})});if(e.owner!==session)return;e.revision=r.data.revision;e.retryCount=0;e.dirty=signature!==e.signature;if(r.data.record_changed){e.recordChanged=true;e.conflict=true;}e.status=e.conflict?'Record changed — draft retained':e.dirty?'Saving…':'Saved';persist(e);}
  catch(error){const status=(error as any).status;if(status===409){e.conflict=true;e.status='Conflict — draft retained';}else {e.status='Save failed';const delays=[1000,3000,10000,30000,60000],attempt=e.retryCount||0;if((!status||status>=500)&&attempt<delays.length){e.retryCount=attempt+1;e.timer=setTimeout(()=>void flushDraft(e).catch(()=>{}),delays[attempt]);}}notify();throw error;}
 });return e.chain;
}
export async function finishDraft(e:DraftEntry,remove=false){
 if(e.timer)clearTimeout(e.timer);await e.chain.catch(()=>{});
 if(e.owner!==session)return;
 if(e.revision)await transport(`/form-drafts/${e.id}${remove?'':'/complete'}`,{method:remove?'DELETE':'POST',body:JSON.stringify({revision:e.revision})});
 for(const alias of entries.values())if(alias.id===e.id&&alias.owner===e.owner){alias.closed=true;alias.dirty=false;localStorage.removeItem(alias.key);localStorage.removeItem(`${alias.key}:recovery`);await draftFiles(alias.key,null).catch(()=>{});}if(remove)e.restore(decodeDraft(JSON.parse(e.initial)));notify();
}
export async function recoverDraft(e:DraftEntry,local=false){
 if(local&&e.recovery){const payload=e.recovery;await loadDraft(e,true);e.payload=payload;e.signature=JSON.stringify(payload);e.dirty=true;e.conflict=false;const files=await draftFiles(e.key).catch(()=>[]);e.restore(decodeDraft(payload,files));e.recovery=undefined;persist(e);await flushDraft(e);return;}
 await loadDraft(e,true);
}
export async function reviewRecordRecovery(e:DraftEntry){
 const remote=(await transport(`/form-drafts/current?${query(e.context)}&recovery_id=${e.id}`)).data;
 if(!remote||!remote.current_record_hash)throw new Error('Reload the record before recovering.');
 const result=await transport(`/form-drafts/${e.id}/rebase`,{method:'POST',body:JSON.stringify({revision:remote.revision,expected_hash:remote.current_record_hash})});
 e.revision=result.data.revision;e.conflict=false;e.recordChanged=false;const files=await draftFiles(e.key).catch(()=>[]);e.restore(decodeDraft(e.payload,files));e.status='Draft recovered for review';persist(e);
}
export async function prepareDraftSubmission(path:string,method:string,body?:BodyInit|null){
 if(['GET','HEAD','OPTIONS'].includes(method)||/^\/(form-drafts|vehicle-drafts)/.test(path))return null;
 let fields:any={};try{fields=body instanceof FormData?Object.fromEntries(body.entries()):typeof body==='string'?JSON.parse(body):{};}catch{}
 const candidates=draftEntries().filter(e=>e.active&&e.ready&&!e.submitted&&e.context.submitPaths?.some(pattern=>new RegExp(pattern).test(path))&&Object.entries(e.context.submitFields||{}).every(([key,value])=>value==='__present__'?fields[key]!==undefined:value===null?fields[key]==null:String(fields[key])===String(value)));
 if(!candidates.length)return null;
 // More specific record forms take priority over an enclosing workspace.
 const e=candidates.sort((a,b)=>(b.context.resourceId?1:0)-(a.context.resourceId?1:0)||b.changed-a.changed)[0];
 if(e.filesMissing)throw new Error('Reselect files unavailable on this device before submitting.');
 await flushDraft(e);if(e.conflict)throw Object.assign(new Error('Draft conflict. Review recovered changes before submitting.'),{status:409});
 if(!e.revision)return null;return {entry:e,id:e.id,revision:e.revision};
}
export function submittedDraft(e:DraftEntry,result?:any){
 if(e.context.deferCompletion){e.submitted=true;e.dirty=false;if(e.timer)clearTimeout(e.timer);if(result?.data&&e.payload.form)e.payload={...e.payload,form:{...e.payload.form,savedVehicle:result.data}};e.signature=JSON.stringify(e.payload);e.status='Vehicle saved — documents pending';persist(e);return;}
 for(const alias of entries.values())if(alias.id===e.id&&alias.owner===e.owner){alias.closed=true;alias.dirty=false;if(alias.timer)clearTimeout(alias.timer);localStorage.removeItem(alias.key);void draftFiles(alias.key,null).catch(()=>{});}notify();
}
export function draftSubmissionFailed(e:DraftEntry,status:number,code?:string){if(status===409){e.conflict=true;e.recordChanged=code==='FORM_RECORD_CONFLICT';e.status='Conflict — draft retained';notify();}}
export function retryDrafts(){for(const e of draftEntries())if(e.dirty&&!e.conflict)void flushDraft(e).catch(()=>{});}
if(typeof window!=='undefined'){for(const event of ['input','change','click'])window.addEventListener(event,()=>{gesture++;},{capture:true});window.addEventListener('online',retryDrafts);window.addEventListener('pagehide',()=>{for(const e of draftEntries())persist(e);});}
