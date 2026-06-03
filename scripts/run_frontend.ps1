$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "npm was not found. Install Node.js LTS first, or run 01a_install_node_lts.bat from the project root."
}

& "$Root\scripts\ensure_frontend_dependencies.ps1"

Write-Host "Starting frontend dev server from frontend package.json..." -ForegroundColor Cyan
npm.cmd --prefix frontend run dev
