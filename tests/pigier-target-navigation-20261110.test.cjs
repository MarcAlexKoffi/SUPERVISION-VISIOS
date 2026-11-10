'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=path.resolve(__dirname,'../FRONT/src/app');
const read=(f)=>fs.readFileSync(path.join(base,f),'utf8');
test('Honoraires presente un diagnostic et cible uniquement la seance exacte',()=>{
  const ts=read('honoraires/honoraires.ts'),html=read('honoraires/honoraires.html');
  assert.match(ts,/planningId:line\.planningId/);
  assert.match(ts,/supervisionId:line\.sourceId/);
  assert.match(html,/toggleDiagnosis\(line\)/);
  assert.match(html,/expandedLineId===line\.id/);
  assert.match(html,/openPlanningLine\(line\)/);
  assert.match(html,/openHistoryLine\(line\)/);
});
test('Filtres Honoraires transmis aux ecrans cibles',()=>{
  const ts=read('honoraires/honoraires.ts');
  for(const k of ['honorairesTeacher','honorairesUe','honorairesStart','honorairesEnd','fromHonoraires'])
    assert.ok(ts.includes(k),k);
});
test('Planning ouvre un ID exact, pas le premier cours du meme enseignant',()=>{
  const ts=read('plannings/plannings.ts');
  assert.match(ts,/getById\(id\)/);
  assert.match(ts,/data\.find\(p=>p\.id===this\.pendingPlanningId\)/);
  assert.match(ts,/this\.openEditModal\(target\)/);
});
test('Historique ouvre la fiche choisie par son ID exact',()=>{
  const ts=read('history/history.ts');
  assert.match(ts,/this\.supervisions\.find\(s=>s\.id===this\.pendingSupervisionId\)/);
  assert.match(ts,/this\.viewDetails\(found\)/);
});
test('Retour aux honoraires restitue les 4 filtres',()=>{
  for(const f of ['plannings/plannings.ts','history/history.ts']){
    const ts=read(f);
    assert.match(ts,/backToHonoraires\(\)/);
    assert.match(ts,/course:f\.ue,start:f\.start,end:f\.end/);
  }
});
test('Navigation ne requiert pas pigier-event-diagnostics.ts existant au precontrole',()=>{
  for(const f of ['honoraires/honoraires.ts','plannings/plannings.ts','history/history.ts']) {
    assert.doesNotMatch(read(f),/pigier-event-diagnostics/);
  }
});
