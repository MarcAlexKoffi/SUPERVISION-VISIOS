# Run from any PowerShell directory after npm ci in FRONT and BACKEND.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location (Join-Path $root 'FRONT')
try {
    npx tsc --target es2022 --module commonjs --skipLibCheck --outDir .lot3-test-output src/app/services/planning-rules.ts
    if ($LASTEXITCODE -ne 0) { throw 'La compilation des règles frontend a échoué.' }
    node --test src/app/services/planning-rules.test.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Tests frontend échoués.' }
} finally { Pop-Location }
Push-Location (Join-Path $root 'BACKEND')
try {
    npx tsc --target es2022 --module commonjs --skipLibCheck --outDir .lot3-test-output src/utils/planningLot3.ts
    if ($LASTEXITCODE -ne 0) { throw 'La compilation des règles backend a échoué.' }
    node --test src/utils/planningLot3.test.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Tests backend échoués.' }
} finally { Pop-Location }
