$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
$previous = Join-Path $PSScriptRoot 'run-aura-v22-tests.ps1'
if (-not (Test-Path -LiteralPath $previous -PathType Leaf)) { throw 'Lot 3 / V2.2 test runner missing.' }
& powershell -NoProfile -ExecutionPolicy Bypass -File $previous
if ($LASTEXITCODE -ne 0) { throw 'Regression tests V2.2 or Lot3 failed.' }
Push-Location $project
try {
  node --test '.\tests\aura-v23-structure.test.cjs'
  if ($LASTEXITCODE -ne 0) { throw 'AURA V2.3 UI integration tests failed.' }
} finally { Pop-Location }
