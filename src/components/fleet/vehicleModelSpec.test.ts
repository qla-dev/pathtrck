import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { vehicleModelSpec } from './vehicleModelSpec';

test('registration body choices produce distinct supported silhouettes',()=>{
  for(const [body,expected] of [['Box truck','box'],['Curtain sider','curtain'],['Refrigerated truck','reefer'],['Tanker','tanker'],['Flatbed','flatbed'],['Container truck','container'],['Dump truck','dump'],['Car carrier','carrier']]) {
    assert.equal(vehicleModelSpec({vehicle_type:'Light trucks (up to 3.5t)',features:{body_type:body}}).body,expected);
  }
});
test('recorded dimensions override class defaults without implying exact measurements for legacy records',()=>{
  const actual=vehicleModelSpec({vehicle_type:'Truck',features:{length_m:'6.2',width_m:2.1,height_m:3.05}});
  assert.deepEqual([actual.length,actual.width,actual.height],[6.2,2.1,3.05]);assert.equal(actual.recorded,true);
  const legacy=vehicleModelSpec({vehicle_type:'Truck',features:{length_m:-1,width_m:'invalid'}});
  assert.equal(legacy.recorded,false);assert.deepEqual(legacy.recordedDimensions,[null,null,null]);assert.ok(legacy.length>0);
});
test('light rigid trucks are two axle vehicles and heavy vehicles do not acquire an unregistered trailer',()=>{
  const light=vehicleModelSpec({vehicle_type:'Light trucks (up to 3.5t)',features:{configuration:'4x2',trailer:'No'}});
  const heavy=vehicleModelSpec({vehicle_type:'Heavy trucks (12t+)',features:{configuration:'6x4',trailer:'No'}});
  assert.equal(light.axles,2);assert.equal(heavy.axles,3);assert.equal(heavy.trailers,0);assert.ok(heavy.length>light.length);
});
test('registered trailer count, body style and lift are retained',()=>{
  const spec=vehicleModelSpec({features:{trailer:'Yes (2) • Flatbed • TEST',tail_lift:true}});
  assert.equal(spec.trailers,2);assert.match(spec.trailerBody,/Flatbed/);assert.equal(spec.tailLift,true);
});
test('van models and categories can affect schematic proportions without showing manufacturer branding',()=>{
  const short=vehicleModelSpec({vehicle_type:'Compact van',features:{vehicle_class:'van',body_type:'Panel van'}});
  const long=vehicleModelSpec({vehicle_type:'Long wheelbase van',model:'L4 high roof',features:{vehicle_class:'van',body_type:'Panel van'}});
  assert.equal(short.body,'van');assert.ok(long.length>short.length);assert.ok(long.height>short.height);
});
