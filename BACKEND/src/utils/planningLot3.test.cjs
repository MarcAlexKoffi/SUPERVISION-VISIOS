const {test} = require('node:test');
const assert = require('node:assert/strict');
const {slotValidation,slotConflict,assertNoConflict,combined,moved} = require(require('node:path').resolve(__dirname,'../../.lot3-test-output/planningLot3.js'));
const base = {id:'one',date:'2026-11-09',start_time:'09:00',end_time:'10:00',teacher_id:'t1',classe_id:'c1',parcours:'M1',status:'À superviser'};
test('backend rejects inverted times, accepts valid session',()=>{
 assert.equal(slotValidation(base),null);
 assert.match(slotValidation({...base,end_time:'08:59'}),/postérieure/);
});
test('backend protects class and teacher irrespective of UI',()=>{
 assert.throws(()=>assertNoConflict({...base,id:'two'},[base]),/Conflit/);
 assert.equal(slotConflict({...base,id:'two',start_time:'10:00',end_time:'12:00'},base),false);
});
test('backend guards treat cancelled and different class IDs correctly',()=>{
 assert.equal(slotConflict({...base,id:'two',status:'Annulé'},base),false);
 assert.equal(slotConflict({...base,id:'two',teacher_id:'t2',classe_id:'c2'},base),false);
});
test('backend guard overlay keeps latest transaction entries',()=>{
 const rows=[base];
 const next={...base,start_time:'12:00'};
 assert.equal(combined(rows,{one:next})[0].start_time,'12:00');
 assert.equal(moved(base,next),true);
});
