'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'lot4-engine-'));

execFileSync(process.execPath, [
  require.resolve('../FRONT/node_modules/typescript/bin/tsc'),
'--target','ES2022','--module','commonjs','--strict','--skipLibCheck','--lib','ES2022,DOM',
  '--outDir',tmp,'FRONT/src/app/shared/utils/lot4-documents.ts'],{cwd:ROOT,stdio:'pipe'});
const m=require(path.join(tmp,'lot4-documents.js'));
const source=fs.readFileSync(path.join(ROOT,'FRONT/src/app/services/supervision.service.ts'),'utf8');
const component=fs.readFileSync(path.join(ROOT,'FRONT/src/app/supervision-form/supervision-form.ts'),'utf8');
const view=fs.readFileSync(path.join(ROOT,'FRONT/src/app/honoraires/honoraires.html'),'utf8');
const pdf=fs.readFileSync(path.join(ROOT,'FRONT/src/app/shared/utils/lot4-pdf.ts'),'utf8');
const base=()=>({
  teachers:[{id:'t1',first_name:'Paul',last_name:'KOFFI'}],ues:[{id:'u1',code:'INF101',name:'Informatique'}],
  classes:[{id:'c1',name:'L1 A'}],
  plannings:[{id:'p1',date:'2026-11-09',start_time:'09:00',end_time:'10:30',teacher_id:'t1',ue_id:'u1',
   classe_id:'c1',parcours:'L1 A',status:'Supervisé',session_type:'CM',supervision_id:'s1'}],
  supervisions:[{id:'s1',planning_id:'p1',teacherId:'t1',ueId:'u1',date:'2026-11-09',startTime:'09:00',endTime:'10:30'}],
  asyncSupervisions:[],filters:{teacher:'t1',start:'2026-11-01',end:'2026-11-30'}
});
const copy=x=>JSON.parse(JSON.stringify(x));
test('séance reliée : identité, UE, classe, date et horaires sont préremplis',()=>{
 const result=m.prepareLot4(base());assert.equal(result.eligible.length,1);
 const [line]=result.eligible;assert.equal(line.teacherName,'Paul KOFFI');assert.equal(line.ueName,'Informatique');
 assert.equal(line.className,'L1 A');assert.equal(line.date,'2026-11-09');assert.equal(line.startTime,'09:00');
 assert.equal(line.endTime,'10:30');assert.equal(line.durationMinutes,90);assert.equal(result.totalSyncMinutes,90);
});
test('séance exclue lorsque annulée',()=>{const b=base();b.plannings[0].status='Annulé';const r=m.prepareLot4(b);assert.equal(r.totalSyncCount,0);assert.equal(r.excluded.length,1);});
test('statut Supervisé sans fiche liée ne vaut pas preuve',()=>{const b=base();b.supervisions=[];b.plannings[0].supervision_id=null;const r=m.prepareLot4(b);assert.equal(r.totalSyncCount,0);assert.equal(r.review.length,1);});
test('une fiche et une séance liées ne sont jamais payées deux fois',()=>{const r=m.prepareLot4(base());assert.equal(r.lines.length,1);assert.equal(r.totalSyncCount,1);});
test('deux fiches associées à la même séance sont bloquées',()=>{const b=base();b.supervisions.push({...b.supervisions[0],id:'s2'});const r=m.prepareLot4(b);assert.equal(r.totalSyncCount,0);assert.equal(r.review.length,1);});
test('une ancienne fiche orpheline est visible mais pas éligible',()=>{const b=base();b.supervisions.push({id:'old',teacherId:'t1',ueId:'u1',date:'2026-11-10',startTime:'10:00',endTime:'11:00'});const r=m.prepareLot4(b);assert.equal(r.totalSyncCount,1);assert.equal(r.review.length,1);});
test('l’examen ne compte jamais comme une visio rémunérée',()=>{const b=base();b.plannings[0].session_type='Examen';const r=m.prepareLot4(b);assert.equal(r.totalSyncCount,0);assert.equal(r.review[0].kind,'evaluation');});
test('une activité non liée à une UE est exclue',()=>{const b=base();b.plannings[0].ue_id=null;b.plannings[0].title='Reunion';const r=m.prepareLot4(b);assert.equal(r.totalSyncCount,0);});
test('une séance à statut ancien non supervisé reste à régulariser',()=>{const b=base();b.plannings[0].status='À superviser';const r=m.prepareLot4(b);assert.equal(r.totalSyncCount,0);assert.equal(r.review.length,1);});
test('les dates et horaires invalides sont signalés, jamais fabriqués',()=>{
 assert.equal(m.sessionMinutes('14:00','13:00'),null);assert.equal(m.sessionMinutes('24:00','25:00'),null);
 assert.equal(m.sessionMinutes('09:10','10:40'),90);const b=base();b.plannings[0].end_time='08:00';
 b.supervisions[0].endTime='08:00';assert.equal(m.prepareLot4(b).eligible.length,0);
});
test('période asynchrone explicite et texte historique sont interprétés',()=>{
 assert.deepEqual(m.asyncPeriod({start_date:'2026-11-02',end_date:'2026-11-08'}),{start:'2026-11-02',end:'2026-11-08'});
 assert.deepEqual(m.asyncPeriod({week:'Semaine du 02/11/2026 au 08/11/2026'}),{start:'2026-11-02',end:'2026-11-08'});
 assert.equal(m.asyncPeriod({week:'Semaine libre'}),null);
});
test('prestations asynchrones Réalisé : un seul forfait par période/UE/classe',()=>{
 const b=base();b.asyncSupervisions=[{id:'a1',teacherId:'t1',ueId:'u1',classe:'L1 A',week:'Semaine du 02/11/2026 au 08/11/2026',status:'Réalisé'},
 {id:'a2',teacherId:'t1',ueId:'u1',classe:'L1 A',week:'Semaine du 02/11/2026 au 08/11/2026',status:'Réalisé'}];
 const r=m.prepareLot4(b);assert.equal(r.totalAsyncCount,1);assert.equal(r.review.filter(x=>x.kind==='asynchrone').length,1);
});
test('suivi asynchrone non réalisé est exclu',()=>{const b=base();b.asyncSupervisions=[{id:'a1',teacherId:'t1',ueId:'u1',classe:'L1 A',start_date:'2026-11-01',end_date:'2026-11-06',status:'Non réalisé'}];assert.equal(m.prepareLot4(b).totalAsyncCount,0);});
test('filtrage période inclusif et enseignant distinct',()=>{const b=base();b.filters={teacher:'t2',start:'2026-11-09',end:'2026-11-09'};assert.equal(m.prepareLot4(b).lines.length,0);b.filters.teacher='t1';assert.equal(m.prepareLot4(b).lines.length,1);});
test('aucune entrée ne mute les originaux Firestore',()=>{const b=base(),snapshot=copy(b);m.prepareLot4(b);assert.deepEqual(b,snapshot);});
test('aucun tarif validé => aucun montant, même lorsque des séances sont éligibles',()=>{const r=m.prepareLot4(base());const a=m.approvedAmounts(r);assert.equal(a.payable,false);assert.equal(a.totalFcfa,null);});
test('tarifs partiels ou anomalies bloquent le paiement',()=>{const r=m.prepareLot4(base());assert.equal(m.approvedAmounts(r,{approved:true,reference:'2026',roundingMinutes:15,roundingMode:'up'}).payable,false);
 const b=base();b.supervisions.push({id:'orphan',teacherId:'t1',ueId:'u1',date:'2026-11-15'});assert.equal(m.approvedAmounts(m.prepareLot4(b),{approved:true,reference:'2026',hourlyFcfa:3000,roundingMinutes:15,roundingMode:'up'}).payable,false);
});
test('arrondi du total en minutes, jamais à chaque ligne',()=>{
 const b=base();b.plannings[0].end_time='10:22';b.supervisions[0].endTime='10:22';
 const r=m.prepareLot4(b);const a=m.approvedAmounts(r,{approved:true,reference:'Tarif test',hourlyFcfa:3000,roundingMinutes:15,roundingMode:'up'});
 assert.equal(a.roundedMinutes,90);assert.equal(a.totalFcfa,4500);assert.equal(a.payable,true);
});
test('composant AURA: table réelle, deux PDF, anomalies et interdiction tarifs inventés',()=>{
 assert.match(view,/\*ngFor="let line of rows"/);assert.match(view,/exportPdf\('fiche'\)/);assert.match(view,/exportPdf\('releve'\)/);
 assert.match(pdf,/lastAutoTable/);assert.match(pdf,/getNumberOfPages/);assert.match(pdf,/Modèle officiel et barèmes à valider/);
});
test('l’association transactionnelle garde le statut Supervisé à la création liée',()=>{
 assert.match(source,/runTransaction\(this\.firestore/);assert.match(source,/status:'Supervisé'/);
 assert.match(source,/supervision_id:supervisionRef\.id/);assert.match(source,/planning\.data\(\)\['supervision_id'\]/);
 assert.match(component,/planning_id:this\.linkedPlanningId/);
});
test('l’ancienne fiche isolée ne modifie pas une séance arbitraire',()=>{
 assert.match(source,/if \(!newData\.planning_id\) return from\(addDoc/);
});
test('réenregistrer une fiche liée synchronise à nouveau le statut dans une transaction',()=>{
  assert.match(source,/update\(id: string, data: any\)/);
  assert.match(source,/existing\.data\(\)\['planning_id'\]/);
  assert.match(source,/tx\.update\(planningRef,\{supervision_id:id,status:'Supervisé'/);
  assert.match(source,/validatePlanningRelation\(fields,planning\.data\(\)\)/);
});
test('une nouvelle fiche liée valide le même enseignant, UE et date',()=>{
  assert.match(source,/this\.validatePlanningRelation\(newData, planning\.data\(\)\)/);
  assert.match(source,/form\.teacherId/);assert.match(source,/form\.ueId/);
});
test('deux classes homonymes sans ID rendent le forfait asynchrone incertain',()=>{
 const b=base();b.classes.push({id:'c2',name:'L1 A'});
 b.asyncSupervisions=[{id:'a5',teacherId:'t1',ueId:'u1',classe:'L1 A',start_date:'2026-11-02',end_date:'2026-11-08',status:'Réalisé'}];
 const result=m.prepareLot4(b);assert.equal(result.totalAsyncCount,0);assert.equal(result.review.find(l=>l.id==='async:a5')?.reason,'Plusieurs classes portent le même nom');
});
test('les références académiques devenues introuvables bloquent le relevé payable',()=>{
 const b=base();b.ues=[];const r=m.prepareLot4(b);
 assert.equal(r.totalSyncCount,0);assert.equal(r.review.length,1);
});
