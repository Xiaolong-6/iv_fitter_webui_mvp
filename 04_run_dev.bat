@echo off
setlocal
cd /d "%~dp0"
echo == IV-fitter Web UI: start backend and frontend ==
echo This opens backend and frontend in separate windows.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run_dev.ps1"
if errorlevel 1 (
  echo.
  echo Startup failed. Copy the error above and send it to the assistant.
  pause
  exit /b 1
)
