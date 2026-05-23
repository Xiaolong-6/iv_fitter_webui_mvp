$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm was not found. Install Node.js LTS first, or run 01a_install_node_lts.bat from the project root."
}

if (-not (Test-Path "node_modules")) {
    throw "Frontend dependencies are missing. Run 02_setup_dev.bat first. Do not start the frontend before setup completes."
}

if (-not (Test-Path "node_modules\.bin\vite.cmd")) {
    throw "Vite is missing from root node_modules. Run 02_setup_dev.bat again. If npm install failed, check the npm error above."
}

Write-Host "Starting frontend dev server from root package.json..." -ForegroundColor Cyan
npm run dev
