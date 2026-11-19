import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import * as THREE from 'three';
import {buildVehicleModel} from './buildVehicleModel';
import {vehicleIdentityCatalog} from './vehicleIdentityCatalog';

test('series geometries stay finite across road suggestions and every supported cargo body',()=>{
 // Only the livery canvas is stubbed. All Three.js geometry, bounds and transforms are real.
 const oldDocument=globalThis.document,oldPath=globalThis.Path2D;
 Object.assign(globalThis,{document:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},save(){},translate(){},scale(){},restore(){},fill(){},fillText(){},measureText:()=>({width:700}),createLinearGradient:()=>({addColorStop(){}})})})},Path2D:class{}});
 const dispose=(group:THREE.Group)=>group.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){(m as THREE.MeshStandardMaterial).map?.dispose();m.dispose();}}});
 try {
  const legacy=buildVehicleModel({make:null,model:null,vehicle_type:'Truck',features:null});
  assert.equal(legacy.spec.series.cab.id,'generic');assert.ok(!new THREE.Box3().setFromObject(legacy.group).isEmpty());dispose(legacy.group);
  for(const [make,models] of Object.entries(vehicleIdentityCatalog('road','')))for(const model of models){
   const van=vehicleIdentityCatalog('road','cargo_van')[make]?.includes(model);
   const {group}=buildVehicleModel({make,model,features:{resource_type:van?'cargo_van':'rigid_truck',body_type_code:van?'panel_van':'box'}});
   const bounds=new THREE.Box3().setFromObject(group),size=bounds.getSize(new THREE.Vector3());assert.ok([size.x,size.y,size.z].every(n=>Number.isFinite(n)&&n>0),`${make} ${model}`);dispose(group);
  }
  for(const code of ['box','curtainsider','refrigerated','tanker','silo','flatbed','container_chassis','tipper','car_transporter','none']){
   const {group,spec}=buildVehicleModel({make:'MAN',model:'TGX',features:{resource_type:code==='none'?'tractor_unit':'rigid_truck',body_type_code:code,length_m:8,width_m:2.5,height_m:3.8}});
   assert.equal(spec.length,8);const size=new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());assert.ok(size.x<10&&size.y<5&&size.z<4);dispose(group);
  }
 }finally{Object.assign(globalThis,{document:oldDocument,Path2D:oldPath});}
});
