const ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');
const fs = require('node:fs'); const path = require('node:path');
let bad=0; const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):e.name.endsWith('.ts')?[path.join(dir,e.name)]:[]);
for (const file of [...walk('/mnt/data/sv_lot3_work/FRONT/src/app'),...walk('/mnt/data/sv_lot3_work/BACKEND/src')]) {
 const result = ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,experimentalDecorators:true}});
 for (const d of (result.diagnostics||[])) {if (d.category===ts.DiagnosticCategory.Error) {bad++; process.stdout.write(file+': '+ts.flattenDiagnosticMessageText(d.messageText,'\n')+'\n');}}
}
console.log('TS syntax errors:',bad); if(bad) process.exit(1);
