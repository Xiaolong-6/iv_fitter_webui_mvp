@echo off
setlocal
cd /d "%~dp0"
echo == IV-fitter Web UI: validate helper scripts ==
echo This checks PowerShell script syntax only. It does not install anything.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0validate_scripts.ps1"
if errorlevel 1 (
  echo.
  echo Script validation failed. Copy the error above and send it to the assistant.
  pause
  exit /b 1
)

echo.
echo Script validation passed.
pause
