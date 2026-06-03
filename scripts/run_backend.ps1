$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root
$Python = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $Python)) {
    Write-Host "Root .venv is missing; running setup first..." -ForegroundColor Yellow
    & "$Root\scripts\setup_dev.ps1"
}
if (-not (Test-Path $Python)) { throw "Root .venv is missing after setup. Check setup output above." }
Write-Host "Starting FastAPI backend at http://127.0.0.1:8000 ..." -ForegroundColor Cyan
& $Python -m uvicorn ivfitter.api.main:app --reload --app-dir ".\backend" --host 127.0.0.1 --port 8000
