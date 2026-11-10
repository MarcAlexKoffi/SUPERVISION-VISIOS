'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
let ts;
try { ts = require('../FRONT/node_modules/typescript'); }
catch { ts = require('/usr/local/slides_js/node_modules/typescript'); }
const helperFile='FRONT/src/app/shared/utils/history-teacher-scope.ts';
const source=read(helperFile);
const transpiled=ts.transpileModule(source,{fileName:helperFile,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
assert.equal((transpiled.diagnostics || []).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
const mod={exports:{}};
new Function('module','exports',transpiled.outputText)(mod,mod.exports);
const {asHistoryDay,asyncHistoryDateBounds,historyTeacherScope,firstTeacherHistoryCourse}=mod.exports;
const sync=(name,course,date)=>({teacher:{name},course:{name:course},date:new Date(date+'T12:00:00Z'),originalData:{visit_date:date}});
const async=(name,course,week)=>({teacher_name:name,ue_name:course,week});
const build=(teacher,s,a)=>historyTeacherScope(teacher,s,a,x=>x.teacher_name,x=>x.ue_name);

test('Dates ISO, dates FR, leap year and impossible days',()=>{
 assert.equal(asHistoryDay('2026-10-17'),'2026-10-17');
 assert.equal(asHistoryDay('17/10/2026'),'2026-10-17');
 assert.equal(asHistoryDay('2024-02-29'),'2024-02-29');
 assert.equal(asHistoryDay('2026-02-29'),'');
 assert.equal(asHistoryDay('2026-02-30'),'');
 assert.equal(asHistoryDay(''),'');
 assert.equal(asHistoryDay(undefined),'');
});
test('Async week with cross-year bounds, no invented dates',()=>{
 assert.deepEqual(asyncHistoryDateBounds({week:'Semaine du 28/12/2026 au 03/01/2027'}),{startDate:'2026-12-28',endDate:'2027-01-03'});
 assert.deepEqual(asyncHistoryDateBounds({week:'Semaine du 31/02/2026 au 07/03/2026'}),{startDate:'',endDate:''});
 assert.deepEqual(asyncHistoryDateBounds({created_at:'2026-04-14'}),{startDate:'',endDate:''});
});
test('Selecting teacher lists only THEIR real courses and min/max date',()=>{
 const rows=[sync('ABDULAYE TEME','POLITIQUE FINANCIERE APPROFONDIE','2026-10-17'),sync('ABDULAYE TEME','POLITIQUE FINANCIERE APPROFONDIE','2026-10-30'),sync('OTHER TEACHER','COMPTABILITE','2026-01-01')];
 const scope=build('ABDULAYE TEME',rows,[]);
 assert.deepEqual(scope.courses,['POLITIQUE FINANCIERE APPROFONDIE']);
 assert.equal(scope.startDate,'2026-10-17');assert.equal(scope.endDate,'2026-10-30');
});
test('Async courses included, dates reflect full async week',()=>{
 const scope=build('SERGE', [sync('SERGE','STATISTIQUES','2026-11-12')], [async('SERGE','ANGLAIS','Semaine du 02/11/2026 au 08/11/2026'),async('MARIE','DROIT','Semaine du 01/01/2025 au 07/01/2025')]);
 assert.deepEqual(scope.courses,['ANGLAIS','STATISTIQUES']);
 assert.equal(scope.startDate,'2026-11-02');assert.equal(scope.endDate,'2026-11-12');
});
test('Missing date or teacher does not create fake date',()=>{
 const rows=[{teacher:{name:'SERGE'},course:{name:'DROIT'},originalData:{visit_date:'invalid'},date:new Date('2026-11-10')}];
 const scope=build('SERGE',rows,[]);
 assert.deepEqual(scope.courses,['DROIT']);
 assert.equal(scope.startDate,'');assert.equal(scope.endDate,'');
 assert.equal(scope.undatedCount,1);
 assert.deepEqual(build('NOT FOUND',rows,[]),{courses:[],startDate:'',endDate:'',undatedCount:0});
});
test('Source history is never mutated',()=>{
 const rows=[sync('S','UE-1','2026-02-01')];const asynchronous=[async('S','UE-2','Semaine du 02/02/2026 au 08/02/2026')];
 const original=JSON.stringify({rows,asynchronous});build('S',rows,asynchronous);
 assert.equal(JSON.stringify({rows,asynchronous}),original);
});
test('History wiring resets UE and fills only observed teacher date range',()=>{
 const code=read('FRONT/src/app/history/history.ts');
 assert.match(code,/historyTeacherScope\(/);
 assert.match(code,/teacher \? this\.scopeForTeacher\(teacher\)\.courses : this\.courses/);
 assert.match(code,/this\.filters\.startDate = scope\?\.startDate \?\? ''/);
 assert.match(code,/this\.filters\.endDate = scope\?\.endDate \?\? ''/);
 assert.match(code,/this\.filters\.course = firstTeacherHistoryCourse\(scope\)/);
 assert.match(read('FRONT/src/app/history/history.html'),/\[options\]="searchableCourses"/);
});
test('Calendar popup is a DOM-owned overlay; dates, outside click and Escape work with zone and immediate UI',()=>{
 const code=read('FRONT/src/app/plannings/plannings.ts');
 const html=read('FRONT/src/app/plannings/plannings.html');
 const scss=read('FRONT/src/app/plannings/plannings.scss');
 const overlay=read('FRONT/src/app/shared/utils/week-picker-overlay.ts');
 assert.match(code,/new WeekPickerOverlay\(trigger/);
 assert.match(code,/onSelectDay: day => this\.zone\.run\(\(\) => this\.jumpToWeek\(day\)\)/);
 assert.match(code,/this\.weekStart = startOfWeek\(selected/);
 assert.match(code,/this\.cdr\.detectChanges\(\);\s*this\.loadPlannings\(\);/);
 assert.match(code,/@HostListener\('document:pointerdown'/);
 assert.match(code,/this\.weekPopup\?\.contains\(target\)/);
 assert.match(code,/closeWeekPickerOnEscape/);
 assert.doesNotMatch(code,/@ViewChild\('weekPickerPopup'\)/);
 assert.doesNotMatch(html,/#weekPickerPopup/);
 assert.match(html,/\(click\)="openWeekPicker\(\)"/);
 assert.match(overlay,/document\.body\.appendChild\(this\.popup\)/);
 assert.match(overlay,/button\.addEventListener\('click'/);
 assert.match(overlay,/this\.ngContentAttribute/);
 assert.match(overlay,/popup\.replaceChildren\(heading,grid,today\)/);
 assert.match(scss,/\.aura-week-popup\{position:fixed;z-index:10010/);
});

test('Teacher selection defaults to first scoped UE, never another teacher or phantom UE',()=>{
 const scope=build('SERGE', [sync('SERGE','ZOOLOGIE','2026-11-12'),sync('SERGE','ANGLAIS','2026-10-04'),sync('OTHER','COMPTABILITE','2026-04-01')], []);
 assert.deepEqual(scope.courses,['ANGLAIS','ZOOLOGIE']);
 assert.equal(firstTeacherHistoryCourse(scope),'ANGLAIS');
 assert.equal(firstTeacherHistoryCourse(build('UNKNOWN',[],[])),'');
 assert.equal(firstTeacherHistoryCourse(null),'');
});
test('New source files parse cleanly',()=>{
 for(const f of ['FRONT/src/app/plannings/plannings.ts','FRONT/src/app/history/history.ts',helperFile,'FRONT/src/app/shared/utils/week-picker-overlay.ts']) {
  const ast=ts.createSourceFile(f,read(f),ts.ScriptTarget.Latest,true);
  assert.equal(ast.parseDiagnostics.length,0,f+': '+ast.parseDiagnostics.map(x=>x.messageText).join(', '));
 }
});
