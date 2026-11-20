import {test,after} from 'node:test';
import {strict as assert} from 'node:assert';
import {setDraftTransport,setDraftSession,attachDraft,observeDraft,flushDraft,finishDraft,draftEntries,encodeDraft,decodeDraft,prepareDraftSubmission,submittedDraft} from './formDrafts';

const local=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>local.get(k)||null,setItem:(k:string,v:string)=>local.set(k,v),removeItem:(k:string)=>local.delete(k)},configurable:true});
const rows=new Map<string,any>();let offline=false;const requests:any[]=[];
setDraftTransport(async(path,options)=>{
 if(offline)throw Object.assign(new Error('Offline'),{status:503});
 if(path.startsWith('/form-drafts/current')){const q=new URL('http://test'+path).searchParams;return {data:[...rows.values()].find(r=>r.module===q.get('module')&&r.form_key===q.get('form_key')&&r.record_key===q.get('record_key')&&r.state==='in_progress')||null};}
 const id=path.split('/')[2];if(options?.method==='PUT'){const body=JSON.parse(String(options.body)),old=rows.get(id);requests.push(body);if(old&&old.revision!==body.revision)throw Object.assign(new Error('Conflict'),{status:409});const row={...body,id,state:'in_progress',revision:(old?.revision||0)+1};rows.set(id,row);return {data:row};}
 if(rows.has(id))rows.get(id).state=options?.method==='DELETE'?'deleted':'completed';return {data:null};
});
const ready=async(e:any)=>{for(let i=0;i<30&&!e.ready;i++)await new Promise(r=>setTimeout(r,1));assert.equal(e.ready,true);};
after(()=>setDraftSession(0));
test('each module persists one complete state snapshot and isolates its form context',async()=>{
 setDraftSession(71);
 for(const module of ['vehicles','drivers','invoices','loads','customers','carriers','orders','contracts','expenses','maintenance','fuel','documents']){
  const context={module,formKey:'editor',companyId:1};const e=attachDraft(context,{form:{name:''},step:0},()=>{});await ready(e);observeDraft(e,{form:{name:module,choices:['rear','side'],document_ids:[13]},step:2},true,context);await flushDraft(e);assert.equal(e.status,'Saved');assert.equal(e.revision,1);assert.deepEqual(rows.get(e.id).payload.form.choices,['rear','side']);assert.equal(rows.get(e.id).payload.step,2);const again=attachDraft(context,{},()=>{});assert.equal(again.id,e.id);
 }
 assert.equal(draftEntries().length,12);setDraftSession(72);assert.equal(draftEntries().length,0);
});
test('network failure retains the latest local changes and retries without another draft',async()=>{
 setDraftSession(73);const context={module:'loads',formKey:'offline-editor'};const e=attachDraft(context,{title:''},()=>{});await ready(e);offline=true;observeDraft(e,{title:'Survives interruption',step:3},true,context);await assert.rejects(flushDraft(e));assert.equal(e.status,'Save failed');assert.ok([...local.values()].some(v=>v.includes('Survives interruption')));const id=e.id;offline=false;await flushDraft(e);assert.equal(e.id,id);assert.equal(e.status,'Saved');assert.equal(rows.get(id).payload.title,'Survives interruption');
});
test('stale draft revisions cannot overwrite newer data',async()=>{
 setDraftSession(74);const context={module:'invoices',formKey:'conflict-editor'};const e=attachDraft(context,{amount:''},()=>{});await ready(e);observeDraft(e,{amount:'10'},true,context);await flushDraft(e);rows.get(e.id).revision=9;rows.get(e.id).payload={amount:'99'};observeDraft(e,{amount:'20'},true,context);await assert.rejects(flushDraft(e));assert.equal(e.conflict,true);assert.deepEqual(rows.get(e.id).payload,{amount:'99'});assert.ok([...local.values()].some(v=>v.includes('20')));
});
test('completion removes recoverable work without clearing it on failed submission',async()=>{
 setDraftSession(75);const context={module:'customers',formKey:'create',submitPaths:['^/customers$']};const e=attachDraft(context,{name:''},()=>{});await ready(e);observeDraft(e,{name:'Entered customer'},true,context);const submission=await prepareDraftSubmission('/customers','POST');assert.equal(submission?.id,e.id);assert.equal(e.closed,false);rows.get(e.id).state='completed';submittedDraft(e);assert.equal(e.closed,true);assert.equal(draftEntries().length,0);
 const fresh=attachDraft(context,{name:''},()=>{});await ready(fresh);assert.notEqual(fresh.id,e.id);await finishDraft(fresh,true);
});
test('credentials are excluded while dates, multiselects and selected file metadata round trip',()=>{
 const file=new File(['PDF'],'registration.pdf',{type:'application/pdf',lastModified:123});const files:any[]=[];
 const payload=encodeDraft({form:{name:'Truck',password:'private',nested:{api_key:'private',note:'Keep'}},date:new Date('2026-11-20T12:00:00Z'),visited:new Set(['cargo','route']),pending:[{type:'registration',file}]},files);
 assert.equal(payload.form.password,undefined);assert.equal(payload.form.nested.api_key,undefined);assert.equal(payload.form.nested.note,'Keep');assert.equal(files.length,1);
 const restored=decodeDraft(payload,files);assert.equal(restored.pending[0].file,file);assert.equal(restored.date.toISOString(),'2026-11-20T12:00:00.000Z');assert.deepEqual([...restored.visited],['cargo','route']);const missing={value:false};const other=decodeDraft(payload,[],missing);assert.equal(missing.value,true);assert.deepEqual(other.pending,[]);
});
