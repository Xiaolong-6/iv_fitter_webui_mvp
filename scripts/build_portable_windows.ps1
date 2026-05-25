param(
  [switch]$SkipFrontendBuild,
  [switch]$SkipTests
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Invoke-Native($Description, $FilePath, [string[]]$Arguments) {
  Write-Host ""
  Write-Host "==> $Description"
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Description failed with exit code $LASTEXITCODE"
  }
}

function Read-JsonFile($Path) {
  Get-Content -Raw -Path $Path | ConvertFrom-Json
}

$version = [string](Read-JsonFile "package.json").version
$python = if (Test-Path ".venv/Scripts/python.exe") { ".venv/Scripts/python.exe" } else { "python" }

if (-not $SkipFrontendBuild) {
  Invoke-Native "Frontend production build" "npm" @("run", "build")
}

if (-not $SkipTests) {
  Invoke-Native "Parameter UI smoke tests" "npm" @("run", "test:parameter-ui")
  Invoke-Native "Synthetic trace UI smoke tests" "npm" @("run", "test:synthetic-ui")
  $env:PYTHONPATH = "backend"
  Invoke-Native "Backend pytest suite" $python @("-m", "pytest", "-p", "no:cacheprovider", "backend/tests", "-q")
  Invoke-Native "Backend Python compile check" $python @("-m", "compileall", "-q", "backend/ivfitter", "backend/tests")
}

Invoke-Native "PyInstaller availability check" $python @("-m", "PyInstaller", "--version")

$buildRoot = Join-Path $Root "release\portable-build"
$distRoot = Join-Path $Root "release\portable-dist"
$portableName = "IV-fitter-v$version-win-portable"
$portableRoot = Join-Path $distRoot $portableName
$zipPath = Join-Path $distRoot "$portableName.zip"

New-Item -ItemType Directory -Force -Path $buildRoot | Out-Null
New-Item -ItemType Directory -Force -Path $distRoot | Out-Null
if (Test-Path $portableRoot) {
  Remove-Item -LiteralPath $portableRoot -Recurse -Force
}
if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

$separator = if ($IsWindows -or $env:OS -eq "Windows_NT") { ";" } else { ":" }
$frontendDist = Join-Path $Root "frontend/dist"
if (-not (Test-Path (Join-Path $frontendDist "index.html"))) {
  throw "Frontend dist/index.html was not found. Run npm run build first."
}
$frontendData = "$frontendDist${separator}frontend_dist"
$iconPath = Join-Path $Root "desktop/assets/iv_fitter_icon.ico"
if (-not (Test-Path $iconPath)) {
  throw "Windows icon was not found at $iconPath."
}

Invoke-Native "Build portable Windows executable" $python @(
  "-m", "PyInstaller",
  "--noconfirm",
  "--clean",
  "--onedir",
  "--name", "IV-fitter",
  "--paths", "backend",
  "--distpath", $distRoot,
  "--workpath", $buildRoot,
  "--specpath", $buildRoot,
  "--icon", $iconPath,
  "--add-data", $frontendData,
  "desktop/portable_launcher.py"
)

Move-Item -LiteralPath (Join-Path $distRoot "IV-fitter") -Destination $portableRoot

@"
IV-fitter Web UI v$version portable

How to run:
1. Double-click IV-fitter.exe.
2. Your browser should open automatically.
3. Close the IV-fitter console window to stop the local app.

This portable folder includes the Python runtime dependencies and frontend build.
It does not require users to install Python, Node.js, npm, or project packages.
"@ | Set-Content -Path (Join-Path $portableRoot "README_PORTABLE.txt") -Encoding UTF8
Copy-Item -LiteralPath (Join-Path $Root "LICENSE") -Destination (Join-Path $portableRoot "LICENSE.txt")

Compress-Archive -Path (Join-Path $portableRoot "*") -DestinationPath $zipPath -Force
Write-Host ""
Write-Host "Created $zipPath"
