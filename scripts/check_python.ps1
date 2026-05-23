param(
    [string]$PythonVersion = "3.12"
)

$ErrorActionPreference = "Stop"

Write-Host "Installed Python launchers:" -ForegroundColor Cyan
& py -0p

Write-Host ""
Write-Host "Checking requested Python ${PythonVersion}:" -ForegroundColor Cyan
& py -$PythonVersion --version
& py -$PythonVersion -c "import sys; print(sys.executable)"

Write-Host ""
Write-Host "Checking pip availability:" -ForegroundColor Cyan
try {
    & py -$PythonVersion -m pip --version
} catch {
    Write-Warning "pip is missing for Python $PythonVersion. Try:"
    Write-Host "  py -$PythonVersion -m ensurepip --upgrade"
    Write-Host "If ensurepip hangs, repair/reinstall Python $PythonVersion and ensure pip is selected."
    throw
}

Write-Host ""
Write-Host "Environment check passed." -ForegroundColor Green
