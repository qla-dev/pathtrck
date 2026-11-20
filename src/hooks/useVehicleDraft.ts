import {useFormRecovery} from './useFormRecovery';
import {recoverDraft} from '../services/formDrafts';

/** Vehicle adapter; persistence, files, retries and conflicts use the global form service. */
export function useVehicleDraft(company:number|undefined,enabled:boolean,snapshot:{form:Record<string,any>;pending:{type:string;file:File}[]},restore:(value:any)=>void,vehicleId?:number,baseVersion?:string) {
 const recovery=useFormRecovery({module:'vehicles',formKey:'vehicle-registration',companyId:company,recordKey:String(vehicleId||'new'),resource:vehicleId?'vehicles':undefined,resourceId:vehicleId,baseVersion,deferCompletion:true,submitPaths:[vehicleId?`^/vehicles/${vehicleId}$`:'^/vehicles$']},snapshot,restore,{active:enabled});
 return {...recovery,recovery:recovery.entry?.recovery,restoreRecovery:()=>{if(recovery.entry)void recoverDraft(recovery.entry,true);}};
}
