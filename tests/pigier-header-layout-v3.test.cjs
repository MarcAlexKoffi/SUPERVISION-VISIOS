'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const root = path.resolve(__dirname, '..');
const enginePath = path.join(root, 'FRONT/src/app/shared/utils/pigier-honoraires-v2.ts');
const compiler = process.env.PIGIER_TSC || path.join(root,'FRONT/node_modules/typescript/bin/tsc');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'pigier-header-v3-'));
process.on('exit',()=>fs.rmSync(temp,{recursive:true,force:true}));
execFileSync(process.execPath, [compiler, '--target','ES2022','--module','commonjs','--strict',
  '--skipLibCheck','--lib','ES2022,DOM','--outDir',temp, enginePath], {cwd:root,stdio:'pipe'});
const engine = require(path.join(temp,'pigier-honoraires-v2.js'));

function input(ueName,teacherName='Dramane Ouattara') {
  return {
    teacher:{id:'teacher1',fullName:teacherName}, ue:{id:'ue1',name:ueName},
    period:{from:'2026-09-01',to:'2026-09-30'}, mode:'draft', sessions:[],
    courseWeeks:4,
  };
}

async function captureDraw(ueName, teacherName) {
  const seen=[];
  const oldImage=global.Image,oldDoc=global.document;
  let font='10px Arial';
  const ctx={
    drawImage(){},setTransform(){},fillRect(){},save(){},restore(){},
    set font(v){font=String(v)},get font(){return font},
    measureText(s){
      const size=Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1]||10);
      return {width:Array.from(String(s)).length * size * .48};
    },
    fillText(text,x,y){seen.push({text:String(text),x,y,font})},
    set fillStyle(v){},set textBaseline(v){},
  };
  const jpeg=Buffer.from([255,216,255,217]);
  class ImageMock {naturalWidth=1654; naturalHeight=2339; set src(v){queueMicrotask(()=>this.onload?.());}}
  global.Image=ImageMock;
  global.document={createElement(type){assert.equal(type,'canvas');return {
    getContext:()=>ctx,toDataURL:()=>`data:image/jpeg;base64,${jpeg.toString('base64')}`,
  }}};
  try {
    const pdf=await engine.renderPigierOfficialHonoraires(input(ueName,teacherName));
    assert.equal(pdf.pages,1);
    return seen;
  } finally {global.Image=oldImage;global.document=oldDoc}
}

test('le nom de l enseignant a une seule ligne distincte de la matiere',async()=>{
  const seen=await captureDraw('Company life and global issues');
  const teacher=seen.filter(x=>x.text==='Dramane Ouattara');
  const subject=seen.filter(x=>x.text==='Company life and global issues');
  assert.equal(teacher.length,1);
  assert.equal(subject.length,1, 'Une UE courte ne devrait pas etre repoussee a la ligne');
  assert.equal(teacher[0].x,subject[0].x);
  assert.ok(subject[0].y - teacher[0].y >= 16);
  assert.ok(subject[0].y < 133);
});

test('les UE longues restent au maximum sur deux lignes sans toucher au nom',async()=>{
  const name='Méthodologie de recherche et rédaction scientifique';
  const seen=await captureDraw(name);
  const teacher=seen.find(x=>x.text==='Dramane Ouattara');
  const lines=seen.filter(x=>x.text.includes('Méthodologie')||x.text.includes('recherche')||x.text.includes('rédaction')||x.text.includes('scientifique'));
  assert.equal(lines.length,2);
  assert.equal(lines.map(x=>x.text).join(' '),name);
  assert.equal(lines[0].x,teacher.x);
  assert.ok(lines[0].y-teacher.y >= 14);
  assert.ok(Math.abs((lines[1].y-lines[0].y)-12.8)<0.001);
  assert.ok(lines[1].y < 133, 'La matiere ne touche pas sa ligne pointillee');
  for(const line of lines){
    const size=Number(/(\d+(?:\.\d+)?)px/.exec(line.font)[1]);
    assert.ok(Array.from(line.text).length*size*.48 <= 183);
  }
});

test('un nom enseignant long ne traverse pas le champ matiere',async()=>{
  const seen=await captureDraw('Anglais des affaires','Professeur Marguerite Aminata Kouassi');
  const professor=seen.filter(x=>x.text==='Professeur Marguerite Aminata Kouassi');
  assert.equal(professor.length,1);
  const ue=seen.filter(x=>x.text==='Anglais des affaires');
  assert.equal(ue.length,1);
  assert.ok(ue[0].y-professor[0].y >= 16);
});

test('les semaines et l etat provisoire ne changent pas',()=>{
  const data=engine.preparePigierOfficialHonoraires(input('Company life and global issues'));
  assert.equal(data.teacherName,'Dramane Ouattara');
  assert.equal(data.ueName,'Company life and global issues');
  assert.equal(data.weeksDisplayed,7);
  assert.equal(data.filename.includes('Dramane_Ouattara'),true);
});

test('pas de code Firestore et de modifications des autres blocs du PDF',()=>{
  const src=fs.readFileSync(enginePath,'utf8');
  assert.doesNotMatch(src, /@angular\/fire|runTransaction\(|setDoc\(|updateDoc\(/);
  assert.match(src,/multilineFirstBaseline:113\.6, lineGap:12\.8, balanceLines:true/);
  assert.match(src,/ctx\.fillText\('PROVISOIRE - A VERIFIER AVANT PAIEMENT', 186, 143\)/);
  assert.match(src,/textField\(ctx, doc\.periodLabel, \{x:448,y:127\.4/);
});
