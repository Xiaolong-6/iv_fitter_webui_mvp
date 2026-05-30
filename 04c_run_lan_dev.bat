@echo off
setlocal EnableExtensions
cd /d "%~dp0"

color 0A
echo == IV-fitter Web UI: LAN / phone testing mode ==
echo.
echo This script starts BOTH required services:
echo   1. Backend API  on http://0.0.0.0:8000
echo   2. Frontend UI on http://0.0.0.0:5173
echo.
echo Prerequisites:
echo   1. Run 02_setup_dev.bat first on this computer.
echo   2. Keep the computer and phone on the same Wi-Fi or phone hotspot.
echo   3. Allow Windows Firewall access on Private networks if Windows asks.
echo   4. Ports 8000 backend and 5173 frontend should be free.
echo   5. On the phone, use the LAN URL printed by this script, not localhost.
echo.
echo Network note:
echo   University/company Wi-Fi may block device-to-device access.
echo   A phone hotspot is often the fastest fallback.
echo.

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm was not found.
  echo Install Node.js LTS or run 01a_install_node_lts.bat, then rerun this launcher.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo Root .venv was not found. Running setup first...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup_dev.ps1"
  if errorlevel 1 (
    echo.
    echo Setup failed. Copy the error above and send it to the assistant.
    pause
    exit /b 1
  )
)

echo Checking frontend dependencies...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\ensure_frontend_dependencies.ps1"
if errorlevel 1 (
  echo.
  echo Frontend dependency check/install failed. Copy the error above and send it to the assistant.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "$ips = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.IPAddress -notlike '169.254*' -and $_.AddressState -eq 'Preferred' -and $_.PrefixOrigin -ne 'WellKnown' } | Sort-Object InterfaceMetric); if ($ips.Count -gt 1) { Write-Host 'Multiple IPv4 addresses detected. The first one is used below:'; $ips | ForEach-Object { Write-Host ('  ' + $_.IPAddress + '  [' + $_.InterfaceAlias + ']') } }; if ($ips.Count -gt 0) { $ips[0].IPAddress }"`) do set "LAN_IP=%%I"

if "%LAN_IP%"=="" (
  echo ERROR: Could not detect a LAN IPv4 address automatically.
  echo Open PowerShell and run ipconfig, then look for your Wi-Fi IPv4 address.
  pause
  exit /b 1
)

echo Detected computer LAN IPv4: %LAN_IP%
echo.
echo Backend health URLs:
echo   Computer: http://127.0.0.1:8000/api/health
echo   LAN:      http://%LAN_IP%:8000/api/health
echo.
echo Frontend URLs:
echo   Computer: http://127.0.0.1:5173
echo   Phone:    http://%LAN_IP%:5173
echo.

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue) { exit 10 } else { exit 0 }"
if errorlevel 10 (
  echo WARNING: Port 8000 is already in use.
  echo A backend may already be running. Close the old backend window if tests behave strangely.
  echo.
)

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) { exit 10 } else { exit 0 }"
if errorlevel 10 (
  echo WARNING: Port 5173 is already in use.
  echo A frontend may already be running. Close the old frontend window if the page behaves strangely.
  echo.
)

set "LAN_ORIGINS=http://%LAN_IP%:5173,http://127.0.0.1:5173,http://localhost:5173"

if "%IVFITTER_API_TOKEN%"=="" (
  for /f "usebackq delims=" %%T in (`powershell -NoProfile -Command "[guid]::NewGuid().ToString('N')"`) do set "IVFITTER_API_TOKEN=%%T"
)

echo LAN API token is enabled for this launcher session.
echo The frontend receives it automatically; keep these launched windows together.
echo.

echo Starting backend window...
start "IV-fitter backend LAN" powershell.exe -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%~dp0'; $env:IVFITTER_CORS_ORIGINS='%LAN_ORIGINS%'; $env:IVFITTER_API_TOKEN='%IVFITTER_API_TOKEN%'; .\.venv\Scripts\python.exe -m uvicorn ivfitter.api.main:app --app-dir '.\backend' --host 0.0.0.0 --port 8000"

echo Waiting for backend health check...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok=$false; foreach ($i in 1..30) { try { $r=Invoke-RestMethod -Uri 'http://127.0.0.1:8000/api/health' -TimeoutSec 2; if ($r.status -eq 'ok') { $ok=$true; break } } catch {}; Start-Sleep -Seconds 1 }; if ($ok) { exit 0 } else { exit 1 }"
if errorlevel 1 (
  color 0C
  echo.
  echo ERROR: Backend did not answer http://127.0.0.1:8000/api/health within 30 seconds.
  echo Check the backend PowerShell window for the real error.
  echo Common causes:
  echo   - 02_setup_dev.bat was not completed successfully.
  echo   - Port 8000 is occupied by another process.
  echo   - Python dependency installation failed.
  echo.
  pause
  exit /b 1
)

echo Backend health check passed.
echo.
echo Starting frontend window...
start "IV-fitter frontend LAN" powershell.exe -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%~dp0'; $env:VITE_API_BASE='http://%LAN_IP%:8000'; $env:VITE_IVFITTER_API_TOKEN='%IVFITTER_API_TOKEN%'; npm.cmd --prefix frontend run dev -- --host 0.0.0.0 --port 5173 --strictPort"

echo.
echo == LAN launcher is ready ==
echo.
echo On this computer, open:
echo   http://127.0.0.1:5173
echo.
echo On your phone/tablet, open:
echo   http://%LAN_IP%:5173
echo.
echo If the page opens but shows "Failed to fetch":
echo   1. On this computer, open http://127.0.0.1:8000/api/health
echo   2. On the phone, open http://%LAN_IP%:8000/api/health
echo   3. If phone health fails, allow Python through Windows Firewall on Private networks.
echo.
echo Keep both backend and frontend windows open while testing.
echo.
pause
