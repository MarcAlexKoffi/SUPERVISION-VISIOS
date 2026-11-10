'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'FRONT/src/app/shared/utils');
const tsc = path.join(root, 'FRONT/node_modules/typescript/bin/tsc');
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'pigier-v2-test-'));
try {
  if (!fs.existsSync(tsc)) throw new Error('TypeScript local absent : installer les dependances du FRONT avant les tests.');
  execFileSync(process.execPath, [tsc,
    '--target', 'ES2022','--module', 'commonjs','--strict','--skipLibCheck',
    '--lib','ES2022,DOM','--outDir',scratch,'--rootDir',src,
    path.join(src,'lot4-documents.ts'),
    path.join(src,'pigier-honoraires-v2.ts'),
    path.join(src,'pigier-honoraires-adapter.ts'),
  ],{cwd:root,stdio:'pipe'});
} catch (err) {
  fs.rmSync(scratch,{recursive:true,force:true});
  throw err;
}
const lot4 = require(path.join(scratch, 'lot4-documents.js'));
const bridge = require(path.join(scratch, 'pigier-honoraires-adapter.js'));
const engine = require(path.join(scratch, 'pigier-honoraires-v2.js'));
process.on('exit',()=>fs.rmSync(scratch,{recursive:true,force:true}));

function fixture() {
  return {
    teachers:[{id:'t1',first_name:'Franck',last_name:'GACHA',matricule:'P-123'}, {id:'t2',first_name:'Rose',last_name:'KONE'}],
    ues:[{id:'u1',name:'Méthodologie de recherche et rédaction scientifique',code:'METH'}, {id:'u2',name:'Anglais des affaires',code:'ANG'}],
    classes:[{id:'c1',name:'Master 1 MAE'}, {id:'c2',name:'Master 1 MMA'}],
    plannings:[{
      id:'p1',teacher_id:'t1',ue_id:'u1',classe_id:'c1',date:'2026-07-07',
      start_time:'19:00',end_time:'20:30',status:'Supervisé',session_type:'Cours en visioconférence',supervision_id:'f1',
    }],
    supervisions:[{id:'f1',planning_id:'p1',teacherId:'t1',ueId:'u1',date:'2026-07-07',startTime:'19:00',endTime:'20:30'}],
    asyncSupervisions:[],
    filters:{teacher:'t1',ue:'u1',start:'2026-07-01',end:'2026-07-31'},
  };
}
function mapped(b) {
  const report=lot4.prepareLot4(b);
  const input=bridge.buildPigierOfficialInput(b,report,b.filters);
  return {report,input,document:engine.preparePigierOfficialHonoraires(input)};
}

test('raccordement reel : classe, type, professeur, UE, periode, matricule',()=>{
  const a=mapped(fixture());
  assert.equal(a.document.teacherName,'Franck GACHA');
  assert.equal(a.document.teacherMatricule,'P-123');
  assert.equal(a.document.ueName,'Méthodologie de recherche et rédaction scientifique');
  assert.equal(a.document.rows[0].classLabel,'Master 1 MAE');
  assert.equal(a.document.rows[0].activityType,'Cours en visioconférence');
  assert.match(a.document.filename,/Franck_GACHA_20260701-20260731\.pdf$/);
});

test('jours francais, horaires du Planning, duree attestee differente',()=>{
  const b=fixture();
  b.supervisions[0].startTime='19:15';b.supervisions[0].endTime='20:45';
  const a=mapped(b);
  assert.equal(a.document.rows[0].day,'Mardi');
  assert.equal(a.document.rows[0].date,'07/07/2026');
  assert.equal(a.document.rows[0].hours,'19h00-20h30');
  assert.equal(a.document.rows[0].actualDuration,'1H30');
  assert.equal(a.document.totalVisios,1);
  assert.equal(a.document.weeksDisplayed,7);
});

test('une fiche sans horaires effectifs ne se substitue pas aux horaires planifies',()=>{
  const b=fixture();
  delete b.supervisions[0].startTime;delete b.supervisions[0].endTime;
  const a=mapped(b);
  assert.equal(a.report.totalSyncCount,1); // garde le rapport historique sans mutation
  assert.equal(a.document.totalVisios,1);
  assert.equal(a.document.rows[0].actualDuration,'À vérifier');
  assert.ok(a.document.issues.some(i=>/Duree effective absente/.test(i.message)));
});

test('fiche liee a un autre enseignant non certifiee',()=>{
  const b=fixture();b.supervisions[0].teacherId='t2';
  assert.equal(mapped(b).document.totalVisios,0);
});

test('fiche liee a une autre UE non certifiee',()=>{
  const b=fixture();b.supervisions[0].ueId='u2';
  assert.equal(mapped(b).document.totalVisios,0);
});

test('fiche liee a une autre date non certifiee',()=>{
  const b=fixture();b.supervisions[0].date='2026-07-08';
  assert.equal(mapped(b).document.totalVisios,0);
});

test('supervision sans retour horaire et champ duration ambigu ne fabriquent pas 1H30',()=>{
  const b=fixture();delete b.supervisions[0].startTime;delete b.supervisions[0].endTime;
  b.supervisions[0].duration=90;
  assert.equal(mapped(b).document.totalVisios,1);
  assert.equal(mapped(b).document.rows[0].actualDuration,'À vérifier');
});

test('une seance annulee est exclue',()=>{
  const b=fixture();b.plannings[0].status='Annulé';
  assert.equal(mapped(b).document.totalVisios,0);
});

test('une seance supervisée sans fiche n est pas une preuve',()=>{
  const b=fixture();b.plannings[0].supervision_id=null;b.supervisions=[];
  assert.equal(mapped(b).document.totalVisios,0);
});

test('une evaluation ou un examen ne figure pas dans la fiche',()=>{
  const b=fixture();b.plannings[0].session_type='Évaluation finale';
  assert.equal(mapped(b).document.totalVisios,0);
});

test('des enseignants ou UE distincts ne sont jamais fusionnes',()=>{
  const b=fixture();b.plannings.push({...b.plannings[0],id:'p2',teacher_id:'t2',supervision_id:'f2'});
  b.supervisions.push({...b.supervisions[0],id:'f2',planning_id:'p2',teacherId:'t2'});
  b.plannings.push({...b.plannings[0],id:'p3',ue_id:'u2',supervision_id:'f3'});
  b.supervisions.push({...b.supervisions[0],id:'f3',planning_id:'p3',ueId:'u2'});
  assert.equal(mapped(b).document.totalVisios,1);
});

test('une UE unique est obligatoire pour la fiche, pas pour le releve existant',()=>{
  const b=fixture();delete b.filters.ue;
  const report=lot4.prepareLot4(b);
  assert.throws(()=>bridge.buildPigierOfficialInput(b,report,b.filters),/seule UE/);
});

test('enseignant avec seulement name reste exploitable, sans deviner prenom ou patronyme',()=>{
  const b=fixture();b.teachers[0]={id:'t1',name:'Professeur Anne Kouame'};
  const a=mapped(b);
  assert.equal(a.document.teacherName,'Professeur Anne Kouame');
  assert.match(a.document.filename,/Professeur_Anne_Kouame/);
});

test('le plancher de 7 semaines et la pagination restent conformes',()=>{
  const b=fixture();
  b.plannings=[];b.supervisions=[];
  for(let i=0;i<15;i++) {
    const date=new Date(Date.UTC(2026,0,5+i*7)).toISOString().slice(0,10);
    b.plannings.push({id:`p${i}`,teacher_id:'t1',ue_id:'u1',classe_id:'c1',date,start_time:'19:00',end_time:'20:30',status:'Supervisé',session_type:'Visio',supervision_id:`f${i}`});
    b.supervisions.push({id:`f${i}`,planning_id:`p${i}`,teacherId:'t1',ueId:'u1',date,startTime:'19:00',endTime:'20:30'});
  }
  b.filters={teacher:'t1',ue:'u1',start:'2026-01-01',end:'2026-05-01'};
  const a=mapped(b);
  assert.equal(a.document.rows.length,15);
  assert.equal(a.document.weeksDisplayed,15);
  assert.equal(engine.pigierPageCount(a.document.rows.length),2);
});

test('les sources et le rapport ne sont jamais modifies',()=>{
  const b=fixture();const saved=structuredClone(b);
  mapped(b);assert.deepEqual(b,saved);
});

test('conformite source : ancien Releve preserve, export Fiche remplace, pas de mutation Firestore',()=>{
  const comp=fs.readFileSync(path.join(root,'FRONT/src/app/honoraires/honoraires.ts'),'utf8');
  const html=fs.readFileSync(path.join(root,'FRONT/src/app/honoraires/honoraires.html'),'utf8');
  assert.match(comp,/if \(kind==='fiche'\)/);
  assert.match(comp,/exportLot4Pdf\(this\.report,kind\)/);
  assert.match(comp,/renderPigierOfficialHonoraires\(input\)/);
  assert.match(html,/exportPdf\('fiche'\)/);
  assert.match(html,/exportPdf\('releve'\)/);
  assert.match(html,/readyForOfficialExport/);
  const bridgeText=fs.readFileSync(path.join(src,'pigier-honoraires-adapter.ts'),'utf8');
  const engineText=fs.readFileSync(path.join(src,'pigier-honoraires-v2.ts'),'utf8');
  for(const s of [bridgeText,engineText]) {
    assert.doesNotMatch(s,/from\s*['"]@angular\/fire/);
    assert.doesNotMatch(s,/setDoc\(|addDoc\(|updateDoc\(|deleteDoc\(|runTransaction\(/);
  }
});

test('generation Canvas simulee : remplissage du gabarit sans paiement ni Firestore', async()=>{
  const b=fixture();const input=mapped(b).input;
  const texts=[];
  const originalImage=global.Image, originalDocument=global.document;
  const ctx={
    drawImage(){},setTransform(){},fillRect(){},
    measureText(t){return {width:String(t).length*4.4}},
    fillText(t){texts.push(String(t))},
    set font(v){},set fillStyle(v){},set textBaseline(v){},
  };
  const jpeg=Buffer.from([0xff,0xd8,0xff,0xd9]);
  class MockImage {
    naturalWidth=1654;naturalHeight=2339;
    set src(_) {queueMicrotask(()=>this.onload?.());}
  }
  global.Image=MockImage;
  global.document={
    createElement(type){
      assert.equal(type,'canvas');
      return {width:0,height:0,getContext(t){assert.equal(t,'2d');return ctx},
        toDataURL(){return 'data:image/jpeg;base64,'+jpeg.toString('base64')}};
    },
  };
  try {
    const result=await engine.renderPigierOfficialHonoraires(input,'/assets/pigier/honoraires-modele-officiel-vierge.png');
    assert.equal(result.pages,1);
    assert.ok(Buffer.from(result.bytes).toString('latin1',0,15).includes('%PDF'));
    for(const txt of ['Franck GACHA','Mardi','07/07/2026','Cours en visioconférence','19h00-20h30','1H30','1 visios','7 semaines']) {
      assert.ok(texts.includes(txt),`Champ attendu sur la page : ${txt}`);
    }
    assert.doesNotMatch(texts.join(' '),/FCFA|Tarif|TOTAL\s*PAY/);
  } finally { global.Image=originalImage;global.document=originalDocument; }
});

test('le moteur officiel refuse un statut non supervise, meme avec fiche',()=>{
  const b=fixture();
  b.plannings[0].status='À superviser';
  const single=engine.preparePigierOfficialHonoraires({
    teacher:{id:'t1',firstName:'Franck',lastName:'GACHA'},
    ue:{id:'u1',name:'Méthodologie'},
    period:{from:'2026-07-01',to:'2026-07-31'},
    sessions:[{id:'p1',teacherId:'t1',ueId:'u1',date:'2026-07-07',classId:'c1',classLabel:'MAE',activityType:'Visio',startTime:'19:00',endTime:'20:30',actualMinutes:90,supervisionId:'f1',status:'À superviser',kind:'synchronous'}],
  });
  assert.equal(single.totalVisios,0);
  assert.match(single.issues[0].message,/Statut du Planning non supervise/);
});
