'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
function loadTs() {
  const locations=[path.join(root,'FRONT'), path.join(path.dirname(path.dirname(process.execPath)),'lib','node_modules')];
  for (const loc of locations) {
    try {return require(require.resolve('typescript',{paths:[loc]}));} catch {}
  }
  throw new Error('TypeScript non trouvé : installer les dépendances du frontend.');
}
const ts=loadTs();
const file=path.join(root,'FRONT/src/app/shared/utils/academic-3b.ts');
const source=fs.readFileSync(file,'utf8');
const out=ts.transpileModule(source,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
assert.ok(!(out.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error),'academic-3b.ts doit être syntaxiquement valide');
const env={exports:{},module:{exports:{}},Date,Set,Map,Math,Number,String,Array,Object,JSON,Error};
env.exports=env.module.exports;
vm.runInNewContext(out.outputText,env,{filename:'academic-3b-transpiled.js'});
const {buildAcademicBoard,isIsoDate,kitSummary,normalizedConfig,addIsoDays}=env.module.exports;
const t='2026-11-09';
const clazz=[{id:'c1',name:'MAFIDA 1A'},{id:'c2',name:'MAFIDA 1B'}];
const base={id:'ue1',code:'MATH',name:'Mathématiques',department:'MAFIDA',semester:'S1',phase:1,responsible:'Professeur X',responsible_id:'teacher-1',academic3b:{required_sessions:4,class_ids:['c1'],kit_items:[{key:'kit',label:'Support',required:true,status:'present'}]}};
const plan=(id,date,status='À superviser',classe_id='c1',ue_id='ue1')=>({id,ue_id,classe_id,date,status});
const board=(params={})=>buildAcademicBoard({ues:[base],classes:clazz,plannings:[],today:t,...params});

test('Dates ISO strictes et arithmétique année bissextile',()=>{
 assert.equal(isIsoDate('2026-02-29'),false);
 assert.equal(isIsoDate('2024-02-29'),true);
 assert.equal(isIsoDate('2026-13-10'),false);
 assert.equal(addIsoDays('2026-12-31',1),'2027-01-01');
});
test('Aucune activité sans UE ne gonfle les séances',()=>{
 const x=board({plannings:[{id:'a',date:t,status:'Supervisé',classe_id:'c1'}]});
 assert.equal(x.rows[0].completed,0);
});
test('Aucun objectif => progression inconnue, pas un faux 0/100 %',()=>{
 const x=board({ues:[{...base,academic3b:{}}]});
 assert.equal(x.rows[0].required,null); assert.equal(x.rows[0].progress,null);
 assert.equal(x.rows[0].status,'a_parametrer');
 assert.equal(x.phaseGroups[0].progress,null);
});
test('Séance annulée exclue des réalisées, planifiées et prévisions',()=>{
 const x=board({plannings:[plan('a','2026-11-10','Annulé'),plan('b','2026-11-12'),plan('c','2026-11-05','Supervisé')]});
 assert.equal(x.rows[0].completed,1);assert.equal(x.rows[0].cancelled,1);
 assert.equal(x.rows[0].scheduledFuture,1);assert.equal(x.rows[0].remaining,3);
 assert.equal(x.rows[0].forecastDate,null);
});
test('Supervision liée vaut preuve même si statut ancien reste À superviser',()=>{
 const x=board({plannings:[plan('one','2026-11-05')],supervisions:[{planning_id:'one'}]});
 assert.equal(x.rows[0].completed,1);assert.equal(x.rows[0].documented,1);
});
test('Séance supervisée et fiche liée ne sont jamais comptées deux fois',()=>{
 const x=board({plannings:[plan('a','2026-11-05','Supervisé')],supervisions:[{planning_id:'a'}]});
 assert.equal(x.rows[0].completed,1);
});
test('Reprogrammation avec même ID: une seule séance effective',()=>{
 const x=board({plannings:[plan('a','2026-11-05','Supervisé'),plan('a','2026-11-07','Supervisé')]});
 assert.equal(x.rows[0].completed,1);
});
test('Progression terminée à la cible, borne 100 %',()=>{
 const x=board({ues:[{...base,academic3b:{required_sessions:1,class_ids:['c1']}}],plannings:[plan('a','2026-11-02','Supervisé'),plan('b','2026-11-03','Supervisé')]});
 assert.equal(x.rows[0].status,'terminee');assert.equal(x.rows[0].progress,100);
});
test('Répartition stable de deux classes pour une même UE',()=>{
 const x=board({ues:[{...base,academic3b:{required_sessions:2,class_ids:['c1','c2']}}],plannings:[plan('a','2026-11-05','Supervisé','c1'),plan('b','2026-11-04','Supervisé','c2')]});
 assert.equal(x.rows.length,2);assert.equal(x.rows[0].completed,1);assert.equal(x.rows[1].completed,1);
 assert.ok(x.rows.every(r=>r.progress===50));
});
test('Héritage ue_code sans ID seulement si code non ambigu',()=>{
 const p={id:'legacy',ue_code:'math',classe_id:'c1',date:'2026-11-05',status:'Supervisé'};
 assert.equal(board({plannings:[p]}).rows[0].completed,1);
 const x=board({ues:[base,{...base,id:'other'}],plannings:[p]});
 assert.ok(x.rows.every(r=>r.completed===0));
});
test('Calendrier futur complet => dernière séance projetée, sans estimation inventée',()=>{
 const x=board({ues:[{...base,academic3b:{required_sessions:2,class_ids:['c1']}}],plannings:[plan('a','2026-11-10'),plan('b','2026-11-15')]});
 assert.equal(x.rows[0].forecastDate,'2026-11-15');assert.equal(x.rows[0].forecastSource,'planned');
});
test('Cadence explicitement renseignée => estimation si programmation incomplète',()=>{
 const x=board({ues:[{...base,academic3b:{required_sessions:3,class_ids:['c1'],cadence_per_week:1}}],plannings:[plan('a','2026-11-10')]});
 assert.equal(x.rows[0].forecastDate,'2026-11-24');assert.equal(x.rows[0].forecastSource,'estimated');
});
test('Examens par classe, sessions et risques sous 14 jours',()=>{
 const cfg={required_sessions:4,class_ids:['c1','c2'],exams:[
  {id:'1',date:'2026-11-14',session:'Normale',class_id:'c1'},
  {id:'2',date:'2026-12-10',session:'Rattrapage',class_id:'c2'}]};
 const x=board({ues:[{...base,academic3b:cfg}]});
 assert.equal(x.upcomingExams.length,1);
 assert.equal(x.upcomingExams[0].class_name,'MAFIDA 1A');
 assert.equal(x.alerts.filter(a=>a.code==='EXAM_RISK').length,1);
});
test('Fin prévisionnelle phase/semestre inconnue si une UE manque de paramètres',()=>{
 const x=board({ues:[base,{...base,id:'ue2',code:'ECO',academic3b:{class_ids:['c1']}}]});
 assert.equal(x.phaseGroups.length,1);
 assert.equal(x.phaseGroups[0].progress,null);assert.equal(x.semesterGroups[0].forecastDate,null);
});
test('Kits: complet, absent, incomplet, non renseigné sans faux positifs',()=>{
 const item=status=>[{key:'a',label:'A',required:true,status}];
 assert.equal(kitSummary(item('present')),'complet');
 assert.equal(kitSummary(item('missing')),'manquant');
 assert.equal(kitSummary(item('incomplete')),'incomplet');
 assert.equal(kitSummary(item('unknown')),'a_renseigner');
});
test('UE sans enseignant, non planifiée et dossier inconnu => alertes distinctes',()=>{
 const x=board({ues:[{...base,responsible:'',responsible_id:null}]});
 assert.ok(x.alerts.some(a=>a.code==='NO_TEACHER'));
 assert.ok(x.alerts.some(a=>a.code==='UNPROGRAMMED'));
});
test('Le moteur ne modifie jamais les documents source Firestore',()=>{
 const ue=structuredClone(base),plans=[plan('a','2026-11-05','Supervisé')];
 const before=JSON.stringify({ue,plans});
 buildAcademicBoard({ues:[ue],plannings:plans,classes:clazz,today:t});
 assert.equal(JSON.stringify({ue,plans}),before);
});
test('Validation et normalisation des formulaires anciens/incomplets',()=>{
 const x=normalizedConfig({required_sessions:0,exams:[{id:'x',date:'2026-02-29',session:'X'}]});
 assert.equal(x.required_sessions,null);assert.equal(x.exams.length,0);
 assert.ok(x.kit_items.length>=1);
 assert.equal(normalizedConfig({cadence_per_week:0.05}).cadence_per_week,null,'Une cadence inferieure au minimum est rejetee');
 const emptied=normalizedConfig({kit_items:[]});
 assert.equal(emptied.kit_items.length,0,'Une liste de kit explicitement vide reste vide');
 assert.equal(kitSummary(emptied.kit_items),'a_renseigner');
});
test('Branchement Angular, sauvegarde additive et garde admin contrôlés structurellement',()=>{
 const read=p=>fs.readFileSync(path.join(root,'FRONT/src/app',p),'utf8');
 assert.match(read('app.routes.ts'),/pilotage-academique/);
 assert.match(read('admindashboard/admindashboard.html'),/Pilotage académique/);
 assert.match(read('dashboard-home/dashboard-home.html'),/dashboard3bBoard/);
 assert.match(read('dashboard-home/dashboard-home.ts'),/this.dashboardClasses = classes;\s*this.updateAcademicPreview\(\);/);
 assert.match(read('services/academic-tracking.service.ts'),/runTransaction/);
 assert.match(read('services/academic-tracking.service.ts'),/academic3b_revision/);
 assert.match(read('guards/academic-admin.guard.ts'),/admin/);
 assert.doesNotMatch(read('services/academic-tracking.service.ts'),/deleteDoc|setDoc/);
});

test('Examen dépassé depuis moins de 30 jours alerte sans l’inventer comme examen futur',()=>{
 const cfg={required_sessions:2,class_ids:['c1'],exams:[{id:'old',date:'2026-11-01',session:'Ordinaire'}]};
 const x=board({ues:[{...base,academic3b:cfg}]});
 assert.ok(x.alerts.some(a=>a.code==='EXAM_PASSED'));
 assert.equal(x.upcomingExams.length,0);
});
test('Retard de séances >14 jours et date cible dépassée sont distincts',()=>{
 const x=board({ues:[{...base,academic3b:{required_sessions:3,class_ids:['c1'],target_end_date:'2026-11-02'}}],plannings:[plan('late','2026-10-05')]});
 assert.ok(x.alerts.some(a=>a.code==='MAJOR_DELAY'));
 assert.ok(x.alerts.some(a=>a.code==='DEADLINE_MISSED'));
});
test('Kit partiellement renseigné et élément explicitement manquant => incomplet',()=>{
 assert.equal(kitSummary([
  {key:'a',label:'A',required:true,status:'present'},
  {key:'b',label:'B',required:true,status:'missing'},
  {key:'c',label:'C',required:true,status:'unknown'}]),'incomplet');
});
test('Formulaire UE classique ne réécrit pas les métadonnées 3B concurrentes',()=>{
 const src=fs.readFileSync(path.join(root,'FRONT/src/app/services/ue.service.ts'),'utf8');
 assert.match(src,/academic3b: _tracking/);
 assert.match(src,/academic3b_revision: _revision/);
 assert.match(src,/updateDoc\(docRef, businessFields\)/);
});
test('Deux classes homonymes ne sont pas rapprochées par un nom ambigu',()=>{
 const x=board({ues:[{...base,academic3b:{required_sessions:1}}],
   classes:[{id:'c1',name:'L1'},{id:'c2',name:'L1'}],
   plannings:[{id:'legacy',ue_id:'ue1',parcours:'L1',date:'2026-11-08',status:'Supervisé'}]});
 assert.equal(x.rows.length,1);
 assert.equal(x.rows[0].class_id,null);
 assert.equal(x.rows[0].completed,1);
});
