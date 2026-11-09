$ErrorActionPreference = 'Stop'
$project = Split-Path -Parent $PSScriptRoot
Push-Location $project
try {
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot 'run-aura-v231-tests.ps1')
  if ($LASTEXITCODE -ne 0) { throw 'Tests AURA V2.3.1 echoues.' }
  node --test '.\tests\aura-v24-lot3.test.cjs'
  if ($LASTEXITCODE -ne 0) { throw 'Tests AURA V2.4 echoues.' }
  node --test '.\tests\security-stage1.test.cjs' '.\tests\security-stage2.test.cjs'
  if ($LASTEXITCODE -ne 0) { throw 'Tests de securite echoues.' }
} finally { Pop-Location }
