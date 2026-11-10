'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const src=p=>fs.readFileSync(path.join(root,p),'utf8');
const ts=require(require.resolve('typescript',{paths:[path.join(root,'FRONT')]}));
const file=src('FRONT/src/app/shared/utils/academic-3b.ts');
const compiled=ts.transpileModule(file,{reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
assert.equal((compiled.diagnostics||[]).filter(e=>e.category===ts.DiagnosticCategory.Error).length,0);
const sandbox={exports:{},module:{exports:{}},Date,Set,Map,Math,Number,String,Array,Object,JSON,Error};sandbox.exports=sandbox.module.exports;
vm.runInNewContext(compiled.outputText,sandbox,{filename:'academic-3b.js'});
const {buildAcademicBoard,isExamPlanning,findDuplicateScheduledExam,sameAcademicExam}=sandbox.module.exports;
const today='2026-11-09';
const ue={id:'u-1',code:'MAT',name:'Mathématiques',academic3b:{required_sessions:2,class_ids:['c-1']}};
const classes=[{id:'c-1',name:'MAFIDA 1A'},{id:'c-2',name:'MAFIDA 1B'}];
const exam=(id='p-1',extras={})=>({id,ue_id:'u-1',classe_id:'c-1',date:'2026-11-12',start_time:'08:00',end_time:'10:00',status:'À superviser',session_type:'Examen',exam_session:'Session ordinaire',exam_period:'Phase 4',...extras});
const course=(id,date,status='À superviser')=>({id,ue_id:'u-1',classe_id:'c-1',date,status,session_type:'CM',start_time:'09:00'});
const board=(plannings,academic3b=ue.academic3b)=>buildAcademicBoard({ues:[{...ue,academic3b}],classes,plannings,today});

test('Examen typé : classification insensible aux accents, sans faux positifs',()=>{
 assert.equal(isExamPlanning(exam()),true);
 assert.equal(isExamPlanning(exam('x',{session_type:'EXAMEN'})),true);
 assert.equal(isExamPlanning(course('x','2026-11-12')),false);
});
test('Une épreuve programmée apparaît dans les examens 3B pour la classe et la session',()=>{
 const b=board([exam()]);assert.equal(b.rows.length,1);
 assert.equal(b.rows[0].exams.length,1);
 assert.equal(b.rows[0].exams[0].source,'planning');
 assert.equal(b.rows[0].exams[0].planning_id,'p-1');
 assert.equal(b.rows[0].exams[0].start_time,'08:00');
 assert.equal(b.upcomingExams.length,1);assert.equal(b.upcomingExams[0].exam.date,'2026-11-12');
 assert.equal(b.upcomingExams[0].exam.session,'Session ordinaire');
});
test('Examen supervisé et fiche associée : n’augmentent jamais la progression UE',()=>{
 const p=exam('p-1',{status:'Supervisé',date:'2026-11-01'});
 const b=buildAcademicBoard({ues:[ue],classes,plannings:[p],supervisions:[{planning_id:'p-1'}],today});
 assert.equal(b.rows[0].completed,0);assert.equal(b.rows[0].documented,0);
 assert.equal(b.rows[0].pendingLate,0);assert.equal(b.rows[0].scheduledFuture,0);
 assert.equal(b.rows[0].cancelled,0);assert.equal(b.rows[0].progress,0);
});
test('Cours réel reste comptabilisé à côté de l’examen',()=>{
 const b=board([exam(),course('c-1','2026-11-05','Supervisé')]);
 assert.equal(b.rows[0].completed,1);assert.equal(b.rows[0].progress,50);
 assert.equal(b.rows[0].scheduledFuture,0);assert.equal(b.rows[0].exams.length,1);
});
test('Examen annulé : disparaît de 3B sans gonfler les séances annulées',()=>{
 const b=board([exam('p',{status:'Annulé'})]);
 assert.equal(b.rows[0].exams.length,0);assert.equal(b.upcomingExams.length,0);
 assert.equal(b.rows[0].cancelled,0);
});
test('Examen déplacé : même identifiant, nouvelle date ; pas de duplication',()=>{
 const b=board([exam('p-1',{date:'2026-11-19'})]);
 assert.equal(b.upcomingExams.length,1);assert.equal(b.upcomingExams[0].exam.date,'2026-11-19');
});
test('Double source 3B + Planning identique : le Planning prévaut, une seule échéance',()=>{
 const manual={id:'m-1',date:'2026-11-12',session:'Normale',period:'Phase 4',class_id:'c-1'};
 const b=board([exam()],{required_sessions:2,class_ids:['c-1'],exams:[manual]});
 assert.equal(b.rows[0].exams.length,1);assert.equal(b.rows[0].exams[0].source,'planning');
 assert.equal(b.upcomingExams.length,1);
});
test('Examen manuel distinct : toujours disponible sans Planning',()=>{
 const b=board([],{required_sessions:2,class_ids:['c-1'],exams:[{id:'manual',date:'2026-11-14',session:'Rattrapage',class_id:'c-1'}]});
 assert.equal(b.upcomingExams.length,1);
 assert.equal(b.upcomingExams[0].exam.source,'manual');
});
test('Examen multi-classe : chaque classe affiche uniquement ses propres épreuves',()=>{
 const b=board([exam(),exam('p-2',{classe_id:'c-2',date:'2026-11-17'})],{required_sessions:2,class_ids:['c-1','c-2']});
 assert.equal(b.rows.length,2);
 assert.equal(b.rows.find(r=>r.class_id==='c-1').exams.length,1);
 assert.equal(b.rows.find(r=>r.class_id==='c-2').exams.length,1);
});
test('Examen historique sans UE : aucune attribution incertaine',()=>{
 const b=board([exam('old',{ue_id:null,ue_code:'NON_MATCH',title:'Exam'})]);
 assert.equal(b.upcomingExams.length,0);
});
test('Examen historique avec UE mais sans session : mention honnête',()=>{
 const b=board([exam('old',{exam_session:null})]);
 assert.equal(b.upcomingExams.length,1);
 assert.equal(b.upcomingExams[0].exam.session,'Session non précisée');
});
test('Doublon examen exact refusé ; annulation, édition du même ID et classe différente autorisées',()=>{
 const p=exam();
 assert.equal(findDuplicateScheduledExam(exam('p-2'),[p]).id,'p-1');
 assert.equal(findDuplicateScheduledExam(exam('p-1'),[p]),undefined);
 assert.equal(findDuplicateScheduledExam(exam('p-2'),[exam('p-1',{status:'Annulé'})]),undefined);
 assert.equal(findDuplicateScheduledExam(exam('p-2',{classe_id:'c-2'}),[p]),undefined);
 assert.equal(findDuplicateScheduledExam(exam('p-2',{date:'2026-11-13'}),[p]),undefined);
});
test('Annulation et changement de date recalculent la liste des examens',()=>{
 const orig=board([exam()]),cancel=board([exam('p-1',{status:'Annulé'})]),moved=board([exam('p-1',{date:'2026-11-28'})]);
 assert.equal(orig.upcomingExams.length,1);assert.equal(cancel.upcomingExams.length,0);
 assert.equal(moved.upcomingExams[0].exam.date,'2026-11-28');
});
test('Alertes 3B appliquées aux examens issus du Planning',()=>{
 const b=board([exam()]);
 assert.ok(b.alerts.some(a=>a.code==='EXAM_RISK'));
});
test('Source immuable : aucun plan ni paramétrage UE muté',()=>{
 const p=[exam()],config={...ue.academic3b}; const before=JSON.stringify({p,config});
 board(p,config);assert.equal(JSON.stringify({p,config}),before);
});
test('Formulaire Planning : UE, session requise, activité normale indépendante',()=>{
 const html=src('FRONT/src/app/plannings/plannings.html');
 const code=src('FRONT/src/app/plannings/plannings.ts');
 assert.match(html,/\*ngIf="!isActivityMode \|\| isExamMode"/);
 assert.match(html,/\*ngIf="isActivityMode && !isExamMode"/);
 assert.match(html,/\[\(ngModel\)\]="modalData.exam_session"/);
 assert.match(code,/this\.isExamMode && !this\.modalData\.exam_session/);
 assert.match(code,/const requiresUe = !this\.isActivityMode \|\| this\.isExamMode/);
});
test('Sécurité : transaction de verrouillage et doublon requis dans le Planning Service',()=>{
 const svc=src('FRONT/src/app/services/planning.service.ts');
 assert.match(svc,/findDuplicateScheduledExam\s*\(\s*candidate\s*,\s*others\.map\s*\(/);
 assert.match(svc,/runTransaction\(this\.firestore/);
 assert.match(svc,/t\.set\(guardRef/);
 assert.match(svc,/exam_session:p\.exam_session/);
});
test('3B : consultation du Planning sans copie persistée de ses examens dans les UE',()=>{
 const pilot=src('FRONT/src/app/academic-pilotage/academic-pilotage.ts');
 const board=src('FRONT/src/app/shared/utils/academic-3b.ts');
 assert.match(pilot,/plannedEditorExams/);
 assert.match(board,/const teachingPlans=deduped\.filter\(p=>!isExamPlanning\(p\)\)/);
 assert.doesNotMatch(src('FRONT/src/app/services/planning.service.ts'),/academic3b_revision/);
});


test('Sessions équivalentes : une seule épreuve par UE, classe, date et session',()=>{
 const a={id:'1',date:'2026-11-12',session:'Normale',period:'Phase 4',class_id:'c-1'};
 const b={id:'2',date:'2026-11-12',session:'Session ordinaire',period:'Phase 4',class_id:'c-1'};
 const c={...b,period:'Phase 5'};
 assert.equal(sameAcademicExam(a,b),true);assert.equal(sameAcademicExam(a,c),true);
});
test('Planning et paramétrage manuels divergents : alerte sans effacer une date',()=>{
 const b=board([exam()],{required_sessions:2,class_ids:['c-1'],exams:[{id:'manual',date:'2026-11-19',session:'Normale',period:'Phase 4',class_id:'c-1'}]});
 assert.equal(b.rows[0].exams.length,2);
 assert.ok(b.alerts.some(a=>a.code==='EXAM_SOURCE_MISMATCH'));
});


test('Examen lié : aucune fiche de supervision de cours proposée',()=>{
 const html=src('FRONT/src/app/plannings/plannings.html');
 const pl=src('FRONT/src/app/plannings/plannings.ts');
 assert.match(html,/plan\.session_type !== 'Examen'/);
 assert.match(pl,/if \(isExamPlanning\(planning\)\)/);
});
