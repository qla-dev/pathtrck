import React, { useEffect, useRef, useState } from 'react';
import { Box, Plus, WandSparkles, Save, Download, Upload, RotateCcw, ZoomIn, ZoomOut, Maximize, Trash2, RotateCw, ArrowUp, ArrowDown, X } from 'lucide-react';
import { api } from '../../services/api';
import { Language } from '../../types';
import { planningLabels } from '../planning/labels';
import { autoPlan, Cargo, COLORS, Equipment, EQUIPMENT, fits, Plan, readPlan, revalidate, validEquipment, volume } from '../planning/model';
import { PlanningScene, SceneView } from '../planning/PlanningScene';
import './load-planning.css';

type Draft = { loadId?: string; reference?: string; route?: string; name: string; customer: string; length: number; width: number; height: number; weight: number | ''; pieces: number; shape: Cargo['shape']; stackable: boolean; pickup: string; delivery: string; documents: string };
const EMPTY_DRAFT: Draft = { name: '', customer: '', length: 1.2, width: .8, height: 1, weight: 250, pieces: 1, shape: 'box', stackable: false, pickup: '', delivery: '', documents: '' };
// Loads still being arranged or moved; received, finished and cancelled ones no longer need space.
const CURRENT_STATUSES = 'pending,booked,opened,in_delivery';
const positive = (value: unknown) => { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : 0; };
const round = (value: number) => Math.round(value * 1000) / 1000;
/** A tracking load stores totals, so pallets become EUR-pallet units sharing the weight; otherwise it is one unit of the recorded size. */
function loadDraft(row: Record<string, unknown>): Draft {
  const stops = Array.isArray(row.stops) ? row.stops as Record<string, unknown>[] : [];
  const pickup = stops.find(s => s.type === 'pickup'), delivery = [...stops].reverse().find(s => s.type === 'delivery');
  const place = (s?: Record<string, unknown>) => [s?.address, s?.city, s?.country_code].filter(Boolean).join(', ');
  const named = (value: unknown) => String((value as { name?: string } | null)?.name || '');
  const pallets = Math.min(300, Math.floor(positive(row.pallets))), pieces = Math.max(1, pallets), weight = positive(row.weight_kg), volume = positive(row.volume_m3);
  let length = positive(row.length_m) || 1.2, width = positive(row.width_m) || .8, height = positive(row.height_m);
  if (pallets) { length = 1.2; width = .8; height = height && height <= 3 ? height : volume ? volume / (pieces * .96) : 1.2; }
  else if (!height) height = volume ? volume / (length * width) : 1;
  const reference = String((row.shipment as { tracking_number?: string } | null)?.tracking_number || row.booking_reference || `#${row.id}`);
  return {
    loadId: String(row.id), reference, route: [pickup?.city, delivery?.city].filter(Boolean).join(' → '),
    name: String(row.title || reference).slice(0, 100), customer: (named(row.consignee) || named(row.company)).slice(0, 120),
    length: round(length), width: round(width), height: round(Math.min(Math.max(height, .05), 10)),
    weight: weight ? round(weight / pieces) : '', pieces, shape: pallets ? 'pallet' : 'box', stackable: false,
    pickup: place(pickup).slice(0, 250), delivery: place(delivery).slice(0, 250),
    documents: [row.goods_type || row.cargo_type, row.notes].filter(Boolean).join(' · ').slice(0, 2000),
  };
}

export default function LoadPlanningView({ lang, userId }: { lang: Language; userId?: number }) {
  const t=planningLabels(lang);
  const [plan,setPlan]=useState<Plan>({version:1,name:'LTL / LCL',equipment:{...EQUIPMENT[0]},cargo:[]});
  const [view,setView]=useState<SceneView>('dimensions');
  const [selected,setSelected]=useState('');
  const [warehouse,setWarehouse]=useState(false);
  const [reset,setReset]=useState(0),[zoom,setZoom]=useState(0);
  const [adding,setAdding]=useState(false),[notice,setNotice]=useState('');
  const [vehicles,setVehicles]=useState<Record<string,unknown>[]>([]);
  const [fleetError,setFleetError]=useState(false);
  const [position,setPosition]=useState({x:0,y:0,z:0});
  const [draft,setDraft]=useState<Draft>(EMPTY_DRAFT),[draftKey,setDraftKey]=useState(0);
  const [trackingQuery,setTrackingQuery]=useState(''),[trackingLoads,setTrackingLoads]=useState<Record<string,unknown>[]>([]),[trackingState,setTrackingState]=useState<'loading'|'idle'|'error'>('idle');
  useEffect(()=>{if(!adding)return;let active=true;setTrackingState('loading');const timer=setTimeout(async()=>{try{const response=await api.loads.list({tracking:true,for_storage:false,per_page:50,sort:'date_desc',statuses:CURRENT_STATUSES,tracking_search:trackingQuery.trim()||undefined});if(active){setTrackingLoads(response.data);setTrackingState('idle');}}catch{if(active)setTrackingState('error');}},trackingQuery?300:0);return()=>{active=false;clearTimeout(timer);};},[adding,trackingQuery]);
  const openAdd=()=>{setDraft(EMPTY_DRAFT);setDraftKey(k=>k+1);setTrackingQuery('');setAdding(true);};
  const chooseLoad=(next:Draft)=>{setDraft(next);setDraftKey(k=>k+1);};
  const viewport=useRef<HTMLDivElement>(null),importInput=useRef<HTMLInputElement>(null);
  const key=`freightbook-loading-plan-v1-${userId ?? 'guest'}`;
  useEffect(()=>{try{const stored=localStorage.getItem(key);if(stored){const p=readPlan(JSON.parse(stored));if(p)setPlan(p);else setNotice(t.failed);}}catch{setNotice(t.failed);}},[key]);
  useEffect(()=>{let active=true;const load=async()=>{try{let rows:Record<string,unknown>[]=[];for(let page=1;page<=100;page++){const response=await api.vehicles.list({page,per_page:100});rows.push(...response.data);if(page>=Number(response.meta?.last_page??1))break;}if(active)setVehicles(rows.filter(v=>!v.transport_type||v.transport_type==='road'));}catch{if(active)setFleetError(true);}};void load();return()=>{active=false;};},[]);
  const e=plan.equipment,cargo=plan.cargo;
  const current=cargo.find(c=>c.id===selected);
  useEffect(()=>{if(current)setPosition({x:+current.x.toFixed(3),y:+current.y.toFixed(3),z:+current.z.toFixed(3)});},[current]);
  const placed=cargo.filter(c=>c.placed),usedVolume=placed.reduce((s,c)=>s+volume(c),0),usedWeight=placed.reduce((s,c)=>s+c.weight,0);
  const volumePercent=usedVolume/volume(e)*100,weightPercent=usedWeight/e.payload*100;
  const changeEquipment=(next:Equipment)=>{if(!validEquipment(next)){setNotice(t.invalid);return;}setPlan(p=>({...p,equipment:next,cargo:revalidate(p.cargo,next)}));};
  const move=(id:string,x:number,y:number,z:number)=>{
    const c=cargo.find(c=>c.id===id);if(!c)return;
    const next={...c,x,y,z,placed:true};if(!fits(next,cargo,e)){setNotice(t.invalid);return;}
    setPlan(p=>({...p,cargo:revalidate(p.cargo.map(c=>c.id===id?next:c),e)}));setSelected(id);setNotice('');
  };
  const remove=(id:string)=>setPlan(p=>({...p,cargo:revalidate(p.cargo.filter(c=>c.id!==id),e)}));
  const rotate=()=>{if(!current)return;const next={...current,length:current.width,width:current.length};if(current.placed&&!fits(next,cargo,e)){setNotice(t.invalid);return;}setPlan(p=>({...p,cargo:revalidate(p.cargo.map(c=>c.id===selected?next:c),e)}));};
  const reorder=(id:string,delta:number)=>{const next=[...cargo],i=next.findIndex(c=>c.id===id),j=i+delta;if(j<0||j>=next.length)return;[next[i],next[j]]=[next[j],next[i]];setPlan(p=>({...p,cargo:next}));};
  const addCargo=(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault();const data=new FormData(event.currentTarget),num=(k:string)=>Number(data.get(k));
    const count=num('pieces');if(!Number.isInteger(count)||count<1||cargo.length+count>300){setNotice(t.countLimit);return;}
    const entries:Cargo[]=Array.from({length:count},(_,i)=>({id:crypto.randomUUID(),name:String(data.get('name'))+(count>1?` · ${i+1}`:''),customer:String(data.get('customer')),length:num('length'),width:num('width'),height:num('height'),weight:num('weight'),shape:data.get('shape') as Cargo['shape'],stackable:data.get('stackable')==='on',color:COLORS[cargo.length%COLORS.length],pickup:String(data.get('pickup')),delivery:String(data.get('delivery')),documents:String(data.get('documents')),x:0,y:0,z:0,placed:false,loadId:draft.loadId,reference:draft.reference}));
    setPlan(p=>({...p,cargo:[...p.cargo,...entries]}));setSelected(entries[0].id);setAdding(false);setNotice('');
  };
  const sample=()=>{if(cargo.length)return;const names=['A','B','C','D','E','F'];const items:Cargo[]=names.flatMap((name,i)=>Array.from({length:2},(_,j)=>({id:crypto.randomUUID(),name:`${name}-${j+1}`,customer:'',length:1.2,width:.8,height:1+i%3*.3,weight:250+i*50,color:COLORS[i],shape:'pallet' as const,stackable:false,pickup:'',delivery:'',documents:'',x:0,y:0,z:0,placed:false})));setPlan(p=>({...p,cargo:autoPlan(items,e)}));};
  const save=()=>{try{localStorage.setItem(key,JSON.stringify(plan));setNotice(t.saved);}catch{setNotice(t.failed);}};
  const exportPlan=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(plan,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='freightbook-loading-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  const importPlan=async(file?:File)=>{if(!file)return;try{if(file.size>2_000_000)throw Error();const next=readPlan(JSON.parse(await file.text()));if(!next)throw Error();setPlan(next);setSelected('');setNotice('');}catch{setNotice(t.failed);}if(importInput.current)importInput.current.value='';};
  const selectVehicle=(id:string)=>{const v=vehicles.find(v=>String(v.id)===id);if(!v){changeEquipment({...EQUIPMENT[0]});return;}const f=(v.features??{}) as Record<string,unknown>;const base=EQUIPMENT.find(e=>e.truck)!;const width=Number(f.width_m)||base.width,height=Number(f.height_m)||base.height;
    // Vehicles record volume but not body dimensions, so length follows capacity_m3 at default width and height.
    const fromVolume=Number(v.capacity_m3)/(width*height);changeEquipment({...base,registration:String(v.registration_number),length:Number(f.length_m)||(fromVolume>0&&fromVolume<=30?Math.round(fromVolume*100)/100:base.length),width,height,doorWidth:Math.min(base.doorWidth,width),doorHeight:Math.min(base.doorHeight,height),payload:Number(v.capacity_kg)||base.payload});};
  return <div className="load-planner">
    <header className="lp-header"><div><div className="lp-eyebrow">FREIGHTBOOK.AI / 3D</div><h1>{t.title}</h1><p>{t.subtitle}</p></div><div className="lp-actions"><button onClick={()=>importInput.current?.click()}><Upload size={16}/>{t.import}</button><button onClick={exportPlan}><Download size={16}/>{t.export}</button><button className="lp-primary" onClick={save}><Save size={16}/>{t.save}</button></div></header>
    <input ref={importInput} type="file" accept=".json,application/json" hidden onChange={event=>void importPlan(event.target.files?.[0])}/>
    {notice&&<div className="lp-notice" role="status">{notice}<button aria-label={t.cancel} onClick={()=>setNotice('')}><X size={16}/></button></div>}
    <section className="lp-equipment lp-panel">
      <label>{t.planName}<input value={plan.name} maxLength={100} onChange={ev=>setPlan(p=>({...p,name:ev.target.value}))}/></label>
      <label>{t.equipment}<select value={e.code} onChange={ev=>changeEquipment({...EQUIPMENT.find(e=>e.code===ev.target.value)!})}>{EQUIPMENT.map(e=><option key={e.code}>{e.code}</option>)}</select></label>
      <label>{t.vehicle}<select value={String(vehicles.find(v=>v.registration_number===e.registration)?.id??'')} onChange={ev=>selectVehicle(ev.target.value)}><option value="">{t.custom}</option>{vehicles.map(v=><option key={String(v.id)} value={String(v.id)}>{String(v.registration_number)}</option>)}</select></label>
      <button className="lp-primary" onClick={()=>{setPlan(p=>({...p,cargo:autoPlan(p.cargo,e)}));setView('top');setNotice('');}}><WandSparkles size={17}/>{t.auto}</button>
      <details><summary>{t.dimensions} · {e.length} × {e.width} × {e.height} m · {e.payload.toLocaleString()} kg</summary><div className="lp-dimensions">{(['length','width','height','doorWidth','doorHeight','payload'] as const).map(k=><label key={`${e.code}-${e.registration}-${k}-${e[k]}`}>{t[k]} ({k==='payload'?'kg':'m'})<input type="number" min="0.01" step="0.001" defaultValue={e[k]} onBlur={ev=>{const next={...e,[k]:Number(ev.target.value)};if(validEquipment(next))changeEquipment(next);else{ev.target.value=String(e[k]);setNotice(t.invalid);}}}/></label>)}</div><p>{t.defaults}</p>{fleetError&&<p role="alert">{t.fleetFailed}</p>}</details>
    </section>
    <div className="lp-workspace">
      <section className="lp-panel lp-cargo"><div className="lp-section-title"><h2>{t.shipments} <span>{cargo.length}</span></h2><button className="lp-primary" onClick={openAdd}><Plus size={16}/>{t.add}</button></div>
        {!cargo.length?<div className="lp-empty"><Box size={42}/><p>{t.empty}</p><button onClick={sample}>{t.sample}</button></div>:<div className="lp-table-wrap"><table><thead><tr><th>{t.name}</th><th>{t.cargoDimensions}</th><th>kg</th><th>{t.placed}</th></tr></thead><tbody>{cargo.map(c=><tr key={c.id} className={selected===c.id?'lp-selected':''} onClick={()=>setSelected(c.id)}><td><button className="lp-cargo-name" onClick={()=>setSelected(c.id)}><i style={{background:c.color}}/>{c.name}</button><small>{[c.reference,c.customer].filter(Boolean).join(' · ')}</small></td><td>{c.length} × {c.width} × {c.height}<small>{volume(c).toFixed(2)} m³</small></td><td>{c.weight}</td><td><span className={c.placed?'lp-badge':'lp-badge lp-pending'}>{c.placed?t.placed:t.pending}</span></td></tr>)}</tbody></table></div>}
        {current&&<div className="lp-inspector"><div className="lp-section-title"><strong>{current.name}</strong><div className="lp-actions"><button onClick={rotate} title={t.rotate} aria-label={t.rotate}><RotateCw size={16}/></button><button onClick={()=>remove(current.id)} title={t.remove} aria-label={t.remove}><Trash2 size={16}/></button></div></div><p>{t.position}</p><div className="lp-position">{(['x','y','z'] as const).map(k=><label key={k}>{k.toUpperCase()}<input type="number" step=".05" min="0" value={position[k]} onChange={ev=>setPosition(p=>({...p,[k]:Number(ev.target.value)}))}/></label>)}<button onClick={()=>move(current.id,position.x,position.y,position.z)}>{t.apply}</button></div>{current.pickup&&<p>{t.pickup}: {current.pickup}</p>}{current.delivery&&<p>{t.delivery}: {current.delivery}</p>}{current.documents&&<p>{t.documents}: {current.documents}</p>}{current.y+current.height>e.height&&<p className="lp-warning">{t.overheight}</p>}</div>}
      </section>
      <section className="lp-panel lp-viewer" ref={viewport}><div className="lp-section-title"><h2>3D · {e.registration||e.code}</h2><label className="lp-checkbox"><input type="checkbox" checked={warehouse} onChange={ev=>setWarehouse(ev.target.checked)}/>{t.warehouse}</label></div><div className="lp-tabs">{(['exterior','dimensions','loading','top'] as const).map((v,i)=><button key={v} className={view===v?'active':''} onClick={()=>setView(v)}>{i+1}. {t[v]}</button>)}</div><div className="lp-canvas"><PlanningScene equipment={e} cargo={cargo} view={view} selected={selected} onSelect={setSelected} onMove={move} warehouse={warehouse} reset={reset} zoom={zoom} unavailable={t.unavailable}/><div className="lp-view-tools"><button title={t.zoomIn} aria-label={t.zoomIn} onClick={()=>setZoom(z=>z+1)}><ZoomIn size={18}/></button><button title={t.zoomOut} aria-label={t.zoomOut} onClick={()=>setZoom(z=>z-1)}><ZoomOut size={18}/></button><button title={t.reset} aria-label={t.reset} onClick={()=>setReset(n=>n+1)}><RotateCcw size={18}/></button><button title={t.fullscreen} aria-label={t.fullscreen} onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen();else void viewport.current?.requestFullscreen();}}><Maximize size={18}/></button></div></div><p className="lp-hint">{t.hint}</p></section>
    </div>
    <div className="lp-bottom"><section className="lp-panel"><h2>{t.utilization}</h2><div className="lp-util"><div className="lp-ring" style={{background:`conic-gradient(#00aeea ${Math.min(volumePercent,100)}%, #e8eff5 0)`}}><div><strong>{volumePercent.toFixed(1)}%</strong><small>m³</small></div></div><dl><dt>{t.volume}</dt><dd>{usedVolume.toFixed(2)} / {volume(e).toFixed(2)} m³</dd><dt>{t.weight}</dt><dd>{usedWeight.toLocaleString()} / {e.payload.toLocaleString()} kg</dd><dt>{t.floor}</dt><dd>{Math.max(0,...placed.map(c=>c.x+c.length)).toFixed(2)} / {e.length} m</dd></dl></div><div className="lp-bar"><span style={{width:`${Math.min(weightPercent,100)}%`}}/></div><p>{t.placed}: {placed.length} / {cargo.length} · {t.pending}: {cargo.length-placed.length}</p></section>
    <section className="lp-panel"><h2>{t.sequence}</h2><ol className="lp-sequence">{cargo.map((c,i)=><li key={c.id}><span style={{background:c.color}}>{i+1}</span><button onClick={()=>setSelected(c.id)}>{c.name}</button><small>{c.placed?t.placed:t.pending}</small><button title={t.up} aria-label={`${t.up} ${c.name}`} disabled={i===0} onClick={()=>reorder(c.id,-1)}><ArrowUp size={14}/></button><button title={t.down} aria-label={`${t.down} ${c.name}`} disabled={i===cargo.length-1} onClick={()=>reorder(c.id,1)}><ArrowDown size={14}/></button></li>)}</ol></section>
    <section className="lp-panel lp-projections">{(['top','side'] as const).map(v=><div key={v}><h2>{t[v]}</h2><div><PlanningScene mini equipment={e} cargo={cargo} view={v} unavailable={t.unavailable}/></div></div>)}</section></div>
    <p className="lp-footnote">{t.estimate}</p>
    {adding&&<div className="lp-modal-backdrop" onClick={()=>setAdding(false)}><form className="lp-modal" onSubmit={addCargo} onClick={ev=>ev.stopPropagation()} role="dialog" aria-modal="true" aria-label={t.add}><div className="lp-section-title"><h2>{t.add}</h2><button type="button" onClick={()=>setAdding(false)} aria-label={t.cancel}><X size={18}/></button></div>
      <section className="lp-tracking" aria-label={t.fromTracking}><h3>{t.fromTracking}</h3><input type="search" autoFocus value={trackingQuery} placeholder={t.trackingSearch} aria-label={t.trackingSearch} onChange={ev=>setTrackingQuery(ev.target.value)}/>
        {trackingState==='loading'?<p>{t.trackingLoading}</p>:trackingState==='error'?<p role="alert">{t.trackingFailed}</p>:!trackingLoads.length?<p>{t.trackingEmpty}</p>:<ul>{trackingLoads.map(row=>{const d=loadDraft(row),added=cargo.some(c=>c.loadId===d.loadId),chosen=draft.loadId===d.loadId;return <li key={d.loadId} className={chosen?'lp-selected':''}><div><strong>{d.reference}</strong><small>{[d.name,d.route,d.weight?`${round(Number(d.weight)*d.pieces).toLocaleString()} kg`:'',d.shape==='pallet'?`${d.pieces} × ${t.pallet}`:''].filter(Boolean).join(' · ')}</small></div><button type="button" disabled={added} aria-pressed={chosen} onClick={()=>chooseLoad(d)}>{added?t.inPlan:t.use}</button></li>;})}</ul>}
        <p className="lp-tracking-note">{t.trackingNote}</p></section>
      <div className="lp-form-grid" key={draftKey}><label>{t.name}<input name="name" required maxLength={100} defaultValue={draft.name}/></label><label>{t.customer}<input name="customer" maxLength={120} defaultValue={draft.customer}/></label>{(['length','width','height','weight','pieces'] as const).map(k=><label key={k}>{t[k]} {['length','width','height'].includes(k)?'(m)':k==='weight'?'(kg)':''}<input name={k} type="number" required min={k==='pieces'?1:.001} max={k==='pieces'?300:k==='length'?30:['width','height'].includes(k)?10:100000} step={k==='pieces'?1:.001} defaultValue={draft[k]}/></label>)}<label>{t.shape}<select name="shape" defaultValue={draft.shape}>{(['box','pallet','pipe','drum'] as const).map(s=><option key={s} value={s}>{t[s]}</option>)}</select></label><label className="lp-checkbox lp-wide"><input type="checkbox" name="stackable" defaultChecked={draft.stackable}/>{t.stackable}</label><label>{t.pickup}<input name="pickup" maxLength={250} defaultValue={draft.pickup}/></label><label>{t.delivery}<input name="delivery" maxLength={250} defaultValue={draft.delivery}/></label><label className="lp-wide">{t.documents}<textarea name="documents" maxLength={2000} defaultValue={draft.documents}/></label></div><div className="lp-actions"><button type="button" onClick={()=>setAdding(false)}>{t.cancel}</button><button type="submit" className="lp-primary"><Plus size={16}/>{t.add}</button></div></form></div>}
  </div>;
}
