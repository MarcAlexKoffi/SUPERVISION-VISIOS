# Tests de l'integration AURA V2 Premium. A executer sur Windows apres npm ci.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location (Join-Path $root 'FRONT')
try {
    npx tsc --target es2022 --module commonjs --skipLibCheck --outDir .aura-v2-test-output src/app/shared/utils/academic-search.ts
    if ($LASTEXITCODE -ne 0) { throw 'Compilation des utilitaires de recherche echouee.' }
    node --test src/app/shared/utils/academic-search.test.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Tests de recherche AURA echoues.' }
} finally {
    Pop-Location
}
& (Join-Path $PSScriptRoot 'run-lot3-tests.ps1')
