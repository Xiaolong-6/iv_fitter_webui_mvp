param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

if (-not (Test-Path ".\frontend\package.json")) {
    Write-Host "frontend/package.json was not found; skipping frontend dependency check." -ForegroundColor Yellow
    exit 0
}

if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw "npm was not found. Install Node.js LTS first, or run 01a_install_node_lts.bat from the project root."
}

$RequiredPaths = @(
    @{ Name = "Vite"; Path = ".\frontend\node_modules\.bin\vite.cmd" },
    @{ Name = "@xyflow/react"; Path = ".\frontend\node_modules\@xyflow\react\package.json" },
    @{ Name = "katex CSS"; Path = ".\frontend\node_modules\katex\dist\katex.min.css" },
    @{ Name = "react-katex"; Path = ".\frontend\node_modules\react-katex\package.json" }
)

$Missing = @()
foreach ($item in $RequiredPaths) {
    if (-not (Test-Path $item.Path)) {
        $Missing += $item.Name
    }
}

if ($Force -or $Missing.Count -gt 0) {
    if ($Force) {
        Write-Host "Installing frontend dependencies from frontend/package-lock.json..." -ForegroundColor Cyan
    } else {
        Write-Host "Frontend dependencies are incomplete or stale: $($Missing -join ', ')" -ForegroundColor Yellow
        Write-Host "Installing frontend dependencies from frontend/package-lock.json..." -ForegroundColor Cyan
    }
    Write-Host "Using public npm registry. First install can take 1-5 minutes."

    npm.cmd --prefix frontend ci --no-audit --no-fund --progress=true --registry=https://registry.npmjs.org/
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "npm ci failed. Retrying once with npm install."
        npm.cmd --prefix frontend install --no-audit --no-fund --progress=true --registry=https://registry.npmjs.org/
    }
    if ($LASTEXITCODE -ne 0) {
        throw "frontend npm install failed. Check your network/npm registry, then rerun 02_setup_dev.bat."
    }
} else {
    Write-Host "Frontend dependencies are present." -ForegroundColor Green
}

$StillMissing = @()
foreach ($item in $RequiredPaths) {
    if (-not (Test-Path $item.Path)) {
        $StillMissing += "$($item.Name) [$($item.Path)]"
    }
}

if ($StillMissing.Count -gt 0) {
    throw "Frontend dependency install completed but required files are still missing: $($StillMissing -join '; ')"
}
