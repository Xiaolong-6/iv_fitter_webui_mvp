@echo off
setlocal
cd /d "%~dp0"

echo == IV-fitter Web UI: install/check Node.js LTS ==
echo This optional script checks for npm. If npm is missing, it can install Node.js LTS using winget.
echo It is only needed for the frontend. Backend setup/tests can run without Node.js.
echo.

where npm >nul 2>nul
if not errorlevel 1 (
  echo npm is already available:
  npm --version
  echo.
  echo Node.js/npm check passed. You can run 02_setup_dev.bat again if frontend dependencies were skipped.
  pause
  exit /b 0
)

where winget >nul 2>nul
if errorlevel 1 (
  echo npm was not found, and winget was not found.
  echo Install Node.js LTS manually from https://nodejs.org/ then rerun 02_setup_dev.bat.
  pause
  exit /b 1
)

echo npm was not found.
echo.
echo This will run:
echo   winget install --id OpenJS.NodeJS.LTS -e
echo.
choice /C YN /M "Install Node.js LTS now"
if errorlevel 2 (
  echo Cancelled. Install Node.js LTS later, then rerun 02_setup_dev.bat.
  pause
  exit /b 1
)

winget install --id OpenJS.NodeJS.LTS -e
if errorlevel 1 (
  echo.
  echo Node.js LTS installation failed. Copy the error above and send it to the assistant.
  pause
  exit /b 1
)

echo.
echo Node.js LTS installation completed.
echo Close and reopen the terminal/windows if npm is still not detected, then rerun 02_setup_dev.bat.
pause
