$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "Missing backend environment; running setup first..." -ForegroundColor Yellow
    & "$Root\scripts\setup_dev.ps1"
}

& "$Root\scripts\ensure_frontend_dependencies.ps1"

Write-Host "Opening backend and frontend in separate PowerShell windows..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$Root\scripts\run_backend.ps1`""
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "`"$Root\scripts\run_frontend.ps1`""
