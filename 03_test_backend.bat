@echo off
setlocal
cd /d "%~dp0"
echo == IV-fitter Web UI: run backend tests ==
echo This runs backend tests through the root .venv.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\test_backend.ps1"
if errorlevel 1 (
  echo.
  echo Backend tests failed. Copy the error above and send it to the assistant.
  pause
  exit /b 1
)

echo.
echo Backend tests passed.
pause
