$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root
$Python = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $Python)) { throw "Root .venv is missing. Run .\scripts\setup_dev.ps1 first." }

Write-Host "Running backend compile check..." -ForegroundColor Cyan
Push-Location ".\backend"
& $Python -m compileall -q ivfitter tests
Pop-Location

Write-Host "Running backend tests..." -ForegroundColor Cyan
& $Python -m pytest ".\backend\tests" -q

Write-Host "Backend smoke check passed." -ForegroundColor Green
