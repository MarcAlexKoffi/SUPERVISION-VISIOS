'use strict';
// Isolated, offline behavior tests. No Firebase connection, network calls or writes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let ts;
try { ts = require(path.join(root, 'BACKEND/node_modules/typescript')); }
catch { ts = require('typescript'); }

function load(relative, mocks) {
  const raw = fs.readFileSync(path.join(root, relative), 'utf8');
  const js = ts.transpileModule(raw, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
    esModuleInterop: true, strict: true
  }, reportDiagnostics: true });
  assert.equal((js.diagnostics || []).filter(x => x.category === ts.DiagnosticCategory.Error).length, 0, `syntax: ${relative}`);
  const mod = { exports: {} };
  const fakeRequire = id => {
    if (!(id in mocks)) throw new Error(`Unexpected dependency '${id}' in ${relative}`);
    return mocks[id];
  };
  new Function('require','module','exports',js.outputText)(fakeRequire, mod, mod.exports);
  return mod.exports;
}
function mockRouter() {
  const routes = [];
  const router = Object.fromEntries(['get','post','put','delete'].map(method => [method, (route, ...handlers) => routes.push({method, route, handlers})]));
  return {router, routes};
}
function resp() {
  return { code: 200, body: undefined, status(n) { this.code = n; return this; }, json(data) { this.body=data; return this; } };
}
const handler = () => {};

test('SEN-02: route /register requires authentication and admin role, /login remains available', () => {
  const {router,routes} = mockRouter();
  load('BACKEND/src/routes/authRoutes.ts', {
    express: {Router: () => router},
    '../controllers/authController': {register:handler, login:handler},
    '../middleware/authMiddleware': {authenticateToken:handler, requireAdmin:handler}
  });
  assert.deepEqual(routes, [
    {method:'post',route:'/register',handlers:[handler,handler,handler]},
    {method:'post',route:'/login',handlers:[handler]}
  ]);
});
for (const [routeFile,label] of [['classeRoutes.ts','Classes'],['parcoursRoutes.ts','Parcours']]) {
  test(`SEN-04: ${label} GET unchanged; all writes require authentication and admin role`, () => {
    const {router,routes} = mockRouter();
    const controllers = routeFile === 'classeRoutes.ts'
      ? {getClasses:handler,createClasse:handler,updateClasse:handler,deleteClasse:handler}
      : {getParcours:handler,createParcours:handler,updateParcours:handler,deleteParcours:handler};
    load('BACKEND/src/routes/'+routeFile, {
      express: {Router:()=>router},
      ['../controllers/'+(routeFile === 'classeRoutes.ts' ? 'classeController':'parcoursController')]:controllers,
      '../middleware/authMiddleware':{authenticateToken:handler,requireAdmin:handler}
    });
    assert.deepEqual(routes.map(r=>[r.method,r.route,r.handlers.length]), [
      ['get','/',1],['post','/',3],['put','/:id',3],['delete','/:id',3]
    ]);
  });
}
test('SEN-03: custom JWT fails closed without a strong secret, including known fallback', () => {
  const initial=process.env.JWT_SECRET;
  let calls=0, lastSecret;
  const jwt={sign:(_claims,secret)=>{calls++;lastSecret=secret;return 'signed';},verify:(_token,secret)=>{lastSecret=secret;return {id:'user'};}};
  const {generateToken,verifyToken}=load('BACKEND/src/utils/token.ts',{jsonwebtoken:jwt});
  try {
    delete process.env.JWT_SECRET;
    assert.throws(()=>generateToken('id','admin'),/JWT_SECRET/);
    assert.throws(()=>verifyToken('x'),/JWT_SECRET/);
    process.env.JWT_SECRET='your_super_secret_key';
    assert.throws(()=>generateToken('id','admin'),/JWT_SECRET/);
    process.env.JWT_SECRET='short';
    assert.throws(()=>generateToken('id','admin'),/JWT_SECRET/);
    assert.equal(calls,0);
    process.env.JWT_SECRET='A'.repeat(48);
    assert.equal(generateToken('id','user'),'signed');
    assert.deepEqual(verifyToken('x'),{id:'user'});
    assert.equal(lastSecret,'A'.repeat(48));
  } finally { if(initial===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=initial; }
});
test('SEN-02b: registration refuses unexpected roles before writing', async () => {
  let writes=0;
  const db={collection:()=>({where:()=>({get:async()=>({empty:true})}),add:async data=>{writes++;return {id:'u1'};}})};
  const {register}=load('BACKEND/src/controllers/authController.ts',{
    express:{},bcrypt:{genSalt:async()=> 'salt',hash:async()=> 'hash'},
    '../config/db':{db,admin:{}},'../utils/token':{generateToken:()=>{throw new Error('unexpected token');}}
  });
  const res=resp();
  await register({body:{username:'n',password:'pw',role:'superadmin'}},res);
  assert.equal(res.code,400);assert.equal(writes,0);
});
test('SEN-02: admin provisioning never leaks hash or creates an impersonation token', async () => {
  let stored;
  const db={collection:()=>({where:()=>({get:async()=>({empty:true})}),add:async data=>{stored=data;return {id:'u1'};}})};
  const {register}=load('BACKEND/src/controllers/authController.ts',{
    express:{},bcrypt:{genSalt:async()=> 'salt',hash:async()=> 'hash'},
    '../config/db':{db,admin:{}},'../utils/token':{generateToken:()=>{throw new Error('must not mint user token');}}
  });
  const res=resp();
  await register({body:{username:'n',password:'pw',role:'Enseignant'}},res);
  assert.equal(res.code,201);
  assert.equal(stored.password,'hash');
  assert.equal(stored.role,'enseignant');
  assert.equal(res.body.user.role,'enseignant');
  assert.equal('password' in res.body.user,false);
  assert.equal('token' in res.body,false);
});
test('SEN-03: legacy JWT role is reloaded from Firestore rather than trusted from the token', async () => {
  const {authenticateToken,requireAdmin}=load('BACKEND/src/middleware/authMiddleware.ts',{
    express:{},'../utils/token':{verifyToken:()=>({id:'u1',role:'admin'})},
    '../config/db':{db:{collection:()=>({doc:()=>({get:async()=>({exists:true,data:()=>({role:'enseignant'})})})})},admin:{auth:()=>({verifyIdToken:async()=>{throw new Error('unexpected firebase token')}})}}
  });
  const req={headers:{authorization:'Bearer jwt'},user:undefined};
  const res=resp();let nextCount=0;
  await authenticateToken(req,res,()=>nextCount++);
  assert.equal(nextCount,1);
  assert.equal(req.user.role,'enseignant');
  requireAdmin(req,res,()=>nextCount++);
  assert.equal(res.code,403);assert.equal(nextCount,1);
});
test('SEN-03: Firebase ID token fallback and current role continue to work', async () => {
  const {authenticateToken,requireAdmin}=load('BACKEND/src/middleware/authMiddleware.ts',{
    express:{},'../utils/token':{verifyToken:()=>{throw Error('not custom JWT')}},
    '../config/db':{db:{collection:()=>({doc:()=>({get:async()=>({exists:true,data:()=>({role:'admin'})})})})},admin:{auth:()=>({verifyIdToken:async()=>({uid:'uid1'})})}}
  });
  const req={headers:{authorization:'Bearer firebase'},user:undefined};
  const res=resp();let nextCount=0;
  await authenticateToken(req,res,()=>nextCount++);
  requireAdmin(req,res,()=>nextCount++);
  assert.equal(req.user.id,'uid1');assert.equal(req.user.role,'admin');assert.equal(nextCount,2);
});
test('SEN-04: no token gets 401, malformed role gets 403', async () => {
  const {authenticateToken,requireAdmin}=load('BACKEND/src/middleware/authMiddleware.ts',{
    express:{},'../utils/token':{verifyToken:()=>{throw Error('not called')}},
    '../config/db':{db:{},admin:{}}
  });
  const res=resp();
  await authenticateToken({headers:{}},res,()=>{throw Error('unexpected next')});
  assert.equal(res.code,401);
  requireAdmin({user:{role:null}},res,()=>{throw Error('unexpected next')});
  assert.equal(res.code,403);
});
