param()
$ErrorActionPreference='Stop'
$root=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $root
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {throw 'Node.js manquant.'}
$files=@(Get-ChildItem -LiteralPath (Join-Path $root 'tests') -Filter '*.test.cjs' -File | Sort-Object Name | ForEach-Object FullName)
if ($files.Count -lt 10){throw 'Jeu de tests incomplet. Aucun test n a ete saute volontairement.'}
& node --test @files
if ($LASTEXITCODE -ne 0){throw "Tests en echec (code $LASTEXITCODE)."}
Write-Host 'LOT 4: anciens et nouveaux controles reussis.'
