@echo off
setlocal
cd /d "%~dp0"
echo == IV-fitter Web UI: setup dev environment ==
echo This creates/reuses .venv, installs backend dependencies, and installs frontend dependencies if npm exists.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup_dev.ps1"
if errorlevel 1 (
  echo.
  echo Setup failed. Copy the error above and send it to the assistant.
  pause
  exit /b 1
)

echo.
echo Setup completed.
pause
