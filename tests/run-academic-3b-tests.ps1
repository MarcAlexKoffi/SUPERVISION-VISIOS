# LOT 3B: 24 tests nouveaux + 82 controles historiques V2.4/securite (106 tests attendus).
$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
Push-Location $project
try {
  node --test '.\tests\academic-3b.test.cjs'
  if ($LASTEXITCODE -ne 0) { throw 'Les tests LOT 3B ont echoue.' }
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'run-aura-v24-tests.ps1')
  if ($LASTEXITCODE -ne 0) { throw 'Les tests AURA V2.4 ou Securite ont echoue.' }
  Write-Host 'LOT 3B : 106 tests attendus (24 nouveaux + 82 historiques), tous les controles ont termine.' -ForegroundColor Green
} finally { Pop-Location }
