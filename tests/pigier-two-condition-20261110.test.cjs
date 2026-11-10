'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const src=path.join(ROOT,'FRONT/src/app/shared/utils');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'honoraires-rule-'));
process.on('exit',()=>fs.rmSync(scratch,{recursive:true,force:true}));
const compiler=require.resolve('../FRONT/node_modules/typescript/bin/tsc');
execFileSync(process.execPath,[compiler,'--target','ES2022','--module','commonjs','--strict',
  '--skipLibCheck','--lib','ES2022,DOM','--outDir',scratch,
  ...['lot4-documents.ts','pigier-honoraires-v2.ts','pigier-historical-match.ts',
     'pigier-honoraires-adapter.ts'].map(x=>path.join(src,x))],{cwd:ROOT,stdio:'pipe'});
const {prepareLot4}=require(path.join(scratch,'lot4-documents.js'));
const {findHistoricalMatches,reconcileHistoricalReport}=require(path.join(scratch,'pigier-historical-match.js'));
const {buildPigierOfficialInput,buildPigierPlanningDraftInput}=require(path.join(scratch,'pigier-honoraires-adapter.js'));
const {preparePigierOfficialHonoraires}=require(path.join(scratch,'pigier-honoraires-v2.js'));
const fixture=()=>({
  teachers:[{id:'t1',first_name:'Dramane',last_name:'Ouattara'}, {id:'t2',first_name:'Eva',last_name:'Koné'}],
  ues:[{id:'u1',code:'04ANG01M04',name:'Company life and global issues'},
       {id:'u2',code:'04ANG02M04',name:'MANAGEMENT THEORIES, STRATEGIES AND TOOLS'}],
  classes:[{id:'c1',name:'MMA & MAE 1B'},{id:'c2',name:'MAE 1A'}],
  plannings:[{id:'p1',teacher_id:'t1',ue_id:'u1',classe_id:'c1',parcours:'MMA & MAE 1B',
    date:'2026-09-29',start_time:'19:00',end_time:'20:30',session_type:'CM',status:'Supervisé'}],
  supervisions:[{id:'s1',teacherId:'t1',ueId:'u1',date:'2026-09-29',
    module:'Company life and global issues',level:'MMA & MAE 1B',startTime:'19:30',endTime:'20:30'}],
  asyncSupervisions:[],
  filters:{teacher:'t1',ue:'u1',start:'2026-09-01',end:'2026-11-30'},
});
function calc(s,manual=new Map()){
 const snapshot=structuredClone(s);
 const matches=findHistoricalMatches(s,manual);
 const raw=prepareLot4({...s,filters:{}});
 const report=reconcileHistoricalReport(s,raw,matches,s.filters);
 const pdf=preparePigierOfficialHonoraires(buildPigierPlanningDraftInput(s,report,s.filters,matches));
 assert.deepEqual(s,snapshot,'sources immuables');
 return {matches,raw,report,pdf};
}
test('7 visios historiques supervisées + 7 fiches enregistrées = 7 attestées (jamais 14)',()=>{
 const s=fixture();
 for(let i=1;i<7;i++){
  const date=new Date(Date.UTC(2026,8,29+7*i)).toISOString().slice(0,10);
  s.plannings.push({...s.plannings[0],id:`p${i+1}`,date});
  s.supervisions.push({...s.supervisions[0],id:`s${i+1}`,date});
 }
 const r=calc(s);
 assert.equal(r.raw.lines.length,14);
 assert.equal(r.report.lines.length,7);
 assert.equal(r.report.eligible.length,7);
 assert.equal(r.pdf.totalVisios,7);
 assert.equal(r.pdf.rows.length,7);
 assert.equal(r.pdf.provisional,false);
 assert.equal(r.pdf.weeksDisplayed,7);
 assert.equal(r.pdf.rows[0].hours,'19h00-20h30');
 assert.equal(r.pdf.rows[0].actualDuration,'1H00');
 assert.match(r.pdf.filename,/Dramane_Ouattara/);
});
test('anciens classe_id manquant et UE/enseignant avec noms gardent la prestation eligible',()=>{
 const s=fixture();delete s.plannings[0].classe_id;delete s.supervisions[0].ueId;
 delete s.supervisions[0].teacherId;s.supervisions[0].teacherName='Dramane Ouattara';
 const r=calc(s);
 assert.equal(r.report.eligible.length,1);
 assert.equal(r.pdf.totalVisios,1);
 assert.equal(r.pdf.rows[0].classLabel,'MMA & MAE 1B');
});
test('UE Management 04ANG02M04 reste identifiable sans UE ID de fiche',()=>{
 const s=fixture();s.plannings[0].ue_id='u2';s.plannings[0].ue_code='04ANG02M04';
 s.plannings[0].ue_name='MANAGEMENT THEORIES, STRATEGIES AND TOOLS';
 delete s.plannings[0].classe_id;
 s.supervisions[0].module='04ANG02M04 — MANAGEMENT THEORIES, STRATEGIES AND TOOLS';
 delete s.supervisions[0].ueId;s.filters.ue='u2';
 const r=calc(s);
 assert.equal(r.report.eligible.length,1);
 assert.equal(r.pdf.totalVisios,1);
});
test('ID referentiel ancien introuvable mais identite nom/code unique reconnue',()=>{
 const s=fixture();s.plannings[0].teacher_id='ancien-t1';
 s.plannings[0].teacher_first_name='Dramane';s.plannings[0].teacher_last_name='Ouattara';
 s.plannings[0].ue_id='ancienne-u1';s.plannings[0].ue_code='04ANG01M04';
 s.plannings[0].ue_name='Company life and global issues';
 s.supervisions[0].teacherId='ancien-t1';s.supervisions[0].ueId='ancienne-u1';
 assert.equal(calc(s).pdf.totalVisios,1);
});
test('différence horaires 19h00 versus 19h30 n invalide pas la fiche',()=>{
 const r=calc(fixture());
 assert.equal(r.pdf.totalVisios,1);
 assert.equal(r.pdf.rows[0].hours,'19h00-20h30');
 assert.equal(r.pdf.rows[0].actualDuration,'1H00');
 assert.match(r.report.eligible[0].reason,/ecart horaire/);
});
test('absence de classe ou session_type n ajoute pas de condition bloquante',()=>{
 const s=fixture();delete s.plannings[0].classe_id;
 delete s.plannings[0].parcours;delete s.plannings[0].session_type;
 delete s.supervisions[0].level;
 const r=calc(s);assert.equal(r.pdf.totalVisios,1);
 assert.equal(r.pdf.rows[0].classLabel,'À renseigner');
 assert.equal(r.pdf.rows[0].activityType,'À renseigner');
});
test('duree inconnue : 1 prestation, mais jamais de duree planifiee inventee',()=>{
 const s=fixture();delete s.supervisions[0].endTime;s.supervisions[0].duration=90;
 const r=calc(s);
 assert.equal(r.report.totalSyncCount,1);
 assert.equal(r.report.totalSyncMinutes,0);
 assert.equal(r.report.eligible[0].durationMinutes,null);
 assert.equal(r.pdf.totalVisios,1);
 assert.equal(r.pdf.rows[0].actualDuration,'À vérifier');
});
test('Planning supervise sans fiche, 0 prestation attestee',()=>{
 const s=fixture();s.supervisions=[];
 const r=calc(s);assert.equal(r.report.eligible.length,0);
 assert.equal(r.pdf.totalVisios,0);assert.equal(r.pdf.provisional,true);
});
test('fiche seule sans planning, 0 prestation attestee',()=>{
 const s=fixture();s.plannings=[];
 const r=calc(s);assert.equal(r.report.eligible.length,0);
 assert.equal(r.pdf.totalVisios,0);
});
test('Planning non supervise avec fiche, 0 prestation attestee',()=>{
 const s=fixture();s.plannings[0].status='À superviser';
 const r=calc(s);assert.equal(r.report.eligible.length,0);
 assert.equal(r.pdf.totalVisios,0);
});
test('Planning annule ou examen, toujours exclu',()=>{
 const s=fixture();s.plannings[0].status='Annulé';
 assert.equal(calc(s).report.eligible.length,0);
 s.plannings[0].status='Supervisé';s.plannings[0].session_type='Évaluation finale';
 assert.equal(calc(s).report.eligible.length,0);
});
test('conflit ID enseignant/UE ou date explicite rejete meme si libelles correspondent',()=>{
 const s=fixture();s.supervisions[0].teacherId='t2';
 assert.equal(calc(s).report.eligible.length,0);
 s.supervisions[0].teacherId='t1';s.supervisions[0].ueId='u2';
 assert.equal(calc(s).report.eligible.length,0);
 s.supervisions[0].ueId='u1';s.supervisions[0].date='2026-09-30';
 assert.equal(calc(s).report.eligible.length,0);
});
test('2 fiches candidates => pas de rapprochement arbitraire',()=>{
 const s=fixture();s.supervisions.push({...s.supervisions[0],id:'s2'});
 const r=calc(s);
 assert.equal(r.report.eligible.length,0);
 assert.equal(r.matches.ambiguousByPlanningId.get('p1').length,2);
});
test('2 seances candidates pour une fiche => jamais de double comptage',()=>{
 const s=fixture();s.plannings.push({...s.plannings[0],id:'p2'});
 const r=calc(s);
 assert.equal(r.report.eligible.length,0);
 assert.equal(r.matches.ambiguousByPlanningId.size,2);
});
test('choix manuel explicite sur une paire ambigue => 1 seule attestation',()=>{
 const s=fixture();s.plannings.push({...s.plannings[0],id:'p2'});
 const r=calc(s,new Map([['p2','s1']]));
 assert.equal(r.report.eligible.length,1);
 assert.equal(r.report.eligible[0].planningId,'p2');
 assert.equal(r.report.lines.length,2);
 assert.equal(r.pdf.totalVisios,1);
});
test('choix manuel ne peut pas forcer un autre professeur, une autre date ou une autre UE',()=>{
 const s=fixture();s.supervisions[0].teacherId='t2';
 assert.equal(calc(s,new Map([['p1','s1']])).report.eligible.length,0);
 s.supervisions[0].teacherId='t1';s.supervisions[0].date='2026-09-30';
 assert.equal(calc(s,new Map([['p1','s1']])).report.eligible.length,0);
});
test('deux choix manuels vers la meme fiche ne generent jamais deux prestations',()=>{
 const s=fixture();s.plannings.push({...s.plannings[0],id:'p2'});
 const r=calc(s,new Map([['p1','s1'],['p2','s1']]));
 assert.equal(r.report.eligible.length,1);
 assert.equal(r.pdf.totalVisios,1);
});
test('fiche liee explicitement a un autre Planning ne sert pas en historique',()=>{
 const s=fixture();s.supervisions[0].planning_id='autre-planning';
 assert.equal(calc(s).report.eligible.length,0);
});
test('une liaison valide officielle n exige pas les horaires egaux',()=>{
 const s=fixture();s.plannings[0].supervision_id='s1';s.supervisions[0].planning_id='p1';
 const r=calc(s);assert.equal(r.report.eligible.length,1);
 assert.equal(r.pdf.rows[0].actualDuration,'1H00');
});
test('identifiants de classes contradictoires et valides interdisent association',()=>{
 const s=fixture();s.supervisions[0].classe_id='c2';
 assert.equal(calc(s).report.eligible.length,0);
});
test('aucune mutation Firestore / action distante dans modules de rapproch.',()=>{
 const content=fs.readFileSync(path.join(src,'pigier-historical-match.ts'),'utf8')+
  fs.readFileSync(path.join(src,'pigier-honoraires-adapter.ts'),'utf8');
 assert.doesNotMatch(content,/@angular\/fire|updateDoc\(|setDoc\(|addDoc\(|deleteDoc\(|runTransaction\(/);
});

test('fiche officielle avec 7 seances attestées + 1 plan sans fiche ne devient jamais PROVISOIRE',()=>{
 const s=fixture();
 for(let i=1;i<7;i++){
  const date=new Date(Date.UTC(2026,8,29+7*i)).toISOString().slice(0,10);
  s.plannings.push({...s.plannings[0],id:`p${i+1}`,date});
  s.supervisions.push({...s.supervisions[0],id:`s${i+1}`,date});
 }
 s.plannings.push({...s.plannings[0],id:'p8',date:'2026-11-11',supervision_id:null});
 const matches=findHistoricalMatches(s);
 const report=reconcileHistoricalReport(s,prepareLot4({...s,filters:{}}),matches,s.filters);
 const onlyAttested=buildPigierOfficialInput(s,report,s.filters,matches);
 const official=preparePigierOfficialHonoraires(onlyAttested);
 const draft=preparePigierOfficialHonoraires(buildPigierPlanningDraftInput(s,report,s.filters,matches));
 assert.equal(report.eligible.length,7);
 assert.equal(report.review.length,1);
 assert.equal(official.rows.length,7);
 assert.equal(official.totalVisios,7);
 assert.equal(official.provisional,false);
 assert.equal(draft.rows.length,8);
 assert.equal(draft.provisional,true);
 const component=fs.readFileSync(path.join(ROOT,'FRONT/src/app/honoraires/honoraires.ts'),'utf8');
 assert.match(component,/attested\.sessions\.length\) return attested/);
 assert.match(component,/const input=this\.selectedPigierInput\(\)/);
});
