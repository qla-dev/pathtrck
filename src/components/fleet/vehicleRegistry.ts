import type { Language } from '../../types';
export const RESOURCES=[['cargo_van','Teretni kombi','Cargo van'],['rigid_truck','Kamion','Rigid truck'],['tractor_unit','Tegljač','Tractor unit'],['semi_trailer','Poluprikolica','Semi-trailer'],['trailer','Prikolica','Trailer']] as const;
export const BODIES=[['panel_van','Furgon','Panel van'],['box','Zatvoreni sanduk','Box body'],['curtainsider','Bočna klizna cerada','Curtainsider'],['tarpaulin','Klasična cerada','Tarpaulin'],['refrigerated','Hladnjača','Refrigerated / reefer'],['flatbed','Platforma','Flatbed'],['dropside','Platforma sa stranicama','Dropside'],['container_chassis','Kontejnerska šasija','Container chassis'],['tipper','Kiper','Tipper'],['tanker','Cisterna','Tanker'],['silo','Silos','Silo'],['car_transporter','Autotransporter','Car transporter'],['swap_body','Izmjenjiva nadgradnja','Swap-body carrier'],['low_loader','Niskopodna platforma','Low-loader'],['other','Ostalo','Other'],['none','Bez teretnog prostora','No cargo body']] as const;
export const numericFeatures=['gross_weight_kg','unladen_weight_kg','category_mass_kg','gross_combination_weight_kg','max_towed_weight_kg','fifth_wheel_load_kg','length_m','width_m','height_m','cargo_length_m','cargo_width_m','cargo_height_m','door_width_m','door_height_m','loading_metres','tank_capacity_l','tail_lift_capacity_kg','pallet_positions','temperature_min_c','temperature_max_c','compartments'] as const;
export function registryLabel(lang:Language,code:string) { const row=[...RESOURCES,...BODIES].find(r=>r[0]===code);return row?row[['bs','hr','sr'].includes(lang)?1:2]:code; }
/** Keep existing load requirement IDs intact while using the same market terminology. */
export function bodyRequirementLabel(lang:Language,value:string) {
  const key=value.toLowerCase().replace(/[^a-z0-9]/g,'');
  const aliases:Record<string,string>={curtain:'curtainsider',curtainsider:'curtainsider',tautliner:'curtainsider',box:'box',boxtruck:'box',dryvan:'box',reefer:'refrigerated',refrigerated:'refrigerated',flatbed:'flatbed',tanker:'tanker',container:'container_chassis',dumptruck:'tipper',tipper:'tipper',carcarrier:'car_transporter',tarpaulin:'tarpaulin',mega:'curtainsider'};
  return aliases[key]?`${registryLabel(lang,aliases[key])}${key==='mega'?' · Mega':''}`:registryLabel(lang,value);
}
export const isTrailer=(v:Record<string,any>)=>['trailer','semi_trailer'].includes(v.features?.resource_type);
/** Deliberately rejects ranges, units, grouping separators and mixed decimal separators. */
export function parseRegistryNumber(value:unknown,negative=false):number|null {
  const raw=String(value??'').trim();if(!raw)return null;
  if(!(negative?/^-?\d+(?:[.,]\d+)?$/:/^\d+(?:[.,]\d+)?$/).test(raw))throw new Error('Unesite jednu brojčanu vrijednost bez raspona i jedinice.');
  const n=Number(raw.replace(',','.'));if(!Number.isFinite(n))throw new Error('Neispravan broj.');return n;
}
export function categoryForMass(kg:number,trailer=false) { return trailer?(kg<=750?'O1':kg<=3500?'O2':kg<=10000?'O3':'O4'):(kg<=3500?'N1':kg<=12000?'N2':'N3'); }
export function guidanceDocuments(f:Record<string,any>):string[] {
  const docs=['VEHICLE_REGISTRATION','TECHNICAL_INSPECTION'];if(['trailer','semi_trailer'].includes(f.resource_type))return docs;
  const eu='AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split(' ');
  if(eu.includes(f.operation_country)&&f.operation_scope==='international'&&f.operation_kind==='hire_reward'&&Math.max(Number(String(f.gross_weight_kg||0).replace(',','.')),Number(String(f.gross_combination_weight_kg||0).replace(',','.')))>2500)docs.push('COMMUNITY_LICENCE');
  if(f.atp_applicability==='yes')docs.push('ATP_CERTIFICATE');if(f.adr_applicability==='yes')docs.push('ADR_CERTIFICATE');return docs;
}
export function bodyOptions(type:string) {
  if(type==='tractor_unit')return BODIES.filter(r=>r[0]==='none');
  if(type==='cargo_van')return BODIES.filter(r=>['panel_van','box','curtainsider','tarpaulin','refrigerated','dropside','tipper','other'].includes(r[0]));
  return BODIES.filter(r=>!['panel_van','none'].includes(r[0]));
}
export function legacyResource(v:Record<string,any>) {
  if(v.features?.resource_type)return v.features.resource_type;
  if(v.features?.vehicle_class==='van'||/van|kombi/i.test(v.vehicle_type||''))return 'cargo_van';
  if(/truck|kamion/i.test(v.vehicle_type||''))return 'rigid_truck';
  return '';
}
export function legacyBody(v:Record<string,any>) {
  if(v.features?.body_type_code)return v.features.body_type_code;
  const b=String(v.features?.body_type||'').toLowerCase();
  return /panel/.test(b)?'panel_van':/box/.test(b)?'box':/curtain/.test(b)?'curtainsider':/refrigerat|reefer/.test(b)?'refrigerated':/tanker/.test(b)?'tanker':/flatbed/.test(b)?'flatbed':/container/.test(b)?'container_chassis':/dump|tipper/.test(b)?'tipper':/car carrier/.test(b)?'car_transporter':'';
}
export function registryFeatures(v:Record<string,any>={}) {
  const f=v.features||{},result:Record<string,any>={...f,resource_type:legacyResource(v),body_type_code:legacyBody(v),legal_category:f.legal_category||'',body_variant:f.body_variant||'standard',operation_country:f.operation_country||'',operation_scope:f.operation_scope||'',operation_kind:f.operation_kind||'',adr_applicability:f.adr_applicability||'unknown',atp_applicability:f.atp_applicability||'unknown',loading_methods:f.loading_methods||[],axle_configuration:f.axle_configuration||(/x/.test(f.configuration||'')?f.configuration:''),wheelbase_variant:f.wheelbase_variant||(!/x/.test(f.configuration||'')?f.configuration:''),roof_variant:f.roof_variant||''};
  numericFeatures.forEach(k=>result[k]=f[k]==null?'':String(f[k]));return result;
}
