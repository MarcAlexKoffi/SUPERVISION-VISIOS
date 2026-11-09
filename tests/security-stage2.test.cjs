'use strict';
// Offline tests: mocks for Firebase Admin. No network or production writes.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let ts;
try { ts = require(path.join(root, 'BACKEND/node_modules/typescript')); }
catch { ts = require('typescript'); }
function transpile(relative, mocks) {
  const source=fs.readFileSync(path.join(root,relative),'utf8');
  const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true},reportDiagnostics:true});
  assert.equal((js.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,relative+' syntax');
  const mod={exports:{}};
  new Function('require','module','exports',js.outputText)(name=>{
    if(!(name in mocks))throw new Error('Unexpected dependency '+name);
    return mocks[name];
  },mod,mod.exports);
  return mod.exports;
}
const resp=()=>({code:200,body:undefined,status(n){this.code=n;return this;},json(o){this.body=o;return this;}});
const err=code=>Object.assign(new Error(code),{code});
function fakes({profileFail=false, duplicate=false, authFailure=null, missingAuth=false}={}){
  const calls=[];let stored, updates;
  const doc={
    create:async data=>{calls.push('profile.create'); if(profileFail)throw err('firestore/internal');stored=data;},
    get:async()=>({exists:true,data:()=>({username:'Original',email:'old@example.com',role:'enseignant'})}),
    update:async data=>{calls.push('profile.update');updates=data;},
    delete:async()=>{calls.push('profile.delete');}
  };
  const users={where:()=>({limit:()=>({get:async()=>({empty:!duplicate})})}),doc:()=>doc,get:async()=>({docs:[]})};
  const auth={
    createUser:async data=>{calls.push('auth.create');if(authFailure)throw err(authFailure);assert.equal(data.password,'secret123');return {uid:'firebase-uid-1'};},
    getUser:async()=>{calls.push('auth.get');if(missingAuth)throw err('auth/user-not-found');return {uid:'firebase-uid-1'};},
    updateUser:async()=>{calls.push('auth.update');if(authFailure)throw err(authFailure);},
    deleteUser:async()=>{calls.push('auth.delete');}
  };
  return {mocks:{'../config/db':{db:{collection:()=>users},auth},'../middleware/authMiddleware':{}},calls,read:()=>({stored,updates})};
}
const ctrl=mock=>transpile('BACKEND/src/controllers/userController.ts',mock);
const adminReq=body=>({body,params:{id:'firebase-uid-1'},user:{id:'admin-uid-9',role:'admin'}});
test('SEN-07: admin API creates Auth identity then a UID-keyed Firestore profile without passwords', async()=>{
  const f=fakes();const r=resp();await ctrl(f.mocks).createUser(adminReq({username:'Test',email:'Test@EXAMPLE.com',password:'secret123',role:'assistant'}),r);
  assert.equal(r.code,201);assert.equal(r.body.user.id,'firebase-uid-1');
  assert.deepEqual(f.calls,['auth.create','profile.create']);
  assert.equal(f.read().stored.role,'assistant');assert.equal(f.read().stored.email,'test@example.com');
  assert.equal('password' in f.read().stored,false);assert.equal('token' in r.body,false);
});
test('SEN-07: invalid role and incomplete credentials cannot create an Auth identity',async()=>{
  const f=fakes();const c=ctrl(f.mocks);
  let r=resp();await c.createUser(adminReq({username:'T',email:'a@b.com',password:'secret123',role:'superadmin'}),r);
  assert.equal(r.code,400);assert.deepEqual(f.calls,[]);
  r=resp();await c.createUser(adminReq({username:'T',email:'bad',password:'secret123'}),r);
  assert.equal(r.code,400);assert.deepEqual(f.calls,[]);
});
test('SEN-07: duplicate existing profile stops before Auth mutation',async()=>{
  const f=fakes({duplicate:true}),r=resp();await ctrl(f.mocks).createUser(adminReq({username:'Test',email:'t@example.com',password:'secret123'}),r);
  assert.equal(r.code,409);assert.deepEqual(f.calls,[]);
});
test('SEN-07: Firebase Auth duplicate email returns 409 and no Firestore writes',async()=>{
  const f=fakes({authFailure:'auth/email-already-exists'}),r=resp();await ctrl(f.mocks).createUser(adminReq({username:'Test',email:'t@example.com',password:'secret123'}),r);
  assert.equal(r.code,409);assert.deepEqual(f.calls,['auth.create']);
});
test('SEN-07: Firestore profile failure triggers Auth account compensation, never false success',async()=>{
  const f=fakes({profileFail:true}),r=resp();
  const original=console.error;console.error=()=>{};
  try{ await ctrl(f.mocks).createUser(adminReq({username:'Test',email:'t@example.com',password:'secret123'}),r); }
  finally{console.error=original;}
  assert.equal(r.code,500);assert.deepEqual(f.calls,['auth.create','profile.create','auth.delete']);
});
test('SEN-05: role-only edit changes Firestore only, not Firebase credentials',async()=>{
  const f=fakes(),r=resp();await ctrl(f.mocks).updateUser(adminReq({role:'SUPERVISEUR'}),r);
  assert.equal(r.code,200);assert.deepEqual(f.calls,['profile.update']);assert.equal(f.read().updates.role,'superviseur');
});
test('SEN-05: privilege change refuses own administrator demotion',async()=>{
  const f=fakes(),r=resp();await ctrl(f.mocks).updateUser({...adminReq({role:'enseignant'}),user:{id:'firebase-uid-1',role:'admin'}},r);
  assert.equal(r.code,409);assert.deepEqual(f.calls,[]);
});
test('SEN-07: legacy record with no Auth account refuses password changes',async()=>{
  const f=fakes({missingAuth:true}),r=resp();await ctrl(f.mocks).updateUser(adminReq({password:'newsecret123'}),r);
  assert.equal(r.code,409);assert.deepEqual(f.calls,['auth.get']);
});
test('SEN-07: update never sends password to Firestore',async()=>{
  const f=fakes(),r=resp();await ctrl(f.mocks).updateUser(adminReq({username:'Changed',password:'newsecret123',role:'assistant'}),r);
  assert.equal(r.code,200);assert.equal('password' in f.read().updates,false);assert.deepEqual(f.calls,['auth.get','profile.update','auth.update']);
});
test('SEN-05: cannot delete own admin account',async()=>{
  const f=fakes(),r=resp();await ctrl(f.mocks).deleteUser({...adminReq({}),user:{id:'firebase-uid-1',role:'admin'}},r);
  assert.equal(r.code,409);assert.deepEqual(f.calls,[]);
});
test('SEN-07: admin deletion removes corresponding Auth identity and Firestore profile',async()=>{
  const f=fakes(),r=resp();await ctrl(f.mocks).deleteUser(adminReq({}),r);
  assert.equal(r.code,200);assert.deepEqual(f.calls,['auth.delete','profile.delete']);
});
test('SEN-05: admin-only backend gate for user mutations retained',()=>{
  const src=fs.readFileSync(path.join(root,'BACKEND/src/routes/userRoutes.ts'),'utf8');
  assert.match(src,/router\.use\(authenticateToken\)/);
  assert.match(src,/router\.use\(requireAdmin\)/);
});
test('SEN-05: Angular user mutations use privileged API with fresh Firebase token, not Firestore writes',()=>{
  const src=fs.readFileSync(path.join(root,'FRONT/src/app/services/user.service.ts'),'utf8');
  assert.match(src,/getIdToken\(\)/);assert.match(src,/Authorization:/);
  assert.match(src,/http\.post\(this\.usersApi/);assert.match(src,/http\.put\(/);assert.match(src,/http\.delete\(/);
  assert.doesNotMatch(src,/createUserWithEmailAndPassword|setDoc\(|updateDoc\(|deleteDoc\(/);
});
test('SEN-06: session cache never persists raw Firebase tokens or passwords',()=>{
  const src=fs.readFileSync(path.join(root,'FRONT/src/app/services/auth.service.ts'),'utf8');
  assert.match(src,/stripSecrets\(/);assert.match(src,/token:\s*_oldToken/);
  assert.match(src,/password:\s*_oldPassword/);
  assert.doesNotMatch(src,/getIdToken\(/);
  assert.match(src,/localStorage\.setItem\(this\.cacheKey, JSON\.stringify\(safe\)\)/);
});
test('SEN-07: legacy password fields are stripped from Angular user list and details',()=>{
  const src=fs.readFileSync(path.join(root,'FRONT/src/app/services/user.service.ts'),'utf8');
  assert.match(src,/password:\s*_password/g);
  assert.match(src,/token:\s*_token/g);
});
