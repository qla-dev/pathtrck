/** IndexedDB preserves selected files across navigation; keys include the authenticated account. */
function database(): Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{const request=indexedDB.open('freightbook-vehicle-drafts',1);request.onupgradeneeded=()=>request.result.createObjectStore('drafts');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
}
export async function draftFiles(key:string, value?: {type:string;file:File}[] | null):Promise<{type:string;file:File}[]> {
  const db=await database();
  try { return await new Promise((resolve,reject)=>{const tx=db.transaction('drafts',value===undefined?'readonly':'readwrite'),store=tx.objectStore('drafts');const request=value===undefined?store.get(key):value===null?store.delete(key):store.put(value,key);tx.oncomplete=()=>resolve(value===undefined?(request.result||[]):value||[]);tx.onerror=()=>reject(tx.error);}); }
  finally {db.close();}
}
