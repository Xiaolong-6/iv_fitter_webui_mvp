@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\release_build.ps1" %*
exit /b %ERRORLEVEL%
