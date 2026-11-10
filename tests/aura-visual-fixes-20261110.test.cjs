'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const scss=read('FRONT/src/app/plannings/plannings.scss');
const html=read('FRONT/src/app/plannings/plannings.html');
const ts=read('FRONT/src/app/plannings/plannings.ts');
const pdfSource=read('FRONT/src/app/shared/utils/pigier-honoraires-v2.ts');
const compiler=process.env.PIGIER_TSC||path.join(root,'FRONT/node_modules/typescript/bin/tsc');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'pigier-align-'));
process.on('exit',()=>fs.rmSync(temp,{recursive:true,force:true}));
execFileSync(process.execPath,[compiler,'--target','ES2022','--module','commonjs','--strict','--skipLibCheck','--lib','ES2022,DOM','--outDir',temp,path.join(root,'FRONT/src/app/shared/utils/pigier-honoraires-v2.ts')],{cwd:root,stdio:'pipe'});
const engine=require(path.join(temp,'pigier-honoraires-v2.js'));

function sourceData(classLabel='MMA & MAE 1B') {
  const dates=['2026-09-29','2026-10-05','2026-10-07','2026-10-14','2026-10-19','2026-10-27','2026-10-31'];
  return {
    teacher:{id:'t1',fullName:'Dramane Ouattara'},ue:{id:'u1',name:'Company life and global issues'},
    period:{from:'2026-09-01',to:'2026-10-31'},sessions:dates.map((date,i)=>({
      id:'p'+i,teacherId:'t1',ueId:'u1',date,classId:null,classLabel,activityType:'CM',
      startTime:i===6?'09:00':'19:00',endTime:i===6?'10:30':'20:30',actualMinutes:i===2||i===3?60:90,
      supervisionId:'s'+i,status:'Supervisé',kind:'synchronous'
    }))
  };
}
async function drawFixture(classLabel) {
 const logs=[];
 const oldDoc=global.document,oldImage=global.Image;
 let textAlign='start', font='10px Arial';
 const ctx={drawImage(){},setTransform(){},fillRect(){},save(){},restore(){},
   set font(v){font=String(v)},get font(){return font},
   set textAlign(v){textAlign=v},get textAlign(){return textAlign},
   set textBaseline(v){},set fillStyle(v){},
   measureText(t){return {width:String(t).length*Number(/([\d.]+)px/.exec(font)?.[1]||10)*0.48}},
   fillText(text,x,y){logs.push({text:String(text),x,y,textAlign})}
 };
 const jpeg=Buffer.from([255,216,255,217]);
 class MockImage {naturalWidth=1654;naturalHeight=2339;set src(v){queueMicrotask(()=>this.onload?.())}}
 global.Image=MockImage;
 global.document={createElement(type){assert.equal(type,'canvas');return {getContext:()=>ctx,toDataURL:()=>`data:image/jpeg;base64,${jpeg.toString('base64')}`}}};
 try {
   const original=sourceData(classLabel);
   const data=engine.preparePigierOfficialHonoraires(original);
   const pdf=await engine.renderPigierOfficialHonoraires(original);
   assert.equal(pdf.pages,1);
   return {logs,data};
 } finally {global.document=oldDoc;global.Image=oldImage}
}

test('drawer footer is pinned, only the body scrolls during type changes',()=>{
 assert.match(scss,/display:flex; flex-direction:column; justify-content:flex-start; align-items:stretch/);
 assert.doesNotMatch(scss,/grid-template-rows:auto minmax\(0,1fr\) auto auto/);
 assert.match(scss,/\.aura-planning-drawer-body \{[^}]*flex:1 1 auto;[^}]*overflow-y:auto/);
 assert.match(scss,/\.aura-planning-drawer-footer \{[^}]*flex:none; margin-top:auto/);
 assert.match(scss,/height:100dvh; min-height:100dvh; max-height:100dvh/);
 assert.match(scss,/\.aura-planning-drawer-body \{[^}]*overflow-anchor:none/);
 assert.match(html,/#planningDrawerBody class="aura-planning-drawer-body/);
 assert.match(html,/#sessionTypeSelector class="space-y-2"/);
 assert.match(ts,/@ViewChild\('planningDrawerBody'\)/);
 assert.match(ts,/@ViewChild\('planningOverlay'\)/);
 assert.match(ts,/document\.body\.appendChild\(element\)/);
 assert.doesNotMatch(ts,/body\.scrollTop \+= offset/);
 assert.match(scss,/aura-planning-modal \{[^}]*overflow:clip/);
 assert.match(scss,/aura-planning-modal > \.aura-planning-drawer \{[^}]*overflow:clip/);
 assert.match(html,/\(ngModelChange\)="onSessionTypeSelected\(\$event\)"/);
 assert.match(html,/\(click\)="savePlanning\(\)"/);
});

test('7 real forms make exactly 7 PDF table rows, all six columns centered',async()=>{
 const {logs,data}=await drawFixture();
 assert.equal(data.rows.length,7);
 assert.equal(data.totalVisios,7);
 assert.equal(data.weeksDisplayed,7);
 const columns=[['Mardi',60.5],['29/09/2026',123],['MMA & MAE 1B',221],['CM',355],['19h00-20h30',463.5],['1H30',537]];
 for(const [content,x] of columns){
   const found=logs.find(a=>a.text===content && a.textAlign==='center');
   assert.ok(found,'Cellule centree manquante : '+content);
   assert.ok(Math.abs(found.x-x)<0.01,`Mauvais centre ${content}: ${found.x} vs ${x}`);
 }
 assert.equal(logs.find(x=>x.text==='Dramane Ouattara').textAlign,'left');
 assert.equal(logs.find(x=>x.text==='Company life and global issues').textAlign,'left');
 assert.ok(!logs.some(x=>/\bFCFA\b|Tarif|TOTAU[X]/i.test(x.text)),'No financial amount is filled');
});

test('long academic class content wraps and remains centered in the official cell',async()=>{
 const {logs}=await drawFixture('MASTER MANAGEMENT BUSINESS ET ENTREPRENEURIAT');
 const pieces=logs.filter(x=>x.text.includes('MANAGEMENT')||x.text.includes('ENTREPRENEURIAT'));
 assert.ok(pieces.length>=2,'Long label must wrap');
 for(const p of pieces){assert.equal(p.textAlign,'center');assert.equal(p.x,221)}
});

test('official header, manual financial section and Firebase data flows unchanged',()=>{
 assert.match(pdfSource,/x:154\.2, y:99\.0, maxWidth:187/);
 assert.match(pdfSource,/multilineFirstBaseline:113\.6, lineGap:12\.8, balanceLines:true/);
 assert.match(pdfSource,/ctx\.fillText\('PROVISOIRE - A VERIFIER AVANT PAIEMENT', 186, 143\)/);
 assert.doesNotMatch(pdfSource,/@angular\/fire|runTransaction\(|setDoc\(|updateDoc\(/);
 assert.match(ts,/this\.planningService\.updatePlanning\(String\(plan\.id\),/);
});

test('V3: le panneau est deplace sous body, hors du conteneur admin qui defile',()=>{
 assert.match(html,/\*ngIf="isAddModalOpen" #planningOverlay class="aura-planning-modal"/);
 assert.match(ts,/@ViewChild\('planningOverlay'\)/);
 assert.match(ts,/element\.parentElement !== document\.body/);
 assert.match(ts,/document\.body\.appendChild\(element\)/);
 assert.match(ts,/this\.planningOverlayElement\?\.remove\(\)/);
});
test('V3: ni offset du selecteur ni défilement artificiel sur changement de type',()=>{
 const fn=ts.split('  onSessionTypeSelected(value: string): void {')[1]?.split('  modalData: Partial<Planning>')[0];
 assert.ok(fn,'Handler requis');
 assert.doesNotMatch(fn,/scrollTop|getBoundingClientRect|requestAnimationFrame|window\.scroll/);
 assert.match(fn,/this\.modalData\.session_type = value/);
 assert.match(fn,/this\.modalData\.exam_session/);
 assert.match(fn,/this\.modalData\.ue_id = null/);
});
test('V3: la zone interne reste defilante, avec en-tête et actions hors defilement',()=>{
 assert.match(scss,/aura-planning-drawer-body \{[^}]*flex:1 1 auto;[^}]*overflow-y:auto/);
 assert.match(scss,/aura-planning-drawer-header \{ flex:none;/);
 assert.match(scss,/aura-planning-drawer-footer \{ flex:none;/);
 assert.match(scss,/scroll-behavior:auto/);
 assert.match(html,/#planningDialog tabindex="-1" role="dialog"/);
 assert.match(html,/\(click\)="savePlanning\(\)"/);
});
