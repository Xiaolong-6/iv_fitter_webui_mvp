@echo off
setlocal

cd /d "%~dp0"

set "SCRIPT=%~dp0scripts\prepare_publication_demo_data.py"

if not exist "%SCRIPT%" (
    echo ERROR: Cannot find:
    echo   %SCRIPT%
    echo.
    echo Put prepare_publication_demo_data.py in the scripts folder.
    pause
    exit /b 1
)

if exist "%~dp0.venv\Scripts\python.exe" (
    set "PYTHON=%~dp0.venv\Scripts\python.exe"
) else (
    set "PYTHON=python"
)

echo.
echo Prepare publication demo-data CSV + meta.json
echo Default JV/IV CSV template: Voltage_V plus multiple trace columns
echo Output:
echo   examples\demo_data\publication_data\A_Surname_et_al_Year.csv
echo   examples\demo_data\publication_data\A_Surname_et_al_Year.meta.json
echo.

"%PYTHON%" "%SCRIPT%" %*

set "EXITCODE=%ERRORLEVEL%"
echo.
if "%EXITCODE%"=="0" (
    echo Done.
) else (
    echo Script failed with exit code %EXITCODE%.
)
echo.
pause
exit /b %EXITCODE%
