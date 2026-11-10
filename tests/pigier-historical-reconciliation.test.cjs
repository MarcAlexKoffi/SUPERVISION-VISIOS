'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const {execFileSync} = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const dir = path.join(ROOT,'FRONT/src/app/shared/utils');
const temp = fs.mkdtempSync(path.join(os.tmpdir(),'pigier-historical-'));
process.on('exit',()=>fs.rmSync(temp,{recursive:true,force:true}));
const compiler = require.resolve('../FRONT/node_modules/typescript/bin/tsc');
execFileSync(process.execPath,[compiler,'--target','ES2022','--module','commonjs','--strict',
  '--skipLibCheck','--lib','ES2022,DOM','--outDir',temp,
  path.join(dir,'lot4-documents.ts'),path.join(dir,'pigier-honoraires-v2.ts'),
  path.join(dir,'pigier-honoraires-adapter.ts'),path.join(dir,'pigier-historical-match.ts')],
  {cwd:ROOT,stdio:'pipe'});
const m = require(path.join(temp,'pigier-historical-match.js'));
const a = require(path.join(temp,'pigier-honoraires-adapter.js'));
const e = require(path.join(temp,'pigier-honoraires-v2.js'));
const l = require(path.join(temp,'lot4-documents.js'));
const base = () => ({
  teachers:[{id:'t1',first_name:'Dramane',last_name:'Ouattara'},{id:'t2',first_name:'Fabrice',last_name:'Yao'}],
  ues:[{id:'u1',name:'Company life and global issues',code:'04ANG01M04'}, {id:'u2',name:'Anglais général',code:'04ANG01M02'}],
  classes:[{id:'c1',name:'MMA & MAE 1B'},{id:'c2',name:'MMA & MAE 1A'}],
  plannings:[{id:'p1',teacher_id:'t1',ue_id:'u1',classe_id:'c1',parcours:'MMA & MAE 1B',
    date:'2026-09-29',start_time:'19:00',end_time:'20:30',session_type:'CM',status:'Supervisé'}],
  supervisions:[{id:'f1',teacherId:'t1',ueId:'u1',module:'Company life and global issues',
    level:'MMA & MAE 1B',date:'2026-09-29',startTime:'19:00',endTime:'20:30'}],
  asyncSupervisions:[],filters:{teacher:'t1',ue:'u1',start:'2026-09-01',end:'2026-11-15'},
});
const clone = x => JSON.parse(JSON.stringify(x));
function run(x){
 const original=l.prepareLot4(x);
 const matched=m.findHistoricalMatches(x);
 const report=m.reconcileHistoricalReport(x,original,matched);
 const pdf=e.preparePigierOfficialHonoraires(a.buildPigierPlanningDraftInput(x,report,x.filters));
 return {original,matched,report,pdf};
}

test('une ancienne fiche correspondante devient attestee APRES passage du Planning a Supervise',()=>{
  const x=base();x.plannings[0].status='À superviser';
  let r=run(x);
  assert.equal(r.matched.byPlanningId.size,1);
  assert.equal(r.report.lines.length,1);
  assert.equal(r.report.eligible.length,0);
  assert.equal(r.pdf.totalVisios,0);
  assert.equal(r.pdf.provisional,true);
  x.plannings[0].status='Supervisé';
  r=run(x);
  assert.equal(r.original.lines.length,2);
  assert.equal(r.report.lines.length,1);
  assert.equal(r.report.review.length,0);
  assert.equal(r.report.eligible.length,1);
  assert.equal(r.pdf.totalVisios,1);
  assert.equal(r.pdf.rows[0].verified,true);
  assert.equal(r.pdf.rows[0].actualDuration,'1H30');
  assert.equal(r.pdf.rows[0].hours,'19h00-20h30');
  assert.equal(r.pdf.provisional,false);
  assert.equal(r.pdf.weeksDisplayed,7);
});

test('7 seances et 7 anciennes fiches correspondantes : 7 prestations, pas 14',()=>{
  const x=base();
  for(let i=2;i<=7;i++){
    const date=new Date(Date.UTC(2026,8,29+(i-1)*7)).toISOString().slice(0,10);
    x.plannings.push({...x.plannings[0],id:'p'+i,date});
    x.supervisions.push({...x.supervisions[0],id:'f'+i,date});
  }
  const r=run(x);
  assert.equal(r.original.lines.length,14);
  assert.equal(r.matched.byPlanningId.size,7);
  assert.equal(r.report.lines.length,7);
  assert.equal(r.report.eligible.length,7);
  assert.equal(r.pdf.totalVisios,7);
  assert.equal(r.pdf.rows.length,7);
});

test('ancien Planning sans classe_id : classe identifiee par libelle unique',()=>{
  const x=base();delete x.plannings[0].classe_id;
  const r=run(x);
  assert.equal(r.matched.byPlanningId.size,1);
  assert.equal(r.report.eligible.length,1);
  assert.equal(r.pdf.rows[0].verified,true);
  assert.equal(r.pdf.rows[0].classLabel,'MMA & MAE 1B');
});

test('ancienne fiche sans identifiants retrouvee par noms uniques',()=>{
  const x=base();delete x.supervisions[0].teacherId;delete x.supervisions[0].ueId;
  x.supervisions[0].teacherName='Dramane Ouattara';
  const r=run(x);
  assert.equal(r.matched.byPlanningId.size,1);
  assert.equal(r.report.eligible.length,1);
  assert.equal(r.pdf.totalVisios,1);
});

test('enseignant et UE du vieux Planning sans ID retrouves par referentiel unique',()=>{
  const x=base();
  delete x.plannings[0].teacher_id;delete x.plannings[0].ue_id;
  x.plannings[0].teacher_first_name='Dramane';x.plannings[0].teacher_last_name='Ouattara';
  x.plannings[0].ue_code='04ANG01M04';x.plannings[0].ue_name='Company life and global issues';
  const r=run(x);
  assert.equal(r.matched.byPlanningId.size,1);
  assert.equal(r.pdf.rows[0].verified,true);
});

test('deux seances candidates pour une fiche : aucune attribution',()=>{
  const x=base();x.plannings.push({...x.plannings[0],id:'p2'});
  const r=run(x);
  assert.equal(r.matched.byPlanningId.size,0);
  assert.equal(r.report.eligible.length,0);
  assert.equal(r.pdf.totalVisios,0);
});

test('deux fiches possibles pour une seance : aucune attribution',()=>{
  const x=base();x.supervisions.push({...x.supervisions[0],id:'f2'});
  const r=run(x);
  assert.equal(r.matched.byPlanningId.size,0);
  assert.equal(r.report.eligible.length,0);
});

test('une fiche explicitement liee a un autre planning n est jamais reassociee',()=>{
  const x=base();x.supervisions[0].planning_id='historique-introuvable';
  const r=run(x);assert.equal(r.matched.byPlanningId.size,0);assert.equal(r.report.eligible.length,0);
});

test('un planning possedant deja une reference de fiche n est jamais rapproche arbitrairement',()=>{
  const x=base();x.plannings[0].supervision_id='autre-fiche';
  const r=run(x);assert.equal(r.matched.byPlanningId.size,0);assert.equal(r.report.eligible.length,0);
});

test('des identifiants contradictoires bloquent meme si les libelles semblent identiques',()=>{
  const x=base();x.supervisions[0].teacherId='t2';
  assert.equal(run(x).matched.byPlanningId.size,0);
  x.supervisions[0].teacherId='t1';x.supervisions[0].ueId='u2';
  assert.equal(run(x).matched.byPlanningId.size,0);
  x.supervisions[0].ueId='u1';x.supervisions[0].classe_id='c2';
  assert.equal(run(x).matched.byPlanningId.size,0);
});

test('date differente bloque, horaires reels differents autorises',()=>{
  const x=base();x.supervisions[0].date='2026-09-30';
  assert.equal(run(x).matched.byPlanningId.size,0);
  x.supervisions[0].date='2026-09-29';x.supervisions[0].startTime='18:00';
  const r=run(x);
  assert.equal(r.matched.byPlanningId.size,1);
  assert.equal(r.report.eligible.length,1);
  assert.equal(r.pdf.rows[0].hours,'19h00-20h30');
  assert.equal(r.pdf.rows[0].actualDuration,'2H30');
});

test('classe homonyme du referentiel ne bloque pas une paire certaine',()=>{
  const x=base();x.classes.push({id:'c3',name:'MMA & MAE 1B'});
  assert.equal(run(x).matched.byPlanningId.size,1);
});

test('nom enseignant ou UE en doublon bloque la reconnaissance sans ID',()=>{
  const x=base();delete x.supervisions[0].teacherId;
  x.supervisions[0].teacherName='Dramane Ouattara';
  x.teachers.push({id:'t3',first_name:'Dramane',last_name:'Ouattara'});
  assert.equal(run(x).matched.byPlanningId.size,0);
  x.teachers.pop();delete x.supervisions[0].ueId;
  x.ues.push({id:'u3',code:'XYZ',name:'Company life and global issues'});
  assert.equal(run(x).matched.byPlanningId.size,0);
});

test('fiche sans horaires reels : eligibilite maintenue mais duree jamais inventee',()=>{
  const x=base();delete x.supervisions[0].endTime;
  const r=run(x);
  assert.equal(r.matched.byPlanningId.size,1);
  assert.equal(r.pdf.rows[0].verified,true);
  assert.equal(r.pdf.rows[0].actualDuration,'À vérifier');
  assert.equal(r.report.eligible.length,1);
});

test('seance annulee ou examen jamais rehabilite par une vieille fiche',()=>{
  const x=base();x.plannings[0].status='Annulé';assert.equal(run(x).matched.byPlanningId.size,0);
  x.plannings[0].status='Supervisé';x.plannings[0].session_type='Examen';
  assert.equal(run(x).matched.byPlanningId.size,0);
});

test('reconciliation en lecture seule : sources ET relevé original inchanges',()=>{
  const x=base(), snapshot=clone(x);const report=l.prepareLot4(x),reportCopy=clone(report);
  m.reconcileHistoricalReport(x,report);
  assert.deepEqual(x,snapshot);assert.deepEqual(report,reportCopy);
});

test('composant Angular utilise le releve rapproche pour la page et les exports',()=>{
  const code=fs.readFileSync(path.join(ROOT,'FRONT/src/app/honoraires/honoraires.ts'),'utf8');
  assert.match(code,/reconcileHistoricalReport\(this\.sources,rawReport,this\.historicalMatches,normalizedFilters\)/);
  assert.match(code,/buildPigierOfficialInput\(this\.sources,this\.report,this\.filters,this\.historicalMatches\)/);
  assert.match(code,/buildPigierPlanningDraftInput\(this\.sources,this\.report,this\.filters,this\.historicalMatches\)/);
  assert.doesNotMatch(code,/\bupdateDoc\(|\bsetDoc\(|\brunTransaction\(/);
});
