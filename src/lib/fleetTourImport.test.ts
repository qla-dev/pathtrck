import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTourDate,tourImportRows } from './fleetTourImport';

test('only chosen date is imported and leading zero identifiers remain text',()=>{
 const r=tourImportRows([['Tour','Date','Driver'],['000123','2026-11-12','A'],['000124','2026-11-11','B']],{idColumn:0,driverColumn:2,dateColumn:1,date:'2026-11-12',manual:''});
 assert.deepEqual(r.rows,[{tour_code:'000123',driver_name:'A'}]);assert.equal(r.skipped,1);assert.deepEqual(r.invalid,[]);
});
test('ambiguous dates cannot silently become the current day',()=>{
 assert.equal(normalizeTourDate('11/12/26'),null);assert.equal(normalizeTourDate('31.02.2026'),null);
 const r=tourImportRows([['Tour','Date'],['1','11/12/26']],{idColumn:0,driverColumn:null,dateColumn:1,date:'2026-11-12',manual:''});assert.equal(r.invalid.length,1);assert.equal(r.rows.length,0);
});
test('manual input and arbitrary mapped partner columns need no parcel data',()=>{
 assert.deepEqual(tourImportRows([],{idColumn:null,driverColumn:null,dateColumn:null,date:'2026-11-12',manual:'A-001\nB-002\n'}).rows,[{tour_code:'A-001'},{tour_code:'B-002'}]);
 const r=tourImportRows([['Packages','Ablauf','Kennung'],[300,'misc','CA-A123']],{idColumn:2,driverColumn:null,dateColumn:null,date:'2026-11-12',manual:''});assert.equal(r.rows[0].tour_code,'CA-A123');
});
test('blank ID rows remain visible to server preview while fully blank rows are ignored',()=>{
 const r=tourImportRows([['Tour','Driver'],['','A'],['','']],{idColumn:0,driverColumn:1,dateColumn:null,date:'2026-11-12',manual:''});assert.equal(r.rows.length,1);assert.equal(r.rows[0].tour_code,'');
});
