@echo off
setlocal
cd /d "%~dp0"
echo == IV-fitter Web UI: start backend only ==
echo This starts the local FastAPI backend at http://127.0.0.1:8000

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run_backend.ps1"
pause
