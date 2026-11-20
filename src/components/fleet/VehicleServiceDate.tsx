import {useEffect,useRef} from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.css';
import type {Instance} from 'flatpickr/dist/types/instance';
import type {Language} from '../../types';
import {flatpickrI18n} from '../../i18n';
import {fleetField} from './fleetCopy';
import './vehicleServiceDate.css';

export function VehicleServiceDate({value,onChange,label,clearLabel,lang}:{value:string;onChange:(value:string)=>void;label:string;clearLabel:string;lang:Language}) {
 const input=useRef<HTMLInputElement>(null),picker=useRef<Instance|null>(null),change=useRef(onChange);change.current=onChange;
 useEffect(()=>{if(!input.current)return;const instance=flatpickr(input.current,{static:true,disableMobile:true,dateFormat:'Y-m-d',altInput:true,altFormat:'d.m.Y',locale:flatpickrI18n(lang),allowInput:false,onChange:(_,date)=>change.current(date)});instance.altInput?.setAttribute('aria-label',label);picker.current=instance;return()=>{instance.destroy();picker.current=null;};},[lang,label]);
 useEffect(()=>{picker.current?.setDate(/^\d{4}-\d{2}-\d{2}$/.test(value)?value:'',false,'Y-m-d');},[value,lang,label]);
 return <div className="vehicle-service-date grid min-w-0 gap-1.5 text-xs font-semibold text-slate-500"><span>{label}</span><div className="flex min-w-0 gap-1"><div className="min-w-0 flex-1"><input ref={input} type="hidden" className={fleetField} placeholder={value&&!/^\d{4}-\d{2}-\d{2}$/.test(value)?value:'—'}/></div><button type="button" aria-label={`${clearLabel} ${label}`} onClick={()=>{picker.current?.clear(false);onChange('');}} className="px-2 text-slate-500">×</button></div></div>;
}
