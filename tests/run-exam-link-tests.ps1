# Run after npm ci in FRONT and BACKEND. 127 tests total: 106 historic + 21 examens.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'run-academic-3b-tests.ps1')
  if ($LASTEXITCODE -ne 0) { throw 'Les 106 tests historiques ont echoue.' }
  node --test (Join-Path $PSScriptRoot 'exam-planning-3b.test.cjs')
  if ($LASTEXITCODE -ne 0) { throw 'Les tests de liaison examens ont echoue.' }
  Write-Host 'EXAMENS LOT 3B : 127 tests attendus (106 anciens + 21 nouveaux).'
} finally { Pop-Location }
