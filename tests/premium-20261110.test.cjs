'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../FRONT/node_modules/typescript');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const sourcePath='FRONT/src/app/shared/utils/supervision-sequence.ts';
const source=read(sourcePath);
const compiled=ts.transpileModule(source,{fileName:sourcePath,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
const exported={exports:{}};
new Function('module','exports',compiled.outputText)(exported,exported.exports);
const {numberedCourseSequence}=exported.exports;
const session=(id,date,status='À superviser',overrides={})=>({id,date,status,start_time:'19:00',teacher_id:'t1',ue_id:'u1',classe_id:'c1',session_type:'CM',...overrides});

test('S1: annulée dans la programmation => quatrième séance physique devient numéro 3',()=>{
 const p1=session('1','2026-11-03'),p2=session('2','2026-11-05'),p3=session('3','2026-11-09','Annulé'),p4=session('4','2026-11-13');
 assert.equal(numberedCourseSequence([p1,p2,p3,p4],p1),1);
 assert.equal(numberedCourseSequence([p1,p2,p3,p4],p2),2);
 assert.equal(numberedCourseSequence([p1,p2,p3,p4],p3),null);
 assert.equal(numberedCourseSequence([p1,p2,p3,p4],p4),3);
});
test('S2: numérotation séparée enseignant, UE, classe; examen exclu',()=>{
 const p1=session('1','2026-11-03'),exam=session('exam','2026-11-04','À superviser',{session_type:'Examen'}),
 t2=session('otherTeacher','2026-11-05','À superviser',{teacher_id:'t2'}),
 u2=session('otherUe','2026-11-06','À superviser',{ue_id:'u2'}),
 c2=session('otherClasse','2026-11-07','À superviser',{classe_id:'c2'}),
 p2=session('last','2026-11-13');
 assert.equal(numberedCourseSequence([p1,exam,t2,u2,c2,p2],p2),2);
});
test('S3: ordre à date égale stable par heure puis identifiant',()=>{
 const p1=session('a','2026-11-11','Supervisé',{start_time:'08:00'}),p2=session('b','2026-11-11','À superviser',{start_time:'19:00'});
 assert.equal(numberedCourseSequence([p1,p2],p2),2);
});
test('S4: correction sous forme additive et aucun accès distant dans la numérotation',()=>{
 assert.doesNotMatch(source,/Firestore|addDoc|updateDoc|deleteDoc|runTransaction|fetch\(/);
 const sup=read('FRONT/src/app/supervision-form/supervision-form.ts');
 assert.match(sup,/numberedCourseSequence\(all, planning\)/);
 assert.match(sup,/classIds: this\.selectedClasses\.map/);
 assert.match(sup,/classNames: this\.selectedClasses\.map/);
 assert.match(sup,/level: this\.formData\.level/);
 assert.match(sup,/combinedEnrollment\(this\.classesList, this\.selectedClassIds\)\.total/);
 assert.match(read('FRONT/src/app/supervision-form/supervision-form.html'),/type="checkbox"/);
});
test('S5: filtres Honoraires recherchent enseignant et UE sans changer les IDs',()=>{
 const html=read('FRONT/src/app/honoraires/honoraires.html');
 const tsCode=read('FRONT/src/app/honoraires/honoraires.ts');
 assert.match(html,/inputId="honorairesTeacher"/);
 assert.match(html,/inputId="honorairesUE"/);
 assert.match(html,/onHonorairesTeacherSelected/);
 assert.match(html,/onHonorairesUeSelected/);
 assert.match(tsCode,/this\.filters\.teacher=String\(value \?\? ''\)/);
 assert.match(tsCode,/this\.filters\.ue=String\(value \?\? ''\)/);
});
test('S6: planning enseignant ne choisit plus le premier et offre un accès direct au mois',()=>{
 const html=read('FRONT/src/app/plannings/plannings.html');
 const tsCode=read('FRONT/src/app/plannings/plannings.ts');
 assert.doesNotMatch(tsCode,/this\.selectTeacherForSchedule\(data\[0\]\)/);
 assert.doesNotMatch(tsCode,/this\.selectTeacherForSchedule\(this\.teachers\[0\]\)/);
 assert.match(tsCode,/jumpToWeek\(day: Date\)/);
 assert.match(html,/aura-week-picker-button/);
 assert.match(tsCode,/movePickerMonth/);
 assert.match(tsCode,/new WeekPickerOverlay/);
 assert.match(read('FRONT/src/app/shared/utils/week-picker-overlay.ts'),/aura-week-popup/);
 assert.match(html,/Choisissez un enseignant/);
});
test('S7: accueil compact, indicateurs conditionnés aux données et sans catalogue dans la vue admin',()=>{
 const html=read('FRONT/src/app/dashboard-home/dashboard-home.html');
 const tsCode=read('FRONT/src/app/dashboard-home/dashboard-home.ts');
 for (const item of ['À traiter','Prochaines séances','Séances prévues','À régulariser','Alertes actives']) assert.ok(html.includes(item),item);
 assert.match(html,/dashboardLoadState==='loading'/);
 assert.match(html,/dashboardLoadState==='error'/);
 assert.match(html,/<ng-container \*ngIf="!isAdmin"><details class="aura-dash-legacy">/);
 assert.match(tsCode,/timeout\(\{first:15000\}\)/);
});
test('S8: les nouveaux TypeScript sont syntaxiquement valides',()=>{
 const paths=['FRONT/src/app/honoraires/honoraires.ts','FRONT/src/app/plannings/plannings.ts',
 'FRONT/src/app/dashboard-home/dashboard-home.ts','FRONT/src/app/supervision-form/supervision-form.ts',sourcePath];
 for (const file of paths) {
  const sf=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true);
  assert.equal(sf.parseDiagnostics.length,0,file+': '+sf.parseDiagnostics.map(d=>d.messageText).join(', '));
 }
});
test('S9: effectifs de plusieurs classes additionnés une seule fois, inconnus signalés',()=>{
 const file='FRONT/src/app/shared/utils/supervision-class-attendance.ts';
 const output=ts.transpileModule(read(file),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 const module={exports:{}};new Function('module','exports',output)(module,module.exports);
 const calc=module.exports.combinedEnrollment;
 assert.deepEqual(calc([{id:'a',name:'MMA',effectif:34},{id:'b',name:'MAE',effectif:26}],['a','b','a']),{total:60,missing:[],names:['MMA','MAE']});
 assert.deepEqual(calc([{id:'a',name:'MMA',effectif:34},{id:'b',name:'MAE'}],['a','b']),{total:34,missing:['MAE'],names:['MMA','MAE']});
});
