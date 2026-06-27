#!/usr/bin/env pwsh
# Run upload-cdn for the 5 R60 kinds, sequentially.
Set-Location $PSScriptRoot
$ErrorActionPreference = "Stop"
$envFile = ".env.local"
$kinds = @("country","chemical-element","profession","disease","vehicle")
foreach ($k in $kinds) {
  Write-Host ("=== {0} ===" -f $k)
  & node --env-file=$envFile scripts/upload-cdn.mjs --kind $k --also-rewrite 2>&1 | ForEach-Object { Write-Host $_ }
}
Write-Host "ALL_DONE"
