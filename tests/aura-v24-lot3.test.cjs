'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const planning=read('FRONT/src/app/plannings/plannings.ts');
const planningHtml=read('FRONT/src/app/plannings/plannings.html');
const ue=read('FRONT/src/app/ues/ues.ts');
const ueHtml=read('FRONT/src/app/ues/ues.html');
const pdf=read('FRONT/src/app/shared/utils/edt-pdf.ts');
const rules=read('FRONT/src/app/services/planning.service.ts');
let ts;
try {ts=require(require.resolve('typescript',{paths:[path.join(root,'FRONT')]}));}
catch {ts=require(path.join(require('node:child_process').execFileSync('npm',['root','-g'],{encoding:'utf8'}).trim(),'typescript'));}
const moduleSource=read('FRONT/src/app/shared/utils/edt-week.ts');
const js=ts.transpileModule(moduleSource,{fileName:'edt-week.ts',compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const testModule={exports:{}};
new Function('module','exports','require',js)(testModule,testModule.exports,require);
const util=testModule.exports;
const d=(y,m,day)=>new Date(y,m-1,day,12);

test('V2.4: filename class requested, target sanitized',()=>{
 assert.equal(util.edtPdfFilename(d(2026,11,9),d(2026,11,15),'MAFIDA 1A','class'),'EDT_09-15Nov.2026-MAFIDA_1A.pdf');
 assert.equal(util.edtPdfFilename(d(2026,11,9),d(2026,11,15),'Marc Alex Koffi','teacher'),'EDT_09-15Nov.2026-Marc-Alex-Koffi.pdf');
 assert.ok(!util.edtPdfFilename(d(2026,11,9),d(2026,11,15),'../MAFIDA:1/A','class').includes('../'));
});
test('V2.4: cross-month and cross-year weeks have unambiguous names',()=>{
 assert.equal(util.edtPdfFilename(d(2026,11,30),d(2026,12,6),'MAE','class'),'EDT_30Nov.2026-06Déc.2026-MAE.pdf');
 assert.equal(util.edtPdfFilename(d(2026,12,28),d(2027,1,3),'MAE','class'),'EDT_28Déc.2026-03Janv.2027-MAE.pdf');
});
test('V2.4: cancellation projection supports French accents and does not mutate source',()=>{
 const sessions=[{status:'À superviser',id:1},{status:'Annulé',id:2},{status:'Supervisé',id:3},{status:'Annule',id:4}];
 assert.deepEqual(util.activeEdtSessions(sessions).map(s=>s.id),[1,3]);
 assert.equal(sessions.length,4);
});
test('V2.4: automatic useful hours exclude cancelled morning sessions',()=>{
 const events=[{status:'Annulé',start_time:'08:00',end_time:'09:30'}, {status:'À superviser',start_time:'19:00',end_time:'20:30'}];
 assert.deepEqual(util.edtHourRange(events),{startHour:19,endHour:21});
 assert.deepEqual(util.edtHourRange(events,true),{startHour:8,endHour:24});
});
test('V2.4: deadline-only sessions keep a one-hour fallback',()=>{
 assert.deepEqual(util.edtHourRange([{end_time:'20:30'}]),{startHour:19,endHour:21});
});
test('V2.4: class and teacher share the same Angular calendar',()=>{
 assert.match(planningHtml,/currentView === 'calendar' \|\| currentView === 'teacher'/);
 assert.match(planningHtml,/getTimetableForDay\(day\)/);
 assert.doesNotMatch(planningHtml,/table class="w-full text-sm text-left"/);
});
test('V2.4: teachers see all their classes regardless of previous class filters',()=>{
 assert.match(planning,/this\.currentView === 'teacher' \|\| !this\.selectedParcours/);
 assert.match(planning,/this\.currentView !== 'teacher' && this\.selectedParcours/);
 assert.match(planningHtml,/\*ngIf="currentView !== 'teacher'"/);
});
test('V2.4: PDF uses one engine for both views, with active projection and real week',()=>{
 assert.match(planning,/exportWeeklyTimetablePdf\(\{/);
 assert.match(planning,/sessions: this\.timetableSessions/);
 assert.match(pdf,/activeEdtSessions\(request\.sessions\)/);
 assert.match(pdf,/edtPdfFilename\(request\.start,request\.end,target,request\.kind\)/);
 assert.match(pdf,/doc\.save\(filename\)/);
 assert.match(pdf,/doc\.addPage\(\)/); // dense timetable details
});
test('V2.4: active timetable excludes cancelled, supervisor retains them',()=>{
 assert.match(planning,/const active = activeEdtSessions\(this\.visiblePlannings\)/);
 assert.match(planningHtml,/plan\.status === 'Annulé'/);
 assert.match(planning,/getCancellationReason\(plan: Planning\)/);
 assert.match(rules,/status_history\?:/);
});
test('V2.4: cancellation and deletion use premium confirmation, no native browser dialog',()=>{
 assert.doesNotMatch(planning,/(window\.prompt\(|\bconfirm\(|\balert\()/);
 assert.match(planning,/action\.targetStatus === 'Annulé' && !action\.reason\.trim\(\)/);
 assert.match(planningHtml,/role="alertdialog" aria-modal="true"/);
 assert.match(planningHtml,/id="auraCancellationReason"/);
 assert.match(planningHtml,/\(click\)="confirmActionDialog\(\)"/);
 assert.match(planning,/if \(!action \|\| action\.busy/);
});
test('V2.4: UI does not show optimistic status updates before save',()=>{
 assert.match(planning,/element\.value = planning\.status/);
 assert.match(planning,/this\.planningService\.updatePlanning\(String\(plan\.id\),/);
 assert.match(planning,/this\.loadPlannings\(\)/);
});
test('V2.4: new UE link persists stable ID and keeps legacy name',()=>{
 assert.match(ueHtml,/<app-academic-search-select \[options\]="teachers" valueField="id"/);
 assert.match(ueHtml,/\[value\]="responsibleTeacherId"/);
 assert.match(ue,/this\.currentUE\.responsible_id = teacher \? String\(teacher\.id\) : null/);
 assert.match(ue,/this\.currentUE\.responsible = teacher \? this\.teacherDisplayName\(teacher\) : ''/);
 assert.match(ue,/matches\.length === 1 \?/);
});
test('V2.4: linked supervision, reprogramming, and existing shell stay',()=>{
 assert.match(planning,/this\.supervisionService\.getByPlanningId/);
 assert.match(planningHtml,/class="aura-planning-drawer"/);
 assert.match(rules,/reschedule_history/);
 assert.match(rules,/planning_day_locks/);
});
test('V2.4: pdf module TypeScript parser sees no errors',()=>{
 for(const file of ['FRONT/src/app/shared/utils/edt-pdf.ts','FRONT/src/app/plannings/plannings.ts','FRONT/src/app/ues/ues.ts']){
   const r=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,experimentalDecorators:true}});
   assert.equal(r.diagnostics?.length||0,0,file);
 }
});
