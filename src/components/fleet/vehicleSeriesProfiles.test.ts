import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {vehicleSeriesProfile as profile} from './vehicleSeriesProfiles';
import {vehicleModelSpec} from './vehicleModelSpec';
import {vehicleIdentityCatalog} from './vehicleIdentityCatalog';
test('all road suggestions have a simplified series profile',()=>{
 for(const [make,models] of Object.entries(vehicleIdentityCatalog('road','')))for(const model of models)assert.ok(profile(make,model).recognized,`${make} ${model}`);
});
test('longest series matches preserve Aero and Custom rather than their base series',()=>{
 assert.equal(profile('VOLVO','FH16 Aero 780').cab.id,'aero');assert.equal(profile('ford','E-Transit Custom').cab.id,'medium-van');
 assert.equal(profile('Scania','R450').cab.id,'scania');assert.equal(profile('Scania','Random model').recognized,false);
 assert.equal(profile(' Mercedes-Benz ','Mercedes-Benz Actros L 1848').series,'Actros L');
 assert.equal(profile('DAF','XG+ 530').series,'XG+');assert.equal(profile('Unknown','Actros').cab.id,'generic');
});
test('styling changes neither recorded dimensions nor body, axle count or legal data',()=>{
 const vehicle={make:'Volvo',model:'FH Aero',features:{resource_type:'rigid_truck',body_type_code:'tanker',length_m:9.1,width_m:2.5,height_m:3.4,axle_configuration:'6x2',legal_category:'N3'}};
 const before=JSON.stringify(vehicle),styled=vehicleModelSpec(vehicle),simple=vehicleModelSpec(vehicle,true);
 for(const s of [styled,simple]){assert.equal(s.body,'tanker');assert.equal(s.length,9.1);assert.equal(s.width,2.5);assert.equal(s.height,3.4);assert.equal(s.axles,3);}
 assert.equal(styled.series.cab.id,'aero');assert.equal(simple.series.cab.id,'generic');assert.equal(JSON.stringify(vehicle),before);
});
test('unknown and detached trailer records keep their generic fallback and no guessed cargo',()=>{
 assert.equal(profile('Mercedes-Benz','Unknown prototype').cab.id,'generic');
 const s=vehicleModelSpec({make:'Scania',model:'S',features:{resource_type:'semi_trailer',body_type_code:'flatbed'}});assert.equal(s.cabLength,0);assert.equal(s.body,'flatbed');
});
