$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'run-aura-v23-tests.ps1')
if ($LASTEXITCODE -ne 0) { throw 'Existing Lot3/V2.3 test suite failed.' }
Push-Location $project
try {
  node --test '.\tests\aura-v231-harmonisation.test.cjs'
  if ($LASTEXITCODE -ne 0) { throw 'V2.3.1 styling regression checks failed.' }
} finally { Pop-Location }
