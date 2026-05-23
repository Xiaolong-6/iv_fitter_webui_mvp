@echo off
setlocal
cd /d "%~dp0"
echo == IV-fitter Web UI: start frontend only ==
echo This starts the local React/Vite frontend.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run_frontend.ps1"
pause
