$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$oldRunner = Join-Path $PSScriptRoot 'run-aura-v2-tests.ps1'
if (-not (Test-Path -LiteralPath $oldRunner -PathType Leaf)) { throw 'Ancien runner du Lot 3 introuvable' }
& powershell -NoProfile -ExecutionPolicy Bypass -File $oldRunner
if ($LASTEXITCODE -ne 0) { throw 'Les tests du Lot 3 ont echoue' }
Push-Location $project
try {
  node --test '.\tests\aura-v22-structure.test.cjs'
  if ($LASTEXITCODE -ne 0) { throw 'Tests structuraux AURA V2.2 en echec' }
} finally { Pop-Location }
