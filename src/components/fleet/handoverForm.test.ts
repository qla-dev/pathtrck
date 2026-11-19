import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { acceptableHandoverPhoto, handoverDestinationIssue, validHandoverCondition } from './handoverForm';
const condition = { mileage:'125000',minimum:120000,fuel:50,damage:false,notes:'',confirmed:true };
test('condition requires an actual integer reading, valid fuel and confirmation',()=>{
  assert.ok(validHandoverCondition(condition));
  for(const mileage of ['', '1e6','125000.5','-1','119999','1000000000']) assert.equal(validHandoverCondition({...condition,mileage}),false);
  assert.equal(validHandoverCondition({...condition,confirmed:false}),false);
  assert.equal(validHandoverCondition({...condition,fuel:101}),false);
});
test('new damage requires a description',()=>{
  assert.equal(validHandoverCondition({...condition,damage:true,notes:'  '}),false);
  assert.ok(validHandoverCondition({...condition,damage:true,notes:'Scratch on rear door'}));
});
test('photo format and 12 MiB boundary match handover API constraints',()=>{
  assert.ok(acceptableHandoverPhoto({name:'front.jpg',type:'image/jpeg',size:12*1024*1024}));
  assert.ok(acceptableHandoverPhoto({name:'rear.HEIC',type:'',size:1024}));
  assert.equal(acceptableHandoverPhoto({name:'large.jpg',type:'image/jpeg',size:12*1024*1024+1}),false);
  assert.equal(acceptableHandoverPhoto({name:'animation.gif',type:'image/gif',size:1024}),false);
  assert.equal(acceptableHandoverPhoto({name:'empty.png',type:'image/png',size:0}),false);
});
const base={destination:'driver',vehicle:{id:1,status:'active',assigned_driver_user_id:3,depot_id:7,ownership_type:'owned'},driverId:'4',depotId:'7',drivers:[{id:3},{id:4}],depots:[{id:7,active:true}],vehicles:[],allowReturn:true};
test('handover prevents same-driver and known double-assignment before submission',()=>{
  assert.equal(handoverDestinationIssue(base),'');
  assert.ok(handoverDestinationIssue({...base,driverId:'3'}));
  assert.ok(handoverDestinationIssue({...base,vehicles:[{id:2,assigned_driver_user_id:4}]}));
  assert.ok(handoverDestinationIssue({...base,driverId:''}));
});
test('blocked vehicles may return to depot but cannot be assigned to a driver',()=>{
  const vehicle={...base.vehicle,dispatch_blocked:true};
  assert.ok(handoverDestinationIssue({...base,vehicle}));
  assert.equal(handoverDestinationIssue({...base,vehicle,destination:'depot'}),'');
  assert.ok(handoverDestinationIssue({...base,destination:'depot',depots:[{id:7,active:false}]}));
});
test('coupled vehicles require detachment before workshop or depot change',()=>{
  const vehicle={...base.vehicle,linked_trailers:[{id:9}]};
  assert.ok(handoverDestinationIssue({...base,vehicle,destination:'workshop'}));
  assert.ok(handoverDestinationIssue({...base,vehicle,depotId:'8',destination:'depot',depots:[{id:8}]}));
  assert.equal(handoverDestinationIssue({...base,vehicle,destination:'depot'}),'');
});
test('lessor returns need rental ownership and authorization; archived assets cannot hand over',()=>{
  assert.ok(handoverDestinationIssue({...base,destination:'returned'}));
  const vehicle={...base.vehicle,ownership_type:'rented'};
  assert.equal(handoverDestinationIssue({...base,vehicle,destination:'returned'}),'');
  assert.ok(handoverDestinationIssue({...base,vehicle,destination:'returned',allowReturn:false}));
  assert.ok(handoverDestinationIssue({...base,vehicle:{...vehicle,status:'sold'},destination:'depot'}));
});
