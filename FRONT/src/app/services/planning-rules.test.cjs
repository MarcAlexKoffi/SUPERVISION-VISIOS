// Run after: tsc --target es2022 --module commonjs --outDir /tmp/sv-rules planning-rules.ts
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { minutes, validateSlot, conflictsWith, firstConflict, sortedTeacherSchedule, isRescheduled } = require(require('node:path').resolve(__dirname,'../../../.lot3-test-output/planning-rules.js'));
const a = {id:'a', date:'2026-11-09',start_time:'09:00',end_time:'10:30',teacher_id:'t1',classe_id:'c1',parcours:'M1',status:'À superviser'};
test('validates time bounds, date, and required references',()=> {
 assert.equal(validateSlot(a),null);
 assert.match(validateSlot({...a,start_time:'10:30'}),/postérieure/);
 assert.match(validateSlot({...a,date:'2026-02-30'}),/Date/);
 assert.match(validateSlot({...a,start_time:'25:01'}),/Heures/);
});
test('detects teacher and class overlapping intervals',()=>{
 assert.ok(conflictsWith({...a,id:'b',classe_id:'other',parcours:'M2'},a));
 assert.ok(conflictsWith({...a,id:'b',teacher_id:'other'},a));
 assert.ok(conflictsWith({...a,id:'b',classe_id:null,teacher_id:'other'},a));
 assert.ok(firstConflict({...a,id:'b'},[a]));
});
test('allows adjacent times, cancelled sessions, and self-update',()=>{
 assert.equal(conflictsWith({...a,id:'b',start_time:'10:30',end_time:'11:00'},a),false);
 assert.equal(conflictsWith({...a,id:'b'}, {...a,status:'Annulé'}),false);
 assert.equal(conflictsWith({...a},a),false);
});
test('sorts teacher schedule and recognizes rescheduling',()=>{
 assert.deepEqual(sortedTeacherSchedule([{...a,id:'b',start_time:'11:00'},{...a},{...a,teacher_id:'t2'}],'t1').map(s=>s.id),['a','b']);
 assert.equal(isRescheduled(a,{...a,start_time:'09:30'}),true);
 assert.equal(isRescheduled(a,{...a,status:'Annulé'}),false);
 assert.equal(minutes('23:59'),1439);
});
test('planning fingerprint changes after a date/time or relation edit',()=>{
 const {planningFingerprint}=require(require('node:path').resolve(__dirname,'../../../.lot3-test-output/planning-rules.js'));
 assert.notEqual(planningFingerprint(a), planningFingerprint({...a, date:'2026-11-10'}));
 assert.notEqual(planningFingerprint(a), planningFingerprint({...a,teacher_id:'t2'}));
 assert.equal(planningFingerprint(a), planningFingerprint({...a,description:'unrelated edit'}));
});
