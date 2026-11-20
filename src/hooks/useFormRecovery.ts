import {useEffect,useRef,useSyncExternalStore} from 'react';
import {attachDraft,observeDraft,draftSubscribe,draftVersion,draftSession,flushDraft,finishDraft,type DraftContext,type DraftEntry} from '../services/formDrafts';

export function restoreFormValue(current:any,recovered:any):any {
 if(recovered===undefined)return current;
 if(current&&recovered&&typeof current==='object'&&typeof recovered==='object'&&!Array.isArray(current)&&!Array.isArray(recovered)&&!(current instanceof File)&&!(current instanceof Date)&&!(current instanceof Set))return {...current,...Object.fromEntries(Object.entries(recovered).map(([key,value])=>[key,restoreFormValue(current[key],value)]))};
 return recovered;
}

export function useFormRecovery<T>(context:DraftContext,values:T,restore:(values:T)=>void,{active=true,scopeReady=true}:{active?:boolean;scopeReady?:boolean}={}) {
 useSyncExternalStore(draftSubscribe,draftVersion,draftVersion);const user=draftSession();
 const callback=useRef(restore);callback.current=restore;const current=useRef(values);current.current=values;
 const entry=useRef<DraftEntry|null>(null);const identity=JSON.stringify([user,context.module,context.formKey,context.companyId||0,context.recordKey||'new']);
 useEffect(()=>{if(!user||!scopeReady){entry.current=null;return;}if(!active&&entry.current)return;const next=attachDraft(context,current.current,v=>callback.current(v));entry.current=next;return()=>{next.active=false;};},[identity,scopeReady,active]);
 useEffect(()=>{if(entry.current)observeDraft(entry.current,values,active,context);});
 return {entry:entry.current,ready:!user||!scopeReady?false:!!entry.current?.ready,status:entry.current?.filesMissing?'Save failed — reselect files unavailable on this device':entry.current?.status||'Loading…',flush:async()=>{if(!entry.current)throw new Error('Draft is not ready.');await flushDraft(entry.current);return entry.current.id;},complete:async()=>{if(entry.current)await finishDraft(entry.current);},discard:async()=>{if(entry.current)await finishDraft(entry.current,true);},retry:()=>{if(entry.current)void flushDraft(entry.current).catch(()=>{});}};
}
