$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Scripts = Get-ChildItem -Path (Join-Path $Root "scripts") -Filter "*.ps1" -File

foreach ($Script in $Scripts) {
    $Tokens = $null
    $Errors = $null
    [System.Management.Automation.Language.Parser]::ParseFile($Script.FullName, [ref]$Tokens, [ref]$Errors) | Out-Null
    if ($Errors.Count -gt 0) {
        Write-Host "Syntax error in $($Script.FullName)" -ForegroundColor Red
        $Errors | ForEach-Object { Write-Host $_.Message }
        exit 1
    }
}

Write-Host "PowerShell script syntax check passed." -ForegroundColor Green
