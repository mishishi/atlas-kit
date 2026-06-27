#!/usr/bin/env pwsh
# Run upload-cdn for the 15 batch3 kinds, sequentially.
# Idempotent — already-on-CDN cards stay on CDN.
Set-Location $PSScriptRoot

$ErrorActionPreference = "Stop"
$envFile = ".env.local"
$kinds = @("animal","architecture","artwork","book","city","food","history","object","other","person","pet","phenomenon","space-object","sport","tech")

foreach ($k in $kinds) {
  Write-Host ("=== {0} ===" -f $k)
  & node --env-file=$envFile scripts/upload-cdn.mjs --kind $k --also-rewrite 2>&1 | ForEach-Object { Write-Host $_ }
  if ($LASTEXITCODE -ne 0) {
    Write-Host ("!!! kind={0} exit={1}" -f $k, $LASTEXITCODE)
  }
}
Write-Host "ALL_DONE"
