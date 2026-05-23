@echo off
setlocal
cd /d "%~dp0"
echo == IV-fitter Web UI: check environment ==
echo This checks Python 3.12 and pip. It does not modify the project.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\check_python.ps1"
if errorlevel 1 (
  echo.
  echo Environment check failed. Copy the error above and send it to the assistant.
  pause
  exit /b 1
)

echo.
echo Environment check passed.
pause
