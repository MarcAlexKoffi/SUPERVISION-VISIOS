'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const root=path.join(__dirname,'..');const get=f=>fs.readFileSync(path.join(root,f),'utf8');
test('l interface des honoraires ne charge pas de donnees sans le role admin',()=>{
 const s=get('FRONT/src/app/honoraires/honoraires.ts');
 assert.match(s,/profile\?\.role==='admin'/);
 assert.match(s,/if\(approved&&!this\.dataSub\)this\.loadData\(\)/);
 assert.match(s,/this\.denied=!!profile&&!approved/);
});
test('les documents refusent export avec filtres manquants ou erreur source',()=>{
 const s=get('FRONT/src/app/honoraires/honoraires.ts');
 assert.match(s,/!this\.loadError/);assert.match(s,/this\.filters\.start<=this\.filters\.end/);
 assert.match(s,/Impossible de charger toutes les données/);
});
test('aucun tarif inventé ni montant automatique dans l interface',()=>{
 const h=get('FRONT/src/app/honoraires/honoraires.html');
 assert.match(h,/Aucun montant d.honoraires n.est calculé/);
 assert.doesNotMatch(h,/[(]click[)]="payer/);
});
test('les fichiers Firebase et backend ne sont pas dans le correctif applicatif',()=>{
 const s=get('FRONT/src/app/services/supervision.service.ts');
 assert.match(s,/runTransaction/);assert.match(s,/planning_id/);
});
