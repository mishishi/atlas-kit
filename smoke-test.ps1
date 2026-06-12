# Atlas Kit — 全站 smoke test
# 用法: 重启 dev 后跑一次这个, 看 200/404/500.
$base = "http://localhost:3001"
$pages = @(
  "/",
  "/cards",
  "/cards?kind=pet",
  "/cards?kind=city",
  "/cards?kind=festival",
  "/cards?tag=%E9%87%91%E6%AF%9B",
  "/cards?page=2",
  "/series",
  "/about",
  "/search",
  "/search?q=%E6%9F%AF%E5%9F%BA",
  "/search?q=emptyxyz",
  "/create",
  "/create?step=2",
  "/cards/card-dvhp",
  "/cards/smoke-repro-kc8387",
  "/cards/card-q8hnld",
  "/cards/card-iut1",
  "/cards/card-gnj76",
  "/cards/this-does-not-exist",           # 期望 404
  "/series/atlas-miscellany",
  "/series/festival-almanac",
  "/series/city-encyclopedia",
  "/series/atlas-collectibles",
  "/series/flora-codex",
  "/series/this-does-not-exist",          # 期望 404
  "/not-real-page",                       # 期望 404
  "/opengraph-image",                       # 期望 ERR (dev edge runtime fs 限制)
  "/sitemap.xml",
  "/robots.txt"
)

$fail = 0
Write-Host "Atlas Kit smoke test — $(Get-Date -Format 'HH:mm:ss')"
Write-Host ("{0,-6} {1}" -f "code", "path")
Write-Host ("{0,-6} {1}" -f "----", "----")
foreach ($p in $pages) {
  try {
    $r = Invoke-WebRequest "$base$p" -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
    $ok = if ($r.StatusCode -eq 200) { "✓" } else { "?" }
    Write-Host ("{0,-3} {1,-4} {2}" -f $ok, $r.StatusCode, $p)
  } catch {
    $code = $null
    try { $code = $_.Exception.Response.StatusCode.value__ } catch {}
    if (-not $code) { $code = "ERR"; $fail++ }
    $expected404 = $p -match "this-does-not-exist|not-real-page"
    $flag = if ($expected404 -and $code -eq 404) { "✓" } elseif ($code -eq 404) { "✓" } elseif ($code -eq "ERR") { "✗" } else { "✗" }
    Write-Host ("{0,-3} {1,-4} {2}" -f $flag, $code, $p)
  }
}
Write-Host ""
Write-Host "500 / ERR 计数: $fail (应为 0)"
Write-Host "重启 dev 提示: Ctrl+C 终止当前 npm run dev, 再 npm run dev"
