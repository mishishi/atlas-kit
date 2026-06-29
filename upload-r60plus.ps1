#!/usr/bin/env pwsh
Set-Location $PSScriptRoot
$ErrorActionPreference = "Stop"
$envFile = ".env.local"
$kinds = @("space-object","pet","country","chemical-element","profession","disease","plant","other","vehicle","animal","architecture")
foreach ($k in $kinds) {
  Write-Host ("=== {0} ===" -f $k)
  & node --env-file=$envFile scripts/upload-cdn.mjs --kind $k --also-rewrite 2>&1 | ForEach-Object { Write-Host $_ }
}
Write-Host "ALL_DONE"