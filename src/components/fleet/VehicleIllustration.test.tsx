import React from 'react';
import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {renderToStaticMarkup} from 'react-dom/server';
import {VehicleIllustration,vehicleShape} from './VehicleIllustration';
import {vehicleModelSpec} from './vehicleModelSpec';
test('legacy API records with null manufacturer and model cannot crash the fleet',()=>{
 const v={vehicle_type:'Light trucks (up to 3.5t)',make:null,model:null,features:null};
 assert.doesNotThrow(()=>vehicleModelSpec(v));
 assert.doesNotThrow(()=>renderToStaticMarkup(<VehicleIllustration vehicle={v} label="Legacy vehicle"/>));
});
test('chassis cab box vans cannot silently display as panel vans',()=>{
 const v={make:'Volkswagen',model:'Crafter',vehicle_type:'cargo_van',features:{resource_type:'cargo_van',body_type_code:'box'}};
 assert.equal(vehicleShape(v),'truck');assert.equal(vehicleShape({...v,features:{...v.features,body_type_code:'panel_van'}}),'van');
});
test('fallback and 3D agree on stored body codes even without translated body names',()=>{
 for(const code of ['box','curtainsider','refrigerated','tanker','silo','flatbed','tipper','container_chassis','car_transporter','none']){
  const v={make:'MAN',model:'TGX',features:{resource_type:code==='none'?'tractor_unit':'rigid_truck',body_type_code:code}};
  const html=renderToStaticMarkup(<VehicleIllustration vehicle={v} label="Vehicle"/>);
  assert.ok(html.includes(`data-body="${vehicleModelSpec(v).body}"`));assert.ok(!/NaN|Infinity/.test(html));
 }
});
test('series-specific SVG cab differs while simplified styling retains its generic fallback',()=>{
 const v={make:'Volvo',model:'FH Aero',features:{resource_type:'rigid_truck',body_type_code:'box'}};
 const styled=renderToStaticMarkup(<VehicleIllustration vehicle={v} label="Vehicle"/>),simple=renderToStaticMarkup(<VehicleIllustration vehicle={v} label="Vehicle" simplified/>);
 assert.ok(styled.includes('data-cab-profile="aero"'));assert.ok(simple.includes('data-cab-profile="generic"'));assert.notEqual(styled,simple);
 assert.ok(!styled.includes('Volvo'));assert.ok(!styled.includes('FH Aero'));
});
