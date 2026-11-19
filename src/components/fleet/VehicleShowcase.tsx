import { lazy, Suspense, useState } from 'react';
import { Box, Gauge, Rotate3D, Truck, UserRound } from 'lucide-react';
import type { Language } from '../../types';
import type { FleetRow } from './FleetOperationsPanel';
import { BrandWordmark } from '../ui/BrandWordmark';
import { fleetCopy, statusKey } from './fleetCopy';
import { registryLabel } from './vehicleRegistry';
import { vehicleModelSpec } from './vehicleModelSpec';
const Model=lazy(()=>import('./VehicleModel3D'));

export function VehicleShowcase({vehicle,lang,onOpen}:{vehicle:FleetRow;lang:Language;onOpen:()=>void}) {
  const t=fleetCopy(lang),[angle,setAngle]=useState('perspective'),[simplified,setSimplified]=useState(false),s=vehicleModelSpec(vehicle,simplified);
  const locale=['bs','hr','sr'].includes(lang)?'hr-HR':lang==='de'?'de-DE':'en-GB';
  const dimensions=s.recordedDimensions.map(v=>v==null?'—':`${v.toLocaleString(locale,{maximumFractionDigits:2})} m`).join(' × ');
  return <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" aria-label={t('3D pregled vozila')}>
    <div className="grid lg:grid-cols-[minmax(260px,.65fr)_minmax(0,1.65fr)]">
      <div className="relative z-10 flex flex-col justify-between gap-4 border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6 lg:border-b-0 lg:border-r">
        <div><p className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.16em] text-primary"><Truck className="h-4 w-4"/>{t('Komandni centar vozila')}</p><button type="button" onClick={onOpen} className="text-left text-xl font-bold tracking-tight text-slate-900 hover:text-primary dark:text-white sm:text-2xl">{vehicle.registration_number}</button><p className="mt-1 text-xs text-slate-500">{registryLabel(lang,vehicle.features?.resource_type||vehicle.vehicle_type)}{vehicle.features?.legal_category?` · ${vehicle.features.legal_category}`:''} · {vehicle.features?.body_type||t('Karoserija nije navedena')}</p><span className="mt-3 inline-flex rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{t(statusKey[vehicle.status]||vehicle.status)}</span></div>
        <dl className="grid grid-cols-2 gap-4 text-xs"><div><dt className="flex items-center gap-1.5 text-slate-500"><UserRound className="h-3.5 w-3.5"/>{t('Vozač')}</dt><dd className="mt-1 font-semibold">{vehicle.assigned_driver?.name||'—'}</dd></div><div><dt className="flex items-center gap-1.5 text-slate-500"><Gauge className="h-3.5 w-3.5"/>{t('Kilometraža')}</dt><dd className="mt-1 font-semibold">{vehicle.last_mileage!=null?`${Number(vehicle.last_mileage).toLocaleString(locale)} km`:'—'}</dd></div><div className="col-span-2"><dt className="flex items-center gap-1.5 text-slate-500"><Box className="h-3.5 w-3.5"/>{t('Dužina, širina i visina')}</dt><dd className="mt-1 font-semibold">{dimensions}</dd><p className="mt-1 text-[10px] text-slate-400">{t(s.recorded?'Prikaz prema unesenim dimenzijama':'Približan prikaz prema klasi vozila')}</p></div></dl>
        <div className="space-y-2">{vehicle.features?.demo_record&&<p className="text-[10px] font-semibold text-slate-500">{t('Demo vozilo · demonstracijske dimenzije')}</p>}<BrandWordmark className="text-sm"/></div>
      </div>
      <div className="relative min-w-0 bg-gradient-to-br from-sky-50/70 via-slate-50 to-white dark:from-sky-950/30 dark:via-slate-900 dark:to-slate-950">
        <div className="pointer-events-none absolute inset-x-5 top-4 z-10 flex justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-400"><span>Freightbook Fleet</span><span className="flex items-center gap-1.5"><Rotate3D className="h-3.5 w-3.5"/>{t('Povuci za rotaciju')}</span></div>
        <div className="h-[280px] sm:h-[340px]"><Suspense fallback={<div className="flex h-full items-center justify-center text-sm text-slate-400">{t('Učitavanje…')}</div>}><Model vehicle={vehicle} label={`${t('3D pregled vozila')} · ${vehicle.registration_number}`} angle={angle} simplified={simplified}/></Suspense></div>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/70 px-5 py-2.5 dark:border-slate-800"><span className="text-[10px] font-medium text-slate-400">{s.axles} {t('osovine')} · {vehicle.features?.axle_configuration||vehicle.features?.configuration||'—'}</span><button type="button" aria-pressed={simplified} onClick={()=>setSimplified(v=>!v)} className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10">{t(simplified?'Prikaz prema seriji':'Pojednostavljeni prikaz')}</button><div className="flex gap-1">{[['perspective','3D'],['side','Bočno'],['front','Sprijeda'],['rear','Straga']].map(([key,label])=><button key={key} type="button" aria-pressed={angle===key} onClick={()=>setAngle(key)} className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${angle===key?'bg-primary text-white':'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{t(label)}</button>)}</div></div>
      </div>
    </div>
  </section>;
}
