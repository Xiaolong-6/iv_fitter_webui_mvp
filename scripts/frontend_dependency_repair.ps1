# IVfitter frontend dependency repair helper
# Use this when npm install fails on stale/cached tarball URLs such as electron-to-chromium 404.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Frontend = Join-Path $Root "frontend"

Write-Host "Using official npm registry..."
npm.cmd config set registry https://registry.npmjs.org/

Write-Host "Removing frontend/node_modules..."
Remove-Item -Recurse -Force (Join-Path $Frontend "node_modules") -ErrorAction SilentlyContinue

Write-Host "Installing frontend dependencies including devDependencies..."
Push-Location $Frontend
npm.cmd ci --no-audit --no-fund --progress=true

if (-not (Test-Path ".\node_modules\.bin\vitest.cmd")) {
  throw "vitest.cmd was not found after npm install. Check npm install output above."
}

npm.cmd run test -- --run --reporter=dot
npm.cmd run build
Pop-Location

Write-Host "Frontend dependency repair, tests, and build completed."
