import {useState} from 'react';
import {PencilLine,Truck} from 'lucide-react';
import type {Language} from '../../types';
import {IconSelect} from '../ui/IconSelect';
import {fleetField} from './fleetCopy';

/** The saved value is always the actual label, never the manual-entry UI sentinel. */
export function VehicleIdentityChoice({value,onChange,options,label,lang,disabled=false}:{value:string;onChange:(value:string)=>void;options:readonly string[];label:string;lang:Language;disabled?:boolean}) {
 const bs=['bs','hr','sr'].includes(lang),de=lang==='de';
 const u=(bsText:string,en:string,german:string)=>bs?bsText:de?german:en;
 const known=options.find(option=>option.toLocaleLowerCase()===value.trim().toLocaleLowerCase());
 const [manual,setManual]=useState(!!value&&!known);
 const custom=manual||!options.length;
 const manualLabel=u('Drugo — unesi ručno','Other — enter manually','Andere — manuell eingeben');
 return <div className="min-w-0 space-y-1.5">
  {custom?<input className={fleetField} aria-label={label} autoComplete="off" disabled={disabled} value={value} placeholder={u('Unesite naziv','Enter a name','Bezeichnung eingeben')} onChange={e=>onChange(e.target.value)}/>:<IconSelect value={known||''} onChange={next=>{if(next==='__manual__'){setManual(true);onChange('');}else onChange(next);}} options={[...options.map(option=>({value:option,label:option,icon:Truck})),{value:'__manual__',label:manualLabel,icon:PencilLine}]} placeholder={u('Izaberite ili pretražite','Select or search','Auswählen oder suchen')} icon={Truck} ariaLabel={label} disabled={disabled} searchable searchPlaceholder={u('Pretraži listu…','Search list…','Liste durchsuchen…')} noResults={u('Nema rezultata. Za novi naziv odaberite ručni unos ispod polja.','No matches. Use manual entry below this field for a new name.','Keine Treffer. Für neue Namen die manuelle Eingabe unter dem Feld verwenden.')}/>}
  {options.length?<button type="button" disabled={disabled} className="text-left text-[11px] font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50" onClick={()=>{if(custom){setManual(false);if(!known)onChange('');}else setManual(true);}}>{custom?u('Izaberi iz liste','Choose from list','Aus Liste auswählen'):u('Unesi ručno ako nije na listi','Enter manually if not listed','Manuell eingeben, falls nicht gelistet')}</button>:<p className="text-[11px] font-normal text-slate-400">{u('Ako naziv nije u katalogu, unesite ga ručno.','If the name is not in the catalog, enter it manually.','Falls der Name nicht im Katalog steht, manuell eingeben.')}</p>}
 </div>;
}
