param(
    [string]$PythonVersion = "3.12"
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

Write-Host "== IV-fitter Web UI dev setup ==" -ForegroundColor Cyan
Write-Host "Project root: $Root"

if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
    throw "Python launcher 'py' was not found. Install Python 3.12.x from python.org or winget."
}

Write-Host "Checking Python ${PythonVersion}..."
& py -$PythonVersion --version
& py -$PythonVersion -c "import sys; print(sys.executable)"

Write-Host "Checking pip for Python ${PythonVersion}..."
try {
    & py -$PythonVersion -m pip --version
} catch {
    Write-Warning "pip is missing. Trying ensurepip once..."
    & py -$PythonVersion -m ensurepip --upgrade
    & py -$PythonVersion -m pip --version
}

if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "Creating root .venv with Python $PythonVersion..."
    & py -$PythonVersion -m venv .venv
} else {
    Write-Host "Root .venv already exists; reusing it."
}

$Python = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $Python)) {
    throw "Expected venv Python not found: $Python"
}

Write-Host "Upgrading pip/setuptools/wheel..."
& $Python -m pip install --upgrade pip setuptools wheel

Write-Host "Installing root Python dependencies..."
& $Python -m pip install -r ".\requirements.txt"

Write-Host "Installing backend package in editable dev mode..."
& $Python -m pip install -e ".\backend"

if (Test-Path ".\package.json") {
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        Write-Host "Installing frontend dependencies from root package.json..."
        npm install --registry=https://registry.npmjs.org/
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed. Check your network/npm registry, then rerun 02_setup_dev.bat."
        }
    } else {
        Write-Warning "npm was not found. Backend setup completed. To enable the frontend, double-click 01a_install_node_lts.bat, then rerun 02_setup_dev.bat."
    }
}

Write-Host "Setup complete." -ForegroundColor Green
Write-Host "Next:"
Write-Host "  .\scripts\test_backend.ps1"
Write-Host "  .\scripts\run_backend.ps1"
Write-Host "  .\scripts\run_frontend.ps1"
