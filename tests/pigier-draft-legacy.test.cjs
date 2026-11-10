'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');

const root = path.resolve(__dirname,'..');
const src = path.join(root,'FRONT/src/app/shared/utils');
const ts = require(path.join(root,'FRONT/node_modules/typescript'));
const temp = fs.mkdtempSync(path.join(os.tmpdir(),'pigier-v2-draft-'));
process.on('exit',()=>fs.rmSync(temp,{recursive:true,force:true}));
execFileSync(process.execPath,[require.resolve(path.join(root,'FRONT/node_modules/typescript/bin/tsc')),
  '--target','ES2022','--module','commonjs','--strict','--skipLibCheck','--lib','ES2022,DOM','--outDir',temp,
  path.join(src,'lot4-documents.ts'),path.join(src,'pigier-honoraires-v2.ts'),path.join(src,'pigier-honoraires-adapter.ts')],
  {cwd:root,stdio:'pipe'});
const lot4=require(path.join(temp,'lot4-documents.js'));
const bridge=require(path.join(temp,'pigier-honoraires-adapter.js'));
const pigier=require(path.join(temp,'pigier-honoraires-v2.js'));
const fixture=()=>({
  teachers:[{id:'t1',first_name:'Franck',last_name:'GACHA'}],
  ues:[{id:'u1',name:'Gestion',code:'GES'}],
  classes:[{id:'c1',name:'MAE'}],
  plannings:[{id:'s1',teacher_id:'t1',ue_id:'u1',classe_id:'c1',date:'2026-09-29',start_time:'19:00',end_time:'20:30',status:'À superviser',session_type:'Visioconférence'}],
  supervisions:[],asyncSupervisions:[],
  filters:{teacher:'t1',ue:'u1',start:'2026-09-01',end:'2026-09-30'},
});
const prepare=(d)=>pigier.preparePigierOfficialHonoraires(bridge.buildPigierPlanningDraftInput(d,lot4.prepareLot4(d),d.filters));

test('pas de fiche: brouillon avec seance du Planning, sans visio attestee',()=>{
  const d=prepare(fixture());
  assert.equal(d.rows.length,1);
  assert.equal(d.rows[0].date,'29/09/2026');
  assert.equal(d.rows[0].day,'Mardi');
  assert.equal(d.rows[0].hours,'19h00-20h30');
  assert.equal(d.rows[0].actualDuration,'À vérifier');
  assert.equal(d.totalVisios,0);
  assert.equal(d.weeksDisplayed,7);
  assert.equal(d.provisional,true);
  assert.match(d.filename,/_PROVISOIRE\.pdf$/);
});

test('statut Supervise sans fiche: toujours provisoire et pas payable',()=>{
  const b=fixture();b.plannings[0].status='Supervisé';
  const d=prepare(b);
  assert.equal(d.rows.length,1);
  assert.equal(d.rows[0].verified,false);
  assert.equal(d.totalVisios,0);
});

test('classe_id absent dans une fiche historique n empeche pas un brouillon',()=>{
  const b=fixture();delete b.plannings[0].classe_id;b.plannings[0].parcours='MAE';
  const d=prepare(b);
  assert.equal(d.rows.length,1);
  assert.equal(d.rows[0].classLabel,'MAE');
  assert.equal(d.rows[0].verified,false);
});

test('enseignant + UE historiques uniques sans IDs autorises uniquement en brouillon',()=>{
  const b=fixture();delete b.plannings[0].teacher_id; delete b.plannings[0].ue_id;
  b.plannings[0].teacher_first_name='Franck';b.plannings[0].teacher_last_name='GACHA';b.plannings[0].ue_code='GES';
  const d=prepare(b);
  assert.equal(d.rows.length,1);
  assert.equal(d.rows[0].verified,false);
  b.teachers.push({id:'t2',first_name:'Franck',last_name:'GACHA'});
  assert.equal(prepare(b).rows.length,0); // Never merge duplicate names
});

test('annulation, examen et enseignant contradictoire exclus',()=>{
  const b=fixture();
  b.plannings.push({...b.plannings[0],id:'s2',status:'Annulé'});
  b.plannings.push({...b.plannings[0],id:'s3',exam_session:'Session 1'});
  b.plannings.push({...b.plannings[0],id:'s4',teacher_id:'t2'});
  assert.equal(prepare(b).rows.length,1);
});

test('une supervision seule ne genere pas une prestation a payer',()=>{
  const b=fixture();b.supervisions=[{id:'f1',planning_id:'s1',teacherId:'t1',ueId:'u1',date:'2026-09-29',startTime:'19:00',endTime:'20:30'}];
  let d=prepare(b);
  assert.equal(d.rows[0].verified,false); // Status still À superviser
  b.plannings[0].status='Supervisé';b.plannings[0].supervision_id='f1';
  d=prepare(b);
  assert.equal(d.rows[0].verified,true);
  assert.equal(d.provisional,false);
  assert.equal(d.totalVisios,1);
});

test('plus de 7 semaines suit la duree observee',()=>{
  const b=fixture();b.plannings=[];
  for(let n=0;n<8;n++)b.plannings.push({id:'s'+n,teacher_id:'t1',ue_id:'u1',classe_id:'c1',date:new Date(Date.UTC(2026,8,7+7*n)).toISOString().slice(0,10),start_time:'19:00',end_time:'20:30',status:'À superviser',session_type:'Visio'});
  b.filters.end='2026-11-30';
  const d=prepare(b);assert.equal(d.rows.length,8);assert.equal(d.weeksDisplayed,8);
});

test('gabarit brouillon marque visiblement la validation necessaire et laisse paiement manuel',async()=>{
  const input=bridge.buildPigierPlanningDraftInput(fixture(),lot4.prepareLot4(fixture()),fixture().filters);
  const texts=[];
  const oldImage=global.Image, oldDoc=global.document;
  const canvasCtx={drawImage(){},setTransform(){},fillRect(){},save(){},restore(){},
    measureText(t){return {width:String(t).length*4}},fillText(t){texts.push(String(t));},
    set font(v){},set fillStyle(v){},set textBaseline(v){}
  };
  const jpeg=Buffer.from([0xff,0xd8,0xff,0xd9]);
  class MockImage{naturalWidth=1654;naturalHeight=2339;set src(v){queueMicrotask(()=>this.onload?.());}}
  global.Image=MockImage;
  global.document={createElement(){return {getContext(){return canvasCtx},toDataURL(){return 'data:image/jpeg;base64,'+jpeg.toString('base64')}}}};
  try{
    const pdf=await pigier.renderPigierOfficialHonoraires(input);
    assert.equal(pdf.provisional,true);
    assert.ok(texts.includes('À vérifier'));
    assert.ok(texts.includes('PROVISOIRE - A VERIFIER AVANT PAIEMENT'));
    assert.ok(!texts.some(x=>/FCFA/.test(x)));
  } finally {global.Image=oldImage;global.document=oldDoc;}
});

// Test runtime for real PlanningService with Firestore operations mocked IN MEMORY.
function setupPlanningService(data){
  const planPath='plannings/old1',lockPath='planning_day_locks/2026-09-29';
  const store=new Map([[planPath,structuredClone(data)]]);
  const wrap=(ref)=>({exists:()=>store.has(ref.path),data:()=>structuredClone(store.get(ref.path))});
  const noUndefined=(v)=>{
    if(v===undefined)throw new Error('UNSUPPORTED FIRESTORE VALUE undefined');
    if(Array.isArray(v))v.forEach(noUndefined);
    else if(v&&typeof v==='object'&&Object.prototype.toString.call(v)==='[object Object]')Object.values(v).forEach(noUndefined);
  };
  const api={
    collection:(db,name)=>({path:name}),
    doc:(db,a,id)=>id?({path:a+'/'+id}):({path:a.path+'/newdoc'}),
    query:(table,...args)=>({table,...Object.fromEntries(args.filter(Boolean))}),
    where:(key,op,val)=>({where:[key,op,val]}),
    orderBy:()=>({}),
    getDoc:async ref=>wrap(ref),
    getDocs:async q=>({docs:[...store].filter(([k,v])=>k.startsWith('plannings/')&&v.date==='2026-09-29').map(([k,v])=>({id:k.split('/')[1],data:()=>structuredClone(v)}))}),
    runTransaction:async(db,fn)=>fn({
      get:async ref=>wrap(ref),
      set:(ref,val)=>{noUndefined(val);store.set(ref.path,structuredClone(val));},
      update:(ref,val)=>{noUndefined(val);store.set(ref.path,{...store.get(ref.path),...structuredClone(val)});},
      delete:ref=>store.delete(ref.path),
    }),
  };
  const tsSrc=fs.readFileSync(path.join(root,'FRONT/src/app/services/planning.service.ts'),'utf8');
  const compiled=ts.transpileModule(tsSrc,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  const context={exports,require:(name)=>{
    if(name==='@angular/core')return {Injectable:()=>x=>x,inject:()=>({})};
    if(name==='@angular/fire/firestore')return api;
    if(name==='rxjs')return {from:p=>p};
    if(name==='rxjs/operators')return {map:f=>f};
    if(name==='./planning-rules')return {firstConflict:()=>null,isRescheduled:()=>false,validateSlot:p=>p.start_time?'': 'old data missing start_time'};
    if(name==='../shared/utils/academic-3b')return {isExamPlanning:()=>false,findDuplicateScheduledExam:()=>null};
    throw new Error('Unexpected module '+name);
  }};
  vm.runInNewContext(compiled,context,{filename:'planning.service.js'});
  return {service:new exports.PlanningService(),store,planPath,lockPath};
}

test('modification du statut ancien sans classe_id ni start_time: transaction valide',async()=>{
  const {service,store,planPath,lockPath}=setupPlanningService({id:'old1',date:'2026-09-29',end_time:'20:30',parcours:'MAE',status:'À superviser',session_type:'Cours',ue_id:'u1',teacher_id:'t1'});
  await service.update('old1',{status:'Supervisé'});
  assert.equal(store.get(planPath).status,'Supervisé');
  assert.equal(store.get(lockPath).entries.old1.status,'Supervisé');
  assert.ok(!Object.hasOwn(store.get(lockPath).entries.old1,'classe_id'));
  assert.ok(!Object.hasOwn(store.get(lockPath).entries.old1,'start_time'));
  assert.equal(store.get(planPath).status_history.length,1);
});

test('ancien status absent: historique explicite, jamais undefined',async()=>{
  const {service,store,planPath}=setupPlanningService({date:'2026-09-29',end_time:'20:30',parcours:'MAE',session_type:'Cours'});
  await service.update('old1',{status:'Supervisé'});
  assert.equal(store.get(planPath).status_history[0].from,'Non renseigné');
});

test('isolation code: ni nouvelle ecriture dans Honoraires ni regles Firebase modifiees',()=>{
  const comp=fs.readFileSync(path.join(root,'FRONT/src/app/honoraires/honoraires.ts'),'utf8');
  const html=fs.readFileSync(path.join(root,'FRONT/src/app/honoraires/honoraires.html'),'utf8');
  assert.match(comp,/buildPigierPlanningDraftInput/);
  assert.match(comp,/renderPigierOfficialHonoraires/);
  assert.match(comp,/exportLot4Pdf\(this\.report,kind\)/);
  assert.match(html,/<details class="lot4-diagnostics">/);
  assert.doesNotMatch(comp,/\bsetDoc\(|\brunTransaction\(/);
});
